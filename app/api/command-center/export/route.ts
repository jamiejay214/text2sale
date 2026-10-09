import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireAdmin } from "@/lib/auth-guard";
import { getAllLeads } from "@/lib/leads-intel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function csvCell(v: unknown): string {
  const raw = v === null || v === undefined ? "" : String(v);
  const s = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// CSV export of all leads across businesses (optionally filtered).
//   /api/command-center/export?business=trustedquotes&kind=partial
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const forbidden = await requireAdmin(auth.user);
  if (forbidden) return forbidden;

  try {
    const business = req.nextUrl.searchParams.get("business");
    const kind = req.nextUrl.searchParams.get("kind");
    const query = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
    const { leads } = await getAllLeads(500);
    const rows = leads.filter(
      (l) => (!business || l.business === business) && (!kind || l.kind === kind) && [l.name,l.email,l.phone,l.detail,l.source,l.campaign,l.notes].join(" ").toLowerCase().includes(query)
    );

    const header = ["business", "kind", "name", "email", "phone", "detail", "location", "source", "status", "created_at", "campaign", "followup", "notes"];
    const lines = [header.join(",")];
    for (const l of rows) {
      lines.push([l.business, l.kind, l.name, l.email, l.phone, l.detail, l.location, l.source, l.status, l.at, l.campaign, l.followup, l.notes].map(csvCell).join(","));
    }
    const csv = lines.join("\n");
    const stamp = new Date().toISOString().slice(0, 10);
    const fname = `leads_${business || "all"}_${kind || "all"}_${stamp}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${fname}"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Export failed" }, { status: 500 });
  }
}
