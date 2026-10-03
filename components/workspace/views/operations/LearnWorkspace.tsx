"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileSpreadsheet,
  KeyRound,
  Megaphone,
  MessageSquare,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { WorkspaceTab } from "@/components/WorkspaceNavigation";
import type { WorkspaceViewProps } from "../../WorkspaceApp";
import { PageHeader, Panel } from "../../WorkspacePrimitives";

type Guide = {
  id: string;
  title: string;
  description: string;
  icon: typeof BookOpen;
  tab: WorkspaceTab;
  subtab?: string;
  steps: Array<{ title: string; detail: string; tip?: string }>;
};

const GUIDES: Guide[] = [
  {
    id: "launch",
    title: "Start your workspace",
    description: "Subscription, funds, carrier setup, and your first number.",
    icon: Sparkles,
    tab: "settings",
    subtab: "10dlc",
    steps: [
      { title: "Activate your subscription", detail: "Open Billing & funds and complete the secure Stripe checkout. Your subscription unlocks sending, number purchases, calling, AI, imports, and integrations." },
      { title: "Add usage funds", detail: "Add at least $20 to the wallet. Texts, calls, imported-lead charges, number activation, and AI calling draw from this balance. The live balance is always visible in the top bar.", tip: "Turn on auto recharge so a running campaign never stops for a low balance." },
      { title: "Complete messaging setup", detail: "Enter the exact legal business name, EIN, IRS address, website choice, contact details, and preferred area code. Text2Sale creates the required consent pages and submits the carrier registration." },
      { title: "Connect a number", detail: "Once messaging is approved, search by area code in Phone numbers and choose a local line. Delivery health appears on the same screen." },
    ],
  },
  {
    id: "import",
    title: "Import leads from a CSV",
    description: "Map any vendor file and route it into a campaign.",
    icon: FileSpreadsheet,
    tab: "upload",
    steps: [
      { title: "Prepare the file", detail: "Use one lead per row and put field names in the first row. Phone is required for messaging; first name, email, city, state, ZIP, source, notes, policy, quote, and custom sales details are supported." },
      { title: "Upload and map", detail: "Drop the CSV into Lead imports. Text2Sale guesses common column names, then shows a preview. Review every mapping and make sure exactly one column maps to Phone number." },
      { title: "Choose clean-up rules", detail: "Leave duplicate protection on to check the file against itself and against your existing contact database. Invalid phone numbers are excluded." },
      { title: "Choose a campaign", detail: "Select any saved campaign to assign the imported leads and start its entire follow-up workflow. Choose Import only if you want to review the leads first." },
      { title: "Reuse a previous list", detail: "Uploaded files stay in Lead imports. Choose a different campaign beside an old file and click Assign & open to prepare that batch for a new follow-up." },
    ],
  },
  {
    id: "campaigns",
    title: "Build campaigns and follow-ups",
    description: "One text or a complete multi-step workflow.",
    icon: Megaphone,
    tab: "campaigns",
    steps: [
      { title: "Name the campaign", detail: "Use a name your team will recognize, such as New lead — 7 day follow-up. A campaign is both the lead group and the workflow that follows it." },
      { title: "Write the first text", detail: "Add personalization such as {firstName}, {city}, or {state}. Use spin text such as {Hi|Hey|Hello} to rotate wording across leads." },
      { title: "Add waits and follow-ups", detail: "Click Add follow-up step. Set a delay before each step: for example, send immediately, wait 1 hour, send again, wait 1 day, then follow up after 3 days.", tip: "A reply stops the remaining automated follow-ups for that lead." },
      { title: "Choose sending lines and quiet hours", detail: "Select one or more connected numbers. Keep quiet hours enabled so delayed messages wait until the approved contact window." },
      { title: "Save, assign, and launch", detail: "Save the campaign, assign leads from Contacts, Conversations, or Lead imports, choose the audience, and launch. You can pause and resume without keeping the browser open." },
    ],
  },
  {
    id: "inbox",
    title: "Work the conversation inbox",
    description: "Human and AI texting in one focused queue.",
    icon: MessageSquare,
    tab: "conversations",
    steps: [
      { title: "Filter the inbox", detail: "Use All, Unread, AI handled, and Archived to focus the queue. Search narrows the current page without loading every message in the account." },
      { title: "Open a lead", detail: "Select a conversation to load its thread and contact details. Older messages load only when requested, keeping the inbox fast." },
      { title: "Send or hand off", detail: "Write a reply and press Enter to send. The composer keeps its own state, so typing stays responsive even with a large database." },
      { title: "Control AI", detail: "The workspace switch turns AI texting on or off globally. The switch in a conversation overrides AI for that one lead, so a rep can take over immediately." },
      { title: "Clean up in bulk", detail: "Select conversations to archive, delete, mark read, or move contacts into a campaign. Archived threads remain recoverable in the Archived filter." },
    ],
  },
  {
    id: "ai",
    title: "Train AI texting",
    description: "Goals, tone, business knowledge, and human handoff.",
    icon: Bot,
    tab: "settings",
    subtab: "ai",
    steps: [
      { title: "Set the goal", detail: "Choose whether AI should qualify and book, answer questions, or continue follow-up until the lead responds." },
      { title: "Choose the voice", detail: "Pick warm and conversational, clear and professional, friendly and upbeat, or short and direct." },
      { title: "Write the business playbook", detail: "Explain what you sell, who qualifies, questions to ask, approved objection responses, when to offer the calendar, and promises it must never make." },
      { title: "Turn it on safely", detail: "Enable the global AI texting switch, then review individual conversations. Pause AI on any thread when a person needs to take control." },
    ],
  },
  {
    id: "calling",
    title: "Call leads back-to-back",
    description: "Browser dialer, keyboard entry, and power queues.",
    icon: Phone,
    tab: "calls",
    steps: [
      { title: "Allow microphone access", detail: "Browser calls use your computer microphone and speakers. Select the correct connected Text2Sale number as caller ID." },
      { title: "Dial with the keypad or keyboard", detail: "Press number keys anywhere outside a form, Backspace to correct, Enter to call, and Escape to clear." },
      { title: "Start a power queue", detail: "Load eligible contacts into the queue. Each card shows phone, city, state, ZIP, and position in the list." },
      { title: "Use auto advance", detail: "When a call ends, the queue can move to the next lead automatically. Pause at any time to add notes or handle a longer follow-up." },
    ],
  },
  {
    id: "receptionist",
    title: "Train the AI receptionist",
    description: "Answer, qualify, transfer, and book incoming calls.",
    icon: Bot,
    tab: "aicalls",
    steps: [
      { title: "Choose the call goal", detail: "Tell the assistant to book a consultation, qualify before booking, or answer questions and take a detailed message." },
      { title: "Write the greeting and playbook", detail: "Give it a short first greeting, qualification questions, approved answers, booking rules, and anything it must never quote or promise." },
      { title: "Set voice and handoff", detail: "Choose the voice, maximum call length, and a human transfer number. After-hours-only mode lets your team answer first during business hours." },
      { title: "Review outcomes", detail: "Recent AI calls show caller, summary, outcome, time, and cost so the team knows exactly what happened." },
    ],
  },
  {
    id: "calendar",
    title: "Connect scheduling",
    description: "Shared availability for your team and AI.",
    icon: CalendarDays,
    tab: "settings",
    subtab: "integrations",
    steps: [
      { title: "Connect Google Calendar", detail: "Open Integrations and complete Google authorization. Text2Sale uses calendar-event access to create booked events and avoid conflicts." },
      { title: "Manage appointments", detail: "The Calendar tab shows upcoming, past, completed, no-show, and cancelled meetings. You can also create a manual appointment." },
      { title: "Let AI book safely", detail: "AI checks the same availability and appointments before offering a time, so automated and manual bookings stay in one schedule." },
    ],
  },
  {
    id: "vendors",
    title: "Connect lead vendors and API keys",
    description: "Secure real-time lead delivery into a workflow.",
    icon: KeyRound,
    tab: "settings",
    subtab: "integrations",
    steps: [
      { title: "Create a vendor connection", detail: "Give the integration a clear name so you can disable one vendor without affecting the others." },
      { title: "Choose a campaign", detail: "Select the campaign that should receive incoming leads and decide whether its first text should start automatically." },
      { title: "Copy the webhook", detail: "Send the generated webhook URL and token to the lead vendor. Treat the token like a password and delete the key immediately if it is exposed." },
      { title: "Send a test lead", detail: "Ask the vendor to POST one test lead. Confirm it appears in Contacts with the correct fields and campaign before enabling production traffic." },
    ],
  },
  {
    id: "billing",
    title: "Manage billing and funds",
    description: "Stripe cards, wallet credits, invoices, and auto recharge.",
    icon: CreditCard,
    tab: "settings",
    subtab: "billing",
    steps: [
      { title: "Manage the subscription", detail: "Billing shows plan status and opens Stripe’s secure customer portal for cards, invoices, and subscription changes." },
      { title: "Add wallet funds", detail: "Choose a preset or enter a custom amount. Payments happen on Stripe; successful credits return to the live balance in the top bar." },
      { title: "Use the volume discount", detail: "Wallet adds of $500 or more receive the account’s configured bulk discount while crediting the full requested balance." },
      { title: "Turn on auto recharge", detail: "Set the wallet to top itself up at a low-balance threshold so scheduled follow-ups keep running." },
    ],
  },
];

