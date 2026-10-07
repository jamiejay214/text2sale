"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const messages = [
  { speaker: "Text2Sale AI", text: "Hi Alex, this is Taylor's insurance office. You asked us to follow up about coverage. Are you still looking for options? Reply STOP to opt out." },
  { speaker: "Example lead", text: "Yes, I still need coverage for myself." },
  { speaker: "Text2Sale AI", text: "Happy to help. Are you looking to start this month, or planning for later?" },
  { speaker: "Example lead", text: "This month. Can we talk tomorrow morning?" },
  { speaker: "Text2Sale AI", text: "Taylor has an opening tomorrow at 9 AM. Does that work for you?" },
  { speaker: "Example lead", text: "Yes, 9 works." },
  { speaker: "Text2Sale AI", text: "You're booked for tomorrow at 9 AM. Taylor will call you then." },
];

export default function AppointmentDemo() {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running || step >= messages.length) return;
    const timer = setTimeout(() => setStep((value) => value + 1), 1400);
    return () => clearTimeout(timer);
  }, [running, step]);
  const complete = step === messages.length;
  return (
    <section id="ai-booking-demo" className="border-y border-emerald-800 bg-[#0b241b] px-6 py-16 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-lime-200">From old lead to next appointment</p>
          <h2 className="mt-4 text-3xl font-bold md:text-4xl">Watch AI Book an Appointment</h2>
          <p className="mt-5 text-base leading-7 text-emerald-100">See the flow: start a conversation, qualify interest, offer a time, and confirm the appointment.</p>
          <p className="mt-4 text-sm leading-6 text-emerald-200">Illustrative, scripted demo. No messages are sent and no real appointment is created. Your live workflow uses your instructions, connected calendar, and availability.</p>
          <button type="button" onClick={() => { setStep(0); setRunning(true); }} className="mt-6 rounded-xl bg-lime-300 px-6 py-3 font-bold text-emerald-950">{running ? "Replay demo" : "Play appointment demo"}</button>
          <Link className="ml-4 mt-6 inline-block font-semibold text-lime-200 underline" href="/?signup=1#auth-form">Start Texting Leads</Link>
        </div>
        <div className="rounded-2xl border border-emerald-700 bg-emerald-950 p-5">
          <p className="mb-4 text-sm font-semibold text-emerald-200">Insurance follow-up · Example conversation</p>
          <div aria-live="polite" aria-atomic="false" className="space-y-3">
            {step === 0 && <p className="text-base text-emerald-100">Press play to follow the conversation.</p>}
            {messages.slice(0, step).map((message, index) => <div key={index} className={`rounded-xl p-3 text-sm leading-6 ${message.speaker === "Text2Sale AI" ? "bg-emerald-800" : "ml-8 bg-white/10"}`}><span className="block font-semibold text-lime-200">{message.speaker}</span>{message.text}</div>)}
            {complete && <p className="rounded-xl border border-lime-300 p-4 font-semibold text-lime-200">Appointment confirmed · Tomorrow, 9 AM<br /><span className="text-sm font-normal">Example calendar result</span></p>}
          </div>
          {running && !complete && <button type="button" onClick={() => { setStep(messages.length); setRunning(false); }} className="mt-4 text-sm text-lime-200 underline">Show full conversation</button>}
        </div>
      </div>
    </section>
  );
}
