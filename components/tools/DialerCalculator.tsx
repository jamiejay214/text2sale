"use client";

import { useState } from "react";
import { Note, NumberField, ResultGrid, ToolCard, count } from "@/components/tools/ToolFields";

// Dials-per-hour defaults are editable example assumptions, not measured
// benchmarks; the page tells visitors to replace them with their own.
export default function DialerCalculator() {
  const [reps, setReps] = useState(2);
  const [hours, setHours] = useState(5);
  const [days, setDays] = useState(20);
  const [manual, setManual] = useState(40);
  const [power, setPower] = useState(80);
  const [predictive, setPredictive] = useState(150);
  const [contact, setContact] = useState(8);

  const repHours = reps * hours * days;
  const talks = (perHour: number) => repHours * perHour * (contact / 100);

  return (
    <ToolCard title="Dialer call-volume calculator">
      <p className="mt-3 text-sm text-zinc-400">Dials per hour are example assumptions. Replace them with numbers from your own team.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField id="dc-reps" label="Reps dialing" value={reps} onChange={setReps} />
        <NumberField id="dc-hours" label="Dialing hours per day" value={hours} onChange={setHours} />
        <NumberField id="dc-days" label="Days per month" value={days} onChange={setDays} />
        <NumberField id="dc-contact" label="Dials that reach a person (%)" value={contact} onChange={setContact} />
        <NumberField id="dc-manual" label="Manual dials / hour" value={manual} onChange={setManual} />
        <NumberField id="dc-power" label="Power dials / hour" value={power} onChange={setPower} />
        <NumberField id="dc-pred" label="Predictive dials / hour" value={predictive} onChange={setPredictive} />
      </div>
      <ResultGrid
        items={[
          ["Manual: conversations / month", count(talks(manual))],
          ["Power: conversations / month", count(talks(power))],
          ["Predictive: conversations / month", count(talks(predictive))],
          ["Extra conversations vs manual (power)", count(talks(power) - talks(manual))],
          ["Extra conversations vs manual (predictive)", count(talks(predictive) - talks(manual))],
          ["Dialing hours / month", count(repHours)],
        ]}
      />
      <Note>
        Predictive dialing helps most on large lists where few dials reach a person, such as aged leads. On fresh, high-value leads many teams prefer power dialing so every answered call has a rep ready.
      </Note>
    </ToolCard>
  );
}
