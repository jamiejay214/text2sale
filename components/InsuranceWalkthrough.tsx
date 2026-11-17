"use client";

import { useState } from "react";
import Link from "next/link";

const steps = [
  { label: "Import a lead", title: "Start with the quote request.", copy: "Alex imports the people who asked his agency for a quote and agreed to receive texts. He maps the name and phone columns and selects a follow-up campaign.", screen: "Lead import", rows: [["CSV column", "CRM field"], ["Full name", "Contact name"], ["Mobile", "Phone number"], ["Campaign", "Health quote follow-up"]] },
  { label: "Read the reply", title: "Turn “after lunch” into a time.", copy: "Taylor replies while Alex is on another call. The conversation stays with Taylor’s contact record, so Alex can pick up where they left off.", screen: "Conversation · Taylor", rows: [["Alex", "Hi Taylor, Alex from Sunrise Insurance here. Is today a good time to discuss your quote? Reply STOP to opt out."], ["Taylor", "After lunch works."], ["Alex", "Would 2:30 today work for a quick call?"], ["Taylor", "Yes, thank you!"]] },
  { label: "Make the callback", title: "Call with the context in front of you.", copy: "At 2:30, Alex opens Taylor’s contact, sees the quote request and the agreed time, and places the call. Afterward he saves the outcome and the next step.", screen: "Callback · today at 2:30", rows: [["Contact", "Taylor"], ["Reason", "Requested a health quote"], ["Last reply", "Yes, thank you!"], ["Next action", "Call to discuss the quote"]] },
];

export default function InsuranceWalkthrough() {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  return <section id="quote-walkthrough" aria-labelledby="walkthrough-title" className="mx-auto max-w-5xl scroll-mt-20 px-6 pb-16">
    <div className="rounded-3xl border border-violet-300/30 bg-zinc-900 p-5 sm:p-8">
      <p className="text-sm font-bold text-violet-300">Interactive example · fictional contact</p>
      <h2 id="walkthrough-title" className="mt-2 text-3xl font-bold">Follow one quote request from CSV to callback.</h2>
      <div className="my-6 flex flex-wrap gap-2" role="group" aria-label="Walkthrough steps">{steps.map((s,i)=><button key={s.label} type="button" aria-pressed={index===i} onClick={()=>setIndex(i)} className={"min-h-11 rounded-full border px-4 py-2 text-sm font-bold "+(i===index?"border-violet-300 bg-violet-600 text-white":"border-zinc-600 text-zinc-100")}>{i+1}. {s.label}</button>)}</div>
      <div aria-live="polite" className="grid gap-5 md:grid-cols-2"><div><h3 className="text-xl font-bold">{step.title}</h3><p className="my-3 leading-7 text-zinc-200">{step.copy}</p><Link className="text-violet-300 underline" href="/insurance-text-templates">Try the free insurance text templates</Link></div>
      <div className="rounded-2xl border border-zinc-700 bg-zinc-950 p-5"><strong className="text-violet-300">{step.screen}</strong><dl className={index===1?"ia-thread":undefined}>{step.rows.map(([key,value],i)=><div key={i} className={index===1?undefined:"mt-3 border-t border-zinc-800 pt-2"}><dt className={index===1?undefined:"text-xs font-bold text-zinc-400"}>{key}</dt><dd className={index===1?undefined:"text-sm text-white"}>{value}</dd></div>)}</dl></div></div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-700 pt-4">
        <span className="text-sm text-zinc-300">Step {index + 1} of {steps.length}</span>
        {index < steps.length - 1 ? <button type="button" onClick={() => setIndex(index + 1)} className="min-h-11 rounded-full bg-violet-600 px-4 font-semibold text-white">Next: {steps[index + 1].label} →</button> : <Link href="/pricing" className="inline-flex min-h-11 items-center rounded-full bg-violet-600 px-4 font-semibold text-white">Compare texting and calling plans →</Link>}
      </div>
    </div>
  </section>;
}
