// Pure time-zone math for scheduled email campaigns (browser- and test-safe).

/** The UTC instant when the wall clock in `tz` reads `local` ('YYYY-MM-DDTHH:MM'). */
export function zonedTimeToUtc(local: string, tz: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) throw new Error("Invalid local time");
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const offset = (at: number) => {
    const p = Object.fromEntries(fmt.formatToParts(new Date(at)).map((x) => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - at;
  };
  const first = wall - offset(wall);
  return new Date(wall - offset(first)); // second pass settles DST edges
}