export default function LearnWorkspace({ onNavigate }: WorkspaceViewProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("launch");
  const filtered = useMemo(() => GUIDES.filter((guide) => `${guide.title} ${guide.description} ${guide.steps.map((step) => `${step.title} ${step.detail}`).join(" ")}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const selected = GUIDES.find((guide) => guide.id === active) || GUIDES[0];
  return (
    <>
      <PageHeader eyebrow="Text2Sale academy" title="Know exactly what to do next." description="A complete, plain-English guide to setup, texting, calling, AI, campaigns, imports, compliance, billing, and integrations." actions={<div className="v2-header-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tutorials…" /></div>} />
      <div className="v2-quickstart"><span><BookOpen size={20} /></span><div><p>Recommended starting path</p><h2>Go from new account to first live campaign</h2></div>{["Subscribe", "Register", "Connect number", "Import", "Launch"].map((label, index) => <div key={label}><span>{index + 1}</span><small>{label}</small></div>)}</div>
      <div className="v2-learn-layout">
        <Panel className="v2-guide-nav"><div className="v2-panel-head"><div><h2>Guides</h2><p>{filtered.length} topics</p></div></div><div>{filtered.map((guide) => <button className={guide.id === selected.id ? "is-active" : ""} key={guide.id} onClick={() => setActive(guide.id)}><span><guide.icon size={16} /></span><div><strong>{guide.title}</strong><small>{guide.description}</small></div><ChevronRight size={15} /></button>)}</div></Panel>
        <Panel className="v2-guide-content"><header><span><selected.icon size={21} /></span><div><p>Step-by-step guide</p><h2>{selected.title}</h2><small>{selected.description}</small></div><button className="v2-btn v2-btn-primary" onClick={() => onNavigate(selected.tab, selected.subtab)}>Open this feature <ArrowRight size={14} /></button></header><ol>{selected.steps.map((step, index) => <li key={step.title}><span>{index + 1}</span><div><h3>{step.title}</h3><p>{step.detail}</p>{step.tip && <aside><Sparkles size={14} /><span><strong>Good to know</strong>{step.tip}</span></aside>}</div></li>)}</ol></Panel>
        <Panel className="v2-help-panel"><ShieldCheck size={20} /><h2>Built-in safeguards</h2><p>Text2Sale keeps DNC flags, reply-aware follow-up stops, quiet hours, carrier registration, and delivery health connected to the same workspace.</p><dl><div><dt>Campaigns</dt><dd>Stop after reply</dd></div><div><dt>Imports</dt><dd>Duplicate checks</dd></div><div><dt>Numbers</dt><dd>Delivery monitoring</dd></div><div><dt>AI</dt><dd>Human takeover</dd></div></dl></Panel>
      </div>
      <Panel className="v2-faq-block"><div className="v2-panel-head"><div><h2>Common questions</h2><p>Fast answers while you work</p></div></div>{[
        ["Will campaigns continue if I close the browser?", "Yes. Once queued, each step runs in the background. Quiet hours may delay a scheduled message, and a lead reply stops that lead’s remaining follow-ups."],
        ["Can I send an old CSV list through a new campaign?", "Yes. In Lead imports, choose a campaign beside the saved file, click Assign & open, review the campaign, then launch it."],
        ["Can AI text every conversation for me?", "Yes. Turn on the workspace-wide switch in AI texting. You can still pause AI on one conversation from the inbox whenever a person needs to take over."],
        ["Where do I change my card?", "Open Billing & funds and choose Cards, invoices & subscription. Text2Sale redirects you to the secure Stripe customer portal."],
      ].map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={16} /></summary><p>{answer}</p></details>)}</Panel>
    </>
  );
}
