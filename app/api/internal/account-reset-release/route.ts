import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type OwnedNumber = {
  number?: unknown;
};

type ResetOperation = {
  id: string;
  user_id: string;
  token_sha256: string;
  expected_number_count: number;
  expires_at: string;
  status: "pending" | "running" | "failed" | "completed";
};

type ReleaseResult = {
  number: string;
  state: "live" | "released" | "already_missing" | "lookup_failed" | "release_failed";
  status: number;
  detail?: string;
};

function tokenMatches(token: string, expectedHash: string): boolean {
  if (!token || !/^[a-f0-9]{64}$/i.test(expectedHash)) return false;
  const actual = createHash("sha256").update(token).digest();
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function toDigits(value: unknown): string {
  const raw = String(value || "").replace(/\D/g, "");
  if (raw.length === 11 && raw.startsWith("1")) return raw.slice(1);
  return raw;
}

function toE164(digits: string): string {
  return "+1" + digits;
}

function shortDetail(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const record = body as { errors?: Array<{ detail?: unknown }>; message?: unknown };
  const value = record.errors?.[0]?.detail || record.message;
  return value ? String(value).slice(0, 240) : undefined;
}

async function telnyxJson(url: string, init: RequestInit, apiKey: string) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function inspectOrReleaseNumber(
  digits: string,
  execute: boolean,
  apiKey: string,
): Promise<ReleaseResult> {
  try {
    const lookupUrl =
      "https://api.telnyx.com/v2/phone_numbers?filter[phone_number]=" +
      encodeURIComponent(toE164(digits)) +
      "&page[size]=5";
    const lookup = await telnyxJson(lookupUrl, { method: "GET" }, apiKey);
    if (!lookup.response.ok) {
      return {
        number: toE164(digits),
        state: "lookup_failed",
        status: lookup.response.status,
        detail: shortDetail(lookup.body),
      };
    }

    const data = (lookup.body as { data?: Array<{ id?: unknown }> }).data || [];
    const phoneNumberId = data[0]?.id ? String(data[0].id) : "";
    if (!phoneNumberId) {
      return { number: toE164(digits), state: "already_missing", status: 404 };
    }
    if (!execute) {
      return { number: toE164(digits), state: "live", status: 200 };
    }

    const released = await telnyxJson(
      "https://api.telnyx.com/v2/phone_numbers/" + encodeURIComponent(phoneNumberId),
      { method: "DELETE" },
      apiKey,
    );
    if (released.response.ok || released.response.status === 404) {
      return {
        number: toE164(digits),
        state: released.response.status === 404 ? "already_missing" : "released",
        status: released.response.status,
      };
    }
    return {
      number: toE164(digits),
      state: "release_failed",
      status: released.response.status,
      detail: shortDetail(released.body),
    };
  } catch (error) {
    return {
      number: toE164(digits),
      state: "lookup_failed",
      status: 0,
      detail: error instanceof Error ? error.message.slice(0, 240) : "Unexpected Telnyx error",
    };
  }
}

async function runWithConcurrency<T, R>(
  values: T[],
  limit: number,
  work: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await work(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => worker()));
  return results;
}

