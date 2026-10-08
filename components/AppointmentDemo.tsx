"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const AI = "Text2Sale AI";
const LEAD = "Example lead";

// Scripted examples. In each one the lead pushes back before agreeing to a
// time, so the demo shows the AI working through objections instead of a lead
// who books on the first ask. Each replay plays the next conversation.
const scenarios = [
  {
    booked: "Tomorrow, 5:30 PM",
    messages: [
      { speaker: AI, text: "Hi Alex, it's Taylor with Taylor Insurance. You asked about coverage a while back. Are you still looking for options? Reply STOP to opt out." },
      { speaker: LEAD, text: "Not really. I'm not looking for insurance." },
      { speaker: AI, text: "Totally fine. I just had your request come through for quotes, were you looking for something more affordable than what you have now?" },
      { speaker: LEAD, text: "I mean I pay too much for what I have. Who is this again?" },
      { speaker: AI, text: "Taylor. I help people in your area compare plans so they're not overpaying. Takes about 10 minutes, no cost to look." },
      { speaker: LEAD, text: "I did this before and it was a waste of time." },
      { speaker: AI, text: "Fair, I hear that a lot. I can't promise I'll beat what you have, but if I can't I'll tell you straight and you keep it. Worth 10 minutes to find out?" },
      { speaker: LEAD, text: "Fine. But I'm busy during the day." },
      { speaker: AI, text: "No problem. I have an opening at 9am tomorrow or 5:30 after work. Which is better?" },
      { speaker: LEAD, text: "5:30" },
      { speaker: AI, text: "Perfect, you're down for 5:30 tomorrow. I'll call you from this number." },
    ],
  },
  {
    booked: "Tomorrow, 12:15 PM",
    messages: [
      { speaker: AI, text: "Hi Alex, it's Taylor with Taylor Insurance. You asked about coverage a while back. Are you still looking for options? Reply STOP to opt out." },
      { speaker: LEAD, text: "who is this? how did you get my number" },
      { speaker: AI, text: "Taylor with Taylor Insurance. You filled out a form online asking about coverage and I'm following up on it." },
      { speaker: LEAD, text: "ok. i already have an agent though" },
      { speaker: AI, text: "Good, then you're covered. Are you happy with what you're paying, or were you shopping around when you filled that out?" },
      { speaker: LEAD, text: "probably shopping. my renewal went up" },
      { speaker: AI, text: "Yeah, a lot of people are seeing that. How much did it go up?" },
      { speaker: LEAD, text: "like 30%" },
      { speaker: AI, text: "That's a big jump. I can look at what else is out there before it renews. Quick call tomorrow?" },
      { speaker: LEAD, text: "just text me the price" },
      { speaker: AI, text: "I'd have to ask a few things to give you a real number, otherwise I'm guessing. About 5 minutes. I have 9am tomorrow or 12:15, which is easier?" },
      { speaker: LEAD, text: "12:15 i guess" },
      { speaker: AI, text: "Got you down for 12:15 tomorrow. Talk then." },
    ],
  },
  {
    booked: "Tomorrow, 6 PM",
    messages: [
      { speaker: AI, text: "Hi Alex, it's Taylor with Taylor Insurance. You asked about coverage a while back. Are you still looking for options? Reply STOP to opt out." },
      { speaker: LEAD, text: "yes but I'm at work" },
      { speaker: AI, text: "No problem. Is tonight or tomorrow better?" },
      { speaker: LEAD, text: "I'll reach out when I'm ready" },
      { speaker: AI, text: "Sounds good. Do you know when your current coverage renews?" },
      { speaker: LEAD, text: "end of the month" },
      { speaker: AI, text: "Then it's worth a look now so you have options before it renews. I have an opening at 9am tomorrow, does that work?" },
      { speaker: LEAD, text: "can't do mornings. let me ask my wife first" },
      { speaker: AI, text: "Makes sense. Would 6pm tomorrow work so she can be on the call too?" },
      { speaker: LEAD, text: "ok 6 works" },
      { speaker: AI, text: "Booked for 6pm tomorrow. I'll call you both then." },
    ],
  },
];

export default function AppointmentDemo() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const { messages, booked } = scenarios[scenarioIndex];
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
          <p className="mb-4 text-sm font-semibold text-emerald-200">Insurance follow-up · Example {scenarioIndex + 1} of {scenarios.length}</p>
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
