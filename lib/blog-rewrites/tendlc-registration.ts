import type { BlogPost } from "../blog-posts";

export const TENDLC_REGISTRATION: BlogPost = {
  slug: "10dlc-registration-guide-for-agents",
  metaTitle: "10DLC Registration Guide: Requirements, Steps & Rejection Fixes | Text2Sale",
  title: "10DLC registration: the complete guide for agents and small sales teams",
  description:
    "What 10DLC registration is, what you need before you apply, how brand and campaign review works, why campaigns get rejected and how to get approved the first time.",
  excerpt:
    "If your business texts are blocked or filtered, unregistered 10DLC is the usual cause. Here is what to prepare, how review works and how to avoid the common rejections.",
  datePublished: "2026-05-19",
  dateModified: "2026-11-17",
  readMinutes: 13,
  tags: ["10DLC", "Compliance", "Deliverability"],
  intro: [
    "If you send business text messages in the United States from an ordinary ten-digit phone number, the mobile carriers expect you to be registered. The system is called 10DLC, and it is the reason a campaign that worked from a personal phone gets blocked the moment you try to send it at volume from software.",
    "Registration is not difficult, but it is unforgiving of vague answers. Most rejections come from the same handful of mistakes: a website that does not match the business, a consent description nobody could verify, or sample messages that do not look like the campaign described. This guide walks through what 10DLC is, what to prepare before you apply, how each stage of review works and how to fix a rejection.",
    "It is written for insurance agents, independent sales reps and small teams who need to text leads and do not have a compliance department. It is practical guidance, not legal advice.",
  ],
  sections: [
    {
      heading: "What 10DLC actually is",
      paragraphs: [
        "10DLC stands for ten-digit long code. A long code is a normal local phone number, the kind with an area code. For years those numbers were meant for person-to-person texting, and businesses that wanted to send messages in bulk were supposed to lease a five or six digit short code. In practice many businesses sent bulk traffic over local numbers anyway, and consumers received a growing amount of spam.",
        "The carriers responded by creating a sanctioned way to send business traffic over local numbers. The industry term for business traffic is A2P, or application-to-person: any message sent from software rather than typed by a person on a handset. If you send from a CRM, a texting platform or an API, your traffic is A2P no matter how personal each message reads.",
        "Under 10DLC, every business that sends A2P messages over local numbers identifies itself and describes what it is sending. That information is held by The Campaign Registry, an industry body that the major US carriers rely on. Carriers then decide how much traffic to allow from each sender and how closely to filter it.",
      ],
    },
    {
      heading: "What happens if you do not register",
      paragraphs: [
        "Unregistered traffic is not treated as a lower tier of service. It is treated as traffic that should not be there. Carriers block messages from unregistered local numbers, and the messages that do get through are filtered heavily and can attract pass-through penalties to your provider.",
        "The practical symptoms are familiar to anyone who has tried: messages show as sent in your software and never arrive, delivery is fine to one carrier and fails on another, or a campaign works for a day and then stops. None of that is a bug in your software. It is the network doing what it was designed to do.",
        "This is also why reputable texting platforms will not let you send campaigns until registration is approved. A provider that lets unregistered traffic through is putting its own carrier relationships at risk, and a provider willing to take that risk is not one you want holding your phone numbers.",
      ],
    },
    {
      heading: "The two things you register: a brand and a campaign",
      paragraphs: [
        "Registration has two parts, and they answer two different questions. The brand answers who you are. The campaign answers what you are sending and why people agreed to receive it.",
        "A brand is your business as a legal entity. It is registered once. A campaign is a specific use of texting by that brand, and you can have more than one. An insurance agency might have one campaign for following up on quote requests and another for appointment reminders to existing clients. Each phone number you send from is attached to a campaign, and that link is what tells the carrier a given message is registered traffic.",
        "You do not deal with The Campaign Registry directly. Your texting provider submits on your behalf, and in many cases the provider or its upstream carrier performs its own review before the campaign reaches the mobile networks. That is why two businesses with similar applications can have different experiences on different platforms.",
      ],
    },
    {
      heading: "What to gather before you start",
      paragraphs: [
        "Most delays happen because an applicant starts the form and discovers halfway through that the details on file with the IRS do not match what they typed. Collect everything first and the form takes minutes.",
        "The single most important rule is that your business name, tax ID and address must match your official records exactly. If your EIN confirmation letter says “Summit Health Advisors LLC”, do not enter “Summit Health”. A mismatch is the most common reason a brand fails verification.",
      ],
      bullets: [
        "Legal business name, exactly as it appears on your IRS EIN confirmation letter (form CP 575 or 147C)",
        "EIN, and the business type: LLC, corporation, partnership or sole proprietor",
        "Business address and a phone number and email where you can be reached",
        "A working website on a domain you control, showing the business name and what you do",
        "A privacy policy on that website that covers text messaging",
        "A clear description of how people give you permission to text them, with a link or screenshot if you have one",
        "Two to five sample messages that look like what you will really send",
      ],
    },
    {
      heading: "Registering as a sole proprietor",
      paragraphs: [
        "Many independent agents operate under their own name and Social Security number without an EIN. 10DLC has a sole proprietor path for this situation. It verifies you with a one-time code sent to your mobile phone instead of matching an EIN.",
        "The trade-off is capacity. Sole proprietor registrations are limited to a single campaign and a single phone number, with low daily message limits. That is enough for one person texting their own leads and not enough for a team or for high-volume outreach.",
        "If you plan to grow, getting an EIN is worth the few minutes it takes. It is free from the IRS, it does not require forming an LLC, and it moves you onto the standard registration path with more room. If you already have an EIN, use the standard path: registering as a sole proprietor when you have an EIN is itself a reason for rejection.",
      ],
    },
    {
      heading: "Choosing a campaign use case",
      paragraphs: [
        "When you create a campaign you pick a use case that describes the purpose of the messages. Carriers use it to decide how to treat the traffic, so the choice should describe what you will really send rather than what sounds safest.",
        "Common standard use cases include marketing, customer care, account notifications and delivery notifications. There is also a mixed use case for senders whose messages cover more than one purpose, and a low-volume mixed option intended for small senders. An agent following up on quote requests and promoting plans is sending marketing. An agency that only sends appointment reminders to existing clients is closer to account notifications or customer care.",
        "Do not choose a narrow use case and then send something else. Carriers monitor live traffic against the registered description, and a campaign registered for appointment reminders that starts sending promotions can be suspended. If you do both, register for both or choose the mixed use case.",
      ],
    },
    {
      heading: "Describing consent: the part most applications get wrong",
      paragraphs: [
        "Every campaign asks how recipients opted in. Reviewers call this the call to action or message flow. They are checking one thing: could a reasonable person tell, at the moment they gave their number, that they were agreeing to receive texts from your business?",
        "A good description is specific and checkable. It names where the consent happens, quotes or paraphrases the disclosure shown, and says what the person does to agree. For example: visitors request a quote through the form at a named web address; below the phone field is an unticked checkbox reading that they agree to receive text messages from the named agency about their quote, that message and data rates may apply, that frequency varies and that they can reply STOP to opt out.",
        "A weak description says something like “customers opt in on our website”. A reviewer cannot verify that, so they reject it. If consent is collected on paper or verbally, describe the script or the form wording and be ready to supply a copy.",
        "Agents who buy leads should read this part carefully. Carriers and the CTIA messaging principles treat consent as given to a specific business, not as something that can be sold along with a lead. If your leads come from a third-party form, you need to be able to show that the consumer agreed to be contacted by you, and reviewers look harder at these campaigns. Ask your lead vendor for the exact consent language and a sample of the form before you apply.",
      ],
    },
    {
      heading: "Writing sample messages that pass review",
      paragraphs: [
        "Sample messages show the reviewer what your traffic will look like. They should be real examples, not a tidied-up version written for the application.",
        "Three things matter. The business must be identified, so the recipient knows who is texting. The content must match the use case you selected. And at least one sample should show opt-out wording, because the first message to a new contact is expected to include it.",
        "If your messages will contain links or phone numbers, say so in the campaign settings and include one in a sample. Use your own domain for links. Public link shorteners are a red flag because spammers use them to hide destinations, and many carriers block them outright.",
      ],
      bullets: [
        "Good: “Hi Maria, this is Dana with Summit Health Advisors following up on the quote you requested. Do you have five minutes today? Reply STOP to opt out.”",
        "Weak: “Hey, are you still interested?” because there is no business name and no way to tell what it is about",
        "Weak: “LAST CHANCE!!! Rates are going up, click here” because of the pressure language, capitals and unnamed link",
      ],
    },
    {
      heading: "Your website and privacy policy",
      paragraphs: [
        "Reviewers visit your website. They are confirming that the business exists, that it does what the application says and that it treats phone numbers properly. A site that is under construction, behind a login or about a different business will sink an otherwise sound application.",
        "The privacy policy is checked for how you handle mobile information. The expectation is a plain statement that you do not share or sell phone numbers and text messaging consent to third parties for their marketing. If your policy says you may share personal information with marketing partners and makes no exception for mobile numbers, expect a rejection.",
        "It also helps to have a short text messaging section on your terms page that names the program, says message frequency varies, notes that message and data rates may apply, and explains that people can reply STOP to opt out or HELP for help. If you do not have a website at all, build a simple one before applying. A social media page is usually not accepted as a substitute.",
      ],
    },
    {
      heading: "How review works and how long it takes",
      paragraphs: [
        "Brand verification is mostly automated. Your details are checked against business records, and a result often comes back within minutes, though some brands take longer. If verification fails, correct the mismatch and resubmit rather than opening a new application with the same details.",
        "Campaign review involves people. Your provider or its carrier partner reads the description, the consent flow and the samples, and visits your website. Timelines vary with demand across the industry. At Text2Sale we estimate an average of about four business days for approval, and carrier review times do vary beyond that.",
        "Once the campaign is approved, your phone numbers are linked to it. That linking can take additional time to reach every carrier, which is why a platform may show a campaign as approved shortly before messages begin delivering everywhere.",
      ],
    },
    {
      heading: "Why campaigns get rejected, and how to fix each one",
      paragraphs: [
        "A rejection usually comes with a short reason. They tend to fall into a small number of groups, and nearly all are fixable in one resubmission if you address the actual cause.",
      ],
      bullets: [
        "Business details do not match records: re-enter the legal name, EIN and address exactly as on your IRS letter",
        "Website missing, unreachable or unrelated: publish a live site on your own domain that names the business and its services",
        "Privacy policy missing or allows sharing of mobile data: add a statement that mobile numbers and consent are not shared with third parties for marketing",
        "Consent flow unclear: describe the exact place, wording and action by which people opt in, and attach a link or screenshot",
        "Sample messages do not match the use case or lack the brand name: rewrite the samples as real examples that name the business",
        "No opt-out wording: include “Reply STOP to opt out” in a sample and confirm STOP and HELP are supported",
        "Restricted content: some categories are limited or barred from 10DLC entirely, so check before applying",
      ],
    },
    {
      heading: "Content the carriers restrict",
      paragraphs: [
        "Carriers bar or restrict certain content regardless of consent. The shorthand you will see is SHAFT: sex, hate, alcohol, firearms and tobacco. Cannabis and other federally illegal substances are barred, and gambling and some financial offers are tightly restricted.",
        "Insurance, real estate, mortgage and solar are permitted, but a few practices around them draw scrutiny. Messages that read as affiliate marketing or lead generation for other companies are commonly rejected, as are debt relief and some loan offers. If your business sits near one of these lines, describe what you do plainly and expect questions.",
        "Whatever your industry, avoid the habits that trip spam filters after approval: all capitals, repeated punctuation, urgent threats, and messages with no clear sender.",
      ],
    },
    {
      heading: "Throughput: how much you can send once approved",
      paragraphs: [
        "Approval does not mean unlimited sending. Each carrier sets limits based on the campaign type and, in some cases, a trust assessment of the brand. One major carrier applies limits per minute for each campaign, while another applies a daily cap across all of a brand’s campaigns.",
        "For most agents and small teams the standard limits are more than enough. If you plan to send to very large lists, ask your provider what tier your brand received. Larger brands can go through additional vetting to qualify for higher limits.",
        "When you exceed a limit, messages are queued or rejected rather than delivered late without warning. A campaign that sends steadily within its limits delivers better than one that tries to push a week of messages through in an hour.",
      ],
    },
    {
      heading: "After approval: staying in good standing",
      paragraphs: [
        "Registration is the start. Carriers watch live traffic, and a campaign with rising opt-outs or spam complaints can be throttled or suspended even though it was approved.",
        "Send what you registered. Honor every opt-out immediately and never text that person again unless they opt back in. Keep the consent records for each contact. And if your business changes, such as a new legal name, a new website or a new kind of message, update the registration rather than hoping nobody notices.",
        "It is also worth keeping your first message consistent with your samples. That first message is where recipients decide whether a text is welcome, and it is the one carriers look at most closely.",
      ],
    },
    {
      heading: "10DLC versus toll-free numbers and short codes",
      paragraphs: [
        "10DLC is one of three ways to send business texts. Toll-free numbers, the 800-series numbers, have their own verification process and are a reasonable alternative for some businesses, though they lack a local area code. Short codes are the five or six digit numbers used by large brands; they support very high volume and take longer and cost more to obtain.",
        "For an agent or a small team following up on leads, a local number is usually the right choice. People are more likely to answer a text and a call from a familiar area code, and the same number can be used for both.",
      ],
    },
    {
      heading: "How registration works in Text2Sale",
      paragraphs: [
        "Text2Sale handles registration inside the dashboard. You enter your business details and campaign information in one place, and you can track the review status without emailing support. Text2Sale covers the registration and campaign fees.",
        "While you wait, you can upload contacts, write your first campaign, connect Google Calendar and set instructions for the AI assistant, so you are ready to send the day approval arrives. If you also call your leads, the Dialer plan does not require texting registration, so calling can begin right away.",
      ],
    },
  ],
  keyTakeaways: [
    "10DLC registration is required for business texting from local US numbers; unregistered traffic is blocked or heavily filtered.",
    "You register a brand, which is who you are, and one or more campaigns, which describe what you send and how people agreed to it.",
    "Your legal name, EIN and address must match IRS records exactly.",
    "The consent description is the most common failure: be specific about where, how and with what wording people opt in.",
    "Your website and privacy policy are reviewed, and the policy should say mobile information is not shared for third-party marketing.",
    "Approval is not the end: send what you registered, honor opt-outs and keep consent records.",
  ],
  faq: [
    { question: "Do I need 10DLC registration to text my own leads?", answer: "Yes, if you send from software using a local US number. The requirement depends on how the message is sent, not on how many you send or how personal they are. Texts typed by hand on your own phone are person-to-person and are not covered." },
    { question: "How long does 10DLC registration take?", answer: "Brand verification is often quick, sometimes minutes. Campaign review involves people and takes longer. Text2Sale estimates an average of about four business days, and carrier review times vary." },
    { question: "Can I register without an EIN?", answer: "Yes, through the sole proprietor path, which verifies you by a code sent to your mobile phone. It is limited to one campaign and one number with low daily volume. If you have an EIN you should use the standard path." },
    { question: "Why was my 10DLC campaign rejected?", answer: "The usual causes are business details that do not match IRS records, a missing or unrelated website, a privacy policy that allows sharing mobile data, an unclear consent description, or sample messages that do not name the business or match the use case." },
    { question: "Do I have to register again if I change providers?", answer: "Your brand can usually be reused, but campaigns and phone numbers are tied to the provider that submitted them. Expect to create the campaign again with the new provider and plan for review time before switching your sending over." },
    { question: "Is 10DLC registration the same as TCPA compliance?", answer: "No. 10DLC is a carrier requirement about identifying senders. The TCPA is federal law about consent and calling practices. You need to satisfy both, and being registered does not by itself make a message lawful." },
  ],
  relatedSlugs: ["tcpa-compliance-texting-leads", "how-long-does-10dlc-approval-take", "10dlc-campaign-rejection-reasons", "sole-proprietor-10dlc-registration", "how-much-does-10dlc-registration-cost"],
  relatedPages: [
    { href: "/10dlc-compliant-texting", label: "10DLC compliant texting" },
    { href: "/10dlc-readiness-checklist", label: "10DLC readiness checklist" },
    { href: "/bulk-sms-software", label: "Bulk SMS software" },
  ],
  sources: [
    { href: "https://www.campaignregistry.com/", label: "The Campaign Registry" },
    { href: "https://www.ctia.org/the-wireless-industry/industry-commitments/messaging-interoperability-sms-mms", label: "CTIA: Messaging Principles and Best Practices" },
    { href: "https://support.telnyx.com/en/articles/7127078-10dlc-campaign-approval-best-practices", label: "Telnyx: 10DLC campaign approval best practices" },
  ],
};
