"use client";

import { useMemo, useState } from "react";
import { analyzeMessage } from "@/components/SmsCharacterCounter";
import { Note, ToolCard, copyText, inputClass } from "@/components/tools/ToolFields";

const PRODUCTS: Record<string, string> = {
  health: "health insurance",
  life: "life insurance",
  final: "final expense coverage",
  auto: "auto insurance",
  home: "home insurance",
};

const SCENARIOS: Record<string, { label: string; templates: string[] }> = {
  new: {
    label: "New lead, first text",
    templates: [
      "Hi {first}, this is {agent} with {agency}. Thanks for requesting {product} info. Is now a good time for a quick call?",
      "Hi {first}, {agent} here from {agency}. I got your {product} request. Would a call today or tomorrow work better?",
      "Hi {first}, it's {agent} with {agency}. Happy to help with {product}. What's the best time to reach you?",
    ],
  },
  aged: {
    label: "Aged lead, re-engagement",
    templates: [
      "Hi {first}, this is {agent} with {agency}. You asked about {product} a while back. Are you still looking for options?",
      "Hi {first}, {agent} from {agency} here. Did you ever get your {product} sorted, or is it still on the list?",
      "Hi {first}, it's {agent} with {agency}. Want me to check what {product} options are available for you this year?",
    ],
  },
  missed: {
    label: "Missed call follow-up",
    templates: [
      "Hi {first}, this is {agent} with {agency}. I just tried calling about your {product} request. When is a good time to talk?",
      "Hi {first}, sorry I missed you. It's {agent} with {agency}. Reply with a good time and I'll call you back.",
    ],
  },
  reminder: {
    label: "Appointment reminder",
    templates: [
      "Hi {first}, it's {agent} with {agency}. Just a reminder about our {product} call tomorrow. Reply if you need a different time.",
      "Hi {first}, {agent} from {agency} here. I'll call you in about an hour about {product}. Talk soon!",
    ],
  },
  noshow: {
    label: "No-show recovery",
    templates: [
      "Hi {first}, it's {agent} with {agency}. Sorry we missed each other. Is now still good, or should we pick another time?",
      "Hi {first}, {agent} from {agency} here. Happy to reschedule your {product} call. Does morning or afternoon work better?",
    ],
  },
  review: {
    label: "Annual review / renewal",
    templates: [
      "Hi {first}, this is {agent} with {agency}. Your {product} renewal is coming up. Want a quick review to make sure it still fits?",
      "Hi {first}, {agent} from {agency} here. It's a good time to review your {product}. Would a 10-minute call this week work?",
    ],
  },
};

export default function TextTemplateGenerator() {
  const [scenario, setScenario] = useState("new");
  const [product, setProduct] = useState("health");
  const [agency, setAgency] = useState("Sunrise Insurance");
  const [agent, setAgent] = useState("Jamie");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messages = useMemo(
    () =>
      SCENARIOS[scenario].templates.map((template) => {
        const body = `${template
          .replaceAll("{agency}", agency || "{agency}")
          .replaceAll("{agent}", agent || "{agent}")
          .replaceAll("{product}", PRODUCTS[product])} Reply STOP to opt out.`;
        return { body, segments: analyzeMessage(body.replaceAll("{first}", "Christopher")).segments };
      }),
    [scenario, product, agency, agent],
  );

  return (
    <ToolCard title="Insurance text template generator">
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="tpl-scenario" className="block text-sm font-bold text-zinc-200">Situation</label>
          <select id="tpl-scenario" value={scenario} onChange={(event) => setScenario(event.target.value)} className={inputClass}>
            {Object.entries(SCENARIOS).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="tpl-product" className="block text-sm font-bold text-zinc-200">Product</label>
          <select id="tpl-product" value={product} onChange={(event) => setProduct(event.target.value)} className={inputClass}>
            {Object.entries(PRODUCTS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="tpl-agency" className="block text-sm font-bold text-zinc-200">Agency name</label>
          <input id="tpl-agency" value={agency} onChange={(event) => setAgency(event.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="tpl-agent" className="block text-sm font-bold text-zinc-200">Your first name</label>
          <input id="tpl-agent" value={agent} onChange={(event) => setAgent(event.target.value)} className={inputClass} />
        </div>
      </div>

      <ul className="mt-6 space-y-3" aria-live="polite">
        {messages.map((message, index) => (
          <li key={message.body} className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="leading-7 text-white">{message.body}</p>
              <p className="mt-1 text-xs text-zinc-400">{message.segments === 1 ? "1 segment" : `${message.segments} segments`} with a long first name</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (await copyText(message.body)) {
                  setCopiedIndex(index);
                  setTimeout(() => setCopiedIndex(null), 1500);
                }
              }}
              className="shrink-0 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 transition hover:border-emerald-300 hover:text-emerald-200"
            >
              {copiedIndex === index ? "Copied" : "Copy"}
            </button>
          </li>
        ))}
      </ul>
      <Note>
        Every template names your agency, asks one question and includes opt-out language, which is what carriers and leads respond to best. {"{first}"} is a merge field for the lead&apos;s first name. Medicare is left out because Medicare marketing has its own contact rules.
      </Note>
    </ToolCard>
  );
}
