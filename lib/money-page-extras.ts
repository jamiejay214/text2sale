// Extra depth for the five highest-intent landing pages: a how-it-works
// strip, copy-and-edit message templates, longer guide sections and more
// FAQ. Kept in one file so the pages stay readable and the copy can be
// reviewed in one place. Every product claim here matches lib/plans.ts and
// the feature list on the pricing page.

export type MoneyPageStep = { icon: string; title: string; body: string };
export type MoneyPageTemplate = { label: string; text: string };

export type MoneyPageExtras = {
  image?: { src: string; alt: string; caption: string };
  stepsTitle: string;
  steps: MoneyPageStep[];
  templatesTitle: string;
  templatesIntro: string;
  templates: MoneyPageTemplate[];
  guide: { heading: string; paragraphs: string[]; bullets?: string[] }[];
  faq: { question: string; answer: string }[];
};

const CONSENT_NOTE =
  "Send these only to people who agreed to receive texts from you, identify your business in the first message and include opt-out wording such as “Reply STOP to opt out.”";

export const MASS_TEXTING_EXTRAS: MoneyPageExtras = {
  image: { src: "/home/sales-representative.jpg", alt: "Sales rep on a headset following up with a lead from his desk", caption: "One workspace for the list, the campaign and every reply." },
  stepsTitle: "How a mass texting campaign runs in Text2Sale",
  steps: [
    { icon: "step-import", title: "Upload the list", body: "Import a CSV, match the name and phone columns and save the list. Nothing sends yet." },
    { icon: "bulk-campaigns", title: "Write the campaign", body: "A short first text with the lead's name, then follow-ups with the delays you choose." },
    { icon: "cost-estimate", title: "Check the cost", body: "Review how many people will receive it, how many segments each text uses and the estimated total." },
    { icon: "two-way-inbox", title: "Work the replies", body: "Replies open as conversations. Answer, hand one to the AI assistant or call the lead." },
  ],
  templatesTitle: "Mass text message templates you can edit",
  templatesIntro: `Short, specific and written like a person. ${CONSENT_NOTE}`,
  templates: [
    { label: "First touch after a web form", text: "Hi {first_name}, this is Dana with Brightline Insurance. You asked about coverage options on our site. Is now a good time for a couple of quick questions? Reply STOP to opt out." },
    { label: "Quote follow-up", text: "Hi {first_name}, Dana from Brightline. Did you get a chance to look over the quote I sent Tuesday? Happy to walk through it in five minutes." },
    { label: "Second follow-up, one day later", text: "{first_name}, no rush on the quote. Would a quick call tomorrow morning or afternoon be easier for you?" },
    { label: "Old lead check-in", text: "Hi {first_name}, Dana at Brightline. We spoke a while back about coverage. Rates have changed since then. Want me to run a fresh comparison? Reply STOP to opt out." },
    { label: "Appointment reminder", text: "Hi {first_name}, a reminder that we're talking tomorrow at 2:30 PM. Reply C to confirm or R if you need a different time." },
    { label: "Missed appointment", text: "Hi {first_name}, sorry we missed each other today. Want to pick another time this week? I have Thursday at 10 or Friday at 1." },
    { label: "Event or enrollment deadline", text: "Hi {first_name}, open enrollment ends on the 15th. If you'd like to review your plan before then, I have openings this week. Reply STOP to opt out." },
    { label: "Closing the loop", text: "Hi {first_name}, I don't want to keep bothering you. Should I close your file, or is this still something you want help with?" },
  ],
  guide: [
    {
      heading: "What separates mass texting from spam",
      paragraphs: [
        "The difference is not the number of messages. It is whether the person expected to hear from you and whether the message gives them a reason to answer. A list of people who asked for a quote last week will reply to a plain, relevant text. A purchased list of strangers will not, and carriers will filter the traffic.",
        "Three habits keep a large send feeling personal: use the lead's first name, ask one question instead of making three points, and send during hours when a reply is likely. Rotating a few versions of the same sentence also helps, because a thousand identical messages look automated to carriers and to people.",
      ],
    },
    {
      heading: "How many follow-ups to send, and when to stop",
      paragraphs: [
        "One text is rarely enough. People read a message in a checkout line and forget it. A reasonable cadence for a new lead is a first text right away, a second the next day and a third two or three days after that, each a little shorter than the last.",
        "Follow-ups in a Text2Sale campaign stop for a contact once they reply or opt out, so someone already talking to you is not chased by the next automated step. After three or four unanswered texts, stop and move the lead to a slower reactivation list for another try in a few months.",
      ],
    },
    {
      heading: "What a campaign costs",
      paragraphs: [
        "The Text plan is the software fee. Usage comes from a prepaid balance: each outbound text is billed per segment, and incoming texts are free. A segment is 160 standard characters, or 70 if the message contains an emoji or certain special characters, so one emoji can double the cost of a long text.",
        "Before a campaign sends you see the recipient count and the estimated total. Adding $500 or more to your balance in one purchase unlocks the lower volume rate on outbound texts.",
      ],
      bullets: [
        "Keep first texts under 160 characters where you can",
        "Skip emoji in bulk sends unless the message is short",
        "Estimate follow-up steps too, not just the first message",
      ],
    },
    {
      heading: "Getting messages delivered",
      paragraphs: [
        "US carriers require business texting from local numbers to be registered under 10DLC. You submit your business and campaign details in the dashboard, and approval averages about four business days. Text2Sale covers the registration and campaign fees.",
        "After approval, deliverability is mostly about behavior: text people who opted in, honor opt-outs immediately, avoid link shorteners and all-caps promotions, and keep your opt-out rate low. Text2Sale handles STOP and HELP automatically and skips opted-out contacts on every later send.",
      ],
    },
  ],
  faq: [
    { question: "How many texts can I send at once?", answer: "There is no plan limit on campaign size. Sending speed depends on the throughput carriers assign to your registered 10DLC campaign, so very large lists are delivered over a period of time rather than in a single second." },
    { question: "Can leads reply to a mass text?", answer: "Yes. Every campaign is two-way. Replies arrive in your inbox as individual conversations with the lead's history beside them." },
    { question: "Do I need my own phone numbers?", answer: "You buy local numbers inside Text2Sale and link them to your registered campaign. Texts go out from those numbers, not from your personal cell." },
  ],
};

