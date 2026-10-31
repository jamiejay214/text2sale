// ── Designed emails ─────────────────────────────────────────────────────────
// A branded, "picture-style" email built from a few fields: logo, brand
// color, headline, three benefits, a problem/solution pair, an offer box and
// a big button. Rendered with tables and bgcolor only, because Gmail and
// Outlook strip most modern CSS. Pure and browser-safe, so the composer's
// live preview and the sender produce the same HTML.

export type EmailDesign = {
  /** "personal": a plain letter with one button and a signature. "card" (default): the branded card. */
  style?: "personal" | "card";
  /** Sign-off under a personal email, e.g. "Jamie". */
  signature?: string;
  /** Footer overrides; blank uses the account's business details. */
  footerName?: string;
  footerAddress?: string;
  footerNote?: string;
  /** Wording of the unsubscribe link; one of UNSUBSCRIBE_LABELS. */
  footerUnsubscribe?: string;
  theme: "dark" | "light";
  brandColor: string;
  logoUrl?: string | null;
  eyebrow: string;
  headline: string;
  bullets: string[];
  problemTitle: string;
  problem: string;
  solutionTitle: string;
  solution: string;
  offerLabel: string;
  offerTitle: string;
  offerSubtitle: string;
  offerValue: string;
  ctaText: string;
  ctaUrl: string;
};

export type MergeContact = {
  first_name?: string | null;
  last_name?: string | null;
  city?: string | null;
  state?: string | null;
  /** The sender's name, for {agent_name}. */
  agent_name?: string | null;
};

export type Footer = {
  businessName: string;
  address: string;
  unsubscribeUrl: string;
  /** Why they're getting this; defaults to "You're receiving this because you contacted <business>." */
  note?: string;
  /** The unsubscribe link's wording; defaults to "Unsubscribe". */
  unsubscribeLabel?: string;
};

/** Opt-out wordings a footer may use. Each plainly says what the link does (CAN-SPAM wants it clear). */
export const UNSUBSCRIBE_LABELS = ["Unsubscribe", "Opt out", "Unsubscribe from these emails", "Stop getting these emails", "Remove me from this list"] as const;

