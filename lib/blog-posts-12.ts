import type { BlogPost } from "./blog-posts";

type NewArticle = Omit<BlogPost, "datePublished" | "dateModified" | "readMinutes">;

// Volume 12: the dialer, concluded. Scripts, audio, a compliance checklist,
// redial strategy, Medicare rules, why calling belongs in the CRM, and
// training agents on a predictive dialer.
const ARTICLES: NewArticle[] = [
  {
    slug: "dialer-opening-script-first-five-seconds",
    metaTitle: "Dialer Opening Scripts: Win the First Five Seconds | Text2Sale",
    title: "Dialer opening scripts: winning the first five seconds",
    description:
      "On a predictive dialer, the lead decides whether to stay on the line in the first few seconds. How to open a dialer call so people keep listening, with examples.",
    excerpt:
      "When a dialer connects you, you have about five seconds. Here is how to use them.",
    tags: ["Dialer", "Predictive dialer", "Sales teams"],
    intro: [
      "A dialer call starts differently from a call you placed by hand. You did not hear it ring, you may not have read the lead's name yet, and the person on the other end has just said hello to an unfamiliar number. Whatever you say first decides whether they stay.",
    ],
    sections: [
      {
        heading: "Listen for the beep, then speak first",
        paragraphs: [
          "In Text2Sale, a short beep only you can hear tells you a person is on the line, and the lead's name and details appear on screen. Speak right away. A pause after someone says hello sounds like a robocall, and many people hang up within two seconds of silence.",
        ],
      },
      {
        heading: "Name, company, reason, question",
        paragraphs: [
          "The opening that works best is short and specific: your name, your company, why you are calling them in particular, and a question that is easy to answer.",
          "'Hi Dana, this is Sarah with Johnson Health Quotes. You asked about health coverage for your family in Tampa. Is now a bad time for two quick questions?'",
        ],
        bullets: [
          "Use their first name, and say yours",
          "Mention what they asked for, so it is not a cold call",
          "Ask a question they can answer in a word",
        ],
      },
      {
        heading: "What to avoid",
        paragraphs: [
          "Skip 'How are you today?' It signals a sales call and invites a brush-off. Avoid long introductions before the reason for calling. Do not read a script word for word; people hear it.",
        ],
      },
      {
        heading: "Handle 'Who is this?'",
        paragraphs: [
          "Many people answer unknown numbers cautiously. Repeat your name and company calmly, and give the reason again in one sentence. If they want to stop, mark Do not call and thank them. Being easy to say no to is what makes people willing to say yes.",
        ],
      },
    ],
    keyTakeaways: [
      "Speak within a second of the connect beep.",
      "Open with name, company, their request and an easy question.",
      "Skip 'How are you today?' and long introductions.",
      "Make it easy to say no, and honor it.",
    ],
    faq: [
      {
        question: "Should I mention the call is recorded?",
        answer:
          "Only if it is. If you record calls through another system, follow the consent laws for the states you call, some of which require everyone's consent.",
      },
      {
        question: "How long should the opening be?",
        answer: "Under 15 seconds before your first question.",
      },
    ],
    relatedSlugs: ["what-is-a-predictive-dialer", "training-new-agents-on-a-predictive-dialer", "lead-temperature-who-to-call-first"],
  },
  {
    slug: "microphone-and-headset-setup-for-dialer",
    metaTitle: "Microphone and Headset Setup for Browser Dialers | Text2Sale",
    title: "Microphone and headset setup for a browser dialer",
    description:
      "Most 'they can't hear me' problems on a browser dialer come down to microphone permission, the wrong input device or a weak connection. Here is how to fix each one.",
    excerpt:
      "If leads say hello and hear nothing, the problem is almost always on your side. Here is the checklist.",
    tags: ["Dialer", "Calling", "Getting started"],
    intro: [
      "The most frustrating dialer problem is one-way audio: the lead answers, says hello a few times, and hangs up because they cannot hear you. On a browser dialer, it almost always comes down to the microphone, the selected device or the network.",
    ],
    sections: [
      {
        heading: "Allow microphone access",
        paragraphs: [
          "Your browser must have permission to use the microphone on the Calling page. Look for the camera or microphone icon in the address bar and make sure it is set to Allow. Text2Sale checks this when you start or resume the dialer and warns you if access is blocked.",
        ],
      },
      {
        heading: "Pick the right input device",
        paragraphs: [
          "If you have a headset plugged in, your computer may still be using the laptop microphone, or a webcam microphone across the room. Check your operating system's sound settings and the browser's site settings so the headset is selected for both input and output.",
        ],
        bullets: [
          "Windows: Settings, System, Sound, Input",
          "Mac: System Settings, Sound, Input",
          "Browser: site settings for the microphone",
        ],
      },
      {
        heading: "Test before your first call",
        paragraphs: [
          "Make a short test call to your own cell from the browser phone before dialing a list. Speak and listen on both ends. Two minutes of testing saves a morning of silent calls.",
        ],
      },
      {
        heading: "Network matters",
        paragraphs: [
          "Calls over the internet need a steady connection more than a fast one. Wired Ethernet beats Wi-Fi; close video streams and large downloads while dialing. Text2Sale records audio statistics for each dialer call, which helps support see whether audio was flowing from your side.",
        ],
      },
    ],
    keyTakeaways: [
      "One-way audio is usually microphone permission or device selection.",
      "Select the headset as input and output in both the OS and browser.",
      "Test with a call to your own cell before dialing.",
      "Prefer wired internet and close bandwidth-heavy apps.",
    ],
    faq: [
      {
        question: "Why does my voice echo for the lead?",
        answer: "Usually speakers and a microphone in the same room. A headset fixes it.",
      },
      {
        question: "Do Bluetooth headsets work?",
        answer:
          "Yes, but some switch to a low-quality mode when the microphone is active. A wired or USB headset is more reliable.",
      },
    ],
    relatedSlugs: ["browser-based-predictive-dialer-setup", "browser-calling-vs-desk-phone", "dialer-opening-script-first-five-seconds"],
  },
  {
    slug: "predictive-dialer-compliance-checklist",
    metaTitle: "Predictive Dialer Compliance Checklist | Text2Sale",
    title: "A predictive dialer compliance checklist",
    description:
      "A practical checklist for running a predictive dialer within telemarketing rules: consent, Do Not Call, calling hours, abandoned calls, caller ID and records.",
    excerpt:
      "Before you start a dialer campaign, run through this checklist.",
    tags: ["Predictive dialer", "Compliance", "TCPA"],
    intro: [
      "Telemarketing rules are strict and the penalties are per call, so a dialer that makes hundreds of calls an hour can create a lot of liability quickly. This checklist covers the main federal requirements. It is general information, not legal advice; state laws add their own rules, and your counsel should review your program.",
    ],
    sections: [
      {
        heading: "Before you dial",
        bullets: [
          "You have the consent your calls require, documented by lead source",
          "Lists are scrubbed against the National Do Not Call Registry within the last 31 days",
          "Your internal Do Not Call list is applied",
          "Each lead has a state so local calling hours can be enforced",
          "Your business numbers are registered and accept callbacks",
        ],
        paragraphs: [
          "Consent rules for calls to cell phones are complex and have changed in recent years. Know what your lead vendor's opt-in actually said.",
        ],
      },
      {
        heading: "While dialing",
        bullets: [
          "Calls only between 8 a.m. and 9 p.m. in the lead's time zone, or tighter where state law requires",
          "Abandoned calls under 3% of answered calls per campaign over 30 days",
          "Unanswered calls ring at least 15 seconds or four rings",
          "Abandoned calls get a message with your name, a callback number and an opt-out",
          "Accurate caller ID showing a number that can be called back",
        ],
        paragraphs: [
          "Text2Sale enforces several of these automatically: 8 a.m. to 8 p.m. local calling hours, Do Not Call skipping, 25-second rings, pacing against the 3% limit, and an abandoned-call message with a press-9 opt-out.",
        ],
      },
      {
        heading: "After each call",
        bullets: [
          "Stop requests marked Do not call immediately",
          "Dispositions and notes saved",
          "Requests for written information honored",
        ],
        paragraphs: [
          "Honoring stop requests quickly is both a legal requirement and the best protection for your numbers' reputation.",
        ],
      },
      {
        heading: "Records",
        paragraphs: [
          "Keep records of consent, Do Not Call scrubs, and your abandonment rate. The safe harbor for abandoned calls depends on being able to show compliance. Your dialer's call history and 30-day abandoned rate are part of that record.",
        ],
      },
    ],
    keyTakeaways: [
      "Confirm consent and scrub lists before every campaign.",
      "Enforce local calling hours, ring time and the 3% abandoned limit.",
      "Every abandoned call needs identification, a callback number and an opt-out.",
      "Keep records that show you followed the rules.",
    ],
    faq: [
      {
        question: "Does the dialer make me compliant?",
        answer:
          "No tool does on its own. Text2Sale automates several safeguards, but consent, list sourcing and state-specific rules remain your responsibility.",
      },
      {
        question: "Are state rules different?",
        answer:
          "Yes. Several states have their own telemarketing laws covering hours, call frequency and registration. Check each state you call.",
      },
    ],
    relatedSlugs: ["predictive-dialer-abandoned-call-rule-3-percent", "do-not-call-scrubbing-for-dialer-campaigns", "dialer-calling-hours-by-time-zone"],
    relatedPages: [{ href: "/10dlc-compliant-texting", label: "Compliance for business texting" }],
    sources: [
      { href: "https://www.ftc.gov/business-guidance/resources/complying-telemarketing-sales-rule", label: "FTC: Complying with the Telemarketing Sales Rule" },
      { href: "https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-64/subpart-L/section-64.1200", label: "FCC rule 47 CFR 64.1200" },
    ],
  },
  {
    slug: "dialer-vs-manual-dialing-productivity",
    metaTitle: "Dialer vs Manual Dialing: How Much Time Does It Save? | Text2Sale",
    title: "Dialer vs manual dialing: how much time does it really save?",
    description:
      "Where an agent's calling hour actually goes, and how power and predictive dialing change the number of conversations per hour.",
    excerpt:
      "Manual dialing wastes most of the hour on rings and voicemail. Here is the math on what a dialer gives back.",
    tags: ["Dialer", "Predictive dialer", "Sales teams"],
    intro: [
      "Ask agents how many calls they make in an hour and they will give you a number. Ask how many conversations they have, and the number drops sharply. The gap is time spent dialing, ringing, listening to voicemail greetings and logging results.",
    ],
    sections: [
      {
        heading: "Where a manual hour goes",
        paragraphs: [
          "Dialing a number and waiting through rings takes about 30 to 45 seconds per attempt, longer when you listen to a voicemail greeting before hanging up. Add finding the next lead and typing notes, and a focused agent might make 40 to 60 attempts an hour. If 8% are answered by a person, that is three to five conversations.",
        ],
      },
      {
        heading: "What a power dialer changes",
        paragraphs: [
          "A power dialer removes manual dialing and the gap between calls, and answering machine detection skips voicemail greetings. Agents commonly get through noticeably more attempts per hour, and the number of conversations rises with it.",
        ],
      },
      {
        heading: "What a predictive dialer changes",
        paragraphs: [
          "A predictive dialer runs several attempts at once. With two or three lines on a low-answer list, the time between conversations shrinks further, because the ringing on several lines overlaps. The gain is largest on lists where few people pick up.",
        ],
        bullets: [
          "Manual: you hear every ring and greeting",
          "Power: no manual dialing, voicemail skipped",
          "Predictive: several lines ring at once, only answers reach you",
        ],
      },
      {
        heading: "Measure your own numbers",
        paragraphs: [
          "Your results depend on your lists. Track conversations per hour for a week of manual calling, then a week on the dialer, and compare. The dialer's live view shows dials and conversations for each session.",
        ],
      },
    ],
    keyTakeaways: [
      "Most of a manual calling hour is ringing and voicemail, not talking.",
      "Power dialing removes dialing time and skips voicemail.",
      "Predictive dialing overlaps ringing across several lines.",
      "Compare conversations per hour before and after.",
    ],
    faq: [
      {
        question: "Will a dialer make me sound rushed?",
        answer:
          "It removes waiting, not talking. Take the time you need on each call; the dialer only starts the next batch when you are ready.",
      },
      {
        question: "Is predictive dialing always faster?",
        answer:
          "On lists where many people answer, extra lines mostly add abandoned calls. A single line can be just as productive there.",
      },
    ],
    relatedSlugs: ["predictive-vs-power-vs-preview-dialer", "dialer-metrics-contact-rate-talk-time", "power-dialer-back-to-back-leads"],
  },
  {
    slug: "dialing-crm-vs-separate-dialer",
    metaTitle: "Dialing CRM vs a Separate Dialer | Text2Sale",
    title: "Dialing CRM vs a separate dialer: why calls belong in your CRM",
    description:
      "Running a dialer that is separate from your CRM means exporting lists, copying notes and losing history. The case for a CRM with a built-in dialer.",
    excerpt:
      "When the dialer and the CRM are separate, history gets lost. Here is why they belong together.",
    tags: ["Dialer", "Texting CRM", "Sales teams"],
    intro: [
      "Many agencies run a dialer from one vendor, a CRM from another and texting from a third. Every day someone exports a list from the CRM, uploads it to the dialer, and later copies dispositions back. Somewhere in that loop, notes go missing and Do Not Call requests fall through.",
    ],
    sections: [
      {
        heading: "One record per lead",
        paragraphs: [
          "When calls, texts and notes live on the same contact, the person calling sees the whole history: what the lead asked for, what they replied to the last text, and what the last agent wrote. That context changes how a call opens.",
        ],
      },
      {
        heading: "Do Not Call in one place",
        paragraphs: [
          "A stop request recorded in one system and not the other is a compliance problem. In a combined system, a Do not call disposition on the dialer and a STOP reply to a text both land on the same contact, and the dialer skips anyone marked Do Not Call.",
        ],
      },
      {
        heading: "No exports, no stale lists",
        paragraphs: [
          "Dialing directly from your CRM's lists and uploads means the dialer always works from current data. New leads are available as soon as they are imported, and contacts who opted out are excluded automatically.",
        ],
      },
      {
        heading: "Calls and texts work together",
        paragraphs: [
          "The best follow-up mixes channels: a call, then a text when they do not answer, then a call when they reply. That only works smoothly when both channels share the same contact and the same phone numbers.",
        ],
        bullets: [
          "Dialer, browser phone, texting and AI receptionist in one place",
          "Business numbers shared across calls and texts",
          "One wallet for calling and texting costs",
        ],
      },
    ],
    keyTakeaways: [
      "Separate dialers and CRMs lose notes and history in exports.",
      "Do Not Call requests must apply across every channel.",
      "Dialing from live CRM lists avoids stale data.",
      "Calls and texts work best on the same contact record.",
    ],
    faq: [
      {
        question: "Does Text2Sale include a dialer?",
        answer:
          "Yes. The Dialer ($89.99/month) and Complete ($119.99/month, with texting) plans include a predictive dialer (one to three lines), a browser phone, call forwarding and an AI receptionist.",
      },
      {
        question: "Can I keep my existing dialer?",
        answer:
          "You can, but you will be exporting lists and copying results between systems. Many teams consolidate to avoid that.",
      },
    ],
    relatedSlugs: ["sms-crm-with-built-in-dialer", "switching-from-texting-to-a-dialing-crm", "text-then-call-dialer-sequence"],
    relatedPages: [{ href: "/ai-texting-crm", label: "AI texting and calling CRM" }],
  },
  {
    slug: "redial-strategy-how-often-to-call-a-lead",
    metaTitle: "Redial Strategy: How Often Should You Call a Lead? | Text2Sale",
    title: "Redial strategy: how often should you call the same lead?",
    description:
      "Most leads are not reached on the first call. How many attempts to make, how far apart, and when to stop, without crossing into harassment or state call limits.",
    excerpt:
      "One call is rarely enough, but ten in a day is too many. Here is a sensible redial cadence.",
    tags: ["Dialer", "Lead management", "Compliance"],
    intro: [
      "The first dial reaches only a fraction of any list. Agents who stop after one attempt leave most of their leads unworked; agents who call the same person five times a day get reported. A good redial strategy sits between the two.",
    ],
    sections: [
      {
        heading: "Space attempts out",
        paragraphs: [
          "Text2Sale's dialer does not call the same number again within 24 hours. That keeps a list from hammering the same people in one session and stays inside state rules that limit repeat calls about the same subject in a day, such as Florida's three-call limit.",
        ],
      },
      {
        heading: "Vary the time of day",
        paragraphs: [
          "If a lead did not answer at 10 a.m., try the afternoon next time, then early evening. People's schedules differ, and the same time every day hits the same meeting or commute.",
        ],
        bullets: [
          "Attempt 1: the day the lead comes in",
          "Attempt 2: next day, different time",
          "Attempts 3 to 5: spread over the next one to two weeks",
          "Then move them to a slower nurture by text, where you have consent",
        ],
      },
      {
        heading: "Mix in a text",
        paragraphs: [
          "A short text between calls tells the lead who you are, so they are more likely to pick up next time. Many people who never answer unknown numbers will reply to a text.",
        ],
      },
      {
        heading: "Know when to stop",
        paragraphs: [
          "After several attempts with no answer, stop calling and let texts or email do the work. Anyone who says not interested should not be redialed for that offer, and anyone who says stop goes on Do Not Call permanently.",
        ],
      },
    ],
    keyTakeaways: [
      "Space attempts at least a day apart; some states limit daily calls.",
      "Vary the time of day between attempts.",
      "Use texts between calls to build recognition.",
      "Stop after several unanswered attempts, and immediately on request.",
    ],
    faq: [
      {
        question: "Will the dialer redial voicemails automatically?",
        answer:
          "Leads that were not reached become eligible again after 24 hours when you dial that list in a later session.",
      },
      {
        question: "What about a lead who asked for a callback?",
        answer: "Call at the time they asked for. Put it in your notes and calendar.",
      },
    ],
    relatedSlugs: ["dialer-call-dispositions-that-drive-follow-up", "voicemail-vs-text-follow-up", "calling-aged-health-insurance-leads-with-a-dialer"],
  },
  {
    slug: "predictive-dialer-for-small-insurance-agencies",
    metaTitle: "Predictive Dialer for Small Insurance Agencies | Text2Sale",
    title: "A predictive dialer for small insurance agencies",
    description:
      "Call-center dialers are built for 50 seats. How a one to five agent insurance agency can run predictive dialing without contracts, hardware or an IT department.",
    excerpt:
      "You do not need a call center to use a predictive dialer. Here is how small agencies do it.",
    tags: ["Predictive dialer", "Insurance", "Sales teams"],
    intro: [
      "Most predictive dialer products were designed for call centers: per-seat licenses, minimum seat counts, annual contracts and an administrator to configure campaigns. A two-person agency does not need any of that.",
      "What a small agency needs is simple: dial its own leads faster, stay compliant, and not lose calls when someone is busy.",
    ],
    sections: [
      {
        heading: "No contracts or seat minimums",
        paragraphs: [
          "The Text2Sale Dialer plan is $89.99 per user per month with no seat minimum or contract, and calling minutes are paid from a prepaid wallet at $0.025 per outbound minute, so a slow week costs little and a busy open enrollment costs more, in line with your revenue.",
        ],
      },
      {
        heading: "Each agent dials their own leads",
        paragraphs: [
          "Agents can work their own lists from their own dialer, calling from the agency's business numbers, with each agent's caller IDs assigned so you know who called whom. Calls are billed to the agency's wallet.",
        ],
      },
      {
        heading: "Small teams share calls",
        paragraphs: [
          "With only a few agents, a lost call matters. Call sharing sends a lead who answers while their agent is busy to a free teammate, any agent can pass a live call to a colleague, and incoming calls can overflow to a teammate when the owner is busy dialing.",
        ],
        bullets: [
          "Per-minute billing, no seat minimums",
          "Agents dial their own lists from shared business numbers",
          "Calls shared across the team instead of abandoned",
        ],
      },
      {
        heading: "Keep it compliant without an admin",
        paragraphs: [
          "Local calling hours, Do Not Call skipping, 24-hour redial gaps and abandoned-call pacing are built in, so a small agency gets call-center safeguards without configuring them.",
        ],
      },
    ],
    keyTakeaways: [
      "Small agencies need speed and compliance, not call-center complexity.",
      "Per-minute pricing scales with the season.",
      "Agents can dial their own leads from shared agency numbers.",
      "Call sharing keeps a small team from losing live answers.",
    ],
    faq: [
      {
        question: "Can a solo agent use a predictive dialer?",
        answer:
          "Yes. One agent with two or three lines on an aged list is the most common setup.",
      },
      {
        question: "Do agents need their own phone numbers?",
        answer:
          "No. Agents can call from the agency's business numbers, with specific numbers assigned to each agent.",
      },
    ],
    relatedSlugs: ["sharing-dialer-calls-across-a-team", "dialer-cost-per-minute-budgeting", "predictive-dialer-for-health-insurance-agents"],
    relatedPages: [{ href: "/insurance-agents", label: "Text2Sale for insurance agents" }],
  },
  {
    slug: "medicare-calling-rules-for-dialers",
    metaTitle: "Medicare Calling Rules: What Dialer Users Need to Know | Text2Sale",
    title: "Medicare calling rules: what dialer users need to know",
    description:
      "Medicare marketing rules are far stricter than general telemarketing rules. Why cold-calling Medicare prospects with a dialer is off limits, and what to do instead.",
    excerpt:
      "Medicare is not like other insurance lines when it comes to calling. Here is what the CMS rules mean for dialers.",
    tags: ["Medicare", "Compliance", "Dialer"],
    intro: [
      "Agents who sell both under-65 health insurance and Medicare plans sometimes assume the same dialer campaigns work for both. They do not. CMS, the agency that runs Medicare, sets marketing rules for Medicare Advantage and Part D plans that go well beyond the general telemarketing rules.",
      "This is a summary for orientation, not legal or compliance advice. Follow your carriers' and FMO's guidance and the current CMS marketing guidelines.",
    ],
    sections: [
      {
        heading: "No unsolicited outreach",
        paragraphs: [
          "CMS rules prohibit unsolicited contact with Medicare beneficiaries about Medicare Advantage and Part D plans, including cold calls, door-to-door visits and unsolicited texts. Calling is allowed when the beneficiary asked to be contacted, such as by requesting information or returning your call, within the limits CMS sets.",
          "A purchased list of people turning 65 is not permission to call them about Medicare Advantage.",
        ],
      },
      {
        heading: "Recording and disclaimers",
        paragraphs: [
          "Third-party marketing organizations must record Medicare marketing, sales and enrollment calls in their entirety and give a required disclaimer early in the call. Text2Sale's dialer does not record calls, so it is not the right tool for Medicare sales calls that must be recorded.",
        ],
      },
      {
        heading: "Scope of appointment",
        paragraphs: [
          "Before discussing specific plan types in a sales appointment, agents generally need a documented scope of appointment, with a waiting period before the meeting in many cases. Build that into your process rather than discussing plans on a first call.",
        ],
      },
      {
        heading: "Keep lines of business separate",
        paragraphs: [
          "Keep Medicare contacts out of the lists you run through a predictive dialer. Tag them separately in your CRM, work only inbound inquiries and permitted follow-ups, and use systems that meet CMS recording requirements for those calls.",
        ],
        bullets: [
          "Separate Medicare contacts from under-65 lists",
          "Only contact beneficiaries who asked to be contacted",
          "Use recorded lines for Medicare sales calls",
        ],
      },
    ],
    keyTakeaways: [
      "CMS prohibits unsolicited calls about Medicare Advantage and Part D.",
      "Medicare sales calls by third-party marketers must be recorded.",
      "Text2Sale's dialer does not record calls; do not use it for Medicare sales.",
      "Keep Medicare contacts out of predictive dialer lists.",
    ],
    faq: [
      {
        question: "Can I dial under-65 health leads with the same dialer?",
        answer:
          "Yes, within general telemarketing rules and with the consent your calls require. The CMS restrictions apply to Medicare marketing.",
      },
      {
        question: "Can I text Medicare prospects instead?",
        answer:
          "Unsolicited texts are also restricted. Contact only beneficiaries who asked to hear from you.",
      },
    ],
    relatedSlugs: ["predictive-dialer-for-health-insurance-agents", "predictive-dialer-compliance-checklist", "do-not-call-scrubbing-for-dialer-campaigns"],
    relatedPages: [{ href: "/medicare", label: "Text2Sale for Medicare agents" }],
    sources: [{ href: "https://www.cms.gov/medicare/health-plans/managedcaremarketing/finalpartcmarketingguidelines", label: "CMS Medicare marketing guidelines" }],
  },
  {
    slug: "switching-from-texting-to-a-dialing-crm",
    metaTitle: "Switching From Texting to a Dialing CRM | Text2Sale",
    title: "Switching from a texting CRM to a dialing CRM",
    description:
      "Texting gets replies; calls close deals. How to add a dialer to a texting-first workflow without losing what already works.",
    excerpt:
      "Texting starts conversations. Calling closes them. Here is how to add a dialer to a texting-first business.",
    tags: ["Dialer", "Texting CRM", "Getting started"],
    intro: [
      "Many agents built their pipeline on texting: fast first touches, drip campaigns and a busy inbox. Texting is great at starting conversations, but complex products like health insurance usually close on the phone.",
      "Adding a dialer does not mean giving up texting. It means letting each channel do what it is best at.",
    ],
    sections: [
      {
        heading: "Why add calling",
        paragraphs: [
          "Texting deliverability has become harder, with carriers filtering more marketing messages, and many leads are happy to talk once you reach them. A dialer lets you work lists by phone at volume, and calls are not subject to the same text filtering.",
        ],
      },
      {
        heading: "Start with the leads who replied",
        paragraphs: [
          "The easiest first campaign is people who replied to a text but did not book. They already know who you are. Dial them on a single line and reference the text conversation.",
        ],
      },
      {
        heading: "Then work the silent ones",
        paragraphs: [
          "Leads who never replied to texts are the next list. Run them through the predictive dialer on two or three lines, and follow unanswered calls with one short text.",
        ],
        bullets: [
          "Week 1: dial text responders who did not convert",
          "Week 2: dial aged leads who never replied",
          "Ongoing: call new leads first, text if no answer",
        ],
      },
      {
        heading: "Keep your numbers healthy",
        paragraphs: [
          "Your business numbers now carry calls and texts. Register them with the Free Caller Registry, keep call volume per number reasonable, and honor opt-outs across both channels.",
        ],
      },
    ],
    keyTakeaways: [
      "Texting starts conversations; calls usually close complex sales.",
      "Dial text responders first; they already know you.",
      "Use predictive dialing on leads who never replied.",
      "Protect your numbers and honor opt-outs across channels.",
    ],
    faq: [
      {
        question: "Do I need new phone numbers for calling?",
        answer: "No. The dialer calls from the business numbers you already text from.",
      },
      {
        question: "Does calling need 10DLC registration?",
        answer:
          "No. 10DLC registration is for application-to-person texting. Calls follow telemarketing rules instead: consent, Do Not Call, calling hours and abandoned-call limits.",
      },
    ],
    relatedSlugs: ["dialing-crm-vs-separate-dialer", "text-then-call-dialer-sequence", "sms-vs-cold-calling-leads"],
  },
  {
    slug: "training-new-agents-on-a-predictive-dialer",
    metaTitle: "Training New Agents on a Predictive Dialer | Text2Sale",
    title: "Training new agents on a predictive dialer",
    description:
      "A predictive dialer feels fast and strange at first. A simple first-week plan for getting new agents comfortable, productive and compliant.",
    excerpt:
      "New agents often freeze when the dialer connects them mid-thought. Here is a first-week plan that fixes that.",
    tags: ["Predictive dialer", "Sales teams", "Getting started"],
    intro: [
      "The first hour on a predictive dialer surprises most new agents. There is no ringing, no time to read the lead before they say hello, and a call can connect while you are still typing notes from the last one.",
      "A little structure in the first week makes the difference between an agent who loves the dialer and one who avoids it.",
    ],
    sections: [
      {
        heading: "Day 1: one line",
        paragraphs: [
          "Start new agents with Lines at once set to 1. They still skip manual dialing and voicemail, but each connection is predictable. Practice the opening: listen for the beep, read the name on screen, speak first.",
        ],
      },
      {
        heading: "Day 2: dispositions and notes",
        paragraphs: [
          "Make every call end with a disposition and a one-line note before clicking Save and dial next. Review the call history together at the end of the day. The habit matters more than the volume at this stage.",
        ],
      },
      {
        heading: "Days 3 to 5: more lines",
        paragraphs: [
          "Move to two lines on an aged list and let pacing decide. Show the agent the abandoned count and the 30-day rate, and explain why pausing before a break matters.",
        ],
        bullets: [
          "Pause before stepping away",
          "Mark Do not call the moment someone asks",
          "Use Transfer to my cell or Send to a teammate when needed",
        ],
      },
      {
        heading: "Compliance basics every agent should know",
        paragraphs: [
          "Agents do not need to memorize regulations, but they should know what a stop request is, never to argue with one, and that the dialer only calls each lead within local hours. Pair new agents with an experienced one for a few calls if you can.",
        ],
      },
    ],
    keyTakeaways: [
      "Start new agents on one line.",
      "Build the disposition and notes habit before adding speed.",
      "Add lines once the opening and wrap-up feel natural.",
      "Teach stop requests and pausing as non-negotiables.",
    ],
    faq: [
      {
        question: "How long until an agent is comfortable?",
        answer: "Most agents settle in within a few sessions once they have practiced the opening.",
      },
      {
        question: "Should new agents work fresh leads?",
        answer:
          "Start them on aged leads, where a fumbled opening costs less, and move them to fresh leads once they are confident.",
      },
    ],
    relatedSlugs: ["dialer-opening-script-first-five-seconds", "dialer-call-dispositions-that-drive-follow-up", "how-many-lines-should-a-predictive-dialer-dial"],
    relatedPages: [{ href: "/sales-team-texting-crm", label: "Calling and texting for sales teams" }],
  },
];

export const BLOG_POSTS_12: BlogPost[] = ARTICLES.map((article) => {
  const text = [article.title, ...article.intro,
    ...article.sections.flatMap((section) => [section.heading, ...section.paragraphs, ...(section.bullets || [])]),
    ...article.keyTakeaways, ...article.faq.flatMap((item) => [item.question, item.answer])].join(" ");
  return { ...article, datePublished: "2026-10-20", dateModified: "2026-10-20",
    readMinutes: Math.max(1, Math.ceil(text.split(/\s+/).length / 200)) };
});
