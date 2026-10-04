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
  renewalPrice?: number;
  period?: number;
}> {
  const { token, teamId } = getAuth();
  const [statusRes, priceRes] = await Promise.all([
    fetch(withTeam(`${VERCEL_API}/v1/registrar/domains/${encodeURIComponent(domain)}/availability`, teamId), {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(withTeam(`${VERCEL_API}/v1/registrar/domains/${encodeURIComponent(domain)}/price?years=1`, teamId), {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);
  // A misconfigured token or a registrar outage must not look like "this name
  // is taken" — the customer would be shown an empty list of suggestions with
  // no hint that anything is wrong. Throw so callers can say so.
  if (statusRes.status === 401 || statusRes.status === 403 || priceRes.status === 401 || priceRes.status === 403) {
    throw new Error("Domain registrar credentials were rejected");
  }
  if (!statusRes.ok || !priceRes.ok) {
    const problem = !statusRes.ok ? statusRes : priceRes;
    const json = (await problem.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(json.error?.message || `Domain registrar request failed (${problem.status})`);
  }
  const status = (await statusRes.json().catch(() => ({}))) as { available?: boolean };
  const price = (await priceRes.json().catch(() => ({}))) as {
    years?: number | string;
    purchasePrice?: number | string;
    renewalPrice?: number | string;
  };
  const purchasePrice = Number(price.purchasePrice);
  const renewalPrice = Number(price.renewalPrice);
  return {
    available: !!status.available,
    price: Number.isFinite(purchasePrice) && purchasePrice > 0 ? purchasePrice : undefined,
    renewalPrice: Number.isFinite(renewalPrice) && renewalPrice > 0 ? renewalPrice : undefined,
    period: Number(price.years) || 1,
    // Vercel doesn't flag premium explicitly — anything $50+/yr on a
    // non-.com is usually premium pricing, worth surfacing to the caller.
    premium: (Number.isFinite(purchasePrice) ? purchasePrice : 0) >= 50,
  };
}

// ── Ownership check ─────────────────────────────────────────────────────
// True when the domain is already registered to our Vercel team — used to
// resume an interrupted purchase without buying (or charging) twice.
export async function isDomainOwned(domain: string): Promise<boolean> {
  const { token, teamId } = getAuth();
  const res = await fetch(withTeam(`${VERCEL_API}/v5/domains/${encodeURIComponent(domain)}`, teamId), {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

// ── Purchase + auto-attach to the project ───────────────────────────────
// WHOIS contact info is required by ICANN. We use the user's own info from
// their a2p_registration so the registration is in their name, not ours.
// Vercel returns an order ID, NOT a completed registration. Check both the
// order and the individual domain before attaching or publishing the site.
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
  businessType?: string;
  /**
   * Registry-specific contact fields. Some TLDs reject an otherwise valid
   * purchase without these values; for example, .us requires a nexus
   * category and the registrant's application purpose.
   */
  additional?: Record<string, Record<string, string>>;
  // Registration period in years. Default 1.
  period?: number;
  // Auto-renew. Default true — we don't want domains expiring out from
  // under paying users.
  renew?: boolean;
}

export class DomainContactError extends Error {
  constructor(message: string, public readonly missing: string[]) {
    super(message);
    this.name = "DomainContactError";
  }
}

/** An accepted/uncertain purchase must be reconciled, not purchased again. */
export class DomainPurchasePendingError extends Error {}

type ContactField = {
  type: string;
  required: boolean;
  options?: Array<{ value: string }>;
};

const preparedPurchases = new WeakSet<BuyDomainArgs>();

/**
 * Read the current registry requirements before charging a customer. The
 * registrar accepts additional contact fields as a record of TLD records,
 * not a flat dictionary (the latter is rejected by its request decoder).
 * All entry points, including owner purchases, use this same preparation.
 */
export async function prepareDomainPurchase(args: BuyDomainArgs): Promise<BuyDomainArgs> {
  const country = (args.country || "US").trim().toUpperCase();
  const rawPhone = args.phone.trim();
  const digits = rawPhone.replace(/\D/g, "");
  const phone = rawPhone.startsWith("+")
    ? `+${digits}`
    : country === "US" && digits.length === 10
      ? `+1${digits}`
      : country === "US" && digits.length === 11 && digits.startsWith("1")
        ? `+${digits}`
        : "";
  const contact = {
    firstName: args.firstName.trim(), lastName: args.lastName.trim(),
    email: args.email.trim(), phone, address1: args.address1.trim(),
    city: args.city.trim(), state: args.state.trim(), postalCode: args.postalCode.trim(),
    country,
  };
  const missing = Object.entries(contact).filter(([, value]) => !value).map(([key]) => key);
  if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) missing.push("email");
  if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) missing.push("phone");
  if (!/^[A-Z]{2}$/.test(country)) missing.push("country");
  if (missing.length) {
    throw new DomainContactError("Please complete valid business address and contact details before registering your website.", [...new Set(missing)]);
  }
  if (!Number.isFinite(args.expectedPrice) || args.expectedPrice < 0.01) {
    throw new Error("A valid registrar price is required before purchase.");
  }
  if (args.period != null && (!Number.isInteger(args.period) || args.period < 1)) {
    throw new Error("A valid domain registration period is required.");
  }

  const domain = args.domain.trim().toLowerCase();
  const { token, teamId } = getAuth();
  const res = await fetch(withTeam(`${VERCEL_API}/v1/registrar/domains/${encodeURIComponent(domain)}/contact-info/schema`, teamId), {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`We could not check this extension's registration requirements (${res.status}). No new wallet charge was made.`);
  const schema = await res.json() as Record<string, ContactField>;
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    throw new Error("The registrar returned invalid registration requirements. No new wallet charge was made.");
  }

  const tld = domain.split(".").at(-1)!;
  if (args.additional && Object.values(args.additional).some((value) => !value || typeof value !== "object" || Array.isArray(value))) {
    throw new DomainContactError("Registry contact fields must be grouped by extension.", ["additional"]);
  }
  const supplied = args.additional?.[tld];
  if (supplied != null && (typeof supplied !== "object" || Array.isArray(supplied))) {
    throw new DomainContactError("Registry contact fields must be grouped by extension.", ["additional"]);
  }
  const fields: Record<string, string> = { ...supplied };
  // The US business setup collects the organization's name, EIN and US
  // address. Do not infer citizenship or eligibility for a foreign registrant.
  if (tld === "us" && country === "US" && args.orgName?.trim() && args.businessType) {
    fields.nexus_category ??= "C21";
    fields.app_purpose ??= args.businessType === "non_profit" ? "P2" : "P1";
  }
  const invalid: string[] = [];
  for (const [name, field] of Object.entries(schema)) {
    if (!field || typeof field !== "object" || typeof field.type !== "string" || typeof field.required !== "boolean") {
      throw new Error("The registrar returned unrecognized registration requirements. No new wallet charge was made.");
    }
    const value = fields[name];
    if (field.required && (typeof value !== "string" || !value.trim())) invalid.push(name);
    else if (value != null && (typeof value !== "string" || (field.type === "enum" && !field.options?.some((option) => option.value === value)))) invalid.push(name);
  }
  if (invalid.length) {
    throw new DomainContactError(`This extension needs additional registration details (${invalid.join(", ")}). Complete them or choose another extension such as .com, .net, or .org.`, invalid);
  }
  const additional = Object.keys(fields).length ? Object.freeze({ [tld]: Object.freeze(fields) }) : undefined;
  const prepared = Object.freeze({ ...args, ...contact, domain, orgName: args.orgName?.trim() || undefined, additional });
  preparedPurchases.add(prepared);
  return prepared;
}

export async function buyDomain(args: BuyDomainArgs): Promise<{
  domain: string;
  orderId: string;
}> {
  if (!preparedPurchases.has(args)) args = await prepareDomainPurchase(args);
  const { token, teamId } = getAuth();
  const res = await fetch(withTeam(`${VERCEL_API}/v1/registrar/domains/${encodeURIComponent(args.domain)}/buy`, teamId), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      autoRenew: args.renew ?? true,
      years: args.period ?? 1,
      expectedPrice: args.expectedPrice,
      contactInformation: {
        firstName: args.firstName,
        lastName: args.lastName,
        email: args.email,
        phone: args.phone,
        address1: args.address1,
        city: args.city,
        state: args.state,
        zip: args.postalCode,
        country: args.country ?? "US",
        companyName: args.orgName || undefined,
        additional: args.additional,
      },
    }),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const topMessage = typeof json?.message === "string" ? json.message : null;
    const topCode = typeof json?.code === "string" ? json.code : null;
    const nested = json?.error;
    const nestedMessage =
      typeof nested === "string"
        ? nested
        : nested && typeof nested === "object" && "message" in nested && typeof nested.message === "string"
          ? nested.message
          : null;
    const nestedCode =
      nested && typeof nested === "object" && "code" in nested && typeof nested.code === "string"
        ? nested.code
        : null;
    const message = topMessage || nestedMessage;
    const code = topCode || nestedCode;
    const detail = message
      ? `${message}${code ? ` (${code})` : ""}`
      : code || `registrar request failed (${res.status})`;
    console.error(`[vercel-domains] registrar purchase failed (${res.status}): ${detail}`);
    if (res.status >= 500) throw new DomainPurchasePendingError("The registrar is confirming your domain order.");
    if (res.status === 401 || res.status === 403) {
      throw new Error("Automatic domain registration is temporarily unavailable. Our team has been notified and the setup will retry automatically.");
    }
    throw new Error(detail);
  }
  const orderId = (json as { orderId?: string }).orderId;
  if (!orderId) throw new DomainPurchasePendingError("Vercel accepted the order but did not return an order ID");
  return { domain: args.domain, orderId };
}

export async function getDomainOrder(orderId: string, domain: string): Promise<{
  status: "completed" | "failed" | "pending";
  message?: string;
}> {
  const { token, teamId } = getAuth();
  const res = await fetch(
    withTeam(`${VERCEL_API}/v1/registrar/orders/${encodeURIComponent(orderId)}`, teamId),
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  const json = (await res.json().catch(() => ({}))) as {
    status?: string;
    error?: { message?: string } | string;
    domains?: Array<{ domainName?: string; status?: string; error?: { message?: string } | string }>;
  };
  if (!res.ok) {
    const message = typeof json.error === "string" ? json.error : json.error?.message;
    throw new Error(message || `Domain order check failed (${res.status})`);
  }
  const entry = json.domains?.find((item) => item.domainName?.toLowerCase() === domain.toLowerCase());
  const failed = ["failed", "refunded", "refund-failed", "cancelled", "canceled", "rejected"];
  if (failed.includes(String(json.status)) || failed.includes(String(entry?.status))) {
    const error = entry?.error ?? json.error;
    return {
      status: "failed",
      message: typeof error === "string" ? error : error?.message || "Domain registration failed",
    };
  }
  if (json.status === "completed" && entry?.status === "completed") return { status: "completed" };
  return { status: "pending" };
}

// ── Attach the purchased domain to the text2sale project ────────────────
// Buying a domain through Vercel registers it but doesn't link it to a
// project — that's a separate call. This is idempotent; calling it on an
// already-attached domain is a no-op (returns 409 which we swallow).
export async function attachDomainToProject(
  domain: string,
  opts: { redirectTo?: string } = {}
): Promise<void> {
  const { token, projectId, teamId } = getAuth();
  const res = await fetch(
    withTeam(`${VERCEL_API}/v10/projects/${projectId}/domains`, teamId),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        opts.redirectTo
          ? { name: domain, redirect: opts.redirectTo, redirectStatusCode: 308 }
          : { name: domain }
      ),
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
  // Keep the recognizable business name whenever possible. Domain labels may
  // be up to 63 characters; 40 remains readable without turning a name such
  // as "Johnson Health Quotes" into an unclear abbreviation.
  if (base.length > 40) base = base.slice(0, 40);
  return base;
}

/** A word that fits the customer's trade, for names like "acmehealth.com". */
const INDUSTRY_SUFFIX: Record<string, string> = {
  health_insurance: "health",
  life_insurance: "life",
  auto_insurance: "auto",
  home_insurance: "home",
  medicare: "medicare",
  real_estate: "realty",
  solar: "solar",
  roofing: "roofing",
  financial_services: "financial",
  auto_dealer: "motors",
  debt_settlement: "financial",
  legal: "law",
};

export function suggestDomains(businessName: string, industry?: string | null): string[] {
  const base = suggestDomainBase(businessName);
  if (!base) return [];
  const suffix = (industry && INDUSTRY_SUFFIX[industry]) || "";
  // Compare the exact same business name across familiar extensions first.
  // Low-trust bulk-spam TLDs stay excluded because they can hurt link
  // deliverability and defeat the purpose of a registered brand website.
  const candidates = [
    `${base}.com`,
    `${base}.org`,
    `${base}.net`,
    `${base}.us`,
    `${base}.co`,
    suffix ? `${base}${suffix}.com` : "",
    `get${base}.com`,
    `${base}hq.com`,
  ].filter(Boolean);
  return [...new Set(candidates)];
}
