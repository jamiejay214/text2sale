"use client";
import "./med-spa-home.css";
import Link from "next/link";
import { PLAN_KEYS, PLANS, USAGE_RATES, type PlanKey } from "@/lib/plans";

// Marketing section of /med-spa. Rendered by HomeClient in place of the
// general home page, so the signup form below it is the same one.

const PAINS = [
  { title: "Inquiries arrive while you're with a client", body: "Someone asks about filler pricing at 2 PM. You see it at 6. By then they've booked a consult somewhere else." },
  { title: "Clients mean to rebook, then forget", body: "Results last a few months. Without a nudge at the right time, a loyal client quietly becomes a lapsed one." },
  { title: "Open slots and slow weeks", body: "A cancellation at 10 AM leaves a room empty all afternoon, with no quick way to tell the clients who'd take it." },
];

const BENEFITS = [
  { icon: "💬", title: "Answer every inquiry in minutes", body: "AI text replies respond to new inquiries right away, answer the questions you've prepared it for, and hand the conversation to you when it's time." },
  { icon: "📅", title: "Book consults on your calendar", body: "Connect Google Calendar and set your hours. Interested clients pick a time by text, and it lands on your schedule." },
  { icon: "⏰", title: "Fewer no-shows", body: "Send a confirmation and a reminder text before every visit, so clients show up or tell you early enough to fill the slot." },
  { icon: "🔁", title: "Bring clients back on schedule", body: "Text clients when it's time for their next visit, like three months after a treatment, with a one-tap way to rebook." },
  { icon: "✨", title: "Fill last-minute openings", body: "Had a cancellation? Text or email your opted-in clients about the opening, a new service or an event in a couple of minutes." },
  { icon: "📞", title: "Never miss a call mid-treatment", body: "The AI receptionist answers when your front desk can't, takes the details, and books the callback. Included with Dialer and Complete." },
];

const JOURNEY = [
  { step: "New inquiry", when: "Minute 1", text: "Hi Maya! Thanks for reaching out. A consult is the best way to talk through options and pricing. Want me to find you a time this week?" },
  { step: "Consult booked", when: "Same day", text: "You're booked for Thursday at 2:30 PM. Reply here if anything changes." },
  { step: "Reminder", when: "Day before", text: "See you tomorrow at 2:30 PM, Maya! Reply here if you need to reschedule." },
  { step: "Thank you", when: "After the visit", text: "Thank you for coming in today! If you loved your visit, a quick review means the world to us." },
  { step: "Time to rebook", when: "3 months later", text: "Hi Maya, it's about time for your next visit. Want me to hold a spot for you next week?" },
];

// Podium facts: podium.com/pricing (no published prices, sales contact, AI
// Employee add-on, bulk message credits, base 10DLC fee) and third-party
// pricing reports for the starting price. Checked November 2026.
const COMPARE = [
  { label: "Starting price", us: `$${PLANS.text.price}/month, published`, them: "Not published. Reported from about $399/month*" },
  { label: "Seeing the price", us: "On this page, right now", them: "Talk to sales first" },
  { label: "Getting started", us: "Sign up online today", them: "Book a demo" },
  { label: "AI text replies", us: "Included in every texting plan", them: "AI Employee is an add-on" },
  { label: "Bulk texts to clients", us: "Pay per text, no monthly credit limit", them: "Monthly bulk message credits" },
  { label: "Carrier registration", us: "Covered by Text2Sale", them: "10DLC fee" },
  { label: "Commitment", us: "Month to month, no contract", them: "Ask sales for terms" },
];

