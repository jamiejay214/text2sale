// ── Blog content ───────────────────────────────────────────────────────────
// Data-driven blog. Each post renders through components/BlogPostLayout.tsx
// (Article + FAQ + Breadcrumb JSON-LD) at /blog/<slug>, and every slug is
// pulled into the sitemap automatically (see app/sitemap.ts). To publish a new
// article, add an entry here — no new route files needed.

export type BlogSection = { heading: string; paragraphs: string[]; bullets?: string[] };
export type BlogFaq = { question: string; answer: string };

export type BlogPost = {
  slug: string;
  metaTitle: string;
  title: string;
  description: string;
  excerpt: string;
  datePublished: string; // ISO (YYYY-MM-DD)
  dateModified: string;
  readMinutes: number;
  tags: string[];
  intro: string[];
  sections: BlogSection[];
  keyTakeaways: string[];
  faq: BlogFaq[];
  relatedSlugs?: string[];
  relatedPages?: { href: string; label: string }[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-fast-to-text-insurance-leads",
    metaTitle: "How Fast Should You Text a New Insurance Lead? (Speed-to-Lead) | Text2Sale",
    title: "How fast should you text a new insurance lead?",
    description:
      "Speed-to-lead decides whether you reach an insurance lead or your competitor does. Here is the data on response windows and how to text every lead within 5 minutes automatically.",
    excerpt:
      "The single biggest predictor of whether you reach an insurance lead is how fast you respond. Here is the data — and how to hit a 5-minute window on every lead, automatically.",
    datePublished: "2026-05-12",
    dateModified: "2026-05-12",
    readMinutes: 6,
    tags: ["Speed to lead", "Insurance", "SMS follow-up"],
    intro: [
      "When a prospect fills out a form for an insurance quote, they are rarely filling out just one. Most lead forms feed several agents at once, which means the first agent to actually start a conversation usually wins the deal. The clock starts the moment the lead hits your CRM — and it runs fast.",
      "Texting is the fastest way to win that race. People open texts in seconds, not hours, and a short message feels far less intrusive than a cold call from an unknown number. The question is not whether to text new leads, but how quickly you can do it consistently.",
    ],
    sections: [
      {
        heading: "The 5-minute rule, and why it is so hard to hit manually",
        paragraphs: [
          "Across decades of inbound-sales research, the pattern is consistent: leads contacted within five minutes of opting in are far more likely to respond and convert than leads contacted even an hour later. Response rates fall off a cliff after the first 30 minutes and keep dropping every hour after that.",
          "The problem is that five minutes is almost impossible to hit by hand. You are on a call, at lunch, driving, or asleep when half your leads come in. By the time you see the notification and type out a message, the window has closed and three other agents have already messaged your prospect.",
        ],
      },
      {
        heading: "Automate the first touch, personalize the follow-up",
        paragraphs: [
          "The fix is to automate the very first message so it fires the instant a lead is imported — and keep it short and human so it still feels personal. A message like \"Hi [Name], this is [Agent] with [Agency] — I got your request about coverage, are you still looking?\" outperforms a long scripted pitch because it reads like a real person, not a blast.",
          "Once the conversation is open, you take over. The automation exists to win the speed race; the relationship and the close are still yours. The goal is simply to make sure no lead ever sits untouched while a competitor gets there first.",
        ],
        bullets: [
          "Fire the first text automatically on import or opt-in",
          "Keep the first message under 160 characters and conversational",
          "Use merge fields (first name, lead source) so it feels 1-to-1",
          "Route replies into a single inbox so nothing slips",
        ],
      },
      {
        heading: "Follow up more than you think you need to",
        paragraphs: [
          "Speed wins the first contact, but persistence wins the deal. Most agents quit after one or two messages, yet the majority of replies come on the third through fifth touch. A simple drip — day 1, day 3, day 5, day 7, and day 14 — recovers a large share of leads that would otherwise be written off as dead.",
          "Automating that cadence means aged leads keep getting worked even during your busiest weeks, without you having to remember who is due for a nudge.",
        ],
      },
    ],
    keyTakeaways: [
      "Leads texted within 5 minutes convert dramatically better than leads contacted an hour later.",
      "Five minutes is nearly impossible by hand — automate the first touch so it never gets missed.",
      "Keep the first message short, human, and personalized with merge fields.",
      "Most replies come on the 3rd–5th follow-up, so run a multi-touch drip, not a single text.",
    ],
    faq: [
      {
        question: "How fast should you contact a new insurance lead?",
        answer:
          "Aim to make first contact within five minutes of the lead opting in. Response and conversion rates are highest in that window and decline sharply after the first 30–60 minutes, largely because shared lead forms send the same prospect to multiple agents at once.",
      },
      {
        question: "Is it better to call or text a new insurance lead first?",
        answer:
          "Text first, then call. A short text gets opened in seconds and feels less intrusive than a cold call from an unknown number, so it is more likely to start a conversation. Once the lead replies, a call is a natural next step.",
      },
      {
        question: "How can I text every lead within 5 minutes if I am busy?",
        answer:
          "Use a texting CRM that fires the first message automatically the moment a lead is imported or opts in. Text2Sale lets you set an instant first-touch message plus an automated follow-up sequence, so every lead is contacted on time even when you are on a call or away.",
      },
    ],
    relatedSlugs: ["sms-drip-templates-for-insurance-agents", "tcpa-compliance-texting-leads"],
    relatedPages: [
      { href: "/how-to-text-insurance-leads", label: "How to text insurance leads" },
      { href: "/sms-crm-for-insurance-agents", label: "SMS CRM for insurance agents" },
    ],
  },

  {
    slug: "10dlc-registration-guide-for-agents",
    metaTitle: "10DLC Registration for Insurance Agents: A Plain-English Guide | Text2Sale",
    title: "10DLC registration for agents: a plain-English guide",
    description:
      "What 10DLC is, why your texts get filtered without it, and exactly what you need to register your business to send compliant SMS at scale — explained without the jargon.",
    excerpt:
      "If your business texts are getting filtered or undelivered, 10DLC is almost always why. Here is what it is and how to register, in plain English.",
    datePublished: "2026-05-19",
    dateModified: "2026-05-19",
    readMinutes: 7,
    tags: ["10DLC", "Compliance", "Deliverability"],
    intro: [
      "If you have ever sent a batch of texts and watched half of them quietly fail to land, you have met the carrier filtering system. In the US, business texting over standard 10-digit numbers runs through a registration framework called 10DLC — and skipping it is the number-one reason legitimate messages get blocked.",
      "The good news: 10DLC is not complicated once someone explains it without the acronyms. Here is the whole thing in plain English.",
    ],
    sections: [
      {
        heading: "What 10DLC actually means",
        paragraphs: [
          "10DLC stands for \"10-digit long code\" — in other words, a normal local phone number used to send application-to-person (business) texts. To cut down on spam, the major US carriers require every business sending texts over these numbers to register who they are and what they are sending. That registration is what we casually call \"10DLC.\"",
          "Registration happens in two layers: a brand (your business identity — legal name, EIN, address) and a campaign (the type of messages you send, like marketing or customer care, with sample messages and opt-in details). Carriers approve the brand and campaign, then your numbers are attached to that campaign.",
        ],
      },
      {
        heading: "Why unregistered texts get filtered",
        paragraphs: [
          "Carriers treat unregistered traffic as presumed spam. An unregistered number gets very low throughput, heavy filtering, and often outright blocking — and your messages may show as \"sent\" in your software while never reaching the recipient. That is the worst-case scenario, because you cannot tell what is happening.",
          "Registered traffic, by contrast, gets a trust score that unlocks higher daily volume and far better deliverability. For an agency texting hundreds or thousands of leads, the difference between registered and unregistered is the difference between a working channel and a silent one.",
        ],
      },
      {
        heading: "What you need to register",
        paragraphs: [
          "Brand registration verifies your business against federal records, so accuracy matters — the details you submit must match your IRS and state filings exactly. A single mismatched digit or suite number can leave a brand stuck as \"unverified.\"",
        ],
        bullets: [
          "Legal business name exactly as registered",
          "EIN (from your IRS CP-575 letter) — match it digit-for-digit",
          "Business address that matches your IRS records",
          "A working business website with a visible opt-in and privacy policy",
          "Sample messages and a description of what you send",
          "How subscribers opt in (your consent flow)",
        ],
      },
      {
        heading: "The opt-in and website piece people miss",
        paragraphs: [
          "Reviewers actually open your website. Your campaign needs a real opt-in page and a privacy policy that discloses message types, frequency, and how to opt out (reply STOP). If those pages do not exist or do not load, the campaign gets rejected — even if your brand is verified.",
          "This is why platforms built for agents generate a compliant opt-in and privacy page for you automatically. It removes the most common rejection reason before it happens.",
        ],
      },
    ],
    keyTakeaways: [
      "10DLC is the carrier registration that lets a normal phone number send business texts without being filtered.",
      "You register a brand (your business) and a campaign (your message type) — both must be approved.",
      "Brand details must match your IRS and state records exactly, or verification fails.",
      "A live opt-in page and privacy policy are required; reviewers actually check them.",
    ],
    faq: [
      {
        question: "Do I need 10DLC registration to text my leads?",
        answer:
          "Yes. In the US, sending business (application-to-person) texts over standard 10-digit numbers requires 10DLC registration. Without it, carriers heavily filter or block your messages, and they may appear sent on your end while never being delivered.",
      },
      {
        question: "How long does 10DLC registration take?",
        answer:
          "Brand verification is often quick, but external vetting and campaign approval can take anywhere from a day to a couple of weeks depending on your information and the carriers. Brand-new businesses sometimes take longer because federal records have not propagated yet.",
      },
      {
        question: "Why are my business texts not being delivered?",
        answer:
          "The most common cause is missing or incomplete 10DLC registration, or numbers that are not attached to an approved campaign. Mismatched EIN/business details and a missing opt-in page are also frequent culprits. A registered, vetted brand with a live opt-in page resolves the majority of delivery problems.",
      },
    ],
    relatedSlugs: ["tcpa-compliance-texting-leads", "import-and-text-thousands-of-leads"],
    relatedPages: [
      { href: "/10dlc-compliant-texting", label: "10DLC compliant texting" },
      { href: "/bulk-sms-software", label: "Bulk SMS software" },
    ],
  },

  {
    slug: "sms-drip-templates-for-insurance-agents",
    metaTitle: "9 SMS Drip Templates for Insurance Agents (Copy/Paste) | Text2Sale",
    title: "9 SMS drip templates for insurance agents",
    description:
      "Copy-and-paste SMS templates for insurance agents: first touch, follow-ups, quote reminders, open enrollment, and re-engagement — all short, compliant, and reply-friendly.",
    excerpt:
      "Proven, copy-paste SMS templates for every stage of the insurance follow-up — first touch through re-engagement. Short, human, and built to get replies.",
    datePublished: "2026-05-26",
    dateModified: "2026-05-26",
    readMinutes: 5,
    tags: ["Templates", "Insurance", "Drip campaigns"],
    intro: [
      "Good texts to leads share three traits: they are short, they sound like a person, and they make it easy to reply. Below are nine templates you can adapt for insurance follow-up. Replace the bracketed fields with merge tags in your texting CRM so each one sends personalized automatically.",
      "One rule before you copy anything: every message to a lead should be sent only to people who opted in, and your sequence should honor STOP instantly. Keep the tone helpful, not pushy — you are starting a conversation, not closing on the first line.",
    ],
    sections: [
      {
        heading: "First touch (send within 5 minutes)",
        paragraphs: [
          "The first message exists to get a reply, nothing more. Keep it to one line and ask an easy question.",
        ],
        bullets: [
          "Hi [First], this is [Agent] with [Agency] — I got your request about [coverage type]. Are you still looking for coverage?",
          "[First], it's [Agent] with [Agency]. Happy to help you compare plans — what's the main thing you're trying to sort out?",
        ],
      },
      {
        heading: "Follow-ups (days 3, 5, and 7)",
        paragraphs: [
          "Most replies come from follow-ups, so do not stop at one. Vary the angle each time — a question, a benefit, then a soft deadline.",
        ],
        bullets: [
          "Hi [First], just circling back on your coverage options. Want me to put together a quick quote?",
          "[First], a lot of folks I help are surprised how affordable the right plan is. Want me to check what you'd qualify for?",
          "Hi [First], I don't want you to miss out — are you still interested in reviewing your options this week?",
        ],
      },
      {
        heading: "Quote follow-up and open enrollment",
        paragraphs: [
          "When there is a quote on the table or a deadline approaching, urgency is legitimate — use it.",
        ],
        bullets: [
          "[First], I've got your quote ready. Do you have 10 minutes today or tomorrow to go over it?",
          "Hi [First], open enrollment closes soon. Want to lock in a plan before the deadline so you're covered?",
        ],
      },
      {
        heading: "Re-engagement (aged leads)",
        paragraphs: [
          "Old leads are not dead leads. A light, no-pressure check-in revives a surprising number of them.",
        ],
        bullets: [
          "Hi [First], it's [Agent]. We connected a while back about coverage — is now a better time to take a look?",
          "[First], reaching out one last time in case your situation changed. Want me to send over current options? Reply STOP to opt out anytime.",
        ],
      },
    ],
    keyTakeaways: [
      "Keep every message short, conversational, and easy to reply to.",
      "The first text should only aim for a reply — not a pitch or a close.",
      "Send 4–5 follow-ups with varied angles; most replies come after the first message.",
      "Use merge fields to personalize at scale and always honor STOP instantly.",
    ],
    faq: [
      {
        question: "What is a good first text to send an insurance lead?",
        answer:
          "Keep it to one short, human line that asks an easy question, such as: \"Hi [First], this is [Agent] with [Agency] — I got your request about coverage, are you still looking?\" Short, personal messages get far more replies than long scripted pitches.",
      },
      {
        question: "How many follow-up texts should an insurance drip campaign have?",
        answer:
          "Plan for at least four to five follow-ups spread over two to three weeks (for example days 1, 3, 5, 7, and 14). Most replies arrive on the third through fifth touch, so a single message leaves the majority of conversions on the table.",
      },
      {
        question: "Are these SMS templates TCPA compliant?",
        answer:
          "Templates themselves are just wording — compliance comes from how you use them. Only message contacts who gave express written consent, identify yourself and your business, honor STOP immediately, and send through a 10DLC-registered platform. Used that way, these templates fit a compliant program.",
      },
    ],
    relatedSlugs: ["how-fast-to-text-insurance-leads", "tcpa-compliance-texting-leads"],
    relatedPages: [
      { href: "/sms-crm-for-insurance-agents", label: "SMS CRM for insurance agents" },
      { href: "/ai-texting-crm", label: "AI texting CRM" },
    ],
  },

  {
    slug: "tcpa-compliance-texting-leads",
    metaTitle: "TCPA Compliance for Texting Leads: What Agents Need to Know | Text2Sale",
    title: "TCPA compliance for texting leads: what agents need to know",
    description:
      "A practical guide to texting leads without TCPA headaches: consent, identification, opt-out handling, quiet hours, and the records you should keep.",
    excerpt:
      "Texting leads is a goldmine — and a liability if you skip the rules. Here is a practical, non-lawyer guide to staying on the right side of TCPA.",
    datePublished: "2026-06-02",
    dateModified: "2026-06-02",
    readMinutes: 7,
    tags: ["TCPA", "Compliance", "SMS"],
    intro: [
      "The TCPA (Telephone Consumer Protection Act) is the federal law that governs how businesses can text and call consumers. It is not a reason to avoid texting — millions of compliant business texts go out every day — but it is a reason to do it correctly, because the penalties for getting it wrong are steep.",
      "This is a practical overview for agents and sales teams, not legal advice. When in doubt, talk to a compliance attorney. But most of staying compliant comes down to a handful of habits you can build into your process.",
    ],
    sections: [
      {
        heading: "Get express written consent",
        paragraphs: [
          "The foundation of compliant texting is consent. Before you send marketing texts, the person must have agreed to receive them — ideally express written consent captured at the point of lead generation, with clear language that they are opting in to receive SMS, that message and data rates may apply, and that consent is not a condition of purchase.",
          "Practically, this means your lead forms and opt-in pages need the right disclosure language and a record of when and how each contact agreed. If you buy or import lists, you are responsible for proving that consent exists.",
        ],
      },
      {
        heading: "Identify yourself and honor opt-outs instantly",
        paragraphs: [
          "Every message should make clear who is texting. Lead with your name and business so there is no ambiguity. And when someone replies STOP (or unsubscribe, cancel, end, quit), the opt-out must be honored immediately and permanently — no more messages to that number.",
          "A good platform handles STOP automatically and maintains a do-not-contact list so a single opt-out cannot slip through to a future campaign. Manually managing opt-outs across spreadsheets is where most violations happen.",
        ],
      },
      {
        heading: "Respect quiet hours and timezones",
        paragraphs: [
          "The TCPA restricts calls and texts to reasonable hours — generally between 8 a.m. and 9 p.m. in the recipient's local time. Since your leads can be in any timezone, sending a single blast at 9 p.m. your time could land at midnight for someone else.",
          "Tools that infer the recipient's timezone from their area code or state and defer messages outside the allowed window protect you from accidental violations on big sends.",
        ],
      },
      {
        heading: "Keep records",
        paragraphs: [
          "If a complaint ever arises, your defense is documentation: proof of consent, the opt-in language shown, timestamps, and a clean opt-out history. Keep these records for every contact. The cost of good record-keeping is trivial next to the cost of a single TCPA claim.",
        ],
      },
    ],
    keyTakeaways: [
      "Only text contacts who gave express written consent — and keep proof of it.",
      "Identify your business in every message and honor STOP instantly and permanently.",
      "Send only during local quiet hours (about 8 a.m.–9 p.m. recipient time).",
      "Maintain consent and opt-out records for every contact in case of a dispute.",
    ],
    faq: [
      {
        question: "Is it legal to text insurance or sales leads?",
        answer:
          "Yes, when done with proper consent. Under the TCPA you generally need express written consent before sending marketing texts, you must identify yourself, honor opt-outs immediately, and text only during local quiet hours. Using a 10DLC-registered platform with automatic STOP handling keeps you on the right side of the rules.",
      },
      {
        question: "What happens if someone replies STOP?",
        answer:
          "You must stop messaging that number immediately and permanently. A compliant texting platform processes STOP automatically, adds the contact to a do-not-contact list, and prevents future campaigns from reaching them. Manually tracking opt-outs is risky and a common source of violations.",
      },
      {
        question: "What are TCPA quiet hours for texting?",
        answer:
          "Texts and calls should generally be sent only between 8 a.m. and 9 p.m. in the recipient's local time. Because leads span timezones, use a platform that infers each contact's timezone and defers messages that would otherwise land outside that window.",
      },
    ],
    relatedSlugs: ["10dlc-registration-guide-for-agents", "how-fast-to-text-insurance-leads"],
    relatedPages: [
      { href: "/10dlc-compliant-texting", label: "10DLC compliant texting" },
      { href: "/how-to-text-insurance-leads", label: "How to text insurance leads" },
    ],
  },

  {
    slug: "import-and-text-thousands-of-leads",
    metaTitle: "How to Import and Text Thousands of Leads Without Getting Blocked | Text2Sale",
    title: "How to import and text thousands of leads without getting blocked",
    description:
      "Sending a large SMS campaign? Here is how to import a big lead list and text thousands of contacts with strong deliverability — wave sizing, throughput, list hygiene, and message hygiene.",
    excerpt:
      "Blasting a big list the wrong way gets your numbers filtered fast. Here is how to text thousands of leads while keeping deliverability high.",
    datePublished: "2026-06-03",
    dateModified: "2026-06-03",
    readMinutes: 6,
    tags: ["Deliverability", "Bulk SMS", "Campaigns"],
    intro: [
      "Texting a few dozen leads is easy. Texting tens of thousands is a different game — do it carelessly and carriers will throttle or block your numbers within minutes, killing the whole campaign. Done right, a large send lands cleanly and converts.",
      "The difference comes down to a few habits around list hygiene, pacing, and message content. Here is how to run a big campaign without torching your sender reputation.",
    ],
    sections: [
      {
        heading: "Start with a clean list",
        paragraphs: [
          "Deliverability problems often start before you send a single message. Scrub your list first: remove duplicates, strip out invalid and landline numbers, and drop anyone who previously opted out. Texting dead numbers and opted-out contacts hurts your reputation and can trigger carrier filtering.",
          "Importing through a CRM that de-duplicates on upload and respects your do-not-contact list saves you from the most common self-inflicted wounds.",
        ],
      },
      {
        heading: "Pace the send in waves",
        paragraphs: [
          "Dumping 20,000 messages into the carriers in one burst looks exactly like spam. Sending in measured waves — a few thousand at a time with short gaps — keeps your throughput within the limits your 10DLC campaign allows and looks like normal business traffic.",
          "A good platform handles this automatically: it spreads your send across your registered numbers and paces the waves so you stay under carrier thresholds without you having to babysit it.",
        ],
      },
      {
        heading: "Keep messages text-clean",
        paragraphs: [
          "Message content affects deliverability too. A single emoji or curly \"smart quote\" can flip your text from standard encoding (160 characters per segment) into Unicode (70 characters per segment), doubling your segment count and cost — and unusual characters can raise spam flags. Stick to plain text, avoid link shorteners that carriers distrust, and keep messages conversational.",
          "Always include a clear identity and an opt-out path. Messages that look like real one-to-one conversations get delivered; messages that look like mass marketing get filtered.",
        ],
        bullets: [
          "Avoid emojis and special characters that force Unicode encoding",
          "Skip generic link shorteners; use a domain tied to your brand",
          "Personalize with merge fields so each text is unique",
          "Spread the send across multiple registered numbers",
        ],
      },
      {
        heading: "Watch the basics: balance and registration",
        paragraphs: [
          "Two boring things stop more big campaigns than anything fancy: an underfunded carrier account and incomplete 10DLC registration. If your messaging provider's balance runs dry mid-send, the rest of the campaign simply fails. And numbers that are not attached to an approved campaign get filtered no matter how clean your list is. Confirm both before you launch a large blast.",
        ],
      },
    ],
    keyTakeaways: [
      "Clean the list first: remove duplicates, invalid numbers, and prior opt-outs.",
      "Send in paced waves across multiple registered numbers, not one giant burst.",
      "Keep messages plain-text and personalized; emojis and odd characters hurt deliverability and cost.",
      "Confirm your carrier balance and 10DLC registration before launching a big send.",
    ],
    faq: [
      {
        question: "How many texts can I send at once without getting blocked?",
        answer:
          "There is no single number — it depends on your 10DLC campaign's approved throughput and how many registered numbers you send across. The safe approach is to send in paced waves of a few thousand at a time rather than one large burst, which keeps you under carrier thresholds and looks like normal business traffic.",
      },
      {
        question: "Why do my bulk texts get filtered or fail?",
        answer:
          "Common causes are sending too fast in one burst, dirty lists with invalid numbers and prior opt-outs, spammy message content (emojis, distrusted link shorteners), numbers not attached to an approved 10DLC campaign, or an underfunded carrier account. Fixing list hygiene, pacing, and registration resolves most failures.",
      },
      {
        question: "Does adding an emoji to a text really cost more?",
        answer:
          "Yes. A single emoji or special character switches the message from GSM-7 encoding (160 characters per segment) to Unicode (70 characters per segment), which can double the number of billable segments for the same message — and unusual characters can also raise spam flags that hurt deliverability.",
      },
    ],
    relatedSlugs: ["10dlc-registration-guide-for-agents", "sms-drip-templates-for-insurance-agents"],
    relatedPages: [
      { href: "/bulk-sms-software", label: "Bulk SMS software" },
      { href: "/mass-texting-crm", label: "Mass texting CRM" },
    ],
  },
];

export function getAllPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) => (a.datePublished < b.datePublished ? 1 : -1));
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
