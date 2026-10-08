"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  MessageSquare,
  Sparkles,
  CalendarDays,
  Check,
  Megaphone,
  Upload,
  ShieldCheck,
  Plug,
  Kanban,
  PhoneCall,
  Workflow,
} from "lucide-react";
import Logo from "@/components/Logo";
import AppointmentDemo from "@/components/AppointmentDemo";
import FoundingAgentOffer from "@/components/FoundingAgentOffer";

export default function MarketingHome({
  onLogin,
  onSignup,
}: {
  onLogin: () => void;
  onSignup: () => void;
}) {
  return (
    <>
      <section className="marketing-hero">
        <nav className="marketing-nav">
          <Link href="/" className="workspace-brand">
            <Logo size="sm" />
          </Link>
          <div className="marketing-nav-links">
            <a href="#product">Platform</a>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="marketing-nav-actions">
            <button onClick={onLogin}>Log in</button>
            <button className="marketing-button lime" onClick={onSignup}>
              Start Texting Leads
            </button>
          </div>
        </nav>
        <div className="marketing-hero-grid">
          <div className="marketing-hero-copy">
            <div className="marketing-eyebrow">
              <span />
              TEXT2SALE AI · LEAD FOLLOW-UP & APPOINTMENTS
            </div>
            <h1>
              Turn old leads into
              <br />
              <em>booked appointments.</em>
              <br />
              Automatically.
            </h1>
            <p>
              Upload your leads. Turn on AI. Text2Sale texts, qualifies, follows up,
              and books appointments for you.
            </p>
            <div className="marketing-hero-actions">
              <button className="marketing-button lime" onClick={onSignup}>
                Put My Leads on Autopilot
              </button>
              <a href="#ai-booking-demo" className="marketing-text-link">
                Watch AI Book an Appointment
              </a>
            </div>
            <div className="marketing-hero-note">
              <Check size={15} /> Use opted-in leads · Guided 10DLC setup · Paid plans, no free trial
            </div>
            <div className="marketing-proof-grid">
              <div><Upload size={15} /><span><strong>Import</strong><small>Map any CSV</small></span></div>
              <div><Workflow size={15} /><span><strong>Automate</strong><small>Text + wait steps</small></span></div>
              <div><PhoneCall size={15} /><span><strong>Connect</strong><small>Text and call</small></span></div>
            </div>
          </div>
          <div
            className="marketing-product-scene"
            aria-label="Illustrative Text2Sale workspace preview"
          >
            <div className="marketing-mini-app">
              <div className="marketing-preview-top">
                <span>
                  <span className="preview-dot" />
                  text2sale / workspace
                </span>
                <span>PRODUCT PREVIEW</span>
              </div>
              <div className="marketing-preview-heading">
                <small>YOUR CONVERSATIONS, CONNECTED</small>
                <h2>
                  A little follow-up.
                  <br />A lot of possibility.
                </h2>
              </div>
              <div className="marketing-preview-inbox">
                <div className="marketing-preview-list">
                  <strong>
                    <MessageSquare size={15} /> Inbox
                  </strong>
                  {["Alex Morgan", "Michael Davis", "Sarah Mitchell"].map(
                    (name, i) => (
                      <div className={i === 0 ? "selected" : ""} key={name}>
                        <span>
                          {name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                        <p>
                          <b>{name}</b>
                          <small>
                            {
                              [
                                "Tomorrow at 9 works!",
                                "Can you give me a call?",
                                "Thanks for following up.",
                              ][i]
                            }
                          </small>
                        </p>
                      </div>
                    ),
                  )}
                </div>
                <div className="marketing-preview-conversation">
                  <div>
                    <b>Alex Morgan</b>
                    <span>
                      <Sparkles size={12} /> AI assisted
                    </span>
                  </div>
                  <p className="preview-bubble outgoing">
                    Hi Alex! Would tomorrow morning work for a quick
                    consultation?
                  </p>
                  <p className="preview-bubble incoming">
                    Tomorrow at 9 works perfectly. Thank you!
                  </p>
                  <p className="preview-appointment">
                    <CalendarDays size={16} />
                    <span>
                      Consultation booked<small>Tomorrow · 9:00 AM</small>
                    </span>
                    <Check size={15} />
                  </p>
                </div>
              </div>
              <div className="marketing-preview-footer">
                <span>
                  <Check size={14} /> Follow-up organized
                </span>
                <span>
                  <Check size={14} /> Next step clear
                </span>
              </div>
            </div>
            <div className="marketing-floating-card">
              <span className="floating-icon">
                <Sparkles size={22} />
              </span>
              <div>
                <small>MEET YOUR AI ASSISTANT</small>
                <strong>
                  Your scripts. Your goals.
                  <br />A helping hand with every reply.
                </strong>
              </div>
            </div>
          </div>
        </div>
        <div className="marketing-capabilities">
          <span>BUILT AROUND YOUR DAY</span>
          <b>SMS & conversations</b>
          <b>AI follow-ups</b>
          <b>Campaigns & automation</b>
          <b>Your entire pipeline</b>
        </div>
      </section>
      <AppointmentDemo />
      <FoundingAgentOffer />
      <section className="marketing-command-section" aria-label="Text2Sale platform overview">
        <div className="marketing-command-heading">
          <small>FROM RAW LEAD TO REAL CONVERSATION</small>
          <h2>A complete sales motion.<br /><em>Not another tab to manage.</em></h2>
          <p>Bring leads in, decide the right follow-up, and keep the human connection at the center—without stitching together five different tools.</p>
        </div>
        <div className="marketing-command-flow">
          {[
            { number: "01", title: "Capture", body: "CSV imports, lead-vendor webhooks, custom field mapping, and duplicate checks." },
            { number: "02", title: "Engage", body: "Two-way texting, browser calling, power queues, campaigns, and trained AI replies." },
            { number: "03", title: "Convert", body: "Pipeline stages, shared scheduling, Google Calendar, and clear conversation history." },
          ].map((item) => <article key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.body}</p><i><ArrowRight size={16} /></i></article>)}
        </div>
      </section>
      <section id="product" className="marketing-section">
        <div className="marketing-section-heading">
          <div>
            <small>EVERYTHING IN ITS RIGHT PLACE</small>
            <h2>
              From first hello
              <br />
              to the next big yes.
            </h2>
          </div>
          <p>
            Stop piecing together your sales day. Give every lead a clear next
            step, and keep your team focused on the people ready to talk.
          </p>
        </div>
        <div className="marketing-feature-grid">
          {[
            {
              icon: MessageSquare,
              title: "Conversations that keep moving",
              body: "See your message history, organize your inbox, and move selected leads into a follow-up campaign.",
            },
            {
              icon: Megaphone,
              title: "The follow-up you meant to send",
              body: "Build a single message or a sequence with texts, waits, personalization, and message variations.",
            },
            {
              icon: Sparkles,
              title: "An assistant that knows your approach",
              body: "Give AI your instructions and scripts. Choose automatic replies or keep a person in control.",
            },
            {
              icon: Upload,
              title: "Your leads, ready for their next step",
              body: "Import a CSV, match its columns to your contact fields, and select the right campaign.",
            },
            {
              icon: Kanban,
              title: "A clearer view of every opportunity",
              body: "Move contacts through your pipeline and manage appointments without losing the conversation.",
            },
            {
              icon: Plug,
              title: "Connected to the way you work",
              body: "Connect Google Calendar, bring in vendor leads, and manage numbers and billing in one place.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <article key={title}>
              <span className="marketing-feature-icon">
                <Icon size={24} />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="how-it-works" className="marketing-onboarding">
        <div>
          <small>LESS SETUP. MORE MOMENTUM.</small>
          <h2>
            Your next chapter,
            <br />
            in three clear steps.
          </h2>
          <button className="marketing-button dark" onClick={onSignup}>
            Let&apos;s get you started <ArrowUpRight size={18} />
          </button>
        </div>
        <ol>
          {[
            {
              title: "Make it your workspace",
              body: "Create your account, complete your business details, and follow the guided messaging registration process.",
            },
            {
              title: "Bring your people and your plan",
              body: "Upload leads with appropriate consent, connect a phone number, and build your first campaign.",
            },
            {
              title: "Start the conversation",
              body: "Send your follow-ups, handle replies, and track your next opportunities in one place.",
            },
          ].map((step, i) => (
            <li key={step.title}>
              <span>0{i + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <div className="marketing-trust-note">
        <ShieldCheck size={20} />
        <p>
          Built-in messaging controls: opt-out handling, quiet hours, and guided
          10DLC registration. Messaging starts after your account and sending
          numbers are ready.
        </p>
      </div>
    </>
  );
}
