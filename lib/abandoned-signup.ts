// ── Abandoned-signup alerts ─────────────────────────────────────────────────
// The website signup form saves the contact step into text2sale_prospects the
// moment it's filled in (kind 'signup', with the follow-up consent notice),
// even if the visitor never presses Continue or creates the account. This
// turns those un-finished signups into a text to the owner, with how far the
// person got and their contact info, so they can follow up.
//
// "Finished" = a profiles row exists for that email. Anything else, older than
// a short grace period, is an abandoned signup worth one alert.

export type ProspectRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  industry: string | null;
  source: string | null;
  path: string | null;
  created_at: string;
  notes: string | null;
};

export const ABANDON_MARKER = "[abandon-alerted]";
export const DONE_MARKER = "[signed-up]";

/** Pretty US phone, or the raw value when it isn't one. */
export function prettyPhone(raw: string | null): string {
  const d = (raw || "").replace(/\D/g, "");
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  if (ten.length !== 10) return raw || "";
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

/**
 * How far the person got. The contact step is the furthest the form saves, so
 * reaching this row means they chose a plan and started the contact step; the
 * fields present say how much of it they completed.
 */
export function signupReach(p: ProspectRow): string {
  const parts: string[] = [];
  if ((p.name || "").trim()) parts.push("name");
  if ((p.email || "").trim()) parts.push("email");
  if ((p.phone || "").trim()) parts.push("phone");
  const got = parts.length ? parts.join(", ") : "started the form";
  return `Reached the contact step (${got}), didn't create the account`;
}

/** The SMS body for one abandoned signup. `when` is a pre-formatted local time. */
export function abandonedMessage(p: ProspectRow, when: string): string {
  const lines = [
    "🟡 Abandoned signup — didn't finish",
    `👤 ${(p.name || "No name").trim()}`,
  ];
  if ((p.email || "").trim()) lines.push(`✉️ ${p.email!.trim()}`);
  if ((p.phone || "").trim()) lines.push(`📞 ${prettyPhone(p.phone)}`);
  lines.push(signupReach(p));
  if ((p.industry || "").trim()) lines.push(`Industry: ${p.industry!.trim()}`);
  if ((p.source || "").trim() && p.source !== "direct") lines.push(`Source: ${p.source}`);
  lines.push(`🕐 ${when}`);
  lines.push("Follow up: Command Center → Leads");
  return lines.join("\n");
}
