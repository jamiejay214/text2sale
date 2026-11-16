import "./home-depth.css";
import Link from "next/link";
import { LeadMagnet } from "@/components/EmailCapture";
import { getAllPosts } from "@/lib/blog-posts";
import { PLANS, USAGE_RATES } from "@/lib/plans";
import { SITE_PAGES } from "@/lib/site-pages";

// The long-form half of the homepage: what the product does feature by
// feature, who it is for, how compliance and integrations work, and where to
// go next. Rendered on the server so every word and link is in the HTML.
// Prices come from lib/plans.ts, the same constants checkout charges with.

type Card = { icon: string; title: string; body: string; alt: string };

function Icon({ name, alt }: { name: string; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/home/icons/${name}.svg`} alt={alt} width={44} height={44} loading="lazy" decoding="async" />;
}

function Cards({ items, columns = "g3" }: { items: Card[]; columns?: "g3" | "g4" }) {
  return (
    <div className={`grid ${columns}`}>
      {items.map((item) => (
        <div key={item.title} className="tile">
          <Icon name={item.icon} alt={item.alt} />
          <h3>{item.title}</h3>
          <p>{item.body}</p>
        </div>
      ))}
    </div>
  );
}

const BEFORE = [
  "New leads wait hours because you were on another call",
  "Replies sit on a personal cell phone nobody else can see",
  "Callbacks live on sticky notes and get forgotten",
  "You retype the same follow-up text for every lead",
  "Texting, dialing and your calendar are three separate logins",
];

const AFTER = [
  "A first text goes out when the lead arrives, even mid-call",
  "Every reply lands in one inbox next to the lead's history",
  "Callbacks are scheduled, visible and dialed from the same screen",
  "Saved campaigns send the first text and each follow-up on schedule",
  "Texts, calls, notes and booked appointments share one workspace",
];

const STEPS: Card[] = [
  { icon: "step-import", alt: "Upload icon", title: "Import your leads", body: "Upload a CSV, match the name and phone columns once, and save the list. Leads from a vendor or web form can post straight in through a webhook." },
  { icon: "step-campaign", alt: "Campaign checklist icon", title: "Build the follow-up", body: "Write a personal first text, add follow-ups with the delay you choose, and review the recipients and estimated cost before anything sends." },
  { icon: "step-reply", alt: "Conversation icon", title: "Work the replies", body: "Answer in the inbox, let the AI assistant offer a time, or dial the lead from the same screen. Each outcome is logged for the next touch." },
];

const TEXTING: Card[] = [
  { icon: "csv-upload", alt: "Spreadsheet upload icon", title: "CSV lead upload", body: "Bring the lists you already own. Map columns to contact fields once and save the list for campaigns or calling." },
  { icon: "bulk-campaigns", alt: "Send icon", title: "Bulk SMS campaigns", body: "Send one message to a whole list from your registered local numbers, with a recipient count and cost estimate shown first." },
  { icon: "follow-up-steps", alt: "Timer icon", title: "Multi-step follow-up", body: "Add a second, third or fourth text with custom delays. A campaign keeps following up so a busy afternoon does not end the conversation." },
  { icon: "personalization", alt: "Personalization icon", title: "Personalized fields", body: "Drop the lead's first name, state or other contact fields into the message so a bulk send still reads like it was written for one person." },
  { icon: "message-variations", alt: "Shuffle icon", title: "Rotating message variations", body: "Write several versions of a line and Text2Sale rotates them across recipients, so a thousand people do not get the identical sentence." },
  { icon: "two-way-inbox", alt: "Inbox icon", title: "Two-way inbox", body: "Replies arrive as conversations, not as a report. Read the thread, answer in seconds and see the lead's earlier texts and calls beside it." },
  { icon: "picture-messages", alt: "Picture message icon", title: "Picture messages", body: "Send an image inside a conversation when a quote, a card or a photo explains it faster than a paragraph would." },
  { icon: "opt-out", alt: "Opt-out icon", title: "Automatic opt-outs", body: "STOP and HELP keywords are handled for you. Anyone who opts out is removed from future sends without a manual cleanup." },
  { icon: "cost-estimate", alt: "Calculator icon", title: "Segment and cost estimates", body: "See how many SMS segments a message uses and what the campaign will cost from your prepaid balance before you press send." },
  { icon: "quiet-hours", alt: "Quiet hours icon", title: "Quiet-hours sending windows", body: "Keep campaigns inside the hours you set, so follow-ups do not land on someone's phone late at night." },
  { icon: "local-numbers", alt: "Local number icon", title: "Local business numbers", body: "Buy local numbers inside the dashboard and link them to your registered campaign. Leads see a familiar area code." },
  { icon: "reporting", alt: "Reporting icon", title: "Campaign reporting", body: "See how each campaign performed, so you know which message earned the replies." },
];

const DIALER: Card[] = [
  { icon: "manual-dial", alt: "Phone icon", title: "Manual dialing", body: "Call one specific lead from their contact record when the conversation calls for it." },
  { icon: "power-dial", alt: "Power dialer icon", title: "Power dialing", body: "Work a list back to back. When one call ends the next lead is already dialing, with their notes on screen." },
  { icon: "predictive-dial", alt: "Predictive dialer icon", title: "Predictive dialing", body: "Try up to three lines at once and connect to whoever answers, instead of sitting through one unanswered ring after another." },
  { icon: "call-outcomes", alt: "Call outcome icon", title: "Outcomes, notes and history", body: "Log what happened in a click and add a note. The next person to open the lead sees every call and text in order." },
  { icon: "callbacks", alt: "Callback alarm icon", title: "Scheduled callbacks", body: "When a lead says “call me after lunch,” set the callback and it shows up when it is due." },
  { icon: "live-transfer", alt: "Transfer icon", title: "Live transfers", body: "Move a live call to your cell phone or a teammate without asking the lead to hang up and wait." },
  { icon: "team-calls", alt: "Team icon", title: "Team call sharing", body: "Share calls across a team and review everyone's calling stats in one place." },
  { icon: "browser-calling", alt: "Headset icon", title: "Calling from the browser", body: "Dial from the same tab you text from. A headset and a browser are the only equipment needed." },
];

const AI: Card[] = [
  { icon: "ai-replies", alt: "AI assistant icon", title: "AI text replies", body: "The assistant answers inbound texts following your instructions, handles common objections and keeps the lead engaged while you are busy." },
  { icon: "ai-qualify", alt: "Qualification filter icon", title: "Lead qualification", body: "It asks the questions you would ask first, so the appointment on your calendar is with someone worth the time." },
  { icon: "ai-booking", alt: "Calendar booking icon", title: "Appointment booking", body: "The assistant offers open times, books the one the lead picks and adds it to your connected Google Calendar." },
  { icon: "ai-receptionist", alt: "Incoming call icon", title: "AI receptionist for calls", body: "When a lead calls back, the receptionist answers, finds out what they need and transfers the call if you are free." },
  { icon: "ai-handoff", alt: "Human handoff icon", title: "Human takeover", body: "Turn the assistant on for selected conversations or the whole inbox, and step back in the moment a lead needs you." },
  { icon: "ai-instructions", alt: "Settings sliders icon", title: "Your instructions", body: "Tell the assistant what you sell, what it may say about pricing and when to stop and hand the conversation to a person." },
];

const INDUSTRY_ICONS: Record<string, string> = {
  "/insurance-agents": "insurance", "/health-insurance": "health", "/life-insurance": "life", "/medicare": "medicare",
  "/recruiters": "recruiting", "/med-spa": "med-spa", "/solar": "solar", "/real-estate": "real-estate", "/roofing": "roofing",
  "/health-insurance-texting-crm": "health", "/life-insurance-texting-crm": "life", "/final-expense-texting-crm": "final-expense",
  "/medicare-agent-texting-crm": "medicare", "/auto-insurance-texting-crm": "auto", "/real-estate-texting-crm": "real-estate",
  "/mortgage-broker-texting-crm": "mortgage", "/solar-sales-texting-crm": "solar", "/recruiting-texting-crm": "recruiting",
  "/sales-team-texting-crm": "sales-team",
};

const INTEGRATIONS: (Card & { href: string })[] = [
  { href: "/integrations/lead-vendor-webhook", icon: "webhook", alt: "Webhook icon", title: "Lead vendor webhooks", body: "Give a lead vendor or web form your private URL and each new lead is saved as a contact, with an optional first text." },
  { href: "/integrations/google-calendar", icon: "calendar", alt: "Calendar icon", title: "Google Calendar", body: "Booked appointments appear on your calendar, and the AI only offers times you actually have open." },
  { href: "/integrations/csv-import", icon: "spreadsheet", alt: "Spreadsheet icon", title: "CSV and spreadsheets", body: "Export from any CRM or lead source, upload the file and map the columns to contact fields." },
  { href: "/integrations/zapier-webhooks", icon: "zap", alt: "Automation icon", title: "Zapier and automation tools", body: "Any tool that can send a webhook, including Zapier and Make, can post new leads into Text2Sale." },
];

const TOOLS: Record<string, { icon: string; body: string }> = {
  "/sms-character-counter": { icon: "tool-counter", body: "Count characters and segments before you send." },
  "/sms-cost-calculator": { icon: "tool-cost", body: "Estimate what a full campaign will cost." },
  "/lead-reactivation-roi-calculator": { icon: "tool-roi", body: "See what an old lead list could be worth." },
  "/quiet-hours-checker": { icon: "tool-quiet", body: "Check sending hours by state and time zone." },
  "/follow-up-cadence-generator": { icon: "tool-cadence", body: "Build a day-by-day follow-up schedule." },
  "/insurance-text-templates": { icon: "tool-templates", body: "Copy ready-to-edit insurance texts." },
  "/speed-to-lead-calculator": { icon: "tool-speed", body: "Measure what slow first replies cost." },
  "/dialer-calculator": { icon: "tool-dialer", body: "Plan dials, connects and talk time." },
  "/appointment-no-show-calculator": { icon: "tool-noshow", body: "Put a number on missed appointments." },
  "/10dlc-readiness-checklist": { icon: "tool-10dlc", body: "Check your business before you register." },
};

export default function HomeDepth() {
  const industries = SITE_PAGES.filter((page) => page.group === "industry");
  const tools = SITE_PAGES.filter((page) => page.group === "tool");
  const compare = SITE_PAGES.filter((page) => page.group === "compare");
  const posts = getAllPosts().slice(0, 6);

  return (
    <div className="t2s-depth">
      <section>
        <div className="w">
          <div className="label">Why teams switch</div>
          <h2>Leads go cold in the gaps between your tools.</h2>
          <p className="sub">Most lost deals are not lost on price. They are lost in the hour nobody replied, the callback nobody wrote down and the follow-up that depended on someone remembering. Text2Sale is sales texting software built to close those gaps.</p>
          <div className="ba">
            <div className="before"><h3>Before Text2Sale</h3><ul>{BEFORE.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div className="after"><h3>With Text2Sale</h3><ul>{AFTER.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </div>
        </div>
      </section>

      <section className="sage" id="how-it-works">
        <div className="w">
          <div className="label">How it works</div>
          <h2>Start texting your leads in three steps.</h2>
          <p className="sub">No developer and no long setup project. Upload a list on day one, and start sending as soon as carrier registration is approved.</p>
          <div className="grid g3">
            {STEPS.map((step, index) => (
              <div key={step.title} className="tile step">
                <Icon name={step.icon} alt={step.alt} />
                <b>0{index + 1}</b>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="texting-features">
        <div className="w">
          <div className="label">Business texting software</div>
          <h2>Bulk SMS and two-way texting, built for follow-up.</h2>
          <p className="sub">Everything in the Text plan, from {`$${PLANS.text.price.toFixed(2)}`} per user per month. Outbound texts are {`$${USAGE_RATES.smsPerSegment}`} per segment from a prepaid balance, and incoming texts are free.</p>
          <Cards items={TEXTING} columns="g4" />
          <Link className="more" href="/mass-texting-crm">See how the mass texting CRM works →</Link>
        </div>
      </section>

      <section className="sage" id="dialer-features">
        <div className="w">
          <div className="label">Sales dialer</div>
          <h2>A power and predictive dialer for the leads who would rather talk.</h2>
          <p className="sub">Some leads answer a text and some only pick up the phone. The Dialer plan, {`$${PLANS.dialer.price.toFixed(2)}`} per user per month, puts three dialing modes beside the same contact records. Minutes are billed separately.</p>
          <Cards items={DIALER} columns="g4" />
          <Link className="more" href="/power-dialer-vs-predictive-dialer">Power dialer or predictive dialer: which fits your list? →</Link>
        </div>
      </section>

      <section id="ai-features">
        <div className="w">
          <div className="label">AI follow-up</div>
          <h2>An AI appointment setter that replies, qualifies and books.</h2>
          <p className="sub">You decide how much it does. Leave it off, switch it on for a few conversations, or let it cover the inbox after hours. AI text replies are {`$${USAGE_RATES.aiReplyFee.toFixed(2)}`} each plus the outbound text.</p>
          <Cards items={AI} />
          <Link className="more" href="/ai-appointment-setter">See the AI appointment setter →</Link>
        </div>
      </section>

      <section className="sage" id="industries">
        <div className="w">
          <div className="label">Who it is for</div>
          <h2>Texting and calling built around how your industry sells.</h2>
          <p className="sub">Text2Sale is built first for insurance agents working purchased and aged leads. The same follow-up problem shows up anywhere a sale depends on a fast reply and a kept appointment.</p>
          <div className="grid g4">
            {industries.map((page) => (
              <Link key={page.path} href={page.path} className="tile">
                <Icon name={INDUSTRY_ICONS[page.path] ?? "sales-team"} alt={`${page.label} icon`} />
                <h3>{page.label}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="compliance">
        <div className="w split">
          <div>
            <div className="label">10DLC &amp; TCPA</div>
            <h2>Compliance tools are part of the product, not an add-on.</h2>
            <p className="sub">US carriers require business texting from local numbers to be registered, and the law requires consent. Text2Sale gives you the tools that compliant texting depends on. How you collect consent is still up to you, so only text people who agreed to hear from you.</p>
            <Link className="more" href="/10dlc-compliant-texting">Read about 10DLC compliant texting →</Link>
          </div>
          <div className="grid" style={{ marginTop: 0 }}>
            <div className="tile"><Icon name="compliance-registration" alt="Registration document icon" /><h3>10DLC registration in your dashboard</h3><p>Submit your brand and campaign in one place and track the review. Approval averages about four business days, and Text2Sale covers the registration and campaign fees.</p></div>
            <div className="tile"><Icon name="compliance-consent" alt="Consent signature icon" /><h3>Opt-in and opt-out handling</h3><p>STOP and HELP are processed automatically, opted-out contacts are skipped on every later send, and opt-in records stay with the contact.</p></div>
            <div className="tile"><Icon name="compliance-records" alt="Records archive icon" /><h3>Sending windows and records</h3><p>Quiet-hours windows keep campaigns inside reasonable hours, and message history is kept with each conversation if you ever need to show what was sent.</p></div>
          </div>
        </div>
      </section>

      <section className="sage" id="integrations">
        <div className="w">
          <div className="label">Integrations</div>
          <h2>Connect your lead sources and your calendar.</h2>
          <p className="sub">Leads should arrive without copy and paste, and appointments should land where you already look.</p>
          <div className="grid g4">
            {INTEGRATIONS.map((item) => (
              <Link key={item.href} href={item.href} className="tile">
                <Icon name={item.icon} alt={item.alt} />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </Link>
            ))}
          </div>
          <Link className="more" href="/integrations">See all integrations →</Link>
        </div>
      </section>

      <section id="free-tools">
        <div className="w">
          <div className="label">Free tools</div>
          <h2>Plan a campaign before you spend a dollar.</h2>
          <p className="sub">Ten free calculators and checklists. No account needed.</p>
          <div className="grid g4">
            {tools.map((page) => (
              <Link key={page.path} href={page.path} className="tile">
                <Icon name={TOOLS[page.path]?.icon ?? "tool-cost"} alt={`${page.label} icon`} />
                <h3>{page.label}</h3>
                {TOOLS[page.path] && <p>{TOOLS[page.path].body}</p>}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="sage" id="compare">
        <div className="w">
          <div className="label">Compare</div>
          <h2>How Text2Sale compares with other texting and dialing tools.</h2>
          <p className="sub">Side-by-side pages with plan prices, per-text costs and an honest note on when the other tool is the better fit.</p>
          <div className="pills">
            {compare.map((page) => <Link key={page.path} href={page.path}>{page.label}</Link>)}
          </div>
        </div>
      </section>

      <section className="dark" id="free-texts">
        <div className="w split">
          <div>
            <div className="label">Free download</div>
            <h2>Get 30 insurance follow-up texts you can send today.</h2>
            <p className="sub">First-touch texts, quote follow-ups, no-show recoveries and old-lead reactivation messages, written to be edited in a minute. Enter your name and email and the full pack unlocks.</p>
          </div>
          <div className="magnet">
            <LeadMagnet />
          </div>
        </div>
      </section>

      <section id="latest-guides">
        <div className="w">
          <div className="label">From the blog</div>
          <h2>Latest guides on texting, dialing and lead follow-up.</h2>
          <div className="grid g3">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="tile post">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/blog/${post.slug}/opengraph-image`} alt={post.title} width={1200} height={630} loading="lazy" decoding="async" />
                <div>
                  <small>{post.readMinutes} min read</small>
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
          <Link className="more" href="/blog">Browse every guide →</Link>
        </div>
      </section>

      <section className="sage" id="demo">
        <div className="w">
          <div className="label">See it live</div>
          <h2>See Text2Sale work a lead list like yours.</h2>
          <p className="sub">Book a short walkthrough with a person. We upload a sample list, build a follow-up and show replies, callbacks and booked appointments landing in one inbox. Or pick a plan below and start today.</p>
          <div className="actions">
            <Link className="btn" href="/demo">Book a demo</Link>
            <a className="ghost" href="#auth-form">Create an account</a>
          </div>
        </div>
      </section>
    </div>
  );
}
