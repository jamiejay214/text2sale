// ── Sending-domain DNS guide ────────────────────────────────────────────────
// Telnyx gives us the records a sending domain needs. Most customers already
// have email on their domain (Google Workspace, Microsoft 365, Namecheap
// Private Email...), so "add these records" isn't enough: a second SPF record
// breaks both, and a second DMARC record is ignored. This looks up what the
// domain already publishes and turns each record into one step: add it, edit
// the existing one (with the merged value), keep yours, or already done.

export type RecordAction = "add" | "edit" | "keep" | "done";

export type RecordStep = {
  type: string;
  /** Full record name, e.g. telnyx1._domainkey.news.example.com */
  name: string;
  /** What to type in the provider's Host field: "@" for the zone apex. */
  host: string;
  /** The value to enter. For "edit" this is the merged value. */
  value: string;
  action: RecordAction;
  current?: string;
};

export type DnsProvider = { name: string; url: string; tip?: string };

export type DnsPlan = {
  zone: string;
  provider: DnsProvider | null;
  steps: RecordStep[];
  /** The domain already runs email, so a subdomain would avoid touching it. */
  suggestSubdomain: string | null;
};

const PROVIDERS: { match: string; provider: DnsProvider }[] = [
  { match: "registrar-servers.com", provider: { name: "Namecheap", url: "https://ap.www.namecheap.com/domains/list/", tip: "Domain List → Manage → Advanced DNS. With Namecheap Private Email the SPF record is locked, so send from a subdomain instead." } },
  { match: "domaincontrol.com", provider: { name: "GoDaddy", url: "https://dcc.godaddy.com/control/portfolio", tip: "My Products → your domain → DNS → Add New Record." } },
  { match: "cloudflare.com", provider: { name: "Cloudflare", url: "https://dash.cloudflare.com/", tip: "Your domain → DNS → Records → Add record." } },
  { match: "googledomains.com", provider: { name: "Squarespace Domains", url: "https://account.squarespace.com/domains", tip: "Your domain → DNS → DNS Settings → Add record." } },
  { match: "awsdns", provider: { name: "Amazon Route 53", url: "https://console.aws.amazon.com/route53/v2/hostedzones", tip: "Hosted zones → your domain → Create record." } },
  { match: "vercel-dns.com", provider: { name: "Vercel", url: "https://vercel.com/dashboard/domains", tip: "Domains → your domain → DNS Records." } },
  { match: "wixdns.net", provider: { name: "Wix", url: "https://manage.wix.com/account/domains", tip: "Domains → ⋯ → Manage DNS Records." } },
  { match: "dns-parking.com", provider: { name: "Hostinger", url: "https://hpanel.hostinger.com/domains", tip: "Domains → your domain → DNS / Nameservers." } },
  { match: "bluehost.com", provider: { name: "Bluehost", url: "https://my.bluehost.com/hosting/app#/domains", tip: "Domains → your domain → DNS." } },
  { match: "porkbun.com", provider: { name: "Porkbun", url: "https://porkbun.com/account/domainsSpeedy", tip: "Your domain → DNS." } },
  { match: "name.com", provider: { name: "Name.com", url: "https://www.name.com/account/domain", tip: "Your domain → Manage DNS Records." } },
  { match: "ui-dns", provider: { name: "IONOS", url: "https://my.ionos.com/domains", tip: "Domains & SSL → your domain → DNS." } },
  { match: "azure-dns", provider: { name: "Azure DNS", url: "https://portal.azure.com/#browse/Microsoft.Network%2FdnsZones", tip: "DNS zones → your domain → + Record set." } },
];

const clean = (name: string) => name.trim().toLowerCase().replace(/\.$/, "");
const squash = (v: string) => v.trim().replace(/^"|"$/g, "").replace(/\s+/g, " ");

export function providerFromNs(nameservers: string[]): DnsProvider | null {
  for (const ns of nameservers.map(clean)) {
    const hit = PROVIDERS.find((p) => ns.includes(p.match));
    if (hit) return hit.provider;
  }
  return null;
}

/** The Host field most DNS providers expect: the name without the zone, or "@". */
export function relativeHost(name: string, zone: string): string {
  const n = clean(name);
  const z = clean(zone);
  if (n === z) return "@";
  return n.endsWith(`.${z}`) ? n.slice(0, -(z.length + 1)) : n;
}

