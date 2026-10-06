// Reporting reset requested Oct 6, 2026: midnight in America/New_York.
// Keep the raw history so resetting reporting never deletes CRM/customer data.
export const TRAFFIC_START = "2026-10-06T04:00:00.000Z";
export const REPORTING_TZ = "America/New_York";

export function reportingSince(iso: string) {
  return new Date(Math.max(Date.parse(iso), Date.parse(TRAFFIC_START))).toISOString();
}

export function easternDay(iso: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORTING_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(iso));
}

export function easternMidnight(now = new Date()) {
  const day = easternDay(now);
  const probe = new Date(`${day}T12:00:00Z`);
  const hour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: REPORTING_TZ, hour: "2-digit", hourCycle: "h23",
  }).format(probe));
  return new Date(Date.parse(`${day}T00:00:00Z`) + (12 - hour) * 3600000).toISOString();
}

export type TrafficView = {
  id?: string; visitor_id?: string | null; session_id?: string | null;
  ip_hash?: string | null; user_agent?: string | null; path?: string | null;
  created_at: string;
};

export function publicTraffic<T extends TrafficView>(rows: T[]): T[] {
  return rows.filter(r => r.created_at >= TRAFFIC_START &&
    !/^\/(api|admin|command|dashboard|biz)(\/|$)/.test(r.path || "/") &&
    !/bot|crawl|spider|headless|lighthouse|uptime|monitor|curl|wget/i.test(r.user_agent || ""));
}

export function visitorKey(r: TrafficView) {
  return r.visitor_id || r.session_id || (r.ip_hash ? `${r.ip_hash}:${r.user_agent || ""}` : r.id || "unknown");
}

export function uniqueVisitors(rows: TrafficView[]) {
  return new Set(rows.map(visitorKey)).size;
}
