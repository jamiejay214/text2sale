// ── Release an account's phone numbers ─────────────────────────────────────
// Used when a free trial ends without a payment (lib/trial.ts): numbers a
// Dialer or Complete trial bought cost Text2Sale every month on Telnyx, so
// they are released rather than kept for an account that never paid.
//
// A number can be shared by several accounts (see lib/call-routing.ts); one
// that another account also has is left alone. Same Telnyx calls as
// app/api/delete-number.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any;

const apiKey = () => process.env.TELNYX_API_KEY || "";

function digitsOf(number: string): string {
  const digits = number.replace(/\D/g, "");
  return digits.startsWith("1") && digits.length === 11 ? digits.slice(1) : digits;
}

async function releaseOnTelnyx(number: string, storedId: string | null): Promise<boolean> {
  const e164 = `+1${digitsOf(number)}`;
  let id: string | null = null;
  try {
    const lookup = await fetch(`https://api.telnyx.com/v2/phone_numbers?filter[phone_number]=${encodeURIComponent(e164)}`, {
      headers: { Authorization: `Bearer ${apiKey()}` },
    });
    const body = await lookup.json().catch(() => ({}));
    id = body?.data?.[0]?.id ?? null;
  } catch (e) {
    console.error("[release-numbers] lookup failed:", e);
  }
  const target = id || storedId;
  if (!target) return false;
  const res = await fetch(`https://api.telnyx.com/v2/phone_numbers/${target}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey()}` },
  });
  // 404: already gone on Telnyx, which is the outcome we want.
  return res.ok || res.status === 404;
}

/** Releases the account's numbers that no other account uses. Returns the numbers released. */
export async function releaseAccountNumbers(db: Db, userId: string): Promise<string[]> {
  const { data: profile } = await db.from("profiles").select("owned_numbers").eq("id", userId).maybeSingle();
  const owned = (Array.isArray(profile?.owned_numbers) ? profile.owned_numbers : []) as Array<{ id?: string; number?: string }>;
  if (!owned.length || !apiKey()) return [];

  const released: string[] = [];
  const failed: typeof owned = [];
  for (const entry of owned) {
    const number = String(entry.number || "");
    const digits = digitsOf(number);
    if (!digits) {
      failed.push(entry);
      continue;
    }
    const { data: others } = await db
      .from("owned_phone_numbers")
      .select("user_id")
      .eq("digits", digits)
      .neq("user_id", userId)
      .limit(1);
    const { data: legacy } = await db
      .from("profiles")
      .select("id")
      .neq("id", userId)
      .contains("owned_numbers", [{ number }])
      .limit(1);
    const shared = (others && others.length > 0) || (legacy && legacy.length > 0);
    if (!shared) {
      let ok = false;
      try {
        ok = await releaseOnTelnyx(number, entry.id || null);
      } catch (e) {
        console.error("[release-numbers] release failed:", number, e);
      }
      // A failed release stays on the account so it can be released by hand.
      if (!ok) {
        failed.push(entry);
        continue;
      }
      released.push(number);
    }
    // Released, or shared with another account that keeps it: this account
    // no longer has it.
    await db.from("owned_phone_numbers").delete().eq("user_id", userId).eq("digits", digits);
  }

  await db.from("profiles").update({ owned_numbers: failed }).eq("id", userId);
  return released;
}