const oneLine = (s: unknown, max: number) => String(s ?? "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

/** A mailing address must look real (CAN-SPAM): some length and a number (street, PO box or ZIP). */
export const isMailingAddress = (s: string) => s.length >= 10 && /\d/.test(s);

/**
 * The footer for one email: the campaign's overrides where set, otherwise
 * the account's business name and address. The unsubscribe link is always
 * added and can't be removed.
 */
export function footerFor(account: { businessName: string; address: string }, design: Partial<EmailDesign> | null | undefined, unsubscribeUrl: string): Footer {
  const name = oneLine(design?.footerName, 120);
  const address = oneLine(design?.footerAddress, 200);
  const note = oneLine(design?.footerNote, 200);
  return {
    businessName: name || account.businessName,
    address: isMailingAddress(address) ? address : account.address,
    note: note || undefined,
    unsubscribeLabel: (UNSUBSCRIBE_LABELS as readonly string[]).includes(design?.footerUnsubscribe || "") ? design!.footerUnsubscribe : undefined,
    unsubscribeUrl,
  };
}

export const escapeHtml = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/**
 * Replace {first_name}, {last_name}, {city}, {state}, {agent_name} (and the
 * older {firstName} / {lastName}). Missing values become "" (first name falls
 * back to "there").
 */
export function personalize(template: string, contact: MergeContact): string {
  return String(template ?? "")
    .replace(/\{first_?name\}/gi, (contact.first_name || "").trim() || "there")
    .replace(/\{last_?name\}/gi, (contact.last_name || "").trim())
    .replace(/\{city\}/gi, (contact.city || "").trim())
    .replace(/\{state\}/gi, (contact.state || "").trim())
    .replace(/\{agent_?name\}/gi, (contact.agent_name || "").trim());
}

const HEX = /^#[0-9a-f]{6}$/i;
const safeColor = (c: string, fallback: string) => (HEX.test(c || "") ? c : fallback);
const safeUrl = (u: string | null | undefined) => (u && /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : "");

/** A darker shade of a hex color, for borders and button text on light offers. */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 - amount))));
  return `#${[c((n >> 16) & 255), c((n >> 8) & 255), c(n & 255)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Fill any blanks so a half-edited design still renders. */
export function normalizeDesign(d: Partial<EmailDesign>): EmailDesign {
  return {
    style: d.style === "personal" ? "personal" : "card",
    signature: (d.signature || "").slice(0, 120),
    footerName: oneLine(d.footerName, 120),
    footerAddress: oneLine(d.footerAddress, 200),
    footerNote: oneLine(d.footerNote, 200),
    footerUnsubscribe: (UNSUBSCRIBE_LABELS as readonly string[]).includes(d.footerUnsubscribe || "") ? d.footerUnsubscribe : "",
    theme: d.theme === "light" ? "light" : "dark",
    brandColor: safeColor(d.brandColor || "", "#34d399"),
    logoUrl: safeUrl(d.logoUrl) || null,
    eyebrow: (d.eyebrow || "").slice(0, 60),
    headline: (d.headline || "").slice(0, 120),
    bullets: (d.bullets || []).map((b) => String(b || "").slice(0, 120)).filter(Boolean).slice(0, 4),
    problemTitle: (d.problemTitle || "").slice(0, 80),
    problem: (d.problem || "").slice(0, 400),
    solutionTitle: (d.solutionTitle || "").slice(0, 80),
    solution: (d.solution || "").slice(0, 400),
    offerLabel: (d.offerLabel || "").slice(0, 40),
    offerTitle: (d.offerTitle || "").slice(0, 80),
    offerSubtitle: (d.offerSubtitle || "").slice(0, 120),
    offerValue: (d.offerValue || "").slice(0, 24),
    ctaText: (d.ctaText || "").slice(0, 40),
    ctaUrl: safeUrl(d.ctaUrl),
  };
}

/** The designed email's HTML body (without <html> wrapper or footer). */
export function renderDesign(input: Partial<EmailDesign>, contact: MergeContact, businessName: string): string {
  const d = normalizeDesign(input);
  const t = (s: string) => escapeHtml(personalize(s, contact));
  const brand = d.brandColor;
  const dark = d.theme === "dark";
  const bg = dark ? "#0b0b0c" : "#ffffff";
  const fg = dark ? "#ffffff" : "#111827";
  const body = dark ? "#d1d5db" : "#374151";
  const font = "font-family:Helvetica,Arial,sans-serif";
  const panel = (fill: string, accent: string, title: string, text: string, titleColor: string) =>
    `<tr><td style="padding:12px 28px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>` +
    `<td width="4" bgcolor="${accent}" style="background-color:${accent};border-radius:8px 0 0 8px">&nbsp;</td>` +
    `<td bgcolor="${fill}" style="background-color:${fill};border-radius:0 8px 8px 0;padding:14px 16px;${font};font-size:15px;line-height:1.5;color:${dark ? "#e5e7eb" : "#1f2937"}">` +
    `${title ? `<b style="color:${titleColor}">${t(title)}</b> ` : ""}${t(text)}</td></tr></table></td></tr>`;

  const logo = d.logoUrl
    ? `<img src="${escapeHtml(d.logoUrl)}" alt="${escapeHtml(businessName)}" height="36" style="display:block;height:36px;max-width:200px;border:0">`
    : `<span style="${font};font-size:13px;letter-spacing:4px;font-weight:700;color:${brand}">${t(d.eyebrow || businessName.toUpperCase())}</span>`;

  const bullets = d.bullets
    .map(
      (b) =>
        `<tr><td width="30" valign="top" style="padding:0 0 10px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="20" height="20" align="center" bgcolor="${brand}" style="background-color:${brand};border-radius:10px;${font};font-size:12px;font-weight:900;color:${dark ? "#0b0b0c" : "#ffffff"}">&#10003;</td></tr></table></td>` +
        `<td valign="top" style="padding:0 0 10px;${font};font-size:15px;line-height:1.4;color:${body}">${t(b)}</td></tr>`,
    )
    .join("");

  const offer =
    d.offerTitle || d.offerValue
      ? `<tr><td style="padding:20px 28px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${dark ? "#ecfdf5" : "#f3f4f6"}" style="background-color:${dark ? "#ecfdf5" : "#f3f4f6"};border-radius:12px"><tr>` +
        `<td style="padding:16px 18px;${font}">${d.offerLabel ? `<div style="font-size:11px;letter-spacing:1.5px;font-weight:800;color:${shade(brand, 0.35)}">${t(d.offerLabel.toUpperCase())}</div>` : ""}` +
        `<div style="font-size:18px;font-weight:800;color:#0b0b0c;margin-top:3px">${t(d.offerTitle)}</div>` +
        (d.offerSubtitle ? `<div style="font-size:13px;color:#4b5563;margin-top:2px">${t(d.offerSubtitle)}</div>` : "") +
        `</td>${d.offerValue ? `<td align="right" style="padding:16px 18px;${font};font-size:26px;font-weight:800;color:#0b0b0c;white-space:nowrap">${t(d.offerValue)}</td>` : ""}</tr></table></td></tr>`
      : "";

  const cta =
    d.ctaText && d.ctaUrl
      ? `<tr><td style="padding:18px 28px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="${brand}" style="background-color:${brand};border-radius:10px;padding:15px">` +
        `<a href="${escapeHtml(d.ctaUrl)}" style="${font};color:${dark ? "#0b0b0c" : "#ffffff"};font-size:17px;font-weight:800;text-decoration:none">${t(d.ctaText)} &rarr;</a></td></tr></table></td></tr>`
      : "";

  return (
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" bgcolor="${bg}" style="background-color:${bg};width:100%;max-width:600px;border-radius:14px;${dark ? "" : "border:1px solid #e5e7eb;"}">` +
    `<tr><td height="6" bgcolor="${brand}" style="background-color:${brand};height:6px;font-size:0;line-height:0;border-radius:14px 14px 0 0">&nbsp;</td></tr>` +
    `<tr><td style="padding:24px 28px 0">${logo}</td></tr>` +
    (d.headline ? `<tr><td style="padding:16px 28px 0;${font};font-size:28px;line-height:1.2;font-weight:800;color:${fg}">${t(d.headline)}</td></tr>` : "") +
    (bullets ? `<tr><td style="padding:18px 28px 0"><table role="presentation" cellpadding="0" cellspacing="0">${bullets}</table></td></tr>` : "") +
    (d.problem ? panel(dark ? "#1c1710" : "#fffbeb", "#f59e0b", d.problemTitle, d.problem, dark ? "#fbbf24" : "#b45309") : "") +
    (d.solution ? panel(dark ? "#0f2a20" : "#ecfdf5", brand, d.solutionTitle, d.solution, dark ? brand : shade(brand, 0.35)) : "") +
    offer +
    cta +
    `<tr><td style="padding:0 0 24px;font-size:0;line-height:0">&nbsp;</td></tr></table>`
  );
}

