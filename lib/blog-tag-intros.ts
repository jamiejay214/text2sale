// ── Topic archive introductions ────────────────────────────────────────────
// Each /blog/tag/[slug] page opens with a short, topic-specific introduction.
// Without it, a tag page is only a list of excerpts that also appear on
// /blog and on the other tag pages, which search engines treat as thin,
// near-duplicate content and tend to leave out of the index. Keyed by the tag
// slug (see tagSlug in lib/blog-posts.ts). The first sentence doubles as the
// page's meta description, so keep it a complete, self-contained summary.

export type TagIntro = {
  intro: string[];
  /** The landing page most relevant to readers of this topic. */
  landing?: { href: string; label: string };
};

export const TAG_INTROS: Record<string, TagIntro> = {
  operations: {
    intro: [
      "Guides on running day-to-day business texting: who answers replies, how messages get scheduled, and how teams keep conversations from slipping through the cracks.",
      "Most texting problems are operational rather than technical. A great campaign still fails if nobody owns the inbox, reminders go out at the wrong time, or opt-outs live in someone's head. These articles cover the routines, handoffs, and settings that keep texting reliable as volume grows.",
    ],
    landing: { href: "/mass-texting-crm", label: "See how the mass texting CRM organizes campaigns and replies" },
  },
  compliance: {
    intro: [
      "Practical guides to texting within the rules: consent, opt-outs, quiet hours, 10DLC registration, and industry-specific restrictions.",
      "Compliance mistakes in business texting are expensive. Consent-related lawsuits carry statutory damages per message, and carriers can filter or suspend numbers that draw complaints. These articles explain what the rules require in plain language. They are general information rather than legal advice, so check anything specific to your business with counsel.",
    ],
    landing: { href: "/10dlc-compliant-texting", label: "Read about 10DLC compliant texting" },
  },
  retention: {
    intro: [
      "How businesses use texting to keep the customers they already have: renewals, check-ins, win-back campaigns, and reminders that prevent churn.",
      "Keeping a customer usually costs far less than finding a new one, and texting is one of the cheapest ways to stay in touch. These guides cover when to reach out, what to say, and how often to send so messages feel helpful rather than like marketing noise.",
    ],
  },
  "sms-marketing": {
    intro: [
      "Guides to SMS marketing that people actually respond to, from list building and offers to timing, frequency, and measuring results.",
      "Text messages are read quickly, which makes SMS a strong marketing channel and an easy one to overuse. These articles focus on campaigns that earn replies and keep opt-out rates low: clear consent, relevant offers, short copy, and a sending schedule your contacts will tolerate.",
    ],
    landing: { href: "/bulk-sms-software", label: "Explore bulk SMS software" },
  },
  insurance: {
    intro: [
      "Texting guides for insurance agents: lead follow-up, appointment setting, policy servicing, and compliance across health, life, final expense, and Medicare.",
      "Insurance is a follow-up business, and many prospects answer a text long before they return a call. It is also one of the most heavily regulated industries for outreach. These articles show how agents use texting to reach more prospects while respecting consent rules and carrier requirements.",
    ],
    landing: { href: "/sms-crm-for-insurance-agents", label: "See the SMS CRM for insurance agents" },
  },
  automation: {
    intro: [
      "How to automate business texting without losing the personal touch: drip sequences, triggered messages, reminders, and AI replies.",
      "Automation is what lets a small team follow up with hundreds of leads, but badly built automation sends the wrong message at the wrong time. These guides cover which messages to automate, when a person should take over, and how to make sure sequences stop when someone replies or opts out.",
    ],
    landing: { href: "/ai-texting-crm", label: "See how AI replies work in Text2Sale" },
  },
  campaigns: {
    intro: [
      "Guides to planning, writing, and sending text message campaigns, including segmentation, timing, testing, and follow-up.",
      "A campaign is more than a single blast. The best results come from sending the right message to the right segment, following up with people who did not answer, and learning from each send. These articles walk through campaign structure from list prep to post-send review.",
    ],
    landing: { href: "/mass-texting-crm", label: "Run campaigns with the mass texting CRM" },
  },
  deliverability: {
    intro: [
      "Why business texts get filtered or blocked, and what to do about it: registration, content, links, list quality, and sending patterns.",
      "A message that never arrives cannot convert. Carriers filter traffic that looks unregistered, spammy, or unwanted, and the signals they use are not always obvious. These guides explain how carrier filtering works and the practical steps that keep your messages reaching phones.",
    ],
    landing: { href: "/10dlc-compliant-texting", label: "Learn how 10DLC registration affects delivery" },
  },
  sms: {
    intro: [
      "Foundational guides to business SMS: how text messaging works, what it costs, and where it fits alongside calls and email.",
      "If you are new to business texting, start here. These articles cover the basics, including segments and character limits, local versus toll-free numbers, two-way conversations, and the habits that separate useful business texts from spam.",
    ],
  },
  "sms-follow-up": {
    intro: [
      "How to follow up with leads and customers by text: cadence, message sequencing, and knowing when to stop.",
      "Most sales are won in the follow-up, not the first contact. Texting makes follow-up fast and cheap, which is exactly why it is easy to overdo. These guides cover how many messages to send, how to space them, and how to vary the message so each follow-up adds something new.",
    ],
    landing: { href: "/sms-follow-up-for-sales-teams", label: "See SMS follow-up for sales teams" },
  },
  "speed-to-lead": {
    intro: [
      "Why response time decides who wins a new lead, and how to reply within minutes even when your team is busy.",
      "Leads who request information often contact several businesses at once, and the first useful response tends to win the conversation. These articles cover how to measure your response time, automate the first touch, and route replies so a fast answer does not depend on someone watching their phone.",
    ],
    landing: { href: "/ai-texting-crm", label: "Reply instantly with the AI texting CRM" },
  },
  automotive: {
    intro: [
      "Texting guides for car dealerships, service departments, and auto businesses: sales leads, service reminders, recalls, and customer updates.",
      "Car buyers and service customers expect quick answers, and many would rather text than call the store. These articles cover how dealerships and auto shops use texting across sales and service, from following up on internet leads to letting customers know their vehicle is ready.",
    ],
  },
  "medical-practice": {
    intro: [
      "Texting guides for medical practices: appointment reminders, recalls, intake, and patient communication that respects privacy rules.",
      "Reminder texts reduce no-shows, and patients generally prefer them to phone calls. Healthcare texting also has to account for HIPAA and patient privacy. These articles cover what practices commonly text, what to keep out of a text message, and how to set up reminders patients appreciate.",
    ],
  },
  scripts: {
    intro: [
      "Ready-to-adapt text message scripts for first contact, follow-up, appointment setting, objections, and re-engagement.",
      "A good script gives you a starting point, not a message to paste word for word. The scripts in these guides are short, identify the sender, and end with one clear question. Adapt them to your voice and your customers, and include opt-out language in first messages.",
    ],
    landing: { href: "/sales-team-texting-crm", label: "Give your team shared templates" },
  },
  appointments: {
    intro: [
      "How to use texting to book appointments, confirm them, send reminders, and recover no-shows.",
      "Appointment reminders are one of the most welcome business texts. They are useful, expected, and easy to act on. These guides cover confirmation messages, reminder timing, rescheduling flows, and how to follow up after a missed appointment without sounding annoyed.",
    ],
  },
  "two-way-texting": {
    intro: [
      "Guides to two-way business texting: handling replies, keeping conversations organized, and responding fast enough to matter.",
      "Sending is one-way; selling is two-way. Once contacts start replying, the job becomes managing conversations: who answers, how quickly, and what happens to replies that come in after hours. These articles cover inbox habits and tools that keep two-way texting under control.",
    ],
  },
  "10dlc": {
    intro: [
      "Everything about 10DLC registration: what it is, how brand and campaign registration work, why campaigns get rejected, and how to fix them.",
      "US carriers require businesses texting from local 10-digit numbers to register a brand and campaign through The Campaign Registry, and unregistered traffic is blocked or filtered. These guides explain the process step by step and the details carrier reviewers look for.",
    ],
    landing: { href: "/10dlc-compliant-texting", label: "See 10DLC compliant texting in Text2Sale" },
  },
  "home-services": {
    intro: [
      "Texting guides for home service businesses: quotes, scheduling, on-the-way messages, reviews, and seasonal campaigns.",
      "Homeowners want to know when the technician is arriving and what the job will cost, and a text answers both without phone tag. These articles cover how plumbers, HVAC companies, cleaners, and other home service businesses use texting from first inquiry to follow-up review request.",
    ],
  },
  "opt-in": {
    intro: [
      "How to collect consent to text: opt-in forms, keyword opt-ins, checkbox language, and keeping records you can rely on.",
      "Consent is the foundation of compliant business texting. Without it, marketing texts create legal risk and carrier complaints. These guides show how to build opt-in flows that are clear to customers, acceptable to carriers during 10DLC review, and documented well enough to prove later.",
    ],
  },
  "sales-teams": {
    intro: [
      "Texting guides for sales teams: lead response, pipeline follow-up, templates, and manager visibility across reps.",
      "When a whole team texts prospects, consistency and oversight matter as much as individual skill. These articles cover how sales teams set response-time standards, share templates, keep conversations off personal phones, and track what is working.",
    ],
    landing: { href: "/sales-team-texting-crm", label: "See the sales team texting CRM" },
  },
  strategy: {
    intro: [
      "Strategic guides to business texting: where SMS fits in your funnel, which messages to prioritize, and how to measure return.",
      "Texting works best with a clear purpose. These articles step back from individual messages to look at the bigger picture: which stages of the customer journey benefit most from texting, how it works alongside calls and email, and how to decide what to automate.",
    ],
  },
  tcpa: {
    intro: [
      "Plain-language guides to the Telephone Consumer Protection Act and how it applies to business texting.",
      "The TCPA treats text messages much like calls, and violations carry statutory damages per message, which is why texting lawsuits can become expensive quickly. These articles cover consent, quiet hours, Do Not Call rules, and opt-out handling. They are general information, not legal advice.",
    ],
    landing: { href: "/10dlc-compliant-texting", label: "See Text2Sale's compliance tools" },
  },
  copywriting: {
    intro: [
      "How to write text messages people read and answer: length, tone, personalization, and calls to action.",
      "A text has a few seconds to earn a reply. The difference between a message that gets answered and one that gets ignored is usually clarity: who is texting, why, and what to do next. These guides break down the copywriting habits behind high-reply business texts.",
    ],
  },
  "getting-started": {
    intro: [
      "Start here if your business is new to texting customers: setup, registration, first campaigns, and common beginner mistakes.",
      "Getting started with business texting involves a few steps that are easy to miss, from registering your number to building an opt-in list before you send anything. These guides walk through the setup in order so your first campaign goes out cleanly.",
    ],
    landing: { href: "/mass-texting-crm", label: "See how Text2Sale works" },
  },
  "lead-generation": {
    intro: [
      "How texting helps generate and qualify leads: opt-in offers, inbound keywords, landing pages, and fast follow-up.",
      "Texting is best known for following up, but it can also bring in new leads when you give people an easy way to start the conversation. These articles cover how to invite opt-ins and qualify interest quickly without buying lists or texting people who never asked.",
    ],
  },
  mortgage: {
    intro: [
      "Texting guides for mortgage brokers and loan officers: lead follow-up, document collection, rate updates, and closing communication.",
      "Mortgage leads are expensive and competitive, and borrowers want quick answers throughout a stressful process. These articles cover how loan officers use texting from first inquiry through closing, and what to keep out of a text when financial details are involved.",
    ],
    landing: { href: "/mortgage-broker-texting-crm", label: "See the texting CRM for mortgage brokers" },
  },
  "real-estate": {
    intro: [
      "Texting guides for real estate agents: buyer and seller leads, showings, open houses, and staying in touch after the sale.",
      "Real estate runs on fast responses and long relationships. These articles cover how agents use texting to respond to new inquiries, coordinate showings, follow up after open houses, and keep past clients in mind for referrals, while staying clear of unsolicited texting.",
    ],
    landing: { href: "/real-estate-texting-crm", label: "See the texting CRM for real estate agents" },
  },
  recall: {
    intro: [
      "How practices and service businesses use texting for recalls: bringing patients and customers back when they are due.",
      "Recall messages remind people about care or service they already need, like a cleaning, checkup, or maintenance visit. These guides cover timing, message wording, and follow-up for recall campaigns that fill the schedule without feeling pushy.",
    ],
  },
  templates: {
    intro: [
      "Text message templates for common business situations, from first contact and reminders to follow-up and review requests.",
      "Templates save time and keep a team's messages consistent. These guides collect templates you can adapt, with notes on when to use each one and how to personalize it so it does not read like a form letter.",
    ],
  },
  "texting-crm": {
    intro: [
      "What a texting CRM is, how it differs from basic SMS tools, and how to choose one for your team.",
      "A texting CRM combines contacts, campaigns, conversations, and opt-out records in one place. These articles explain what that looks like in practice and what to compare when choosing a platform, including pricing, AI features, compliance tools, and team visibility.",
    ],
    landing: { href: "/mass-texting-crm", label: "See the Text2Sale mass texting CRM" },
  },
  trades: {
    intro: [
      "Texting guides for trades businesses such as plumbers, electricians, roofers, and HVAC contractors.",
      "Trades customers usually text when something is broken and they need help soon. These articles cover how trades businesses respond to new jobs quickly, send estimates and on-the-way updates, and follow up for reviews and repeat work.",
    ],
  },
  ai: {
    intro: [
      "How AI is changing business texting: automated replies, lead qualification, appointment booking, and where people still need to step in.",
      "AI can answer a lead within seconds at any hour, which makes it a strong fit for texting. It can also say the wrong thing if it is set up carelessly. These guides cover practical uses of AI in texting and the guardrails that keep it helpful and accurate.",
    ],
    landing: { href: "/ai-texting-crm", label: "See the AI texting CRM" },
  },
  analytics: {
    intro: [
      "How to measure business texting: reply rates, opt-out rates, conversions, and the numbers that show what is working.",
      "You cannot improve what you do not measure. These articles cover which texting metrics matter, what healthy ranges look like, and how to use results from each campaign to improve the next one.",
    ],
  },
  "best-practices": {
    intro: [
      "Proven habits for business texting that keep reply rates high and complaints low.",
      "Most texting best practices come down to respect for the person on the other end: get consent, identify yourself, keep it short, send at reasonable hours, and make opting out easy. These guides turn those principles into concrete steps.",
    ],
  },
  chiropractic: {
    intro: [
      "Texting guides for chiropractic practices: appointment reminders, care plan follow-up, reactivation, and new patient inquiries.",
      "Chiropractic care often depends on patients completing a series of visits. These articles cover how practices use texting to reduce missed appointments, keep patients on their care plans, and reconnect with patients who have fallen off the schedule.",
    ],
  },
  "customer-service": {
    intro: [
      "How businesses use texting for customer service: answering questions, sending updates, and resolving issues faster than phone or email.",
      "Many customers would rather text than wait on hold. These guides cover how to set response expectations, route service conversations, and use texting to keep customers updated without adding work for your team.",
    ],
  },
  dealership: {
    intro: [
      "Texting guides for car dealerships: internet lead response, appointment setting, service updates, and follow-up after the sale.",
      "Dealership leads shop several stores at once, and the store that answers first with a useful reply usually gets the visit. These articles cover how sales and BDC teams text leads, confirm appointments, and stay in touch with buyers.",
    ],
  },
  "health-insurance": {
    intro: [
      "Texting guides for health insurance agents: quote follow-up, Open Enrollment campaigns, special enrollment, and client retention.",
      "Health insurance shopping is tied to enrollment windows, and prospects often compare several agents at once. These articles cover how agents text quote requests quickly, plan campaigns around enrollment periods, and keep clients through renewal.",
    ],
    landing: { href: "/health-insurance-texting-crm", label: "See the health insurance texting CRM" },
  },
  healthcare: {
    intro: [
      "Texting guides for healthcare organizations: reminders, patient communication, intake, and privacy considerations.",
      "Texting improves attendance and patient communication across healthcare, from clinics to home health agencies. These guides cover common use cases and what to keep out of text messages to protect patient privacy.",
    ],
  },
  "life-insurance": {
    intro: [
      "Texting guides for life insurance agents: lead follow-up, underwriting updates, policy delivery, and client reviews.",
      "Life insurance sales can stall during weeks of underwriting, and approved policies sometimes go unplaced because the client lost interest. These articles cover how agents use texting to reach prospects and keep applicants engaged through delivery.",
    ],
    landing: { href: "/life-insurance-texting-crm", label: "See the life insurance texting CRM" },
  },
  "list-growth": {
    intro: [
      "How to grow a texting list the right way: opt-in offers, keywords, forms, and QR codes that bring in consenting contacts.",
      "A texting list is only as valuable as the consent behind it. These guides cover ways to invite customers to opt in, what to offer in exchange, and how to record consent so your list stays compliant as it grows.",
    ],
  },
  solar: {
    intro: [
      "Texting guides for solar sales teams: lead response, appointment setting, proposal follow-up, and installation updates.",
      "Solar sales cycles are long and involve several appointments, so reliable follow-up matters. These articles cover how solar teams text new leads, confirm site surveys and consultations, and keep homeowners informed from signed contract to installation.",
    ],
    landing: { href: "/solar-sales-texting-crm", label: "See the texting CRM for solar sales teams" },
  },
  staffing: {
    intro: [
      "Texting guides for staffing agencies: candidate outreach, shift fills, interview reminders, and first-day logistics.",
      "Candidates rarely answer unknown calls, and open shifts need filling fast. These articles cover how staffing agencies use texting to respond to applicants, fill shifts quickly, and reduce interview and first-day no-shows.",
    ],
    landing: { href: "/recruiting-texting-crm", label: "See the recruiting texting CRM" },
  },
  "local-business": {
    intro: [
      "Texting guides for local businesses: reminders, waitlists, reviews, and referrals that keep a neighborhood customer base coming back.",
      "Local businesses compete on convenience and reputation, and text messages support both. These articles cover appointment reminders, filling last-minute cancellations from a waitlist, asking for Google reviews, and running a simple referral program, with examples drawn from salons, restaurants, pet care, and professional offices.",
    ],
    landing: { href: "/mass-texting-crm", label: "See how Text2Sale works for local businesses" },
  },
  legal: {
    intro: [
      "Guides to the legal side of business texting: Do Not Call rules, state laws, and how client intake works in law firms.",
      "Texting sits under several overlapping rules, from federal consent requirements to state mini-TCPA laws and the Do Not Call Registry. These articles explain how they fit together in plain language and how a law practice can use texting responsibly. They are general information, not legal advice, so confirm anything specific to your business with counsel.",
    ],
    landing: { href: "/10dlc-compliant-texting", label: "Read about 10DLC compliant texting" },
  },
  medicare: {
    intro: [
      "Texting guides for Medicare agents: the Annual Enrollment Period, turning-65 prospects, and the January to March Medicare Advantage window.",
      "Medicare is seasonal and tightly regulated. CMS marketing rules prohibit unsolicited contact, so a permission-based list matters more here than anywhere else in insurance. These articles cover when each enrollment window opens, who agents can contact, and how to use texting to schedule conversations without breaking the rules.",
    ],
    landing: { href: "/medicare-agent-texting-crm", label: "See the Medicare agent texting CRM" },
  },
  "missed-calls": {
    intro: [
      "Guides to recovering missed calls: automatic text-backs, AI phone receptionists, and forwarding your cell so no caller is lost to voicemail.",
      "Many callers will not leave a voicemail, and a call that goes unanswered often becomes a lost customer. These articles cover the cheapest recovery tactic, a text sent right after a missed call, and how an AI receptionist can answer, take a message, or book an appointment while you are busy.",
    ],
    landing: { href: "/ai-texting-crm", label: "See the AI texting CRM" },
  },
  technical: {
    intro: [
      "Technical guides to business texting: message segments, encoding, number types, integrations, and delivery troubleshooting.",
      "Some texting questions come down to how the system works: why a message was split into several parts, why it cost more than expected, or why it did not arrive. These articles explain the technical details in plain language.",
    ],
  },
};
