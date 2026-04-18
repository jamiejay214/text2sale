// ────────────────────────────────────────────────────────────────────────────
// Smart Send Window — given a contact's message history and state, suggests
// the best local hour to text them. Pure function, no React. Used in the
// conversation header and in the composer's ghost hint.
//
// Heuristic:
//   1. If the contact has replied at least twice before, average the hours
//      of their inbound messages (in the contact's local timezone) and use
//      that as the suggested hour.
//   2. If they have <2 replies, fall back to a state-based "best hour"
//      lookup (6pm local time is statistically the national best).
//   3. If no state, default to 6pm in the sender's local timezone.
//
// Also reports "inside window" when the contact's current local hour is
// within ±1 hour of the suggestion.
// ────────────────────────────────────────────────────────────────────────────

type Msg = {
  direction: "inbound" | "outbound";
  createdAt?: string;
  created_at?: string;
};

const STATE_TZ_OFFSET: Record<string, number> = {
  // UTC offset (hours) for standard time — rough approximation. We don't
  // handle DST swings here — close enough for a "when to text" hint.
  CT:-5, DE:-5, FL:-5, GA:-5, IN:-5, KY:-5, ME:-5, MD:-5, MA:-5, MI:-5, NH:-5, NJ:-5,
  NY:-5, NC:-5, OH:-5, PA:-5, RI:-5, SC:-5, VT:-5, VA:-5, WV:-5, DC:-5,
  AL:-6, AR:-6, IL:-6, IA:-6, KS:-6, LA:-6, MN:-6, MS:-6, MO:-6, NE:-6,
  ND:-6, OK:-6, SD:-6, TN:-6, TX:-6, WI:-6,
  AZ:-7, CO:-7, ID:-7, MT:-7, NM:-7, UT:-7, WY:-7,
  CA:-8, NV:-8, OR:-8, WA:-8,
  AK:-9, HI:-10,
};

function contactLocalHour(state: string | undefined): number | null {
  if (!state) return null;
  const offset = STATE_TZ_OFFSET[state.toUpperCase().trim()];
  if (offset === undefined) return null;
  const utcHour = new Date().getUTCHours();
  let h = (utcHour + offset + 24) % 24;
  return h;
}

function hourOfMsg(m: Msg, offset: number): number {
  const s = m.createdAt || m.created_at;
  if (!s) return -1;
  const t = new Date(s).getTime();
  if (!t) return -1;
  const utcHour = new Date(t).getUTCHours();
  return (utcHour + offset + 24) % 24;
}

export type SendWindow = {
  suggestedHour: number;          // 0-23 in contact's local time
  suggestedLabel: string;         // "6pm", "10am"
  reason: string;                 // "Based on 3 prior replies"
  isInsideWindow: boolean;        // true if now is within ±1h of suggested
  contactLocalTimeLabel: string;  // "3:42pm local"
};

function hourLabel(h: number): string {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

export function computeSendWindow(
  messages: Msg[] | undefined | null,
  state: string | undefined
): SendWindow | null {
  const offset = state ? STATE_TZ_OFFSET[state.toUpperCase().trim()] : null;
  if (offset === undefined || offset === null) {
    // Can't geo-locate their hour. Skip.
    return null;
  }

  const inbound = (messages || []).filter((m) => m.direction === "inbound");

  let suggested: number;
  let reason: string;

  if (inbound.length >= 2) {
    const hours = inbound
      .map((m) => hourOfMsg(m, offset))
      .filter((h) => h >= 0);
    if (hours.length >= 2) {
      const avg = Math.round(hours.reduce((a, b) => a + b, 0) / hours.length);
      suggested = avg;
      reason = `Based on ${hours.length} prior repl${hours.length === 1 ? "y" : "ies"}`;
    } else {
      suggested = 18;
      reason = "Statistical best hour (6pm local)";
    }
  } else {
    suggested = 18;
    reason = "Statistical best hour (6pm local)";
  }

  const nowLocal = contactLocalHour(state) ?? 0;
  const minutes = new Date().getUTCMinutes();
  const minsLabel = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const isInside = Math.abs(nowLocal - suggested) <= 1;

  return {
    suggestedHour: suggested,
    suggestedLabel: hourLabel(suggested),
    reason,
    isInsideWindow: isInside,
    contactLocalTimeLabel: `${hourLabel(nowLocal).replace(/am|pm/, (p) => `:${minsLabel}${p}`)} local`,
  };
}
