// Detects short-form "decline" responses where the lead clearly doesn't want
// to engage. These are NOT treated as TCPA opt-outs (no DNC mark, no
// confirmation text), but they DO stop the AI from replying so the bot
// doesn't look tone-deaf or push someone who's disengaging.
//
// Examples: "N", "No", "Not interested", "Remove me", "Stop texting",
//           "Wrong number", "Leave me alone", "Don't contact me".

const DECLINE_EXACT = new Set([
  "N",
  "NO",
  "NOPE",
  "NAH",
  "NAW",
  "NO THANKS",
  "NO THANK YOU",
  "NOT INTERESTED",
  "NOT INTRESTED",
  "NOT RIGHT NOW",
  "WRONG NUMBER",
  "WRONG #",
  "WRONG PERSON",
  "WHO IS THIS",
  "WHO IS THIS?",
  "REMOVE",
  "REMOVE ME",
  "TAKE ME OFF",
  "TAKE ME OFF YOUR LIST",
  "DELETE MY NUMBER",
  "DELETE ME",
  "LEAVE ME ALONE",
  "GO AWAY",
  "DONT TEXT ME",
  "DON'T TEXT ME",
  "DONT TEXT",
  "DON'T TEXT",
  "STOP TEXTING",
  "STOP TEXTING ME",
  "STOP MESSAGING",
  "STOP MESSAGING ME",
  "DONT CONTACT ME",
  "DON'T CONTACT ME",
  "DO NOT CONTACT",
  "DO NOT CONTACT ME",
  "LOSE MY NUMBER",
  "LOOSE MY NUMBER",
]);

// Substrings that make a response look like a decline even inside a longer
// message. Deliberately conservative to avoid false positives (e.g. "don't
// stop" would NOT hit "stop" because we require it as part of a longer phrase).
const DECLINE_PHRASES = [
  "NOT INTERESTED",
  "REMOVE ME",
  "REMOVE MY",
  "TAKE ME OFF",
  "STOP TEXTING",
  "STOP MESSAGING",
  "STOP CONTACTING",
  "DO NOT CONTACT",
  "DONT CONTACT ME",
  "DON'T CONTACT ME",
  "DO NOT TEXT",
  "DONT TEXT ME",
  "DON'T TEXT ME",
  "LEAVE ME ALONE",
  "LOSE MY NUMBER",
  "LOOSE MY NUMBER",
  "WRONG NUMBER",
  "WRONG PERSON",
  "DELETE MY NUMBER",
];

/**
 * Returns true when the AI should silently skip replying to this message.
 * Does NOT mark the contact as DNC — caller decides whether to apply TCPA
 * opt-out handling separately (that's a distinct concept).
 */
export function shouldAiSkipReply(body: string): boolean {
  if (!body) return false;
  const normalized = body
    .trim()
    .toUpperCase()
    // collapse internal whitespace so "stop    texting" still matches
    .replace(/\s+/g, " ")
    // strip trailing punctuation/emoji-ish bits that don't change meaning
    .replace(/[.!?,;:]+$/g, "")
    .trim();

  if (!normalized) return false;
  if (DECLINE_EXACT.has(normalized)) return true;

  // For longer messages, look for decline phrases anywhere
  for (const phrase of DECLINE_PHRASES) {
    if (normalized.includes(phrase)) return true;
  }

  return false;
}
