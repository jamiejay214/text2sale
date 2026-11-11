import type { BlogPost } from "./blog-posts";

type NewArticle = Omit<BlogPost, "datePublished" | "dateModified" | "readMinutes">;

// Volume 8: questions business owners type into search before and after they
// start texting: A2P and 10DLC registration, fees, consent pages, scheduling,
// group vs mass texting, response-rate benchmarks and everyday campaign
// copy. Same registry as the other volumes, so the sitemap, RSS feed, topic
// pages and IndexNow pick these up automatically.
const ARTICLES: NewArticle[] = [
  {
    slug: "what-is-a2p-messaging",
    metaTitle: "What Is A2P Messaging? Application-to-Person Texting Explained | Text2Sale",
    title: "What is A2P messaging? Application-to-person texting explained",
    description: "A2P messaging means texts sent by a business system rather than a person on a phone. Learn how it differs from P2P, why carriers regulate it, and what it means for your business.",
    excerpt: "A2P is the category every business text falls into once software does the sending. Here is what that means and why carriers care.",
    tags: ["Compliance", "10DLC", "Getting started"],
    intro: [
      "A2P stands for application-to-person. It describes any text message sent from a business system, such as a CRM, a scheduling tool or a marketing platform, to an individual's phone. P2P, or person-to-person, is the ordinary texting you do with friends from your own phone.",
      "The distinction matters because US carriers treat the two very differently. Business traffic gets its own rules, its own registration process and its own fees, and senders who ignore that end up filtered.",
    ],
    sections: [
      {
        heading: "Why carriers separate A2P from P2P",
        paragraphs: [
          "Consumer texting is low volume and conversational. Business texting can send thousands of messages in minutes, which is exactly what spammers do. To protect subscribers, carriers built a separate lane for business traffic where every sender is identified, every use case is described and volume is matched to the sender's reputation.",
          "If a business sends A2P traffic over channels meant for personal use, carriers detect the pattern and block it. That is why texting leads from a personal cell or an unregistered app number tends to stop working without warning.",
        ],
      },
      {
        heading: "The main A2P channels",
        paragraphs: [
          "In the US, business texts travel over three kinds of numbers. 10DLC numbers are ordinary local numbers registered for business use. Toll-free numbers can text after verification. Short codes are five or six digit numbers built for very high volume. Each has its own approval process and throughput.",
        ],
        bullets: [
          "10DLC: local presence, registration through The Campaign Registry.",
          "Toll-free: national feel, separate verification process.",
          "Short code: highest volume, longest and costliest setup.",
        ],
      },
      {
        heading: "What A2P means for your day-to-day texting",
        paragraphs: [
          "Practically, A2P rules ask three things of you: register who you are, describe what you send, and only text people who agreed to hear from you. Do those three and your messages are delivered reliably. Skip them and no amount of clever copy will get through the filters.",
        ],
      },
    ],
    keyTakeaways: [
      "A2P means texts sent by business software, not a person on a phone.",
      "Carriers regulate A2P separately to keep spam out.",
      "10DLC, toll-free and short codes are the three A2P channels.",
      "Registration plus consent is what keeps A2P texts delivered.",
    ],
    faq: [
      { question: "Is texting from a CRM always A2P?", answer: "Yes. Once a system sends or schedules the message on behalf of a business, carriers treat it as A2P traffic." },
      { question: "Can I avoid A2P rules by texting from my own phone?", answer: "Not for business messaging at scale. Carriers watch for business patterns on personal lines and filter them." },
    ],
    relatedSlugs: ["10dlc-registration-guide-for-agents", "short-code-vs-long-code-vs-toll-free", "why-are-my-texts-not-delivering"],
    relatedPages: [{ href: "/10dlc-compliant-texting", label: "10DLC-compliant texting" }],
  },
  {
    slug: "how-long-does-10dlc-approval-take",
    metaTitle: "How Long Does 10DLC Approval Take? Timeline and Delays | Text2Sale",
    title: "How long does 10DLC approval take?",
    description: "A realistic 10DLC timeline from brand registration to campaign approval, what causes delays, and how to avoid the resubmissions that add weeks.",
    excerpt: "Most 10DLC delays are self-inflicted. Here is what the timeline usually looks like and how to keep yours short.",
    tags: ["10DLC", "Compliance", "Getting started"],
    intro: [
      "One of the first questions new business texters ask is how long they have to wait before they can send. The honest answer is that it varies, from a few days when everything is in order to several weeks when a submission has to be fixed and sent again.",
      "The process has stages, and knowing where you are in it makes the wait far less frustrating.",
    ],
    sections: [
      {
        heading: "The stages of 10DLC approval",
        paragraphs: [
          "First your brand is registered, which checks that your business name, EIN and address match official records. Brand checks are often fast. Next your campaign is submitted: the use case, sample messages, opt-in description and website. Carriers and their vetting partners review it, which is usually the longest step. Finally your numbers are attached to the approved campaign and messaging can start.",
        ],
        bullets: [
          "Brand registration: identity check against business records.",
          "Campaign review: use case, samples, consent flow and website.",
          "Number assignment: linking your numbers to the approved campaign.",
        ],
      },
      {
        heading: "What slows approval down",
        paragraphs: [
          "Most delays come from rejections, and most rejections come from preventable mismatches. A legal name that differs from the IRS record, a website that does not mention SMS, sample messages that do not match the use case, or an opt-in description that does not explain how people agree to receive texts will all send a campaign back. Each resubmission restarts part of the review.",
        ],
      },
      {
        heading: "How to keep the timeline short",
        paragraphs: [
          "Before submitting, check that your business details match your EIN letter exactly, that your website has a privacy policy and SMS terms, and that your sample messages name your business and include opt-out language. Describe the opt-in in plain steps, for example a web form checkbox with the exact consent wording. A clean first submission is the single biggest factor in a fast approval.",
        ],
      },
    ],
    keyTakeaways: [
      "Approval moves through brand, campaign and number stages.",
      "Campaign review is usually the longest step.",
      "Rejections from mismatched details cause most delays.",
      "A clean first submission is the fastest path.",
    ],
    faq: [
      { question: "Can I send texts while my campaign is pending?", answer: "Not as registered 10DLC traffic. Unregistered sending is filtered heavily, so wait for approval." },
      { question: "Does resubmitting reset the clock?", answer: "Largely, yes. A rejected campaign goes back into review after you fix it, which is why getting it right the first time matters." },
    ],
    relatedSlugs: ["10dlc-brand-verified-campaign-pending", "10dlc-business-website-readiness-checklist", "writing-sample-messages-for-10dlc-campaigns"],
    relatedPages: [{ href: "/10dlc-compliant-texting", label: "10DLC-compliant texting" }],
  },
  {
    slug: "10dlc-campaign-rejection-reasons",
    metaTitle: "10DLC Campaign Rejected? Common Reasons and How to Fix Them | Text2Sale",
    title: "10DLC campaign rejected? Common reasons and how to fix them",
    description: "The most common reasons 10DLC campaigns are rejected, from website problems to vague opt-in descriptions, and exactly what to change before you resubmit.",
    excerpt: "A rejected 10DLC campaign is frustrating but usually fixable. These are the reasons that come up most and the changes that clear them.",
    tags: ["10DLC", "Compliance"],
    intro: [
      "A campaign rejection usually arrives with a short, cryptic reason code. Behind most of them is one of a handful of problems that reviewers see every day.",
      "Fixing the actual cause before resubmitting saves you another round of waiting.",
    ],
    sections: [
      {
        heading: "Website and identity problems",
        paragraphs: [
          "Reviewers visit your website. If it is under construction, has no privacy policy, does not mention text messaging, or shows a different business name than the one registered, the campaign is likely to be rejected. The site should clearly belong to the registered business and explain what customers will receive by text.",
        ],
      },
      {
        heading: "Opt-in and sample message problems",
        paragraphs: [
          "A vague opt-in description such as customers agree to receive messages does not tell reviewers anything. Describe the exact mechanism: where the form is, what the checkbox says, and that consent is not a condition of purchase. Sample messages must match the use case, name the business and include opt-out language like Reply STOP to opt out.",
        ],
        bullets: [
          "Opt-in described step by step, with the consent wording quoted.",
          "Samples that name your business and match the use case.",
          "Opt-out language in at least one sample message.",
          "No prohibited content such as cannabis or lending offers without approval.",
        ],
      },
      {
        heading: "Use case mismatches",
        paragraphs: [
          "Choosing a use case that does not fit your messages is a frequent cause. Marketing promotions registered as account notifications, or a mixed program registered as a single narrow use case, will be flagged. Pick the use case that honestly describes everything you plan to send, and if you send several kinds of messages, use the mixed use case or separate campaigns.",
        ],
      },
    ],
    keyTakeaways: [
      "Make your website clearly match the registered business.",
      "Describe opt-in step by step with the exact consent wording.",
      "Sample messages must name the business and include opt-out text.",
      "Choose the use case that truly matches your messages.",
    ],
    faq: [
      { question: "How many times can I resubmit?", answer: "There is usually no hard limit, but each resubmission takes review time and may carry a fee, so fix every issue before sending it back." },
      { question: "Will a rejection affect my brand?", answer: "A single rejection does not usually harm your brand, but repeated rejections slow everything down. Treat each one as a checklist item." },
    ],
    relatedSlugs: ["choosing-a-10dlc-campaign-use-case", "writing-sample-messages-for-10dlc-campaigns", "10dlc-business-website-readiness-checklist"],
    relatedPages: [{ href: "/10dlc-compliant-texting", label: "10DLC-compliant texting" }],
  },
  {
    slug: "how-much-does-10dlc-registration-cost",
    metaTitle: "How Much Does 10DLC Registration Cost? Fees Explained | Text2Sale",
    title: "How much does 10DLC registration cost?",
    description: "A breakdown of the fees involved in 10DLC registration: brand registration, optional vetting, monthly campaign fees and per-message carrier fees.",
    excerpt: "10DLC costs come in a few layers. Knowing each one helps you budget and compare providers honestly.",
    tags: ["10DLC", "Budgeting", "Getting started"],
    intro: [
      "10DLC registration is not free, but the costs are modest compared with the price of having your messages filtered. The confusing part is that the fees come from several places and show up at different times.",
      "Here is how the layers fit together. Exact amounts change and differ by provider, so confirm current pricing with yours before you budget.",
    ],
    sections: [
      {
        heading: "One-time registration fees",
        paragraphs: [
          "Registering your brand with The Campaign Registry carries a small one-time fee, and submitting a campaign for vetting carries another. Many providers pass these through at cost, some bundle them into setup, and a few mark them up. If your brand needs a higher trust score, optional external vetting adds another one-time charge that is typically larger than basic registration.",
        ],
      },
      {
        heading: "Recurring and per-message fees",
        paragraphs: [
          "Each registered campaign carries a monthly fee for as long as it is active, and the amount depends on the use case. On top of your provider's per-message price, carriers charge small pass-through fees on every message sent through registered 10DLC traffic. These are tiny per text but add up at volume, so include them in any cost-per-message comparison.",
        ],
        bullets: [
          "Brand registration: one-time.",
          "Campaign vetting: one-time per submission.",
          "Campaign fee: monthly while active.",
          "Carrier pass-through fees: per message.",
          "Optional external vetting: one-time, for higher trust scores.",
        ],
      },
      {
        heading: "Budgeting tips",
        paragraphs: [
          "Ask every provider for an itemized list of registration and carrier fees, and whether resubmissions are charged again. A rejection that costs another vetting fee and two more weeks is the most expensive outcome, so preparing a clean submission is also the cheapest approach.",
        ],
      },
    ],
    keyTakeaways: [
      "10DLC costs combine one-time, monthly and per-message fees.",
      "Carrier pass-through fees apply to every registered message.",
      "Optional vetting costs more but can raise your limits.",
      "Ask providers for an itemized fee list before you sign.",
    ],
    faq: [
      { question: "Are carrier fees included in my text price?", answer: "It depends on the provider. Some include them, many add them separately. Ask so you can compare like with like." },
      { question: "Do I pay again if my campaign is rejected?", answer: "Often yes, a resubmission can carry another vetting fee. Check your provider's policy." },
    ],
    relatedSlugs: ["a2p-brand-vetting-explained", "how-much-does-sms-marketing-cost", "forecasting-monthly-texting-spend"],
    relatedPages: [{ href: "/10dlc-compliant-texting", label: "10DLC-compliant texting" }],
  },
  {
    slug: "what-is-the-campaign-registry-tcr",
    metaTitle: "What Is The Campaign Registry (TCR)? 10DLC's Central Database | Text2Sale",
    title: "What is The Campaign Registry (TCR)?",
    description: "The Campaign Registry is the central database behind 10DLC business texting. Learn what it stores, who uses it, and how it affects your messaging.",
    excerpt: "Every registered 10DLC brand and campaign lives in The Campaign Registry. Here is what it does and why it matters to you.",
    tags: ["10DLC", "Compliance"],
    intro: [
      "The Campaign Registry, usually shortened to TCR, is the central hub that US carriers use to keep track of who is sending business texts over local numbers and why.",
      "You rarely deal with it directly. Your texting provider submits your information to TCR for you, but understanding its role explains much of the 10DLC process.",
    ],
    sections: [
      {
        heading: "What TCR stores",
        paragraphs: [
          "TCR holds two kinds of records. Brand records describe the business: legal name, EIN, address, website and contact details. Campaign records describe a messaging program: the use case, sample messages, how people opt in and how they opt out. Each campaign belongs to a brand, and each phone number used for 10DLC is linked to a campaign.",
        ],
      },
      {
        heading: "Who uses the registry",
        paragraphs: [
          "Texting providers submit brands and campaigns. Carriers read the records to decide whether to accept traffic and how much volume to allow. Vetting partners score brands to produce a trust score, which influences throughput and daily limits. Because every party works from the same records, a mismatch between what you registered and what you send is easy for carriers to spot.",
        ],
        bullets: [
          "Providers submit and manage records on your behalf.",
          "Carriers approve campaigns and set limits.",
          "Vetting partners assign trust scores to brands.",
        ],
      },
      {
        heading: "What it means for you",
        paragraphs: [
          "Keep your registered information accurate and your messages consistent with your registered campaign. If your business name, website or use case changes, update the records rather than sending traffic that no longer matches. The registry is the source of truth carriers rely on.",
        ],
      },
    ],
    keyTakeaways: [
      "TCR is the central database for 10DLC brands and campaigns.",
      "Your provider submits records to TCR for you.",
      "Carriers and vetting partners all read the same records.",
      "Keep registered details accurate and messages consistent.",
    ],
    faq: [
      { question: "Can I register with TCR directly?", answer: "Most businesses register through their texting provider, which handles the submission and connects numbers to the campaign." },
      { question: "Does TCR approve my campaign?", answer: "TCR stores the record. Carriers and their review partners decide whether the campaign is approved." },
    ],
    relatedSlugs: ["10dlc-registration-guide-for-agents", "a2p-brand-vetting-explained", "10dlc-throughput-tiers"],
    relatedPages: [{ href: "/10dlc-compliant-texting", label: "10DLC-compliant texting" }],
  },
  {
    slug: "sms-carrier-fees-explained",
    metaTitle: "SMS Carrier Fees Explained: Why Each Text Costs a Bit More | Text2Sale",
    title: "SMS carrier fees explained",
    description: "What carrier pass-through fees are, why they exist, how they differ between SMS, MMS and unregistered traffic, and how to account for them in your budget.",
    excerpt: "Carrier fees are the small charges that sit on top of your per-text price. Here is where they come from and how to plan for them.",
    tags: ["Budgeting", "10DLC", "SMS"],
    intro: [
      "When you compare texting prices, the per-message rate is only part of the story. Wireless carriers add their own pass-through fees to business messages, and those fees show up on top of whatever your provider charges.",
      "They are small on each text, but anyone sending thousands of messages a month should understand them.",
    ],
    sections: [
      {
        heading: "Why carriers charge fees",
        paragraphs: [
          "Carriers introduced pass-through fees alongside 10DLC registration to fund the work of vetting business traffic and to discourage unregistered sending. Each major carrier sets its own fee per message, and the amount can differ for SMS and MMS and for registered versus unregistered traffic. Providers collect these fees and pay them on to the carriers.",
        ],
      },
      {
        heading: "How fees affect your costs",
        paragraphs: [
          "Because fees apply per message, they scale with volume. Long texts that split into several segments may count as several messages. Picture messages usually carry higher fees than plain text. Unregistered traffic, where it is still accepted at all, can carry higher fees as a penalty, which is one more reason to register.",
        ],
        bullets: [
          "Fees apply per message and scale with volume.",
          "Multi-segment texts can multiply the charge.",
          "MMS fees are typically higher than SMS.",
          "Registered traffic usually costs less than unregistered.",
        ],
      },
      {
        heading: "Keeping fees under control",
        paragraphs: [
          "Write texts that fit in one segment where possible, send to segmented lists rather than everyone, and remove numbers that repeatedly fail. Ask your provider whether its prices include carrier fees so you can compare offers fairly.",
        ],
      },
    ],
    keyTakeaways: [
      "Carriers add their own fees on top of provider prices.",
      "Fees scale with message count and segments.",
      "MMS and unregistered traffic usually cost more.",
      "Shorter texts and cleaner lists keep fees down.",
    ],
    faq: [
      { question: "Do inbound texts carry carrier fees?", answer: "Practices vary by carrier and provider. Ask your provider how inbound messages are billed." },
      { question: "Can I avoid carrier fees?", answer: "Not on business traffic, but you can minimize them by sending fewer, shorter and better-targeted messages." },
    ],
    relatedSlugs: ["sms-character-limits-encoding", "mms-vs-sms-marketing", "how-much-does-10dlc-registration-cost"],
    relatedPages: [{ href: "/sms-character-counter", label: "SMS character counter" }],
  },
  {
    slug: "sole-proprietor-10dlc-registration",
    metaTitle: "Sole Proprietor 10DLC Registration: Texting Without an EIN | Text2Sale",
    title: "Sole proprietor 10DLC registration: texting without an EIN",
    description: "How 10DLC works for sole proprietors without an EIN, the limits that come with it, and when it makes sense to register as a business instead.",
    excerpt: "You can register for business texting without an EIN, but the sole proprietor path has real limits. Here is how to decide.",
    tags: ["10DLC", "Compliance", "Getting started"],
    intro: [
      "Many independent agents, consultants and small service providers do not have an EIN. The 10DLC system includes a sole proprietor option for them, verified with personal details instead of business tax records.",
      "It is a workable starting point, but it comes with restrictions you should know before you build your texting around it.",
    ],
    sections: [
      {
        heading: "How sole proprietor registration works",
        paragraphs: [
          "Instead of an EIN, the registration verifies you as an individual, often with a one-time code sent to your mobile phone. The resulting brand is tied to you personally. Approval can be simpler because there are fewer business records to match.",
        ],
      },
      {
        heading: "The limits that come with it",
        paragraphs: [
          "Sole proprietor brands typically get lower throughput and daily volume, a limited number of campaigns and phone numbers, and less flexibility in use cases. That is fine for one person texting their own clients and leads, but it does not suit a team, high-volume campaigns or several product lines.",
        ],
        bullets: [
          "Lower sending volume and throughput.",
          "Usually one campaign and very few numbers.",
          "Tied to an individual rather than a company.",
        ],
      },
      {
        heading: "When to get an EIN instead",
        paragraphs: [
          "If you plan to add team members, send larger campaigns or grow beyond a personal book of business, registering as a business with an EIN is worth it. An EIN is free from the IRS and usually issued quickly online. A standard brand gives you more room to grow and avoids re-registering everything later.",
        ],
      },
    ],
    keyTakeaways: [
      "Sole proprietors can register without an EIN.",
      "The path comes with lower volume and fewer numbers.",
      "It suits one person texting their own contacts.",
      "Get an EIN if you plan to grow or add a team.",
    ],
    faq: [
      { question: "Is an EIN hard to get?", answer: "No. US businesses can apply for an EIN from the IRS online for free, and it is often issued the same day." },
      { question: "Can I switch from sole proprietor to a standard brand later?", answer: "Yes, but it usually means registering a new brand and campaign, so plan the move before volume grows." },
    ],
    relatedSlugs: ["10dlc-registration-guide-for-agents", "10dlc-throughput-tiers", "how-long-does-10dlc-approval-take"],
    relatedPages: [{ href: "/10dlc-compliant-texting", label: "10DLC-compliant texting" }],
  },
  {
    slug: "express-written-consent-for-texting",
    metaTitle: "Express Written Consent for Marketing Texts, Explained | Text2Sale",
    title: "Express written consent for marketing texts, explained",
    description: "What counts as express written consent for marketing text messages, what a compliant consent statement includes, and the mistakes that leave businesses exposed.",
    excerpt: "Marketing texts need a specific kind of consent. Here is what it looks like in practice and how to capture it properly.",
    tags: ["Compliance", "Lead generation"],
    intro: [
      "Under US telemarketing rules, sending marketing texts with automated systems generally requires the recipient's prior express written consent. The phrase sounds legalistic, but the idea is simple: the person clearly agreed, in writing, to receive marketing texts from you.",
      "This article explains the practical elements. It is general information, not legal advice, so have counsel review your own consent language.",
    ],
    sections: [
      {
        heading: "What a consent statement should include",
        paragraphs: [
          "A solid consent statement names the business that will text, says the messages may be marketing, notes that they may be sent with automated technology, states that consent is not a condition of purchase, and mentions that message and data rates may apply and the person can reply STOP to opt out. It should sit next to the phone number field, not be buried in a terms page.",
        ],
        bullets: [
          "Names the specific business that will send messages.",
          "Says messages may include marketing and use automated technology.",
          "States consent is not required to buy.",
          "Explains how to opt out and that rates may apply.",
        ],
      },
      {
        heading: "Common mistakes",
        paragraphs: [
          "Pre-checked boxes, consent hidden in terms of service, statements that cover a long list of unnamed partners, and relying on a lead vendor's consent without seeing the exact wording are frequent problems. If you buy leads, ask for the consent language, the page URL and a timestamp for each lead.",
        ],
      },
      {
        heading: "Keep proof",
        paragraphs: [
          "Consent is only useful if you can show it. Store the date and time, the source page, the exact wording shown, and the phone number that agreed. Keep those records for as long as you text the contact and for a period afterwards in case questions arise.",
        ],
      },
    ],
    keyTakeaways: [
      "Marketing texts generally need prior express written consent.",
      "The statement must name your business and mention marketing.",
      "Avoid pre-checked boxes and buried consent.",
      "Store proof of consent for every contact.",
    ],
    faq: [
      { question: "Does a customer texting me first count as consent?", answer: "It usually covers replying to their request, but not ongoing marketing campaigns. Get explicit consent for those." },
      { question: "Is verbal consent enough?", answer: "For marketing texts, written consent, which can be electronic such as a web form, is the safer standard." },
    ],
    relatedSlugs: ["sms-consent-records", "tcpa-compliance-texting-leads", "how-to-build-an-sms-opt-in-list"],
    relatedPages: [{ href: "/10dlc-compliant-texting", label: "10DLC-compliant texting" }],
  },
  {
    slug: "sms-privacy-policy-for-your-website",
    metaTitle: "SMS Privacy Policy: What Your Website Needs for Texting | Text2Sale",
    title: "SMS privacy policy: what your website needs for business texting",
    description: "What to include in your privacy policy so carriers and customers know how you handle phone numbers, including the no-sharing statement 10DLC reviewers look for.",
    excerpt: "Carriers check your privacy policy before approving a texting campaign. Here is what it should say about phone numbers and SMS.",
    tags: ["Compliance", "10DLC"],
    intro: [
      "Your privacy policy is one of the first pages a 10DLC reviewer opens. It tells them, and your customers, how you collect and use personal information, including the phone numbers you text.",
      "A generic template often misses the SMS-specific statements reviewers expect. Here is what to add.",
    ],
    sections: [
      {
        heading: "The statements reviewers look for",
        paragraphs: [
          "Explain that you collect phone numbers when people opt in to receive texts, what you use them for, and that you do not sell or share mobile numbers or SMS consent with third parties for their marketing purposes. That last statement is one reviewers specifically check for. Mention how people can opt out and how they can contact you about their data.",
        ],
        bullets: [
          "What information you collect and how.",
          "How phone numbers are used for messaging.",
          "That mobile numbers and SMS consent are not shared for third-party marketing.",
          "How to opt out and how to contact you.",
        ],
      },
      {
        heading: "Make it easy to find",
        paragraphs: [
          "Link the privacy policy in your site footer and next to any form that collects phone numbers. The business name on the policy should match your registered brand. A policy that sits on a different domain or names a different company is a common reason campaigns are sent back.",
        ],
      },
      {
        heading: "Keep it accurate",
        paragraphs: [
          "Update the policy when your practices change, for example if you add a new texting tool or start collecting new data. A policy that promises things your systems do not do is worse than a short honest one. Have counsel review it if you operate in a regulated industry.",
        ],
      },
    ],
    keyTakeaways: [
      "Reviewers read your privacy policy before approving texting.",
      "State that mobile numbers are not shared for third-party marketing.",
      "Link the policy in the footer and next to phone forms.",
      "Keep the business name consistent with your registration.",
    ],
    faq: [
      { question: "Do I need a separate SMS privacy policy?", answer: "Not necessarily. A section on text messaging inside your main policy works, as long as it covers the SMS statements." },
      { question: "Can I share numbers with my own service providers?", answer: "Using vendors to deliver your own messages is normal. The key promise is not sharing numbers for others' marketing." },
    ],
    relatedSlugs: ["sms-terms-and-conditions-page", "10dlc-business-website-readiness-checklist", "10dlc-campaign-rejection-reasons"],
    relatedPages: [{ href: "/10dlc-compliant-texting", label: "10DLC-compliant texting" }],
  },
  {
    slug: "sms-terms-and-conditions-page",
    metaTitle: "SMS Terms and Conditions: What to Include on Your Website | Text2Sale",
    title: "SMS terms and conditions: what to include on your website",
    description: "A checklist for the SMS terms page carriers expect: program name, message types, frequency, rates, opt-out and help instructions, and support contact.",
    excerpt: "An SMS terms page tells subscribers exactly what they signed up for. Here is the checklist carriers and customers expect.",
    tags: ["Compliance", "10DLC"],
    intro: [
      "Alongside your privacy policy, carriers expect a set of SMS terms that describes your text program. It can be its own page or a section of your site terms.",
      "Clear terms also reduce complaints, because subscribers know what to expect before the first message arrives.",
    ],
    sections: [
      {
        heading: "What the terms should cover",
        paragraphs: [
          "Name the program and the business, describe the kinds of messages people will receive, give an idea of frequency such as message frequency varies or up to four messages a month, and note that message and data rates may apply. Explain that replying STOP cancels and HELP gets assistance, and provide a support email or phone number.",
        ],
        bullets: [
          "Program and business name.",
          "Types of messages sent.",
          "Expected frequency.",
          "Message and data rates may apply.",
          "STOP to cancel, HELP for help, plus a support contact.",
          "A link to your privacy policy.",
        ],
      },
      {
        heading: "Match the terms to your real program",
        paragraphs: [
          "If your terms say four messages a month and you send daily, you invite complaints and filtering. If you add a new type of message, update the terms. Reviewers compare these terms with your campaign registration and sample messages, so all three should tell the same story.",
        ],
      },
      {
        heading: "Where to link the terms",
        paragraphs: [
          "Link the SMS terms near every opt-in point, in the footer, and in your welcome message where practical. Customers who can find the rules easily are less likely to report your messages as spam.",
        ],
      },
    ],
    keyTakeaways: [
      "Carriers expect an SMS terms page or section.",
      "Cover program name, content, frequency, rates and opt-out.",
      "Keep terms consistent with your registration and samples.",
      "Link the terms wherever people opt in.",
    ],
    faq: [
      { question: "Can my SMS terms be part of my main terms of service?", answer: "Yes, as long as the SMS section is clearly labeled and easy to find." },
      { question: "Do I need to list exact frequency?", answer: "A clear estimate or a statement that frequency varies is common. Just make sure it reflects reality." },
    ],
    relatedSlugs: ["sms-privacy-policy-for-your-website", "sms-welcome-message-examples", "sms-opt-out-keywords-stop-help-start"],
    relatedPages: [{ href: "/10dlc-compliant-texting", label: "10DLC-compliant texting" }],
  },
  {
    slug: "text-enable-your-business-landline",
    metaTitle: "Can You Text a Business Landline? How to Text-Enable Your Number | Text2Sale",
    title: "How to text-enable your business landline number",
    description: "How businesses add texting to an existing landline or VoIP number without changing the number customers already know, and what to check before you do.",
    excerpt: "Your customers already know your main number. Text-enabling it lets them text the same number they call.",
    tags: ["Getting started", "Two-way texting", "Local business"],
    intro: [
      "Many customers try to text a business's main number and never hear back, because the number cannot receive texts. Text-enabling that existing landline or VoIP number fixes the problem without changing anything about your phone calls.",
      "The process is common and usually invisible to callers.",
    ],
    sections: [
      {
        heading: "How text-enabling works",
        paragraphs: [
          "Texting and voice for a number can be handled by different providers. A texting platform requests permission to route only the messaging for your number to its system, while calls keep going to your current phone company. You typically sign a letter of authorization proving you control the number, and then texts sent to it arrive in the platform's inbox.",
        ],
      },
      {
        heading: "What to check first",
        paragraphs: [
          "Confirm you own the number and have its account details. Make sure the number is not already text-enabled somewhere else, such as an old marketing tool. Plan who will answer incoming texts, because customers expect replies within business hours. For outbound campaigns, the number still needs to be registered for business messaging like any other.",
        ],
        bullets: [
          "Proof that you control the number.",
          "No conflicting text routing with another provider.",
          "A plan for who answers incoming texts.",
          "Registration before sending campaigns.",
        ],
      },
      {
        heading: "What customers notice",
        paragraphs: [
          "Callers notice nothing. Texters notice that the number on your sign, website and business cards now answers texts. Add a line such as Call or text us at the same number, so people know it is an option.",
        ],
      },
    ],
    keyTakeaways: [
      "You can add texting to an existing landline or VoIP number.",
      "Calls stay with your current phone provider.",
      "You need to prove control of the number.",
      "Tell customers they can now text the same number.",
    ],
    faq: [
      { question: "Will text-enabling affect my phone calls?", answer: "No. Only the messaging route changes, and calls continue to ring as they do today." },
      { question: "How long does it take?", answer: "Often a few days once the authorization is signed, plus registration time if you plan to send campaigns." },
    ],
    relatedSlugs: ["landlines-voip-who-can-receive-texts", "missed-call-text-back", "two-way-texting-for-customer-service"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "group-texting-vs-mass-texting",
    metaTitle: "Group Texting vs Mass Texting: What's the Difference? | Text2Sale",
    title: "Group texting vs mass texting: what's the difference?",
    description: "Group texts put everyone in one thread; mass texts send individual messages to many people. Learn which to use for customers, teams and campaigns.",
    excerpt: "Group texting and mass texting sound alike but behave very differently. Choosing the wrong one can expose numbers and create reply chaos.",
    tags: ["Getting started", "SMS marketing", "Two-way texting"],
    intro: [
      "People often search for how to send a group text to customers. What most businesses actually want is a mass text: the same message sent individually to many people, with each reply coming back privately.",
      "The difference affects privacy, replies and deliverability.",
    ],
    sections: [
      {
        heading: "How a group text works",
        paragraphs: [
          "A group text is a shared conversation. Everyone sees everyone else's number and every reply goes to the whole group. That is fine for a small team coordinating a job, but it is a poor fit for customers: it exposes their numbers to strangers and turns one question into a flood of notifications for everyone.",
        ],
      },
      {
        heading: "How a mass text works",
        paragraphs: [
          "A mass text, also called bulk SMS, sends a separate copy of the message to each person. Recipients cannot see each other, replies come back only to you, and each message can be personalized with the recipient's name. Mass texting tools also handle opt-outs, scheduling and delivery reports.",
        ],
        bullets: [
          "Each recipient gets a private message.",
          "Replies come back to your inbox, not the group.",
          "Personalization with names and details.",
          "Opt-out handling and delivery tracking built in.",
        ],
      },
      {
        heading: "Which one to use",
        paragraphs: [
          "Use group texts only for small internal teams who know each other. Use mass texting for customers, leads, members and any list where privacy matters. Business mass texting should be sent from a registered number with consent, just like any other marketing message.",
        ],
      },
    ],
    keyTakeaways: [
      "Group texts share one thread and expose every number.",
      "Mass texts send private copies to each person.",
      "Use mass texting for customers and leads.",
      "Keep group texts for small internal teams.",
    ],
    faq: [
      { question: "Can recipients of a mass text see each other?", answer: "No. Each person receives their own message and sees only your number." },
      { question: "Is there a limit on mass text size?", answer: "Limits depend on your number type and registration, which set how fast and how many messages you can send." },
    ],
    relatedSlugs: ["texting-crm-vs-mass-texting-app", "import-and-text-thousands-of-leads", "sms-merge-fields-personalization"],
    relatedPages: [{ href: "/bulk-sms-software", label: "Bulk SMS software" }],
  },
  {
    slug: "how-to-schedule-text-messages",
    metaTitle: "How to Schedule Text Messages for Business | Text2Sale",
    title: "How to schedule text messages for your business",
    description: "How scheduled texts work, when to schedule versus send immediately, time zone pitfalls, and the scheduling mistakes that cause complaints.",
    excerpt: "Scheduling lets you write once and send at the right moment. Here is how to use it without texting people at the wrong hour.",
    tags: ["Operations", "Automation", "Campaigns"],
    intro: [
      "Scheduled texts let you prepare messages in advance and have them go out at a chosen time. For businesses, that means reminders that arrive the day before, promotions that land on a weekday morning, and follow-ups that do not depend on someone remembering.",
      "Scheduling is simple, but the time zone of the recipient is where most mistakes happen.",
    ],
    sections: [
      {
        heading: "When to schedule and when to send now",
        paragraphs: [
          "Send immediately when someone is waiting on you: a new lead, a question, a confirmation. Schedule when timing matters more than speed: reminders, campaign launches, check-ins after a set period and messages you write outside business hours that should arrive during them.",
        ],
      },
      {
        heading: "Mind the time zone",
        paragraphs: [
          "A message scheduled for 9 a.m. in your time zone arrives at 6 a.m. on the West Coast. Good platforms schedule by each contact's local time based on their area code or address, and respect quiet hours automatically. Check this before scheduling a national campaign.",
        ],
        bullets: [
          "Schedule by the recipient's local time when possible.",
          "Respect quiet hours, typically evenings and early mornings.",
          "Avoid sending a whole list at the exact same minute.",
          "Double-check dates around holidays and daylight saving changes.",
        ],
      },
      {
        heading: "Keep scheduled messages current",
        paragraphs: [
          "A scheduled reminder for an appointment that was cancelled, or a follow-up to someone who already replied, is a quick way to annoy people. Use tools that cancel scheduled messages when the contact replies, opts out or changes their appointment, and review your queue before big sends.",
        ],
      },
    ],
    keyTakeaways: [
      "Schedule when timing matters more than speed.",
      "Send by the recipient's local time zone.",
      "Respect quiet hours automatically.",
      "Cancel scheduled texts when circumstances change.",
    ],
    faq: [
      { question: "Can I schedule texts from my iPhone for business?", answer: "Phone features are limited and not built for business lists. A business texting platform handles scheduling, time zones and opt-outs properly." },
      { question: "What time is best to schedule texts?", answer: "Weekday mid-morning and early afternoon in the recipient's local time work well for most businesses." },
    ],
    relatedSlugs: ["send-windows-and-time-zones-by-contact", "quiet-hours-and-texting-time-rules", "best-time-to-text-sales-leads"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "how-to-send-business-texts-from-a-computer",
    metaTitle: "How to Send Business Texts From Your Computer | Text2Sale",
    title: "How to send business texts from your computer",
    description: "Ways to send and answer business text messages from a laptop or desktop, why browser-based texting beats phone mirroring, and what to set up first.",
    excerpt: "Typing on a keyboard is faster, and a shared inbox keeps the team in sync. Here is how to text customers from your computer.",
    tags: ["Getting started", "Two-way texting", "Operations"],
    intro: [
      "Answering customer texts on a phone works for a handful of conversations. Once you have dozens a day, a computer with a full keyboard, a contact record next to each conversation and saved replies is far faster.",
      "There are a few ways to do it, and they are not equal.",
    ],
    sections: [
      {
        heading: "Phone mirroring versus a business platform",
        paragraphs: [
          "Mirroring apps let you see your phone's messages on a computer. They are convenient for personal use, but business conversations stay tied to one person's phone, there is no shared history for teammates, and opt-outs are not tracked. A browser-based business texting platform keeps every conversation in a shared inbox tied to a business number, which anyone on the team can pick up.",
        ],
      },
      {
        heading: "What to set up first",
        paragraphs: [
          "Choose a business number or text-enable your existing one, register it for business messaging, import your contacts, and create saved replies for the questions you answer every day. Decide who owns the inbox during business hours so no message sits unanswered.",
        ],
        bullets: [
          "A business texting number, registered.",
          "Contacts imported with tags.",
          "Saved replies for common questions.",
          "An owner for the inbox each shift.",
        ],
      },
      {
        heading: "Working efficiently",
        paragraphs: [
          "Use keyboard shortcuts, personalize saved replies before sending, and keep notes on the contact record so the next person knows the context. Turn on notifications so new replies are seen quickly even when you are in another tab.",
        ],
      },
    ],
    keyTakeaways: [
      "Computers make texting faster at business volume.",
      "A shared business inbox beats phone mirroring.",
      "Register your number and set up saved replies first.",
      "Assign someone to own the inbox.",
    ],
    faq: [
      { question: "Can my team share one texting number?", answer: "Yes. A shared inbox lets several people answer from the same business number while keeping one history." },
      { question: "Do customers see a difference when I text from a computer?", answer: "No. They receive a normal text from your business number." },
    ],
    relatedSlugs: ["why-reps-shouldnt-text-from-personal-cell", "two-way-texting-for-customer-service", "sms-reply-templates-for-common-questions"],
    relatedPages: [{ href: "/sales-team-texting-crm", label: "Sales team texting CRM" }],
  },
  {
    slug: "why-reps-shouldnt-text-from-personal-cell",
    metaTitle: "Why Sales Reps Shouldn't Text Leads From Their Personal Cell | Text2Sale",
    title: "Why sales reps shouldn't text leads from their personal cell",
    description: "The risks of texting customers from personal phones, from lost conversations to compliance gaps, and how a shared business number fixes them.",
    excerpt: "Personal phones feel convenient until a rep leaves, a lead opts out, or carriers start filtering. Here is why business texting needs business numbers.",
    tags: ["Sales teams", "Compliance", "Operations"],
    intro: [
      "Many teams start texting leads from personal cell phones because it is quick and free. It works until it does not.",
      "The problems show up slowly: missing history, inconsistent messages and, eventually, compliance and deliverability issues.",
    ],
    sections: [
      {
        heading: "The business risks",
        paragraphs: [
          "When a rep leaves, their texts and relationships leave with them. Managers cannot see what was promised, nobody can pick up a conversation when the rep is out, and there is no record to resolve a dispute. Leads also end up with several reps' numbers, which confuses them.",
        ],
      },
      {
        heading: "The compliance and delivery risks",
        paragraphs: [
          "Personal phones do not track opt-outs across the team, so a lead who asked one rep to stop can still get texts from another. Business volume from a personal line also looks like unregistered A2P traffic to carriers, which leads to filtering. And there is no consent record if a complaint arrives.",
        ],
        bullets: [
          "Opt-outs are not shared across the team.",
          "No proof of consent or message history.",
          "Unregistered business traffic gets filtered.",
          "Conversations leave with departing reps.",
        ],
      },
      {
        heading: "The better setup",
        paragraphs: [
          "Give reps registered business numbers in a shared platform. Each rep can still own their conversations, but managers see the history, opt-outs apply everywhere, and conversations can be reassigned. Reps can use the mobile app on their own phone without using their personal number.",
        ],
      },
    ],
    keyTakeaways: [
      "Personal phones hide history from the business.",
      "Opt-outs on one phone do not protect the others.",
      "Business volume from personal lines gets filtered.",
      "Registered business numbers in a shared platform fix all of it.",
    ],
    faq: [
      { question: "Can reps keep their own number for texting?", answer: "Reps can have their own dedicated business number in the platform, which keeps the personal touch without the risks." },
      { question: "What about existing conversations on personal phones?", answer: "Move active leads to the business number with a short introduction text and record any opt-outs." },
    ],
    relatedSlugs: ["shared-vs-dedicated-numbers-per-rep", "managing-team-texting-quality", "honoring-opt-outs-across-channels"],
    relatedPages: [{ href: "/sales-team-texting-crm", label: "Sales team texting CRM" }],
  },
  {
    slug: "how-to-get-a-business-texting-number",
    metaTitle: "How to Get a Business Phone Number for Texting | Text2Sale",
    title: "How to get a business phone number for texting",
    description: "Your options for a business texting number: new local numbers, toll-free, text-enabling an existing line, and how to choose an area code.",
    excerpt: "Before you can text customers as a business, you need the right number. Here are the options and how to pick one.",
    tags: ["Getting started", "Local business"],
    intro: [
      "A business texting number is the line your customers see on every message. Choosing it is quick, but the choice affects trust, reply rates and how much you can send.",
      "Here are the main options.",
    ],
    sections: [
      {
        heading: "Your options",
        paragraphs: [
          "You can buy a new local number through a texting platform, which is fast and lets you choose an area code your customers recognize. You can use a toll-free number for a national brand. Or you can text-enable the number you already advertise so customers text the same line they call.",
        ],
        bullets: [
          "New local number: familiar area code, quick to set up.",
          "Toll-free: national presence, separate verification.",
          "Existing number: no change for customers.",
        ],
      },
      {
        heading: "Choosing an area code",
        paragraphs: [
          "People are more likely to answer a number from their own area. If your customers are local, pick your local area code. If you serve several regions, consider a number per region. Keep the number consistent so customers recognize it over time.",
        ],
      },
      {
        heading: "Register before you send",
        paragraphs: [
          "Whatever number you choose, register it for business messaging before running campaigns. Registration links the number to your verified business and approved use case, which is what keeps messages from being filtered.",
        ],
      },
    ],
    keyTakeaways: [
      "Choose between a new local number, toll-free or your existing line.",
      "Local area codes tend to get more replies from local customers.",
      "Keep one consistent number customers recognize.",
      "Register the number before sending campaigns.",
    ],
    faq: [
      { question: "How much does a business texting number cost?", answer: "Usually a small monthly fee per number plus per-message charges and registration fees." },
      { question: "Can I keep my number if I switch providers?", answer: "In most cases yes, numbers can be ported or text-enabled with a new provider." },
    ],
    relatedSlugs: ["local-area-code-numbers-for-texting", "text-enable-your-business-landline", "short-code-vs-long-code-vs-toll-free"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "good-sms-response-rate",
    metaTitle: "What Is a Good SMS Response Rate? How to Measure and Improve It | Text2Sale",
    title: "What is a good SMS response rate?",
    description: "How to calculate SMS response rate correctly, why benchmarks vary so widely, and practical ways to raise replies without sending more texts.",
    excerpt: "Response rate is the number most texters care about. Here is how to measure it honestly and improve it.",
    tags: ["Analytics", "Campaigns", "SMS marketing"],
    intro: [
      "Ask ten businesses what a good SMS response rate is and you will hear ten different numbers. That is because response rates depend heavily on who you are texting, why and how warm the relationship is.",
      "Rather than chase a universal benchmark, measure your own rate correctly and work to improve it.",
    ],
    sections: [
      {
        heading: "How to calculate it",
        paragraphs: [
          "Divide the number of contacts who replied by the number of messages that were actually delivered, not the number you attempted. Exclude opt-out replies such as STOP from the reply count, or track them separately, so a campaign that angers people does not look successful.",
        ],
      },
      {
        heading: "Why rates vary so much",
        paragraphs: [
          "A reminder to an existing customer who expects it can get very high engagement. A first text to a lead who filled out a form an hour ago usually does well. A message to an old or purchased list will be far lower. Compare campaigns of the same type, to the same kind of audience, rather than against an industry average.",
        ],
        bullets: [
          "Existing customers reply more than cold contacts.",
          "Fresh leads reply more than aged leads.",
          "Questions get more replies than announcements.",
          "Personalized texts outperform generic blasts.",
        ],
      },
      {
        heading: "How to raise it",
        paragraphs: [
          "Text sooner after someone opts in, say who you are, ask one simple question, and personalize with their name and the reason they reached out. Segment your list so each group gets a relevant message, and drop contacts who never engage. Fewer, better texts usually beat more texts.",
        ],
      },
    ],
    keyTakeaways: [
      "Calculate replies over delivered messages.",
      "Track opt-outs separately from replies.",
      "Compare similar campaigns, not industry averages.",
      "Speed, relevance and a clear question raise replies.",
    ],
    faq: [
      { question: "Should STOP replies count as responses?", answer: "No. Count them separately as opt-outs so they do not inflate your response rate." },
      { question: "How long should I wait before measuring?", answer: "Most replies come within hours, but measure after a day or two to capture late responders." },
    ],
    relatedSlugs: ["sms-delivery-rate-vs-reply-rate", "how-to-get-more-replies-to-sales-texts", "sms-marketing-roi-metrics"],
    relatedPages: [{ href: "/sms-follow-up-for-sales-teams", label: "SMS follow-up for sales teams" }],
  },
  {
    slug: "sms-link-click-tracking",
    metaTitle: "SMS Link Tracking: How to Measure Clicks in Text Messages | Text2Sale",
    title: "SMS link tracking: how to measure clicks in text messages",
    description: "How to track link clicks in business texts using UTM parameters and branded links, without the public shorteners that carriers filter.",
    excerpt: "Clicks show what a text actually achieved. Here is how to track them without hurting deliverability.",
    tags: ["Analytics", "Deliverability", "Campaigns"],
    intro: [
      "When a text includes a link, clicks tell you far more than delivery numbers. They show which offers interest people and which messages fall flat.",
      "The challenge is tracking clicks without using the free public link shorteners that carriers often block.",
    ],
    sections: [
      {
        heading: "Use UTM parameters",
        paragraphs: [
          "Add UTM parameters to your links, such as utm_source=sms and utm_campaign=spring-promo, so your website analytics attribute visits to the right text campaign. This works with any analytics tool and costs nothing. Keep the parameters short so the link does not dominate the message.",
        ],
      },
      {
        heading: "Avoid public shorteners",
        paragraphs: [
          "Shared shortener domains are used by spammers, so carriers often filter messages that contain them. If you need a short link, use a branded domain that belongs to your business, or a platform feature that shortens links on a dedicated domain. The link should make it obvious where the reader is going.",
        ],
        bullets: [
          "Use your own domain or a branded short domain.",
          "Never use free public shorteners in business texts.",
          "Keep one link per message.",
          "Make the destination obvious from the link text.",
        ],
      },
      {
        heading: "Read the results carefully",
        paragraphs: [
          "Some phones and security tools preview links automatically, which can register clicks that no person made. Look at what happened after the click, such as form fills, bookings or purchases, rather than raw clicks alone.",
        ],
      },
    ],
    keyTakeaways: [
      "UTM parameters attribute visits to text campaigns.",
      "Public shorteners hurt deliverability.",
      "Use a branded domain for short links.",
      "Judge results by conversions, not raw clicks.",
    ],
    faq: [
      { question: "Why do I see clicks seconds after sending?", answer: "Link previews and security scanners often open links automatically. Focus on downstream actions." },
      { question: "How many links should a text have?", answer: "One. Multiple links look spammy and split attention." },
    ],
    relatedSlugs: ["links-in-business-texts", "lead-source-attribution-utm-campaigns", "spam-filter-triggers-in-business-texts"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "sms-call-to-action-examples",
    metaTitle: "20 SMS Call-to-Action Examples That Get Replies | Text2Sale",
    title: "20 SMS call-to-action examples that get replies",
    description: "Call-to-action examples for business texts, organized by goal: replies, bookings, purchases and reviews, with tips for writing your own.",
    excerpt: "A text without a clear next step gets read and forgotten. These call-to-action examples give each message a job.",
    tags: ["Copywriting", "Scripts", "SMS marketing"],
    intro: [
      "Every business text should ask the reader to do one thing. That ask, the call to action, is often the difference between a message that gets a reply and one that gets ignored.",
      "Here are examples by goal, followed by tips for writing your own.",
    ],
    sections: [
      {
        heading: "Calls to action that invite a reply",
        paragraphs: [
          "Questions that can be answered in one word work best because they ask very little of the reader.",
        ],
        bullets: [
          "Is this still something you're looking into? Reply YES or NO.",
          "Would mornings or afternoons work better for a quick call?",
          "Did you get the quote I sent over?",
          "What's the best time to reach you this week?",
          "Want me to send the details here by text?",
        ],
      },
      {
        heading: "Calls to action for bookings and purchases",
        paragraphs: [
          "When the goal is an action outside the conversation, be specific about what happens next and when.",
        ],
        bullets: [
          "Reply 1 to confirm Tuesday at 2 pm or 2 to reschedule.",
          "Book your spot here before Friday: [link]",
          "Tap to pay your invoice securely: [link]",
          "Reply BOOK and I'll send two open times.",
          "Show this text at checkout for the member price.",
        ],
      },
      {
        heading: "Calls to action for reviews and referrals",
        paragraphs: [
          "Ask after a good experience and make the request easy to act on.",
        ],
        bullets: [
          "Would you mind leaving a quick review? [link]",
          "Know someone who could use this? Reply with their name and I'll reach out.",
          "Reply 1 to 5: how was your visit today?",
        ],
      },
      {
        heading: "Writing your own",
        paragraphs: [
          "Keep to one call to action per message, put it at the end, and make it effortless: a one-word reply, a single tap or a clear time. Avoid pressure phrases like act now or last chance, which carriers associate with spam. Test two versions on similar audiences and keep the winner.",
        ],
      },
    ],
    keyTakeaways: [
      "Give every text one clear next step.",
      "One-word replies are the easiest ask.",
      "Be specific about times, links and what happens next.",
      "Skip pressure phrases that look like spam.",
    ],
    faq: [
      { question: "Should every text include a link?", answer: "No. Many of the best calls to action ask for a reply, which also helps your deliverability." },
      { question: "Where should the call to action go?", answer: "At the end of the message, after the context, so it is the last thing the reader sees." },
    ],
    relatedSlugs: ["sms-copywriting-tips", "text-message-marketing-examples", "how-to-get-more-replies-to-sales-texts"],
    relatedPages: [{ href: "/sms-follow-up-for-sales-teams", label: "SMS follow-up for sales teams" }],
  },
  {
    slug: "how-to-respond-to-who-is-this-texts",
    metaTitle: "How to Respond When a Lead Texts 'Who Is This?' | Text2Sale",
    title: "How to respond when a lead texts “who is this?”",
    description: "Why leads reply who is this, how to answer so the conversation continues, example replies, and how to stop the question coming up in the first place.",
    excerpt: "Who is this is one of the most common replies to a first text. Answered well, it is the start of a real conversation.",
    tags: ["Scripts", "Speed to lead", "Copywriting"],
    intro: [
      "When a lead replies who is this, they are not saying no. They are telling you they do not recognize the number or do not remember asking. That is a chance to earn their attention.",
      "The worst responses are no response and a sales pitch. The best responses are short, honest and remind them why you are texting.",
    ],
    sections: [
      {
        heading: "What a good reply includes",
        paragraphs: [
          "Give your name, your business, and the reason you have their number, such as the form they filled out or the quote they requested. Then ask one easy question. Keep it under two sentences so it reads like a person, not a script.",
        ],
        bullets: [
          "Hi, it's Jamie with Johnson Health. You asked about health coverage on our site yesterday. Still looking?",
          "This is Sam from Bright Roofing. You requested an estimate for your roof. Is this still the best number?",
          "Sorry for the surprise! It's Alex with Coastal Realty, following up on your open house sign-in. Any homes catch your eye?",
        ],
      },
      {
        heading: "If they don't remember",
        paragraphs: [
          "Some people genuinely do not recall opting in, especially with purchased leads. Apologize, explain briefly, and offer an easy out: No problem if the timing's wrong, just reply STOP and I won't text again. Respecting the exit protects your number's reputation and sometimes earns a yes later.",
        ],
      },
      {
        heading: "Prevent the question",
        paragraphs: [
          "Identify yourself and your business in the very first text and mention how they reached you. Text quickly after they opt in, while they still remember. The more recognizable your first message, the fewer who is this replies you will get.",
        ],
      },
    ],
    keyTakeaways: [
      "Who is this means curiosity, not rejection.",
      "Reply with your name, business and the reason you're texting.",
      "Offer an easy opt-out if they don't remember.",
      "Identify yourself in the first text to prevent the question.",
    ],
    faq: [
      { question: "Should AI answer who is this replies?", answer: "Yes, if it is set up to introduce you honestly and stop when asked. It is one of the easiest replies to automate well." },
      { question: "Is it okay to ignore the question?", answer: "No. An unanswered who is this often becomes a spam report." },
    ],
    relatedSlugs: ["first-text-to-a-new-lead-examples", "identifying-your-business-in-every-text", "handling-wrong-number-and-angry-replies"],
    relatedPages: [{ href: "/ai-texting-crm", label: "AI texting CRM" }],
  },
  {
    slug: "texting-customers-about-price-increases",
    metaTitle: "How to Tell Customers About a Price Increase by Text | Text2Sale",
    title: "How to tell customers about a price increase by text",
    description: "How to announce a price increase by text without losing customers: timing, wording examples, what to include and how to handle replies.",
    excerpt: "Price increases are uncomfortable to announce. A clear, respectful text with enough notice keeps most customers on board.",
    tags: ["Retention", "Customer service", "Scripts"],
    intro: [
      "Rising costs eventually reach almost every business. How you tell customers matters as much as the increase itself.",
      "Text works well for these announcements because it is direct and personal, as long as the message is honest and gives people time.",
    ],
    sections: [
      {
        heading: "Timing and notice",
        paragraphs: [
          "Give at least a few weeks of notice for recurring services and memberships, and longer if contracts require it. Avoid surprising customers at the moment of payment. Sending the text a week or two before an invoice gives people time to ask questions.",
        ],
      },
      {
        heading: "What to say",
        paragraphs: [
          "Be direct about the new price and the date it starts, give a short reason, and remind them of the value they get. Offer a way to talk it through. Avoid long apologies or vague language, which reads as evasive.",
        ],
        bullets: [
          "Hi Maria, a heads-up from Green Lawn: starting March 1, monthly service will be $65, up from $59, due to higher fuel and labor costs. Your crew and schedule stay the same. Questions? Just reply here.",
          "Hi Dan, quick note from Peak Fitness: memberships move to $45/month on April 1. Members who prepay a year before then keep today's rate. Reply if you'd like details.",
        ],
      },
      {
        heading: "Handling replies",
        paragraphs: [
          "Answer every reply personally and promptly. Some customers just want to be heard. For loyal or at-risk customers, consider options such as a prepay discount, a lighter plan or delaying the increase. Track who cancels so you can follow up later.",
        ],
      },
    ],
    keyTakeaways: [
      "Give enough notice before the new price applies.",
      "State the new price, the date and a brief reason.",
      "Invite replies and answer each one personally.",
      "Offer options to customers at risk of leaving.",
    ],
    faq: [
      { question: "Should I send a price increase text to everyone at once?", answer: "Segment it so you can handle replies. Start with smaller groups if you expect many questions." },
      { question: "Is email better for price changes?", answer: "Use both for important changes: email for the full details, text for a clear heads-up people actually read." },
    ],
    relatedSlugs: ["texting-customers-about-delays-and-changes", "vip-customer-lists-and-loyalty-texts", "two-way-texting-for-customer-service"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "order-and-shipping-update-texts",
    metaTitle: "Order Confirmation and Shipping Update Texts for Ecommerce | Text2Sale",
    title: "Order confirmation and shipping update texts for ecommerce",
    description: "Which order and shipping notifications to send by text, example messages, and how to keep transactional texts separate from marketing.",
    excerpt: "Shipping texts are some of the most welcome messages a store can send. Here is what to send and when.",
    tags: ["Ecommerce", "Customer service", "Automation"],
    intro: [
      "Customers check on their orders constantly. Proactive texts at the right moments answer the question before it becomes a support email.",
      "These transactional messages are expected and valued, which makes them a strong foundation for a store's texting program.",
    ],
    sections: [
      {
        heading: "The notifications worth sending",
        paragraphs: [
          "Send a confirmation when the order is placed, a shipping notice with tracking when it leaves, an out-for-delivery message on the day, and a delivered confirmation. Add an alert if something goes wrong, such as a delay or an address problem.",
        ],
        bullets: [
          "Order confirmed: Thanks, Lisa! Order #4821 is confirmed. We'll text you when it ships.",
          "Shipped: Your order #4821 is on its way. Track it here: [link]",
          "Out for delivery: Good news, your package arrives today.",
          "Delayed: Your order #4821 is delayed by about two days. Sorry about that, reply here with any questions.",
        ],
      },
      {
        heading: "Keep transactional and marketing separate",
        paragraphs: [
          "Order updates are transactional, and customers who request them have not necessarily agreed to marketing. Do not slip promotions into shipping texts unless the customer has also opted in to marketing messages. Mixing the two invites complaints and can create compliance problems.",
        ],
      },
      {
        heading: "Let customers reply",
        paragraphs: [
          "Shipping texts from a two-way number let customers reply with questions, and answering in the same thread is faster than email. Route replies to your support team and set an auto-reply for after-hours messages.",
        ],
      },
    ],
    keyTakeaways: [
      "Text at confirmation, shipment, delivery day and delivery.",
      "Alert customers proactively about delays.",
      "Keep marketing out of transactional texts without consent.",
      "Use a two-way number so customers can reply.",
    ],
    faq: [
      { question: "Do I need consent for shipping texts?", answer: "Customers should request text updates, for example by opting in at checkout. Marketing texts need separate consent." },
      { question: "How many shipping texts is too many?", answer: "Three or four per order is usually welcome. More than that starts to feel noisy." },
    ],
    relatedSlugs: ["abandoned-cart-text-messages", "texting-customers-about-delays-and-changes", "back-in-stock-alert-texts"],
    relatedPages: [{ href: "/bulk-sms-software", label: "Bulk SMS software" }],
  },
  {
    slug: "back-in-stock-alert-texts",
    metaTitle: "Back-in-Stock Text Alerts: Turn Sold-Out Items Into Sales | Text2Sale",
    title: "Back-in-stock text alerts: turning sold-out items into sales",
    description: "How to collect back-in-stock text sign-ups, write alerts that convert, and avoid the mistakes that waste high-intent subscribers.",
    excerpt: "Someone who asks to be told when an item returns is about as ready to buy as a customer can be. Text is the fastest way to tell them.",
    tags: ["Ecommerce", "SMS marketing", "Campaigns"],
    intro: [
      "A sold-out product page is a lost sale unless you give visitors a way to come back. A back-in-stock text alert captures that intent and brings the customer back the moment the item returns.",
      "Because the subscriber asked for exactly this message, these alerts tend to perform very well.",
    ],
    sections: [
      {
        heading: "Collecting sign-ups",
        paragraphs: [
          "Add a Text me when it's back option on sold-out product pages. Collect the phone number with clear consent wording that explains the alert, and ask separately whether they also want marketing texts. Store which product and variant they wanted.",
        ],
      },
      {
        heading: "Writing the alert",
        paragraphs: [
          "Name the exact product, size or color, link straight to it, and mention if stock is limited without exaggerating. Send it as soon as inventory is live, because the first hours usually matter most.",
        ],
        bullets: [
          "Good news, Sara! The Linen Shirt in medium is back in stock: [link]",
          "It's back: the cast iron skillet you asked about. Quantities are limited this restock: [link]",
        ],
      },
      {
        heading: "Avoid wasting the list",
        paragraphs: [
          "Only alert people about the item they asked for, not everything that restocks. Send one alert per restock, then remove them from that product's list. If someone signed up only for the alert, do not add them to general marketing without their consent.",
        ],
      },
    ],
    keyTakeaways: [
      "Back-in-stock sign-ups capture high buying intent.",
      "Record the exact product and variant requested.",
      "Send the alert as soon as stock is live.",
      "Alert only for the requested item, once.",
    ],
    faq: [
      { question: "Should back-in-stock alerts include a discount?", answer: "Usually not needed. The customer already wants the item; availability is the offer." },
      { question: "What if the item sells out again quickly?", answer: "Be honest in the alert about limited quantities, and keep the sign-up open for the next restock." },
    ],
    relatedSlugs: ["order-and-shipping-update-texts", "abandoned-cart-text-messages", "sms-list-segmentation"],
    relatedPages: [{ href: "/bulk-sms-software", label: "Bulk SMS software" }],
  },
  {
    slug: "flash-sale-text-message-examples",
    metaTitle: "Flash Sale Text Message Examples That Don't Feel Spammy | Text2Sale",
    title: "Flash sale text message examples that don't feel spammy",
    description: "How to announce a flash sale by text without triggering spam filters or opt-outs, with example messages and timing tips.",
    excerpt: "Flash sales are built for text because timing matters. The trick is creating urgency without sounding like spam.",
    tags: ["SMS marketing", "Copywriting", "Campaigns"],
    intro: [
      "A short sale with a clear end time is one of the most effective reasons to text customers. The message is timely, useful and easy to act on.",
      "It is also easy to overdo. Shouting, too many exclamation points and fake urgency push people to opt out and push carriers to filter you.",
    ],
    sections: [
      {
        heading: "Examples that work",
        paragraphs: [
          "Name your business, state the offer plainly, give the real end time and link to the sale.",
        ],
        bullets: [
          "Hi Ana, it's Bloom Boutique. Today only, 20% off all dresses until 8 pm: [link]",
          "Northside Pizza: half-price large pies this Tuesday, 4 to 7 pm. Show this text at pickup.",
          "Members only: 15% off restock items this weekend at Trail Gear. Shop here: [link] Reply STOP to opt out.",
        ],
      },
      {
        heading: "Create urgency honestly",
        paragraphs: [
          "Real deadlines are persuasive on their own. Avoid ALL CAPS, words like URGENT or LAST CHANCE, and countdowns that reset. These patterns resemble spam and draw complaints. A specific end time, such as until 8 pm tonight, does the job.",
        ],
      },
      {
        heading: "Timing and frequency",
        paragraphs: [
          "Send when customers can act, such as late morning for a same-day sale. Limit flash sales so they stay special; a weekly flash sale stops feeling like one. Send to the segment most likely to care rather than your whole list.",
        ],
      },
    ],
    keyTakeaways: [
      "State the offer, the real deadline and one link.",
      "Use real deadlines, not spammy urgency words.",
      "Send when people can act on it.",
      "Keep flash sales occasional and targeted.",
    ],
    faq: [
      { question: "Should I send a reminder before the sale ends?", answer: "One reminder to people who haven't clicked can work, but don't message the whole list twice." },
      { question: "Can I use emojis in sale texts?", answer: "Sparingly. One relevant emoji is fine; several can make the text look spammy and use more characters." },
    ],
    relatedSlugs: ["holiday-sms-marketing-campaigns", "spam-filter-triggers-in-business-texts", "emoji-and-tone-in-business-texts"],
    relatedPages: [{ href: "/bulk-sms-software", label: "Bulk SMS software" }],
  },
  {
    slug: "sms-marketing-for-shopify-stores",
    metaTitle: "SMS Marketing for Shopify Stores: A Practical Setup Guide | Text2Sale",
    title: "SMS marketing for Shopify stores: a practical setup guide",
    description: "How Shopify store owners can start SMS marketing: collecting consent at checkout, the first automations to turn on, and campaigns that drive repeat sales.",
    excerpt: "Shopify stores can add text marketing in an afternoon. Here is the order to do it in so you get results without complaints.",
    tags: ["Ecommerce", "SMS marketing", "Getting started"],
    intro: [
      "Text messages are one of the most direct ways for an online store to reach customers. For Shopify merchants, the pieces are mostly already in place: phone numbers at checkout, order events and customer tags.",
      "The work is setting it up in the right order.",
    ],
    sections: [
      {
        heading: "Collect consent first",
        paragraphs: [
          "Enable SMS marketing consent at checkout and add a sign-up option on your site, such as a pop-up or footer form. Use clear consent wording that names your store, mentions marketing texts and explains how to opt out. Without consent, a phone number on an order is for order updates only.",
        ],
      },
      {
        heading: "Turn on the core automations",
        paragraphs: [
          "Start with messages that are useful to the customer: a welcome text for new subscribers, an abandoned checkout reminder, order and shipping updates, and a post-purchase thank-you or review request. These run in the background and usually produce most of the revenue from texting.",
        ],
        bullets: [
          "Welcome message with what to expect.",
          "Abandoned checkout reminder within a few hours.",
          "Shipping and delivery updates.",
          "Post-purchase thank-you and review request.",
        ],
      },
      {
        heading: "Then run campaigns",
        paragraphs: [
          "Once automations are working, send occasional campaigns: new arrivals, restocks and sales. Segment by purchase history so customers hear about products they are likely to want, and keep frequency modest so the list stays healthy.",
        ],
      },
    ],
    keyTakeaways: [
      "Collect clear SMS consent at checkout and on site.",
      "Turn on welcome, abandoned checkout and shipping texts first.",
      "Add campaigns once automations run smoothly.",
      "Segment by purchase history and keep frequency modest.",
    ],
    faq: [
      { question: "Can I text every customer who gave a phone number at checkout?", answer: "Only about their order, unless they also opted in to marketing texts." },
      { question: "How often should a store send marketing texts?", answer: "Many stores do well with two to four campaigns a month, plus automations." },
    ],
    relatedSlugs: ["abandoned-cart-text-messages", "order-and-shipping-update-texts", "grow-sms-list-with-website-popups"],
    relatedPages: [{ href: "/bulk-sms-software", label: "Bulk SMS software" }],
  },
];

export const BLOG_POSTS_8: BlogPost[] = ARTICLES.map((article) => {
  const text = [article.title, ...article.intro,
    ...article.sections.flatMap((section) => [section.heading, ...section.paragraphs, ...(section.bullets || [])]),
    ...article.keyTakeaways, ...article.faq.flatMap((item) => [item.question, item.answer])].join(" ");
  return { ...article, datePublished: "2026-10-13", dateModified: "2026-10-13",
    readMinutes: Math.max(1, Math.ceil(text.split(/\s+/).length / 200)) };
});
