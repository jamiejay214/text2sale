import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sitemap from "@/app/sitemap";
import { submitToIndexNow } from "@/lib/indexnow";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorized = secret
    ? req.headers.get("authorization") === `Bearer ${secret}`
    : req.headers.get("user-agent")?.startsWith("vercel-cron/");
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const stream = () => db.from("indexnow_stream");
  const { data: state } = await stream().select("*").eq("id", true).single().throwOnError();
  const now = Date.now();
  if (Date.parse(state.available_at) > now) return NextResponse.json({ submitted: 0 });

  const live: Record<string, string> = Object.fromEntries(
    sitemap().map(({ url, lastModified }) => [url, new Date(lastModified!).toISOString()])
  );
  const previous: Record<string, string> | null = state.acknowledged;
  const next = previous && [...Object.keys(live), ...Object.keys(previous)]
    .find(url => live[url] !== previous[url]);
  if (previous && !next) return NextResponse.json({ submitted: 0 });

  // Only one invocation can claim this version. An interrupted claim expires.
  const lease = new Date(now + 60_000).toISOString();
  const { data: claim } = await stream().update({ available_at: lease })
    .eq("id", true).eq("available_at", state.available_at).select("id").throwOnError();
  if (!claim.length) return NextResponse.json({ submitted: 0 });

  if (next && previous) {
    const status = await submitToIndexNow(next);
    if (status !== 200 && status !== 202) {
      if (status === 429) {
        await stream().update({ available_at: new Date(now + 3600_000).toISOString() })
          .eq("id", true).eq("available_at", lease).throwOnError();
      }
      return NextResponse.json({ submitted: 0, status }, { status: 502 });
    }
    if (next in live) previous[next] = live[next];
    else delete previous[next];
  }

  // On first use, record the existing site without replaying its entire history.
  await stream().update({ acknowledged: previous ?? live })
    .eq("id", true).eq("available_at", lease).throwOnError();
  return NextResponse.json({ submitted: next ? 1 : 0 });
}
