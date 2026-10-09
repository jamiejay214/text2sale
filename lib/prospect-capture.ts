export const FOLLOWUP_NOTICE = "Save my contact details as I fill out this form so Text2Sale can email me if I do not finish signing up. You can opt out at any time.";
export const PROSPECT_STATUSES = ["new", "contacted", "follow_up", "won", "not_interested", "do_not_contact"] as const;

export function parseProspect(input: Record<string, unknown>) {
  const text = (key: string, max: number) => typeof input[key] === "string" ? (input[key] as string).trim().slice(0, max) : "";
  const name = text("name", 120);
  const email = text("email", 254).toLowerCase();
  const phone = text("phone", 30).replace(/[^\d+]/g, "");
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter your name and a valid email address.");
  if (phone && !/^\+?\d{10,15}$/.test(phone)) throw new Error("Enter a valid phone number, including area code.");
  if (input.followup !== true) throw new Error("Confirm that we can save your details and email you about this request.");
  const kind = input.kind === "signup" ? "signup" : "inquiry";
  const path = text("path", 200).split(/[?#]/)[0];
  return {
    name, email, phone: phone || null, kind,
    industry: text("industry", 80) || null,
    message: text("message", 1500) || null,
    path: path.startsWith("/") ? path : "/",
    source: text("source", 100) || "direct",
    campaign: text("campaign", 100) || null,
    consent_text: FOLLOWUP_NOTICE,
  };
}

export async function captureProspect(input: { name: string; email: string; phone?: string; kind: "signup" | "inquiry"; followup: boolean; industry?: string; message?: string; website?: string }) {
  const params = new URLSearchParams(window.location.search);
  const response = await fetch("/api/prospects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({ ...input, path: window.location.pathname, source: params.get("utm_source") || "direct", campaign: params.get("utm_campaign") || "" }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Could not save your request. Please try again.");
}