export const INSURANCE_SMS_EXTRAS: MoneyPageExtras = {
  image: { src: "/home/client-meeting.jpg", alt: "Insurance agent shaking hands with a client after a meeting", caption: "The goal of every text: a conversation with the right person." },
  stepsTitle: "From quote request to booked call",
  steps: [
    { icon: "webhook", title: "Lead arrives", body: "From your vendor through a webhook or from a CSV you upload." },
    { icon: "follow-up-steps", title: "First text sends", body: "Within moments, with the lead's name and one clear question." },
    { icon: "ai-qualify", title: "Reply is handled", body: "You answer, or the AI assistant asks your qualifying questions." },
    { icon: "ai-booking", title: "Call is booked", body: "A time is offered, confirmed and added to your Google Calendar." },
  ],
  templatesTitle: "Insurance text message templates by situation",
  templatesIntro: `Edit the names and details to match your agency. ${CONSENT_NOTE} These are examples, not compliance advice; follow your carrier and state rules, and CMS marketing rules for Medicare.`,
  templates: [
    { label: "New health insurance lead", text: "Hi {first_name}, this is Maria, a licensed agent with Summit Health. You requested health plan options. Are you looking for coverage just for you or for your family? Reply STOP to opt out." },
    { label: "Quote sent, no answer", text: "Hi {first_name}, Maria here. I emailed the plan comparison you asked for. The lowest premium option is not always the cheapest overall. Want me to explain why in a quick call?" },
    { label: "Life insurance follow-up", text: "Hi {first_name}, it's Maria. You asked about term life coverage. Do you have a coverage amount in mind, or would it help to talk through how to pick one?" },
    { label: "Aged lead reactivation", text: "Hi {first_name}, Maria with Summit Health. You looked at coverage with us last year. Has anything changed with your plan or household since then? Reply STOP to opt out." },
    { label: "Open enrollment reminder", text: "Hi {first_name}, open enrollment closes soon. If you want to review your current plan before the deadline I have 15-minute slots this week." },
    { label: "Renewal check-in", text: "Hi {first_name}, your policy renews next month. Want me to check whether your current plan is still the best fit before it does?" },
    { label: "After a missed call", text: "Hi {first_name}, Maria from Summit Health. I just tried calling about your quote request. Is there a better time today, or would you rather text?" },
    { label: "Referral ask after a sale", text: "Glad we got your coverage sorted, {first_name}. If a friend or family member needs help with theirs, feel free to pass along my number." },
  ],
  guide: [
    {
      heading: "Why insurance leads go cold so fast",
      paragraphs: [
        "A person who fills out a quote form is often shopping right then, and a shared lead may be sold to several agents at once. The agent who starts a real conversation first usually gets the appointment. That is the whole case for texting: it reaches the lead immediately, even while you are on a call with someone else.",
        "The first message does not need to sell anything. It needs to prove a real person is there and ask one easy question. Coverage for you or your family? A good time for a quick call? Questions like these get answers.",
      ],
    },
    {
      heading: "A follow-up cadence that fits how people buy insurance",
      paragraphs: [
        "Most leads do not answer the first text. A cadence that works for many agents is day one, day two, day four and day seven, then a move to a monthly reactivation list. Each message should add something: a clarification, a deadline or a simpler way to reply.",
        "Mix channels. A text followed by a call from the same number, then a text that mentions the call, tends to get more answers than either alone. With the Complete plan the texts, the dialer and the lead's notes sit on one screen.",
      ],
      bullets: [
        "Day 1: first text within minutes, then one call attempt",
        "Day 2: short follow-up text referring to the quote",
        "Day 4: call, then a text offering two specific times",
        "Day 7: closing-the-loop text, then move to reactivation",
      ],
    },
    {
      heading: "Compliance points agents ask about most",
      paragraphs: [
        "Texting leads is regulated. Under the TCPA you need the person's consent before sending marketing texts, and you must honor opt-outs. Carriers separately require 10DLC registration for business texting from local numbers. Text2Sale provides the registration workflow, automatic STOP and HELP handling, quiet-hours sending windows and opt-in records.",
        "The tools do not replace your own obligations. Keep proof of where each lead's consent came from, check your state's rules on texting hours, and follow CMS marketing rules if you sell Medicare plans. When in doubt, ask your compliance contact or upline before sending.",
      ],
    },
    {
      heading: "Working old leads without annoying them",
      paragraphs: [
        "Most agencies have thousands of leads that never bought. Circumstances change: a job ends, a baby arrives, a renewal notice shows a higher premium. A short, honest check-in a few times a year turns a small share of that list into conversations at no new lead cost.",
        "Segment before you send. People who got a quote last quarter deserve a different message from people who never replied two years ago. Stop for good when someone opts out or tells you they are covered.",
      ],
    },
  ],
  faq: [
    { question: "Can I text leads I bought from a lead vendor?", answer: "Only if the lead gave consent that covers texts from you. Ask your vendor exactly what the consumer agreed to and keep that record. Text2Sale provides opt-out handling and records, but collecting valid consent is the agent's responsibility." },
    { question: "How fast does the first text go out?", answer: "For leads posted through a webhook with the automatic first message turned on, the text is sent as the lead arrives. For uploaded lists it goes out when you start the campaign." },
    { question: "Will leads see my personal cell number?", answer: "No. Texts and calls go out from local business numbers you buy inside Text2Sale, and replies land in your inbox there." },
  ],
};