async function removeRegistration(
  kind: "campaign" | "brand",
  id: string | null,
  apiKey: string,
) {
  if (!id) return { kind, state: "not_present", status: 0 };
  const result = await telnyxJson(
    "https://api.telnyx.com/v2/10dlc/" + kind + "/" + encodeURIComponent(id),
    { method: "DELETE" },
    apiKey,
  );
  return {
    kind,
    state: result.response.ok
      ? "removed"
      : result.response.status === 404
        ? "already_missing"
        : "failed",
    status: result.response.status,
    detail: result.response.ok ? undefined : shortDetail(result.body),
  };
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.TELNYX_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apiKey || !supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Required server configuration is missing" }, { status: 500 });
  }

  const operationId = req.nextUrl.searchParams.get("op") || "";
  const token = req.nextUrl.searchParams.get("token") || "";
  if (!/^[0-9a-f-]{36}$/i.test(operationId) || !token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: rawOperation, error: operationError } = await db
    .from("account_reset_operations")
    .select("id,user_id,token_sha256,expected_number_count,expires_at,status")
    .eq("id", operationId)
    .maybeSingle();
  const operation = rawOperation as ResetOperation | null;
  if (
    operationError ||
    !operation ||
    Date.now() >= Date.parse(operation.expires_at) ||
    operation.status === "completed" ||
    !tokenMatches(token, operation.token_sha256)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (operation.status === "running") {
    return NextResponse.json({ error: "Operation is already running" }, { status: 409 });
  }

  const execute =
    req.nextUrl.searchParams.get("execute") === "release" &&
    req.nextUrl.searchParams.get("confirm") === String(operation.expected_number_count);
  if (execute) {
    const { data: claimed, error: claimError } = await db
      .from("account_reset_operations")
      .update({ status: "running" })
      .eq("id", operation.id)
      .in("status", ["pending", "failed"])
      .select("id")
      .maybeSingle();
    if (claimError || !claimed) {
      return NextResponse.json({ error: "Operation could not be claimed" }, { status: 409 });
    }
  }

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("id,role,owned_numbers,a2p_registration")
    .eq("id", operation.user_id)
    .eq("role", "admin")
    .maybeSingle();
  if (profileError || !profile) {
    if (execute) {
      await db.from("account_reset_operations").update({ status: "failed" }).eq("id", operation.id);
    }
    return NextResponse.json({ error: "Owner account assertion failed" }, { status: 409 });
  }

  const { data: indexed, error: indexedError } = await db
    .from("owned_phone_numbers")
    .select("digits,formatted")
    .eq("user_id", operation.user_id);
  if (indexedError) {
    if (execute) {
      await db.from("account_reset_operations").update({ status: "failed" }).eq("id", operation.id);
    }
    return NextResponse.json({ error: "Could not read phone ownership index" }, { status: 500 });
  }

  const profileNumbers = Array.isArray(profile.owned_numbers)
    ? (profile.owned_numbers as OwnedNumber[])
    : [];
  const allDigits = [
    ...profileNumbers.map((entry) => toDigits(entry.number)),
    ...(indexed || []).flatMap((entry) => [toDigits(entry.digits), toDigits(entry.formatted)]),
  ].filter((digits) => digits.length === 10);
  const uniqueDigits = Array.from(new Set(allDigits)).sort();
  if (uniqueDigits.length !== operation.expected_number_count) {
    if (execute) {
      await db
        .from("account_reset_operations")
        .update({
          status: "failed",
          last_result: {
            error: "Phone-number count assertion failed",
            expected: operation.expected_number_count,
            found: uniqueDigits.length,
          },
        })
        .eq("id", operation.id);
    }
    return NextResponse.json(
      {
        error: "Phone-number count assertion failed",
        expected: operation.expected_number_count,
        found: uniqueDigits.length,
      },
      { status: 409 },
    );
  }

  const results = await runWithConcurrency(uniqueDigits, 4, (digits) =>
    inspectOrReleaseNumber(digits, execute, apiKey),
  );
  const successfulDigits = results
    .filter((result) => result.state === "released" || result.state === "already_missing")
    .map((result) => toDigits(result.number));
  const failedDigits = new Set(
    results
      .filter((result) => result.state === "lookup_failed" || result.state === "release_failed")
      .map((result) => toDigits(result.number)),
  );

  let registration: unknown = null;
  if (execute && successfulDigits.length > 0) {
    const { error } = await db
      .from("owned_phone_numbers")
      .delete()
      .eq("user_id", operation.user_id)
      .in("digits", successfulDigits);
    if (error) {
      await db
        .from("account_reset_operations")
        .update({ status: "failed", last_result: { error: "Ownership-index cleanup failed", results } })
        .eq("id", operation.id);
      return NextResponse.json(
        { error: "Carrier release succeeded but ownership-index cleanup failed", results },
        { status: 500 },
      );
    }

    const remainingProfileNumbers = profileNumbers.filter((entry) =>
      failedDigits.has(toDigits(entry.number)),
    );
    const { error: updateError } = await db
      .from("profiles")
      .update({ owned_numbers: remainingProfileNumbers })
      .eq("id", operation.user_id);
    if (updateError) {
      await db
        .from("account_reset_operations")
        .update({ status: "failed", last_result: { error: "Profile cleanup failed", results } })
        .eq("id", operation.id);
      return NextResponse.json(
        { error: "Carrier release succeeded but profile cleanup failed", results },
        { status: 500 },
      );
    }

    if (failedDigits.size === 0) {
      const reg =
        profile.a2p_registration && typeof profile.a2p_registration === "object"
          ? (profile.a2p_registration as Record<string, unknown>)
          : {};
      const campaignId = String(reg.campaignSid || reg.campaignId || "") || null;
      const brandId = String(reg.brandRegistrationSid || reg.brandId || "") || null;
      const campaign = await removeRegistration("campaign", campaignId, apiKey);
      const brand =
        campaign.state === "removed" || campaign.state === "already_missing" || campaign.state === "not_present"
          ? await removeRegistration("brand", brandId, apiKey)
          : { kind: "brand", state: "skipped_campaign_failed", status: 0 };
      registration = { campaign, brand };
    }
  }

  const counts = results.reduce<Record<string, number>>((summary, result) => {
    summary[result.state] = (summary[result.state] || 0) + 1;
    return summary;
  }, {});
  const hasNumberFailure = results.some(
    (result) => result.state === "lookup_failed" || result.state === "release_failed",
  );

  if (execute) {
    await db
      .from("account_reset_operations")
      .update({
        status: hasNumberFailure ? "failed" : "completed",
        completed_at: hasNumberFailure ? null : new Date().toISOString(),
        last_result: { counts, registration },
      })
      .eq("id", operation.id);
  }

  return NextResponse.json(
    {
      ok: !hasNumberFailure,
      mode: execute ? "release" : "inspect",
      expected: operation.expected_number_count,
      found: uniqueDigits.length,
      counts,
      results,
      registration,
      expiresAt: operation.expires_at,
    },
    { status: hasNumberFailure ? 207 : 200 },
  );
}
