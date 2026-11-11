// ── Customer notification emails ────────────────────────────────────────────
// Transactional emails sent TO customers (not the operator). House style:
// dark teal, the lowercase "text2sale." wordmark, HTML + plain-text fallback.
//
// Vendor-neutral by rule: never name the underlying carrier or messaging
// provider. To a customer it's all "Text2Sale" — "messaging approval",
// "your balance", "sending", never a third party's brand.

const APP = "https://text2sale.com";

const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Math.max(0, n));

/** Shared shell so every customer email looks like one family. */
function shell(opts: { heading: string; intro: string; bodyHtml: string; ctaText: string; ctaHref: string; footerNote?: string }): string {
  return (
    `<div style="background:#07151a;padding:32px;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0">` +
    `<div style="max-width:560px;margin:auto;padding:30px;background:#10252c;border:1px solid #29504c;border-radius:18px">` +
    `<p style="color:#6ee7b7;font-weight:700;font-size:22px;margin:0 0 18px">text2sale.</p>` +
    `<h1 style="color:#fff;font-size:24px;margin:0 0 12px">${opts.heading}</h1>` +
    `<p style="line-height:1.6;margin:0 0 18px">${opts.intro}</p>` +
    opts.bodyHtml +
    `<p style="margin:28px 0 8px"><a href="${opts.ctaHref}" style="background:#6ee7b7;color:#052e25;padding:14px 22px;border-radius:10px;text-decoration:none;font-weight:bold">${esc(opts.ctaText)}</a></p>` +
    (opts.footerNote ? `<p style="color:#9fb6b1;font-size:13px;line-height:1.6;margin:18px 0 0">${opts.footerNote}</p>` : "") +
    `<p style="color:#9fb6b1;font-size:13px;margin:22px 0 0">Questions? Open <strong>Support chat</strong> in your dashboard or reply to this email.</p>` +
    `</div></div>`
  );
}

export type Email = { subject: string; html: string; text: string };

