import type { BlogPost } from "./blog-posts";

type NewArticle = Omit<BlogPost, "datePublished" | "dateModified" | "readMinutes">;

// Volume 7: practical guides on first messages, follow-up cadence, replies to
// common questions, carrier and compliance housekeeping, daily sales routines
// and AI assistant setup. Same registry as the other volumes, so the sitemap,
// RSS feed, topic pages and IndexNow pick these up automatically.
const ARTICLES: NewArticle[] = [
  {
    slug: "sms-opt-out-keywords-stop-help-start",
    metaTitle: "STOP, HELP and START: SMS Keywords Explained | Text2Sale",
    title: "STOP, HELP and START: how SMS opt-out keywords should work",
    description: "What the STOP, HELP and START keywords do in business texting, how to handle variations like UNSUBSCRIBE, and how to confirm every opt-out.",
    excerpt: "Opt-out keywords are the simplest compliance feature in texting and the easiest to get wrong. Here is how each one should behave.",
    tags: ["Compliance", "SMS", "Operations"],
    intro: [
      "Every business text program needs a clear way to stop. Carriers expect it, regulators expect it, and recipients certainly do. STOP, HELP and START are the three keywords nearly every program supports.",
      "This guide explains what each keyword should do, how to treat close variations, and what to check so no one who asks to stop ever gets another message.",
    ],
    sections: [
      {
        heading: "What each keyword does",
        paragraphs: [
          "STOP ends the program for that number. The sender should confirm the opt-out once, then send nothing else. HELP returns a short message naming the business and giving a way to get support. START or UNSTOP lets someone who opted out rejoin by their own choice.",
        ],
        bullets: [
          "STOP: confirm once, then suppress the number from every campaign.",
          "HELP: reply with your business name and a phone number or email.",
          "START: re-enable messaging only because the contact asked to.",
        ],
      },
      {
        heading: "Handle the variations",
        paragraphs: [
          "People rarely type exactly one word. They write unsubscribe, cancel, end, quit, or a full sentence such as please stop texting me. Treat the standard keywords as automatic opt-outs and have a person review messages that clearly ask to stop in other words. When in doubt, honor the request.",
        ],
      },
      {
        heading: "Verify it works",
        paragraphs: [
          "Test from a real phone before launch: text STOP, confirm you receive the confirmation, then try to enroll that number in a campaign and confirm it is blocked. Repeat after any migration or import, because a list loaded without its suppression data is how opted-out people get texted again.",
        ],
      },
    ],
    keyTakeaways: [
      "Support STOP, HELP and START on every program.",
      "Confirm an opt-out once and then stay silent.",
      "Treat plain-language requests to stop as opt-outs.",
      "Test the whole flow from a real phone before sending.",
    ],
    faq: [
      { question: "Can I text someone after they reply STOP?", answer: "Only the single confirmation message. After that, the number should receive nothing unless the person opts back in themselves." },
      { question: "Is START the only way to rejoin?", answer: "No. A fresh, documented opt-in through your form also counts, as long as it is the person's own choice." },
    ],
    relatedSlugs: ["sms-consent-records", "how-to-reduce-sms-opt-outs", "crm-migration-optout-suppression-checklist"],
    relatedPages: [{ href: "/10dlc-compliant-texting", label: "10DLC-compliant texting" }],
  },
  {
    slug: "choosing-a-10dlc-campaign-use-case",
    metaTitle: "Choosing a 10DLC Campaign Use Case | Text2Sale",
    title: "Choosing the right 10DLC campaign use case for your business",
    description: "How to pick the use case on a 10DLC campaign registration so it matches what you actually send, and why a mismatch causes rejections.",
    excerpt: "The use case you select describes what your texts do. Pick the one that matches reality and approval gets much easier.",
    tags: ["Compliance", "Deliverability", "Getting started"],
    intro: [
      "When you register a 10DLC campaign, you tell carriers what kind of messages you will send. That description is reviewed, and later messages are compared with it. A use case that does not match your real traffic is a common reason for rejections and filtering.",
      "Here is how to think about the choice and what to prepare before you submit.",
    ],
    sections: [
      {
        heading: "Describe what you actually send",
        paragraphs: [
          "Start with your real messages. A salon sending appointment reminders and a quote agency following up on requested quotes are different programs, even if both are small businesses. Write the campaign description in plain language: who the recipients are, how they opted in, and what each message is for.",
        ],
      },
      {
        heading: "Keep one campaign focused",
        paragraphs: [
          "A campaign that mixes unrelated purposes, such as account notices, promotions and recruiting, is harder to approve and harder to defend. If your business has distinct programs, ask whether they belong in separate registrations.",
        ],
        bullets: [
          "Match the use case to your highest-volume message type.",
          "Write sample messages that sound like your real texts.",
          "Make sure the opt-in page and sample messages tell the same story.",
        ],
      },
      {
        heading: "Make everything agree",
        paragraphs: [
          "Reviewers compare the use case, the description, the sample messages and the opt-in page. When they agree, review is straightforward. When they disagree, expect questions or a rejection. Check them side by side before submitting.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Before you submit, write a one-paragraph summary of your texting program in your own words and then check that every field in the registration says the same thing. Include who your customers are, how they opt in, what you send and how often. If you cannot explain the program simply, the registration will be harder to approve, so clarify the program first. Keep proof of your opt-in flow ready, such as screenshots of your form and consent wording. After approval, treat the registration as a living commitment and revisit it whenever your business changes what it sends.",
        ],
      },
    ],
    keyTakeaways: [
      "Choose the use case that matches your real messages.",
      "Keep each campaign focused on one purpose.",
      "Make samples, description and opt-in page consistent.",
      "Review all of it together before you submit.",
    ],
    faq: [
      { question: "Can I change the use case later?", answer: "Material changes usually mean updating or re-registering the campaign, so choose carefully the first time." },
      { question: "What if I send two kinds of messages?", answer: "Consider whether they belong in separate campaigns. Mixed purposes are harder to approve." },
    ],
    relatedSlugs: ["10dlc-registration-guide-for-agents", "10dlc-business-website-readiness-checklist", "a2p-brand-vetting-explained"],
    relatedPages: [{ href: "/10dlc-compliant-texting", label: "10DLC-compliant texting" }],
  },
  {
    slug: "writing-sample-messages-for-10dlc-campaigns",
    metaTitle: "Writing 10DLC Sample Messages That Get Approved | Text2Sale",
    title: "How to write 10DLC sample messages that get approved",
    description: "What reviewers look for in the sample messages on a 10DLC campaign, with practical rules for clarity, identification and opt-out language.",
    excerpt: "Sample messages are the part of a registration reviewers read most closely. Make them specific, honest and consistent.",
    tags: ["Compliance", "Deliverability", "Copywriting"],
    intro: [
      "Sample messages show carriers what your recipients will actually see. Vague or generic samples invite follow-up questions, while specific ones show the program is real and well run.",
      "Use the rules below to draft samples that read like your genuine texts.",
    ],
    sections: [
      {
        heading: "Be specific and identify yourself",
        paragraphs: [
          "Each sample should name your business and say something concrete. A message that says only reply for details looks like boilerplate. A message that names the business, references a request the person made and offers a clear next step looks like a real conversation.",
        ],
      },
      {
        heading: "Include required language",
        paragraphs: [
          "At least one sample, typically the opt-in confirmation, should state the program name, message frequency, that message and data rates may apply, and how to get help and stop. Keep it short, but do not leave it out.",
        ],
        bullets: [
          "Business name in the message.",
          "Reply STOP to opt out, HELP for help.",
          "No misleading or hidden links, and no shortened links from public shorteners.",
        ],
      },
      {
        heading: "Match your real traffic",
        paragraphs: [
          "Send what you registered. If the samples describe appointment reminders but the program sends promotions, filtering follows. Treat the samples as a promise and review them whenever your messaging changes.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Keep a master document that holds your registered samples, your campaign description and your opt-in flow, with the date each was last updated. Before you launch a new type of message, compare it with what you registered, and update the registration first if it has changed. Have a second person read your samples cold and ask whether they would understand who is texting and why. If your registration is rejected, read the reason carefully and fix exactly what it names rather than rewriting everything. Consistent, honest samples make approvals faster and keep your campaigns healthy long after launch.",
        ],
      },
    ],
    keyTakeaways: [
      "Name your business in every sample.",
      "Show a real, specific purpose for the message.",
      "Include opt-out and help language where required.",
      "Send what you registered.",
    ],
    faq: [
      { question: "How many samples should I provide?", answer: "Provide enough to cover the message types you send, usually two to five, each realistic and distinct." },
      { question: "Can samples include variables?", answer: "Yes. Show the placeholder style you use, such as a first name, and make clear what fills it." },
    ],
    relatedSlugs: ["choosing-a-10dlc-campaign-use-case", "10dlc-brand-verified-campaign-pending", "identifying-your-business-in-every-text"],
    relatedPages: [{ href: "/10dlc-compliant-texting", label: "10DLC-compliant texting" }],
  },
  {
    slug: "sms-welcome-message-examples",
    metaTitle: "SMS Welcome Message Examples That Set Expectations | Text2Sale",
    title: "SMS welcome message examples that set the right expectations",
    description: "How to write the first text a new subscriber receives, with structure, required elements and examples for different kinds of businesses.",
    excerpt: "The welcome text is your one guaranteed read. Use it to confirm the sign-up and tell people exactly what comes next.",
    tags: ["SMS marketing", "Copywriting", "Getting started"],
    intro: [
      "The welcome message is the first thing a new subscriber receives from you. It confirms the sign-up, sets expectations and gives them an easy way out, which builds trust before the first real message.",
      "Here is a structure that works for most businesses, followed by adaptable examples.",
    ],
    sections: [
      {
        heading: "The four parts",
        paragraphs: [
          "A good welcome has your business name, what the person signed up for, how often they will hear from you, and how to stop or get help. Everything else is optional.",
        ],
        bullets: [
          "Who you are.",
          "What they will receive.",
          "Approximate frequency and the note that message and data rates may apply.",
          "Reply STOP to cancel, HELP for help.",
        ],
      },
      {
        heading: "Examples to adapt",
        paragraphs: [
          "A service business might write: Hi Dana, this is Harbor Plumbing. You are signed up for appointment updates and occasional service tips. Msg frequency varies. Msg and data rates may apply. Reply HELP for help, STOP to cancel.",
          "A retailer might add a short promise of value, such as early notice of sales, but should still keep the required language intact.",
        ],
      },
      {
        heading: "What to avoid",
        paragraphs: [
          "Skip the hard sell in the welcome text. Skip unexplained links. And do not promise a frequency you will not keep. The welcome is a contract, and subscribers remember it.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Review your welcome message whenever your program changes. If you add a new type of message, update the description so people know what to expect. Check that the opt-out language is still accurate and that the business name is the one customers recognize. Test it on a real phone and verify it arrives promptly after the sign-up. If your sign-up form offers more than one program, send a welcome for each or one that clearly covers them all. A good welcome message is a small investment that pays off every time a new subscriber joins, and that reduces confusion and complaints later.",
        ],
      },
    ],
    keyTakeaways: [
      "Send a welcome text immediately after opt-in.",
      "State who you are, what to expect and how to stop.",
      "Keep it short and free of hard selling.",
      "Do not promise a frequency you will not keep.",
    ],
    faq: [
      { question: "Is a welcome text required?", answer: "A confirmation of the sign-up is widely expected and often part of the registered opt-in flow, so it is a good practice to always send one." },
      { question: "Can the welcome text include a coupon?", answer: "Yes, if it matches your registered program. Keep the opt-out language in the same message." },
    ],
    relatedSlugs: ["double-opt-in-sms", "how-to-build-an-sms-opt-in-list", "new-client-welcome-texts"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "first-text-to-a-new-lead-examples",
    metaTitle: "The First Text to a New Lead: Examples and Rules | Text2Sale",
    title: "The first text to a new lead: what to say and what to skip",
    description: "A practical guide to the opening text for a new inbound lead, covering speed, personalization, one clear question and what to leave out.",
    excerpt: "The first message decides whether a conversation starts. Keep it short, human and built around one easy question.",
    tags: ["Scripts", "Speed to lead", "SMS follow-up"],
    intro: [
      "A new lead has just raised a hand, and the next few minutes matter. The first text should feel like a person responding to a request, not a campaign.",
      "These guidelines work for most inbound leads, from insurance quotes to home services.",
    ],
    sections: [
      {
        heading: "Anatomy of a good opener",
        paragraphs: [
          "Use their first name, say who you are and which request you are responding to, and ask one simple question. Example: Hi Marcus, this is Priya with Lakeside Insurance about the quote you requested. Do you have a minute today to go over it?",
        ],
      },
      {
        heading: "What to leave out",
        paragraphs: [
          "Leave out long pitches, multiple questions, links in the first message when you can avoid them, and any claims you cannot stand behind. A single question is easier to answer than three.",
        ],
        bullets: [
          "No walls of text.",
          "No pressure or fake urgency.",
          "No pretending to be a different person.",
        ],
      },
      {
        heading: "Timing and consent",
        paragraphs: [
          "Reach out quickly, but only to people who consented to hear from you and only during permitted hours. A fast message to someone who never agreed to texts is a compliance problem, not a head start.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Treat your opener as something to test. Try two versions on similar leads for a couple of weeks and compare reply rates, keeping everything else the same. Pay attention to the first few words, because they appear in the notification and decide whether the message gets opened. Match the opener to the lead source: someone who requested a quote deserves a different message than someone who downloaded a guide. Keep a short list of your best performers and share them with the team. And always review replies: how people answer tells you what to change in the next version.",
        ],
      },
    ],
    keyTakeaways: [
      "Name yourself and the request you are answering.",
      "Ask one easy question.",
      "Keep it short and avoid early links.",
      "Confirm consent and send within allowed hours.",
    ],
    faq: [
      { question: "Should the first text come from a person or automation?", answer: "Either can work if it is accurate and consented. Many teams automate the first reply and hand off to a person when the lead responds." },
      { question: "How many follow-ups should I send?", answer: "See your follow-up cadence. A handful over two weeks, spaced out, is a reasonable starting point." },
    ],
    relatedSlugs: ["how-fast-to-text-insurance-leads", "auto-text-web-form-leads", "sms-objection-handling-scripts"],
    relatedPages: [{ href: "/sms-follow-up-for-sales-teams", label: "SMS follow-up for sales teams" }],
  },
  {
    slug: "text-follow-up-cadence-first-two-weeks",
    metaTitle: "A Text Follow-Up Cadence for the First Two Weeks | Text2Sale",
    title: "A sensible text follow-up cadence for the first two weeks",
    description: "How to space follow-up texts after a new lead comes in, with a sample schedule, stop conditions and tips for keeping it respectful.",
    excerpt: "Persistence works when it is spaced out and easy to stop. Here is a two-week schedule you can adapt.",
    tags: ["SMS follow-up", "Campaigns", "Lead management"],
    intro: [
      "Most leads do not respond to the first text. A planned cadence keeps you present without pestering, and automation makes sure no lead is forgotten.",
      "Below is a schedule you can adapt, along with rules for when to stop.",
    ],
    sections: [
      {
        heading: "A sample schedule",
        paragraphs: [
          "Send the first text within minutes. Follow up the same day if there is no reply, then on day two, day four, day seven and day fourteen. Each message should add something new rather than repeat the last.",
        ],
        bullets: [
          "Day 0: introduction and one question.",
          "Day 0 later or day 1: a short check-in.",
          "Day 4: helpful information or an offer to schedule.",
          "Day 7: a simple yes or no question.",
          "Day 14: a polite closing message.",
        ],
      },
      {
        heading: "Stop conditions",
        paragraphs: [
          "The cadence should stop automatically when the lead replies, books, asks to stop or is marked as not interested. Stopping on reply is the most important rule, because nothing feels worse than a scripted message that ignores what you just said.",
        ],
      },
      {
        heading: "Mix channels",
        paragraphs: [
          "Combine texts with calls at sensible points. A call after the second unanswered text often lands better because the person has seen your name more than once.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Adjust the cadence to your sales cycle. A quick purchase may need tighter spacing, while a considered purchase can stretch the schedule over a month. Look at when your replies actually arrive and place your messages in those windows. Review the cadence after a few hundred leads: which step produces the most responses, and at what point do opt-outs increase? Cut steps that do not earn their place. Keep a version for leads who have gone quiet after an earlier conversation, with a lighter tone and a longer gap. A cadence is not a fixed rule; it is a tool you refine with evidence.",
        ],
      },
    ],
    keyTakeaways: [
      "Space messages out and vary their content.",
      "Stop the sequence when the lead replies or opts out.",
      "End with a polite closing message.",
      "Pair texts with well-timed calls.",
    ],
    faq: [
      { question: "Is five texts too many?", answer: "Over two weeks, spaced out, it is usually reasonable for someone who requested contact. Always honor opt-outs immediately." },
      { question: "Should weekends be included?", answer: "Follow your audience. Many teams skip Sundays and keep within local quiet hours." },
    ],
    relatedSlugs: ["multi-step-sms-follow-up-campaign", "sms-stop-on-reply-campaign-rules", "text-then-call-dialer-sequence"],
    relatedPages: [{ href: "/sms-follow-up-for-sales-teams", label: "SMS follow-up for sales teams" }],
  },
  {
    slug: "answering-price-questions-by-text",
    metaTitle: "How to Answer Price Questions by Text | Text2Sale",
    title: "How to answer price questions by text without losing the lead",
    description: "When to share pricing by text, when to ask a question first, and sample replies that keep the conversation moving.",
    excerpt: "How much is it is the most common first reply. Here is how to answer honestly while keeping the conversation going.",
    tags: ["Scripts", "Sales teams", "Two-way texting"],
    intro: [
      "Price is often the first thing a lead asks about. Ignoring it feels evasive, but quoting a number with no context can lose the sale or set a wrong expectation.",
      "These approaches handle the question honestly and keep you in the conversation.",
    ],
    sections: [
      {
        heading: "Give a range with context",
        paragraphs: [
          "If pricing varies, say so and give a realistic range, then explain what drives it. Example: Most jobs like yours run between X and Y depending on size. Can I ask two quick questions to give you a firm number?",
        ],
      },
      {
        heading: "Ask before you quote",
        paragraphs: [
          "When the price truly depends on details, ask for them. Keep it to one or two questions and explain why you need them. People accept questions when they see the answer coming.",
        ],
        bullets: [
          "Explain why you are asking.",
          "Ask no more than two questions at a time.",
          "Offer a quick call if it is easier.",
        ],
      },
      {
        heading: "Be honest",
        paragraphs: [
          "Never hide fees or promise a price you cannot honor. A fair price shared clearly builds more trust than a low price that grows later.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Collect your most frequent pricing questions and agree on a team answer for each, including the range, what affects it and the next step. That way every customer hears a consistent story no matter who replies. Track how often price questions lead to appointments and how often they end the conversation, and look for wording that keeps people engaged. Remember that price rarely stands alone: customers also care about speed, trust and what is included. When you answer a price question, add one sentence about the value behind it, so the number arrives with context instead of standing alone in a text.",
        ],
      },
    ],
    keyTakeaways: [
      "Answer the question, with context.",
      "Use ranges when pricing varies.",
      "Ask one or two clarifying questions.",
      "Never hide fees or overpromise.",
    ],
    faq: [
      { question: "Should I send prices in writing by text?", answer: "Yes, if you are comfortable standing behind them. A text is a written record, so be accurate." },
      { question: "What if the lead stops replying after I quote?", answer: "Follow up once with a helpful question, then respect their silence." },
    ],
    relatedSlugs: ["sms-objection-handling-scripts", "how-to-get-more-replies-to-sales-texts", "closing-the-loop-with-lost-deals"],
    relatedPages: [{ href: "/sales-team-texting-crm", label: "Sales team texting CRM" }],
  },
  {
    slug: "lead-says-call-me-later-text-reply",
    metaTitle: "When a Lead Says Call Me Later: What to Text Back | Text2Sale",
    title: "When a lead says call me later: what to text back",
    description: "How to respond to call me later and not right now replies, with a method for setting a specific time and following through.",
    excerpt: "Later is not a no. The best reply turns a vague later into a specific time on both calendars.",
    tags: ["Scripts", "SMS follow-up", "Appointments"],
    intro: [
      "A reply of call me later is a buying signal wrapped in a brush-off. The person engaged, which is good, but without a specific time, later tends to become never.",
      "The goal is to turn later into a concrete time without being pushy.",
    ],
    sections: [
      {
        heading: "Offer two choices",
        paragraphs: [
          "Reply with a quick acknowledgment and two options. Example: Absolutely. Would tomorrow at 10 or Thursday at 4 work better? People find choosing easier than inventing a time.",
        ],
      },
      {
        heading: "Confirm and remind",
        paragraphs: [
          "Once they pick, confirm the time in writing and set a reminder for yourself. A short reminder text an hour before the call reduces missed connections.",
        ],
        bullets: [
          "Confirm date, time and time zone.",
          "Add it to your calendar immediately.",
          "Send a brief reminder before the call.",
        ],
      },
      {
        heading: "If they do not pick a time",
        paragraphs: [
          "Wait a day or two, then check in once with a lighter question. If there is still no answer, move them back into your regular follow-up cadence and respect their pace.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Track how many later replies turn into real conversations and use that to refine your wording. If you find that two-option replies get more answers than open questions, make them your standard. Put every promised callback on the calendar with a reminder, and treat it as an appointment with the customer rather than a vague intention. If you miss the time, reach out right away with a short apology and a new offer. People understand that schedules slip, but they rarely forgive being forgotten. A reliable callback practice quietly turns a large share of maybe leads into customers.",
        ],
      },
    ],
    keyTakeaways: [
      "Treat later as interest, not rejection.",
      "Offer two specific times.",
      "Confirm and remind.",
      "Return to the cadence if they go quiet.",
    ],
    faq: [
      { question: "How soon should I follow up after later?", answer: "Honor the time they gave. If none, a day or two is a natural interval." },
      { question: "Can I call without confirming a time?", answer: "It is better to confirm. A scheduled call is much more likely to be answered." },
    ],
    relatedSlugs: ["how-to-book-appointments-by-text", "what-to-text-a-lead-who-ghosted-you", "ai-appointment-booking-by-text"],
    relatedPages: [{ href: "/sms-follow-up-for-sales-teams", label: "SMS follow-up for sales teams" }],
  },
  {
    slug: "voicemail-vs-text-follow-up",
    metaTitle: "Voicemail or Text: Which Follow-Up Works Better? | Text2Sale",
    title: "Voicemail or text: which follow-up should you use?",
    description: "How to decide between leaving a voicemail and sending a text, and how combining both usually beats either alone.",
    excerpt: "Voicemail and text each have strengths. Use them together and give every message one clear purpose.",
    tags: ["Strategy", "SMS follow-up", "Sales teams"],
    intro: [
      "When a call goes unanswered, you have a choice: leave a voicemail, send a text, or do both. Each has a role, and the best sales teams use them together.",
      "Here is how to think about the choice.",
    ],
    sections: [
      {
        heading: "Strengths of each",
        paragraphs: [
          "A voicemail carries your voice and tone, which builds familiarity. A text is quick to read, easy to answer and leaves a written record. Many people check texts faster than voicemail.",
        ],
      },
      {
        heading: "Use them together",
        paragraphs: [
          "A short voicemail followed by a text that restates the key point works well. Example: I just left you a voicemail about your quote. Easier to text? Reply here anytime.",
        ],
        bullets: [
          "Keep voicemails under 30 seconds.",
          "Say your name and number clearly.",
          "Make the text a one-question follow-up.",
        ],
      },
      {
        heading: "Respect preferences",
        paragraphs: [
          "If someone replies that they prefer texting, honor it. Record the preference so everyone on your team follows it.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Test the combination on a small group before rolling it out. Split a list, use voicemail plus text for one half and text only for the other, and compare reply and appointment rates over a couple of weeks. Look at timing as well: a text sent a few minutes after the voicemail often works better than one sent hours later. Record voicemail scripts that sound natural and keep them under half a minute. Update them seasonally so they do not become stale. If your data shows one approach clearly outperforming the other for a particular type of lead, adopt it for that segment and keep testing as your audience changes.",
        ],
      },
    ],
    keyTakeaways: [
      "Voicemail builds familiarity; text makes replying easy.",
      "Combine them with a clear, single ask.",
      "Keep both short.",
      "Record contact preferences.",
    ],
    faq: [
      { question: "Should I text before calling?", answer: "Either order can work. A text first can warm up a call, and a call first can be followed by a text." },
      { question: "How many voicemails are too many?", answer: "Rarely more than one or two per sequence. Rely on text for further touches." },
    ],
    relatedSlugs: ["text-then-call-dialer-sequence", "sms-vs-cold-calling-leads", "power-dialer-dispositions-workflow"],
    relatedPages: [{ href: "/sales-team-texting-crm", label: "Sales team texting CRM" }],
  },
  {
    slug: "inbound-lead-response-scorecard",
    metaTitle: "An Inbound Lead Response Scorecard for Sales Teams | Text2Sale",
    title: "An inbound lead response scorecard for sales teams",
    description: "A simple scorecard for measuring how well your team responds to new leads, covering speed, quality, follow-through and outcomes.",
    excerpt: "What you measure improves. A one-page scorecard keeps response quality visible every week.",
    tags: ["Sales teams", "Analytics", "Speed to lead"],
    intro: [
      "Teams often track how many leads they get but not how well they respond. A scorecard turns response quality into numbers you can coach.",
      "Here is a simple version you can build in any spreadsheet or report.",
    ],
    sections: [
      {
        heading: "Core measures",
        paragraphs: [
          "Track the time to first response, the share of leads contacted by text and by phone, the number of attempts before a conversation, and the share that reach an appointment.",
        ],
        bullets: [
          "Median time to first response.",
          "Contact rate within 24 hours.",
          "Attempts per lead.",
          "Appointments per 100 leads.",
        ],
      },
      {
        heading: "Quality checks",
        paragraphs: [
          "Numbers do not show tone or accuracy. Each week, read a small sample of conversations per rep and score them on clarity, friendliness, accuracy and next steps.",
        ],
      },
      {
        heading: "Use it to coach",
        paragraphs: [
          "Review the scorecard in a weekly meeting. Celebrate improvements, pick one thing to work on per rep and revisit it the next week. Keep it constructive.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Start small and improve the scorecard over time. Pick three measures you can collect reliably this week, show them to the team and agree what good looks like. Add more only when people trust the first set. Be careful about incentives: if you reward only speed, reps may send low-quality messages just to hit the clock, so pair speed with a quality check. Share results visibly and celebrate progress as well as top performers. Over a quarter, you will see which habits lead to better conversations, and you can turn them into scripts, training and automation that raise the whole team's results.",
        ],
      },
    ],
    keyTakeaways: [
      "Measure speed, contact rate, attempts and appointments.",
      "Sample real conversations for quality.",
      "Review weekly and pick one focus per rep.",
      "Keep the tone constructive.",
    ],
    faq: [
      { question: "How many conversations should I review?", answer: "A handful per rep each week is enough to spot patterns without becoming a burden." },
      { question: "Should reps see each other's scores?", answer: "Share team averages openly. Individual feedback works best one-on-one." },
    ],
    relatedSlugs: ["sales-rep-texting-kpis", "audit-speed-to-lead-sales-team", "weekly-texting-review-meeting"],
    relatedPages: [{ href: "/sales-team-texting-crm", label: "Sales team texting CRM" }],
  },
  {
    slug: "tagging-lead-outcomes-in-your-crm",
    metaTitle: "How to Tag Lead Outcomes in Your CRM | Text2Sale",
    title: "How to tag lead outcomes so your reports mean something",
    description: "Why consistent outcome tags matter, a short list worth using and rules for keeping tags clean as your team grows.",
    excerpt: "If every rep labels outcomes differently, reports mislead. A short, shared tag list fixes that.",
    tags: ["Lead management", "Operations", "Analytics"],
    intro: [
      "Reports are only as good as the labels behind them. When one rep writes not interested and another writes dead, you cannot count either reliably.",
      "A small, agreed list of outcome tags makes your numbers trustworthy.",
    ],
    sections: [
      {
        heading: "A short list that works",
        paragraphs: [
          "Most teams do well with about eight outcomes. More than that and people stop using them correctly.",
        ],
        bullets: [
          "Appointment set.",
          "Sold.",
          "Not interested.",
          "Wrong number.",
          "Do not contact.",
          "No answer, still working.",
          "Bad timing, follow up later.",
          "Disqualified.",
        ],
      },
      {
        heading: "Define each tag",
        paragraphs: [
          "Write one sentence for each tag so everyone agrees on what it means. Post the list where reps can see it and review it during onboarding.",
        ],
      },
      {
        heading: "Keep it clean",
        paragraphs: [
          "Once a quarter, look for near-duplicates and unused tags, merge them and tell the team. Treat Do not contact with particular care, because it protects people and your compliance record.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Build the habit into the workflow so tagging happens at the moment of the outcome rather than at the end of the week. When a rep finishes a call or closes a conversation, prompt for the outcome before moving to the next lead. Use your reports to find contacts with no outcome and clean those up regularly. Once the tags are reliable, you can answer questions that were guesswork before: which sources produce appointments, which reps convert best and how many leads are simply bad numbers. Share those findings with the team so everyone sees why the tagging matters. People keep up a habit when they can see what it unlocks.",
        ],
      },
    ],
    keyTakeaways: [
      "Use a short, shared set of outcome tags.",
      "Define each one in a sentence.",
      "Review and merge duplicates regularly.",
      "Treat Do not contact as a hard stop.",
    ],
    faq: [
      { question: "Should reps create their own tags?", answer: "For outcomes, no. Keep a managed list, and allow free-form tags only for secondary details." },
      { question: "Can tags trigger automation?", answer: "Yes. Outcome tags are a good way to stop campaigns or start the right follow-up." },
    ],
    relatedSlugs: ["organizing-contacts-with-tags", "power-dialer-dispositions-workflow", "crm-contact-deduplication-phone-email"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "pipeline-stages-for-a-texting-crm",
    metaTitle: "Pipeline Stages for a Texting-First CRM | Text2Sale",
    title: "Pipeline stages that fit a texting-first sales process",
    description: "How to design pipeline stages around conversations rather than paperwork, with a simple default set and rules for moving contacts between them.",
    excerpt: "A pipeline should reflect where each conversation really stands. Keep stages few and the exit rule for each one clear.",
    tags: ["Sales teams", "Lead management", "Operations"],
    intro: [
      "When much of your selling happens by text, your pipeline should show conversations, not just deals. Each stage should answer: what happens next, and who owns it?",
      "Here is a simple structure and the rules that keep it honest.",
    ],
    sections: [
      {
        heading: "A default set",
        paragraphs: [
          "Begin with five or six stages: New, Contacted, Engaged, Appointment, Proposal or Quote, and Won or Lost.",
        ],
        bullets: [
          "New: no outreach yet.",
          "Contacted: outreach sent, no reply.",
          "Engaged: they have replied.",
          "Appointment: a time is booked.",
          "Proposal: a quote or offer is out.",
        ],
      },
      {
        heading: "Write exit rules",
        paragraphs: [
          "For each stage, define what moves a contact forward and how long it may sit there. Contacts stuck too long should be flagged for review or returned to a follow-up campaign.",
        ],
      },
      {
        heading: "Automate the easy moves",
        paragraphs: [
          "Move contacts to Engaged when they reply and to Appointment when a booking is made. Automation keeps the board accurate and saves reps from busywork.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Revisit your stages after a month of real use. Look for stages where contacts pile up, stages that nobody uses and moments in the process that your pipeline does not capture. Adjust conservatively, because every change confuses people for a while. Make sure reports use the same stage names as your team does in conversation. If you serve different kinds of customers, consider a separate pipeline for each rather than adding more stages to one. And be clear about what a stage means to a customer: moving someone to Proposal should mean something concrete has been sent, not that a rep merely intends to send it.",
        ],
      },
    ],
    keyTakeaways: [
      "Keep stages few and meaningful.",
      "Define what moves a contact forward.",
      "Flag contacts stuck too long.",
      "Automate obvious transitions.",
    ],
    faq: [
      { question: "How many stages is too many?", answer: "If reps cannot remember the order without looking, there are too many." },
      { question: "Should lost deals be deleted?", answer: "No. Keep them with a reason so you can learn from them and re-engage later where appropriate." },
    ],
    relatedSlugs: ["lead-nurturing-sequences-for-agents", "closing-the-loop-with-lost-deals", "tagging-lead-outcomes-in-your-crm"],
    relatedPages: [{ href: "/sales-team-texting-crm", label: "Sales team texting CRM" }],
  },
  {
    slug: "sms-reply-templates-for-common-questions",
    metaTitle: "SMS Reply Templates for Common Customer Questions | Text2Sale",
    title: "SMS reply templates for the questions customers ask most",
    description: "How to build a library of reusable text replies for hours, location, pricing, availability and scheduling, without sounding robotic.",
    excerpt: "Saved replies save time when they are short, editable and personal. Here is how to build a library that sounds human.",
    tags: ["Customer service", "Two-way texting", "Operations"],
    intro: [
      "Customers ask the same handful of questions again and again. Saved replies let you answer fast, as long as they stay personal and accurate.",
      "Here is how to build a useful library.",
    ],
    sections: [
      {
        heading: "Start with your top questions",
        paragraphs: [
          "Look through recent conversations and list the ten most common questions. Typical ones are hours, location, parking, pricing, availability, what to bring and how to reschedule.",
        ],
      },
      {
        heading: "Write them to be edited",
        paragraphs: [
          "Write each reply in your natural voice and leave a spot for a name or detail. A template is a starting point, not a script to paste blindly.",
        ],
        bullets: [
          "Keep them under two or three sentences.",
          "Include a next step.",
          "Review them every few months for accuracy.",
        ],
      },
      {
        heading: "Know when not to use them",
        paragraphs: [
          "If someone is upset, confused or asking something unusual, write a fresh reply. Templates are for routine questions only.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Organize the library so people can actually find things. Group replies by topic, name each one clearly and keep the most-used ones near the top. Assign someone to own the library and update it when hours, prices or policies change, because a stale template does real damage at scale. Encourage reps to suggest new entries when they notice themselves typing the same answer twice. Track which templates get used most and which get edited heavily; heavy editing usually means the wording needs improvement. Finally, review a few conversations each month to be sure templates still sound like a person wrote them, since customers can tell when a message feels canned.",
        ],
      },
    ],
    keyTakeaways: [
      "Build replies from real conversations.",
      "Keep them short and editable.",
      "Update them regularly.",
      "Write fresh replies for sensitive situations.",
    ],
    faq: [
      { question: "How many templates should I have?", answer: "Ten to fifteen cover most routine questions. More than that becomes hard to find and maintain." },
      { question: "Can an AI assistant use these?", answer: "Yes. The same answers can seed an AI assistant's knowledge so replies stay consistent." },
    ],
    relatedSlugs: ["two-way-texting-for-customer-service", "auto-replies-for-hours-and-holidays", "ai-sms-replies-for-sales"],
    relatedPages: [{ href: "/ai-texting-crm", label: "AI texting CRM" }],
  },
  {
    slug: "reengaging-cold-leads-with-seasonal-hooks",
    metaTitle: "Re-Engaging Cold Leads With Seasonal Hooks | Text2Sale",
    title: "Re-engaging cold leads with seasonal and timely reasons to text",
    description: "How to use real calendar events and business milestones as honest reasons to reconnect with leads who went quiet.",
    excerpt: "A reason to reach out beats a generic check-in. Use real events and keep the message about them, not you.",
    tags: ["Campaigns", "SMS follow-up", "Retention"],
    intro: [
      "Cold leads are not dead leads. Circumstances change, and a well-timed message can restart a conversation. The key is a genuine reason for reaching out.",
      "Here are ways to find those reasons and use them well.",
    ],
    sections: [
      {
        heading: "Look for natural hooks",
        paragraphs: [
          "Seasons, deadlines, policy renewals, new offerings, local events and the lead's own earlier timeline all provide honest reasons. Example: Hi Sam, you mentioned wanting to revisit this after tax season. Is now a better time?",
        ],
      },
      {
        heading: "Segment before you send",
        paragraphs: [
          "Use tags and source to send hooks that fit. A message about a seasonal change means nothing to people who were interested in something else.",
        ],
        bullets: [
          "Group by interest and original request date.",
          "Skip anyone who opted out or said not interested.",
          "Limit the number of reactivation messages per person.",
        ],
      },
      {
        heading: "Check consent and age",
        paragraphs: [
          "Make sure you still have a valid basis to text each person. If consent is old or unclear, reconsider before sending.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Plan your reactivation calendar a quarter ahead. List the real events relevant to your customers, such as renewal periods, tax deadlines, weather seasons, school calendars and local happenings, and decide which segments each one fits. Draft the messages in advance so you can review them calmly instead of rushing. After each send, measure replies, appointments and opt-outs, and compare them with your regular campaigns. If a hook produces mostly opt-outs, retire it. If it produces conversations, repeat it next year with updated details. Reactivation done well feels like a helpful reminder, not a sales blast, and the data will tell you which kind you are sending.",
        ],
      },
    ],
    keyTakeaways: [
      "Use honest, relevant reasons to reconnect.",
      "Segment so each message fits.",
      "Exclude opt-outs and declined leads.",
      "Verify consent before reactivating.",
    ],
    faq: [
      { question: "How old is too old to text a lead?", answer: "It depends on how and when they consented. If you are unsure, do not send." },
      { question: "How often should I reactivate?", answer: "Sparingly. Once or twice a year with a real reason is plenty for most businesses." },
    ],
    relatedSlugs: ["reengage-old-leads-with-sms-campaign", "texting-aged-insurance-leads", "holiday-sms-marketing-campaigns"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "readable-business-texts-length-and-layout",
    metaTitle: "Writing Readable Business Texts: Length and Layout | Text2Sale",
    title: "Writing readable business texts: length, layout and tone",
    description: "Practical guidance on message length, line breaks, plain language and tone so your texts are easy to read on a small screen.",
    excerpt: "People read texts in seconds on a small screen. Short sentences, one idea per message and plain words win.",
    tags: ["Copywriting", "SMS", "SMS marketing"],
    intro: [
      "Text messages are read quickly, often while doing something else. Clear writing matters more here than almost anywhere.",
      "These habits make your messages easier to read and answer.",
    ],
    sections: [
      {
        heading: "One idea per message",
        paragraphs: [
          "Aim for one purpose and one question. If you need to cover several topics, split them or move to a call. A focused message is more likely to get an answer.",
        ],
      },
      {
        heading: "Use plain words",
        paragraphs: [
          "Choose everyday language over jargon. Spell out abbreviations your customers may not know. Read the message aloud: if it sounds odd, rewrite it.",
        ],
        bullets: [
          "Short sentences.",
          "Active voice.",
          "Specific details instead of vague promises.",
        ],
      },
      {
        heading: "Mind length and characters",
        paragraphs: [
          "Messages longer than a single segment are split and billed per segment, and special characters can shorten the limit. Keep texts brief and check previews before sending.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Test your messages the way customers read them. Send yourself a draft and look at it on a phone, in bright light, at arm's length. If you cannot grasp the point in a few seconds, shorten it. Read your last ten messages in a row and notice repeated openings, filler phrases and unnecessary words. Keep a short style note for your team with your greeting, sign-off and any words you avoid, so messages sound like one business even when different people send them. Revisit your most common templates twice a year and cut a few words from each. Small edits compound across thousands of messages, and shorter messages are cheaper to send.",
        ],
      },
    ],
    keyTakeaways: [
      "One purpose and one question per text.",
      "Use plain, specific language.",
      "Keep messages brief.",
      "Check length and characters before sending.",
    ],
    faq: [
      { question: "How long should a business text be?", answer: "Often one to three short sentences. Longer messages can work when the content requires it." },
      { question: "Are line breaks okay?", answer: "Yes, sparingly. A line break between a greeting and the message can improve readability." },
    ],
    relatedSlugs: ["sms-copywriting-tips", "sms-character-limits-encoding", "emoji-and-tone-in-business-texts"],
    relatedPages: [{ href: "/bulk-sms-software", label: "Bulk SMS software" }],
  },
  {
    slug: "managing-phone-numbers-across-a-sales-team",
    metaTitle: "Managing Phone Numbers Across a Sales Team | Text2Sale",
    title: "Managing phone numbers across a sales team",
    description: "How to assign, document and retire texting numbers across reps, and how to keep conversations intact when people join or leave.",
    excerpt: "Numbers are part of your customer relationships. Plan who owns each one and what happens when reps change.",
    tags: ["Sales teams", "Operations", "Deliverability"],
    intro: [
      "Customers save the number that texts them. If that number disappears when a rep leaves, you lose the thread of the relationship.",
      "Plan number ownership before your team grows.",
    ],
    sections: [
      {
        heading: "Decide the model",
        paragraphs: [
          "You can give each rep a number, share a team number or mix both. Individual numbers feel personal; shared numbers survive staffing changes. Choose based on how your customers prefer to deal with you.",
        ],
      },
      {
        heading: "Document ownership",
        paragraphs: [
          "Keep a simple record of each number, its owner, its registered campaign and its purpose.",
        ],
        bullets: [
          "Number and area code.",
          "Assigned person or team.",
          "Registered campaign and status.",
          "Date assigned.",
        ],
      },
      {
        heading: "Plan for turnover",
        paragraphs: [
          "When a rep leaves, reassign their number and conversations rather than discarding them, and have the new owner introduce themselves. Customers appreciate continuity.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Review your number inventory every quarter. Check for numbers that are no longer used, numbers with falling delivery rates and numbers whose registered campaign no longer matches how they are used. Retire unused numbers deliberately and tell customers who still text them where to reach you instead. When you add a rep, decide before their first day which number they will use and whether they inherit any existing conversations. Keep the list somewhere your whole leadership team can see, not just in one person's head. A tidy inventory makes audits, carrier questions and staffing changes much less stressful, and it protects the relationships your customers built with your business number.",
        ],
      },
    ],
    keyTakeaways: [
      "Choose individual, shared or mixed numbers deliberately.",
      "Document who owns each one.",
      "Reassign instead of discarding.",
      "Introduce new owners to customers.",
    ],
    faq: [
      { question: "Can reps text from personal phones?", answer: "It is better to use business numbers so conversations stay in your system and your records stay complete." },
      { question: "What about registered campaigns?", answer: "Numbers must be associated with an approved campaign before sending at volume. Keep that mapping documented." },
    ],
    relatedSlugs: ["shared-vs-dedicated-numbers-per-rep", "local-area-code-numbers-for-texting", "training-new-reps-on-texting"],
    relatedPages: [{ href: "/sales-team-texting-crm", label: "Sales team texting CRM" }],
  },
  {
    slug: "customer-testimonial-request-texts",
    metaTitle: "Asking Customers for Testimonials by Text | Text2Sale",
    title: "Asking customers for testimonials by text",
    description: "When and how to ask a happy customer for a testimonial or case study by text, and how to make saying yes effortless.",
    excerpt: "A good testimonial starts with a good moment and an easy ask. Here is how to request one without being awkward.",
    tags: ["Retention", "Customer service", "Scripts"],
    intro: [
      "Testimonials help future customers trust you, and satisfied customers are often glad to share. The trick is asking at the right time and making it easy.",
      "Here is how to do it by text.",
    ],
    sections: [
      {
        heading: "Pick the moment",
        paragraphs: [
          "Ask right after something goes well: a completed project, a resolved problem or a compliment. Example: Thanks for the kind words, Jordan. Would you be open to letting us share them as a short testimonial?",
        ],
      },
      {
        heading: "Make yes easy",
        paragraphs: [
          "Offer options: reply with a sentence, answer two quick questions, or have a draft ready to approve. People are more likely to agree when the work is small.",
        ],
        bullets: [
          "Ask permission to use their name.",
          "Offer a draft they can edit.",
          "Say thank you either way.",
        ],
      },
      {
        heading: "Respect their answer",
        paragraphs: [
          "Never publish without clear permission, and never pressure anyone. Keep the written approval in the contact record.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Follow up on testimonials the right way. When a customer agrees, thank them quickly and show them exactly how their words will appear, including their name and any photo, before you publish anything. Keep a record of the approval in the contact record, with the date and the version they saw. If they later ask you to remove it, do so promptly and without argument. Rotate where you use testimonials, such as your website, proposals and social posts, and keep them honest and unedited apart from small fixes for clarity. Real, specific stories about real results are more persuasive than a long list of generic praise.",
        ],
      },
    ],
    keyTakeaways: [
      "Ask right after a good experience.",
      "Make replying quick.",
      "Get explicit permission to publish.",
      "Thank them regardless.",
    ],
    faq: [
      { question: "Is it okay to offer something in return?", answer: "Be careful. Incentives for reviews can break platform rules and disclosure requirements. Check them first." },
      { question: "Where should I store approvals?", answer: "In the contact record, so you can show when and how permission was given." },
    ],
    relatedSlugs: ["google-review-requests-for-local-businesses", "insurance-referral-request-texts", "vip-customer-lists-and-loyalty-texts"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "expiring-quote-reminder-texts",
    metaTitle: "Reminder Texts for Expiring Quotes and Offers | Text2Sale",
    title: "Reminder texts for expiring quotes and offers",
    description: "How to remind prospects about a quote or offer that is about to expire, honestly and without false urgency.",
    excerpt: "A real deadline deserves a reminder. A fake one costs you trust. Here is how to tell the difference.",
    tags: ["Scripts", "SMS follow-up", "Campaigns"],
    intro: [
      "Quotes, rates and promotions often have genuine expiration dates. A reminder helps people who meant to act and forgot.",
      "Use the reminder honestly and the results tend to follow.",
    ],
    sections: [
      {
        heading: "Only real deadlines",
        paragraphs: [
          "Mention an expiration only when it is true. Invented urgency may work once and then damages your reputation. If the quote really is valid until a date, state that date plainly.",
        ],
      },
      {
        heading: "A simple schedule",
        paragraphs: [
          "Send one reminder a few days before expiration and, if appropriate, one on the last day. Each should offer help, not pressure.",
        ],
        bullets: [
          "State the date.",
          "Offer to answer questions.",
          "Make the next step simple.",
        ],
      },
      {
        heading: "After it expires",
        paragraphs: [
          "If the offer lapses, tell them and say how to get a refreshed quote. Many sales happen on the second attempt.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Track which reminders actually lead to action. Tag contacts who received an expiration reminder and compare their booking rate with similar contacts who did not. If the reminder makes little difference, drop the second one and keep the contact experience lighter. If it helps, test the wording: a plain statement of the date often beats clever phrasing. Also make sure your quote records show the true expiration date, so the reminder you send never contradicts the paperwork. When a reminder is wrong, correct it quickly and apologize in one line. Accuracy is the whole point of a deadline message, and customers remember when a business gets it right.",
        ],
      },
    ],
    keyTakeaways: [
      "Mention only genuine deadlines.",
      "Send one or two reminders.",
      "Offer help, not pressure.",
      "Provide a path to renew after expiry.",
    ],
    faq: [
      { question: "Can I extend a quote?", answer: "If you can honor it, yes, and say so. Be consistent so people can trust your dates." },
      { question: "Do reminders need consent?", answer: "Yes. Only send to people who agreed to receive texts about that topic." },
    ],
    relatedSlugs: ["insurance-policy-review-texts", "post-demo-recap-texts", "sms-objection-handling-scripts"],
    relatedPages: [{ href: "/sms-follow-up-for-sales-teams", label: "SMS follow-up for sales teams" }],
  },
  {
    slug: "event-rsvp-and-confirmation-texts",
    metaTitle: "RSVP and Confirmation Texts for Events | Text2Sale",
    title: "RSVP and confirmation texts that fill the room",
    description: "How to use texts to collect RSVPs, confirm attendance and remind guests, with a timeline and sample wording.",
    excerpt: "Texting turns a guess about attendance into a firm list. A short sequence before an event does most of the work.",
    tags: ["Appointments", "Campaigns", "Automation"],
    intro: [
      "Open rates for texts make them well suited to RSVPs and event reminders. A simple sequence helps you plan seating, food and staffing with confidence.",
      "Here is a timeline you can adapt.",
    ],
    sections: [
      {
        heading: "The sequence",
        paragraphs: [
          "Send an invitation with a clear reply option, a confirmation when someone replies, a reminder a few days out and a final note the day before or morning of.",
        ],
        bullets: [
          "Invitation: date, place and how to reply.",
          "Confirmation: thank them and restate details.",
          "Reminder: parking, time, what to bring.",
          "Day-of: a short note with the address.",
        ],
      },
      {
        heading: "Make replies simple",
        paragraphs: [
          "Ask for a single word, like YES or NO. Handle common variations and route anything unclear to a person.",
        ],
      },
      {
        heading: "Follow up afterward",
        paragraphs: [
          "Send a short thank-you to attendees and a helpful note to those who missed it. Both keep the relationship moving.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Plan for the messy replies. Some guests will answer maybe, some will ask a question and some will reply from a different number. Decide ahead of time who handles these and how quickly. Keep a running count of confirmed, declined and unanswered guests, and send a gentle second invitation to the unanswered group a few days before the event. If capacity is limited, say so up front and tell guests what happens when you are full, such as a waitlist. After the event, record who attended so your next invitation can be more targeted and your reminders can be lighter for people who always show up.",
        ],
      },
    ],
    keyTakeaways: [
      "Use a short invite, confirm, remind sequence.",
      "Ask for one-word replies.",
      "Include practical details in reminders.",
      "Follow up with attendees and no-shows.",
    ],
    faq: [
      { question: "How far ahead should I send the invitation?", answer: "It depends on the event. Give people enough time to plan without so much that they forget." },
      { question: "Should I text everyone on my list?", answer: "Only people who agreed to receive texts about events from you." },
    ],
    relatedSlugs: ["webinar-and-event-reminder-texts", "appointment-reminder-text-templates", "trade-show-lead-follow-up-texts"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "reading-sms-delivery-errors",
    metaTitle: "How to Read SMS Delivery Errors and Fix Them | Text2Sale",
    title: "How to read SMS delivery errors and what to do about each",
    description: "A plain-language guide to common reasons texts fail to deliver, from invalid numbers to carrier filtering, and the first fix to try.",
    excerpt: "A failed text always has a reason. Learn the common categories and you can usually fix the problem in minutes.",
    tags: ["Deliverability", "Operations", "SMS"],
    intro: [
      "When a text does not arrive, the delivery report usually says why, but the wording can be cryptic. Most failures fall into a few categories.",
      "Here is how to read them and what to try first.",
    ],
    sections: [
      {
        heading: "Number problems",
        paragraphs: [
          "Invalid, disconnected and landline numbers cannot receive texts. Clean your list before importing and remove numbers that fail repeatedly. Do not keep retrying a number that is permanently unreachable.",
        ],
      },
      {
        heading: "Content and filtering",
        paragraphs: [
          "Carriers filter messages that look like spam. Triggers include unregistered traffic, suspicious links, repetitive identical content and prohibited subject matter.",
        ],
        bullets: [
          "Confirm your campaign registration is approved.",
          "Avoid public link shorteners.",
          "Vary and personalize your wording.",
        ],
      },
      {
        heading: "Account and rate issues",
        paragraphs: [
          "Insufficient balance, sending too fast for your throughput tier or a suspended number can also block delivery. Check your balance and send rate, then contact support with a few example message IDs if the problem continues.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Build a short troubleshooting routine your team can follow. First check whether the failure is limited to certain numbers, certain carriers or all messages. Then look at what changed recently, including content, links, list sources and sending speed. Review the opt-out and complaint rates for the affected campaign, because high rates predict filtering. Keep a simple log of incidents and fixes so the next occurrence is solved faster. If you manage several campaigns, compare their delivery rates side by side to spot outliers early. Catching a drop in the first day is much easier than untangling it after weeks of poor performance.",
        ],
      },
    ],
    keyTakeaways: [
      "Group failures by cause before acting.",
      "Clean lists and remove dead numbers.",
      "Confirm registration and avoid spammy content.",
      "Check balance and sending rate.",
    ],
    faq: [
      { question: "Should I retry a failed message?", answer: "Only if the cause is temporary. Permanent failures should be removed from your list." },
      { question: "What should I give support?", answer: "Message IDs, timestamps, the destination numbers and the error text." },
    ],
    relatedSlugs: ["why-are-my-texts-not-delivering", "business-texting-number-deliverability", "cleaning-phone-numbers-before-import"],
    relatedPages: [{ href: "/10dlc-compliant-texting", label: "10DLC-compliant texting" }],
  },
  {
    slug: "spam-filter-triggers-in-business-texts",
    metaTitle: "What Triggers Spam Filters in Business Texts | Text2Sale",
    title: "What triggers spam filters in business texts",
    description: "Common content and behavior patterns that cause carriers to filter business messages, and how to avoid them.",
    excerpt: "Filters judge both what you say and how you send. Avoid the common triggers and your messages arrive more reliably.",
    tags: ["Deliverability", "Compliance", "SMS"],
    intro: [
      "Carriers use automated filters to protect subscribers from unwanted messages. Legitimate businesses sometimes get caught when their messages look like the spam those filters target.",
      "Knowing the common triggers makes them easy to avoid.",
    ],
    sections: [
      {
        heading: "Content patterns",
        paragraphs: [
          "Messages with all capital letters, many exclamation points, vague urgency, unexplained links or prohibited topics can be filtered. Public link shorteners are a frequent culprit because they hide the real destination.",
        ],
      },
      {
        heading: "Sending behavior",
        paragraphs: [
          "Sudden spikes in volume, sending to many invalid numbers and high opt-out or complaint rates all hurt your reputation.",
        ],
        bullets: [
          "Ramp up volume gradually.",
          "Clean lists before sending.",
          "Honor opt-outs immediately.",
        ],
      },
      {
        heading: "Registration matters",
        paragraphs: [
          "Traffic from an approved, correctly described campaign is treated far better than unregistered traffic. Keep your registration accurate and current.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Treat filtering as a signal to investigate, not a mystery to endure. When delivery drops, compare what changed: new copy, a new link, a larger batch, a fresh list or a different sending number. Pause the campaign, send small test messages and change one variable at a time until the problem disappears. Keep a log of what worked so the next campaign starts from a safe baseline. Ask the people who were affected whether they received the message, because a short reply can confirm whether filtering is real. If problems persist after you have cleaned your content and lists, contact your provider with message IDs and timestamps so they can look at the carrier-side details.",
        ],
      },
    ],
    keyTakeaways: [
      "Write clearly and avoid shouting.",
      "Use your own branded links, not public shorteners.",
      "Increase volume gradually and keep lists clean.",
      "Send only through approved campaigns.",
    ],
    faq: [
      { question: "Can I test for filtering?", answer: "Send small batches to your own devices on different carriers and watch delivery reports." },
      { question: "Does personalization help?", answer: "Yes. Messages that differ and mention the recipient look more like genuine conversation." },
    ],
    relatedSlugs: ["shaft-content-rules-sms", "links-in-business-texts", "reading-sms-delivery-errors"],
    relatedPages: [{ href: "/10dlc-compliant-texting", label: "10DLC-compliant texting" }],
  },
  {
    slug: "sms-preference-center-and-frequency-choices",
    metaTitle: "Letting Subscribers Choose Their Text Frequency | Text2Sale",
    title: "Letting subscribers choose how often and what you text them",
    description: "How a simple preference option reduces opt-outs by letting subscribers pick topics and frequency instead of leaving entirely.",
    excerpt: "Some people want fewer texts, not none. Giving them a choice keeps relationships you would otherwise lose.",
    tags: ["Retention", "SMS marketing", "Strategy"],
    intro: [
      "When subscribers feel over-messaged, their only option is often STOP. Offering a lighter alternative can keep them on your list and happy.",
      "Here is how to build preferences into a texting program.",
    ],
    sections: [
      {
        heading: "Offer a simple choice",
        paragraphs: [
          "Let subscribers pick topics, such as appointment reminders only, or a lower frequency, such as monthly. Collect the choice by keyword or a short web form.",
        ],
      },
      {
        heading: "Honor it consistently",
        paragraphs: [
          "Record each preference on the contact and make campaigns respect it. A preference that is ignored is worse than none.",
        ],
        bullets: [
          "Use tags or fields for each topic.",
          "Exclude contacts who chose a lower frequency from extra sends.",
          "Review preferences when planning campaigns.",
        ],
      },
      {
        heading: "Keep STOP working",
        paragraphs: [
          "Preferences supplement STOP, never replace it. Any message can still be answered with STOP and must be honored immediately.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Measure whether preferences are working. Compare opt-out rates before and after you introduce the choice, and watch engagement among people who picked a lighter schedule. If many subscribers choose the lowest frequency, your default may be too high, and that is useful feedback. Make the option easy to find by mentioning it in the welcome message or at the bottom of a campaign now and then, without cluttering every text. Keep the wording friendly: offering to send fewer messages is a service, not an admission of failure. And make sure your team can see each person's preference in the contact record, so nobody overrides a choice a customer deliberately made.",
        ],
      },
    ],
    keyTakeaways: [
      "Offer topic and frequency choices.",
      "Store and respect each preference.",
      "Never replace STOP with preferences.",
      "Review preferences before every campaign.",
    ],
    faq: [
      { question: "Will offering choices reduce my reach?", answer: "It may reduce volume to some people but typically preserves relationships and improves engagement." },
      { question: "How do people change preferences?", answer: "By replying with a keyword or using a link to a short form on your website." },
    ],
    relatedSlugs: ["how-to-reduce-sms-opt-outs", "sms-frequency-best-practices", "sms-list-segmentation"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "honoring-opt-outs-across-channels",
    metaTitle: "Honoring Opt-Outs Across Text, Phone and Email | Text2Sale",
    title: "Honoring opt-outs across text, phone and email",
    description: "What to do when someone says stop on one channel, how to record it everywhere, and how to prevent contacting them by mistake.",
    excerpt: "People do not distinguish between your channels. A request to stop should be recorded and respected everywhere it applies.",
    tags: ["Compliance", "Operations", "Customer service"],
    intro: [
      "A person who tells your salesperson to stop calling may not realize you also have their number in a text campaign. Good practice is to record the request centrally and apply it where it makes sense.",
      "Here is how to build that habit.",
    ],
    sections: [
      {
        heading: "One place for the truth",
        paragraphs: [
          "Mark the contact record with a do-not-contact status and note which channels and when. Every campaign and dialer list should exclude flagged contacts automatically.",
        ],
      },
      {
        heading: "Interpret requests sensibly",
        paragraphs: [
          "If someone asks you to stop contacting them without specifying a channel, treat it broadly. If they only opt out of texts, you may still have a basis to call about an existing relationship, but when in doubt, ask or stay silent.",
        ],
        bullets: [
          "Record who, when, how and what was said.",
          "Apply the request to all relevant lists.",
          "Do not re-add the contact through a later import.",
        ],
      },
      {
        heading: "Train your team",
        paragraphs: [
          "Make sure every rep knows how to flag a contact and why it matters. A short written policy and a quick onboarding example prevent most mistakes.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Audit your process periodically by following one test contact through every system. Mark them do-not-contact in one place and verify that they disappear from text campaigns, dialer queues and email lists. Fix any gap you find, whether that is a sync delay, a separate spreadsheet or an old import. Pay special attention after migrations, new integrations and vendor changes, because those are the moments when suppression data tends to get lost. Keep a simple incident procedure for the day someone is contacted by mistake: apologize, confirm the suppression, and find the cause. Honoring requests consistently is the best protection you have, and it is also simply respectful.",
        ],
      },
    ],
    keyTakeaways: [
      "Record opt-outs centrally with details.",
      "Apply requests across relevant lists.",
      "Prevent re-adding through imports.",
      "Train every rep on the process.",
    ],
    faq: [
      { question: "How long should I keep opt-out records?", answer: "Keep them as long as you might otherwise contact the person. They are protection for both sides." },
      { question: "What if a contact re-subscribes?", answer: "Record the new, documented consent and keep the history of the earlier opt-out." },
    ],
    relatedSlugs: ["do-not-call-registry-and-business-texting", "sms-opt-out-keywords-stop-help-start", "crm-migration-optout-suppression-checklist"],
    relatedPages: [{ href: "/10dlc-compliant-texting", label: "10DLC-compliant texting" }],
  },
  {
    slug: "writing-an-sms-compliance-policy-for-your-team",
    metaTitle: "Writing a One-Page SMS Compliance Policy | Text2Sale",
    title: "Writing a one-page SMS compliance policy for your team",
    description: "What to include in a short internal policy for business texting, so everyone follows the same rules on consent, timing and opt-outs.",
    excerpt: "A one-page policy turns good intentions into habits. Here is what belongs on it.",
    tags: ["Compliance", "Operations", "Sales teams"],
    intro: [
      "Compliance problems rarely come from bad intent. They come from people who were never told the rules. A short written policy fixes that.",
      "Here is what to put on one page.",
    ],
    sections: [
      {
        heading: "The essentials",
        paragraphs: [
          "Cover who you may text, when, what you may say and what to do when someone opts out.",
        ],
        bullets: [
          "Only text people who gave consent for that purpose.",
          "Send within allowed local hours.",
          "Identify the business in messages.",
          "Honor STOP immediately.",
          "Never text restricted content.",
        ],
      },
      {
        heading: "Assign responsibility",
        paragraphs: [
          "Name a person who answers questions and reviews campaigns before launch. People follow rules more reliably when they know whom to ask.",
        ],
      },
      {
        heading: "Review and refresh",
        paragraphs: [
          "Revisit the policy at least once a year and whenever regulations or your program change. Have new hires read and acknowledge it. This is general guidance, so consult a qualified attorney for your specific situation.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Make the policy something people will actually read. Use short sentences, concrete examples and a quick checklist reps can scan before launching a campaign. Include a section on what to do when something goes wrong, such as texting someone after they opted out or sending to a wrong list, so people report problems early instead of hiding them. Store the policy where the team already works and link to it from your onboarding materials. When you update it, tell people what changed and why. A policy that is easy to find, easy to read and easy to follow is far more valuable than a long document no one opens.",
        ],
      },
    ],
    keyTakeaways: [
      "Keep the policy to one page.",
      "Cover consent, timing, content and opt-outs.",
      "Name an owner for questions.",
      "Review it yearly and consult counsel.",
    ],
    faq: [
      { question: "Do small teams need a policy?", answer: "Yes. A short document is easy to write and helps even a team of two stay consistent." },
      { question: "Is this legal advice?", answer: "No. It is general information. Ask a qualified attorney about your specific obligations." },
    ],
    relatedSlugs: ["tcpa-compliance-texting-leads", "quiet-hours-and-texting-time-rules", "training-new-reps-on-texting"],
    relatedPages: [{ href: "/10dlc-compliant-texting", label: "10DLC-compliant texting" }],
  },
  {
    slug: "onboarding-a-new-agent-to-the-crm-inbox",
    metaTitle: "Onboarding a New Agent to the CRM Inbox | Text2Sale",
    title: "Onboarding a new agent to the shared CRM inbox",
    description: "A first-week checklist for new reps joining a texting CRM, covering accounts, numbers, scripts, compliance and shadowing.",
    excerpt: "A structured first week gets a new rep productive and compliant faster. Here is a checklist you can copy.",
    tags: ["Sales teams", "Operations", "Getting started"],
    intro: [
      "New reps learn fastest when the first week has a clear plan. For a texting-first team, that plan should cover tools, rules and live practice.",
      "Use this checklist as a starting point.",
    ],
    sections: [
      {
        heading: "Day one: access and rules",
        paragraphs: [
          "Set up the account, assign a number and walk through the compliance policy. Make sure the new rep understands consent, quiet hours and how to handle STOP before sending anything.",
        ],
      },
      {
        heading: "Days two and three: learn by watching",
        paragraphs: [
          "Have the new rep read strong past conversations and shadow a colleague. Review saved replies and your follow-up cadence.",
        ],
        bullets: [
          "Read ten good conversations.",
          "Practice with test contacts.",
          "Learn the pipeline stages and tags.",
        ],
      },
      {
        heading: "Days four and five: supervised sending",
        paragraphs: [
          "Let the rep send real messages with a manager reviewing a sample. Give quick, specific feedback and end the week with a short review of what to improve.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Pair the checklist with a short written guide that new reps can return to when something comes up. Include how to find a conversation, how to apply a tag, how to schedule a message, what to do when someone says stop and whom to ask for help. Ask each new rep for feedback at the end of the first week: what was confusing, what was missing and what they wish they had known on day one. Update the guide with their answers while the experience is fresh. Over time, onboarding becomes faster and more consistent, and the questions that used to interrupt your best reps are answered before anyone has to ask.",
        ],
      },
    ],
    keyTakeaways: [
      "Cover compliance before the first send.",
      "Learn from real conversations.",
      "Practice with test contacts.",
      "Review the first week together.",
    ],
    faq: [
      { question: "How long until a new rep works independently?", answer: "Many teams allow independent sending after the first week, with periodic reviews afterward." },
      { question: "Who should supervise?", answer: "A manager or experienced rep who can give timely feedback." },
    ],
    relatedSlugs: ["training-new-reps-on-texting", "first-30-days-with-a-texting-crm", "weekly-texting-review-meeting"],
    relatedPages: [{ href: "/sales-team-texting-crm", label: "Sales team texting CRM" }],
  },
  {
    slug: "daily-routine-for-a-texting-first-sales-rep",
    metaTitle: "A Daily Routine for a Texting-First Sales Rep | Text2Sale",
    title: "A daily routine for a texting-first sales rep",
    description: "A practical hour-by-hour structure for working new leads, replies and follow-ups so nothing slips through.",
    excerpt: "Good days are built from a repeatable order of work. Here is a routine that puts hot conversations first.",
    tags: ["Sales teams", "Operations", "Speed to lead"],
    intro: [
      "A rep's day can disappear into scrolling and reacting. A simple routine makes sure the most valuable work gets done first.",
      "Adapt this one to your team.",
    ],
    sections: [
      {
        heading: "Start with replies and new leads",
        paragraphs: [
          "Open the inbox and answer unread replies first, then contact new leads. These are the people most likely to convert, and speed matters.",
        ],
      },
      {
        heading: "Block time for calls and follow-up",
        paragraphs: [
          "Schedule focused blocks for calling, working your follow-up list and preparing for appointments. Try not to mix all of them together.",
        ],
        bullets: [
          "Morning: replies, new leads and scheduled calls.",
          "Midday: power dialing and follow-ups.",
          "Afternoon: appointments, proposals and notes.",
        ],
      },
      {
        heading: "Close the day",
        paragraphs: [
          "Spend ten minutes updating outcomes, setting tomorrow's follow-ups and clearing the inbox. You will start the next day calmer and faster.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "A routine only works if it survives a busy day, so build in slack. Keep the first block short and protected, and let the later blocks flex when an appointment runs long or a hot lead appears. Turn off notifications that are not urgent during focus blocks, but keep alerts on for replies from people who are actively in a conversation with you. At the end of each week, look back at which hours produced the most appointments and shift your calls and follow-ups toward them. Managers can share the best versions of the routine with new reps, because a good example is easier to copy than a rule is to follow.",
        ],
      },
    ],
    keyTakeaways: [
      "Replies and new leads come first.",
      "Use blocks for calling and follow-up.",
      "Record outcomes as you go.",
      "End the day by planning the next.",
    ],
    faq: [
      { question: "How often should I check the inbox?", answer: "Frequently enough to respond quickly, but protect focus blocks with notifications limited to hot replies." },
      { question: "What if volume is too high?", answer: "Prioritize by lead temperature and consider automation for first replies." },
    ],
    relatedSlugs: ["lead-temperature-who-to-call-first", "power-dialer-back-to-back-leads", "end-of-day-pipeline-review-checklist"],
    relatedPages: [{ href: "/sales-team-texting-crm", label: "Sales team texting CRM" }],
  },
  {
    slug: "end-of-day-pipeline-review-checklist",
    metaTitle: "An End-of-Day Pipeline Review Checklist | Text2Sale",
    title: "An end-of-day pipeline review checklist for reps and managers",
    description: "A ten-minute checklist for closing out the day: unanswered messages, appointments, follow-ups and notes.",
    excerpt: "Ten minutes at the end of the day prevents the missed follow-ups that cost the most.",
    tags: ["Operations", "Sales teams", "Lead management"],
    intro: [
      "Most lost deals are not rejected; they are forgotten. A short end-of-day review catches the loose ends before they cool.",
      "Use this checklist as is or trim it to fit.",
    ],
    sections: [
      {
        heading: "Clear the inbox",
        paragraphs: [
          "Look for unread messages and conversations where the last word was theirs. Reply, or set a specific time to reply, so nothing sits overnight.",
        ],
      },
      {
        heading: "Check the calendar and pipeline",
        paragraphs: [
          "Confirm tomorrow's appointments and send reminders where needed. Scan each stage for contacts with no next step.",
        ],
        bullets: [
          "Every active contact has a next action and date.",
          "Outcomes are tagged accurately.",
          "Do-not-contact requests are recorded.",
        ],
      },
      {
        heading: "Note what you learned",
        paragraphs: [
          "Jot down any objection, question or script that worked. These notes feed your saved replies and your weekly review.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Make the review a fixed habit rather than something you do when you remember. Put a recurring ten-minute block on your calendar at the same time every day, and treat it like a meeting with your future self. Managers can ask each rep to post one line when it is done, such as how many conversations are waiting and what tomorrow looks like. Over a few weeks the habit pays for itself: fewer stalled contacts, fewer apologetic late replies, and a clearer picture of which stages of your pipeline leak the most. If the checklist feels too long, cut it down to the three items you most often forget, and add the rest back only if you need them.",
        ],
      },
    ],
    keyTakeaways: [
      "Reply to or schedule every open conversation.",
      "Confirm tomorrow's appointments.",
      "Make sure each active contact has a next step.",
      "Capture lessons for the team.",
    ],
    faq: [
      { question: "Can managers use this too?", answer: "Yes. Managers can scan team-wide for stalled conversations and unassigned leads." },
      { question: "Should this be automated?", answer: "Parts can be: reminders and alerts for stalled contacts reduce manual checking." },
    ],
    relatedSlugs: ["daily-routine-for-a-texting-first-sales-rep", "weekly-texting-review-meeting", "closing-the-loop-with-lost-deals"],
    relatedPages: [{ href: "/sales-team-texting-crm", label: "Sales team texting CRM" }],
  },
  {
    slug: "text-based-referral-ask-scripts",
    metaTitle: "Asking for Referrals by Text: Scripts That Feel Natural | Text2Sale",
    title: "Asking for referrals by text: scripts that feel natural",
    description: "When to ask satisfied customers for referrals, how to phrase the request and how to thank people who send business your way.",
    excerpt: "Referrals come from happy customers who are asked at the right moment. These scripts keep the ask light.",
    tags: ["Retention", "Scripts", "Lead generation"],
    intro: [
      "Referrals are among the most valuable leads because they arrive with trust attached. Most customers are willing to help, but they rarely think to volunteer.",
      "A short, well-timed text can make the difference.",
    ],
    sections: [
      {
        heading: "Choose the right moment",
        paragraphs: [
          "Ask after a good outcome: a claim paid, a project finished, a problem solved. Example: Glad it worked out, Alex. If you know anyone who could use the same help, I would be happy to take care of them too.",
        ],
      },
      {
        heading: "Make it easy",
        paragraphs: [
          "Offer to be introduced by text or to send a link they can forward. Never ask for a list of names in one message.",
        ],
        bullets: [
          "Keep it to two sentences.",
          "Make it optional.",
          "Thank them whether or not they refer anyone.",
        ],
      },
      {
        heading: "Respect the referred person",
        paragraphs: [
          "Do not text a referred person unless they have agreed to hear from you. Ask the customer to introduce you, then get the new contact's own consent.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Remember that timing and gratitude drive results more than clever wording. Keep a list of customers who recently had a good outcome and review it weekly so you do not miss the moment. After a referral arrives, tell the customer what happened, thank them again and, if appropriate, share the outcome in general terms without exposing private details. Track referrals by source in your CRM so you can see which customers send the most business and treat them as the valuable partners they are. A referral program does not need to be complicated; it needs to be consistent, sincere and easy to join.",
        ],
      },
    ],
    keyTakeaways: [
      "Ask after a clear success.",
      "Keep the request short and optional.",
      "Thank every customer.",
      "Get consent from the referred person.",
    ],
    faq: [
      { question: "Can I text a number a customer gives me?", answer: "Only if the person agreed to hear from you. A customer's permission is not the same as theirs." },
      { question: "Should I offer rewards?", answer: "Check the rules for your industry first, since some limit referral incentives." },
    ],
    relatedSlugs: ["referral-programs-by-text-local-business", "insurance-referral-request-texts", "customer-testimonial-request-texts"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "ai-assistant-rules-for-pricing-questions",
    metaTitle: "Setting Rules for an AI Assistant on Pricing Questions | Text2Sale",
    title: "Setting rules for an AI assistant on pricing questions",
    description: "How to decide what an AI texting assistant may say about price, when it should hand off to a person and how to test its answers.",
    excerpt: "Pricing is where a wrong answer costs the most. Give your AI assistant clear limits and a quick handoff.",
    tags: ["AI", "Sales teams", "Automation"],
    intro: [
      "An AI assistant can answer questions at any hour, but pricing needs special care. A confident wrong number can create disputes and lost trust.",
      "Decide in advance what the assistant may say and when a person takes over.",
    ],
    sections: [
      {
        heading: "Decide what it may share",
        paragraphs: [
          "Publicly listed prices and general ranges can usually be shared if you keep the information accurate. Anything that depends on personal details or negotiation should go to a person.",
        ],
        bullets: [
          "List the prices that are safe to state.",
          "Say clearly that final quotes come from a person.",
          "Never let it promise discounts or guarantees.",
        ],
      },
      {
        heading: "Set handoff triggers",
        paragraphs: [
          "Hand off when someone asks for a firm quote, mentions a competitor's price or pushes back on cost. A human can read the situation and respond to it.",
        ],
      },
      {
        heading: "Test with real questions",
        paragraphs: [
          "Run a batch of realistic pricing questions through the assistant before launch and again after any change. Check that it stays within bounds and hands off correctly.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Write the pricing rules in plain language and keep them with your other assistant instructions so anyone can review them. Include examples of what the assistant may say and what it must not, and update them whenever your prices or policies change. Review conversations where pricing came up and check whether the handoff happened at the right moment. If you notice customers frustrated by too many handoffs, expand the information the assistant may share. If you notice errors, narrow it. The right boundary is the one that keeps customers well informed without ever putting a number in writing that your business is unable to honor.",
        ],
      },
    ],
    keyTakeaways: [
      "Limit the assistant to approved price information.",
      "Hand off for quotes and negotiation.",
      "Forbid promises and guarantees.",
      "Test before launch and after changes.",
    ],
    faq: [
      { question: "Should the assistant mention it is automated?", answer: "Being transparent is a good practice and may be required in some contexts. Check the rules that apply to you." },
      { question: "Who reviews its answers?", answer: "A manager should review a sample of conversations regularly, especially in the first weeks." },
    ],
    relatedSlugs: ["test-ai-sales-assistant-before-launch", "ai-texting-human-takeover-workflow", "writing-instructions-for-an-ai-appointment-setter"],
    relatedPages: [{ href: "/ai-texting-crm", label: "AI texting CRM" }],
  },
  {
    slug: "writing-a-faq-knowledge-base-for-your-ai-assistant",
    metaTitle: "Writing a FAQ Knowledge Base for Your AI Assistant | Text2Sale",
    title: "Writing a FAQ knowledge base for your AI texting assistant",
    description: "How to collect real customer questions and write clear answers that keep an AI assistant accurate, on brand and honest about what it does not know.",
    excerpt: "An AI assistant is only as good as the answers behind it. Build them from real questions and keep them current.",
    tags: ["AI", "Customer service", "Operations"],
    intro: [
      "An AI assistant works from the information you give it. Vague or outdated notes produce vague or wrong replies, while clear answers produce consistent ones.",
      "Here is how to build a knowledge base that works.",
    ],
    sections: [
      {
        heading: "Collect real questions",
        paragraphs: [
          "Pull the questions customers actually ask from recent texts, calls and emails. Group them by topic: services, hours, location, pricing, process and policies.",
        ],
      },
      {
        heading: "Write short, direct answers",
        paragraphs: [
          "Answer each question in plain language, in your brand's voice, in a few sentences. Include the facts that change often, such as hours and prices, in one place so they are easy to update.",
        ],
        bullets: [
          "One question, one answer.",
          "Say what you do not offer.",
          "State when to hand off to a person.",
        ],
      },
      {
        heading: "Maintain it",
        paragraphs: [
          "Review the knowledge base monthly and whenever something changes. When the assistant hands off or gives a weak answer, add or fix the entry so it improves over time.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Treat the first version as a draft and expect to edit it. Read real conversations during the first weeks and note every time the assistant hedges, repeats itself or gives an answer you would not have given. Fix the knowledge base, not just the single reply. Add a short section describing your tone, for example friendly and concise, and the things the assistant should never do, such as giving legal or medical advice. Keep a change log so you can tell which edit improved or harmed results. With steady attention for a month or two, the assistant becomes noticeably more accurate and more like your own team.",
        ],
      },
    ],
    keyTakeaways: [
      "Base answers on real customer questions.",
      "Keep them short, direct and current.",
      "Define what to hand off.",
      "Improve entries from weak conversations.",
    ],
    faq: [
      { question: "How many entries do I need?", answer: "Start with the twenty or so most common questions and grow from there." },
      { question: "What if the assistant does not know?", answer: "It should say so honestly and offer to connect the person with someone who can help." },
    ],
    relatedSlugs: ["sms-reply-templates-for-common-questions", "ai-sms-replies-for-sales", "reviewing-ai-receptionist-call-summaries"],
    relatedPages: [{ href: "/ai-texting-crm", label: "AI texting CRM" }],
  },
  {
    slug: "texting-leads-on-weekends-and-holidays",
    metaTitle: "Texting Leads on Weekends and Holidays | Text2Sale",
    title: "Texting leads on weekends and holidays: when it helps and when it hurts",
    description: "How to handle leads who arrive on weekends and holidays, which messages are welcome, and how to stay within quiet hours.",
    excerpt: "Leads do not stop arriving on Saturday. A thoughtful weekend plan captures them without being intrusive.",
    tags: ["Speed to lead", "Operations", "Compliance"],
    intro: [
      "Many people shop and request quotes on weekends and holidays. If you wait until Monday, someone else may reach them first.",
      "At the same time, personal time deserves respect. Here is how to balance both.",
    ],
    sections: [
      {
        heading: "Acknowledge quickly",
        paragraphs: [
          "An automatic first reply that confirms you received the request and says when to expect a person works well. It sets expectations and keeps the lead warm.",
        ],
      },
      {
        heading: "Stay within allowed hours",
        paragraphs: [
          "Keep messages within permitted local hours for the recipient, no matter the day. Use scheduling so messages that arrive late wait for the morning.",
        ],
        bullets: [
          "Use the contact's local time, not yours.",
          "Skip major holidays for promotions.",
          "Reserve weekend messages for requested or time-sensitive topics.",
        ],
      },
      {
        heading: "Have a Monday plan",
        paragraphs: [
          "Queue weekend leads for the first hour of Monday so each gets a personal follow-up. Include them in your morning routine and measure how they convert.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Test your weekend setup before you rely on it. Submit a test lead on a Saturday evening and watch what happens: does the automatic reply arrive, does it say when to expect a person and does a task land in someone's queue for Monday? Confirm that scheduled messages respect the contact's local time and that holiday exclusions are configured. Review weekend leads separately in your reports for a month to see whether the acknowledgment improves conversion. If a certain kind of lead is worth a prompt personal reply, such as a ready-to-buy request, consider a light on-call rotation, and make sure the person on call knows the rules for quiet hours.",
        ],
      },
    ],
    keyTakeaways: [
      "Acknowledge weekend leads right away.",
      "Respect local quiet hours every day.",
      "Avoid promotions on major holidays.",
      "Follow up personally the next business day.",
    ],
    faq: [
      { question: "Should I text on Sundays?", answer: "For requested follow-ups it can be fine. Promotions are best kept to days and times your audience expects." },
      { question: "How do I handle time zones?", answer: "Schedule by the contact's local time, using their area code or stored location as a guide." },
    ],
    relatedSlugs: ["quiet-hours-and-texting-time-rules", "send-windows-and-time-zones-by-contact", "after-hours-ai-appointment-booking"],
    relatedPages: [{ href: "/sms-follow-up-for-sales-teams", label: "SMS follow-up for sales teams" }],
  },
  {
    slug: "texting-customers-about-delays-and-changes",
    metaTitle: "Texting Customers About Delays and Schedule Changes | Text2Sale",
    title: "Texting customers about delays and schedule changes",
    description: "How to deliver bad news by text: tell people early, say what happened, offer a fix and keep the tone calm and accountable.",
    excerpt: "Customers forgive delays they hear about early. Silence is what damages trust, so tell them quickly and plainly.",
    tags: ["Customer service", "Retention", "Operations"],
    intro: [
      "Delays, cancellations and rescheduled appointments are part of running a business. How you communicate them matters more than the change itself.",
      "A short, honest text early beats a long apology after the fact.",
    ],
    sections: [
      {
        heading: "Tell them early",
        paragraphs: [
          "As soon as you know about a change, let the customer know. Give the new time or what happens next. Example: Hi Dana, this is Harbor Plumbing. Our tech is running about 45 minutes behind. New arrival is around 2:45. Reply if that does not work.",
        ],
      },
      {
        heading: "Be specific and accountable",
        paragraphs: [
          "State what changed and what you are doing about it, without excuses or blame. Offer an option, such as rescheduling, when it makes sense.",
        ],
        bullets: [
          "Say what changed.",
          "Give the new time.",
          "Offer a choice if possible.",
        ],
      },
      {
        heading: "Follow up afterward",
        paragraphs: [
          "After the service, check in briefly and thank them for their patience. A small gesture goes a long way, as long as it is genuine.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Prepare templates for the most common disruptions before they happen, such as running late, rescheduling and weather closures. Keep them short, calm and editable, and decide who is allowed to send them. When a problem affects many customers at once, send one clear message to the whole group rather than answering each person separately, and make sure someone is ready to handle replies. Afterward, note what caused the disruption and whether it could be prevented. Customers value consistency, and a business that handles bad news well often earns more loyalty than one that never has any.",
        ],
      },
    ],
    keyTakeaways: [
      "Notify customers as early as possible.",
      "Be specific and take responsibility.",
      "Offer a way to adjust.",
      "Follow up after the service.",
    ],
    faq: [
      { question: "Are service updates promotional?", answer: "Operational messages about an existing appointment are generally different from marketing, but they should still match what your campaign registration describes." },
      { question: "What if the customer is upset?", answer: "Respond personally and calmly. Consider a call if the situation is complicated." },
    ],
    relatedSlugs: ["field-service-on-my-way-texts", "appointment-reminder-text-templates", "handling-wrong-number-and-angry-replies"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "texting-checklist-before-hiring-a-sms-vendor",
    metaTitle: "Questions to Ask Before Choosing a Business Texting Vendor | Text2Sale",
    title: "Questions to ask before choosing a business texting vendor",
    description: "A practical list of questions about registration, pricing, support, data ownership and exit terms to ask any texting platform before you sign up.",
    excerpt: "The right questions up front prevent painful surprises later. Use this list on any vendor, including us.",
    tags: ["Getting started", "Strategy", "Operations"],
    intro: [
      "Choosing a texting platform affects your deliverability, your costs and your ability to leave. A few pointed questions reveal a lot.",
      "Bring this list to every demo and compare answers in writing.",
    ],
    sections: [
      {
        heading: "Compliance and registration",
        paragraphs: [
          "Ask how the platform helps with brand and campaign registration, what happens if a registration is rejected and who is responsible for consent records.",
        ],
        bullets: [
          "Who submits registrations, and what do I need to provide?",
          "How are opt-outs handled automatically?",
          "Can I export consent records?",
        ],
      },
      {
        heading: "Costs and limits",
        paragraphs: [
          "Get the complete picture of pricing: subscription, per-message rates, number fees, registration fees and any overage charges. Ask what happens when your balance or limits run out.",
        ],
      },
      {
        heading: "Support and exit",
        paragraphs: [
          "Ask how quickly support responds, whether you can export your contacts and conversations, and what notice or fees apply if you cancel. A vendor confident in its product answers these easily.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Turn the answers into a simple scorecard so the decision is not driven by whoever gave the best demo. List the five or six things that matter most to your business, rate each vendor on them and write down the evidence. Ask for a reference from a business like yours and ask that reference about support during problems, not just setup. Check recent reviews with a critical eye and look for patterns rather than single complaints. If possible, start with a small commitment and expand once the platform proves itself. A vendor relationship works best when expectations are written down and both sides know what happens if something goes wrong.",
        ],
      },
    ],
    keyTakeaways: [
      "Ask who handles registration and consent.",
      "Get the full cost structure in writing.",
      "Confirm you can export your data.",
      "Check support responsiveness before you commit.",
    ],
    faq: [
      { question: "Should I run a trial first?", answer: "Yes, if you can. Test with real workflows, including import, sending, opt-outs and reporting." },
      { question: "What matters most?", answer: "It depends on your business, but reliable delivery, clear compliance support and honest pricing are good places to start." },
    ],
    relatedSlugs: ["how-to-choose-an-sms-platform", "switching-sms-providers", "how-much-does-sms-marketing-cost"],
    relatedPages: [{ href: "/bulk-sms-software", label: "Bulk SMS software" }],
  },
];

export const BLOG_POSTS_7: BlogPost[] = ARTICLES.map((article) => {
  const text = [article.title, ...article.intro,
    ...article.sections.flatMap((section) => [section.heading, ...section.paragraphs, ...(section.bullets || [])]),
    ...article.keyTakeaways, ...article.faq.flatMap((item) => [item.question, item.answer])].join(" ");
  return { ...article, datePublished: "2026-10-07", dateModified: "2026-10-07",
    readMinutes: Math.max(1, Math.ceil(text.split(/\s+/).length / 200)) };
});
