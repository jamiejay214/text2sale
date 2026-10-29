// Competitor comparison data for the /text2sale-vs-* pages.
//
// Every competitor figure was read from that company's public pricing page
// on PRICING_CHECKED. Re-check before editing: prices change often, and a
// wrong number on a comparison page costs more trust than it earns. Where a
// pricing page did not state something, say "Not listed" rather than guess.

export const PRICING_CHECKED = "October 2026";

export type ComparisonRow = { label: string; text2sale: string; competitor: string };
export type FaqItem = { question: string; answer: string };

export type Competitor = {
  slug: string;
  name: string;
  pricingUrl: string;
  metaTitle: string;
  metaDescription: string;
  headline: string;
  summary: string;
  whatItIs: string;
  rows: ComparisonRow[];
  chooseCompetitor: string[];
  chooseText2Sale: string[];
  switching: string[];
  faq: FaqItem[];
  alternativePath?: string;
};

// Text2Sale's side of the table, kept in one place so all pages agree with
// lib/sms-pricing.ts, lib/call-pricing.ts and the pricing page.
export const T2S = {
  price: "$39.99/user/mo (Text), $89.99 (Dialer), $119.99 (Complete)",
  sms: "$0.015 per segment ($0.0135 after a $500+ deposit); inbound free",
  calls: "$0.025/min outbound, $0.015/min inbound",
  powerDialer: "Yes, on Dialer and Complete",
  predictive: "Yes, up to 3 lines",
  aiText: "Yes, AI replies at $0.02 each plus segments",
  aiVoice: "Yes, AI receptionist at $0.18/min",
  booking: "Yes, with Google Calendar and reminders",
  tenDlc: "Guided 10DLC registration built in",
  numbers: "$1.50/month",
  contract: "Month to month",
};

