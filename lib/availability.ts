// ── Shared appointment availability ──────────────────────────────────────
// Slot generation used by BOTH the SMS auto-reply (/api/ai-reply) and the
// voice assistant (/api/call-webhook). It lived inline in the ai-reply
// route first; it moved here when voice needed the same rules, because two
// copies would inevitably drift and start offering the caller times the
// texter had already been told were gone.

/* eslint-disable @typescript-eslint/no-explicit-any */

export type DaySlot = { enabled: boolean; start: string; end: string };

export type AvailableHours = {
  enabled: boolean;
  timezone: string;
  slots: Record<string, DaySlot>;
  slotDuration: number;
  bufferMinutes: number;
  maxDaysOut: number;
};

export type AvailableSlot = { date: string; time: string; display: string };

export const DEFAULT_AVAILABLE_HOURS: AvailableHours = {
  enabled: true,
  timezone: "America/New_York",
  slots: {},
  slotDuration: 30,
  bufferMinutes: 15,
  maxDaysOut: 14,
};

/** Format time "14:00:00" -> "2:00 PM" */
export function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Format date "2026-04-17" -> "Thursday, April 17" */
export function formatDateNice(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/**
 * The calendar date and minute-of-day right now in `timezone`. Business hours
 * are entered in the operator's own zone, but the server clock is UTC, so
 * reading `new Date().getHours()` treated a 9 AM Eastern opening as 9 AM UTC:
 * same-day slots vanished all morning and "today" flipped to tomorrow in the
 * evening. An unknown zone falls back to Eastern rather than throwing.
 */
export function nowInTimezone(timezone: string, now: Date = new Date()): { date: string; minutes: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "America/New_York",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(now);
  } catch {
    return nowInTimezone("America/New_York", now);
  }
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/**
 * Get available slots for the next N days, excluding already-booked ones.
 * Slots come back earliest-first so callers can treat #1 as "soonest".
 * Dates and times are in `hours.timezone`.
 */
export async function getAvailableSlots(
  supabase: any,
  userId: string,
  hours: AvailableHours,
  limit = 6,
  now: Date = new Date()
): Promise<AvailableSlot[]> {
  const local = nowInTimezone(hours.timezone, now);
  const [year, month, day] = local.date.split("-").map(Number);
  // Noon UTC on each local calendar day: safe to step by whole days and to
  // read the weekday from, whatever the server's own zone is.
  const dayAt = (offset: number) => new Date(Date.UTC(year, month - 1, day + offset, 12));
  const dateOf = (date: Date) => date.toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("appointments")
    .select("date, time")
    .eq("user_id", userId)
    .eq("status", "confirmed")
    .gte("date", local.date)
    .lte("date", dateOf(dayAt(hours.maxDaysOut)));

  const bookedSet = new Set(
    (existing || []).map((a: { date: string; time: string }) => `${a.date}_${a.time}`)
  );
  const slots: AvailableSlot[] = [];

  for (let d = 0; d <= hours.maxDaysOut && slots.length < limit; d++) {
    const date = dayAt(d);
    const dayName = DAY_NAMES[date.getUTCDay()];
    const dayConfig = hours.slots[dayName];
    if (!dayConfig?.enabled) continue;

    const [startH, startM] = dayConfig.start.split(":").map(Number);
    const [endH, endM] = dayConfig.end.split(":").map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    const step = hours.slotDuration + hours.bufferMinutes;
    const dateStr = dateOf(date);

    for (let m = startMin; m + hours.slotDuration <= endMin && slots.length < limit; m += step) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const timeStr = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;

      // For today, skip slots that have already passed (add 30-min buffer)
      if (d === 0 && m < local.minutes + 30) continue;

      if (!bookedSet.has(`${dateStr}_${timeStr}`)) {
        slots.push({
          date: dateStr,
          time: timeStr,
          display: `${formatDateNice(dateStr)} at ${formatTime12(timeStr)}`,
        });
      }
    }
  }

  return slots;
}
