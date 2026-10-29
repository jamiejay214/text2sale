"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const AI = "Text2Sale AI";
const LEAD = "Example lead";

// Scripted examples across sales and service businesses. No live messages are sent.
const scenarios = [
  {
    label: "Sales follow-up",
    booked: "Tomorrow, 5:30 PM",
    messages: [
      { speaker: AI, text: "Hi Alex, it's Taylor with Northstar Business Solutions. You requested a demo and agreed to text updates. Still interested in a quick walkthrough? Reply STOP to opt out." },
      { speaker: LEAD, text: "Maybe, but I don't have time for a long presentation." },
      { speaker: AI, text: "We can keep it to 10 minutes and focus on your questions. What are you hoping to improve?" },
      { speaker: LEAD, text: "Keeping up with customer inquiries. I'm only free after work." },
      { speaker: AI, text: "That gives us a good starting point. Would 5:30 tomorrow work for a short call?" },
      { speaker: LEAD, text: "Yes, 5:30 works." },
      { speaker: AI, text: "You're booked for 5:30 tomorrow. We'll focus on managing your customer inquiries." },
    ],
  },
  {
    label: "Home services inquiry",
    booked: "Tomorrow, 12:15 PM",
    messages: [
      { speaker: AI, text: "Hi Alex, it's Taylor with Northstar Home Services. You requested an estimate and agreed to text updates. Would you like to arrange a quick call? Reply STOP to opt out." },
      { speaker: LEAD, text: "Can you just text me a price?" },
      { speaker: AI, text: "The team needs a few details about the project before quoting. What work do you have in mind?" },
      { speaker: LEAD, text: "Replacing the kitchen cabinets. I'm comparing options." },
      { speaker: AI, text: "Understood. A short call can help the team explain the options and next steps. Would 12:15 tomorrow work?" },
      { speaker: LEAD, text: "Yes, during lunch is fine." },
      { speaker: AI, text: "Booked for 12:15 tomorrow. The team will call to discuss your kitchen project." },
    ],
  },
  {
    label: "Business services follow-up",
    booked: "Tomorrow, 6 PM",
    messages: [
      { speaker: AI, text: "Hi Alex, it's Taylor with Northstar Business Services. You asked about support for your business and agreed to text updates. Is now a good time to arrange a consultation? Reply STOP to opt out." },
      { speaker: LEAD, text: "I'm at work. My business partner needs to join too." },
      { speaker: AI, text: "Of course. Would an evening call work better for both of you?" },
      { speaker: LEAD, text: "Tomorrow evening could work. Is there a charge for the call?" },
      { speaker: AI, text: "The introductory call is free. You can discuss what you need before deciding on any service. Would 6 PM work?" },
      { speaker: LEAD, text: "Yes, let's do 6." },
      { speaker: AI, text: "You're booked for 6 PM tomorrow. You and your partner can join to discuss your business needs." },
    ],
  },
];

export default function AppointmentDemo() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const { messages, booked, label } = scenarios[scenarioIndex];
  useEffect(() => {
    if (!running || step >= messages.length) return;
    const timer = setTimeout(() => setStep((value) => value + 1), 1400);
    return () => clearTimeout(timer);
  }, [running, step, messages.length]);
  const complete = step === messages.length;
  const play = () => {
    if (hasPlayed) setScenarioIndex((index) => (index + 1) % scenarios.length);
    setHasPlayed(true);
    setStep(0);
    setRunning(true);
  };
  return (
    <section id="ai-booking-demo" className="border-y border-emerald-800 bg-[#0b241b] px-6 py-16 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-lime-200">From old lead to next appointment</p>
          <h2 className="mt-4 text-3xl font-bold md:text-4xl">Watch AI Book an Appointment</h2>
          <p className="mt-5 text-base leading-7 text-emerald-100">See the flow: start a conversation, work through objections, offer a time, and confirm the appointment.</p>
          <p className="mt-4 text-sm leading-6 text-emerald-200">Illustrative, scripted demo. No messages are sent and no real appointment is created. Your live workflow uses your instructions, connected calendar, and availability.</p>
          <button type="button" onClick={play} className="mt-6 rounded-xl bg-lime-300 px-6 py-3 font-bold text-emerald-950">{hasPlayed ? "Play another example" : "Play appointment demo"}</button>
          <Link className="ml-4 mt-6 inline-block font-semibold text-lime-200 underline" href="/?signup=1#auth-form">Start Texting Leads</Link>
        </div>
        <div className="rounded-2xl border border-emerald-700 bg-emerald-950 p-5">
          <p className="mb-4 text-sm font-semibold text-emerald-200">{label} · Example {scenarioIndex + 1} of {scenarios.length}</p>
          <div aria-live="polite" aria-atomic="false" className="space-y-3">
            {step === 0 && <p className="text-base text-emerald-100">Press play to follow the conversation.</p>}
            {messages.slice(0, step).map((message, index) => <div key={index} className={`rounded-xl p-3 text-sm leading-6 ${message.speaker === AI ? "bg-emerald-800" : "ml-8 bg-white/10"}`}><span className="block font-semibold text-lime-200">{message.speaker}</span>{message.text}</div>)}
            {complete && <p className="rounded-xl border border-lime-300 p-4 font-semibold text-lime-200">Appointment confirmed · {booked}<br /><span className="text-sm font-normal">Example calendar result</span></p>}
          </div>
          {running && !complete && <button type="button" onClick={() => { setStep(messages.length); setRunning(false); }} className="mt-4 text-sm text-lime-200 underline">Show full conversation</button>}
        </div>
      </div>
    </section>
  );
}