export const PREDICTIVE_DIALER_EXTRAS: MoneyPageExtras = {
  image: { src: "/home/sales-representative.jpg", alt: "Insurance agent wearing a headset during a dialing session", caption: "More of the hour spent talking, less spent listening to ringing." },
  stepsTitle: "How a predictive dialing session works",
  steps: [
    { icon: "csv-upload", title: "Load a calling list", body: "Upload a CSV or use a saved list. Each lead keeps its notes and history." },
    { icon: "predictive-dial", title: "Dial several lines", body: "The dialer tries up to three leads at once and waits for a live answer." },
    { icon: "browser-calling", title: "Talk to whoever answers", body: "You are connected with the lead's details on screen. Unanswered lines drop away." },
    { icon: "call-outcomes", title: "Log and move on", body: "Pick an outcome, add a note, set a callback and the next round of dialing begins." },
  ],
  templatesTitle: "Scripts and texts to pair with the dialer",
  templatesIntro: "An opening line for the first five seconds, a voicemail and the texts that go with them. Adjust to your product and follow your state's calling rules.",
  templates: [
    { label: "Call opening", text: "Hi, is this {first_name}? This is James, a licensed agent with Harbor Insurance. You asked for health coverage options on our website. Did I catch you at an okay time?" },
    { label: "If they are busy", text: "No problem at all. Is later today better, or tomorrow morning? I'll put it on my calendar so you're not chasing me." },
    { label: "Voicemail", text: "Hi {first_name}, James with Harbor Insurance returning your request for coverage options. I'll send a text to this number so you can reply whenever it's convenient." },
    { label: "Text after a voicemail", text: "Hi {first_name}, James from Harbor Insurance. I just left you a voicemail about the coverage options you requested. What's a good time to talk? Reply STOP to opt out." },
    { label: "Text after no answer", text: "Hi {first_name}, I just tried calling about your quote request. Would you rather text, or is there a better time for a quick call?" },
    { label: "Callback confirmation", text: "Thanks {first_name}. I have us down for tomorrow at 2:30 PM. I'll call from this number." },
  ],
  guide: [
    {
      heading: "Manual, power or predictive: which mode to use",
      paragraphs: [
        "All three modes are included in the Dialer and Complete plans, and the right one depends on the list in front of you. Manual dialing is for a specific person you need to reach. Power dialing calls one lead after another with no gap, which suits warm leads and scheduled callbacks where you want to be on the line the moment they answer.",
        "Predictive dialing is for long lists with low answer rates, such as aged leads. It tries up to three lines at once and connects you when someone picks up, so the time you would have spent listening to ringing is spent on the next conversation.",
      ],
      bullets: [
        "Manual: one specific lead, such as a callback you promised",
        "Power: warm lists where most people may answer",
        "Predictive: large or aged lists where most calls go unanswered",
      ],
    },
    {
      heading: "What a dialing hour really produces",
      paragraphs: [
        "Dialing by hand, an agent might place a few dozen calls in an hour and reach a handful of people. The rest of the hour is ringing, voicemail greetings and looking up the next number. Dialing several lines at once raises the number of live conversations in the same hour without asking the agent to talk faster.",
        "The trade-off is that you do not choose who answers, so you need the lead's notes on screen the instant the call connects. That is why the dialer sits beside the contact record: the last text, the last note and the lead source are visible before you finish saying hello.",
      ],
    },
    {
      heading: "Calling rules to know before you start",
      paragraphs: [
        "Outbound calling is regulated. The federal Telemarketing Sales Rule and the TCPA cover calling hours, the National Do Not Call Registry, caller ID and abandoned calls, and many states add stricter rules. Medicare sales have their own contact restrictions.",
        "Check your lists against the Do Not Call Registry where required, call only within permitted hours for the lead's time zone, keep your own do-not-call list, and get advice on your specific situation. A dialer makes calling faster; it does not change which calls you are allowed to make.",
      ],
    },
    {
      heading: "What calling costs",
      paragraphs: [
        "The Dialer plan is the software fee. Call minutes are billed separately from a prepaid balance and by the started minute, with outbound and inbound rates listed on the pricing page. Dialer alone needs no texting registration, so you can begin calling without waiting on 10DLC approval.",
        "Add the Text plan's features by choosing Complete if you want the text-then-call sequence above in one workspace.",
      ],
    },
  ],
  faq: [
    { question: "How many lines does the predictive dialer call at once?", answer: "Up to three lines at a time. When one is answered you are connected to that person and the other attempts are dropped." },
    { question: "Do I need special hardware?", answer: "No. Calls are placed from your browser. A headset with a microphone is recommended for call quality." },
    { question: "What happens when a lead calls back?", answer: "Incoming calls can be answered by the AI receptionist, which finds out what the caller needs, transfers the call if you are available and offers appointment times if you are not." },
  ],
};

