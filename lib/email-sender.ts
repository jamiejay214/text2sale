// ── Outgoing email identity ───────────────────────────────────────────────
// Every email Text2Sale sends (welcome, billing notices, alerts) comes from
// support@text2sale.com, and replies go back to it. The domain is verified
// with Resend. Keep sender addresses here rather than in each route.

export const SUPPORT_EMAIL = "support@text2sale.com";
export const EMAIL_FROM = `Text2Sale <${SUPPORT_EMAIL}>`;
export const ALERT_EMAIL_FROM = `Text2Sale Alerts <${SUPPORT_EMAIL}>`;
