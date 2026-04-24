// ─── Vercel Domains API helpers ───────────────────────────────────────────
// Vercel acts as a registrar — we can buy domains on behalf of users AND
// attach them to the text2sale project in one integrated flow. Docs:
//   https://vercel.com/docs/rest-api/endpoints/domains
//
// Required env vars:
//   VERCEL_API_TOKEN    — personal token w/ Full Access, from
//                         vercel.com/account/tokens
//   VERCEL_PROJECT_ID   — the text2sale project id (Settings → General)
//   VERCEL_TEAM_ID      — optional, required if the project is in a team
//
// Cost per purchase comes out of the Vercel billing profile on the account
// that owns VERCEL_API_TOKEN (i.e. yours). Typical 1yr prices:
//   .com  ~$12    .org  ~$10    .info  ~$3-5    .co  ~$25
// Renewal happens automatically unless `renew:false` is passed.

const VERCEL_API = "https://api.vercel.com";

function getAuth() {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID || null;
  if (!token) throw new Error("VERCEL_API_TOKEN not configured");
  if (!projectId) throw new Error("VERCEL_PROJECT_ID not configured");
  return { token, projectId, teamId };
}

function withTeam(url: string, teamId: string | null) {
  if (!teamId) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}teamId=${teamId}`;
}

// ── Availability check ──────────────────────────────────────────────────
// Returns true if the domain is unregistered + buyable through Vercel.
export async function isDomainAvailable(domain: string): Promise<{
  available: boolean;
  premium?: boolean;
  price?: number;
  period?: number;
}> {
  const { token, teamId } = getAuth();
  const [statusRes, priceRes] = await Promise.all([
    fetch(withTeam(`${VERCEL_API}/v4/domains/status?name=${encodeURIComponent(domain)}`, teamId), {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(withTeam(`${VERCEL_API}/v4/domains/price?name=${encodeURIComponent(domain)}`, teamId), {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);
  const status = (await statusRes.json()) as { available?: boolean };
  const price = (await priceRes.json()) as { price?: number; period?: number };
  return {
    available: !!status.available,
    price: price.price,
    period: price.period,
    // Vercel doesn't flag premium explicitly — anything $50+/yr on a
    // non-.com is usually premium pricing, worth surfacing to the caller.
    premium: (price.price || 0) >= 50,
  };
}

// ── Purchase + auto-attach to the project ───────────────────────────────
// WHOIS contact info is required by ICANN. We use the user's own info from
// their a2p_registration so the registration is in their name, not ours.
// Vercel returns 200 once payment succeeds; the domain's DNS is configured
// to point at Vercel automatically, so the biz page goes live within a
// minute or two.
export interface BuyDomainArgs {
  domain: string;
  // Expected price gate — we pass back whatever /price returned to prevent
  // silent surcharges if Vercel's pricing shifted between the quote and the
  // buy. If this doesn't match, Vercel rejects the order.
  expectedPrice: number;
  // Contact / WHOIS
  firstName: string;
  lastName: string;
  email: string;
  phone: string; // "+1" prefixed E.164
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string; // ISO-2, defaults to "US"
  orgName?: string;
  // Registration period in years. Default 1.
  period?: number;
  // Auto-renew. Default true — we don't want domains expiring out from
  // under paying users.
  renew?: boolean;
}

export async function buyDomain(args: BuyDomainArgs): Promise<{
  domain: string;
  orderId?: string;
  verified?: boolean;
}> {
  const { token, teamId } = getAuth();
  const res = await fetch(withTeam(`${VERCEL_API}/v5/domains/buy`, teamId), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: args.domain,
      expectedPrice: args.expectedPrice,
      period: args.period ?? 1,
      renew: args.renew ?? true,
      country: args.country ?? "US",
      orgName: args.orgName || undefined,
      firstName: args.firstName,
      lastName: args.lastName,
      address1: args.address1,
      city: args.city,
      state: args.state,
      postalCode: args.postalCode,
      phone: args.phone,
      email: args.email,
    }),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const err =
      (json && typeof json === "object" && "error" in json
        ? (json as { error?: { message?: string } }).error?.message
        : null) || `Vercel buy failed (${res.status})`;
    throw new Error(err);
  }
  return {
    domain: args.domain,
    orderId: (json as { orderId?: string }).orderId,
    verified: true,
  };
}

// ── Attach the purchased domain to the text2sale project ────────────────
// Buying a domain through Vercel registers it but doesn't link it to a
// project — that's a separate call. This is idempotent; calling it on an
// already-attached domain is a no-op (returns 409 which we swallow).
export async function attachDomainToProject(domain: string): Promise<void> {
  const { token, projectId, teamId } = getAuth();
  const res = await fetch(
    withTeam(`${VERCEL_API}/v10/projects/${projectId}/domains`, teamId),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    }
  );
  if (!res.ok && res.status !== 409) {
    const json = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(json.error?.message || `attach failed (${res.status})`);
  }
}

// ── Convenience: slugify a business name into a domain candidate ────────
// "Northern Legacy Insurance Agency LLC" → "northernlegacyins"
// Keeps it to 15 chars max to stay under carrier brand-length limits and
// look tidy in SMS signatures.
export function suggestDomainBase(businessName: string): string {
  const words = businessName
    .toLowerCase()
    .replace(/\bllc\b|\binc\b|\bcorp\b|\bagency\b|\bcompany\b|\bco\b|\band\b|\b&\b/gi, "")
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  let base = words.join("");
  if (base.length > 15) base = base.slice(0, 15);
  return base;
}

export function suggestDomains(businessName: string): string[] {
  const base = suggestDomainBase(businessName);
  if (!base) return [];
  // .com first (most credible with carriers), then cheap fallbacks.
  return [
    `${base}.com`,
    `${base}ins.com`,
    `${base}.info`,
    `${base}.org`,
    `${base}agency.com`,
    `${base}quotes.com`,
  ];
}
