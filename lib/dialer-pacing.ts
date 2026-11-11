// ── Predictive dialer pacing ───────────────────────────────────────────────
// With one agent, dialing n leads at once abandons every live answer after
// the first. The FTC Telemarketing Sales Rule caps abandoned calls at 3% of
// live answers per campaign over 30 days, so the line count is chosen from
// the measured live-answer rate p:
//
//   expected abandon rate(n, p) = 1 - P(at least one answers) / E[answers]
//                               = 1 - (1 - (1 - p)^n) / (n p)
//
// which is p/2 at two lines and about p at three. Two lines only stay under
// the cap while fewer than ~5% of dials reach a person, three under ~2.5%.
// The rate starts from a pessimistic prior (so a new list dials one line at
// a time until it has shown how often people pick up) and the dialer drops
// to one line, which never abandons, whenever the real 30-day rate nears
// the cap.

import { inferTimezone } from "./quiet-hours";

/** Highest abandon rate the dialer will plan for (the legal cap is 3%). */
export const TARGET_ABANDON_RATE = 0.02;
/** Real 30-day abandon rate at which the dialer stops dialing extra lines. */
export const ABANDON_BRAKE = 0.025;
/** The legal cap: abandoned / live answers, per 30 days. */
export const ABANDON_CAP = 0.03;

const PRIOR_ANSWER_RATE = 0.15;
const PRIOR_WEIGHT = 20;

export function expectedAbandonRate(lines: number, answerRate: number): number {
  const n = Math.max(1, Math.floor(lines));
  const p = Math.min(1, Math.max(0, answerRate));
  if (n === 1 || p === 0) return 0;
  return 1 - (1 - Math.pow(1 - p, n)) / (n * p);
}

/** Live answers per dial, smoothed toward a pessimistic prior. */
export function estimatedAnswerRate(dials: number, liveAnswers: number): number {
  return (Math.max(0, liveAnswers) + PRIOR_ANSWER_RATE * PRIOR_WEIGHT) / (Math.max(0, dials) + PRIOR_WEIGHT);
}

/** Abandoned calls as a share of live answers; 0 before any answers. */
export function abandonRate(abandoned: number, connected: number): number {
  const live = abandoned + connected;
  return live > 0 ? abandoned / live : 0;
}

export type PacingInput = {
  maxLines: number;
  /** Dials and live answers (connected + abandoned) used for the answer rate. */
  dials: number;
  liveAnswers: number;
  /** Last 30 days, all sessions: the number the rule is measured on. */
  abandoned30d: number;
  connected30d: number;
};

/** Lines to dial at once: the most that keeps abandons under the target. */
export function chooseLines(input: PacingInput): number {
  const max = Math.min(3, Math.max(1, Math.floor(input.maxLines)));
  if (abandonRate(input.abandoned30d, input.connected30d) >= ABANDON_BRAKE) return 1;
  const p = estimatedAnswerRate(input.dials, input.liveAnswers);
  let lines = 1;
  for (let n = 2; n <= max; n++) {
    if (expectedAbandonRate(n, p) <= TARGET_ABANDON_RATE) lines = n;
  }
  return lines;
}

/** First and last calling hour (local time of the lead's state). */
export const CALL_START_HOUR = 8;
export const CALL_END_HOUR = 20;

/**
 * Whether a lead may be called now: 8 AM to 8 PM in their state's time
 * zone. Federal rules allow until 9 PM; 8 PM matches the strictest common
 * state limit (Florida, among others).
 */
export function withinCallingHours(state: string | null | undefined, now: Date = new Date()): boolean {
  try {
    const hour = Number(
      new Intl.DateTimeFormat("en-US", { timeZone: inferTimezone(state || undefined), hour: "numeric", hourCycle: "h23" }).format(now),
    );
    return hour >= CALL_START_HOUR && hour < CALL_END_HOUR;
  } catch {
    return false;
  }
}

/** A phone number read out digit by digit: "954, 676, 1423". */
export function speakablePhone(raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  if (digits.length !== 10) return digits.split("").join(" ");
  const say = (part: string) => part.split("").join(" ");
  return `${say(digits.slice(0, 3))}, ${say(digits.slice(3, 6))}, ${say(digits.slice(6))}`;
}

/**
 * What a lead hears when they answer but the agent is already on a call.
 * The rule requires it within two seconds of their greeting, naming the
 * seller and a number to call back, with an automated way to opt out.
 */
export function abandonMessage(opts: { agentName: string; businessName: string; callbackNumber: string }): string {
  return (
    `Hi, this is ${opts.agentName} with ${opts.businessName}, calling about health insurance options. ` +
    `Sorry, we can't take your call right now. You can reach us at ${speakablePhone(opts.callbackNumber)}. ` +
    `To be added to our do not call list, press 9 now.`
  );
}
