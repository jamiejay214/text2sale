// ============================================================
// SMS text sanitization
// ------------------------------------------------------------
// A single Unicode character (curly quote, em-dash, ellipsis, …) in an
// otherwise ASCII message forces the entire SMS into UCS-2 encoding, which
// drops the per-segment limit from 160 chars (GSM-7) to 70 chars. At scale
// this can double or triple the segment count — and the cost — of a blast.
//
// The top offenders are almost always typographic substitutions that
// macOS / iOS / Word / LLM output introduce silently:
//   • curly single quotes:  ' '   → '
//   • curly double quotes:  " "   → "
//   • em-dash / en-dash:    — –   → -
//   • ellipsis:             …     → ...
//   • non-breaking space:   \u00A0 → regular space
//
// This module runs the same normalization everywhere a message body is
// touched before Telnyx sees it: dashboard composer (so the segment
// counter reflects real cost), /api/send-sms, /api/send-campaign,
// /api/scheduled-send, and both AI response endpoints (/api/ai-reply,
// /api/agent/run) so AI-generated text never pushes us into UCS-2 in the
// first place.
// ============================================================

const REPLACEMENTS: Array<[RegExp, string]> = [
  // Single quotes / apostrophes
  [/[\u2018\u2019\u201A\u201B]/g, "'"],
  // Double quotes
  [/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"'],
  // Dashes
  [/[\u2013\u2014\u2015]/g, "-"],
  // Ellipsis → three dots
  [/\u2026/g, "..."],
  // Bullet → asterisk
  [/[\u2022\u25CF\u2023]/g, "*"],
  // Non-breaking / thin / zero-width spaces → regular space (or strip ZWSP)
  [/[\u00A0\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F]/g, " "],
  [/[\u200B\u200C\u200D\uFEFF]/g, ""],
  // Soft hyphen → strip (invisible, burns a unicode slot for nothing)
  [/\u00AD/g, ""],
];

/**
 * Returns the message body with the typographic substitutions above
 * normalized back to ASCII equivalents. Safe to call on any string —
 * non-matching text passes through untouched.
 */
export function sanitizeForSms(body: string): string {
  if (!body) return body;
  let out = body;
  for (const [pattern, replacement] of REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/**
 * Returns true if the (post-sanitized) body still contains any non-ASCII
 * character that would force UCS-2 encoding. The composer uses this to
 * show the "Unicode detected" warning only when there's a real reason.
 */
export function hasNonGsmChars(body: string): boolean {
  return /[^\x00-\x7F]/.test(body);
}