/** A first name clean enough to drop into a subject line, or "" if we have none. */
function firstName(name: string): string {
  const n = String(name ?? "").trim().split(/\s+/)[0] || "";
  return /^[\p{L}'-]{1,30}$/u.test(n) ? n : "";
}

/** 1 · Account created — the welcome email. */
export function accountCreatedEmail(name: string): Email {
  const who = name?.trim() || "there";
  const fn = firstName(name);
  const subject = fn ? `Welcome to Text2Sale, ${fn} — let's get you set up` : "Welcome to Text2Sale — let's get you set up";
  const text =
    `Welcome to Text2Sale, ${who}!\n\n` +
    `You're in. Here's the quickest path to your first conversation:\n\n` +
    `1. Choose your plan and finish checkout.\n` +
    `2. Complete Messaging setup with your business details and EIN. Approval times vary; texting turns on once you're approved.\n` +
    `3. Add funds so your messages and calls can send.\n` +
    `4. Import your opted-in contacts and build your first campaign.\n\n` +
    `Open your dashboard: ${APP}/dashboard\n` +
    `Forgot your password? ${APP}/forgot-password\n\n` +
    `Questions? Open Support chat in your dashboard or just reply to this email.`;
  const html = shell({
    heading: `Welcome, ${esc(who)}.`,
    intro: "You're in — your next conversation starts here. Four quick steps and you're live:",
    bodyHtml:
      `<ol style="line-height:1.9;margin:0;padding-left:20px">` +
      `<li>Choose your plan and finish checkout.</li>` +
      `<li>Complete <strong>Messaging setup</strong> with your business details and EIN. Approval times vary; texting turns on once you're approved.</li>` +
      `<li>Add funds so your messages and calls can send.</li>` +
      `<li>Import your opted-in contacts and build your first campaign.</li>` +
      `</ol>`,
    ctaText: "Open your workspace",
    ctaHref: `${APP}/dashboard`,
    footerNote: `Forgot your password? <a style="color:#6ee7b7" href="${APP}/forgot-password">Reset it here</a>.`,
  });
  return { subject, html, text };
}

/** 2 · Messaging registration approved — they can now text. */
export function messagingApprovedEmail(name: string): Email {
  const who = name?.trim() || "there";
  const fn = firstName(name);
  const subject = fn ? `${fn}, you're approved — texting is now live 🎉` : "You're approved — texting is now live 🎉";
  const text =
    `Great news, ${who} — your business messaging is approved and your number is ready.\n\n` +
    `You can now send texts and run campaigns from your dashboard.\n\n` +
    `Get started:\n` +
    `1. Make sure your wallet has funds so messages can send.\n` +
    `2. Import your opted-in contacts.\n` +
    `3. Build a campaign and start the conversation.\n\n` +
    `Open your dashboard: ${APP}/dashboard\n\n` +
    `A reminder on staying in good standing: only text people who have opted in, and always honor STOP requests.`;
  const html = shell({
    heading: "You're approved — texting is live 🎉",
    intro: `Great news, ${esc(who)}. Your business messaging is approved and your number is ready to send.`,
    bodyHtml:
      `<ol style="line-height:1.9;margin:0;padding-left:20px">` +
      `<li>Make sure your wallet has funds so messages can send.</li>` +
      `<li>Import your opted-in contacts.</li>` +
      `<li>Build a campaign and start the conversation.</li>` +
      `</ol>`,
    ctaText: "Send your first campaign",
    ctaHref: `${APP}/dashboard`,
    footerNote:
      "Staying in good standing: only message people who opted in, and always honor STOP requests — it keeps your delivery strong.",
  });
  return { subject, html, text };
}

/** 3 · Low wallet balance — top up so sending doesn't stop. */
export function lowBalanceEmail(name: string, balance: number): Email {
  const who = name?.trim() || "there";
  const fn = firstName(name);
  const bal = money(balance);
  const subject = fn ? `${fn}, your Text2Sale balance is running low (${bal})` : `Your Text2Sale balance is running low (${bal})`;
  const text =
    `Hi ${who},\n\n` +
    `Your Text2Sale balance is down to ${bal}. Your balance pays for each text and call you send, so once it reaches zero, new messages and calls will pause until you add funds.\n\n` +
    `Add funds to keep things running: ${APP}/dashboard\n\n` +
    `Tip: turn on Auto Recharge in your billing settings and your balance tops up on its own — so you never miss a reply.`;
  const html = shell({
    heading: "Your balance is running low",
    intro:
      `Hi ${esc(who)}, your Text2Sale balance is down to <strong style="color:#fff">${bal}</strong>. ` +
      `Your balance pays for each text and call you send — once it hits zero, new messages and calls pause until you top up.`,
    bodyHtml:
      `<p style="line-height:1.6;margin:0 0 6px;color:#cfe3de">Add funds now and nothing skips a beat.</p>`,
    ctaText: "Add funds",
    ctaHref: `${APP}/dashboard`,
    footerNote:
      "Tip: turn on <strong>Auto Recharge</strong> in your billing settings and your balance refills on its own — so you never miss a reply.",
  });
  return { subject, html, text };
}

export type ReceiptItem = { description: string; amount: number };

/**
 * 4 · Receipt — sent whenever the customer's card is charged (a subscription
 * renewal or funds added to their balance). Itemized, vendor-neutral.
 */
export function receiptEmail(opts: {
  name: string;
  items: ReceiptItem[];
  total: number;
  date?: Date;
  kind?: "subscription" | "funds" | "purchase";
  cardLast4?: string | null;
  receiptId?: string | null;
}): Email {
  const who = opts.name?.trim() || "there";
  const fn = firstName(opts.name);
  const when = (opts.date || new Date()).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const total = money(opts.total);
  const paidWith = opts.cardLast4 ? `Card ending ${esc(String(opts.cardLast4))}` : "Card on file";
  const headline =
    opts.kind === "funds" ? "Thanks — funds added to your balance" : opts.kind === "subscription" ? "Thanks for your payment" : "Your receipt";

  const subject = `Your Text2Sale receipt — ${total}`;

  const rows = opts.items
    .map(
      (it) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #29504c;color:#cfe3de">${esc(it.description)}</td>` +
        `<td style="padding:10px 0;border-bottom:1px solid #29504c;text-align:right;color:#fff;white-space:nowrap">${money(it.amount)}</td></tr>`,
    )
    .join("");

  const bodyHtml =
    `<table style="width:100%;border-collapse:collapse;margin:6px 0 4px">${rows}` +
    `<tr><td style="padding:14px 0 0;font-weight:bold;color:#fff">Total</td>` +
    `<td style="padding:14px 0 0;text-align:right;font-weight:bold;color:#6ee7b7;white-space:nowrap">${total}</td></tr></table>` +
    `<p style="color:#9fb6b1;font-size:13px;line-height:1.7;margin:16px 0 0">` +
    `${esc(when)} · ${esc(paidWith)}${opts.receiptId ? ` · Receipt ${esc(opts.receiptId)}` : ""}` +
    `${opts.kind === "subscription" ? "<br>This is a recurring monthly charge for your plan." : ""}</p>`;

  const text =
    `Hi ${who},\n\n` +
    `${headline}.\n\n` +
    opts.items.map((it) => `- ${it.description}: ${money(it.amount)}`).join("\n") +
    `\n\nTotal: ${total}\n${when} · ${paidWith}${opts.receiptId ? ` · Receipt ${opts.receiptId}` : ""}\n` +
    (opts.kind === "subscription" ? `\nThis is a recurring monthly charge for your plan.\n` : "") +
    `\nSee your billing history anytime: ${APP}/dashboard\n\n` +
    `Questions about this charge? Just reply to this email.`;

  const html = shell({
    heading: `${headline}, ${esc(who)}.`,
    intro: fn ? `Here's your receipt, ${esc(fn)} — thanks for using Text2Sale.` : "Here's your receipt — thanks for using Text2Sale.",
    bodyHtml,
    ctaText: "View billing history",
    ctaHref: `${APP}/dashboard`,
  });
  return { subject, html, text };
}