/** Button text color: a deep shade of a light brand color, white on a dark one. */
function buttonText(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? shade(hex, 0.82) : "#ffffff";
}

/** A personal email's button and sign-off (HTML), under the letter body. */
export function renderPersonal(input: Partial<EmailDesign>, contact: MergeContact): string {
  const d = normalizeDesign(input);
  const button = d.ctaText && d.ctaUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px"><tr><td bgcolor="${d.brandColor}" style="background-color:${d.brandColor};border-radius:8px">` +
      `<a href="${escapeHtml(d.ctaUrl)}" style="display:inline-block;padding:12px 20px;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:bold;color:${buttonText(d.brandColor)};text-decoration:none">${escapeHtml(personalize(d.ctaText, contact))}</a></td></tr></table>`
    : "";
  const signature = d.signature ? `<p style="margin:0 0 16px">${escapeHtml(personalize(d.signature, contact)).replace(/\n/g, "<br>")}</p>` : "";
  return button + signature;
}

export function personalToText(input: Partial<EmailDesign>, contact: MergeContact): string {
  const d = normalizeDesign(input);
  return [d.ctaText && d.ctaUrl ? `${personalize(d.ctaText, contact)}: ${d.ctaUrl}` : "", personalize(d.signature || "", contact)].filter(Boolean).join("\n\n");
}

