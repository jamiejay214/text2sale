// Quiet Hours utility — blocks sending before 8 AM and after 9 PM in contact's timezone

const STATE_TIMEZONES: Record<string, string> = {
  AL: "America/Chicago", AK: "America/Anchorage", AZ: "America/Phoenix", AR: "America/Chicago",
  CA: "America/Los_Angeles", CO: "America/Denver", CT: "America/New_York", DE: "America/New_York",
  FL: "America/New_York", GA: "America/New_York", HI: "Pacific/Honolulu", ID: "America/Boise",
  IL: "America/Chicago", IN: "America/Indiana/Indianapolis", IA: "America/Chicago", KS: "America/Chicago",
  KY: "America/New_York", LA: "America/Chicago", ME: "America/New_York", MD: "America/New_York",
  MA: "America/New_York", MI: "America/Detroit", MN: "America/Chicago", MS: "America/Chicago",
  MO: "America/Chicago", MT: "America/Denver", NE: "America/Chicago", NV: "America/Los_Angeles",
  NH: "America/New_York", NJ: "America/New_York", NM: "America/Denver", NY: "America/New_York",
  NC: "America/New_York", ND: "America/Chicago", OH: "America/New_York", OK: "America/Chicago",
  OR: "America/Los_Angeles", PA: "America/New_York", RI: "America/New_York", SC: "America/New_York",
  SD: "America/Chicago", TN: "America/Chicago", TX: "America/Chicago", UT: "America/Denver",
  VT: "America/New_York", VA: "America/New_York", WA: "America/Los_Angeles", WV: "America/New_York",
  WI: "America/Chicago", WY: "America/Denver", DC: "America/New_York",
};

export function inferTimezone(state?: string): string {
  if (!state) return "America/New_York";
  const normalized = state.trim().toUpperCase().slice(0, 2);
  return STATE_TIMEZONES[normalized] || "America/New_York";
}

export function isQuietHours(timezone: string, startHour = 21, endHour = 8): boolean {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    const hour = parseInt(formatter.format(now), 10);
    return hour >= startHour || hour < endHour;
  } catch {
    return false;
  }
}

export function getNextSendWindow(timezone: string, endHour = 8): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value || "0";

    const year = parseInt(get("year"));
    const month = parseInt(get("month")) - 1;
    const day = parseInt(get("day"));
    const hour = parseInt(get("hour"));

    // If before endHour today, send at endHour today. If after startHour, send at endHour tomorrow.
    const targetDate = new Date(year, month, hour < endHour ? day : day + 1);
    targetDate.setHours(endHour, 0, 0, 0);

    return targetDate.toISOString();
  } catch {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(endHour, 0, 0, 0);
    return tomorrow.toISOString();
  }
}
