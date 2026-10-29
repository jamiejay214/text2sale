"use client";

import { useMemo, useState } from "react";
import { Note, ToolCard, copyText, inputClass } from "@/components/tools/ToolFields";

type Step = { day: number; when: string; channel: "Text" | "Call" | "Call + voicemail"; message?: string };

const CADENCES: Record<string, { label: string; steps: Step[] }> = {
  new: {
    label: "New internet lead (14 days)",
    steps: [
      { day: 1, when: "Within 1 minute", channel: "Text", message: "Hi {first}, this is {agent} with {agency}. Thanks for your request about {product}. Is now a good time for a quick call?" },
      { day: 1, when: "Within 5 minutes", channel: "Call + voicemail" },
      { day: 1, when: "Late afternoon", channel: "Call" },
      { day: 2, when: "Morning", channel: "Text", message: "Hi {first}, {agent} from {agency} again. What matters most to you in a {product} plan: price, doctors or coverage?" },
      { day: 2, when: "Early evening", channel: "Call" },
      { day: 3, when: "Late morning", channel: "Call + voicemail" },
      { day: 5, when: "Midday", channel: "Text", message: "Hi {first}, I can go over your {product} options in about 10 minutes. Would today or tomorrow work better?" },
      { day: 5, when: "Afternoon", channel: "Call" },
      { day: 7, when: "Evening", channel: "Call + voicemail" },
      { day: 10, when: "Midday", channel: "Text", message: "Hi {first}, did you find the {product} coverage you were looking for, or are you still comparing?" },
      { day: 14, when: "Midday", channel: "Text", message: "Hi {first}, should I keep your info on file, or are you all set on {product}? Either answer is fine." },
    ],
  },
  aged: {
    label: "Aged lead reactivation (10 days)",
    steps: [
      { day: 1, when: "Late morning", channel: "Text", message: "Hi {first}, this is {agent} with {agency}. You asked about {product} a while back. Are you still looking for options?" },
      { day: 1, when: "Right after any reply", channel: "Call" },
      { day: 3, when: "Afternoon", channel: "Text", message: "Hi {first}, just checking in. Want me to see what {product} options are available for you this year?" },
      { day: 4, when: "Afternoon", channel: "Call + voicemail" },
      { day: 7, when: "Early evening", channel: "Call" },
      { day: 10, when: "Midday", channel: "Text", message: "Hi {first}, I'll close out your file unless you'd like help with {product}. Just reply and I'll call you." },
    ],
  },
  callback: {
    label: "Missed appointment (3 days)",
    steps: [
      { day: 1, when: "5 minutes after the missed time", channel: "Text", message: "Hi {first}, it's {agent} with {agency}. Sorry I missed you. Is now still good, or should we pick another time?" },
      { day: 1, when: "30 minutes later", channel: "Call + voicemail" },
      { day: 1, when: "Evening", channel: "Text", message: "Hi {first}, happy to reschedule your {product} call. Does tomorrow morning or afternoon work better?" },
      { day: 2, when: "Late morning", channel: "Call" },
      { day: 3, when: "Midday", channel: "Text", message: "Hi {first}, I still have your {product} quote ready. Reply with a good time and I'll call you then." },
    ],
  },
};

function fill(text: string, values: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => values[key] || `{${key}}`);
}

export default function FollowUpCadenceGenerator() {
  const [type, setType] = useState("new");
  const [agency, setAgency] = useState("Sunrise Insurance");
  const [agent, setAgent] = useState("Jamie");
  const [product, setProduct] = useState("health insurance");
  const [copied, setCopied] = useState(false);

  const steps = useMemo(() => {
    const values = { agency, agent, product, first: "{first_name}" };
    return CADENCES[type].steps.map((step) => ({ ...step, message: step.message ? fill(step.message, values) : undefined }));
  }, [type, agency, agent, product]);

  const plainText = steps
    .map((step) => `Day ${step.day} (${step.when}) - ${step.channel}${step.message ? `: ${step.message} Reply STOP to opt out.` : ""}`)
    .join("\n");

  return (
    <ToolCard
      title="Follow-up cadence generator"
      action={
        <button
          type="button"
          onClick={async () => {
            setCopied(await copyText(plainText));
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 transition hover:border-emerald-300 hover:text-emerald-200"
        >
          {copied ? "Copied" : "Copy cadence"}
        </button>
      }
    >
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="cad-type" className="block text-sm font-bold text-zinc-200">Lead type</label>
          <select id="cad-type" value={type} onChange={(event) => setType(event.target.value)} className={inputClass}>
            {Object.entries(CADENCES).map(([key, cadence]) => <option key={key} value={key}>{cadence.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="cad-agency" className="block text-sm font-bold text-zinc-200">Agency name</label>
          <input id="cad-agency" value={agency} onChange={(event) => setAgency(event.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="cad-agent" className="block text-sm font-bold text-zinc-200">Your first name</label>
          <input id="cad-agent" value={agent} onChange={(event) => setAgent(event.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="cad-product" className="block text-sm font-bold text-zinc-200">Product</label>
          <input id="cad-product" value={product} onChange={(event) => setProduct(event.target.value)} className={inputClass} />
        </div>
      </div>

      <ol className="mt-6 space-y-3">
        {steps.map((step, index) => (
          <li key={index} className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:grid-cols-[7rem_1fr]">
            <div>
              <p className="text-sm font-black text-emerald-300">Day {step.day}</p>
              <p className="text-xs text-zinc-400">{step.when}</p>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">{step.channel}</p>
              {step.message && <p className="mt-1 text-sm leading-6 text-zinc-300">{step.message} Reply STOP to opt out.</p>}
            </div>
          </li>
        ))}
      </ol>
      <Note>Stop the cadence as soon as the lead replies, books or opts out. Only text leads whose consent covers texts from your business, and keep every touch inside the lead&apos;s local quiet hours.</Note>
    </ToolCard>
  );
}
