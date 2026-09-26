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
 * Get available slots for the next N days, excluding already-booked ones.
 * Slots come back earliest-first so callers can treat #1 as "soonest".
 */
export async function getAvailableSlots(
  supabase: any,
  userId: string,
  hours: AvailableHours,
  limit = 6
): Promise<AvailableSlot[]> {
  const today = new Date();
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + hours.maxDaysOut);

  const { data: existing } = await supabase
    .from("appointments")
    .select("date, time")
    .eq("user_id", userId)
    .eq("status", "confirmed")
    .gte("date", today.toISOString().split("T")[0])
    .lte("date", maxDate.toISOString().split("T")[0]);

  const bookedSet = new Set(
    (existing || []).map((a: { date: string; time: string }) => `${a.date}_${a.time}`)
  );
  const slots: AvailableSlot[] = [];

  for (let d = 0; d <= hours.maxDaysOut && slots.length < limit; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() + d);
    const dayName = DAY_NAMES[date.getDay()];
    const dayConfig = hours.slots[dayName];
    if (!dayConfig?.enabled) continue;

    const [startH, startM] = dayConfig.start.split(":").map(Number);
    const [endH, endM] = dayConfig.end.split(":").map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    const step = hours.slotDuration + hours.bufferMinutes;
    const dateStr = date.toISOString().split("T")[0];

    const nowMinutes = today.getHours() * 60 + today.getMinutes();

    for (let m = startMin; m + hours.slotDuration <= endMin && slots.length < limit; m += step) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const timeStr = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;

      // For today, skip slots that have already passed (add 30-min buffer)
      if (d === 0 && m < nowMinutes + 30) continue;

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
