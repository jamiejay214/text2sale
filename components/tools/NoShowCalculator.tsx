"use client";

import { useState } from "react";
import { Note, NumberField, ResultGrid, ToolCard, count, money } from "@/components/tools/ToolFields";

const WEEKS_PER_MONTH = 52 / 12;

export default function NoShowCalculator() {
  const [perWeek, setPerWeek] = useState(20);
  const [noShow, setNoShow] = useState(35);
  const [target, setTarget] = useState(20);
  const [closeRate, setCloseRate] = useState(30);
  const [commission, setCommission] = useState(400);

  const monthly = perWeek * WEEKS_PER_MONTH;
  const missed = monthly * (noShow / 100);
  const missedAtTarget = monthly * (Math.min(target, noShow) / 100);
  const valuePerShow = (closeRate / 100) * commission;
  const recovered = (missed - missedAtTarget) * valuePerShow;

  return (
    <ToolCard title="Appointment no-show cost calculator">
      <p className="mt-3 text-sm text-zinc-400">Starting numbers are examples. Enter your own.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <NumberField id="ns-week" label="Appointments per week" value={perWeek} onChange={setPerWeek} />
        <NumberField id="ns-rate" label="No-show rate (%)" value={noShow} onChange={setNoShow} />
        <NumberField id="ns-target" label="Target no-show rate (%)" value={target} onChange={setTarget} />
        <NumberField id="ns-close" label="Close rate on shown calls (%)" value={closeRate} onChange={setCloseRate} />
        <NumberField id="ns-comm" label="Commission per sale ($)" value={commission} onChange={setCommission} />
      </div>
      <ResultGrid
        items={[
          ["Missed appointments / month", count(missed)],
          ["Revenue lost to no-shows / month", money(missed * valuePerShow)],
          ["Recovered at your target / month", money(recovered)],
          ["Recovered per year", money(recovered * 12)],
          ["Value of one shown appointment", money(valuePerShow)],
          ["Extra appointments that show / month", count(missed - missedAtTarget)],
        ]}
      />
      <Note>Most no-shows are people who forgot or got busy. A text confirmation right after booking and reminders the day before and an hour before are the simplest way to move toward your target.</Note>
    </ToolCard>
  );
}