/** Add the new SPF includes to an existing SPF record, before its "all" or redirect. */
export function mergeSpf(existing: string, wanted: string): string {
  const current = squash(existing).split(" ");
  const includes = squash(wanted).split(" ").filter((t) => /^include:/i.test(t) && !current.some((c) => c.toLowerCase() === t.toLowerCase()));
  if (!includes.length) return current.join(" ");
  const tail = current.findIndex((t) => /^[-~?+]?all$/i.test(t) || /^redirect=/i.test(t));
  if (tail === -1) return [...current, ...includes].join(" ");
  return [...current.slice(0, tail), ...includes, ...current.slice(tail)].join(" ");
}

const isSpf = (v: string) => /^v=spf1(\s|$)/i.test(squash(v));
const isDmarc = (v: string) => /^v=dmarc1/i.test(squash(v));

/**
 * Turn the records Telnyx wants into steps, given the TXT records each name
 * already has (`existing[name]`) and whether the sending domain already
 * receives mail (has MX records).
 */
export function planRecords(args: {
  domain: string;
  zone: string;
  records: { type: string; name: string; value: string }[];
  existing: Record<string, string[]>;
  domainHasMail: boolean;
}): Omit<DnsPlan, "provider"> {
  const steps = args.records.map((r): RecordStep => {
    const name = clean(r.name);
    const base = { type: r.type, name, host: relativeHost(name, args.zone), value: squash(r.value) };
    const found = (args.existing[name] || []).map(squash);
    if (found.some((v) => v === base.value)) return { ...base, action: "done" };
    if (isSpf(base.value)) {
      const spf = found.find(isSpf);
      if (!spf) return { ...base, action: "add" };
      const merged = mergeSpf(spf, base.value);
      return merged === spf ? { ...base, value: spf, action: "done" } : { ...base, value: merged, action: "edit", current: spf };
    }
    if (isDmarc(base.value)) {
      const dmarc = found.find(isDmarc);
      if (dmarc) return { ...base, value: dmarc, action: "keep", current: dmarc };
    }
    return { ...base, action: "add" };
  });
  const apex = clean(args.domain) === clean(args.zone);
  return { zone: clean(args.zone), steps, suggestSubdomain: apex && args.domainHasMail ? `news.${clean(args.zone)}` : null };
}

// ── Live lookups ────────────────────────────────────────────────────────────
// DNS over HTTPS (Google, then Cloudflare): public resolvers so a record the
// customer just added shows up promptly, and plain HTTPS so it works from any
// serverless runtime. A network failure throws, so we never show a plan built
// on lookups that didn't happen.

const TYPE_CODE = { TXT: 16, NS: 2, MX: 15 } as const;

async function query(name: string, type: keyof typeof TYPE_CODE): Promise<string[]> {
  const q = `name=${encodeURIComponent(name)}&type=${type}`;
  const endpoints = [`https://dns.google/resolve?${q}`, `https://cloudflare-dns.com/dns-query?${q}`];
  let lastError: unknown;
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers: { accept: "application/dns-json" }, cache: "no-store", signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error(`DNS lookup failed (${res.status})`);
      const json = (await res.json()) as { Answer?: { type: number; data: string }[] };
      return (json.Answer || []).filter((a) => a.type === TYPE_CODE[type]).map((a) => a.data);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

/** TXT answers come quoted, long ones split into chunks: "v=DKIM1; p=AB" "CD". */
export function txtValue(data: string): string {
  const chunks = [...data.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1].replace(/\\(.)/g, "$1"));
  return chunks.length ? chunks.join("") : data;
}

/** The zone a name lives in: the nearest parent (or itself) that has NS records. */
async function findZone(domain: string): Promise<{ zone: string; ns: string[] }> {
  const labels = clean(domain).split(".");
  for (let i = 0; i < labels.length - 1; i++) {
    const candidate = labels.slice(i).join(".");
    const ns = await query(candidate, "NS");
    if (ns.length) return { zone: candidate, ns };
  }
  return { zone: labels.slice(-2).join("."), ns: [] };
}

/** Look up the domain's current DNS and plan each record. Returns null if DNS can't be reached. */
export async function inspectDns(domain: string, records: { type: string; name: string; value: string }[]): Promise<DnsPlan | null> {
  try {
    const { zone, ns } = await findZone(domain);
    const names = [...new Set(records.map((rec) => clean(rec.name)))];
    const [lookups, mx] = await Promise.all([
      Promise.all(names.map(async (n) => [n, (await query(n, "TXT")).map(txtValue)] as const)),
      query(clean(domain), "MX"),
    ]);
    const plan = planRecords({ domain, zone, records, existing: Object.fromEntries(lookups), domainHasMail: mx.length > 0 });
    return { ...plan, provider: providerFromNs(ns) };
  } catch {
    return null;
  }
}
