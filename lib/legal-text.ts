// ────────────────────────────────────────────────────────────────────────────
// Legal text — single source of truth for the Privacy Policy and Terms &
// Conditions shown in the on-page modals AND the standalone /terms and
// /privacy-policy pages. Keeping them in one file means a lawyer can edit
// language in one place and every surface updates.
//
// NOTE: These are templates. They are written to be strong on liability,
// indemnification, and user-responsibility — but Text2Sale should have
// these reviewed by a licensed attorney in its governing jurisdiction
// before production use.
// ────────────────────────────────────────────────────────────────────────────

export const LEGAL_EFFECTIVE_DATE = "April 18, 2026";
export const LEGAL_COMPANY = "Text2Sale";
export const LEGAL_WEBSITE = "www.text2sale.com";
export const LEGAL_SUPPORT_EMAIL = "support@text2sale.com";
export const LEGAL_GOVERNING_LAW = "State of Florida, United States";

export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

// ═══════════════════════════════════════════════════════════════════════════
// TERMS AND CONDITIONS
// ═══════════════════════════════════════════════════════════════════════════
export const LEGAL_TERMS_SECTIONS: LegalSection[] = [
  {
    heading: "Agreement to Terms",
    paragraphs: [
      `These Terms and Conditions ("Terms", "Agreement") constitute a legally binding contract between you ("User", "you", "your") and ${LEGAL_COMPANY} ("Company", "we", "us", "our") governing your access to and use of the ${LEGAL_COMPANY} platform, websites, APIs, mobile applications, and all related services (collectively, the "Service").`,
      `BY ACCESSING, REGISTERING FOR, OR USING THE SERVICE IN ANY WAY, YOU REPRESENT THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS IN THEIR ENTIRETY. IF YOU DO NOT AGREE TO THESE TERMS, YOU MUST NOT ACCESS OR USE THE SERVICE.`,
      `These Terms include, and you expressly agree to, the Privacy Policy, the Acceptable Use Policy, and any other supplemental terms or policies referenced herein, each of which is incorporated by reference.`,
    ],
  },
  {
    heading: "Eligibility and Account",
    paragraphs: [
      `You must be at least eighteen (18) years of age and a resident of a jurisdiction in which use of the Service is lawful to register for or use the Service. By creating an account, you represent and warrant that (a) you meet these eligibility requirements, (b) all information you provide is true, accurate, current, and complete, and (c) you have the legal authority to enter into this Agreement on behalf of yourself and any business entity you represent.`,
      `You are responsible for safeguarding your account credentials and for all activities that occur under your account, whether or not authorized by you. You agree to notify us immediately of any unauthorized access or use. We are not liable for any loss or damage arising from your failure to protect your credentials.`,
    ],
  },
  {
    heading: "Nature of the Service — Platform Only",
    paragraphs: [
      `The Service is a technology platform that enables Users to upload contact lists, compose messages, create campaigns, and transmit SMS, MMS, and related communications through third-party telecommunications carriers and aggregators. ${LEGAL_COMPANY} does not author, endorse, review, approve, curate, screen, monitor, or control the content, recipients, timing, or legality of any message transmitted through the Service.`,
      `${LEGAL_COMPANY} is not a telecommunications carrier, law firm, marketing agency, or advisor of any kind. No information, tool, template, guide, or suggestion provided through the Service constitutes legal, regulatory, compliance, financial, tax, medical, or professional advice of any kind. You are solely responsible for determining the legality and appropriateness of your use of the Service and for obtaining your own legal counsel.`,
    ],
  },
  {
    heading: "User Responsibilities and Acceptable Use",
    paragraphs: [
      `YOU ARE SOLELY, FULLY, AND EXCLUSIVELY RESPONSIBLE FOR ALL ACTIVITY CONDUCTED THROUGH THE SERVICE UNDER YOUR ACCOUNT, INCLUDING BUT NOT LIMITED TO: (a) the content of every message you send; (b) the identity, consent status, and eligibility of every recipient; (c) compliance with every applicable law, regulation, rule, industry guideline, and carrier policy; and (d) all consequences arising from your messaging activity.`,
      `You represent, warrant, and covenant that you will comply at all times with every law and regulation applicable to your messaging activity, including but not limited to: the Telephone Consumer Protection Act (TCPA, 47 U.S.C. § 227) and its implementing regulations; the CAN-SPAM Act; the Florida Telemarketing Act and any other applicable state telemarketing or "mini-TCPA" statute; CTIA Messaging Principles and Best Practices; Mobile Marketing Association (MMA) guidelines; applicable provisions of the California Consumer Privacy Act (CCPA/CPRA), Virginia Consumer Data Protection Act (VCDPA), and every other applicable federal, state, provincial, territorial, and international privacy, consumer protection, do-not-call, and anti-spam law; and all rules and policies of carriers, aggregators, and registries (including A2P 10DLC, Short Code registries, and toll-free messaging).`,
      `You represent and warrant that you have obtained prior express written consent (as defined by applicable law) from every recipient of every message sent through the Service, that you have maintained adequate records of such consent, and that you will produce such records immediately upon request by ${LEGAL_COMPANY}, a carrier, a regulator, or a court.`,
      `You agree not to use the Service for, and will not permit any third party to use your account for: unsolicited messages; spam; phishing; fraud; impersonation; harassment; hate speech; threats; illegal goods or services; restricted industries to the extent prohibited by carrier policy (including but not limited to SHAFT content, cannabis, CBD, firearms, gambling, payday lending, debt collection, and cryptocurrency where applicable); scraping; automated account creation; reverse engineering; or any activity that violates applicable law or third-party rights.`,
    ],
  },
  {
    heading: "Sole Responsibility — No Liability Upon the Company",
    paragraphs: [
      `YOU EXPRESSLY ACKNOWLEDGE, REPRESENT, AND AGREE THAT EVERY MESSAGE, COMMUNICATION, CAMPAIGN, UPLOAD, AND ACTION TAKEN THROUGH THE SERVICE UNDER YOUR ACCOUNT IS YOUR OWN ACT, UNDERTAKEN AT YOUR OWN DIRECTION, AT YOUR OWN RISK, AND UNDER YOUR SOLE LEGAL RESPONSIBILITY. ${LEGAL_COMPANY} IS NOT A PARTY TO, SPONSOR OF, OR PARTICIPANT IN ANY SUCH COMMUNICATION AND ASSUMES NO LIABILITY WHATSOEVER FOR IT.`,
      `You further acknowledge and agree that under no circumstances shall any liability, claim, fine, penalty, damage, judgment, settlement, regulatory action, class action, arbitration award, attorney's fee, cost, expense, loss of goodwill, loss of profit, loss of business, tax, or enforcement action of any kind — whether civil, criminal, regulatory, administrative, or otherwise, and whether arising under the TCPA, CAN-SPAM, state consumer protection statutes, tort, contract, statute, common law, or any other theory of law or equity — "fall back on" or be imposed upon ${LEGAL_COMPANY}, its parent, subsidiaries, affiliates, licensors, officers, directors, members, managers, shareholders, employees, agents, contractors, or representatives (collectively, the "Company Parties") as a result of or in connection with your use of the Service.`,
      `The allocation of liability in this Section is a material part of the consideration for ${LEGAL_COMPANY}'s agreement to provide access to the Service, and the Service would not be offered to you on any other terms.`,
    ],
  },
  {
    heading: "Indemnification",
    paragraphs: [
      `You agree to indemnify, defend (at ${LEGAL_COMPANY}'s option with counsel of ${LEGAL_COMPANY}'s choosing), and hold harmless the Company Parties from and against any and all claims, demands, actions, suits, proceedings, investigations, losses, damages, liabilities, judgments, settlements, fines, penalties, costs, and expenses (including reasonable attorneys' fees, expert fees, and court costs) of every kind and nature, whether known or unknown, arising from or relating to, directly or indirectly: (a) your access to or use of the Service; (b) any content, message, data, or communication transmitted through your account; (c) your violation of these Terms or any representation or warranty herein; (d) your violation of any law, regulation, rule, industry standard, or carrier policy; (e) your violation of any third-party right, including any right of privacy, publicity, or intellectual property; (f) any claim by a recipient of a message sent through your account; (g) any claim by a carrier, aggregator, registry, or regulator; and (h) any act or omission by you or any person using your account.`,
      `This indemnification obligation will survive termination of this Agreement and your use of the Service, and is in addition to, not in lieu of, any other remedies available to the Company Parties.`,
    ],
  },
  {
    heading: "Disclaimer of Warranties",
    paragraphs: [
      `THE SERVICE IS PROVIDED ON AN "AS IS", "AS AVAILABLE", AND "WITH ALL FAULTS" BASIS. TO THE MAXIMUM EXTENT PERMITTED BY LAW, ${LEGAL_COMPANY.toUpperCase()} AND THE COMPANY PARTIES EXPRESSLY DISCLAIM ANY AND ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT LIMITED TO ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, QUIET ENJOYMENT, ACCURACY, RELIABILITY, AVAILABILITY, COMPATIBILITY, UNINTERRUPTED OR ERROR-FREE OPERATION, AND ANY WARRANTIES ARISING FROM COURSE OF DEALING OR USAGE OF TRADE.`,
      `Without limiting the foregoing: ${LEGAL_COMPANY} does not warrant that any message will be delivered, received, read, responded to, or will produce any particular result, sale, conversion, appointment, revenue, or other outcome. Message delivery depends on third-party carriers, aggregators, device settings, and network conditions over which ${LEGAL_COMPANY} has no control. AI-assisted features are provided as a convenience and may produce inaccurate, incomplete, or unintended output; you are responsible for reviewing and approving all AI output before transmission.`,
    ],
  },
  {
    heading: "Limitation of Liability",
    paragraphs: [
      `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL ${LEGAL_COMPANY.toUpperCase()} OR ANY OF THE COMPANY PARTIES BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, PUNITIVE, OR ENHANCED DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, BUSINESS, GOODWILL, DATA, OR OPPORTUNITY, ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE, EVEN IF ${LEGAL_COMPANY.toUpperCase()} HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES AND REGARDLESS OF THE THEORY OF LIABILITY.`,
      `THE TOTAL AGGREGATE LIABILITY OF THE COMPANY PARTIES TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU ACTUALLY PAID TO ${LEGAL_COMPANY.toUpperCase()} FOR THE SERVICE DURING THE THREE (3) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS ($100.00).`,
      `The existence of one or more claims shall not enlarge these limitations. Some jurisdictions do not allow the exclusion or limitation of incidental or consequential damages, so the above limitations may not apply to you. In such jurisdictions, the Company Parties' liability shall be limited to the maximum extent permitted by law.`,
    ],
  },
  {
    heading: "Billing, Fees, and No Refunds",
    paragraphs: [
      `Access to the Service requires payment of subscription fees, per-message usage fees, and/or wallet prepayments as described at sign-up or within the Service. All fees are quoted and payable in U.S. dollars unless otherwise specified. You authorize ${LEGAL_COMPANY} and its payment processors to charge your designated payment method for all applicable fees.`,
      `ALL FEES, SUBSCRIPTIONS, CREDITS, AND WALLET BALANCES ARE FINAL AND NON-REFUNDABLE, IN WHOLE OR IN PART, FOR ANY REASON, INCLUDING BUT NOT LIMITED TO DISSATISFACTION, DOWNTIME, DELIVERY FAILURES, ACCOUNT SUSPENSION FOR VIOLATION OF THESE TERMS, FAILURE TO ACHIEVE ANY DESIRED OUTCOME, OR TERMINATION OF YOUR ACCOUNT. THIS NO-REFUND POLICY APPLIES TO THE MAXIMUM EXTENT PERMITTED BY LAW.`,
      `${LEGAL_COMPANY} reserves the right to modify pricing, introduce new fees, or change the pricing structure at any time upon posting notice within the Service or by email. Continued use of the Service after any such change constitutes your acceptance of the new pricing.`,
    ],
  },
  {
    heading: "Compliance Tools — Not a Substitute for Compliance",
    paragraphs: [
      `The Service may include optional tools designed to assist with regulatory compliance, including but not limited to automatic STOP/HELP keyword handling, suppression lists, Do-Not-Contact (DNC) flags, quiet-hours controls, consent logging, and A2P 10DLC registration workflow integration. These tools are provided as a convenience only.`,
      `The availability of compliance tools does not transfer any compliance obligation from you to ${LEGAL_COMPANY}. You remain solely responsible for honoring opt-outs, maintaining consent records, respecting quiet hours, completing carrier registrations, and complying with every applicable law and rule, regardless of whether any such tool is enabled, functional, or accurate.`,
    ],
  },
  {
    heading: "Third-Party Services and Dependencies",
    paragraphs: [
      `The Service interoperates with third-party providers including but not limited to telecommunications carriers (such as AT&T, T-Mobile, Verizon), aggregators (such as Telnyx), payment processors (such as Stripe), cloud hosting providers, AI model providers, email delivery providers, and calendar integrations. These third parties operate under their own terms and privacy policies and are not controlled by ${LEGAL_COMPANY}.`,
      `${LEGAL_COMPANY} is not responsible for the acts, omissions, availability, pricing, performance, or content of any third party. Changes, outages, pricing adjustments, or policy changes by third parties may affect the Service without notice.`,
    ],
  },
  {
    heading: "Intellectual Property",
    paragraphs: [
      `The Service, including all software, code, designs, trademarks, logos, and content created by or on behalf of ${LEGAL_COMPANY}, is and remains the exclusive property of ${LEGAL_COMPANY} and its licensors. Nothing in these Terms grants you any right, title, or interest in or to the Service, except the limited, revocable, non-exclusive, non-transferable license to access and use the Service in accordance with these Terms.`,
      `You retain ownership of content you upload to the Service. You grant ${LEGAL_COMPANY} a worldwide, royalty-free, non-exclusive license to host, store, process, and transmit your content solely for the purpose of providing, securing, and improving the Service and complying with applicable law.`,
    ],
  },
  {
    heading: "Suspension and Termination",
    paragraphs: [
      `${LEGAL_COMPANY} may suspend, limit, or terminate your access to the Service at any time, with or without notice, with or without cause, in its sole and absolute discretion, including in response to suspected violation of these Terms, carrier action, regulatory action, security concern, non-payment, or abuse of the Service.`,
      `Upon termination, your right to access the Service ceases immediately. Sections of these Terms that by their nature should survive termination (including but not limited to Sole Responsibility, Indemnification, Disclaimers, Limitation of Liability, Governing Law, Dispute Resolution, and No Refunds) shall survive.`,
    ],
  },
  {
    heading: "Governing Law, Venue, and Class-Action Waiver",
    paragraphs: [
      `These Terms are governed by and construed in accordance with the laws of the ${LEGAL_GOVERNING_LAW}, without regard to its conflict-of-laws principles. The United Nations Convention on Contracts for the International Sale of Goods does not apply.`,
      `Any dispute, claim, or controversy arising out of or relating to these Terms or the Service that is not resolved through informal negotiation shall be resolved exclusively in the state or federal courts located in the ${LEGAL_GOVERNING_LAW}, and you consent to personal jurisdiction and venue in those courts and waive any objection based on inconvenient forum.`,
      `YOU AND ${LEGAL_COMPANY.toUpperCase()} EACH WAIVE ANY RIGHT TO A JURY TRIAL AND AGREE THAT ANY CLAIM MAY BE BROUGHT ONLY IN AN INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, OR REPRESENTATIVE ACTION. Any claim must be brought within one (1) year after the cause of action accrues, or it is permanently barred.`,
    ],
  },
  {
    heading: "Changes to These Terms",
    paragraphs: [
      `${LEGAL_COMPANY} may update these Terms from time to time. When we do, we will revise the "Effective Date" above and post the revised Terms on the Service. Your continued access to or use of the Service after the Effective Date of any revision constitutes your acceptance of the revised Terms. If you do not agree with the revised Terms, you must stop using the Service.`,
    ],
  },
  {
    heading: "Miscellaneous",
    paragraphs: [
      `These Terms, together with any policy incorporated by reference, constitute the entire agreement between you and ${LEGAL_COMPANY} regarding the Service and supersede all prior or contemporaneous agreements, understandings, and communications. If any provision is held invalid or unenforceable, the remaining provisions shall continue in full force and effect. Failure to enforce any right or provision is not a waiver of such right or provision. You may not assign these Terms without ${LEGAL_COMPANY}'s prior written consent; ${LEGAL_COMPANY} may assign these Terms at any time without notice. The headings are for convenience only and have no legal effect.`,
    ],
  },
  {
    heading: "Contact Us",
    paragraphs: [
      `Questions about these Terms may be directed to ${LEGAL_SUPPORT_EMAIL}.`,
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// PRIVACY POLICY
// ═══════════════════════════════════════════════════════════════════════════
export const LEGAL_PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: "Introduction",
    paragraphs: [
      `${LEGAL_COMPANY} ("we", "us", "our") operates a mass-texting CRM platform ("Service") that enables Users to send SMS, MMS, and related communications to their contacts. This Privacy Policy describes what information we collect, how we use it, when we share it, and the rights and choices available to individuals whose information we process.`,
      `By accessing or using the Service, you agree to this Privacy Policy and the Terms and Conditions. If you do not agree, you must not access or use the Service.`,
    ],
  },
  {
    heading: "Scope and Roles",
    paragraphs: [
      `When our customer ("User") uploads contact data and sends messages, the User is the "controller" or "business" with respect to that contact data, and we act as a "processor" or "service provider" acting on the User's behalf. We are the "controller" with respect to account information we collect directly from Users.`,
      `Users are solely responsible for ensuring that the contact data they upload and the messages they send comply with all applicable laws, including obtaining appropriate consent from recipients and honoring opt-out requests.`,
    ],
  },
  {
    heading: "Information We Collect",
    paragraphs: [
      `Information you provide directly: account profile data (name, email, phone, password hash), billing data (processed by our payment processor; we do not store full card numbers), contact lists and other content you upload, and any information you submit through support or marketing interactions.`,
      `Information collected automatically: IP address, device and browser type, operating system, access times, pages viewed, clicks, referring URL, and approximate geographic location derived from IP address. We use cookies, local storage, and similar technologies to operate and secure the Service.`,
      `Messaging data: message content, recipient phone number, send time, delivery status (queued, sent, delivered, failed), and reply content. Delivery events are received from carriers and aggregators and retained to provide analytics and support.`,
      `Third-party data: information provided by carriers, registries (including A2P 10DLC), aggregators, payment processors, and identity or fraud-prevention partners.`,
    ],
  },
  {
    heading: "How We Use Information",
    paragraphs: [
      `We use the information we collect to: (a) provide, operate, maintain, secure, and improve the Service; (b) transmit messages as directed by Users; (c) process payments and manage billing; (d) communicate with Users about their accounts; (e) monitor for and prevent fraud, abuse, and violations of the Terms; (f) comply with legal obligations and enforce our agreements; and (g) develop new features and aggregated analytics.`,
    ],
  },
  {
    heading: "Legal Bases for Processing (EEA/UK Users)",
    paragraphs: [
      `If you are located in the European Economic Area, United Kingdom, or another jurisdiction recognizing equivalent rights, we process your information based on one or more of the following legal bases: performance of a contract with you; compliance with a legal obligation; our legitimate interests in operating and securing the Service; and your consent, where applicable.`,
    ],
  },
  {
    heading: "How We Share Information",
    paragraphs: [
      `We do not sell personal information. We share information with: (a) messaging carriers and aggregators (such as Telnyx) to deliver messages; (b) payment processors (such as Stripe) to handle billing; (c) cloud hosting and infrastructure providers; (d) AI model providers, solely to the extent necessary to generate features you have enabled; (e) auditors, advisors, and professional service providers under confidentiality obligations; (f) law enforcement, regulators, or other parties when required by law or to protect rights, safety, or property; and (g) successors in the event of a merger, acquisition, financing, or sale of assets, subject to standard confidentiality terms.`,
    ],
  },
  {
    heading: "User-Uploaded Contact Data",
    paragraphs: [
      `Users are responsible for the lawfulness of every contact record they upload and every message they send. ${LEGAL_COMPANY} does not independently verify consent, opt-in status, or eligibility for any recipient. You — as the User — warrant that you have obtained all necessary consents and that your use of the Service complies with all applicable law.`,
      `If you are a recipient of a message and wish to opt out, reply STOP to the message or contact the sender directly. Because the sender controls its contact list, requests to remove a phone number from a specific User's list must be directed to that User.`,
    ],
  },
  {
    heading: "Data Retention",
    paragraphs: [
      `We retain account information for the life of the account and for a reasonable period after account closure to comply with legal, tax, and regulatory obligations, resolve disputes, and enforce our agreements. Messaging data is retained consistent with carrier, aggregator, and regulatory requirements and to support analytics, support, and compliance functions.`,
      `Users may request deletion of their account by contacting ${LEGAL_SUPPORT_EMAIL}. Some information may be retained in backup systems or where required by law.`,
    ],
  },
  {
    heading: "Security",
    paragraphs: [
      `We implement commercially reasonable administrative, technical, and physical safeguards designed to protect information against unauthorized access, disclosure, alteration, or destruction, including encryption in transit, encryption at rest where supported, access controls, logging, and periodic review. Despite these measures, no system is completely secure; you transmit information at your own risk.`,
    ],
  },
  {
    heading: "Your Rights and Choices",
    paragraphs: [
      `Depending on your jurisdiction, you may have rights to access, correct, delete, port, or restrict the processing of your personal information, object to certain processing, withdraw consent, and lodge a complaint with a supervisory authority. To exercise any of these rights, contact us at ${LEGAL_SUPPORT_EMAIL}.`,
      `California residents: Under the California Consumer Privacy Act (CCPA/CPRA), you have the rights to know, delete, correct, and opt out of the sale or sharing of personal information. We do not sell personal information as defined by the CCPA.`,
      `We will not discriminate against you for exercising any of these rights.`,
    ],
  },
  {
    heading: "International Data Transfers",
    paragraphs: [
      `The Service is operated from the United States. If you access the Service from outside the United States, your information will be transferred to, stored in, and processed in the United States and other countries, which may have data protection laws different from those in your jurisdiction. By using the Service you consent to such transfer.`,
    ],
  },
  {
    heading: "Children's Privacy",
    paragraphs: [
      `The Service is intended for individuals aged eighteen (18) or older. We do not knowingly collect personal information from children under 18. If you believe we have collected information from a minor, contact ${LEGAL_SUPPORT_EMAIL} and we will delete it.`,
    ],
  },
  {
    heading: "Third-Party Services",
    paragraphs: [
      `The Service integrates with third-party providers, each of which operates under its own privacy policy. We are not responsible for the privacy practices of any third party. Please review the policies of any third party before providing information to them.`,
    ],
  },
  {
    heading: "No Liability Upon Company for User Messaging",
    paragraphs: [
      `As described in the Terms and Conditions, every message transmitted through the Service is sent at the User's direction and sole responsibility. ${LEGAL_COMPANY} bears no liability for the content, recipients, timing, consent status, or legal consequences of any such message. Recipients who believe their rights have been violated must address their concern to the sending User.`,
    ],
  },
  {
    heading: "Changes to This Privacy Policy",
    paragraphs: [
      `We may update this Privacy Policy from time to time. Material changes will be announced through the Service or by email. The revised policy takes effect as of the posted Effective Date. Continued use of the Service after an update constitutes acceptance of the revised policy.`,
    ],
  },
  {
    heading: "Contact Us",
    paragraphs: [
      `Questions or requests regarding this Privacy Policy may be directed to ${LEGAL_SUPPORT_EMAIL}.`,
    ],
  },
];
