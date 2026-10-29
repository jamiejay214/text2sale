"use client";

import { useState } from "react";
import { Note, NumberField, ResultGrid, ToolCard, count, money } from "@/components/tools/ToolFields";

export default function SpeedToLeadCalculator() {
  const [leads, setLeads] = useState(300);
  const [cost, setCost] = useState(25);
  const [fast, setFast] = useState(30);
  const [hour, setHour] = useState(30);
  const [never, setNever] = useState(10);

  const slow = Math.max(100 - fast - hour - never, 0);
  const overHundred = fast + hour + never > 100;
  const share = (pct: number) => leads * (pct / 100);

  return (
    <ToolCard title="Speed-to-lead audit">
      <p className="mt-3 text-sm text-zinc-400">
        Pull your last month of leads and enter how quickly each group got a first call or text. The rest of the total is counted as reached later than an hour.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <NumberField id="stl-leads" label="Leads per month" value={leads} onChange={setLeads} />
        <NumberField id="stl-cost" label="Cost per lead ($)" value={cost} onChange={setCost} />
        <NumberField id="stl-fast" label="Reached within 5 min (%)" value={fast} onChange={setFast} />
        <NumberField id="stl-hour" label="Reached in 5–60 min (%)" value={hour} onChange={setHour} />
        <NumberField id="stl-never" label="Never contacted (%)" value={never} onChange={setNever} />
      </div>
      <ResultGrid
        items={[
          ["Monthly lead spend", money(leads * cost)],
          ["Reached within 5 minutes", count(share(fast))],
          ["Reached after an hour", overHundred ? "Check your %" : count(share(slow))],
          ["Never contacted", count(share(never))],
          ["Spend on leads never contacted", money(share(never) * cost)],
          ["Spend on leads reached after 5 min", money(share(100 - fast - never) * cost)],
        ]}
      />
      <Note>
        Every lead that waits is a lead another agent may reach first. An automatic first text, new leads at the top of the dialer queue and AI replies after hours move more of your spend into the first five minutes.
      </Note>
    </ToolCard>
  );
}
