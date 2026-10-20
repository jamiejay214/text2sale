import type { BlogPost } from "./blog-posts";

type NewArticle = Omit<BlogPost, "datePublished" | "dateModified" | "readMinutes">;

// Volume 10: the dialer. What predictive dialing is, how pacing, answering
// machine detection and the 3% abandoned-call rule work, and how to set up
// lines, calling hours, caller ID and Do Not Call scrubbing. Volumes 11 and
// 12 continue the series (costs, workflows, teams, health insurance).
const ARTICLES: NewArticle[] = [
  {
    slug: "what-is-a-predictive-dialer",
    metaTitle: "What Is a Predictive Dialer? How It Works for Sales Teams | Text2Sale",
    title: "What is a predictive dialer and how does it work?",
    description:
      "A predictive dialer calls several leads at once and connects the first person who answers to an agent. How it works, who it suits, and the rules that apply.",
    excerpt:
      "A predictive dialer calls several leads at once and puts the first live answer through to you. Here is how it works and when it makes sense.",
    tags: ["Predictive dialer", "Dialer", "Calling"],
    intro: [
      "Most of an agent's day on the phone is not spent talking. It is spent dialing, listening to rings, reaching voicemail, and hanging up on numbers that were disconnected years ago. On a typical consumer lead list, fewer than one in ten dials reaches a live person.",
      "A predictive dialer exists to take that dead time away. Instead of dialing one number and waiting, it dials several at once and only hands you the calls where a real person said hello.",
    ],
    sections: [
      {
        heading: "How a predictive dialer works",
        paragraphs: [
          "When you click Ready, the dialer places calls to more than one lead at the same time. Each call is watched as it rings. Calls that go unanswered, hit a busy signal or reach an answering machine are dropped automatically. The first call a person answers is connected to your headset, usually within a second or two of the person saying hello.",
          "While you talk, the dialer waits. When you finish and save the outcome of the call, it starts dialing the next batch. You spend your time in conversations rather than in ringing.",
        ],
      },
      {
        heading: "Why it is called predictive",
        paragraphs: [
          "The dialer has to guess how many numbers to call at once. Dial too few and you sit waiting. Dial too many and two people may answer at the same moment, leaving one of them with nobody on the line. A good predictive dialer watches how often people on your list actually answer and adjusts the number of lines to match, which is the prediction in its name.",
          "In Text2Sale, the dialer starts a new list on a single line and adds lines only as the live-answer rate shows it is safe, up to three at once.",
        ],
      },
      {
        heading: "What happens when two people answer",
        paragraphs: [
          "Sometimes two leads pick up together. The second person cannot be connected because you are already talking. That is called an abandoned call, and telemarketing rules limit how often it can happen. A compliant dialer plays a short recorded message that says who called, gives a callback number and offers a way to opt out of future calls.",
        ],
      },
      {
        heading: "Who a predictive dialer is for",
        paragraphs: [
          "Predictive dialing pays off when you have a large list and a low answer rate: internet leads, aged leads, re-engagement lists and renewal campaigns. Insurance agents, mortgage brokers, solar and home-services teams and appointment setters are typical users.",
          "If you only make a handful of calls a day, or every call needs research before you dial, a power or preview dialer that calls one number at a time is usually a better fit.",
        ],
        bullets: [
          "Large lists where most calls go unanswered",
          "Agents who want more conversations per hour",
          "Teams that already have consent to call their leads",
        ],
      },
    ],
    keyTakeaways: [
      "A predictive dialer calls several leads at once and connects only live answers.",
      "It adjusts the number of lines to how often people on your list pick up.",
      "When two people answer, the extra call is abandoned and must get a recorded message.",
      "It suits large, low-answer-rate lists more than small, research-heavy ones.",
    ],
    faq: [
      {
        question: "Is a predictive dialer the same as a robocall?",
        answer:
          "No. A predictive dialer connects answered calls to a live agent. A robocall plays a recorded message instead of connecting a person. The only recorded audio a compliant predictive dialer plays is the short abandoned-call message when no agent is free.",
      },
      {
        question: "Do I need special phones to use one?",
        answer:
          "Not with Text2Sale. The dialer runs in your web browser with a headset, and calls go out from your business numbers.",
      },
    ],
    relatedSlugs: ["predictive-vs-power-vs-preview-dialer", "how-predictive-dialer-pacing-works", "predictive-dialer-abandoned-call-rule-3-percent"],
    relatedPages: [{ href: "/insurance-agents", label: "Text2Sale for insurance agents" }],
  },
  {
    slug: "predictive-vs-power-vs-preview-dialer",
    metaTitle: "Predictive vs Power vs Preview Dialer: Which to Use? | Text2Sale",
    title: "Predictive vs power vs preview dialer: which one should you use?",
    description:
      "The three main dialer types trade speed against control. Compare predictive, power and preview dialing, their compliance risk, and the kind of team each one fits.",
    excerpt:
      "Predictive, power and preview dialers all save time, but in different ways. Here is how they compare and how to pick the right mode.",
    tags: ["Predictive dialer", "Power dialer", "Dialer"],
    intro: [
      "Dialer software comes in three basic flavors, and vendors use the names loosely. Knowing the difference helps you pick the right mode for each list instead of running everything at maximum speed.",
      "The trade-off is always the same: the more numbers you dial at once, the more conversations you get per hour, and the higher the chance a lead answers with nobody ready to talk.",
    ],
    sections: [
      {
        heading: "Preview dialing: look first, then call",
        paragraphs: [
          "A preview dialer shows you the lead's record before it dials. You read the notes, decide whether to call and then click to dial. It is the slowest mode, but it never abandons a call, and it works well for warm leads, referrals and high-value prospects where preparation matters more than volume.",
        ],
      },
      {
        heading: "Power dialing: one line, no gaps",
        paragraphs: [
          "A power dialer calls one number at a time and moves straight to the next one as soon as the previous call ends. You skip the manual dialing and the pause between calls, but you still hear every ring. Because it only dials one number for one agent, a power dialer does not create abandoned calls.",
          "In Text2Sale, setting Lines at once to 1 turns the predictive dialer into a power dialer.",
        ],
      },
      {
        heading: "Predictive dialing: several lines, live answers only",
        paragraphs: [
          "A predictive dialer calls several numbers at once and connects only the calls a person answers. Answering machines, no-answers and busy signals never reach you. On lists where only a few percent of dials are answered, this can multiply your talk time.",
          "The cost is the risk of abandoned calls, which federal rules cap at 3% of answered calls per campaign over 30 days. A predictive dialer needs pacing that watches that number.",
        ],
      },
      {
        heading: "How to choose",
        paragraphs: [
          "Match the mode to the list, not to your mood. Fresh, high-intent leads that just asked for a quote deserve a preview or power call so nothing is lost. Big aged lists with low answer rates are where predictive dialing earns its keep.",
        ],
        bullets: [
          "Preview: referrals, callbacks, high-value prospects",
          "Power (1 line): fresh leads, small lists, careful compliance",
          "Predictive (2 to 3 lines): large aged lists with low answer rates",
        ],
      },
    ],
    keyTakeaways: [
      "Preview dialing is slowest and safest; predictive is fastest and needs pacing.",
      "Power dialing removes manual dialing without creating abandoned calls.",
      "Predictive dialing shines on large lists where few people answer.",
      "Pick the mode per list based on lead value and answer rate.",
    ],
    faq: [
      {
        question: "Can I switch between modes?",
        answer:
          "Yes. In Text2Sale you choose the number of lines each time you start the dialer: 1 for power dialing, or up to 2 or 3 for predictive dialing.",
      },
      {
        question: "Which mode gets the most conversations?",
        answer:
          "Predictive dialing, on lists with low answer rates. On lists where many people answer, extra lines mostly create abandoned calls, so a single line can actually perform better.",
      },
    ],
    relatedSlugs: ["what-is-a-predictive-dialer", "how-many-lines-should-a-predictive-dialer-dial", "power-dialer-back-to-back-leads"],
    relatedPages: [{ href: "/sales-team-texting-crm", label: "Calling and texting for sales teams" }],
  },
  {
    slug: "how-predictive-dialer-pacing-works",
    metaTitle: "How Predictive Dialer Pacing Works | Text2Sale",
    title: "How predictive dialer pacing works",
    description:
      "Pacing decides how many numbers a predictive dialer calls at once. How answer rates set the line count and how pacing protects the 3% abandoned-call limit.",
    excerpt:
      "Pacing is the brain of a predictive dialer. Here is how it uses your list's answer rate to decide how many lines to dial.",
    tags: ["Predictive dialer", "Dialer", "Compliance"],
    intro: [
      "Every predictive dialer has to answer one question before each batch of calls: how many numbers should I dial right now? That decision is called pacing, and it determines both how productive the dialer is and how many calls it abandons.",
      "Good pacing is not a fixed setting. It is a calculation that changes as the dialer learns how your list behaves.",
    ],
    sections: [
      {
        heading: "The answer rate drives everything",
        paragraphs: [
          "The key number is the live-answer rate: the share of dials that reach a real person rather than voicemail, a busy signal or endless ringing. If 3% of dials are answered by people, calling three numbers at once rarely produces two answers. If 30% are answered, calling three at once would frequently leave someone with nobody on the line.",
          "Pacing estimates the chance that more than one person answers in the same batch, and from that, the share of answered calls that would be abandoned. It picks the largest number of lines that keeps that expected rate comfortably under the legal limit.",
        ],
      },
      {
        heading: "Why a new list starts on one line",
        paragraphs: [
          "When you start a list, the dialer does not yet know its answer rate. Guessing high could abandon calls right away. Text2Sale's dialer starts on one line and adds lines once enough dials show that few people on the list pick up.",
        ],
      },
      {
        heading: "The 30-day brake",
        paragraphs: [
          "The rule that matters is the abandonment rate over the last 30 days, not just the current session. Text2Sale tracks it continuously and drops back to a single line when the 30-day rate nears 3%, until enough connected calls bring it back down.",
        ],
        bullets: [
          "Target well below 3% so one busy afternoon does not push you over",
          "Count every abandoned call, including ones during the agent's breaks",
          "Review the 30-day number shown on the dialer each week",
        ],
      },
      {
        heading: "When to override pacing",
        paragraphs: [
          "Text2Sale lets an agent choose to always dial the maximum number of lines. It is useful on lists where you already know almost nobody answers, but it skips the safety pacing, and the dialer warns you about the FTC limit when you turn it on. If the abandoned count on your screen starts climbing, turn it off.",
        ],
      },
    ],
    keyTakeaways: [
      "Pacing sets the number of lines from the list's live-answer rate.",
      "New lists start on one line until the answer rate is known.",
      "The 30-day abandonment rate acts as a brake on extra lines.",
      "Forcing maximum lines skips that safety; watch your abandoned count.",
    ],
    faq: [
      {
        question: "What is a good live-answer rate?",
        answer:
          "It depends on the list. Fresh inbound leads may answer 15% to 30% of the time; aged lists are often in the low single digits. The lower the rate, the more lines a predictive dialer can safely use.",
      },
      {
        question: "Does pacing slow me down?",
        answer:
          "Only when it needs to. On low-answer lists pacing adds lines quickly; on high-answer lists it holds back because extra lines would mostly create abandoned calls.",
      },
    ],
    relatedSlugs: ["predictive-dialer-abandoned-call-rule-3-percent", "how-many-lines-should-a-predictive-dialer-dial", "what-is-a-predictive-dialer"],
  },
  {
    slug: "predictive-dialer-abandoned-call-rule-3-percent",
    metaTitle: "The 3% Abandoned Call Rule for Predictive Dialers | Text2Sale",
    title: "The 3% abandoned call rule for predictive dialers, explained",
    description:
      "Federal rules cap abandoned calls at 3% of answered calls per campaign over 30 days. What counts as abandoned, what the message must say, and how to comply.",
    excerpt:
      "Predictive dialers can abandon calls, and the law caps how often. Here is the 3% rule in plain language.",
    tags: ["Predictive dialer", "Compliance", "TCPA"],
    intro: [
      "When a predictive dialer reaches two people at once and only one agent is free, the second call is abandoned. Both the Federal Trade Commission's Telemarketing Sales Rule and the FCC's rules under the Telephone Consumer Protection Act limit how often that can happen on sales calls.",
      "This is a plain-language summary, not legal advice. Have counsel review your calling program, especially if you sell regulated products.",
    ],
    sections: [
      {
        heading: "What counts as an abandoned call",
        paragraphs: [
          "A call is abandoned when a person answers and is not connected to a live sales representative within two seconds of finishing their greeting. A long silence followed by a hang-up, or a long silence before an agent finally says hello, can both count.",
        ],
      },
      {
        heading: "The 3% safe harbor",
        paragraphs: [
          "The rules give dialers a safe harbor if no more than 3% of calls answered by a person are abandoned, measured per campaign over a 30-day period. To stay inside it, the dialer must also let each number ring for at least 15 seconds or four rings before hanging up, keep records that show compliance, and play a recorded message on every abandoned call.",
        ],
        bullets: [
          "Abandoned calls at or under 3% of live answers, per campaign, per 30 days",
          "At least 15 seconds or four rings before an unanswered call is ended",
          "A recorded message within two seconds of the greeting on abandoned calls",
          "Records kept to show the rate",
        ],
      },
      {
        heading: "What the recorded message must include",
        paragraphs: [
          "The message has to say who is calling, on whose behalf, and give a phone number the person can call back. Under the FCC rule it must also include an automated way to opt out of future calls, such as pressing a key, and the callback number must lead to a way to opt out too.",
          "In Text2Sale the abandoned-call message names the agent and business, reads the callback number, and lets the person press 9 to be added to your Do Not Call list on the spot.",
        ],
      },
      {
        heading: "How to stay under the limit",
        paragraphs: [
          "Let pacing set the number of lines rather than forcing the maximum, keep your list clean so you are not dialing numbers where many people answer at once, and step away from the dialer with Pause rather than leaving it running. Check the 30-day rate the dialer shows before every session.",
        ],
      },
    ],
    keyTakeaways: [
      "An abandoned call is a live answer not connected to an agent within two seconds.",
      "The safe harbor caps abandonment at 3% of answered calls per campaign over 30 days.",
      "Every abandoned call needs a recorded message with identification, a callback number and an opt-out.",
      "Let pacing manage lines and monitor the 30-day rate.",
    ],
    faq: [
      {
        question: "Does the 3% rule apply to calls to existing customers?",
        answer:
          "The rules focus on telemarketing calls. Calls that are purely informational may be treated differently, but many calls to existing customers include a sales pitch. Ask counsel how the rules apply to your calls.",
      },
      {
        question: "Does a power dialer abandon calls?",
        answer:
          "Not when it dials one number per available agent, because there is always someone ready when a person answers.",
      },
    ],
    relatedSlugs: ["how-predictive-dialer-pacing-works", "predictive-dialer-compliance-checklist", "do-not-call-scrubbing-for-dialer-campaigns"],
    relatedPages: [{ href: "/10dlc-compliant-texting", label: "Compliance for business texting" }],
    sources: [
      { href: "https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-310", label: "FTC Telemarketing Sales Rule, 16 CFR Part 310" },
      { href: "https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-64/subpart-L/section-64.1200", label: "FCC rule 47 CFR 64.1200" },
    ],
  },
  {
    slug: "answering-machine-detection-explained",
    metaTitle: "Answering Machine Detection (AMD) for Dialers Explained | Text2Sale",
    title: "Answering machine detection: how dialers skip voicemail",
    description:
      "Answering machine detection lets a dialer tell people from voicemail. Learn how AMD works, why it is never perfect, and how it saves agents time and money.",
    excerpt:
      "AMD is how a dialer keeps voicemail greetings away from your headset. Here is how it works and where it falls short.",
    tags: ["Predictive dialer", "Dialer", "Calling"],
    intro: [
      "On many lead lists, more calls reach voicemail than reach people. Without answering machine detection, an agent would hear every one of those greetings, wait for the beep and hang up, dozens of times an hour.",
      "Answering machine detection, usually shortened to AMD, listens to the first moments of each answered call and decides whether a person or a machine picked up.",
    ],
    sections: [
      {
        heading: "How AMD decides",
        paragraphs: [
          "People usually answer with a short greeting, like 'Hello?', and then pause, waiting for a reply. Voicemail greetings tend to be longer and continuous: 'Hi, you've reached Maria, I can't come to the phone right now...' AMD measures the length of the first burst of speech and the silence after it, and listens for beeps and fax tones.",
          "If it hears a person, the call goes to the agent. If it hears a machine, the dialer hangs up and moves on.",
        ],
      },
      {
        heading: "Why it is never perfect",
        paragraphs: [
          "Some people answer with a long greeting, and some voicemail greetings are just a name. Background noise can confuse detection too. Every AMD system makes some mistakes in both directions.",
          "When detection is unsure, Text2Sale treats the call as a person and connects it. A few seconds of voicemail in your ear is a smaller problem than dead air for a real person who said hello.",
        ],
      },
      {
        heading: "What AMD saves",
        paragraphs: [
          "Skipping machines saves agent time, and in Text2Sale it also saves money: calls detected as voicemail are marked as voicemail on your stats and are not billed. Your live view shows how many dials went to voicemail, so you can see how much of a list is unreachable.",
        ],
        bullets: [
          "Agents only hear calls a person answered",
          "Voicemail-detected calls are hung up and not charged",
          "Voicemail counts help you judge list quality",
        ],
      },
      {
        heading: "AMD and the abandoned-call rule",
        paragraphs: [
          "Detection takes a moment, and the clock for connecting a person to an agent starts when they finish their greeting. Detection that is too slow risks abandoned calls. Keep your browser phone ready so connected calls are picked up immediately.",
        ],
      },
    ],
    keyTakeaways: [
      "AMD listens to the start of a call to tell people from voicemail.",
      "It is never perfect; unsure calls are best treated as people.",
      "Voicemail-detected calls in Text2Sale are hung up and not billed.",
      "Fast pickup by the agent keeps AMD within the two-second rule.",
    ],
    faq: [
      {
        question: "Can the dialer leave a voicemail for me?",
        answer:
          "Not today. Text2Sale hangs up on machines so you can move on; following up with a text is a cheap way to reach people who did not answer.",
      },
      {
        question: "Why did I hear a voicemail greeting?",
        answer:
          "Detection was unsure and treated the call as a person. That is deliberate: it avoids leaving a real person in silence.",
      },
    ],
    relatedSlugs: ["what-is-a-predictive-dialer", "voicemail-vs-text-follow-up", "dialer-metrics-contact-rate-talk-time"],
  },
  {
    slug: "predictive-dialer-for-health-insurance-agents",
    metaTitle: "Predictive Dialer for Health Insurance Agents | Text2Sale",
    title: "A predictive dialer for health insurance agents",
    description:
      "How health insurance agents use a predictive dialer to work quote leads, aged leads and renewals: list setup, scripts, calling hours, compliance and costs.",
    excerpt:
      "Health insurance agents live on the phone. Here is how a predictive dialer fits the way they work leads.",
    tags: ["Predictive dialer", "Health insurance", "Dialer"],
    intro: [
      "Health insurance sales run on phone conversations. A prospect who filled out a quote form wants answers about premiums, networks and subsidies, and the agent who gets them on the phone first usually writes the policy.",
      "The challenge is reaching them. Quote leads are shared, aged leads stop answering, and agents can spend most of the day listening to rings. A predictive dialer turns that time into conversations.",
    ],
    sections: [
      {
        heading: "Which lists to dial",
        paragraphs: [
          "Fresh quote leads deserve an immediate call on a single line so none are abandoned. Aged leads, past applicants who never enrolled and last year's clients due for a review are where predictive dialing pays off, because answer rates are low and lists are long.",
          "In Text2Sale you pick exactly what to dial each session: one uploaded CSV file, a campaign list, or all your leads.",
        ],
      },
      {
        heading: "Open the call well",
        paragraphs: [
          "When the dialer connects you, you hear a soft beep and the lead's name, location and quote details appear on screen. Use them in your first sentence: who you are, why you are calling, and a question. 'Hi Dana, this is Sarah with Johnson Health Quotes. You asked about coverage for your family in Tampa. Do you have two minutes to look at options?'",
        ],
      },
      {
        heading: "Respect calling hours and consent",
        paragraphs: [
          "Leads span time zones. Text2Sale only dials each lead between 8 a.m. and 8 p.m. in their own state's time zone, skips anyone marked Do Not Call, and does not redial anyone it called in the last 24 hours. You are still responsible for having consent to call your leads and for scrubbing purchased lists against the National Do Not Call Registry.",
          "Medicare is different. CMS rules restrict unsolicited calls about Medicare Advantage and Part D plans, so do not run Medicare prospects through a cold-calling campaign.",
        ],
      },
      {
        heading: "What it costs",
        paragraphs: [
          "Text2Sale charges $0.025 per minute for outbound calls, billed per started minute from your prepaid wallet. Calls that reach voicemail are hung up and not charged. Unanswered calls cost nothing, so a thousand dials that reach a person about 10% of the time, with five-minute conversations, come to roughly 500 billed minutes, about $12.50 to $15 in calling.",
        ],
      },
    ],
    keyTakeaways: [
      "Use single-line dialing for fresh quote leads and predictive dialing for aged lists.",
      "Open with the lead's name, location and reason for the call.",
      "Calling hours, Do Not Call and 24-hour redial gaps are enforced per lead.",
      "Keep Medicare prospects out of cold-calling campaigns.",
    ],
    faq: [
      {
        question: "Can I also text these leads?",
        answer:
          "Yes. Text2Sale started as a texting CRM, so calls, texts and replies sit on the same contact record. A text after a missed call is a cheap second touch.",
      },
      {
        question: "What happens when a lead calls back?",
        answer:
          "Calls to your business numbers can be answered by your AI receptionist, forwarded to your cell or rung on your browser phone.",
      },
    ],
    relatedSlugs: ["calling-aged-health-insurance-leads-with-a-dialer", "open-enrollment-dialer-strategy", "medicare-calling-rules-for-dialers"],
    relatedPages: [{ href: "/health-insurance-texting-crm", label: "Health insurance CRM" }],
  },
  {
    slug: "how-many-lines-should-a-predictive-dialer-dial",
    metaTitle: "How Many Lines Should a Predictive Dialer Dial at Once? | Text2Sale",
    title: "How many lines should a predictive dialer dial at once?",
    description:
      "One, two or three lines? How to choose a dialer's line count from your answer rate, how many agents you have, and your abandoned-call budget.",
    excerpt:
      "More lines means more conversations, until it means more abandoned calls. Here is how to pick the right number.",
    tags: ["Predictive dialer", "Dialer", "Sales teams"],
    intro: [
      "The most common question new dialer users ask is how many lines to run. The honest answer is: it depends on how often people on your list pick up.",
      "Here is a simple way to think about it for a solo agent, where every extra line has to be justified by a low answer rate.",
    ],
    sections: [
      {
        heading: "One line: power dialing",
        paragraphs: [
          "One line means one call at a time. You never abandon a call, and you still skip manual dialing and voicemail. Use it for fresh leads, small lists and any list where a lot of people answer.",
        ],
      },
      {
        heading: "Two lines",
        paragraphs: [
          "Two lines roughly doubles your chances of reaching someone in each batch. If about 5% of dials are answered by people, the chance that both answer at once is small, and the expected abandonment rate stays well under 3%. Two lines is a good default for aged leads.",
        ],
      },
      {
        heading: "Three lines",
        paragraphs: [
          "Three lines only makes sense when very few people answer, roughly 3% of dials or less. At higher answer rates, three lines produces simultaneous answers often enough to push you over the limit.",
          "Text2Sale lets you choose up to 3 and lets pacing decide whether to use them. You can also tell it to always dial the maximum, which skips pacing; the dialer warns you about the 3% limit when you do.",
        ],
        bullets: [
          "Answer rate above 10%: one line",
          "Around 3% to 10%: two lines",
          "Under about 3%: up to three lines",
        ],
      },
      {
        heading: "Watch the numbers, not the feeling",
        paragraphs: [
          "Your live view shows dials, people talked to, voicemails, no-answers and abandoned calls. If abandoned calls climb, reduce lines. If you are waiting a long time between conversations and abandons are near zero, you have room to add one.",
        ],
      },
    ],
    keyTakeaways: [
      "The right line count depends on your list's live-answer rate.",
      "One line never abandons; two suits most aged lists; three needs very low answer rates.",
      "Let pacing choose within your maximum when possible.",
      "Adjust based on the abandoned count, not on how busy you feel.",
    ],
    faq: [
      {
        question: "Why not dial ten lines?",
        answer:
          "For a single agent, ten lines would produce simultaneous answers constantly, and nearly every extra answer would be abandoned. Line counts scale with the number of agents, not just with ambition.",
      },
      {
        question: "Does the line count change during a session?",
        answer:
          "With pacing on, yes. Text2Sale recalculates as results come in and shows how many lines it is using.",
      },
    ],
    relatedSlugs: ["how-predictive-dialer-pacing-works", "predictive-vs-power-vs-preview-dialer", "predictive-dialer-abandoned-call-rule-3-percent"],
  },
  {
    slug: "dialer-calling-hours-by-time-zone",
    metaTitle: "Dialer Calling Hours: Calling Leads in Their Own Time Zone | Text2Sale",
    title: "Calling hours for dialers: reaching leads in their own time zone",
    description:
      "Federal rules limit sales calls to 8 a.m. to 9 p.m. in the called person's local time, and some states are stricter. Here is how a dialer should handle time zones.",
    excerpt:
      "A 9 a.m. call in New York is a 6 a.m. call in California. Here is how a dialer keeps every call inside legal hours.",
    tags: ["Dialer", "Compliance", "TCPA"],
    intro: [
      "Calling hours are one of the easiest telemarketing rules to break by accident. Your list has leads in several time zones, you start dialing at 8:30 your time, and the first person who answers is still asleep three hours away.",
      "A dialer should solve this automatically, lead by lead, rather than relying on the agent to remember.",
    ],
    sections: [
      {
        heading: "What the rules say",
        paragraphs: [
          "The TCPA and the FTC's Telemarketing Sales Rule allow telephone solicitations only between 8 a.m. and 9 p.m. in the called person's local time. Several states set tighter windows; Florida, for example, limits sales calls to 8 a.m. to 8 p.m. and also restricts how many calls can be made to the same person about the same subject in 24 hours.",
          "This is general information, not legal advice. Check the rules in each state you call.",
        ],
      },
      {
        heading: "How Text2Sale handles it",
        paragraphs: [
          "The dialer looks at each lead's state and only dials them between 8 a.m. and 8 p.m. in that state's time zone. That stricter window works for most states without per-state configuration. Leads outside the window are skipped for that session and shown as skipped on your stats.",
        ],
        bullets: [
          "Hours are checked per lead, not per agent",
          "8 a.m. to 8 p.m. local time, stricter than the federal 9 p.m.",
          "Leads with no state are treated as Eastern time",
        ],
      },
      {
        heading: "Plan your day around time zones",
        paragraphs: [
          "Start the morning with Eastern and Central leads, move west as the day goes on, and finish with Pacific leads in your evening. Uploading separate lists by region makes this easier because you can choose which list to dial at each point in the day.",
        ],
      },
      {
        heading: "Keep addresses complete",
        paragraphs: [
          "Time zone detection depends on the lead having a state. When you import leads, map the state column so every contact carries it. A lead with no location is assumed to be on Eastern time, which may be wrong.",
        ],
      },
    ],
    keyTakeaways: [
      "Federal rules allow sales calls 8 a.m. to 9 p.m. in the lead's local time.",
      "Some states, such as Florida, are stricter.",
      "Text2Sale dials each lead only 8 a.m. to 8 p.m. in their state's time zone.",
      "Import the state column so time zones are detected correctly.",
    ],
    faq: [
      {
        question: "What about states with two time zones?",
        answer:
          "A few states span two time zones. Using the state's main zone and an 8 p.m. cutoff leaves a margin, but if you call heavily into those states, check local rules.",
      },
      {
        question: "Do calling hours apply to callbacks?",
        answer:
          "Returning a call the person asked for is generally treated differently from a cold solicitation, but keep returned calls at reasonable hours anyway.",
      },
    ],
    relatedSlugs: ["predictive-dialer-compliance-checklist", "do-not-call-scrubbing-for-dialer-campaigns", "importing-lead-lists-into-a-dialer"],
    sources: [{ href: "https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-64/subpart-L/section-64.1200", label: "FCC rule 47 CFR 64.1200" }],
  },
  {
    slug: "do-not-call-scrubbing-for-dialer-campaigns",
    metaTitle: "Do Not Call Scrubbing for Dialer Campaigns | Text2Sale",
    title: "Do Not Call scrubbing for dialer campaigns",
    description:
      "Before you dial a list, scrub it. How the National Do Not Call Registry, your internal Do Not Call list and press-9 opt-outs fit together in a dialer campaign.",
    excerpt:
      "A dialer can call hundreds of numbers an hour, so one bad list can create a lot of violations fast. Here is how to scrub.",
    tags: ["Dialer", "Compliance", "TCPA"],
    intro: [
      "A dialer multiplies whatever you feed it. A clean list produces more conversations; a list full of registered numbers produces complaints and legal exposure at the same speed.",
      "There are three layers of Do Not Call protection to manage, and they work together.",
    ],
    sections: [
      {
        heading: "Layer 1: the National Do Not Call Registry",
        paragraphs: [
          "Telemarketers must not call numbers on the National Do Not Call Registry unless an exemption applies, such as an established business relationship or the person's written permission. Sellers pay for access to the registry for the area codes they call and must scrub their lists against it at least every 31 days.",
          "Text2Sale does not scrub against the national registry for you. Scrub purchased or aged lists before uploading them.",
        ],
      },
      {
        heading: "Layer 2: your internal Do Not Call list",
        paragraphs: [
          "Anyone who asks you to stop calling must go on your own Do Not Call list, and stay there. In Text2Sale, marking a contact Do Not Call, either from the dialer's disposition buttons or the contact record, means the dialer will never call them again.",
        ],
      },
      {
        heading: "Layer 3: opt-outs on abandoned calls",
        paragraphs: [
          "When a predictive dialer abandons a call, the recorded message must offer an automated opt-out. In Text2Sale, a person who presses 9 during that message is added to your Do Not Call list immediately and hears a confirmation.",
        ],
        bullets: [
          "Scrub against the national registry at least every 31 days",
          "Honor every stop request, from any channel, permanently",
          "Let the dialer apply your Do Not Call flags automatically",
        ],
      },
      {
        heading: "Texting opt-outs count too",
        paragraphs: [
          "If someone replies STOP to your texts, they have told you they do not want to hear from you. Many teams treat that as a do-not-call signal as well. Keeping calls and texts in one system makes that easy to see.",
        ],
      },
    ],
    keyTakeaways: [
      "Scrub lists against the National Do Not Call Registry before dialing.",
      "Keep an internal Do Not Call list and honor it permanently.",
      "Abandoned-call messages need a press-a-key opt-out; Text2Sale uses 9.",
      "Treat opt-outs from texts as a strong signal for calls too.",
    ],
    faq: [
      {
        question: "Do registered numbers ever become callable?",
        answer:
          "Only under an exemption, such as an established business relationship within the allowed time window or the person's express written permission. When in doubt, do not call.",
      },
      {
        question: "Can I remove someone from my Do Not Call list?",
        answer:
          "Only if they clearly ask to be contacted again. Keep a record of that request.",
      },
    ],
    relatedSlugs: ["do-not-call-registry-and-business-texting", "predictive-dialer-compliance-checklist", "predictive-dialer-abandoned-call-rule-3-percent"],
    sources: [{ href: "https://telemarketing.donotcall.gov/", label: "National Do Not Call Registry for telemarketers" }],
  },
  {
    slug: "dialer-caller-id-and-spam-labels",
    metaTitle: "Dialer Caller ID: Avoiding Spam Likely Labels | Text2Sale",
    title: "Caller ID for dialers: how to avoid 'Spam Likely' labels",
    description:
      "Why dialer calls get labeled Spam Likely, how carriers score numbers, and practical steps to keep your caller ID clean: registration, volume and answer rates.",
    excerpt:
      "If your calls show as Spam Likely, fewer people answer. Here is how carriers decide and what you can do about it.",
    tags: ["Dialer", "Calling", "Compliance"],
    intro: [
      "The number that shows on a lead's phone matters as much as your script. A call labeled 'Spam Likely' or 'Scam Risk' is ignored before you ever get to say hello.",
      "Those labels come from analytics engines used by the major carriers and call-blocking apps. They score numbers on how they are used, and dialers create exactly the patterns they look for.",
    ],
    sections: [
      {
        heading: "What makes a number look like spam",
        paragraphs: [
          "Analytics engines look at call volume per number, how many calls are short or unanswered, how often people block or report the number, and whether calls are properly signed under STIR/SHAKEN. A brand-new number suddenly making hundreds of short calls a day fits the spam profile even if every call is legitimate.",
        ],
      },
      {
        heading: "Register your numbers",
        paragraphs: [
          "Register the numbers you call from with the carriers' analytics providers. The Free Caller Registry submits your business name and numbers to the major analytics engines in one form. It does not guarantee a clean label, but it gives the engines a legitimate business to attach to the number.",
        ],
      },
      {
        heading: "Spread volume across numbers",
        paragraphs: [
          "Using several business numbers spreads volume so no single number looks like a robocaller. In Text2Sale you choose which of your numbers the dialer may use, and it rotates through them. Keep the rotation honest: the numbers should all belong to your business and accept callbacks.",
        ],
        bullets: [
          "Use local numbers in the area codes you call most",
          "Rotate a few numbers rather than burning through dozens",
          "Make sure every number can receive a callback",
        ],
      },
      {
        heading: "Answer rates feed back into labels",
        paragraphs: [
          "Calls that people answer and talk on look legitimate. Clean, consented lists, sensible calling hours and fast connection when someone answers all help. Hanging up on people or leaving silence makes reports more likely, which is one more reason to keep abandoned calls rare.",
        ],
      },
    ],
    keyTakeaways: [
      "Carrier analytics label numbers by volume, short calls and complaints.",
      "Register your numbers through the Free Caller Registry.",
      "Rotate a few local business numbers that accept callbacks.",
      "Good lists and few abandoned calls keep labels clean.",
    ],
    faq: [
      {
        question: "Should I change numbers when one gets flagged?",
        answer:
          "Replacing flagged numbers constantly looks like the behavior spam filters target. Fix the cause first: volume, list quality and abandoned calls. Then retire a number only if its label does not recover.",
      },
      {
        question: "Can I show the lead's local area code?",
        answer:
          "You can buy numbers in area codes you call often and choose them as caller IDs. Every number must be one you own.",
      },
    ],
    relatedSlugs: ["managing-phone-numbers-across-a-sales-team", "predictive-dialer-compliance-checklist", "dialer-metrics-contact-rate-talk-time"],
    sources: [{ href: "https://www.freecallerregistry.com/", label: "Free Caller Registry" }],
  },
];

export const BLOG_POSTS_10: BlogPost[] = ARTICLES.map((article) => {
  const text = [article.title, ...article.intro,
    ...article.sections.flatMap((section) => [section.heading, ...section.paragraphs, ...(section.bullets || [])]),
    ...article.keyTakeaways, ...article.faq.flatMap((item) => [item.question, item.answer])].join(" ");
  return { ...article, datePublished: "2026-10-20", dateModified: "2026-10-20",
    readMinutes: Math.max(1, Math.ceil(text.split(/\s+/).length / 200)) };
});