export const AI_SETTER_EXTRAS: MoneyPageExtras = {
  image: { src: "/home/client-meeting.jpg", alt: "Sales professional meeting a client for a booked appointment", caption: "The assistant books the meeting. You hold it." },
  stepsTitle: "How the AI appointment setter books a meeting",
  steps: [
    { icon: "two-way-inbox", title: "A lead replies", body: "By text at any hour, or by calling your business number." },
    { icon: "ai-qualify", title: "It qualifies", body: "The assistant asks the questions you set and answers common ones." },
    { icon: "ai-booking", title: "It offers real times", body: "Open slots are checked against your Google Calendar before they are offered." },
    { icon: "ai-handoff", title: "You take over", body: "The appointment is on your calendar and the full conversation is waiting for you." },
  ],
  templatesTitle: "Example instructions and replies",
  templatesIntro: "The assistant follows the instructions you write. These examples show the kind of direction that works and how a booking conversation reads.",
  templates: [
    { label: "Instruction: what you sell", text: "We help individuals and families compare health insurance plans. Your job is to find out who needs coverage and book a 15-minute call with a licensed agent." },
    { label: "Instruction: qualifying questions", text: "Before offering a time, ask who the coverage is for and what state they live in. Ask one question per message." },
    { label: "Instruction: pricing", text: "Do not quote premiums. Say that prices depend on age, location and plan, and that the agent will go through exact numbers on the call." },
    { label: "Instruction: when to hand off", text: "If the lead is upset, asks for a person, or asks anything about claims or cancellations, stop and tell them an agent will reply shortly." },
    { label: "Example reply: offering times", text: "Thanks, that helps. I can set up a quick call with an agent. Would tomorrow at 10:00 AM or 2:30 PM work better?" },
    { label: "Example reply: confirming", text: "You're booked for tomorrow at 2:30 PM. The agent will call you at this number. Reply here if you need to change the time." },
  ],
  guide: [
    {
      heading: "What an AI appointment setter should and should not do",
      paragraphs: [
        "The job is narrow on purpose: respond quickly, ask a few qualifying questions, offer real times and book one. That is the part of selling where speed matters most and judgment matters least, which makes it the part worth automating.",
        "It should not give advice, quote prices it cannot verify or argue with an unhappy lead. Write those limits into your instructions and tell the assistant when to stop and hand the conversation to a person. You can take over any conversation yourself at any time.",
      ],
    },
    {
      heading: "After hours is where it earns its fee",
      paragraphs: [
        "Leads reply when it suits them: at lunch, after dinner, on Sunday afternoon. An unanswered text at 8 PM is often a lost lead by morning, because the person kept shopping. An assistant that answers in the moment and puts a call on tomorrow's calendar keeps that lead with you.",
        "You control the scope. Leave the assistant off during the day and on at night, switch it on for selected conversations, or let it cover the whole inbox while you are in appointments.",
      ],
    },
    {
      heading: "Booking only into time you actually have",
      paragraphs: [
        "A booking assistant is only useful if the appointments are real. Connect Google Calendar and the assistant checks your busy times, including events you created yourself, before it offers a slot. The booked appointment is added to your calendar and confirmed to the lead in the same conversation.",
        "For incoming phone calls, the AI receptionist does the same thing by voice: it transfers the call when you are available, and when you are not it offers two open times and books the one the caller picks.",
      ],
    },
    {
      heading: "What it costs to run",
      paragraphs: [
        "AI text replies are included with the Text and Complete plans and billed per reply from your prepaid balance, plus the outbound text itself. The AI receptionist for calls comes with Dialer and Complete and is billed per minute. Exact rates are on the pricing page.",
        "Because billing is per reply and per minute, a slow week costs little and you can measure the cost of each booked appointment directly.",
      ],
    },
  ],
  faq: [
    { question: "Will leads know they are talking to an AI?", answer: "You decide how the assistant introduces itself through its instructions. Being upfront that an assistant is helping schedule the call is the safer choice, and some states have disclosure rules for automated conversations." },
    { question: "Can I review what the AI said?", answer: "Yes. Every message is in the conversation thread, and you can step in and reply yourself at any point." },
    { question: "Does it work for old leads as well as new ones?", answer: "Yes. It suits reactivation campaigns, where replies arrive unpredictably over several days and are easy to miss." },
  ],
};