export const COMPETITORS: Competitor[] = [
  {
    slug: "salesmsg",
    name: "Salesmsg",
    pricingUrl: "https://www.salesmessage.com/pricing",
    metaTitle: "Text2Sale vs Salesmsg (2026): Pricing, Dialer & AI Compared",
    metaDescription:
      "Text2Sale vs Salesmsg compared: plan prices, texting costs, power and predictive dialing, AI replies, AI receptionist, and which one fits insurance agents and sales teams.",
    headline: "Text2Sale vs Salesmsg: business texting platform or lead follow-up CRM?",
    summary:
      "Salesmsg is a business texting and calling platform with strong CRM integrations. Text2Sale is built for agents who work lead lists: texting, power and predictive dialing, AI replies, an AI receptionist and appointment booking in one workspace.",
    whatItIs:
      "Salesmsg sells credit-based plans for business texting and calling, with integrations for CRMs such as HubSpot and Salesforce. Its pricing page lists a Basic plan at $25/month and a Pro plan at $277/month, each with one seat and one number included, plus custom Enterprise pricing. An SMS uses 1 credit and a calling minute uses 1 credit.",
    rows: [
      { label: "Starting price", text2sale: "$39.99/user/mo", competitor: "$25/mo (Basic); Pro $277/mo" },
      { label: "Extra users", text2sale: "Per-user plans", competitor: "$10/seat/mo" },
      { label: "Texting cost", text2sale: T2S.sms, competitor: "Credit-based: 1 credit per SMS, 2 per MMS" },
      { label: "Calling", text2sale: T2S.calls, competitor: "1 credit per minute; forwarding 2 credits/min" },
      { label: "Power dialer", text2sale: T2S.powerDialer, competitor: "Not listed on pricing page" },
      { label: "Predictive dialer", text2sale: T2S.predictive, competitor: "Not listed on pricing page" },
      { label: "AI text replies", text2sale: T2S.aiText, competitor: "AI agents offered; per-plan details not listed" },
      { label: "AI receptionist for inbound calls", text2sale: T2S.aiVoice, competitor: "Not listed on pricing page" },
      { label: "Appointment booking", text2sale: T2S.booking, competitor: "Not listed on pricing page" },
      { label: "CRM integrations", text2sale: "Built-in CRM; CSV import", competitor: "HubSpot, Salesforce, Zapier and more" },
      { label: "Extra phone numbers", text2sale: T2S.numbers, competitor: "$5/mo" },
      { label: "Built for", text2sale: "Lead-driven insurance and sales teams", competitor: "Businesses texting customers from their existing CRM" },
    ],
    chooseCompetitor: [
      "Your team already lives in HubSpot or Salesforce and you want texting added to it.",
      "You mostly have one-to-one customer conversations, not lead list outreach.",
      "You need an enterprise plan with custom terms.",
    ],
    chooseText2Sale: [
      "You buy or generate leads and need to text and call them fast from one place.",
      "You want power or predictive dialing alongside texting.",
      "You want AI to reply, qualify and book appointments, and to answer inbound calls.",
      "You prefer simple per-segment pricing over credits.",
    ],
    switching: [
      "Export your contacts and tags from Salesmsg or your CRM as CSV.",
      "Import the CSV into Text2Sale and map fields such as name, phone, state and lead source.",
      "Complete the guided 10DLC registration so your new number can send.",
      "Rebuild your templates and follow-up sequences, then send to a small batch first.",
    ],
    faq: [
      { question: "Is Text2Sale cheaper than Salesmsg?", answer: "It depends on volume and team size. Salesmsg starts at $25/month on credits; Text2Sale starts at $39.99/user/month with texts at $0.015 per segment and free inbound. Teams that also need a dialer often save by not buying a separate dialing tool." },
      { question: "Does Salesmsg have a predictive dialer?", answer: "Its pricing page does not list power or predictive dialing. Text2Sale includes both on the Dialer and Complete plans." },
      { question: "Can Text2Sale replace Salesmsg for insurance agents?", answer: "For agents who mainly text and call lead lists, yes. If you need texting inside an existing HubSpot or Salesforce setup, Salesmsg's integrations may fit better." },
      { question: "How long does switching take?", answer: "Most teams import contacts in minutes. Carrier registration for a new texting number usually takes the longest, so start it first." },
    ],
    alternativePath: "/best-salesmsg-alternative",
  },
  {
    slug: "textdrip",
    name: "Textdrip",
    pricingUrl: "https://www.textdrip.com/pricing",
    metaTitle: "Text2Sale vs Textdrip (2026): Pricing, Dialer & AI Compared",
    metaDescription:
      "Text2Sale vs Textdrip compared: plan prices, per-text costs, drip campaigns, power and predictive dialing, AI replies and which one fits insurance agents.",
    headline: "Text2Sale vs Textdrip: drip texting tool or texting plus dialing in one CRM?",
    summary:
      "Textdrip is a low-cost drip texting platform popular with insurance agents. Text2Sale adds power and predictive dialing, an AI receptionist and appointment booking, so texting and calling live on one record.",
    whatItIs:
      "Textdrip sells credit-based texting plans: Spark Starter $19.99/month, Growth Gear $34.99/month and Elite $74.99/month, with lower prices billed yearly. One credit costs $0.012, and an SMS uses 1 credit on Growth Gear and Elite (2 on Spark Starter). Some automation features are add-ons on the lower plans.",
    rows: [
      { label: "Starting price", text2sale: "$39.99/user/mo", competitor: "$19.99/mo (Spark Starter)" },
      { label: "Texting cost", text2sale: T2S.sms, competitor: "$0.012 per SMS on Growth Gear/Elite; $0.024 on Spark Starter" },
      { label: "Drip campaigns", text2sale: "Yes, stop on reply or opt-out", competitor: "Yes, SMS and MMS drips" },
      { label: "Calling", text2sale: T2S.calls, competitor: "Voice calls and call forwarding listed" },
      { label: "Power dialer", text2sale: T2S.powerDialer, competitor: "Not listed on pricing page" },
      { label: "Predictive dialer", text2sale: T2S.predictive, competitor: "Not listed on pricing page" },
      { label: "AI", text2sale: `${T2S.aiText}; ${T2S.aiVoice}`, competitor: "AI message generator; AI automation as add-ons on lower plans" },
      { label: "Appointment booking", text2sale: T2S.booking, competitor: "Not listed on pricing page" },
      { label: "10DLC fees", text2sale: "Carrier registration fees passed through", competitor: "$5 brand + $45 campaign on Spark Starter; included on higher plans" },
      { label: "Extra phone numbers", text2sale: T2S.numbers, competitor: "1 free, $0.50 each after" },
      { label: "Built for", text2sale: "Agents who text and call lead lists", competitor: "Agents focused on drip texting" },
    ],
    chooseCompetitor: [
      "You only need drip texting and want the lowest monthly price.",
      "Your team does its calling in another tool and is happy with it.",
      "You want built-in extras such as reward points or gift cards.",
    ],
    chooseText2Sale: [
      "You want texting and power or predictive dialing on the same lead record.",
      "You want an AI receptionist answering callbacks from the leads you text and dial.",
      "You want AI replies to qualify leads and book appointments on your calendar.",
      "You would rather run one tool than a texting app plus a dialer.",
    ],
    switching: [
      "Export contacts and tags from Textdrip as CSV.",
      "Import into Text2Sale and map fields, and mark anyone who opted out as DNC.",
      "Register your brand and campaign for 10DLC in Text2Sale.",
      "Recreate your drips as sequences and test with a small batch.",
    ],
    faq: [
      { question: "Is Textdrip cheaper than Text2Sale?", answer: "For texting alone, Textdrip's entry price and $0.012 credit are lower. Text2Sale costs more per month but includes a power and predictive dialer, AI receptionist and booking that would otherwise be separate tools." },
      { question: "Does Textdrip have a dialer?", answer: "Textdrip lists voice calls and call forwarding. Its pricing page does not list a power or predictive dialer; Text2Sale includes both." },
      { question: "Can I move my Textdrip drips to Text2Sale?", answer: "Yes. Recreate each drip as a Text2Sale sequence. Sequences stop automatically when a lead replies or opts out." },
      { question: "Which is better for insurance agents?", answer: "Agents who mostly text can do well with Textdrip. Agents who text and call large lead lists usually get more from having both in Text2Sale." },
    ],
    alternativePath: "/best-textdrip-alternative",
  },
  {
    slug: "gohighlevel",
    name: "GoHighLevel",
    pricingUrl: "https://www.gohighlevel.com/pricing",
    metaTitle: "Text2Sale vs GoHighLevel (2026): Pricing & Features for Agents",
    metaDescription:
      "Text2Sale vs GoHighLevel compared: plan prices, usage costs, texting, dialing, AI and setup time. Which one fits insurance agents versus marketing agencies.",
    headline: "Text2Sale vs GoHighLevel: an all-in-one agency platform or a focused lead follow-up tool?",
    summary:
      "GoHighLevel is a broad marketing platform for agencies: funnels, websites, email, SMS, calendars and more. Text2Sale does fewer things, focused on texting, dialing, AI follow-up and booking for agents who work leads.",
    whatItIs:
      "GoHighLevel's plans are Starter at $97/month, Unlimited at $297/month and Agency Pro at $497/month, with annual options. SMS, calling, email and premium AI are billed separately as usage. AI Employee add-ons are $50 or $97 per month per sub-account.",
    rows: [
      { label: "Starting price", text2sale: "$39.99/user/mo", competitor: "$97/mo (Starter, 3 sub-accounts)" },
      { label: "Texting and calls", text2sale: `${T2S.sms}; ${T2S.calls}`, competitor: "Usage-based charges; rates not listed on pricing page" },
      { label: "Power dialer", text2sale: T2S.powerDialer, competitor: "Not listed on pricing page" },
      { label: "Predictive dialer", text2sale: T2S.predictive, competitor: "Not listed on pricing page" },
      { label: "AI", text2sale: `${T2S.aiText}; ${T2S.aiVoice}`, competitor: "Conversation AI and Voice AI (usage-based); AI Employee $50–$97/mo per sub-account" },
      { label: "Appointment booking", text2sale: T2S.booking, competitor: "Yes, built-in calendars" },
      { label: "Funnels, websites, email marketing", text2sale: "No", competitor: "Yes" },
      { label: "Setup", text2sale: "Import leads and start texting the same day", competitor: "Broad platform; more setup and configuration" },
      { label: "Built for", text2sale: "Agents and sales teams working leads", competitor: "Marketing agencies and businesses running many channels" },
    ],
    chooseCompetitor: [
      "You run a marketing agency and resell software to clients.",
      "You need funnels, websites, email marketing and SMS in one platform.",
      "You have time to configure workflows across many features.",
    ],
    chooseText2Sale: [
      "You are an agent or sales team that needs to text and call leads, not build funnels.",
      "You want a predictive dialer without bolting on another tool.",
      "You want to be live the same day with clear per-text and per-minute pricing.",
      "You want an AI receptionist and AI replies focused on booking calls.",
    ],
    switching: [
      "Export contacts from your GoHighLevel sub-account as CSV.",
      "Import into Text2Sale with tags and lead source.",
      "Register 10DLC for your Text2Sale number.",
      "Recreate the follow-up workflows you actually use as Text2Sale sequences.",
    ],
    faq: [
      { question: "Is Text2Sale a GoHighLevel replacement?", answer: "Only for the lead follow-up part. Text2Sale does not build funnels or websites. Agents who mainly need texting, dialing and booking often find it simpler and cheaper." },
      { question: "Does GoHighLevel charge for SMS?", answer: "Yes. Its pricing page says SMS, calling, email and premium AI are usage-based charges on top of the plan." },
      { question: "Does GoHighLevel have a predictive dialer?", answer: "Its pricing page does not list one. Text2Sale includes power and predictive dialing up to three lines." },
      { question: "Which is easier to set up?", answer: "Text2Sale is narrower, so most agents import leads and start the same day. GoHighLevel's breadth takes more configuration." },
    ],
    alternativePath: "/best-gohighlevel-alternative",
  },
  {
    slug: "twilio",
    name: "Twilio",
    pricingUrl: "https://www.twilio.com/en-us/sms/pricing/us",
    metaTitle: "Text2Sale vs Twilio (2026): Build It Yourself or Ready-to-Use CRM?",
    metaDescription:
      "Text2Sale vs Twilio compared: per-message costs, carrier fees, numbers, and what you get out of the box versus what you have to build with an API.",
    headline: "Text2Sale vs Twilio: raw messaging API or a ready-to-use texting and dialing CRM?",
    summary:
      "Twilio is a developer platform: you get low-level messaging and voice APIs and build the product yourself. Text2Sale is the finished product, with inbox, campaigns, dialer, AI and booking ready to use.",
    whatItIs:
      "Twilio charges $0.0083 per US long code SMS segment, outbound or inbound, plus carrier fees that vary by carrier. Long code numbers are $1.15/month. 10DLC registration fees apply. There is no CRM, inbox or dialer; you build those on top of the API.",
    rows: [
      { label: "What you get", text2sale: "Complete CRM: inbox, campaigns, dialer, AI, booking", competitor: "APIs for messaging and voice; you build the app" },
      { label: "SMS cost", text2sale: `${T2S.sms} (carrier fees included)`, competitor: "$0.0083 per segment each way, plus carrier fees" },
      { label: "Inbound SMS", text2sale: "Free", competitor: "$0.0083 per segment plus carrier fees" },
      { label: "Phone numbers", text2sale: T2S.numbers, competitor: "$1.15/month" },
      { label: "Dialer", text2sale: "Manual, power and predictive", competitor: "Build it with the Voice API" },
      { label: "AI", text2sale: `${T2S.aiText}; ${T2S.aiVoice}`, competitor: "Build it with your own AI provider" },
      { label: "Opt-out and quiet hours", text2sale: "Automatic", competitor: "Basic STOP handling; quiet hours and the rest are yours to build" },
      { label: "Engineering needed", text2sale: "None", competitor: "Yes" },
      { label: "Built for", text2sale: "Agents and sales teams", competitor: "Developers building communication products" },
    ],
    chooseCompetitor: [
      "You have developers and want to build a custom product.",
      "You send very high volume and want the lowest raw per-message cost.",
      "You need messaging inside your own app.",
    ],
    chooseText2Sale: [
      "You want to start texting and calling leads today without engineering.",
      "You need an inbox, campaigns, a dialer and AI that already work together.",
      "You want quiet hours, opt-outs and 10DLC handled for you.",
    ],
    switching: [
      "Export contacts and opt-outs from your Twilio-based app.",
      "Import into Text2Sale and register 10DLC for a new number.",
      "Set up sequences, AI replies and the dialer.",
    ],
    faq: [
      { question: "Is Twilio cheaper than Text2Sale?", answer: "Twilio's raw per-segment rate is lower, but carrier fees, inbound charges and the cost of building and maintaining your own app are extra. Text2Sale's rate includes carrier fees and inbound texts are free." },
      { question: "Does Text2Sale use Twilio?", answer: "No. Text2Sale runs on its own messaging and voice infrastructure, so you never need a Twilio account or API keys." },
      { question: "Can I use Text2Sale without a developer?", answer: "Yes. Everything works in the browser: import leads, send campaigns, dial and book appointments." },
    ],
    alternativePath: "/best-twilio-alternative",
  },
  {
    slug: "onlysales",
    name: "OnlySales",
    pricingUrl: "https://onlysales.io/pricing",
    metaTitle: "Text2Sale vs OnlySales (2026): Pricing, AI & Dialer Compared",
    metaDescription:
      "Text2Sale vs OnlySales compared for insurance agents: subscription price, per-text and per-minute costs, dialing, AI replies, AI receptionist and booking.",
    headline: "Text2Sale vs OnlySales: two agent-focused tools, compared honestly.",
    summary:
      "OnlySales is a low-cost texting, drip and calling platform with a pipeline for health advisors. Text2Sale adds predictive dialing, AI replies, an AI receptionist and appointment booking on top of texting and calling.",
    whatItIs:
      "OnlySales lists one subscription for agents at $35/month with unlimited lead uploads, SMS, calling and pipeline management. Usage is $0.012 per outbound segment, free inbound messages, $0.02 per call minute and $1/month per phone number.",
    rows: [
      { label: "Price", text2sale: "$39.99/user/mo (Text) to $119.99 (Complete)", competitor: "$35/mo" },
      { label: "Texting cost", text2sale: T2S.sms, competitor: "$0.012 per outbound segment; inbound free" },
      { label: "Calling cost", text2sale: T2S.calls, competitor: "$0.02 per minute" },
      { label: "Phone numbers", text2sale: T2S.numbers, competitor: "$1/month" },
      { label: "Predictive dialer", text2sale: T2S.predictive, competitor: "Not listed on pricing page" },
      { label: "AI text replies", text2sale: T2S.aiText, competitor: "Not listed on pricing page" },
      { label: "AI receptionist", text2sale: T2S.aiVoice, competitor: "Not listed on pricing page" },
      { label: "Appointment booking", text2sale: T2S.booking, competitor: "Not listed on pricing page" },
      { label: "Drip campaigns", text2sale: "Yes, stop on reply or opt-out", competitor: "Yes, SMS campaigns and drips" },
      { label: "Pipeline", text2sale: "Lead stages, tags and dispositions", competitor: "Pipeline management" },
      { label: "Built for", text2sale: "Agents who want AI and dialing automation", competitor: "Agents who want low-cost texting and calling" },
    ],
    chooseCompetitor: [
      "You want the lowest per-text and per-minute rates.",
      "You make calls one at a time and do not need a predictive dialer.",
      "You do not need AI replies or an AI receptionist.",
    ],
    chooseText2Sale: [
      "You want predictive dialing to work large or aged lists faster.",
      "You want AI to answer texts, qualify leads and book appointments.",
      "You want an AI receptionist to catch callbacks when you are busy.",
    ],
    switching: [
      "Export your leads and pipeline stages from OnlySales as CSV.",
      "Import into Text2Sale and map stages to tags or dispositions.",
      "Register 10DLC, then turn on AI replies and the dialer.",
      "Map suppression and consent data before enrolling contacts. Sending requires an eligible account, a funded wallet, a sending number and completed carrier registration.",
    ],
    faq: [
      { question: "Is OnlySales cheaper than Text2Sale?", answer: "Yes on the base price and per-message rates. Text2Sale costs more but includes predictive dialing, AI replies, an AI receptionist and booking." },
      { question: "Does OnlySales have AI?", answer: "Its pricing page does not mention AI features. Text2Sale includes AI text replies and an AI receptionist." },
      { question: "Which is better for aged leads?", answer: "For large aged lists, Text2Sale's predictive dialer and AI replies help a small team work more leads. For light volume, OnlySales' lower rates may be enough." },
    ],
    alternativePath: "/best-onlysales-alternative",
  },
  {
    slug: "aloware",
    name: "Aloware",
    pricingUrl: "https://aloware.com/pricing",
    metaTitle: "Text2Sale vs Aloware (2026): Pricing, Dialer & AI Compared",
    metaDescription:
      "Text2Sale vs Aloware compared: per-user prices, user minimums, power dialing, texting, AI and which one fits small insurance teams versus larger call centers.",
    headline: "Text2Sale vs Aloware: a contact center platform or a lead follow-up CRM for small teams?",
    summary:
      "Aloware is a cloud contact center with power dialing, texting and AI voice analytics, aimed at teams that run on HubSpot or Salesforce. Text2Sale is built for solo agents and small teams with no user minimums.",
    whatItIs:
      "Aloware's per-user plans are iPro + AI, uPro + AI and xPro + AI, from $30 to $100 per user per month depending on plan and billing, with minimums of 5 to 10 users. Its power dialer starts on uPro. Packages for up to 3 or 5 users are $199 and $399 per month.",
    rows: [
      { label: "Starting price", text2sale: "$39.99/user/mo, no minimum", competitor: "From $30–$40/user/mo with a 10-user minimum; 3-user package $199/mo" },
      { label: "Power dialer", text2sale: T2S.powerDialer, competitor: "uPro and above" },
      { label: "Predictive dialer", text2sale: T2S.predictive, competitor: "Not listed on pricing page" },
      { label: "Agent texting", text2sale: T2S.sms, competitor: "Agent SMS included; automated SMS 1¢–2¢ per segment plus carrier fees" },
      { label: "AI", text2sale: `${T2S.aiText}; ${T2S.aiVoice}`, competitor: "Voice analytics, transcription; AI voice bot from $0.10/min" },
      { label: "CRM", text2sale: "Built-in CRM", competitor: "Integrates with HubSpot and Salesforce" },
      { label: "Phone numbers", text2sale: T2S.numbers, competitor: "$4–$6/month" },
      { label: "Built for", text2sale: "Solo agents and small teams", competitor: "Sales and support teams of 5+ on a CRM" },
    ],
    chooseCompetitor: [
      "You run a team of 5 or more on HubSpot or Salesforce.",
      "You need contact center features such as IVRs, call scoring and agent monitoring.",
      "You want deep voice analytics and transcription.",
    ],
    chooseText2Sale: [
      "You are a solo agent or a small team with no user minimum.",
      "You want a built-in CRM instead of integrating another one.",
      "You want predictive dialing, AI replies and booking in one simple tool.",
    ],
    switching: [
      "Export contacts from your CRM or Aloware as CSV.",
      "Import into Text2Sale and register 10DLC.",
      "Set up the dialer, sequences and AI replies.",
    ],
    faq: [
      { question: "Does Aloware have a user minimum?", answer: "Yes. Its per-user plans require 5 or 10 users, with packages for up to 3 or 5 users. Text2Sale has no minimum." },
      { question: "Is Aloware a CRM?", answer: "Aloware is a contact center that integrates with CRMs such as HubSpot and Salesforce. Text2Sale includes its own CRM." },
      { question: "Which is better for a solo insurance agent?", answer: "Text2Sale, because there is no user minimum and texting, dialing and booking are included in one plan." },
    ],
  },
  {
    slug: "phoneburner",
    name: "PhoneBurner",
    pricingUrl: "https://www.phoneburner.com/pricing",
    metaTitle: "Text2Sale vs PhoneBurner (2026): Pricing, Texting & AI Compared",
    metaDescription:
      "Text2Sale vs PhoneBurner compared: per-user prices, power dialing, texting limits, voicemail drop, AI and which one fits insurance agents.",
    headline: "Text2Sale vs PhoneBurner: a dedicated power dialer or texting and dialing together?",
    summary:
      "PhoneBurner is a well-known power dialer with unlimited dialing and one-click voicemail drops. Text2Sale combines dialing with two-way texting, AI replies, an AI receptionist and booking at a lower per-user price.",
    whatItIs:
      "PhoneBurner's plans are Standard ($140–$165/user/month), Professional ($165–$195) and Premium ($183–$215), depending on annual or monthly billing. All include unlimited power dialing and voicemail drop. Texting is only on Premium, with 1,000 outbound messages per month.",
    rows: [
      { label: "Price", text2sale: "$89.99/user/mo (Dialer), $119.99 (Complete)", competitor: "$140–$215/user/mo" },
      { label: "Power dialer", text2sale: T2S.powerDialer, competitor: "Unlimited on all plans" },
      { label: "Predictive (multi-line) dialing", text2sale: T2S.predictive, competitor: "Not listed on pricing page" },
      { label: "Calling cost", text2sale: T2S.calls, competitor: "Unlimited dialing included" },
      { label: "Texting", text2sale: `Two-way texting and campaigns; ${T2S.sms}`, competitor: "Premium only: 1,000 outbound/mo, then $15 per 1,000" },
      { label: "Voicemail drop", text2sale: "Leave voicemails and follow up by text", competitor: "1-click voicemail on all plans" },
      { label: "AI", text2sale: `${T2S.aiText}; ${T2S.aiVoice}`, competitor: "AI note-taker and transcription on Premium" },
      { label: "Appointment booking", text2sale: T2S.booking, competitor: "Not listed on pricing page" },
      { label: "Built for", text2sale: "Agents who text and call", competitor: "Teams focused on high-volume calling" },
    ],
    chooseCompetitor: [
      "Your team mainly calls and wants unlimited minutes at a flat price.",
      "You rely on one-click voicemail drops.",
      "You already use a CRM that PhoneBurner integrates with.",
    ],
    chooseText2Sale: [
      "You want two-way texting and campaigns without a Premium-only cap.",
      "You want multi-line predictive dialing.",
      "You want AI replies and an AI receptionist working alongside the dialer.",
      "You want a lower per-user price.",
    ],
    switching: [
      "Export contacts and dispositions from PhoneBurner or your CRM.",
      "Import into Text2Sale and register 10DLC for texting.",
      "Set up dialer lists and follow-up texts for missed calls.",
    ],
    faq: [
      { question: "Is PhoneBurner more expensive than Text2Sale?", answer: "Per user, yes: PhoneBurner is $140–$215/user/month, while Text2Sale's Dialer plan is $89.99 and Complete is $119.99, plus usage." },
      { question: "Does PhoneBurner include texting?", answer: "Only on Premium, with 1,000 outbound texts per month. Text2Sale includes two-way texting and campaigns on its Text and Complete plans." },
      { question: "Is PhoneBurner a predictive dialer?", answer: "PhoneBurner is a power dialer. Its pricing page does not list multi-line predictive dialing; Text2Sale dials up to three lines." },
    ],
  },
  {
    slug: "kixie",
    name: "Kixie",
    pricingUrl: "https://www.kixie.com/pricing/",
    metaTitle: "Text2Sale vs Kixie (2026): Dialer, Texting & AI Compared",
    metaDescription:
      "Text2Sale vs Kixie compared: power dialing, multi-line dialing, texting, CRM integrations, AI and which one fits insurance agents.",
    headline: "Text2Sale vs Kixie: a CRM-connected dialer or an all-in-one lead follow-up tool?",
    summary:
      "Kixie is a business phone and power dialer that plugs into CRMs such as HubSpot and Salesforce. Text2Sale includes its own CRM with texting, predictive dialing, AI and booking in one place.",
    whatItIs:
      "Kixie's plans are Professional, Single-Line PowerDialer and Multi-Line PowerDialer (up to 4 lines), with unlimited US and Canada minutes and texting on every plan. Its pricing page does not show prices; several AI features are premium add-ons.",
    rows: [
      { label: "Price", text2sale: "$39.99–$119.99/user/mo, published", competitor: "Not shown on pricing page" },
      { label: "Power dialer", text2sale: T2S.powerDialer, competitor: "Single-line and multi-line plans" },
      { label: "Multi-line dialing", text2sale: T2S.predictive, competitor: "Up to 4 lines" },
      { label: "Texting", text2sale: `Two-way texting and campaigns; ${T2S.sms}`, competitor: "Text messaging, team SMS and templates" },
      { label: "AI", text2sale: `${T2S.aiText}; ${T2S.aiVoice}`, competitor: "AI human voice detection and conversation intelligence as add-ons" },
      { label: "CRM", text2sale: "Built-in CRM", competitor: "Two-way sync with HubSpot, Salesforce and others" },
      { label: "Appointment booking", text2sale: T2S.booking, competitor: "Not listed on pricing page" },
      { label: "Built for", text2sale: "Agents who want one tool", competitor: "Teams that run on an external CRM" },
    ],
    chooseCompetitor: [
      "Your team runs on HubSpot, Salesforce or another supported CRM.",
      "You want unlimited minutes and up to 4-line dialing.",
      "You need IVR, ring groups and call queues.",
    ],
    chooseText2Sale: [
      "You do not want to buy and maintain a separate CRM.",
      "You want published, per-user pricing.",
      "You want AI replies, an AI receptionist and booking included.",
    ],
    switching: [
      "Export contacts from your CRM as CSV.",
      "Import into Text2Sale and register 10DLC.",
      "Set up dialer lists, sequences and AI replies.",
    ],
    faq: [
      { question: "How much does Kixie cost?", answer: "Kixie's pricing page does not show prices. Text2Sale publishes its plans: $39.99, $89.99 and $119.99 per user per month plus usage." },
      { question: "Does Kixie need a CRM?", answer: "Kixie is built to sync with an external CRM. Text2Sale includes its own." },
      { question: "Which has better multi-line dialing?", answer: "Kixie's top plan dials up to 4 lines; Text2Sale's predictive dialer dials up to 3. Both can significantly reduce idle time on large lists." },
    ],
  },
  {
    slug: "close",
    name: "Close",
    pricingUrl: "https://www.close.com/pricing",
    metaTitle: "Text2Sale vs Close CRM (2026): Pricing, Dialer & AI Compared",
    metaDescription:
      "Text2Sale vs Close compared: per-user prices, power and predictive dialers, texting, AI and which one fits insurance agents versus B2B sales teams.",
    headline: "Text2Sale vs Close: a B2B sales CRM or a lead follow-up CRM for agents?",
    summary:
      "Close is a sales CRM with built-in calling, SMS and email, popular with B2B and SMB sales teams. Text2Sale is narrower and built around texting and dialing consumer leads, with an AI receptionist and appointment booking.",
    whatItIs:
      "Close's plans are Solo, Essentials, Growth and Scale, from about $9 to $149 per user per month depending on plan and billing. Calling and SMS are included at cost. The power dialer starts on Growth and the predictive dialer is on Scale.",
    rows: [
      { label: "Starting price", text2sale: "$39.99/user/mo", competitor: "From about $9–$19/user/mo (Solo)" },
      { label: "Power dialer", text2sale: "Dialer plan, $89.99/user/mo", competitor: "Growth plan, about $99–$109/user/mo" },
      { label: "Predictive dialer", text2sale: "Dialer plan, $89.99/user/mo", competitor: "Scale plan, about $139–$149/user/mo" },
      { label: "Calls and SMS", text2sale: `${T2S.sms}; ${T2S.calls}`, competitor: "Passed through at cost; calls about $0.02/min" },
      { label: "Email sequences", text2sale: "No", competitor: "Yes" },
      { label: "AI", text2sale: `${T2S.aiText}; ${T2S.aiVoice}`, competitor: "AI assistant with monthly credits; call assistant $50/org/mo" },
      { label: "AI receptionist for inbound calls", text2sale: T2S.aiVoice, competitor: "Not listed on pricing page" },
      { label: "Appointment booking", text2sale: T2S.booking, competitor: "Not listed on pricing page" },
      { label: "Built for", text2sale: "Insurance agents and consumer lead follow-up", competitor: "B2B and SMB sales teams" },
    ],
    chooseCompetitor: [
      "You sell B2B and need email sequences, pipelines and reporting.",
      "You want a general-purpose sales CRM with calling built in.",
      "You only need basic calling and are happy on the Solo or Essentials plan.",
    ],
    chooseText2Sale: [
      "You work consumer leads mostly by text and phone.",
      "You want predictive dialing without paying for the top CRM tier.",
      "You want an AI receptionist and AI replies that book appointments.",
    ],
    switching: [
      "Export leads from Close as CSV.",
      "Import into Text2Sale and register 10DLC.",
      "Set up dialer lists, sequences and AI replies.",
    ],
    faq: [
      { question: "Is Close cheaper than Text2Sale?", answer: "Close's entry plans are cheaper, but its power dialer starts on Growth and its predictive dialer on Scale. Text2Sale includes both on its $89.99 Dialer plan." },
      { question: "Is Close good for insurance agents?", answer: "Close is built mainly for B2B sales. Insurance agents who work consumer leads by text and phone often prefer Text2Sale's texting, AI receptionist and booking." },
      { question: "Does Close have texting?", answer: "Yes, SMS is included and billed at cost. Text2Sale adds campaign texting, drip sequences and AI replies." },
    ],
  },
];

export function getCompetitor(slug: string): Competitor {
  const competitor = COMPETITORS.find((item) => item.slug === slug);
  if (!competitor) throw new Error(`Unknown competitor: ${slug}`);
  return competitor;
}
