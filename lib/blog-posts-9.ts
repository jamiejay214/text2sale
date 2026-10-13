import type { BlogPost } from "./blog-posts";

type NewArticle = Omit<BlogPost, "datePublished" | "dateModified" | "readMinutes">;

// Volume 9: growing and protecting a text list (pop-ups, thank-you texts,
// review recovery, passcodes, scam awareness, Canadian rules, records),
// responding to leads from Facebook, Google and home-service marketplaces,
// insurance niches, and industry guides not covered in earlier volumes.
const ARTICLES: NewArticle[] = [
  {
    slug: "grow-sms-list-with-website-popups",
    metaTitle: "How to Grow Your SMS List With Website Pop-Ups | Text2Sale",
    title: "How to grow your SMS list with website pop-ups",
    description: "How to design a website pop-up that collects SMS subscribers with proper consent: offer, timing, form fields, consent wording and the first message.",
    excerpt: "A well-timed pop-up can become your steadiest source of SMS subscribers. Here is how to build one that converts and stays compliant.",
    tags: ["Lead generation", "SMS marketing", "Ecommerce"],
    intro: [
      "Most people who visit your website leave without buying or getting in touch. A pop-up that invites them to join your text list gives you a way to follow up with the ones who are interested.",
      "Done well, it converts visitors without annoying them. Done badly, it gets closed instantly and can create consent problems.",
    ],
    sections: [
      {
        heading: "Offer something worth a phone number",
        paragraphs: [
          "People share their number when they get something clear in return: a first-order discount, early access to sales, appointment reminders or a free guide. Say what they will receive and how often, so the sign-up feels like a fair trade.",
        ],
      },
      {
        heading: "Timing and design",
        paragraphs: [
          "Show the pop-up after a visitor has engaged, for example after scrolling halfway or spending some time on the page, or when they move to leave. Make it easy to close, keep the form to one or two fields, and make sure it works well on phones, where most visitors browse.",
        ],
        bullets: [
          "Trigger after engagement or on exit intent.",
          "One or two fields: phone, and optionally first name.",
          "An obvious close button.",
          "Mobile-first layout.",
        ],
      },
      {
        heading: "Consent wording and the first text",
        paragraphs: [
          "Place consent language directly under the phone field: it should name your business, say that marketing texts may be sent with automated technology, state that consent is not required to purchase, mention that rates may apply and that replying STOP opts out, and link your terms and privacy policy. Send a welcome text right away that delivers the promised offer and confirms how to opt out.",
        ],
      },
    ],
    keyTakeaways: [
      "Offer a clear reason to share a phone number.",
      "Trigger the pop-up after engagement, not instantly.",
      "Put full consent wording under the phone field.",
      "Deliver the promised offer in an immediate welcome text.",
    ],
    faq: [
      { question: "Should I ask for email and phone in the same pop-up?", answer: "You can use a two-step form: email first, then phone. Keep each step short and get SMS consent separately." },
      { question: "Is double opt-in required for pop-ups?", answer: "Not always required, but a confirmation text strengthens your consent record and keeps typos off your list." },
    ],
    relatedSlugs: ["how-to-build-an-sms-opt-in-list", "double-opt-in-sms", "sms-welcome-message-examples"],
    relatedPages: [{ href: "/bulk-sms-software", label: "Bulk SMS software" }],
  },
  {
    slug: "customer-thank-you-text-examples",
    metaTitle: "Customer Thank-You Text Message Examples | Text2Sale",
    title: "Customer thank-you text message examples",
    description: "Thank-you texts for new customers, repeat buyers, referrals and reviews, with tips for making them feel personal rather than automated.",
    excerpt: "A short thank-you text costs almost nothing and is remembered far longer than a receipt. Here are examples for every occasion.",
    tags: ["Retention", "Scripts", "Customer service"],
    intro: [
      "Most businesses only text customers when they want something. A thank-you text with no ask attached stands out precisely because it is rare.",
      "It also opens the door for the next conversation, whether that is a review, a referral or a repeat purchase.",
    ],
    sections: [
      {
        heading: "Examples by occasion",
        paragraphs: [
          "Keep each one short, use the customer's name and mention something specific.",
        ],
        bullets: [
          "New customer: Thanks for choosing us, Paul! It was great getting your kitchen faucet sorted today. Text this number anytime you need us.",
          "Repeat customer: Hi Rosa, thank you for coming back again. Customers like you keep our small shop going.",
          "Referral: Thanks for sending your neighbor our way, Mike! We really appreciate it.",
          "Review: Thank you for the kind review, Jen. It made the whole team's day.",
          "Policy anniversary: Hi Carol, it's been a year since we set up your coverage. Thanks for trusting us; I'm here if anything changes.",
        ],
      },
      {
        heading: "Make it feel personal",
        paragraphs: [
          "Mention the job, product or conversation, send it from the person they dealt with when possible, and send it soon after the experience. Avoid adding a discount or link to every thank-you; a pure thank-you builds more goodwill than one that turns into a pitch.",
        ],
      },
      {
        heading: "When to automate",
        paragraphs: [
          "You can automate thank-you texts after purchases or completed jobs, but use merge fields carefully and review the template regularly. For high-value customers and referrals, a hand-written text from the owner or rep is worth the extra minute.",
        ],
      },
    ],
    keyTakeaways: [
      "A thank-you with no ask stands out.",
      "Mention something specific about the customer.",
      "Send soon after the experience.",
      "Hand-write thank-yous for referrals and top customers.",
    ],
    faq: [
      { question: "Can I include a review link in a thank-you text?", answer: "Sometimes, but consider sending the review request separately so the thank-you feels genuine." },
      { question: "Do thank-you texts need marketing consent?", answer: "A simple thank-you after a service is usually transactional, but keep promotional content out unless the customer opted in to marketing." },
    ],
    relatedSlugs: ["birthday-and-anniversary-texts", "new-client-welcome-texts", "referral-programs-by-text-local-business"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "responding-to-negative-reviews-by-text",
    metaTitle: "How to Text a Customer Who Left a Bad Review | Text2Sale",
    title: "How to text a customer who left a bad review",
    description: "When and how to reach out by text after a negative review, what to say, what never to say, and how to turn a complaint into a second chance.",
    excerpt: "A bad review is often a customer who still wants to be heard. A careful, private text can resolve the problem behind it.",
    tags: ["Customer service", "Retention", "Scripts"],
    intro: [
      "Negative reviews sting, but many of them come from customers who would give you another chance if someone actually reached out. A private text, sent the right way, can turn a public complaint into a solved problem.",
      "The goal is to fix the issue, not to get the review removed.",
    ],
    sections: [
      {
        heading: "Respond publicly first",
        paragraphs: [
          "Post a short, calm public reply to the review acknowledging the problem and saying you will reach out. Then text the customer if you have their number and permission to contact them about their service. Future customers read your public replies, so keep them professional.",
        ],
      },
      {
        heading: "What to say in the text",
        paragraphs: [
          "Introduce yourself, acknowledge the specific problem without excuses, and offer a concrete next step. Ask what would make it right.",
        ],
        bullets: [
          "Hi Mark, this is Dana, owner of Fresh Cleaners. I read your review about the stain on your jacket and I'm sorry we let you down. Could I pick it up and have it redone at no charge?",
          "Hi Lena, it's Chris at Maple Dental. I'm sorry your wait was so long on Tuesday. That's not the experience we want. Can I call you to hear more?",
        ],
      },
      {
        heading: "What to avoid",
        paragraphs: [
          "Never ask them to remove the review in exchange for a refund or discount, never argue the facts by text, and do not message repeatedly if they do not reply. If you resolve the problem, you can let them know they are welcome to update their review, but leave the decision to them.",
        ],
      },
    ],
    keyTakeaways: [
      "Reply publicly, then reach out privately.",
      "Acknowledge the specific problem and offer a fix.",
      "Never trade compensation for review removal.",
      "One respectful follow-up is enough.",
    ],
    faq: [
      { question: "Should I text if the review is clearly unfair?", answer: "Reply publicly with the facts politely, and reach out only if you can offer something constructive." },
      { question: "Can I ask them to update the review?", answer: "After a genuine resolution you can mention it once, but don't pressure or incentivize them." },
    ],
    relatedSlugs: ["google-review-requests-for-local-businesses", "handling-wrong-number-and-angry-replies", "two-way-texting-for-customer-service"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "one-time-passcode-2fa-texts",
    metaTitle: "One-Time Passcode (OTP) and 2FA Texts: Best Practices | Text2Sale",
    title: "One-time passcode and 2FA texts: best practices",
    description: "How businesses should send verification codes by text: message format, expiry, security, registration and why marketing never belongs in an OTP message.",
    excerpt: "Verification codes are some of the most important texts a business sends. Here is how to make them clear, secure and reliable.",
    tags: ["Operations", "SMS", "Compliance"],
    intro: [
      "One-time passcodes, used for login verification and two-factor authentication, are a distinct kind of business text. People need them instantly, they must be secure, and they cannot be mixed with anything else.",
      "If your app, portal or booking system sends codes, these practices keep them working.",
    ],
    sections: [
      {
        heading: "Format the message clearly",
        paragraphs: [
          "Lead with the code and the business name, state how long it is valid, and warn that you will never ask for the code. Keep the message short and consistent so customers recognize it.",
        ],
        bullets: [
          "Your Acme Portal code is 482913. It expires in 10 minutes. We will never call or text to ask for it.",
        ],
      },
      {
        heading: "Security basics",
        paragraphs: [
          "Generate random codes, expire them quickly, allow only a few attempts, and rate-limit how often a number can request a code. Never include links in passcode messages, because phishing messages imitate them. For high-risk accounts, consider authenticator apps in addition to SMS.",
        ],
      },
      {
        heading: "Registration and separation",
        paragraphs: [
          "Register verification traffic under the appropriate two-factor or account notification use case rather than mixing it with marketing. Never add promotions to code messages; that is confusing, undermines trust and can break registration rules. Monitor delivery closely, because a failed code means a locked-out customer.",
        ],
      },
    ],
    keyTakeaways: [
      "Lead with the code, the business name and the expiry time.",
      "Expire codes quickly and limit attempts.",
      "No links or marketing in passcode texts.",
      "Register verification traffic separately and monitor delivery.",
    ],
    faq: [
      { question: "How long should a passcode be valid?", answer: "Usually five to ten minutes is enough for the user and limits the window for misuse." },
      { question: "Is SMS secure enough for 2FA?", answer: "It is much better than passwords alone, but sensitive systems should also offer authenticator apps or security keys." },
    ],
    relatedSlugs: ["choosing-a-10dlc-campaign-use-case", "reading-sms-delivery-errors", "smishing-protect-customers-from-sms-scams"],
    relatedPages: [{ href: "/10dlc-compliant-texting", label: "10DLC-compliant texting" }],
  },
  {
    slug: "smishing-protect-customers-from-sms-scams",
    metaTitle: "Smishing: How Businesses Protect Customers From SMS Scams | Text2Sale",
    title: "Smishing: how to protect your customers from SMS scams",
    description: "What smishing is, how scammers impersonate businesses by text, and the habits that help customers trust your real messages.",
    excerpt: "Scam texts that impersonate businesses make customers wary of every message. Consistent, recognizable texts help your real ones stand out.",
    tags: ["Compliance", "Customer service", "Best practices"],
    intro: [
      "Smishing is phishing by text message. Scammers send texts pretending to be banks, delivery companies, insurers or local businesses, hoping people will tap a link or share personal details.",
      "Every scam that succeeds makes customers more suspicious of legitimate texts. Businesses can reduce that suspicion with predictable, transparent messaging.",
    ],
    sections: [
      {
        heading: "How scammers imitate businesses",
        paragraphs: [
          "Smishing messages usually create urgency, such as a locked account, an unpaid toll or a missed delivery, and include a link to a fake site. They often use shortened links and generic greetings, and ask for passwords, payment details or codes.",
        ],
      },
      {
        heading: "Habits that make your texts trustworthy",
        paragraphs: [
          "Always name your business, text from the same registered number, use links on your own domain, and never ask for passwords, full card numbers or verification codes by text. Tell customers what you will and will not send, for example in your welcome message.",
        ],
        bullets: [
          "Name your business in every message.",
          "Text from one consistent, registered number.",
          "Use links on your own domain only.",
          "Never request passwords or codes by text.",
        ],
      },
      {
        heading: "If someone impersonates you",
        paragraphs: [
          "Warn customers through your website, social channels and your own text list, explaining what real messages from you look like. Customers can report scam texts by forwarding them to 7726 (SPAM) in the US, and you can report impersonation to your texting provider and to the FTC.",
        ],
      },
    ],
    keyTakeaways: [
      "Smishing uses urgency and fake links to steal details.",
      "Consistent, branded texts help customers spot fakes.",
      "Never ask for passwords, codes or card numbers by text.",
      "Warn customers quickly if scammers impersonate you.",
    ],
    faq: [
      { question: "What is 7726?", answer: "It spells SPAM on a keypad. Most US carriers let customers forward suspicious texts to 7726 to report them." },
      { question: "Should businesses avoid links entirely?", answer: "No, but use your own domain so customers can see where a link goes." },
    ],
    relatedSlugs: ["identifying-your-business-in-every-text", "links-in-business-texts", "one-time-passcode-2fa-texts"],
    relatedPages: [{ href: "/10dlc-compliant-texting", label: "10DLC-compliant texting" }],
  },
  {
    slug: "casl-texting-rules-canada",
    metaTitle: "Texting Canadian Customers: CASL Rules for SMS Marketing | Text2Sale",
    title: "Texting Canadian customers: CASL rules for SMS marketing",
    description: "An overview of Canada's Anti-Spam Legislation as it applies to marketing texts: express and implied consent, identification and unsubscribe requirements.",
    excerpt: "If any of your contacts live in Canada, CASL applies to your marketing texts. Here is what it asks for, in plain language.",
    tags: ["Compliance", "SMS marketing"],
    intro: [
      "US businesses with Canadian customers sometimes assume US rules cover everything. Canada's Anti-Spam Legislation, known as CASL, applies to commercial electronic messages sent to people in Canada, including texts.",
      "This is a general overview, not legal advice. If Canada is an important market for you, confirm the details with counsel.",
    ],
    sections: [
      {
        heading: "Consent under CASL",
        paragraphs: [
          "CASL requires consent for commercial messages. Express consent is given when someone actively agrees, for example by checking an unchecked box, and it does not expire until they withdraw it. Implied consent can arise from an existing business relationship, such as a recent purchase or inquiry, but it is time-limited, so plan to convert implied consent into express consent.",
        ],
      },
      {
        heading: "What each message must include",
        paragraphs: [
          "Commercial texts must identify the sender and give a way to contact them, and must include a simple unsubscribe mechanism. Unsubscribe requests must be honored promptly, within the time limit the law sets. Keeping messages short does not exempt them from these requirements, so identification and opt-out instructions should be part of your template or easily reachable through a link.",
        ],
        bullets: [
          "Identify your business.",
          "Provide contact information or a link to it.",
          "Include a working unsubscribe method.",
          "Process opt-outs promptly.",
        ],
      },
      {
        heading: "Practical steps",
        paragraphs: [
          "Tag contacts by country, record how and when each Canadian contact consented, and keep separate templates if needed. Remember that Canadian numbers and carriers have their own registration and delivery considerations, so check that your provider supports texting Canadian numbers properly.",
        ],
      },
    ],
    keyTakeaways: [
      "CASL covers marketing texts to people in Canada.",
      "Express consent lasts until withdrawn; implied consent expires.",
      "Every message must identify you and offer an unsubscribe.",
      "Record consent details for each Canadian contact.",
    ],
    faq: [
      { question: "Does CASL apply to US businesses?", answer: "It applies to commercial messages accessed by people in Canada, regardless of where the sender is based." },
      { question: "Are transactional texts covered?", answer: "Some messages, like certain transactional notices, have exemptions, but the identification rules can still apply. Check with counsel." },
    ],
    relatedSlugs: ["express-written-consent-for-texting", "state-mini-tcpa-laws", "sms-consent-records"],
    relatedPages: [{ href: "/10dlc-compliant-texting", label: "10DLC-compliant texting" }],
  },
  {
    slug: "using-chatgpt-to-write-sms-marketing",
    metaTitle: "Using ChatGPT to Write SMS Marketing Messages: Prompts and Limits | Text2Sale",
    title: "Using ChatGPT and AI tools to write SMS marketing messages",
    description: "How to use AI writing tools to draft text messages: prompts that produce short, compliant copy, and what to check before anything gets sent.",
    excerpt: "AI tools can draft texts in seconds. Used well, they speed you up. Used carelessly, they produce generic, spammy messages.",
    tags: ["AI", "Copywriting", "SMS marketing"],
    intro: [
      "AI writing assistants are a fast way to brainstorm and draft text messages. They are especially helpful when you need variations for testing or a starting point on a blank page.",
      "They do not know your customers, your offers or the carrier rules, so the human review step matters.",
    ],
    sections: [
      {
        heading: "Prompts that produce good texts",
        paragraphs: [
          "Give the tool the facts it cannot guess: your business name, who the audience is, the offer, the deadline, the length limit and the tone. Ask for several options so you can choose.",
        ],
        bullets: [
          "Write 5 text messages under 160 characters for past customers of a lawn care company named Green Lawn, offering 10% off aeration booked before May 1. Friendly, no all caps, no exclamation points, include Reply STOP to opt out.",
          "Rewrite this text so it sounds like a person, not an ad, and stays under 160 characters: [paste text].",
        ],
      },
      {
        heading: "What to check before sending",
        paragraphs: [
          "Check every fact, price and date. Remove hype words, extra exclamation points and anything that sounds like a generic promotion. Make sure the business name and opt-out language are present in first messages, and count characters so the text fits in one segment. Read it aloud: if it sounds like a robot, rewrite it.",
        ],
      },
      {
        heading: "Where AI fits best",
        paragraphs: [
          "AI is excellent for variations to A/B test, for adapting one message to several audiences and for summarizing long offers into a short text. Keep humans in charge of claims, compliance and anything sensitive, such as pricing, health or financial details.",
        ],
      },
    ],
    keyTakeaways: [
      "Give AI the facts, length and tone you need.",
      "Ask for several options and pick the most human one.",
      "Verify facts and remove spammy phrasing.",
      "Keep humans in charge of claims and compliance.",
    ],
    faq: [
      { question: "Can I paste customer data into an AI tool?", answer: "Avoid pasting personal or sensitive customer information into public AI tools. Use placeholders instead." },
      { question: "Will carriers block AI-written texts?", answer: "Carriers judge the content and sending behavior, not who wrote it. Spammy wording is the risk, whoever writes it." },
    ],
    relatedSlugs: ["ai-texting-compliance", "sms-copywriting-tips", "sms-ab-testing"],
    relatedPages: [{ href: "/ai-texting-crm", label: "AI texting CRM" }],
  },
  {
    slug: "save-business-text-messages-for-records",
    metaTitle: "How to Save and Export Business Text Messages for Records | Text2Sale",
    title: "How to save and export business text messages for your records",
    description: "Why businesses need to keep text message records, what to store, how long to keep it, and how to export conversations when you need them.",
    excerpt: "Text conversations are business records. Here is how to keep them organized, retrievable and ready when a question comes up.",
    tags: ["Operations", "Compliance"],
    intro: [
      "Texts now carry quotes, promises, appointment details and consent. When a dispute, audit or complaint comes up, you need to find the conversation quickly.",
      "Phones are a poor archive. A business texting platform keeps records centrally, but you still need a plan for what to keep and how to get it out.",
    ],
    sections: [
      {
        heading: "What to keep",
        paragraphs: [
          "Store every conversation with timestamps and the numbers involved, consent records showing how each contact opted in, opt-out requests and when they were honored, and campaign records showing what was sent to whom. Notes and dispositions added by your team help explain the context later.",
        ],
        bullets: [
          "Full conversation history with timestamps.",
          "Consent source, wording and date.",
          "Opt-out requests and confirmations.",
          "Campaign content and recipient lists.",
        ],
      },
      {
        heading: "How long to keep records",
        paragraphs: [
          "Requirements vary by industry and state. Financial services, insurance and healthcare often have specific retention rules, and consent records are worth keeping for several years after your last message because claims can arrive long after. Set a written retention policy and apply it consistently.",
        ],
      },
      {
        heading: "Exporting when needed",
        paragraphs: [
          "Make sure your platform can export conversations and contact records, for a single customer or in bulk. Test an export before you need one, and store exports securely, because they contain personal information. Restrict who can delete conversations so records are not lost by accident.",
        ],
      },
    ],
    keyTakeaways: [
      "Text messages are business records.",
      "Keep conversations, consent, opt-outs and campaign data.",
      "Follow your industry's retention rules and write them down.",
      "Test exports and restrict deletion.",
    ],
    faq: [
      { question: "Are screenshots good enough as records?", answer: "They help in a pinch, but an exportable, timestamped history from your platform is far more reliable." },
      { question: "Should reps be able to delete conversations?", answer: "Usually no. Archiving keeps the inbox tidy without losing the record." },
    ],
    relatedSlugs: ["sms-consent-records", "archive-vs-delete-crm-conversations", "financial-advisor-texting-compliance"],
    relatedPages: [{ href: "/sales-team-texting-crm", label: "Sales team texting CRM" }],
  },
  {
    slug: "weather-closure-and-emergency-alert-texts",
    metaTitle: "Weather Closure and Emergency Alert Texts for Businesses | Text2Sale",
    title: "Weather closure and emergency alert texts for businesses",
    description: "How to text customers, members and staff about weather closures and emergencies: who to notify, what to say, and how to prepare templates in advance.",
    excerpt: "When a storm closes your doors, a fast, clear text saves customers a wasted trip and saves your staff a flood of calls.",
    tags: ["Operations", "Customer service", "Local business"],
    intro: [
      "Snowstorms, hurricanes, power outages and other emergencies force businesses to close or change plans with little notice. Customers with appointments, members expecting classes and staff scheduled for shifts all need to know quickly.",
      "Texts are read faster than emails and social posts, which makes them the right channel for urgent updates.",
    ],
    sections: [
      {
        heading: "Prepare before you need it",
        paragraphs: [
          "Write templates for closures, delayed openings and reopenings ahead of time. Decide who has authority to send them, and make sure your lists are tagged so you can reach today's appointments, all customers or staff separately.",
        ],
      },
      {
        heading: "What to say",
        paragraphs: [
          "Say what changed, when, and what the customer should do next. Keep it calm and specific.",
        ],
        bullets: [
          "Riverside Dental is closed today, Jan 14, due to the ice storm. We'll text you this afternoon to reschedule your appointment.",
          "Due to the power outage, Summit Gym opens at noon today instead of 6 am. All morning classes are cancelled.",
          "We're back open! Northside Pharmacy reopens at 9 am tomorrow. Reply here if you need a prescription transferred.",
        ],
      },
      {
        heading: "Follow up after",
        paragraphs: [
          "Send a clear reopening message, offer to reschedule affected appointments and answer replies quickly. Emergency texts to customers about their existing service are generally informational, but avoid turning them into promotions.",
        ],
      },
    ],
    keyTakeaways: [
      "Prepare closure templates before emergencies.",
      "Tag lists so you can reach the right people.",
      "Say what changed, when and what to do next.",
      "Follow up with reopening and rescheduling texts.",
    ],
    faq: [
      { question: "Should I text everyone or only affected customers?", answer: "Text those directly affected first, such as today's appointments, then broader lists if the closure lasts." },
      { question: "Can staff alerts go through the same system?", answer: "Yes, but keep staff in a separate list and follow your employee communication policy." },
    ],
    relatedSlugs: ["texting-customers-about-delays-and-changes", "employee-text-communication", "auto-replies-for-hours-and-holidays"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "texting-facebook-lead-ads-leads",
    metaTitle: "How to Text Facebook Lead Ads Leads Fast (and Get Replies) | Text2Sale",
    title: "How to text Facebook lead ads leads fast and get replies",
    description: "How to follow up on Facebook and Instagram lead form submissions by text: speed, consent wording on the form, first-message examples and follow-up cadence.",
    excerpt: "Facebook leads cool down fast. A quick, recognizable text is often the difference between a conversation and a cold lead.",
    tags: ["Lead generation", "Speed to lead", "Scripts"],
    intro: [
      "Facebook and Instagram lead forms make it easy for people to raise their hand. That ease is also the problem: many submit a form while scrolling and forget about it minutes later.",
      "Texting quickly, and in a way they recognize, turns more of those form fills into conversations.",
    ],
    sections: [
      {
        heading: "Set up the form for texting",
        paragraphs: [
          "Add a custom disclaimer or consent question to your lead form that names your business and asks permission to contact them by text. Connect the form to your texting platform so new leads arrive in seconds rather than waiting for a daily download.",
        ],
      },
      {
        heading: "Text within minutes",
        paragraphs: [
          "Speed matters more with social leads than with almost any other source. Send the first text automatically within a minute or two, mention the ad or offer they responded to, and ask one simple question.",
        ],
        bullets: [
          "Hi Kim, it's Jamie with Johnson Health. Thanks for requesting a health plan quote on Facebook. Is the quote for just you or your family?",
          "Hi Tom, Bright Roofing here. You asked about a free roof inspection. What's the best day this week for us to stop by?",
        ],
      },
      {
        heading: "Follow up without overdoing it",
        paragraphs: [
          "If there is no reply, follow up the next day with a different angle, then a few days later, and then stop or move them to an occasional nurture list. Many social leads reply on the second or third text, but a long string of unanswered messages leads to opt-outs.",
        ],
      },
    ],
    keyTakeaways: [
      "Add text consent wording to your lead form.",
      "Connect forms so leads arrive instantly.",
      "Text within minutes and mention the ad.",
      "Follow up two or three times, then ease off.",
    ],
    faq: [
      { question: "Do Facebook leads need consent for texting?", answer: "Yes. Add clear consent language to the form so you have permission to text, especially for marketing." },
      { question: "Why do Facebook leads say they never signed up?", answer: "Forms auto-fill details and are quick to submit. Texting fast and referencing the ad reduces the confusion." },
    ],
    relatedSlugs: ["auto-text-web-form-leads", "first-text-to-a-new-lead-examples", "how-to-respond-to-who-is-this-texts"],
    relatedPages: [{ href: "/sms-follow-up-for-sales-teams", label: "SMS follow-up for sales teams" }],
  },
  {
    slug: "google-local-services-ads-leads-by-text",
    metaTitle: "Responding to Google Local Services Ads Leads by Text | Text2Sale",
    title: "Responding to Google Local Services Ads leads by text",
    description: "How service businesses can respond faster to Google Local Services Ads leads, using text follow-up to book jobs and protect their response-time standing.",
    excerpt: "Local Services Ads reward fast responders. Pairing them with text follow-up helps you answer quickly and book more jobs.",
    tags: ["Lead generation", "Home services", "Speed to lead"],
    intro: [
      "Google Local Services Ads put plumbers, electricians, cleaners and other local providers at the top of search results. The leads they produce are high intent, and Google considers how responsive you are.",
      "Text follow-up is a practical way to reply fast, even when your team is on a job.",
    ],
    sections: [
      {
        heading: "Respond as fast as you can",
        paragraphs: [
          "Answer calls and messages from the ads platform promptly, and when you miss a call, follow up right away. A missed-call text back tells the customer you received their request and gives them an easy way to share details while you are busy.",
        ],
      },
      {
        heading: "What to text",
        paragraphs: [
          "Confirm who you are, what they asked about and the next step. Ask for details that help you quote or schedule, such as photos or the best time to visit.",
        ],
        bullets: [
          "Hi, this is Mike with Ace Plumbing. Sorry I missed your call about the water heater. Can you text me a photo of the unit and your address so I can get you a time today?",
          "Thanks for reaching out to Spark Electric. We can come out tomorrow morning or afternoon. Which works better?",
        ],
      },
      {
        heading: "Track every lead to a result",
        paragraphs: [
          "Log each lead's source, how fast you responded and whether it booked. Leads you cannot serve should get a polite reply too. Tracking shows which ads and service areas are worth the spend, and quick responses support your standing in the program.",
        ],
      },
    ],
    keyTakeaways: [
      "Local Services Ads leads are high intent and time-sensitive.",
      "Text back missed calls immediately.",
      "Ask for photos and timing to speed up quoting.",
      "Track response time and outcomes by lead source.",
    ],
    faq: [
      { question: "Can I text customers who call through Local Services Ads?", answer: "Replying about the service they requested is reasonable. Don't add them to marketing campaigns without consent." },
      { question: "What if I can't take the job?", answer: "Reply quickly and politely so the customer can move on. It protects your reputation." },
    ],
    relatedSlugs: ["missed-call-text-back", "home-services-text-marketing", "lead-source-attribution-utm-campaigns"],
    relatedPages: [{ href: "/sms-follow-up-for-sales-teams", label: "SMS follow-up for sales teams" }],
  },
  {
    slug: "texting-angi-and-thumbtack-leads",
    metaTitle: "How to Text Angi and Thumbtack Leads Before Competitors Do | Text2Sale",
    title: "How to text Angi and Thumbtack leads before competitors do",
    description: "Home service pros compete with several providers for each marketplace lead. Here is how to use fast, specific texts to win more of them.",
    excerpt: "Marketplace leads are often shared. The first useful response usually wins the job, and text is the fastest way to give it.",
    tags: ["Lead generation", "Home services", "Speed to lead"],
    intro: [
      "Lead marketplaces like Angi and Thumbtack send the same homeowner to several contractors. Within minutes, that homeowner may be hearing from three or four businesses.",
      "Winning these leads comes down to being first, being specific and making the next step easy.",
    ],
    sections: [
      {
        heading: "Be first, but be useful",
        paragraphs: [
          "Reply on the platform immediately, then follow up by text where the homeowner has shared a number and expects contact. A fast reply that only says call me is weaker than one that shows you read the request and suggests a time.",
        ],
        bullets: [
          "Hi Sandra, Jake from Clearview Gutters. I saw you need gutters cleaned on a two-story home. I can come Thursday at 10 am. Does that work?",
          "Hi Ben, this is Ana with Fresh Paint Co. For the two bedrooms you mentioned, could you text a couple of photos so I can give you a price today?",
        ],
      },
      {
        heading: "Make quoting easy",
        paragraphs: [
          "Ask for photos, measurements or a quick video by text so you can estimate without a site visit when possible. Homeowners appreciate a ballpark price early, and it filters out jobs that are not a fit.",
        ],
      },
      {
        heading: "Follow up after the quote",
        paragraphs: [
          "Many homeowners collect quotes and go quiet. A friendly follow-up a day or two later answering likely questions often wins the job. Track which marketplace leads book so you can judge whether the lead costs are worth it.",
        ],
      },
    ],
    keyTakeaways: [
      "Marketplace leads are shared, so speed matters.",
      "Show you read the request and suggest a time.",
      "Ask for photos to quote faster.",
      "Follow up on quotes and track close rates by source.",
    ],
    faq: [
      { question: "Is it okay to text marketplace leads?", answer: "Follow each platform's rules and the homeowner's contact preferences, and keep texts about the job they requested." },
      { question: "How many follow-ups should I send?", answer: "Two or three over a week is usually enough. Stop if they say they hired someone else." },
    ],
    relatedSlugs: ["contractor-estimate-follow-up-texts", "collecting-photos-and-documents-by-text", "exclusive-vs-shared-insurance-leads"],
    relatedPages: [{ href: "/sms-follow-up-for-sales-teams", label: "SMS follow-up for sales teams" }],
  },
  {
    slug: "medigap-leads-outside-aep-texting",
    metaTitle: "Texting Medicare Supplement (Medigap) Leads Year-Round | Text2Sale",
    title: "Texting Medicare Supplement (Medigap) leads year-round",
    description: "How agents can follow up on Medicare Supplement leads outside the Annual Enrollment Period, with timing considerations, compliant messaging and follow-up ideas.",
    excerpt: "Medigap isn't tied to the fall enrollment rush. Here is how to work supplement leads by text throughout the year.",
    tags: ["Insurance", "Compliance", "Lead management"],
    intro: [
      "Many agents think of Medicare as a fall business, but Medicare Supplement plans can be sold throughout the year. That makes supplement leads a steady source of conversations when Medicare Advantage activity is quiet.",
      "Texting helps agents respond quickly and keep in touch with prospects whose timing is not yet right. Medicare marketing is heavily regulated, so check your carrier and compliance guidance before sending.",
    ],
    sections: [
      {
        heading: "Understand the prospect's timing",
        paragraphs: [
          "People turning 65 and enrolling in Part B often have a guaranteed window to buy a supplement without medical underwriting. Outside that window, underwriting may apply depending on the state and situation, and some states have special rules that let people switch plans at certain times. Your first questions should establish where the prospect is.",
        ],
      },
      {
        heading: "First texts that work",
        paragraphs: [
          "Introduce yourself, reference their request, and ask a simple qualifying question rather than pitching a plan.",
        ],
        bullets: [
          "Hi Joan, this is Mark, a licensed agent. You asked about Medicare Supplement options. Are you new to Medicare or looking to change your current plan?",
          "Hi Ed, it's Mark again. When does your Part B start? That helps me know which options are open to you.",
        ],
      },
      {
        heading: "Stay compliant and patient",
        paragraphs: [
          "Avoid language that sounds like it comes from the government, do not make claims about plan benefits by text that you cannot fully explain, and follow your carriers' rules on marketing and scope of appointment for any discussion that touches Medicare Advantage. For prospects who are not ready, a polite check-in near their key date is more effective than frequent texts.",
        ],
      },
    ],
    keyTakeaways: [
      "Medigap can be sold year-round, unlike Advantage enrollment periods.",
      "Establish the prospect's eligibility timing first.",
      "Ask qualifying questions instead of pitching plans.",
      "Follow carrier and Medicare marketing rules closely.",
    ],
    faq: [
      { question: "Can I text Medicare leads about Advantage plans in summer?", answer: "Rules on Medicare Advantage marketing and enrollment periods are strict. Check your compliance guidance before discussing Advantage plans." },
      { question: "Do all states have the same Medigap rules?", answer: "No. Some states have additional switching rights, so learn the rules where your clients live." },
    ],
    relatedSlugs: ["medicare-turning-65-texts", "medicare-aep-texting-guide", "medicare-advantage-open-enrollment-texts"],
    relatedPages: [{ href: "/medicare-agent-texting-crm", label: "Medicare agent texting CRM" }],
  },
  {
    slug: "annuity-lead-follow-up-by-text",
    metaTitle: "Annuity Lead Follow-Up by Text: What Agents Should Know | Text2Sale",
    title: "Annuity lead follow-up by text: what agents should know",
    description: "How insurance agents can use texting to schedule annuity conversations, what to keep out of text messages, and how to stay within suitability rules.",
    excerpt: "Annuity prospects want trust before details. Texting is best used to schedule a real conversation, not to explain products.",
    tags: ["Insurance", "Compliance", "Appointments"],
    intro: [
      "Annuity prospects are often pre-retirees thinking carefully about their savings. They tend to research for a long time and respond to agents who are patient and clear.",
      "Text is a good way to start and schedule conversations. It is not the place to discuss rates, products or recommendations in detail.",
    ],
    sections: [
      {
        heading: "Use texts to book the conversation",
        paragraphs: [
          "Reference what they requested, introduce yourself as a licensed agent and offer a specific time for a call or meeting. Let them choose a time that suits them.",
        ],
        bullets: [
          "Hi Linda, this is Paul, a licensed insurance agent. Thanks for requesting information on retirement income options. Would a 20-minute call Wednesday or Thursday afternoon work?",
          "Hi Ray, just confirming our call tomorrow at 2 pm. I'll call this number. Reply here if you need to move it.",
        ],
      },
      {
        heading: "Keep product details out of texts",
        paragraphs: [
          "Annuity sales are subject to suitability and best-interest rules that require understanding the client's situation before recommending anything. Avoid quoting rates, guaranteeing returns or comparing products by text. Those discussions belong in a documented meeting where you can gather the information the rules require.",
        ],
      },
      {
        heading: "Nurture patiently",
        paragraphs: [
          "Many annuity prospects need weeks or months. Space follow-ups out, send helpful reminders such as a check-in before a birthday or retirement date, and always respect a request to stop. Record conversations and consent in your CRM in line with your firm's compliance requirements.",
        ],
      },
    ],
    keyTakeaways: [
      "Use texts to schedule, not to sell annuities.",
      "Identify yourself as a licensed agent.",
      "Keep rates and recommendations out of text messages.",
      "Nurture patiently and document everything.",
    ],
    faq: [
      { question: "Can I send an annuity illustration by text?", answer: "Generally avoid it. Share illustrations through approved channels during a documented meeting." },
      { question: "How often should I follow up with annuity leads?", answer: "Less often than with other leads. Every week or two at first, then monthly, unless they ask otherwise." },
    ],
    relatedSlugs: ["how-to-book-appointments-by-text", "financial-advisor-texting-compliance", "lead-nurturing-sequences-for-agents"],
    relatedPages: [{ href: "/life-insurance-texting-crm", label: "Life insurance texting CRM" }],
  },
  {
    slug: "group-health-insurance-small-employers-texting",
    metaTitle: "Selling Group Health Insurance to Small Employers by Text | Text2Sale",
    title: "Selling group health insurance to small employers by text",
    description: "How brokers can use texting to reach small business owners about group health benefits: timing around renewals, first messages and follow-up.",
    excerpt: "Small business owners are busy and hard to reach by phone. Short, relevant texts can open the door to a benefits conversation.",
    tags: ["Insurance", "Commercial", "Scripts"],
    intro: [
      "Small employers often want to offer health benefits to attract and keep staff, but they are busy running the business. Calls go to voicemail and emails get buried.",
      "Text, used with consent and respect, gives brokers a direct but low-pressure way to start the conversation.",
    ],
    sections: [
      {
        heading: "Time it around renewals",
        paragraphs: [
          "Employers are most open to reviewing benefits a few months before their plan renews, and when they are hiring. Ask about the renewal date early and set a reminder to reach out ahead of it.",
        ],
      },
      {
        heading: "Messages that respect their time",
        paragraphs: [
          "Be brief, explain the value and ask one question.",
        ],
        bullets: [
          "Hi Carlos, this is Jen, a benefits broker. You asked about health coverage for your team. Roughly how many employees would you want to cover?",
          "Hi Amy, quick question: when does your group plan renew? I can run a comparison a couple of months ahead so you have options.",
          "Hi Dave, I put together three plan options for your 8 employees. Would a 15-minute call Tuesday or Wednesday work to go over them?",
        ],
      },
      {
        heading: "Move the details to a meeting",
        paragraphs: [
          "Group benefits involve census data, contributions and plan comparisons that do not belong in a text thread. Use texts to schedule, confirm and remind, and handle sensitive employee information through secure channels.",
        ],
      },
    ],
    keyTakeaways: [
      "Reach employers before their renewal date.",
      "Keep texts brief with one clear question.",
      "Use texts to schedule, not to share census data.",
      "Track renewal dates to time future outreach.",
    ],
    faq: [
      { question: "Can I cold text business owners about group health?", answer: "Business numbers can still be personal cell phones, so follow consent rules and only text people who agreed to contact." },
      { question: "What's a good first question?", answer: "How many employees they want to cover, or when their current plan renews." },
    ],
    relatedSlugs: ["b2b-texting-small-business-owners", "commercial-insurance-prospecting-texts", "health-insurance-lead-qualifying-texts"],
    relatedPages: [{ href: "/health-insurance-texting-crm", label: "Health insurance texting CRM" }],
  },
  {
    slug: "text-marketing-for-photographers",
    metaTitle: "Text Message Marketing for Photographers | Text2Sale",
    title: "Text message marketing for photographers",
    description: "How portrait, wedding and event photographers use texting for inquiries, session reminders, gallery delivery and mini-session bookings.",
    excerpt: "Photography clients book on emotion and timing. Texting keeps inquiries warm and sessions running smoothly.",
    tags: ["Local business", "Appointments", "SMS marketing"],
    intro: [
      "Photographers juggle inquiries, session planning, reminders, gallery delivery and print sales, often while out shooting. Clients increasingly prefer to text rather than call or email.",
      "A simple texting setup keeps every stage of the client journey moving.",
    ],
    sections: [
      {
        heading: "Respond to inquiries quickly",
        paragraphs: [
          "Couples and families often contact several photographers at once. A quick text acknowledging the inquiry, asking the date and offering a call keeps you in the running while you finish a shoot.",
        ],
      },
      {
        heading: "Session reminders and prep",
        paragraphs: [
          "Send a reminder a few days before the session with location, timing and what to wear, and a short note the morning of. Clients who arrive prepared make for better sessions and fewer reschedules.",
        ],
        bullets: [
          "Hi Megan! Your family session is Saturday at 5 pm at Lakeside Park. Coordinating colors look great. Reply with any questions!",
          "Your gallery is ready! View and download your photos here: [link]",
        ],
      },
      {
        heading: "Mini-sessions and repeat bookings",
        paragraphs: [
          "Seasonal mini-sessions fill quickly when announced by text to past clients who opted in to updates. Send the announcement with the booking link, then a reminder when only a few spots remain. Annual reminders for family portraits bring clients back each year.",
        ],
      },
    ],
    keyTakeaways: [
      "Reply to inquiries quickly, even from a shoot.",
      "Send prep reminders before every session.",
      "Text gallery delivery with a direct link.",
      "Announce mini-sessions to past clients who opted in.",
    ],
    faq: [
      { question: "Can I text clients sneak peeks?", answer: "Yes, a single image by MMS is a lovely touch, though picture messages cost more than text." },
      { question: "How far ahead should I announce mini-sessions?", answer: "Two to four weeks before the dates works well for most seasonal sessions." },
    ],
    relatedSlugs: ["appointment-reminder-text-templates", "mms-vs-sms-marketing", "waitlist-and-cancellation-fill-by-text"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "text-marketing-for-wedding-vendors",
    metaTitle: "Text Messaging for Wedding Vendors and Event Planners | Text2Sale",
    title: "Text messaging for wedding vendors and event planners",
    description: "How florists, caterers, venues, DJs and planners use texting for inquiries, timelines, day-of coordination and final payments.",
    excerpt: "Weddings run on details and deadlines. Texting keeps couples, vendors and planners in sync without endless email chains.",
    tags: ["Local business", "Appointments", "Customer service"],
    intro: [
      "Wedding and event vendors work with clients over many months, then everything happens in a single day. Communication needs change along the way, from early inquiries to day-of coordination.",
      "Texting fits each stage when it is organized and professional.",
    ],
    sections: [
      {
        heading: "Inquiries and bookings",
        paragraphs: [
          "Couples contact many vendors at once and often book with whoever responds first and most personally. Acknowledge inquiries quickly, confirm the date and venue, and offer a consultation time.",
        ],
      },
      {
        heading: "Planning milestones",
        paragraphs: [
          "Use texts for deadline reminders such as final guest counts, menu choices, payment due dates and tasting appointments. Keep detailed documents in email or a planning portal and use texts to point couples to them.",
        ],
        bullets: [
          "Hi Kate and Ryan! A reminder that your final guest count is due Friday. Reply with the number or update it here: [link]",
          "Your final balance of $1,200 is due June 1. You can pay securely here: [link]",
        ],
      },
      {
        heading: "Day-of coordination",
        paragraphs: [
          "On the event day, short texts help vendors confirm arrival times and solve problems quickly. Agree in advance who the main contact is, often a planner or family member, so the couple is not answering logistics questions on their wedding day.",
        ],
      },
    ],
    keyTakeaways: [
      "Respond to wedding inquiries quickly and personally.",
      "Use texts for deadline and payment reminders.",
      "Point to detailed documents rather than texting them.",
      "Name a day-of contact other than the couple.",
    ],
    faq: [
      { question: "Should vendors text couples at night?", answer: "Keep to reasonable hours unless the couple has said otherwise, and avoid non-urgent texts on the wedding day." },
      { question: "Can I collect payments by text?", answer: "Yes, with a secure payment link. Don't ask for card details in the message itself." },
    ],
    relatedSlugs: ["text-to-pay-invoice-reminders", "event-rsvp-and-confirmation-texts", "deposits-and-cancellation-fees-by-text"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "text-messaging-for-driving-schools",
    metaTitle: "Text Messaging for Driving Schools | Text2Sale",
    title: "Text messaging for driving schools",
    description: "How driving schools use texting for lesson reminders, road test preparation, parent updates and filling open lesson slots.",
    excerpt: "Driving schools run on tight schedules and busy families. Texting keeps students, parents and instructors on the same page.",
    tags: ["Local business", "Appointments", "Education"],
    intro: [
      "Driving schools coordinate students, parents, instructors and vehicles, often for teenagers with packed schedules. Missed lessons cost instructor time and delay licensing.",
      "Texting is how most students and parents prefer to hear from you.",
    ],
    sections: [
      {
        heading: "Lesson reminders",
        paragraphs: [
          "Send a reminder the day before each lesson with the time and pickup location, and ask for confirmation. For minors, include the parent or guardian on reminders according to your school's policy.",
        ],
        bullets: [
          "Hi Jordan, reminder: your driving lesson is tomorrow at 4 pm. Pickup at Lincoln High. Reply C to confirm or R to reschedule.",
          "Road test day! Bring your permit, glasses if needed and arrive 15 minutes early. Good luck, Sam!",
        ],
      },
      {
        heading: "Fill open slots",
        paragraphs: [
          "When a student cancels, text a waitlist of students looking for earlier lessons. The first to reply gets the slot. This keeps instructors busy and moves students toward their road test sooner.",
        ],
      },
      {
        heading: "Parent updates and enrollment",
        paragraphs: [
          "Short progress updates after lessons reassure parents, and enrollment reminders before school breaks or summer fill your calendar. Respond to inquiries quickly, since parents often contact several schools.",
        ],
      },
    ],
    keyTakeaways: [
      "Remind students the day before each lesson.",
      "Include parents according to your policy for minors.",
      "Use a waitlist to fill cancelled lessons.",
      "Send enrollment reminders before busy seasons.",
    ],
    faq: [
      { question: "Should I text students under 18 directly?", answer: "Follow your school's policy and get parent consent; many schools copy parents on all messages for minors." },
      { question: "How do I reduce no-shows?", answer: "Day-before reminders with a confirmation request and a clear cancellation policy." },
    ],
    relatedSlugs: ["waitlist-and-cancellation-fill-by-text", "tutoring-center-texting", "appointment-reminder-text-templates"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "text-marketing-for-car-washes",
    metaTitle: "Text Message Marketing for Car Washes | Text2Sale",
    title: "Text message marketing for car washes",
    description: "How car washes use texting to sell and retain memberships, bring customers back after weather, and recover failed membership payments.",
    excerpt: "Car washes are weather-driven and membership-driven, and texting helps with both.",
    tags: ["Local business", "Retention", "SMS marketing"],
    intro: [
      "Car wash traffic rises and falls with the weather, and membership programs are now central to the business. Both reward timely, relevant communication.",
      "Text is a natural fit because customers read it on the go, often just before they drive past.",
    ],
    sections: [
      {
        heading: "Weather-triggered messages",
        paragraphs: [
          "After rain, snow or pollen season, a short text to opted-in customers reminds them it is time for a wash. Keep these occasional and genuinely timely.",
        ],
        bullets: [
          "The salt's off the roads! Get your underbody wash this weekend at Splash Car Wash.",
          "Pollen season is here. Members, swing by anytime this week. Not a member? Join here: [link]",
        ],
      },
      {
        heading: "Memberships",
        paragraphs: [
          "Welcome new members with a text explaining how to use their plan, and send a friendly note when a card payment fails so the membership does not lapse. Members who have not visited in a while may respond to a reminder of what they are paying for.",
        ],
      },
      {
        heading: "Keep frequency reasonable",
        paragraphs: [
          "It is tempting to text after every rain shower, but too many messages drive opt-outs. Set a cap, such as a few texts a month, and segment members from non-members so each group gets relevant offers.",
        ],
      },
    ],
    keyTakeaways: [
      "Weather is the best reason to text car wash customers.",
      "Welcome members and recover failed payments by text.",
      "Remind inactive members of their benefits.",
      "Cap frequency and segment members from non-members.",
    ],
    faq: [
      { question: "How do customers join a car wash text list?", answer: "Signs with a keyword, a QR code at the pay station and a checkbox when buying a membership work well." },
      { question: "Should I text discounts to members?", answer: "Members value perks like exclusive add-ons more than discounts on what they already pay for." },
    ],
    relatedSlugs: ["sms-keyword-campaigns", "qr-code-sms-opt-in", "text-to-pay-invoice-reminders"],
    relatedPages: [{ href: "/bulk-sms-software", label: "Bulk SMS software" }],
  },
  {
    slug: "text-messaging-for-funeral-homes",
    metaTitle: "Text Messaging for Funeral Homes: Compassionate Communication | Text2Sale",
    title: "Text messaging for funeral homes: compassionate communication",
    description: "How funeral homes can use texting carefully to support families with arrangements, service details and paperwork, with tone guidance and examples.",
    excerpt: "Families going through a loss need clear information without extra burden. Thoughtful texts can help, if the tone is right.",
    tags: ["Local business", "Customer service"],
    intro: [
      "Families planning a funeral are dealing with grief, decisions and a long list of logistics. Many find it easier to read a text than to take another call.",
      "Texting can reduce that burden when it is used with care, consent and a gentle tone.",
    ],
    sections: [
      {
        heading: "Ask before texting",
        paragraphs: [
          "During the arrangement conference, ask the family's main contact whether texts are welcome for updates and reminders, and which number to use. Some families prefer calls; respect that preference.",
        ],
      },
      {
        heading: "What texts can help with",
        paragraphs: [
          "Practical, informational messages work best: appointment confirmations, service times and addresses, reminders to bring documents or photos, and notices that death certificates are ready.",
        ],
        bullets: [
          "Hello Mrs. Lee, this is Anna from Grace Funeral Home. A gentle reminder that we'll meet tomorrow at 10 am. Please bring any photos you'd like included. Call or text anytime.",
          "The death certificates you requested are ready for pickup. We're here Monday through Friday, 9 to 5.",
        ],
      },
      {
        heading: "Tone and timing",
        paragraphs: [
          "Use full names and a warm, simple tone. Avoid emojis, abbreviations and anything promotional. Send messages during reasonable hours and always offer the option to call. Pre-planning outreach should be kept entirely separate from at-need family communication.",
        ],
      },
    ],
    keyTakeaways: [
      "Ask families if texting is welcome.",
      "Use texts for practical information and reminders.",
      "Keep the tone warm, simple and non-promotional.",
      "Always offer the option to call.",
    ],
    faq: [
      { question: "Can funeral homes text pre-planning offers?", answer: "Only to people who opted in to that information, and never mixed with messages to grieving families." },
      { question: "Should obituary links be texted?", answer: "Yes, if the family wants help sharing service details, a link to the obituary page can be useful." },
    ],
    relatedSlugs: ["identifying-your-business-in-every-text", "readable-business-texts-length-and-layout", "senior-living-texting"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "text-messaging-for-hoas",
    metaTitle: "Text Messaging for HOAs and Community Associations | Text2Sale",
    title: "Text messaging for HOAs and community associations",
    description: "How homeowners associations and community managers use texting for meeting reminders, maintenance notices, dues reminders and urgent alerts.",
    excerpt: "Community notices posted on a board or sent by email are easy to miss. Texts reach residents when it actually matters.",
    tags: ["Operations", "Customer service", "Local business"],
    intro: [
      "HOAs and community associations need to reach residents about meetings, maintenance, dues and the occasional emergency. Email newsletters and bulletin boards are easy to miss.",
      "Texting, with residents' consent, is a dependable way to get important notices read.",
    ],
    sections: [
      {
        heading: "Messages residents value",
        paragraphs: [
          "Focus on information residents need: water shut-offs, pool closures, road repaving, meeting reminders, trash schedule changes and storm preparations.",
        ],
        bullets: [
          "Oak Ridge HOA: Water will be shut off Tuesday from 9 am to noon for main line repairs.",
          "Reminder: the annual HOA meeting is Thursday at 7 pm in the clubhouse. Agenda: [link]",
          "Pool closed today for maintenance. Expected to reopen tomorrow at 10 am.",
        ],
      },
      {
        heading: "Dues and violations",
        paragraphs: [
          "Friendly dues reminders with a payment link help residents avoid late fees. Handle violations and collections more carefully: keep messages factual, private and consistent with your governing documents, and avoid anything that could read as harassment.",
        ],
      },
      {
        heading: "Consent and lists",
        paragraphs: [
          "Collect phone numbers and texting consent when residents move in or update their contact form. Keep separate lists for owners, tenants and board members, and remove people promptly when they move out.",
        ],
      },
    ],
    keyTakeaways: [
      "Text the notices residents actually need.",
      "Use dues reminders with secure payment links.",
      "Keep violation and collection texts factual and private.",
      "Maintain separate, up-to-date resident lists.",
    ],
    faq: [
      { question: "Can an HOA text every homeowner?", answer: "Collect consent first, typically through a resident contact form, and offer an easy opt-out." },
      { question: "Should board discussions happen by text?", answer: "Generally no. Official business should follow your meeting and recordkeeping rules." },
    ],
    relatedSlugs: ["property-management-tenant-texting", "weather-closure-and-emergency-alert-texts", "sms-for-past-due-accounts"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "text-marketing-for-pool-service-companies",
    metaTitle: "Text Message Marketing for Pool Service Companies | Text2Sale",
    title: "Text message marketing for pool service companies",
    description: "How pool cleaning and repair companies use texting for visit notifications, chemical and repair approvals, seasonal openings and closings.",
    excerpt: "Pool service is recurring, seasonal and mostly invisible to the customer. Texts make the work visible and the upsells easy.",
    tags: ["Home services", "Local business", "Retention"],
    intro: [
      "Pool customers rarely see their technician. They notice when the water looks wrong or a repair bill arrives. Proactive texts show the value of regular service and make additional work easier to approve.",
      "Texting also helps with the seasonal rush of openings and closings.",
    ],
    sections: [
      {
        heading: "Visit notifications",
        paragraphs: [
          "A short message after each visit, with readings or a photo of the clean pool, reminds customers what they are paying for. It also prevents the call asking whether the tech came today.",
        ],
        bullets: [
          "Hi Rachel, your pool was serviced today. Chlorine and pH balanced, filter cleaned. See you next Tuesday!",
          "We noticed your pump motor is making noise. Repair estimate: $340. Reply YES to approve or call us with questions.",
        ],
      },
      {
        heading: "Repair and equipment approvals",
        paragraphs: [
          "Texting a photo and estimate when your tech spots a problem lets customers approve on the spot. Quick approvals mean fewer return trips and faster repairs.",
        ],
      },
      {
        heading: "Seasonal openings and closings",
        paragraphs: [
          "In colder regions, text existing customers early to book spring openings and fall closings before the schedule fills. In warmer areas, seasonal reminders about storms, algae and heat waves keep customers engaged.",
        ],
      },
    ],
    keyTakeaways: [
      "Text after each visit to show your work.",
      "Send photos and estimates for quick repair approvals.",
      "Book seasonal openings and closings early by text.",
      "Use seasonal tips to keep customers engaged.",
    ],
    faq: [
      { question: "Should I send photos after every visit?", answer: "Photos are great occasionally, but a short summary text is enough for routine visits and costs less." },
      { question: "How early should I text about pool openings?", answer: "Four to six weeks before your busy season gives customers time to book." },
    ],
    relatedSlugs: ["field-service-on-my-way-texts", "home-services-text-marketing", "collecting-photos-and-documents-by-text"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "text-marketing-for-electricians",
    metaTitle: "Text Message Marketing for Electricians | Text2Sale",
    title: "Text message marketing for electricians",
    description: "How electrical contractors use texting to respond to leads, quote from photos, confirm appointments and promote panel upgrades and EV chargers.",
    excerpt: "Electricians spend the day on job sites. Texting keeps leads, quotes and appointments moving without stopping work for every call.",
    tags: ["Home services", "Local business", "Lead generation"],
    intro: [
      "Electrical contractors juggle emergency calls, scheduled installs and estimates, often with their hands literally full. Missed calls mean missed jobs.",
      "Texting lets customers share details on their own time and lets electricians reply between tasks.",
    ],
    sections: [
      {
        heading: "Respond and quote faster",
        paragraphs: [
          "Text back missed calls immediately and ask for photos of the panel, outlet or fixture. Photos help you judge the job and give a ballpark before driving out.",
        ],
        bullets: [
          "Hi, this is Sam with Spark Electric. Sorry I missed your call. Could you text a photo of the breaker panel and describe what's happening?",
          "Your appointment is confirmed for Thursday between 8 and 10 am. We'll text when we're on our way.",
        ],
      },
      {
        heading: "Confirm and update appointments",
        paragraphs: [
          "Confirm appointments the day before, send an on-my-way text with the arrival window, and text when the job is complete with a link to the invoice. Customers appreciate knowing when someone will be in their home.",
        ],
      },
      {
        heading: "Promote high-value work",
        paragraphs: [
          "Past customers who opted in to updates are the best audience for panel upgrades, generator installs, EV charger installations and whole-home surge protection. Send occasional, specific offers, especially when rebates or seasonal needs make them timely.",
        ],
      },
    ],
    keyTakeaways: [
      "Text back missed calls and ask for photos.",
      "Confirm appointments and send on-my-way texts.",
      "Invoice by text when the job is done.",
      "Promote upgrades to past customers who opted in.",
    ],
    faq: [
      { question: "Can I quote electrical work from photos?", answer: "Often a ballpark, yes, with a final price after inspection. Be clear it's an estimate." },
      { question: "What's a good upsell to text?", answer: "EV chargers, surge protection and panel upgrades are popular with homeowners." },
    ],
    relatedSlugs: ["missed-call-text-back", "field-service-on-my-way-texts", "contractor-estimate-follow-up-texts"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "text-marketing-for-boutiques-and-clothing-stores",
    metaTitle: "Text Message Marketing for Boutiques and Clothing Stores | Text2Sale",
    title: "Text message marketing for boutiques and clothing stores",
    description: "How independent boutiques use texting for new arrivals, VIP previews, personal styling, holds and events, without overwhelming customers.",
    excerpt: "Boutique shoppers buy relationships as much as clothes. Personal texts about new arrivals keep them coming back.",
    tags: ["Local business", "SMS marketing", "Retention"],
    intro: [
      "Independent boutiques compete with large retailers through personal service and curated selection. Texting extends that personal touch beyond the store.",
      "A text about a new arrival that suits a customer's style can bring her back the same day.",
    ],
    sections: [
      {
        heading: "New arrivals and previews",
        paragraphs: [
          "Send short texts when new collections arrive, with a single photo or link. Give VIP customers a preview day before the general announcement. Keep it to the pieces likely to interest each segment.",
        ],
        bullets: [
          "New fall sweaters just arrived at Willow & Co. Stop by this week for first pick: [link]",
          "Hi Emma, that blue jacket you loved came back in your size. Want me to hold it until Saturday?",
        ],
      },
      {
        heading: "Personal styling and holds",
        paragraphs: [
          "Staff can text individual customers about items that match their past purchases, offer to hold pieces and confirm pickups. These one-to-one messages often convert better than any campaign.",
        ],
      },
      {
        heading: "Events and frequency",
        paragraphs: [
          "Announce trunk shows, sip-and-shop nights and seasonal sales by text, with a reminder the day of. Keep campaign texts to a few per month; customers who feel spammed stop reading, and a boutique's list is too valuable to wear out.",
        ],
      },
    ],
    keyTakeaways: [
      "Text new arrivals to the customers most likely to care.",
      "Give VIPs early previews.",
      "Use one-to-one texts for holds and styling.",
      "Keep campaign frequency modest.",
    ],
    faq: [
      { question: "Should boutiques send photos by text?", answer: "A single strong photo by MMS works well for new arrivals, though it costs more than plain text." },
      { question: "How do I collect numbers in store?", answer: "Offer sign-up at checkout with clear consent wording, or a QR code at the register." },
    ],
    relatedSlugs: ["vip-customer-lists-and-loyalty-texts", "flash-sale-text-message-examples", "qr-code-sms-opt-in"],
    relatedPages: [{ href: "/bulk-sms-software", label: "Bulk SMS software" }],
  },
  {
    slug: "text-marketing-for-food-trucks",
    metaTitle: "Text Message Marketing for Food Trucks | Text2Sale",
    title: "Text message marketing for food trucks",
    description: "How food trucks use texting to share daily locations, sell out menus, book catering and keep regulars coming back.",
    excerpt: "A food truck's customers need to know one thing every day: where you are. Text tells them faster than any social post.",
    tags: ["Local business", "SMS marketing", "Restaurants"],
    intro: [
      "Food trucks move, menus change and hours depend on events and weather. Regulars rely on social media to find you, but posts get lost in busy feeds.",
      "A short text with today's location reaches fans directly.",
    ],
    sections: [
      {
        heading: "Daily location texts",
        paragraphs: [
          "Send a morning text with where you will be and when. Keep it consistent so customers know when to expect it.",
        ],
        bullets: [
          "Taco Loco today: 11 am to 2 pm at 5th and Main. Special: birria tacos!",
          "We're at the Riverside Brewery tonight from 5 to 9. See you there!",
        ],
      },
      {
        heading: "Specials and sell-outs",
        paragraphs: [
          "Announce limited specials and let customers know when popular items are selling out. Avoid sending more than one or two texts per day, and skip days when you are not serving.",
        ],
      },
      {
        heading: "Catering and events",
        paragraphs: [
          "Text past catering clients before busy seasons such as graduations and holidays, and reply to catering inquiries quickly with availability and a link to your menu. Keep catering contacts in a separate list from daily location subscribers.",
        ],
      },
    ],
    keyTakeaways: [
      "Text your daily location at a consistent time.",
      "Use texts for specials and sell-out alerts.",
      "Limit messages to one or two per serving day.",
      "Keep catering contacts in their own list.",
    ],
    faq: [
      { question: "How do I get customers to sign up?", answer: "A sign on the truck with a keyword or QR code, mentioned at the window, works well." },
      { question: "Should I text every day?", answer: "Only on days you're serving, and only once or twice. Let subscribers choose daily or weekly updates if you can." },
    ],
    relatedSlugs: ["restaurant-sms-marketing", "sms-keyword-campaigns", "sms-preference-center-and-frequency-choices"],
    relatedPages: [{ href: "/bulk-sms-software", label: "Bulk SMS software" }],
  },
];

export const BLOG_POSTS_9: BlogPost[] = ARTICLES.map((article) => {
  const text = [article.title, ...article.intro,
    ...article.sections.flatMap((section) => [section.heading, ...section.paragraphs, ...(section.bullets || [])]),
    ...article.keyTakeaways, ...article.faq.flatMap((item) => [item.question, item.answer])].join(" ");
  return { ...article, datePublished: "2026-10-13", dateModified: "2026-10-13",
    readMinutes: Math.max(1, Math.ceil(text.split(/\s+/).length / 200)) };
});
