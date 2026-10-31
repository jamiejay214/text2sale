import { NextRequest, NextResponse } from "next/server";
import { authenticateWorkspace } from "@/lib/workspace-auth";
import { db, emailAccount } from "@/lib/email-campaigns";
import { createEmailDomain, deleteEmailDomain, emailConfigured, verifyEmailDomain, type DnsRecord } from "@/lib/telnyx-email";
import { inspectDns } from "@/lib/email-dns";
import { addDnsRecord, listDnsRecords } from "@/lib/vercel-domains";

// The customer's sending domain, registered with Telnyx Email. On a domain
// Text2Sale registered for them (profiles.custom_domain), or a subdomain of
// it, we publish the DNS records ourselves; on any other domain we look up
// what it already has and show each record as a step (lib/email-dns.ts).

const DOMAIN_RE = /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})*\.[a-z]{2,}$/;

/** Publish records on a Vercel-managed zone. Skips SPF where one exists: two SPF records break both. */
async function publishRecords(zone: string, records: DnsRecord[]) {
  const existing = await listDnsRecords(zone);
  const host = (name: string) => (name === zone ? "" : name.endsWith(`.${zone}`) ? name.slice(0, -(zone.length + 1)) : name);
  for (const record of records) {
    const spfTaken = record.value.startsWith("v=spf1") && existing.some((r) => r.type === "TXT" && (r.name === "@" ? "" : r.name) === host(record.name) && r.value.startsWith("v=spf1"));
    if (spfTaken) continue;
    await addDnsRecord(zone, record);
  }
}

/** The Text2Sale-managed zone a sending domain belongs to, if any. */
const managedZone = (domain: string, customDomain: string | null) =>
  customDomain && (domain === customDomain || domain.endsWith(`.${customDomain}`)) ? customDomain : null;

/** The step-by-step DNS guide, only while the domain still needs records. */
const guideFor = (sender: { domain: string; status: string; dns_records: DnsRecord[] } | null) =>
  sender && sender.status !== "verified" ? inspectDns(sender.domain, sender.dns_records || []) : Promise.resolve(null);

export async function GET(req: NextRequest) {
  const auth = await authenticateWorkspace(req);
  if (!auth.ok) return auth.response;
  const database = db();
  const account = await emailAccount(database, auth.user.id);
  const { data: sender } = await database.from("email_senders").select("*").eq("user_id", auth.user.id).maybeSingle();
  return NextResponse.json({
    enabled: emailConfigured(),
    account: { ok: account.ok, error: account.error || null, businessName: account.businessName, address: account.address, replyTo: account.replyTo, logoUrl: account.logoUrl, industry: account.industry },
    suggestedDomain: account.customDomain,
    sender: sender || null,
    dnsPlan: await guideFor(sender),
  });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateWorkspace(req);
  if (!auth.ok) return auth.response;
  if (!emailConfigured()) return NextResponse.json({ error: "Email sending isn't switched on yet." }, { status: 503 });
  const userId = auth.user.id;
  const body = await req.json().catch(() => ({}));
  const database = db();
  const account = await emailAccount(database, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: 412 });

  try {
    if (body.action === "refresh") {
      const { data: sender } = await database.from("email_senders").select("provider_domain_id").eq("user_id", userId).maybeSingle();
      if (!sender?.provider_domain_id) return NextResponse.json({ error: "Set up a sending domain first." }, { status: 404 });
      const status = await verifyEmailDomain(sender.provider_domain_id);
      const { data } = await database
        .from("email_senders")
        .update({
          status: status.verified ? "verified" : "pending",
          verified_at: status.verified ? new Date().toISOString() : null,
          dns_records: status.records,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select("*")
        .single();
      return NextResponse.json({ sender: data, dnsPlan: await guideFor(data) });
    }

    const domain = String(body.domain || account.customDomain || "").trim().toLowerCase().replace(/^www\./, "");
    if (!DOMAIN_RE.test(domain)) return NextResponse.json({ error: "Enter a domain like yourbusiness.com." }, { status: 400 });
    const fromLocal = String(body.fromLocal || "hello").trim().toLowerCase();
    if (!/^[a-z0-9._-]{1,64}$/.test(fromLocal)) return NextResponse.json({ error: "The address before @ can use letters, numbers, dots and dashes." }, { status: 400 });
    const fromName = String(body.fromName || account.businessName).trim().slice(0, 120);
    const replyTo = String(body.replyTo || account.replyTo || "").trim().slice(0, 254) || null;

    const { data: taken } = await database.from("email_senders").select("user_id").eq("domain", domain).neq("user_id", userId).limit(1);
    if (taken?.length) return NextResponse.json({ error: "That domain is already used by another account." }, { status: 409 });

    // Re-running setup on the same domain only updates the sender details.
    const { data: current } = await database.from("email_senders").select("domain, provider_domain_id, status, dns_records, dns_managed").eq("user_id", userId).maybeSingle();
    let providerId: string = current?.domain === domain ? current.provider_domain_id : "";
    let records: DnsRecord[] = current?.domain === domain ? current.dns_records : [];
    let verified = current?.domain === domain && current.status === "verified";
    let dnsManaged = current?.domain === domain ? Boolean(current.dns_managed) : false;
    if (!providerId) {
      const created = await createEmailDomain(domain);
      providerId = created.id;
      records = created.records;
      verified = created.verified;
      // Switching domains: drop the old one from Telnyx (best effort).
      if (current?.provider_domain_id && current.domain !== domain) {
        await deleteEmailDomain(current.provider_domain_id).catch((e) => console.warn("[email/sender] old domain not removed", e));
      }
      const zone = managedZone(domain, account.customDomain);
      if (zone) {
        try {
          await publishRecords(zone, records);
          dnsManaged = true;
        } catch {
          dnsManaged = false; // fall back to showing the records
        }
      }
    }

    const { data, error } = await database
      .from("email_senders")
      .upsert(
        {
          user_id: userId,
          domain,
          provider_domain_id: providerId,
          from_local: fromLocal,
          from_name: fromName,
          reply_to: replyTo,
          status: verified ? "verified" : "pending",
          verified_at: verified ? new Date().toISOString() : null,
          dns_records: records,
          dns_managed: dnsManaged,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ sender: data, dnsPlan: await guideFor(data) });
  } catch (e) {
    console.error("[email/sender]", e);
    return NextResponse.json({ error: "Couldn't set up the sending domain. Please try again." }, { status: 502 });
  }
}
