import type { BlogPost } from "./blog-posts";

type NewArticle = Omit<BlogPost, "datePublished" | "dateModified" | "readMinutes">;

// Volume 11: the dialer, continued. Setting up a browser dialer, lists,
// dispositions, costs and metrics, health insurance campaigns, and moving
// calls: transfers to a cell, sharing calls with teammates, and callbacks.
const ARTICLES: NewArticle[] = [
  {
    slug: "browser-based-predictive-dialer-setup",
    metaTitle: "Setting Up a Browser-Based Predictive Dialer | Text2Sale",
    title: "Setting up a browser-based predictive dialer",
    description:
      "You do not need desk phones or a call center to run a predictive dialer. What you need to start dialing from a web browser, and how to get your first session right.",
    excerpt:
      "A headset, a browser and a lead list are enough to start predictive dialing. Here is the setup, step by step.",
    tags: ["Predictive dialer", "Dialer", "Getting started"],
    intro: [
      "Predictive dialers used to mean a server room, desk phones and a telecom contract. Today the whole thing can run in a browser tab, with calls carried over the internet and placed from your business phone numbers.",
      "Here is what you need and how to set up your first session so the first person who answers actually hears you.",
    ],
    sections: [
      {
        heading: "What you need",
        bullets: [
          "A computer with Chrome, Edge or another modern browser",
          "A USB or Bluetooth headset with a microphone",
          "A stable internet connection (wired is best)",
          "At least one business phone number on your account",
          "A lead list you have consent to call",
        ],
        paragraphs: [
          "Headsets matter more than people expect. Laptop speakers and microphones cause echo, and leads hang up on calls that sound like a speakerphone.",
        ],
      },
      {
        heading: "Allow the microphone",
        paragraphs: [
          "The first time you start the dialer, your browser asks for permission to use the microphone. Allow it. If you block it, leads will hear silence when they answer. Text2Sale checks microphone access when you click Start or Ready and tells you if it is blocked, because the dialer connects calls automatically and the browser cannot ask for permission in the middle of a live call.",
        ],
      },
      {
        heading: "Start a session",
        paragraphs: [
          "Wait until the browser phone shows Phone ready. Choose the leads to call: an uploaded CSV file, a campaign list or all leads. Pick how many lines to dial, enter your name and business name for the abandoned-call message, choose which of your numbers to call from, and click Start dialing.",
          "When someone answers, you hear a short beep only you can hear, and the lead's details appear. Talk, pick an outcome, add notes, and click Save and dial next.",
        ],
      },
      {
        heading: "Keep the tab open",
        paragraphs: [
          "The Calling page is your connection to the dialer. If you close it, the dialer stops placing new calls within about a minute. Use Pause when you step away, so leads who answer are not abandoned while you are gone.",
        ],
      },
    ],
    keyTakeaways: [
      "A browser, a headset and a business number are all the hardware you need.",
      "Allow microphone access, or leads will hear silence.",
      "Start only when the phone shows Phone ready.",
      "Pause the dialer when you step away.",
    ],
    faq: [
      {
        question: "Can I use my cell phone instead of a headset?",
        answer:
          "The dialer connects calls to the browser. During a call you can move it to your cell with Transfer to my cell, but dialing itself runs in the browser.",
      },
      {
        question: "Does it work on a Mac?",
        answer: "Yes. Any modern browser with microphone access works.",
      },
    ],
    relatedSlugs: ["microphone-and-headset-setup-for-dialer", "browser-calling-vs-desk-phone", "what-is-a-predictive-dialer"],
  },
  {
    slug: "dialer-call-dispositions-that-drive-follow-up",
    metaTitle: "Dialer Call Dispositions That Drive Follow-Up | Text2Sale",
    title: "Call dispositions that actually drive follow-up",
    description:
      "A disposition is the outcome you record after each dialer call. How to use a short, consistent set of dispositions and notes so every lead gets the right next step.",
    excerpt:
      "The few seconds after a call decide whether the lead gets followed up. Here is how to use dispositions well.",
    tags: ["Dialer", "Power dialer", "Lead management"],
    intro: [
      "Every dialer call ends with a decision: what happened, and what should happen next. That outcome is called a disposition. Recorded consistently, dispositions turn a day of dialing into a clean follow-up list. Skipped or guessed, they leave you with a list of names and no memory of who said what.",
    ],
    sections: [
      {
        heading: "Keep the list short",
        paragraphs: [
          "Agents pick from a long menu inconsistently. A short list of outcomes covers almost every call and is fast to click. Text2Sale's dialer uses five:",
        ],
        bullets: [
          "Interested: wants a quote or next step",
          "Call back: asked to be called at another time",
          "Not interested: said no, but did not ask to stop calls",
          "Wrong number: the person is not the lead",
          "Do not call: asked not to be called again",
        ],
      },
      {
        heading: "Do not call means never again",
        paragraphs: [
          "Picking Do not call in Text2Sale marks the contact as Do Not Call, and the dialer will skip them in every future session. Use it whenever someone asks you to stop, even politely. Not interested is for people who declined but did not ask you to stop calling.",
        ],
      },
      {
        heading: "Write the note while it is fresh",
        paragraphs: [
          "A disposition says what happened; the note says why. 'Has coverage through work until March, call back in February' is worth more than any button. The dialer saves your disposition and notes on the call record, so the next person to call that lead sees them.",
        ],
      },
      {
        heading: "Turn dispositions into a follow-up routine",
        paragraphs: [
          "At the end of each day, work the Interested and Call back calls first. Send a short text to Interested leads with your contact details while the conversation is fresh. Callbacks deserve a specific time; put it in the note and on your calendar.",
          "Review Wrong number counts by list. A list with many wrong numbers is telling you something about its source.",
        ],
      },
    ],
    keyTakeaways: [
      "Use a short, consistent set of dispositions.",
      "Do not call removes the lead from all future dialing.",
      "Notes capture the context buttons cannot.",
      "Work Interested and Call back outcomes the same day.",
    ],
    faq: [
      {
        question: "What if I forget to pick a disposition?",
        answer:
          "You can save and dial next without one, but the call will have no outcome on record. Make it a habit to click one every time.",
      },
      {
        question: "Can I see dispositions later?",
        answer: "Yes. They are saved with notes on the call in your call history.",
      },
    ],
    relatedSlugs: ["power-dialer-dispositions-workflow", "redial-strategy-how-often-to-call-a-lead", "dialer-metrics-contact-rate-talk-time"],
  },
  {
    slug: "dialer-cost-per-minute-budgeting",
    metaTitle: "What Does a Dialer Cost? Budgeting Per-Minute Calling | Text2Sale",
    title: "What does it cost to call 1,000 leads with a dialer?",
    description:
      "How per-minute dialer pricing works, what you pay for and what you do not, and a worked example of the cost of calling 1,000 leads.",
    excerpt:
      "Per-minute pricing makes dialer costs predictable once you know your answer rate. Here is the math for 1,000 leads.",
    tags: ["Dialer", "Predictive dialer", "Pricing"],
    intro: [
      "Dialer pricing comes in two shapes: a flat per-seat license, often with a contract, or pay-as-you-go per-minute calling. Per-minute pricing means you pay for conversations, not for software sitting idle.",
      "Here is how Text2Sale's calling costs work and a worked example you can adapt to your own numbers.",
    ],
    sections: [
      {
        heading: "What you pay for",
        bullets: [
          "Outbound calls: $0.025 per minute, per started minute",
          "Inbound calls: $0.015 per minute",
          "Calls transferred to your cell: twice the outbound rate, because two phone legs are open",
          "AI receptionist minutes, if you use it for callbacks: $0.18 per minute",
        ],
        paragraphs: [
          "Calls are paid from a prepaid wallet. The first minute is charged when the call is answered and each later minute as it starts; the total is settled when the call ends.",
        ],
      },
      {
        heading: "Keeping wasted minutes down",
        paragraphs: [
          "Most predictive dials never reach a person. The dialer hangs up on answering machines as soon as it detects them and stops ringing after 25 seconds, so the minutes you pay for are mostly conversations. Don't budget as if only answered calls can cost money: connected voicemails and other provider-billable activity can add to the bill.",
        ],
      },
      {
        heading: "Worked example: 1,000 leads",
        paragraphs: [
          "Suppose 1,000 dials reach a person 10% of the time, and the average conversation lasts five minutes. That is 100 conversations and about 500 billed minutes: $12.50. Rounding up to the started minute, short voicemail connections and a few abandoned-call messages might bring it to about $15 or more.",
          "If half of those conversations are short (under a minute) and half run ten minutes, the total is closer to 50 plus 500 minutes, about $14. The number that moves your bill most is total talk time, which is the time you want to be spending anyway.",
        ],
      },
      {
        heading: "Budget for the whole funnel",
        paragraphs: [
          "Calling minutes are usually the smallest line in the budget. Leads themselves, your phone numbers and your time cost far more. Track cost per conversation and cost per sale, not just cost per minute.",
        ],
      },
    ],
    keyTakeaways: [
      "Outbound calls cost $0.025 per started minute.",
      "Answering machine detection hangs up on voicemail quickly to keep billed minutes down.",
      "1,000 dials at a 10% answer rate with 5-minute talks is roughly $12.50 to $15.",
      "Talk time drives the bill; measure cost per conversation and per sale.",
    ],
    faq: [
      {
        question: "Is there a monthly dialer fee?",
        answer:
          "The Text2Sale Dialer plan is $89.99 per user per month, or $119.99 for Complete with texting included. Calling minutes are paid separately from your prepaid wallet, and phone numbers are $1.50 per month each.",
      },
      {
        question: "What happens if my wallet runs out mid-call?",
        answer:
          "Each minute is paid as it starts. If the wallet cannot cover the next minute, the call ends, and the dialer pauses until you add funds.",
      },
    ],
    relatedSlugs: ["dialer-metrics-contact-rate-talk-time", "transfer-dialer-call-to-cell-phone", "answering-machine-detection-explained"],
  },
  {
    slug: "importing-lead-lists-into-a-dialer",
    metaTitle: "Importing Lead Lists Into a Dialer (CSV Tips) | Text2Sale",
    title: "Importing lead lists into a dialer: CSV tips that save hours",
    description:
      "How to prepare a CSV of leads for dialing: phone columns, states for calling hours, duplicates, and choosing which list the dialer works through.",
    excerpt:
      "A dialer is only as good as its list. Here is how to prepare and import a CSV so every number is dialable.",
    tags: ["Dialer", "Lead management", "Getting started"],
    intro: [
      "Lead vendors export CSV files in every shape imaginable. Phone numbers sit in columns called Phone, Mobile, Business or Home; states are abbreviated or spelled out; the same person appears three times.",
      "Ten minutes of preparation before you import saves hours of dialing bad numbers.",
    ],
    sections: [
      {
        heading: "Phone numbers can live in any column",
        paragraphs: [
          "Many exports have several phone columns, and the number is in whichever one the vendor filled. When you pick a CSV to dial in Text2Sale, the dialer scans every column for US phone numbers, so a number under Business or Mobile is still found. Numbers in any common format, with or without dashes, parentheses or a leading 1, are recognized.",
        ],
      },
      {
        heading: "Include the state",
        paragraphs: [
          "Calling hours are enforced in each lead's own time zone, based on their state. Leads without a state are assumed to be on Eastern time. Map the state column on import so every contact carries it.",
        ],
      },
      {
        heading: "Clean before you upload",
        bullets: [
          "Remove duplicates by phone number",
          "Scrub against the National Do Not Call Registry",
          "Drop rows with obviously fake numbers (555-555-5555, all zeros)",
          "Keep the lead source and date so you can judge list quality later",
        ],
        paragraphs: [
          "Text2Sale skips contacts marked Do Not Call and anyone dialed in the last 24 hours, but it cannot tell whether a purchased lead consented to calls. That is on the list's source.",
        ],
      },
      {
        heading: "Dial one file at a time",
        paragraphs: [
          "Each upload stays selectable on its own. Choosing a single CSV file in the dialer's Leads to call menu works through just those leads, so you can compare how lists perform and keep fresh leads separate from aged ones.",
        ],
      },
    ],
    keyTakeaways: [
      "The dialer finds phone numbers in any column of your CSV.",
      "Import the state so calling hours are correct.",
      "Deduplicate and scrub before uploading.",
      "Dial one file at a time to compare list quality.",
    ],
    faq: [
      {
        question: "Does importing leads cost anything?",
        answer: "Importing leads into Text2Sale costs $0.015 per lead.",
      },
      {
        question: "Can I dial a list I imported for texting?",
        answer: "Yes. Campaign lists and uploaded files are both available in the dialer.",
      },
    ],
    relatedSlugs: ["cleaning-phone-numbers-before-import", "dialer-calling-hours-by-time-zone", "do-not-call-scrubbing-for-dialer-campaigns"],
  },
  {
    slug: "dialer-metrics-contact-rate-talk-time",
    metaTitle: "Dialer Metrics: Contact Rate, Talk Time and Abandon Rate | Text2Sale",
    title: "Dialer metrics that matter: contact rate, talk time and abandon rate",
    description:
      "Which numbers to watch on a dialer, what good looks like, and how to use them to fix lists, pacing and scripts.",
    excerpt:
      "A dialer generates a lot of numbers. Here are the handful that tell you whether a session is working.",
    tags: ["Dialer", "Predictive dialer", "Sales teams"],
    intro: [
      "Dialing all day feels productive. The numbers tell you whether it was. A few metrics explain almost everything about a dialer session: how many people you reached, how long you talked, and how many calls you abandoned.",
    ],
    sections: [
      {
        heading: "Contact rate",
        paragraphs: [
          "Contact rate is conversations divided by dials. Text2Sale's live view shows Dialed and Talked to side by side. A low contact rate usually means an old or low-quality list, spam labels on your caller ID, or calling at the wrong time of day.",
        ],
      },
      {
        heading: "Voicemail and no-answer counts",
        paragraphs: [
          "High voicemail counts mean you are reaching real phones at bad times; try other hours. High no-answer or failed counts point to bad numbers. Comparing these across uploaded files tells you which lead sources are worth buying again.",
        ],
      },
      {
        heading: "Abandoned calls and the 30-day rate",
        paragraphs: [
          "Every abandoned call is a person who answered and did not reach you. The dialer shows the session count and your 30-day abandoned rate against the 3% limit. If it is climbing, use fewer lines or let pacing choose.",
        ],
      },
      {
        heading: "Talk time and conversations per hour",
        paragraphs: [
          "The point of a dialer is talk time. Conversations per hour and minutes talked per hour are the clearest productivity measures. Pair them with outcomes: Interested and Call back dispositions per hour tell you whether the conversations are good ones.",
        ],
        bullets: [
          "Dialed, talked to, voicemail, no answer, abandoned, left to dial",
          "30-day abandoned rate (keep under 3%)",
          "Interested and callback outcomes per hour",
        ],
      },
    ],
    keyTakeaways: [
      "Contact rate shows list and caller ID health.",
      "Voicemail and no-answer counts help judge lead sources.",
      "Keep the 30-day abandoned rate well under 3%.",
      "Measure talk time and good outcomes per hour.",
    ],
    faq: [
      {
        question: "What contact rate should I expect?",
        answer:
          "Fresh inbound leads may reach 15% to 30%; aged purchased lists are often under 5%. Your own history is the best benchmark.",
      },
      {
        question: "Where do I see these numbers?",
        answer: "On the dialer's live view during a session, with the 30-day abandoned rate shown underneath.",
      },
    ],
    relatedSlugs: ["sales-rep-texting-kpis", "how-predictive-dialer-pacing-works", "dialer-call-dispositions-that-drive-follow-up"],
  },
  {
    slug: "calling-aged-health-insurance-leads-with-a-dialer",
    metaTitle: "Calling Aged Health Insurance Leads With a Dialer | Text2Sale",
    title: "Calling aged health insurance leads with a dialer",
    description:
      "Aged health insurance leads are cheap but hard to reach. How to dial them efficiently, what to say, and how to follow up when they do not answer.",
    excerpt:
      "Aged leads answer rarely, which is exactly where a predictive dialer earns its keep. Here is how to work them.",
    tags: ["Predictive dialer", "Health insurance", "Lead management"],
    intro: [
      "Aged leads are people who asked about health insurance weeks or months ago. Many bought coverage elsewhere; some never did; some have had a life change since. They cost a fraction of fresh leads, and most agents give up on them after one or two tries.",
      "With a predictive dialer, the low answer rate stops being a time sink, and the leads that do answer are often still shopping.",
    ],
    sections: [
      {
        heading: "Set expectations",
        paragraphs: [
          "Expect low contact rates, often a few percent. That is fine: the dialer skips the unanswered calls and voicemails, and you only spend time on the people who pick up. Use two or three lines on these lists and let pacing manage abandoned calls.",
        ],
      },
      {
        heading: "Lead with a reason to talk now",
        paragraphs: [
          "Aged leads do not remember filling out a form. Remind them briefly and give a reason the call is relevant today: open enrollment, a special enrollment period after a move or job change, or a quick check that their current plan still fits.",
          "'Hi Tom, this is Sarah with Johnson Health Quotes. A while back you looked into health coverage. Open enrollment starts November 1, and I'm checking in to see if you're set for next year.'",
        ],
      },
      {
        heading: "Respect the no",
        paragraphs: [
          "Some aged leads will be annoyed. Apologize, offer to remove them, and mark Do not call if they ask. One polite exchange protects your number's reputation more than any script.",
        ],
      },
      {
        heading: "Follow up with text",
        paragraphs: [
          "Most aged leads will not answer the first call. A short, compliant text afterward, for those who agreed to receive texts, reaches people who screen calls. Keep it human and give them a reason to reply.",
        ],
      },
    ],
    keyTakeaways: [
      "Aged leads answer rarely; predictive dialing makes that affordable.",
      "Give a reason the call matters now, such as open enrollment.",
      "Honor stop requests immediately.",
      "Follow unanswered calls with a short text where you have consent.",
    ],
    faq: [
      {
        question: "Can I call aged leads that are on the Do Not Call Registry?",
        answer:
          "Only if an exemption applies, such as a recent inquiry within the allowed window or written permission. Scrub aged lists before dialing.",
      },
      {
        question: "How often should I redial them?",
        answer:
          "Text2Sale waits at least 24 hours before dialing the same number again. A few attempts spread over a couple of weeks is usually enough.",
      },
    ],
    relatedSlugs: ["predictive-dialer-for-health-insurance-agents", "redial-strategy-how-often-to-call-a-lead", "open-enrollment-dialer-strategy"],
    relatedPages: [{ href: "/health-insurance-texting-crm", label: "Health insurance CRM" }],
  },
  {
    slug: "open-enrollment-dialer-strategy",
    metaTitle: "Open Enrollment Dialer Strategy for Health Agents | Text2Sale",
    title: "An open enrollment dialer strategy for health insurance agents",
    description:
      "Open enrollment compresses a year of selling into a few weeks. How to plan dialer campaigns before, during and after ACA open enrollment.",
    excerpt:
      "Open enrollment is the busiest season of the year. Here is how to plan your dialing around it.",
    tags: ["Predictive dialer", "Health insurance", "Dialer"],
    intro: [
      "For agents selling under-65 health insurance, the ACA open enrollment period is when most of the year's policies get written. On HealthCare.gov it runs from November 1 to January 15, and plans picked by December 15 start on January 1. Some state exchanges use different dates.",
      "The agents who do best plan their calling before November, not during it.",
    ],
    sections: [
      {
        heading: "September and October: build and clean lists",
        paragraphs: [
          "Gather last year's clients, past applicants who did not enroll, and aged leads. Deduplicate, scrub against the Do Not Call Registry, and upload each group as its own file so you can dial them separately.",
        ],
      },
      {
        heading: "Early November: clients first",
        paragraphs: [
          "Call existing clients before anyone else does. Their plans and subsidies may change for the new year, and a check-in call keeps them with you. Use a single line for client calls; these are relationships, not volume.",
        ],
      },
      {
        heading: "November to mid-December: volume",
        paragraphs: [
          "This is when predictive dialing on aged leads and past applicants pays off. Mention the December 15 deadline for January 1 coverage. Dial across time zones through the day, starting east and moving west.",
        ],
        bullets: [
          "Mornings: Eastern and Central leads",
          "Afternoons: Mountain and Pacific leads",
          "Evenings: callbacks and Interested follow-ups",
        ],
      },
      {
        heading: "After December 15 and January",
        paragraphs: [
          "Remaining prospects can still enroll until January 15 for coverage starting February 1 on HealthCare.gov. After that, only people with a qualifying life event can enroll, so note life changes in your call notes for special enrollment follow-ups.",
        ],
      },
    ],
    keyTakeaways: [
      "HealthCare.gov open enrollment runs November 1 to January 15.",
      "Enrollment by December 15 means coverage starts January 1.",
      "Call existing clients first, then dial aged lists for volume.",
      "Note life events for special enrollment follow-up.",
    ],
    faq: [
      {
        question: "Do state exchanges use the same dates?",
        answer:
          "Not always. Several state-based exchanges extend open enrollment. Check the dates for the states you sell in.",
      },
      {
        question: "Should I dial on weekends?",
        answer:
          "Weekend calling can work during open enrollment, within legal hours and any state limits. Keep the same local-time rules.",
      },
    ],
    relatedSlugs: ["calling-aged-health-insurance-leads-with-a-dialer", "predictive-dialer-for-health-insurance-agents", "dialer-calling-hours-by-time-zone"],
    relatedPages: [{ href: "/health-insurance-texting-crm", label: "Health insurance CRM" }],
    sources: [{ href: "https://www.healthcare.gov/quick-guide/dates-and-deadlines/", label: "HealthCare.gov dates and deadlines" }],
  },
  {
    slug: "transfer-dialer-call-to-cell-phone",
    metaTitle: "Transfer a Dialer Call to Your Cell Phone | Text2Sale",
    title: "Transferring a live dialer call to your cell phone",
    description:
      "Sometimes a great call needs to leave your desk. How transferring a dialer call to your cell works, what it costs, and when to use it.",
    excerpt:
      "When a call is going well and you need to move, transfer it to your cell. Here is how it works.",
    tags: ["Dialer", "Calling", "Predictive dialer"],
    intro: [
      "A predictive dialer ties you to your desk. That is fine until the best call of the day runs long and you need to leave, or your headset battery dies mid-sentence.",
      "Transferring the call to your cell phone keeps the conversation going without asking the lead to call you back.",
    ],
    sections: [
      {
        heading: "How it works",
        paragraphs: [
          "During a connected call in Text2Sale, enter your cell number and click Transfer to my cell. The lead's call is moved to your cell, which shows your business number. When you answer, the browser drops off and the conversation continues on your phone.",
          "If you have a transfer number saved on your account, the cell box fills itself in.",
        ],
      },
      {
        heading: "Your dialer keeps going",
        paragraphs: [
          "After the transfer, the dialer moves you to wrap-up. Pick a disposition and Save and dial next when you are ready; the transferred call stays up on your cell. Avoid Hang up and dial next for that lead, so you do not end the call you just moved.",
        ],
      },
      {
        heading: "What it costs",
        paragraphs: [
          "A transferred call has two phone legs open, the lead's and your cell's, so it is billed at twice the outbound rate: $0.05 per minute instead of $0.025. Use it for calls that matter, not as a default way of talking.",
        ],
        bullets: [
          "Long calls you need to take on the move",
          "Headset or computer problems mid-call",
          "Leads who want to keep talking after hours",
        ],
      },
      {
        heading: "Passing calls to a teammate instead",
        paragraphs: [
          "If the call should go to someone else, use Send to your teammate instead. It rings their browser phone if they are on the dialer, or their saved cell, and comes back to you if they do not answer.",
        ],
      },
    ],
    keyTakeaways: [
      "Transfer to my cell moves a live dialer call to your phone.",
      "Your dialer keeps going while the call continues.",
      "Transferred calls bill at twice the outbound rate.",
      "Use Send to a teammate to pass a call to someone else.",
    ],
    faq: [
      {
        question: "What does the lead see?",
        answer: "Nothing changes for them. They stay on the same call while it moves.",
      },
      {
        question: "What if I do not answer my cell?",
        answer: "If your cell does not answer, the call ends, so only transfer when you can pick up.",
      },
    ],
    relatedSlugs: ["sharing-dialer-calls-across-a-team", "dialer-cost-per-minute-budgeting", "browser-calling-vs-desk-phone"],
  },
  {
    slug: "sharing-dialer-calls-across-a-team",
    metaTitle: "Sharing Dialer Calls Across a Small Team | Text2Sale",
    title: "Sharing dialer calls across a small team",
    description:
      "When one agent is busy, the next live answer should go to a teammate, not be abandoned. How call sharing, hand-offs and overflow work for small dialing teams.",
    excerpt:
      "Two agents on two dialers can still lose calls when one is busy. Call sharing fixes that.",
    tags: ["Predictive dialer", "Sales teams", "Dialer"],
    intro: [
      "Small agencies often run two or three agents, each on their own dialer with their own leads. Every so often, a lead answers on one agent's dialer while that agent is already talking, and the call is abandoned, even though a teammate is sitting idle.",
      "Sharing calls across the team turns those moments into conversations.",
    ],
    sections: [
      {
        heading: "Busy agent, free teammate",
        paragraphs: [
          "With call sharing on in Text2Sale, when a lead answers and their agent is busy, the dialer puts the call through to a teammate who is waiting on their own dialer. The teammate's browser picks it up immediately, so the lead hears a person instead of the abandoned-call message.",
          "The teammate's dialer pauses for the call and resumes where it left off when it ends.",
        ],
      },
      {
        heading: "Passing a call by hand",
        paragraphs: [
          "Sometimes the right person for a call is someone else: a licensed agent for a state you do not cover, or a teammate who handles Spanish speakers. Send to a teammate rings their browser if they are free on the dialer, or their saved cell otherwise. If nobody picks up within 20 seconds, the call comes back to you.",
        ],
      },
      {
        heading: "Incoming calls while you dial",
        paragraphs: [
          "Leads call back. If the account owner is busy on the dialer, incoming calls to the business numbers can ring a teammate instead of going straight to voicemail or the AI receptionist.",
        ],
        bullets: [
          "Extra live answers go to a free teammate instead of being abandoned",
          "Any agent can pass a live call to a teammate",
          "Incoming calls can overflow to a teammate while the owner dials",
        ],
      },
      {
        heading: "Billing and records stay simple",
        paragraphs: [
          "Shared calls stay on the original lead's record and are billed to the same wallet at the same rate, so moving a call between teammates does not change what it costs unless it goes to a cell.",
        ],
      },
    ],
    keyTakeaways: [
      "Call sharing sends extra live answers to a free teammate.",
      "Agents can pass a live call to a teammate by hand.",
      "Incoming calls can overflow to a teammate while the owner dials.",
      "Records and billing stay with the original call.",
    ],
    faq: [
      {
        question: "Does the teammate have to be dialing?",
        answer:
          "For automatic sharing, yes: they must be waiting on their own dialer so the call connects instantly. For a manual hand-off, a saved cell number works too.",
      },
      {
        question: "Does sharing count against the abandoned-call limit?",
        answer:
          "A shared call that a teammate answers is a connected call, not an abandoned one. That is the point.",
      },
    ],
    relatedSlugs: ["inbound-callbacks-from-dialer-campaigns", "transfer-dialer-call-to-cell-phone", "predictive-dialer-abandoned-call-rule-3-percent"],
    relatedPages: [{ href: "/sales-team-texting-crm", label: "Calling and texting for sales teams" }],
  },
  {
    slug: "inbound-callbacks-from-dialer-campaigns",
    metaTitle: "Handling Inbound Callbacks From Dialer Campaigns | Text2Sale",
    title: "Handling the callbacks your dialer campaigns create",
    description:
      "Every dialer campaign creates callbacks from missed calls and abandoned-call messages. How to answer them: browser ringing, forwarding, a teammate, or an AI receptionist.",
    excerpt:
      "Dialing hundreds of people means many will call you back. Here is how to make sure someone answers.",
    tags: ["Dialer", "Calling", "Missed calls"],
    intro: [
      "When you dial hundreds of people, many see a missed call and ring back, often while you are in the middle of another conversation. Those callbacks are warm: the person chose to call you. Letting them hit an unanswered line wastes the best leads your campaign produced.",
    ],
    sections: [
      {
        heading: "Ring your browser",
        paragraphs: [
          "When you have the Calling page open and are not on another call, inbound calls to your business numbers can ring your browser phone, showing the caller's number so you can answer.",
        ],
      },
      {
        heading: "Forward to your cell",
        paragraphs: [
          "Call forwarding sends incoming calls to your cell when you are away from the computer. The forwarded call shows your business number, so you know it is a work call.",
        ],
      },
      {
        heading: "Overflow to a teammate",
        paragraphs: [
          "If you are busy on the dialer and have call sharing on, an incoming call can ring a teammate's browser phone instead. If they do not answer within 20 seconds, the next option takes over.",
        ],
      },
      {
        heading: "Let the AI receptionist answer",
        paragraphs: [
          "An AI receptionist answers in your business's name, finds out what the caller needs, and can transfer to you or take a message. It costs $0.18 per minute and can run all day or only after hours.",
        ],
        bullets: [
          "Browser ringing when you are free",
          "Forwarding to your cell when you are away",
          "A teammate when you are busy dialing",
          "An AI receptionist as the safety net",
        ],
      },
    ],
    keyTakeaways: [
      "Callbacks from dialer campaigns are warm leads; answer them.",
      "Ring your browser, forward to your cell, or overflow to a teammate.",
      "An AI receptionist catches calls nobody else can take.",
      "Make the abandoned-call callback number one that gets answered.",
    ],
    faq: [
      {
        question: "Which number do people call back?",
        answer:
          "The business number the dialer called them from, which is also the number read out in the abandoned-call message.",
      },
      {
        question: "Can a missed callback get a text?",
        answer:
          "Yes. A quick text after a missed call is one of the cheapest ways to recover it.",
      },
    ],
    relatedSlugs: ["missed-call-text-back", "ai-phone-receptionist-small-business", "sharing-dialer-calls-across-a-team"],
  },
];

export const BLOG_POSTS_11: BlogPost[] = ARTICLES.map((article) => {
  const text = [article.title, ...article.intro,
    ...article.sections.flatMap((section) => [section.heading, ...section.paragraphs, ...(section.bullets || [])]),
    ...article.keyTakeaways, ...article.faq.flatMap((item) => [item.question, item.answer])].join(" ");
  return { ...article, datePublished: "2026-10-20", dateModified: "2026-10-20",
    readMinutes: Math.max(1, Math.ceil(text.split(/\s+/).length / 200)) };
});