export const INSURANCE_AGENTS_EXTRAS: MoneyPageExtras = {
  stepsTitle: "One workspace for the whole follow-up",
  steps: [
    { icon: "bulk-campaigns", title: "Text", body: "Bulk campaigns, multi-step follow-up and a two-way inbox." },
    { icon: "predictive-dial", title: "Dial", body: "Manual, power and predictive dialing from the same contact record." },
    { icon: "ai-replies", title: "AI", body: "Text replies, qualification and booking when you are busy." },
    { icon: "calendar", title: "Book", body: "Appointments checked against and added to Google Calendar." },
  ],
  templatesTitle: "Insurance follow-up texts to start with",
  templatesIntro: `A few from the free template library. ${CONSENT_NOTE}`,
  templates: [
    { label: "New quote request", text: "Hi {first_name}, this is Maria, a licensed agent with Summit Health. You requested plan options. Is the coverage for just you or your family? Reply STOP to opt out." },
    { label: "Quote follow-up", text: "Hi {first_name}, Maria here. Did you get a chance to look at the comparison I sent? Happy to walk through it in five minutes." },
    { label: "Callback request", text: "Hi {first_name}, I just tried calling about your quote. Is there a better time today, or would you rather text?" },
    { label: "Old lead check-in", text: "Hi {first_name}, Maria with Summit Health. You looked at coverage with us last year. Has anything changed since then? Reply STOP to opt out." },
    { label: "Appointment reminder", text: "Hi {first_name}, a reminder that we're talking tomorrow at 2:30 PM. Reply C to confirm or R to reschedule." },
    { label: "Closing the loop", text: "Hi {first_name}, should I close your file, or is coverage still something you want help with?" },
  ],
  guide: [
    {
      heading: "What an insurance agent actually needs from a CRM",
      paragraphs: [
        "Most general CRMs are built to store records. An agent working paid leads needs something different: a way to reach a new lead in minutes, keep following up without remembering to, and see every text and call for that person in one place when they finally answer.",
        "That is the difference between a database and a follow-up tool. Text2Sale is the second kind. Contacts, campaigns, the inbox, the dialer and booked appointments share one screen, so the next action for any lead is obvious.",
      ],
    },
    {
      heading: "Choosing a plan by how you sell",
      paragraphs: [
        "Agents who start conversations by text and close on a scheduled call usually begin with the Text plan. Agents who work call lists all day start with Dialer, which needs no texting registration. Agents who text first and then dial the people who replied choose Complete, which costs less than buying the two separately.",
        "All three are billed per user per month, with usage paid from a prepaid balance so you can see what a campaign will cost before it sends. You can change plans later.",
      ],
      bullets: [
        "Text: campaigns, inbox, AI text replies and booking",
        "Dialer: three dialing modes and the AI receptionist",
        "Complete: everything in both, in one workspace",
      ],
    },
    {
      heading: "By line of business",
      paragraphs: [
        "Health and ACA agents live by enrollment deadlines, so speed to a new lead and reminders before the deadline matter most. Medicare agents work a narrow calendar with strict contact rules and need careful consent records. Life and final expense agents work longer cycles with more callbacks, where a dialer and scheduled callbacks carry the load.",
        "The workflow is the same in each case: a fast first touch, steady follow-up, one place for replies and a booked conversation. The messages and timing change, which is why each line has its own page and templates.",
      ],
    },
    {
      heading: "Getting started in a week",
      paragraphs: [
        "Day one, create your account, submit your 10DLC registration and upload a list. Approval averages about four business days. Use that time to write your first campaign, connect Google Calendar and write instructions for the AI assistant. Dialer users can start calling right away.",
        "Once approved, send to a small list first, read the replies, adjust the wording and then scale up. If you would like someone to walk through it with you, book a demo.",
      ],
    },
  ],
  faq: [
    { question: "Is Text2Sale only for insurance agents?", answer: "No. It also fits sales professionals in real estate, mortgage, solar, roofing, recruiting and other fields, but insurance follow-up is what it was designed around first." },
    { question: "Can my whole agency use it?", answer: "Yes. Plans are per user, and teams can share calls and review calling stats together." },
    { question: "How long does setup take?", answer: "Account setup takes minutes. Texting requires carrier registration, which averages about four business days. Calling with the Dialer plan can start without it." },
  ],
};