export default function MedSpaHome({ onLogin, onChoose }: { onLogin: () => void; onChoose: (plan?: PlanKey) => void }) {
  return (
    <div className="t2s-medspa">
      <header>
        <nav className="ms-nav ms-w">
          <Link href="/" className="ms-logo">
            <svg aria-hidden="true" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="10" fill="#16634b" /><path d="M8 9.75C8 7.68 9.68 6 11.75 6h8.5C22.32 6 24 7.68 24 9.75v6.5A3.75 3.75 0 0 1 20.25 20H15l-4.9 4.08c-.65.54-1.63.08-1.61-.77L8.6 20.6A3.75 3.75 0 0 1 8 18.55v-8.8Z" fill="white" /><path d="m11.5 16 3.2-3.15 2.35 2.1 3.55-4.1m-2.15 0h2.15V13" fill="none" stroke="#16634b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Text2Sale <span>for med spas</span>
          </Link>
          <div className="ms-navlinks">
            <a href="#benefits">How it helps</a>
            <a href="#journey">Client journey</a>
            <a href="#compare">Compare</a>
            <a href="#pricing">Pricing</a>
            <button type="button" onClick={onLogin}>Log in</button>
            <button type="button" className="ms-btn" onClick={() => onChoose()}>Get started</button>
          </div>
        </nav>
      </header>

      <section className="ms-hero ms-w">
        <div>
          <div className="ms-label">Client texting &amp; booking for med spas</div>
          <h1>Keep your treatment rooms full, without living on the phone.</h1>
          <p className="ms-lead">Text2Sale replies to new inquiries, books consults, reminds clients about their visits, and brings them back when it&apos;s time for their next treatment. You stay with the client in front of you.</p>
          <div className="ms-cta">
            <button type="button" className="ms-btn ms-btn-lg" onClick={() => onChoose()}>Create my account</button>
            <a href="#benefits" className="ms-link">See how it helps ↓</a>
          </div>
          <ul className="ms-ticks">
            <li>Plans from ${PLANS.text.price}/month</li>
            <li>No contract</li>
            <li>Carrier registration covered</li>
          </ul>
        </div>
        <figure className="ms-phone" aria-label="Sample text conversation between a med spa and a new client">
          <div className="ms-phone-top"><span className="ms-dot" /> New inquiry · Website form<small>Sample conversation</small></div>
          <div className="ms-bubble in">Hi! How much is lip filler? I&apos;ve never had it done.</div>
          <div className="ms-bubble out">Hi Maya! Thanks for reaching out. A free consult is the best way to go over options and pricing. Want me to find you a time this week?</div>
          <div className="ms-bubble in">Yes please, Thursday afternoon?</div>
          <div className="ms-bubble out">You&apos;re booked for Thursday at 2:30 PM ✓</div>
          <figcaption className="ms-float"><small>Consult booked</small><b>Thursday · 2:30 PM</b><span>Added to your calendar</span></figcaption>
        </figure>
      </section>

      <section className="ms-pains">
        <div className="ms-w">
          <div className="ms-label">Sound familiar?</div>
          <h2>A great treatment isn&apos;t the hard part. The follow-up is.</h2>
          <div className="ms-grid3">
            {PAINS.map((p) => (
              <article key={p.title} className="ms-pain"><h3>{p.title}</h3><p>{p.body}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="ms-benefits ms-w" id="benefits">
        <div className="ms-label">What it does for your spa</div>
        <h2>The front-desk follow-up you never have time for, handled.</h2>
        <div className="ms-grid3">
          {BENEFITS.map((b) => (
            <article key={b.title} className="ms-card"><span className="ms-icon" aria-hidden="true">{b.icon}</span><h3>{b.title}</h3><p>{b.body}</p></article>
          ))}
        </div>
      </section>

      <section className="ms-journey" id="journey">
        <div className="ms-w">
          <div className="ms-label">One client, start to finish</div>
          <h2>From &ldquo;how much is it?&rdquo; to a regular on your books.</h2>
          <p className="ms-sub">Sample messages. You write your own, in your spa&apos;s voice, and choose when each one goes out.</p>
          <ol className="ms-steps">
            {JOURNEY.map((j, i) => (
              <li key={j.step}>
                <div className="ms-step-head"><span>{i + 1}</span><div><b>{j.step}</b><small>{j.when}</small></div></div>
                <div className="ms-bubble out">{j.text}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="ms-respect ms-w">
        <div>
          <div className="ms-label">Texting your clients will welcome</div>
          <h2>Polite by default.</h2>
        </div>
        <ul>
          <li><b>Only clients who opted in.</b> Text the people who asked to hear from you.</li>
          <li><b>Opt-outs handled for you.</b> A client replies STOP and they&apos;re removed automatically.</li>
          <li><b>Quiet hours.</b> Messages hold overnight and go out during the day.</li>
          <li><b>Keep it to scheduling and offers.</b> Leave medical details for the treatment room, not text messages.</li>
        </ul>
      </section>

      <section className="ms-compare" id="compare">
        <div className="ms-w">
          <div className="ms-label">Text2Sale vs. Podium</div>
          <h2>The client texting med spas want, at about a tenth of the price.</h2>
          <p className="ms-sub">Podium is a messaging platform many med spas look at first. Here is where Text2Sale comes out ahead.</p>
          <div className="ms-table" role="table" aria-label="Text2Sale compared with Podium">
            <div className="ms-row ms-row-head" role="row"><span role="columnheader" /><span role="columnheader" className="ms-us">Text2Sale</span><span role="columnheader">Podium</span></div>
            {COMPARE.map((row) => (
              <div className="ms-row" role="row" key={row.label}>
                <span role="rowheader">{row.label}</span>
                <span role="cell" className="ms-us"><i aria-hidden="true">✓</i>{row.us}</span>
                <span role="cell" className="ms-them">{row.them}</span>
              </div>
            ))}
          </div>
          <p className="ms-fine">*Podium does not list prices on its pricing page; the starting figure is from third-party pricing reports. Podium details checked November 2026 and may change, so confirm current pricing with Podium. Podium is a trademark of its owner, which is not affiliated with Text2Sale.</p>
        </div>
      </section>

      <section className="ms-pricing" id="pricing">
        <div className="ms-w">
          <div className="ms-label">Simple pricing</div>
          <h2>Pick what your front desk needs.</h2>
          <p className="ms-sub">Most med spas start with Text for client texting and booking. Choose Complete if you also want the AI receptionist answering calls.</p>
          <div className="ms-grid3">
            {PLAN_KEYS.map((key) => {
              const plan = PLANS[key];
              return (
                <article key={key} className={`ms-plan${key === "text" ? " is-featured" : ""}`}>
                  {key === "text" && <span className="ms-badge">Popular for med spas</span>}
                  <h3>{plan.name}</h3>
                  <p className="ms-price">${plan.price}<small>/month</small></p>
                  <p className="ms-tag">{plan.tagline}</p>
                  <ul>{plan.includes.slice(0, 4).map((line) => <li key={line}>{line}</li>)}</ul>
                  <button type="button" className={key === "text" ? "ms-btn" : "ms-btn ms-btn-ghost"} onClick={() => onChoose(key)}>Choose {plan.name.replace("Text2Sale ", "")}</button>
                </article>
              );
            })}
          </div>
          <p className="ms-fine">Usage is paid from a prepaid balance: texts ${USAGE_RATES.smsPerSegment} per segment, replies you receive are free, and a local number is ${USAGE_RATES.localNumberMonthly.toFixed(2)}/month. Text2Sale covers carrier registration.</p>
        </div>
      </section>

      <section className="ms-final ms-w">
        <h2>Your next client is already texting someone.</h2>
        <p>Create your account below and set up your first client follow-up.</p>
        <button type="button" className="ms-btn ms-btn-lg" onClick={() => onChoose()}>Create my account ↓</button>
      </section>
    </div>
  );
}