/** Plain-text version of a designed email, for the text/plain part. */
export function designToText(input: Partial<EmailDesign>, contact: MergeContact): string {
  const d = normalizeDesign(input);
  const p = (s: string) => personalize(s, contact);
  return [
    p(d.headline),
    d.bullets.map((b) => `- ${p(b)}`).join("\n"),
    d.problem ? `${p(d.problemTitle)} ${p(d.problem)}`.trim() : "",
    d.solution ? `${p(d.solutionTitle)} ${p(d.solution)}`.trim() : "",
    d.offerTitle ? `${p(d.offerTitle)}${d.offerValue ? ` · ${p(d.offerValue)}` : ""}${d.offerSubtitle ? `\n${p(d.offerSubtitle)}` : ""}` : "",
    d.ctaText && d.ctaUrl ? `${p(d.ctaText)}: ${d.ctaUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ── Full message ────────────────────────────────────────────────────────────

/** Plain text with blank-line paragraphs and bare https links → simple, deliverable HTML. */
export function bodyToHtml(text: string): string {
  return String(text ?? "")
    .trim()
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((para) => {
      const html = escapeHtml(para).replace(/\n/g, "<br>").replace(
        /https:\/\/[^\s<]+/g,
        (url) => `<a href="${url}" style="color:#047857">${url}</a>`,
      );
      return `<p style="margin:0 0 16px">${html}</p>`;
    })
    .join("");
}

const footerNote = (f: Footer) => f.note || `You're receiving this because you contacted ${f.businessName}.`;

export function footerText(f: Footer): string {
  return `--\n${f.businessName} · ${f.address}\n${footerNote(f)} ${f.unsubscribeLabel || "Unsubscribe"}: ${f.unsubscribeUrl}`;
}

/**
 * The complete email. With a design, the body text (if any) becomes a short
 * personal note above the designed card. Every email ends with the business
 * address and an unsubscribe link.
 */
export function buildEmail(args: {
  subject: string;
  previewText: string;
  body: string;
  contact: MergeContact;
  footer: Footer;
  design?: Partial<EmailDesign> | null;
}) {
  const subject = personalize(args.subject, args.contact).replace(/[\r\n]+/g, " ").trim();
  const body = personalize(args.body, args.contact);
  const preview = personalize(args.previewText, args.contact);
  const f = args.footer;
  const personal = args.design?.style === "personal";
  const html =
    `<!doctype html><html><body style="margin:0;padding:24px;background:#ffffff">` +
    (preview ? `<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preview)}</div>` : "") +
    `<div style="max-width:600px;margin:0 auto;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#1f2937">` +
    bodyToHtml(body) +
    (personal ? renderPersonal(args.design!, args.contact) : args.design ? renderDesign(args.design, args.contact, f.businessName) : "") +
    `<p style="margin:32px 0 0;font-size:12px;line-height:1.5;color:#6b7280">${escapeHtml(f.businessName)} · ${escapeHtml(f.address)}<br>` +
    `${escapeHtml(footerNote(f))} <a href="${escapeHtml(f.unsubscribeUrl)}" style="color:#6b7280">${escapeHtml(f.unsubscribeLabel || "Unsubscribe")}</a></p>` +
    `</div></body></html>`;
  const parts = [body.trim(), personal ? personalToText(args.design!, args.contact) : args.design ? designToText(args.design, args.contact) : ""].filter(Boolean);
  const text = `${parts.join("\n\n")}\n\n${footerText(f)}`;
  return { subject, html, text };
}
