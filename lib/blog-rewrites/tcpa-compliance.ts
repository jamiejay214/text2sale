import type { BlogPost } from "../blog-posts";

export const TCPA_COMPLIANCE: BlogPost = {
  slug: "tcpa-compliance-texting-leads",
  metaTitle: "TCPA Compliance for Texting Leads: Rules, Consent & Penalties | Text2Sale",
  title: "TCPA compliance for texting leads: consent, quiet hours, opt-outs and penalties",
  description:
    "A practical guide to the TCPA for anyone who texts sales leads: what consent you need, the Do Not Call rules, quiet hours, opt-out deadlines, state laws, penalties and the records to keep.",
  excerpt:
    "Texting leads works, and it is regulated. Here is a plain-English guide to consent, Do Not Call rules, quiet hours, opt-outs and the records that protect you.",
  datePublished: "2026-06-02",
  dateModified: "2026-11-17",
  readMinutes: 13,
  tags: ["TCPA", "Compliance", "SMS"],
  intro: [
    "The Telephone Consumer Protection Act is the main federal law governing how businesses call and text consumers in the United States. It was written in 1991 for telemarketing calls and fax machines, and regulators and courts have long treated a text message as a call for its purposes. If you text sales leads, it applies to you.",
    "The law matters because of how it is enforced. Consumers can sue directly, damages are counted per message, and class actions are common. A habit that seems harmless on one lead becomes expensive when it is repeated across a list of ten thousand.",
    "This guide explains the rules that affect lead follow-up by text: consent, the Do Not Call Registry, quiet hours, identification, opt-outs, state laws and record keeping. It is general information for sales professionals, not legal advice. For decisions about your own program, talk to an attorney who handles TCPA matters.",
  ],
  sections: [
    {
      heading: "Where the rules come from",
      paragraphs: [
        "Three layers apply to a marketing text. The first is the statute itself, at 47 U.S.C. § 227. The second is the Federal Communications Commission’s implementing rule, 47 CFR 64.1200, which fills in the practical detail on consent, calling hours, identification and Do Not Call lists. The third is state law: a growing number of states have their own telemarketing statutes, some stricter than the federal rule.",
        "Alongside the law sit the carrier requirements, including 10DLC registration and the CTIA messaging principles. Those are industry rules rather than statutes, but carriers enforce them by blocking traffic, so in practice you have to satisfy both.",
        "It helps to keep the two apart in your head. The TCPA decides whether you are allowed to send a message and what a consumer can do if you should not have. Carrier rules decide whether the message is delivered.",
      ],
    },
    {
      heading: "Does the TCPA apply to texts you send from software?",
      paragraphs: [
        "The statute restricts calls made with an automatic telephone dialing system, usually shortened to autodialer. For years it was unclear whether ordinary texting platforms counted. In 2021 the Supreme Court decided Facebook v. Duguid and read the definition narrowly: an autodialer is equipment that uses a random or sequential number generator to store or produce numbers.",
        "Many texting platforms that send to a list you uploaded do not obviously fit that definition, and some businesses concluded the TCPA no longer mattered for texting. That is a risky reading for three reasons.",
        "First, the Do Not Call rules do not depend on an autodialer at all. They apply to telephone solicitations however they are sent, and the FCC has confirmed that those protections cover text messages. Second, plaintiffs still file autodialer claims and the cost of defending one is real. Third, several state laws define automated systems more broadly than the federal statute does. The safe working assumption is that marketing texts to leads require consent and are subject to the Do Not Call rules.",
      ],
    },
    {
      heading: "The consent standards, and which one you need",
      paragraphs: [
        "The FCC rule uses two levels of consent. Prior express consent covers informational messages, such as an appointment reminder or a delivery notice to someone who gave you their number for that purpose. Prior express written consent is the higher standard and applies to telemarketing: messages that advertise or encourage the purchase of goods or services.",
        "Lead follow-up is marketing. A text to someone about a quote, a plan or a consultation is intended to sell something, so plan on needing prior express written consent.",
        "Written does not have to mean ink on paper. An electronic agreement that satisfies the E-SIGN Act counts, including a checkbox on a web form or a keyword texted to a number, provided the disclosure was shown clearly and you can prove what the person saw and did.",
      ],
    },
    {
      heading: "What a valid written consent contains",
      paragraphs: [
        "A written consent has to be an agreement between the consumer and a specific seller, shown clearly enough that the person understood what they were agreeing to. The disclosure should not be hidden in terms and conditions several clicks away.",
        "In practice the wording sits right beside the phone number field, and the person takes an affirmative step to accept it. A pre-ticked box is not an affirmative step.",
      ],
      bullets: [
        "It names the business that will send the messages",
        "It says the person agrees to receive marketing texts, including those sent using automated technology",
        "It identifies the phone number that is being authorized",
        "It states that agreeing is not a condition of buying anything",
        "It is signed, which online usually means ticking an unticked box or submitting a form directly below the disclosure",
        "Good practice adds that message and data rates may apply, that frequency varies, and how to opt out",
      ],
    },
    {
      heading: "Purchased and shared leads",
      paragraphs: [
        "Purchased leads are where most agents get into trouble, because the consent was collected by someone else. The question is always whether the consumer agreed to be contacted by you.",
        "In December 2023 the FCC adopted a rule that would have required consent to name one seller at a time, often called the one-to-one consent rule. A federal appeals court vacated that rule in January 2025, before it took effect, so it is not currently in force. That does not make shared consent safe. The existing standard still requires that the consumer agreed to receive messages from the seller sending them, and carriers apply their own, stricter view that consent cannot be transferred from the business that collected it.",
        "Before texting a purchased lead, get three things from the vendor: the exact disclosure the consumer saw, evidence that your business was named or clearly covered, and a record of the date, time and source of the consent for each lead. If the vendor cannot provide them, treat the lead as one you may call within the rules but should not text.",
      ],
    },
    {
      heading: "The National Do Not Call Registry",
      paragraphs: [
        "The National Do Not Call Registry lets consumers register their numbers to stop telephone solicitations. The rules apply to texts as well as voice calls. Sending a solicitation to a registered number is a violation unless an exception applies.",
        "Two exceptions matter for lead follow-up. The first is the consumer’s prior express invitation or permission, which must be in a signed written agreement stating that they agree to be contacted and the number to be used. Valid written consent of the kind described above serves this purpose.",
        "The second is an established business relationship. It exists for 18 months after a consumer’s last purchase or transaction with you, and for three months after an inquiry or application. So a person who asks you for a quote can be contacted for three months on the basis of that inquiry even if their number is on the registry, unless they ask you to stop.",
        "Businesses that make solicitations are expected to register with the registry, download the numbers for the area codes they contact, and scrub their lists at least every 31 days. Relying on a lead vendor’s assurance that a list was scrubbed is not the same as doing it.",
      ],
    },
    {
      heading: "Your own do-not-call list",
      paragraphs: [
        "Separately from the national registry, every business must keep an internal list of people who have asked not to be contacted, and honor it. A request made to one rep applies to the whole company.",
        "You need a written policy for maintaining that list, training for anyone who contacts consumers, and a process that records each request. Requests must be honored within a reasonable time, and the request stays in effect for five years.",
        "This is one of the strongest practical arguments for sending from a shared system rather than personal phones. When opt-outs live on individual handsets, nobody can guarantee the next rep will not text the same person.",
      ],
    },
    {
      heading: "Quiet hours",
      paragraphs: [
        "Telephone solicitations may not be made before 8 a.m. or after 9 p.m. in the local time of the person being contacted. The recipient’s location controls, not yours.",
        "That is harder than it sounds, because an area code does not reliably tell you where someone lives. People keep their numbers when they move. A conservative approach is to use the lead’s stated address or state where you have one, and to send inside a narrower window, such as 9 a.m. to 8 p.m., that is safe across time zones.",
        "Several states set tighter hours than the federal rule, and some restrict Sundays or holidays. If you text nationally, your sending window should follow the strictest rule that applies to the recipient.",
      ],
    },
    {
      heading: "Identifying yourself",
      paragraphs: [
        "A solicitation must identify the person or business on whose behalf it is sent and provide a telephone number or address where that business can be reached. For texts, the simple way to meet the spirit of this is to name yourself and your company in the first message of any conversation.",
        "This is also the single most effective thing you can do for response rates. A message from an unknown number that says only “are you still interested?” looks like spam to the recipient and to the carrier. A message that says who you are and why you are writing gets answered.",
      ],
    },
    {
      heading: "Opt-outs and the ten business day rule",
      paragraphs: [
        "Consumers can revoke consent, and the FCC has made the mechanics specific. Under rules that took effect in April 2025, a consumer may revoke consent in any reasonable manner, and a business must honor the request within a reasonable time not exceeding ten business days.",
        "For texts, a reply containing STOP, QUIT, END, REVOKE, OPT OUT, CANCEL or UNSUBSCRIBE is treated as a clear revocation. Other wording counts too if a reasonable person would understand it. “Please stop texting me” and “take me off your list” are revocations even though they contain no keyword.",
        "You may send one confirmation message after an opt-out, and it must not contain marketing. After that, do not text the person again unless they give new consent. Ten business days is a ceiling, not a target: a good system stops immediately.",
      ],
    },
    {
      heading: "State laws that go further",
      paragraphs: [
        "State telemarketing laws are now a real part of the picture. Florida’s Telephone Solicitation Act is the best known: it limits solicitations to between 8 a.m. and 8 p.m. local time and caps contacts to the same person on the same subject at three in a 24-hour period. Oklahoma, Washington, Maryland and other states have adopted laws in a similar style, each with its own details.",
        "These laws differ in their definitions of automated systems, their hours, their frequency limits and their penalties. Some provide their own private right of action.",
        "If your leads are concentrated in a few states, learn those states’ rules. If you sell nationally, the practical approach is to set your defaults to the strictest common denominator: written consent, a conservative sending window, and no more than a few messages a day to anyone who has not replied.",
      ],
    },
    {
      heading: "What a violation costs",
      paragraphs: [
        "The TCPA gives consumers a private right of action. Damages are $500 per violation, and a court may increase that to as much as $1,500 per violation where the conduct was willful or knowing. Each message can be a separate violation.",
        "The arithmetic is what makes this law dangerous. A single campaign to 5,000 people who had not consented represents a potential exposure of $2.5 million at the base figure. Cases are frequently brought as class actions, and the statute does not cap total damages. Federal and state regulators can also bring their own actions.",
        "The general federal statute of limitations is four years, which is why records need to be kept for at least that long.",
      ],
    },
    {
      heading: "The records that protect you",
      paragraphs: [
        "In a dispute the burden of proving consent is on the business. A statement that the lead opted in is not evidence. A record is.",
        "For each contact, keep the wording of the disclosure they agreed to, the date and time, the source such as the page address or form, and the phone number they provided. For web forms, a screenshot of the page as it appeared and the visitor’s IP address strengthen the record considerably.",
        "Keep your opt-out log with timestamps, your message history, your written do-not-call policy and evidence of when you last scrubbed against the national registry. Store all of it for at least four years after your last contact with the person.",
      ],
      bullets: [
        "Consent wording, timestamp, source and phone number for every contact",
        "Opt-out requests with the date received and the date honored",
        "Message history showing what was sent and when",
        "Written do-not-call policy and training records",
        "Do Not Call Registry scrub dates",
      ],
    },
    {
      heading: "A workable checklist for texting leads",
      paragraphs: [
        "None of this requires a legal team. It requires a few habits applied to every lead, enforced by your tools where possible so that compliance does not depend on memory.",
      ],
      bullets: [
        "Text only people who gave written consent that covers your business",
        "Keep the consent record attached to the contact",
        "Scrub against the National Do Not Call Registry unless an exception clearly applies",
        "Send only between 8 a.m. and 9 p.m. in the recipient’s local time, or a narrower window",
        "Name yourself and your business in the first message",
        "Include opt-out instructions in the first message",
        "Stop immediately when someone opts out, in any wording",
        "Review state rules for the places your leads live",
      ],
    },
    {
      heading: "How Text2Sale helps, and what stays with you",
      paragraphs: [
        "Text2Sale provides the tools that compliant texting depends on. STOP and HELP keywords are handled automatically, opted-out contacts are skipped on every later send, quiet-hours sending windows keep campaigns inside the hours you set, opt-in records stay with the contact, and message history is kept with each conversation. Registration for 10DLC is handled inside the dashboard.",
        "What software cannot do is collect consent for you or decide whether a particular lead may lawfully be texted. That responsibility remains with the sender. Use the tools to make the right behavior automatic, and keep your own records of where each lead’s consent came from.",
      ],
    },
  ],
  keyTakeaways: [
    "Texts are treated as calls under the TCPA, and marketing texts to leads should be treated as requiring prior express written consent.",
    "The Do Not Call rules apply to texts whether or not an autodialer is used.",
    "An inquiry creates an established business relationship for three months; a purchase creates one for 18 months.",
    "Solicitations are limited to 8 a.m. to 9 p.m. in the recipient’s local time, and some states are stricter.",
    "Opt-outs in any reasonable wording must be honored within ten business days at most; stop immediately in practice.",
    "Damages are $500 to $1,500 per message, so keep consent and opt-out records for at least four years.",
  ],
  faq: [
    { question: "Do I need written consent to text a sales lead?", answer: "For marketing texts, plan on needing prior express written consent. It can be electronic, such as an unticked checkbox beside a clear disclosure on a web form, as long as you can prove what the person saw and agreed to." },
    { question: "Can I text a lead whose number is on the Do Not Call Registry?", answer: "Only if an exception applies: the person gave signed written permission to be contacted, or you have an established business relationship, which lasts three months after an inquiry and 18 months after a transaction, and they have not asked you to stop." },
    { question: "What hours can I text leads?", answer: "Federal rules allow solicitations between 8 a.m. and 9 p.m. in the recipient’s local time. Some states are stricter; Florida, for example, ends at 8 p.m. Use the recipient’s location, not your own." },
    { question: "How fast do I have to honor an opt-out?", answer: "Within a reasonable time that does not exceed ten business days under FCC rules effective April 2025. Good systems stop at once. One confirmation text without marketing content is allowed." },
    { question: "Is the one-to-one consent rule in effect?", answer: "No. The FCC adopted it in December 2023, and a federal appeals court vacated it in January 2025 before it took effect. Consent must still cover the business that sends the messages, and carriers apply their own strict view of shared consent." },
    { question: "What are the penalties for a TCPA violation?", answer: "$500 per violation, rising to as much as $1,500 per violation for willful or knowing conduct. Each message can count separately, and cases are often brought as class actions." },
  ],
  relatedSlugs: ["10dlc-registration-guide-for-agents", "express-written-consent-for-texting", "state-mini-tcpa-laws", "quiet-hours-and-texting-time-rules", "do-not-call-registry-and-business-texting", "ai-texting-compliance"],
  relatedPages: [
    { href: "/10dlc-compliant-texting", label: "10DLC compliant texting" },
    { href: "/quiet-hours-checker", label: "Quiet hours checker" },
    { href: "/how-to-text-insurance-leads", label: "How to text insurance leads" },
  ],
  sources: [
    { href: "https://www.law.cornell.edu/uscode/text/47/227", label: "47 U.S.C. § 227, Telephone Consumer Protection Act" },
    { href: "https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-64/subpart-L/section-64.1200", label: "FCC rule 47 CFR 64.1200" },
    { href: "https://telemarketing.donotcall.gov/", label: "National Do Not Call Registry for telemarketers" },
    { href: "https://www.ctia.org/the-wireless-industry/industry-commitments/messaging-interoperability-sms-mms", label: "CTIA: Messaging Principles and Best Practices" },
  ],
};
