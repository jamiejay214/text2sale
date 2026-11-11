"use client";

import { useEffect, useState } from "react";
import { STATE_TIMEZONES } from "@/lib/quiet-hours";

type Window = { start: number; end: number; sundayStart?: number; note: string };

const FEDERAL: Window = { start: 8, end: 21, note: "Federal rules limit telemarketing calls and texts to 8 AM–9 PM in the recipient's local time." };

// States whose telephone solicitation laws set a narrower window than the
// federal 8 AM–9 PM rule. Not exhaustive; the page tells visitors to verify.
const STATE_WINDOWS: Record<string, Window> = {
  FL: { start: 8, end: 20, note: "Florida limits telephone solicitation, including texts, to 8 AM–8 PM." },
  OK: { start: 8, end: 20, note: "Oklahoma limits telephone solicitation, including texts, to 8 AM–8 PM." },
  MD: { start: 8, end: 20, note: "Maryland limits telephone solicitation, including texts, to 8 AM–8 PM." },
  WA: { start: 8, end: 20, note: "Washington limits telephone solicitation to 8 AM–8 PM." },
  CT: { start: 9, end: 20, note: "Connecticut limits telephone solicitation to 9 AM–8 PM." },
  TX: { start: 9, end: 21, sundayStart: 12, note: "Texas limits telephone solicitation to 9 AM–9 PM Monday through Saturday and noon–9 PM on Sunday." },
};

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut",
  DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

const STATES = Object.keys(STATE_TIMEZONES).sort((a, b) => STATE_NAMES[a].localeCompare(STATE_NAMES[b]));

function hourLabel(hour: number) {
  if (hour === 12) return "noon";
  return `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`;
}

function localTime(timeZone: string, now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", hour: "numeric", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const display = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", hour: "numeric", minute: "2-digit" }).format(now);
  return { hour, minute, weekday: get("weekday"), display };
}

export default function QuietHoursChecker() {
  const [state, setState] = useState("FL");
  const [now, setNow] = useState<Date | null>(null);

  // The current time only exists in the browser, so render it after mount.
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  const timeZone = STATE_TIMEZONES[state];
  const rule = STATE_WINDOWS[state] ?? FEDERAL;
  const local = now ? localTime(timeZone, now) : null;
  const start = local?.weekday === "Sun" && rule.sundayStart ? rule.sundayStart : rule.start;
  const open = local ? local.hour >= start && local.hour < rule.end : null;

  return (
    <div className="rounded-[2rem] border border-emerald-400/20 bg-zinc-950/80 p-5 shadow-2xl shadow-emerald-950/30 sm:p-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-300">Free tool</p>
      <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Can I text or call this lead right now?</h2>

      <label htmlFor="quiet-hours-state" className="mt-7 block text-sm font-bold text-zinc-200">Lead&apos;s state</label>
      <select
        id="quiet-hours-state"
        value={state}
        onChange={(event) => setState(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20 sm:max-w-sm"
      >
        {STATES.map((code) => (
          <option key={code} value={code}>{STATE_NAMES[code]}</option>
        ))}
      </select>

      <div className="mt-6 grid gap-3 sm:grid-cols-3" aria-live="polite">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Lead&apos;s local time</p>
          <p className="mt-2 text-xl font-black text-white">{local ? local.display : "Loading…"}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Allowed window today</p>
          <p className="mt-2 text-xl font-black text-white">{hourLabel(start)} – {hourLabel(rule.end)}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${open === null ? "border-zinc-800 bg-zinc-900/80" : open ? "border-emerald-300/40 bg-emerald-300/10" : "border-rose-300/40 bg-rose-300/10"}`}>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Status</p>
          <p className="mt-2 text-xl font-black text-white">
            {open === null ? "Checking…" : open ? "Inside the window" : local!.hour < start ? `Wait until ${hourLabel(start)}` : "Closed until tomorrow"}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-6 text-amber-100">
        {rule.note} This checker uses the state&apos;s main time zone ({timeZone.replace("_", " ")}); parts of some states use another zone. Some states also restrict Sundays or holidays. This is general information, not legal advice; confirm the rules that apply to your messages.
      </div>
    </div>
  );
}
