// ── Industries ─────────────────────────────────────────────────────────────
//
// One list that drives four things which used to be insurance-only or
// hand-maintained in several places:
//
//   1. the dropdown a customer picks from (onboarding, AI settings),
//   2. the `vertical` sent to Telnyx/TCR when their business is registered,
//   3. the wording of the campaign registration (description, sample texts),
//   4. the copy on the website we generate for them.
//
// Carriers read (3) and (4) side by side. A roofing company whose sample text
// talks about "health coverage options" is the textbook mismatch that gets a
// campaign rejected, so the copy has to follow the industry rather than being
// written once for insurance and reused.
//
// Pure data and string helpers — no imports — so it works in server routes,
// client components and the test script alike.

/** The brand `vertical` values Telnyx accepts (checked against its OpenAPI spec). */
export const TELNYX_VERTICALS = {
  AGRICULTURE: "Agriculture",
  COMMUNICATION: "Communication",
  CONSTRUCTION: "Construction",
  EDUCATION: "Education",
  ENERGY: "Energy",
  ENTERTAINMENT: "Entertainment",
  FINANCIAL: "Financial Services",
  GAMBLING: "Gambling",
  GOVERNMENT: "Government",
  HEALTHCARE: "Healthcare",
  HOSPITALITY: "Hospitality",
  HUMAN_RESOURCES: "Human Resources",
  INSURANCE: "Insurance",
  LEGAL: "Legal",
  MANUFACTURING: "Manufacturing",
  NGO: "NGO",
  POLITICAL: "Political",
  POSTAL: "Postal",
  PROFESSIONAL: "Professional Services",
  REAL_ESTATE: "Real Estate",
  RETAIL: "Retail",
  TECHNOLOGY: "Technology",
  TRANSPORTATION: "Transportation",
} as const;

export type TcrVertical = keyof typeof TELNYX_VERTICALS;

export type IndustryId =
  | TcrVertical
  | "health_insurance"
  | "life_insurance"
  | "auto_insurance"
  | "home_insurance"
  | "medicare"
  | "real_estate"
  | "solar"
  | "roofing"
  | "financial_services"
  | "auto_dealer"
  | "debt_settlement"
  | "legal"
  | "other";

export type SampleContext = {
  business: string;
  phone: string;
  site: string;
};

export type Industry = {
  id: IndustryId;
  /** Shown in dropdowns. */
  label: string;
  /** Sent to Telnyx as the brand vertical. */
  vertical: TcrVertical;
  /** What kind of business this is, for sentences like "X is an independent …". */
  businessNoun: string;
  /** Completes "We send text messages about …" on the site and in the campaign. */
  messageTypes: string;
  /** Hero headline on the generated website. */
  headline: string;
  /** Hero sub-line used when the customer hasn't written their own description. */
  defaultDescription: (business: string) => string;
  /** Label on the main call-to-action. */
  cta: string;
  /** Three cards under "What we offer". */
  services: { title: string; desc: string }[];
  /** Two example texts for the campaign registration. */
  samples: (ctx: SampleContext) => [string, string];
  /** Carrier-restricted categories get flagged to the owner. */
  restricted?: boolean;
};

const STOP = "Reply STOP to opt out. Msg&data rates may apply.";

export const INDUSTRIES: Industry[] = [
  {
    id: "health_insurance",
    label: "Health Insurance",
    vertical: "INSURANCE",
    businessNoun: "independent health insurance agency",
    messageTypes: "quote follow-ups, enrollment reminders, appointment confirmations, and policy service updates",
    headline: "Health Coverage Made Simple",
    defaultDescription: (b) =>
      `${b} is an independent insurance agency that helps individuals and families compare health coverage options and find a plan that fits their needs and budget.`,
    cta: "Get a Free Quote",
    services: [
      { title: "Individual & Family Plans", desc: "ACA-compliant plans, short-term coverage and supplemental options matched to your budget." },
      { title: "Enrollment Help", desc: "Guidance through open enrollment and special enrollment periods, start to finish." },
      { title: "Annual Plan Reviews", desc: "A yearly check-in to make sure your coverage still fits your doctors, medications and costs." },
    ],
    samples: ({ business, phone, site }) => [
      `Hi Sarah, this is ${business}. Your health plan quote is ready - I can walk you through the options this week. Reply here or visit ${site}. ${STOP}`,
      `Hi John, ${business} here. Reminder: your coverage review is tomorrow at 2:00 PM. Reply C to confirm or call ${phone} to reschedule. ${STOP}`,
    ],
  },
  {
    id: "life_insurance",
    label: "Life Insurance",
    vertical: "INSURANCE",
    businessNoun: "independent life insurance agency",
    messageTypes: "quote follow-ups, application status updates, policy review reminders, and appointment confirmations",
    headline: "Protect the People Who Matter Most",
    defaultDescription: (b) =>
      `${b} is an independent insurance agency that helps families and business owners compare life insurance options and put the right protection in place.`,
    cta: "Get a Free Quote",
    services: [
      { title: "Term Life", desc: "Affordable coverage for a set period, ideal while raising a family or paying off a mortgage." },
      { title: "Whole & Universal Life", desc: "Permanent coverage with cash value for long-term planning and legacy goals." },
      { title: "Final Expense", desc: "Simple coverage that helps your family with end-of-life costs, with no medical exam on many plans." },
    ],
    samples: ({ business, phone, site }) => [
      `Hi Maria, this is ${business}. Your life insurance quote is ready to review. Reply here or visit ${site} to pick a time to talk. ${STOP}`,
      `Hi David, ${business} here. Your policy review is scheduled for tomorrow at 10:00 AM. Reply C to confirm or call ${phone}. ${STOP}`,
    ],
  },
  {
    id: "auto_insurance",
    label: "Auto Insurance",
    vertical: "INSURANCE",
    businessNoun: "independent auto insurance agency",
    messageTypes: "quote follow-ups, renewal reminders, policy change confirmations, and appointment reminders",
    headline: "Auto Coverage Without the Runaround",
    defaultDescription: (b) =>
      `${b} is an independent insurance agency that helps drivers compare auto insurance options and keep their coverage up to date.`,
    cta: "Get a Free Quote",
    services: [
      { title: "Personal Auto", desc: "Liability, collision and comprehensive coverage matched to how and what you drive." },
      { title: "Bundles & Discounts", desc: "We look for savings when you combine auto with home or renters coverage." },
      { title: "Renewal Reviews", desc: "A check-in before each renewal so you never overpay or lapse." },
    ],
    samples: ({ business, phone, site }) => [
      `Hi Chris, this is ${business}. Your auto insurance renewal is coming up - want us to re-shop your rate? Reply YES or visit ${site}. ${STOP}`,
      `Hi Dana, ${business} here. Your updated policy documents are ready. Questions? Reply here or call ${phone}. ${STOP}`,
    ],
  },
  {
    id: "home_insurance",
    label: "Home / Property Insurance",
    vertical: "INSURANCE",
    businessNoun: "independent home and property insurance agency",
    messageTypes: "quote follow-ups, renewal reminders, policy updates, and appointment confirmations",
    headline: "Protect the Place You Call Home",
    defaultDescription: (b) =>
      `${b} is an independent insurance agency that helps homeowners and renters compare property coverage and keep it current.`,
    cta: "Get a Free Quote",
    services: [
      { title: "Homeowners", desc: "Dwelling, belongings and liability coverage built around your home's real replacement cost." },
      { title: "Renters & Condo", desc: "Affordable protection for your belongings and liability, whether you rent or own a unit." },
      { title: "Coverage Reviews", desc: "A regular look at limits and deductibles so your coverage keeps pace with your home." },
    ],
    samples: ({ business, phone, site }) => [
      `Hi Pat, this is ${business}. Your homeowners quote is ready. Reply here or visit ${site} to review it with us. ${STOP}`,
      `Hi Jordan, ${business} here. Your policy renews next month - want a quick coverage review? Reply YES or call ${phone}. ${STOP}`,
    ],
  },
  {
    id: "medicare",
    label: "Medicare",
    vertical: "INSURANCE",
    businessNoun: "independent Medicare insurance agency",
    messageTypes: "plan review reminders, enrollment-period reminders, appointment confirmations, and policy service updates",
    headline: "Medicare, Explained Clearly",
    defaultDescription: (b) =>
      `${b} is an independent insurance agency that helps people on and approaching Medicare understand their options and choose coverage with confidence.`,
    cta: "Request a Plan Review",
    services: [
      { title: "Medicare Advantage", desc: "Plans that bundle hospital, medical and often drug coverage, compared side by side." },
      { title: "Medicare Supplement", desc: "Medigap plans that help with the costs original Medicare does not cover." },
      { title: "Part D Drug Plans", desc: "Prescription coverage matched to the medications you actually take." },
    ],
    samples: ({ business, phone, site }) => [
      `Hi Linda, this is ${business}. You asked for a Medicare plan review - reply with a day that works or visit ${site} to book. ${STOP}`,
      `Hi Robert, ${business} here. Reminder: your plan review is tomorrow at 11:00 AM. Reply C to confirm or call ${phone}. ${STOP}`,
    ],
  },
  {
    id: "real_estate",
    label: "Real Estate",
    vertical: "REAL_ESTATE",
    businessNoun: "real estate team",
    messageTypes: "new listing alerts, showing confirmations, open house invitations, and transaction updates",
    headline: "Find Your Next Move",
    defaultDescription: (b) =>
      `${b} is a real estate team that helps buyers and sellers navigate the local market, from first showing to closing day.`,
    cta: "Start Your Search",
    services: [
      { title: "Buyer Representation", desc: "Neighborhood guidance, showings and offer strategy from search to closing." },
      { title: "Home Selling", desc: "Pricing, preparation and marketing designed to get your home sold well." },
      { title: "Market Updates", desc: "New listings and local market updates delivered when you ask for them." },
    ],
    samples: ({ business, phone, site }) => [
      `Hi Alex, this is ${business}. A new listing just hit that matches your search. See it at ${site} or reply to schedule a showing. ${STOP}`,
      `Hi Taylor, ${business} here. Your showing is confirmed for Saturday at 1:00 PM. Reply C to confirm or call ${phone} to change it. ${STOP}`,
    ],
  },
  {
    id: "solar",
    label: "Solar Energy",
    vertical: "ENERGY",
    businessNoun: "solar energy company",
    messageTypes: "estimate follow-ups, appointment confirmations, installation updates, and service reminders",
    headline: "Power Your Home With the Sun",
    defaultDescription: (b) =>
      `${b} is a solar energy company that helps homeowners understand their options and go solar with a clear, honest estimate.`,
    cta: "Get a Free Estimate",
    services: [
      { title: "Free Solar Estimates", desc: "A no-pressure look at what solar could save based on your roof and your bills." },
      { title: "Professional Installation", desc: "Design, permitting and installation handled by a trained crew." },
      { title: "Ongoing Support", desc: "Monitoring help and service when you need it after your system is installed." },
    ],
    samples: ({ business, phone, site }) => [
      `Hi Sam, this is ${business}. Your solar estimate is ready - reply here or visit ${site} to review it with a specialist. ${STOP}`,
      `Hi Morgan, ${business} here. Your site visit is set for Tuesday at 9:00 AM. Reply C to confirm or call ${phone} to reschedule. ${STOP}`,
    ],
  },
  {
    id: "roofing",
    label: "Roofing / Home Services",
    vertical: "CONSTRUCTION",
    businessNoun: "home services and roofing company",
    messageTypes: "estimate follow-ups, appointment confirmations, project updates, and service reminders",
    headline: "Quality Work on the Home You Love",
    defaultDescription: (b) =>
      `${b} is a home services company that provides roofing and home improvement work with clear estimates and dependable crews.`,
    cta: "Request an Estimate",
    services: [
      { title: "Roof Repair & Replacement", desc: "Inspections, repairs and full replacements done right the first time." },
      { title: "Storm Damage", desc: "Help assessing damage and working through the repair process." },
      { title: "Home Improvement", desc: "Exterior and interior projects scoped and scheduled with clear communication." },
    ],
    samples: ({ business, phone, site }) => [
      `Hi Jamie, this is ${business}. Your roofing estimate is ready - reply here or visit ${site} to go over it. ${STOP}`,
      `Hi Casey, ${business} here. Our crew is scheduled to arrive tomorrow between 8 and 10 AM. Reply C to confirm or call ${phone}. ${STOP}`,
    ],
  },
  {
    id: "financial_services",
    label: "Financial Services",
    vertical: "FINANCIAL",
    businessNoun: "financial services firm",
    messageTypes: "appointment reminders, planning follow-ups, document requests, and account service updates",
    headline: "Clear Guidance for Your Financial Life",
    defaultDescription: (b) =>
      `${b} is a financial services firm that helps individuals and families plan with confidence and stay on track toward their goals.`,
    cta: "Schedule a Consultation",
    services: [
      { title: "Financial Planning", desc: "A written plan built around your goals, timeline and comfort with risk." },
      { title: "Retirement Planning", desc: "Income and savings strategies to help you retire on your terms." },
      { title: "Annual Reviews", desc: "A yearly check-in to keep your plan current as your life changes." },
    ],
    samples: ({ business, phone, site }) => [
      `Hi Ellen, this is ${business}. Your planning meeting is tomorrow at 3:00 PM. Reply C to confirm or call ${phone} to reschedule. ${STOP}`,
      `Hi Mark, ${business} here. We still need one document to finish your review. You can upload it at ${site}. ${STOP}`,
    ],
  },
  {
    id: "auto_dealer",
    label: "Auto Dealership",
    vertical: "RETAIL",
    businessNoun: "automotive dealership",
    messageTypes: "appointment confirmations, new-inventory alerts, financing follow-ups, and service reminders",
    headline: "Drive Home in the Right Vehicle",
    defaultDescription: (b) =>
      `${b} is an automotive dealership that helps customers find, finance and service the vehicle that fits their life.`,
    cta: "Schedule a Test Drive",
    services: [
      { title: "New & Pre-Owned Vehicles", desc: "A wide selection with clear pricing and honest answers." },
      { title: "Financing", desc: "Help working out payments that fit your budget." },
      { title: "Service & Parts", desc: "Maintenance and repairs from people who know your vehicle." },
    ],
    samples: ({ business, phone, site }) => [
      `Hi Drew, this is ${business}. Your test drive is set for Saturday at 11:00 AM. Reply C to confirm or call ${phone} to change it. ${STOP}`,
      `Hi Riley, ${business} here. A vehicle matching your search just arrived - see it at ${site} or reply for details. ${STOP}`,
    ],
  },
  {
    id: "debt_settlement",
    label: "Debt Settlement / Credit Repair",
    vertical: "FINANCIAL",
    businessNoun: "debt relief and credit services company",
    messageTypes: "consultation reminders, document requests, appointment confirmations, and account service updates",
    headline: "Straightforward Help With Your Finances",
    defaultDescription: (b) =>
      `${b} is a financial services company that helps people understand their debt and credit options and take the next step.`,
    cta: "Request a Consultation",
    services: [
      { title: "Free Consultation", desc: "A confidential conversation about your situation and the options available to you." },
      { title: "Credit Education", desc: "Plain-language guidance on how credit works and how to improve it." },
      { title: "Ongoing Support", desc: "Check-ins and reminders so you stay on track with your plan." },
    ],
    restricted: true,
    samples: ({ business, phone, site }) => [
      `Hi Pat, this is ${business}. Your consultation is scheduled for tomorrow at 1:00 PM. Reply C to confirm or call ${phone}. ${STOP}`,
      `Hi Jordan, ${business} here. We still need the documents we discussed - you can upload them at ${site}. ${STOP}`,
    ],
  },
  {
    id: "legal",
    label: "Legal Services",
    vertical: "LEGAL",
    businessNoun: "law firm",
    messageTypes: "consultation reminders, case status updates, document requests, and appointment confirmations",
    headline: "Dependable Legal Counsel",
    defaultDescription: (b) =>
      `${b} is a law firm that provides clear, responsive legal counsel to individuals and families.`,
    cta: "Request a Consultation",
    services: [
      { title: "Consultations", desc: "A confidential first conversation about your situation and your options." },
      { title: "Case Representation", desc: "Dedicated attention and regular updates from first filing to resolution." },
      { title: "Document Preparation", desc: "Careful preparation of the paperwork your matter requires." },
    ],
    samples: ({ business, phone, site }) => [
      `Hi Avery, this is ${business}. Your consultation is confirmed for Thursday at 10:00 AM. Reply C to confirm or call ${phone} to reschedule. ${STOP}`,
      `Hi Quinn, ${business} here. We need one more document to move your matter forward. Upload it at ${site}. ${STOP}`,
    ],
  },
  {
    id: "other",
    label: "Other",
    vertical: "PROFESSIONAL",
    businessNoun: "local business",
    messageTypes: "appointment reminders, follow-up messages, special offers, and customer service updates",
    headline: "Welcome",
    defaultDescription: (b) =>
      `${b} is a local business committed to great service and clear communication with every customer.`,
    cta: "Get in Touch",
    services: [
      { title: "Our Services", desc: "Quality work and friendly service from people who care about the result." },
      { title: "Fast Responses", desc: "Questions answered quickly by phone, email or text, whichever you prefer." },
      { title: "Stay Informed", desc: "Appointment reminders and updates delivered by text when you opt in." },
    ],
    samples: ({ business, phone, site }) => [
      `Hi Sam, this is ${business}. Thanks for your interest - reply here or visit ${site} to schedule a time to talk. ${STOP}`,
      `Hi Alex, ${business} here. Reminder: your appointment is tomorrow at 2:00 PM. Reply C to confirm or call ${phone} to reschedule. ${STOP}`,
    ],
  },
];

const BY_ID = new Map<string, Industry>(INDUSTRIES.map((i) => [i.id, i]));

// Every brand category has one copy source for the website, consent and campaign.
type SectorCopy = readonly [noun: string, headline: string, cta: string, first: string, second: string, third: string, topics: string, firstText: string, secondText: string];
const SECTOR_COPY: Record<Exclude<TcrVertical, "REAL_ESTATE" | "LEGAL">, SectorCopy> = {
  AGRICULTURE: ["agricultural business", "Plan your next agricultural order", "Ask about availability", "Seasonal availability", "Order planning", "Pickup details", "seasonal availability alerts, order confirmations, and pickup updates", "The availability update you requested is ready.", "Your order pickup time has been confirmed."],
  COMMUNICATION: ["communications provider", "Get help with your communications service", "Ask a service question", "Service options", "Installation visits", "Service updates", "service announcements, installation reminders, and support updates", "The service information you requested is available.", "Your installation visit is scheduled for tomorrow."],
  CONSTRUCTION: ["construction business", "From project estimate to site visit", "Discuss a project", "Project inquiries", "Estimate reviews", "Site visits", "estimate follow-ups, site visit reminders, and project updates", "Your project estimate is ready to review.", "Your site visit is confirmed for tomorrow."],
  EDUCATION: ["learning organization", "Find your next class", "Explore classes", "Course information", "Enrollment questions", "Class schedules", "course announcements, enrollment follow-ups, and schedule reminders", "The course information you requested is ready.", "Your class starts tomorrow."],
  ENERGY: ["provider in the energy sector", "Explore energy services for your property", "Ask about service", "Service options", "Project estimates", "Service visits", "service updates, estimate follow-ups, and visit reminders", "The energy service information you requested is ready.", "Your service visit is confirmed for tomorrow."],
  ENTERTAINMENT: ["business in entertainment", "Plan your next event experience", "Ask about an event", "Upcoming events", "Booking inquiries", "Event schedules", "event announcements, booking confirmations, and schedule changes", "The event details you requested are available.", "Your event booking is confirmed for Saturday."],
  FINANCIAL: ["financial services business", "Talk through your financial service needs", "Request a consultation", "Service inquiries", "Consultations", "Account support", "service announcements, consultation follow-ups, and appointment reminders", "The financial service overview you requested is ready.", "Your consultation is scheduled for tomorrow."],
  GAMBLING: ["gaming business", "Visitor information and guest services", "Contact guest services", "Visitor information", "Venue inquiries", "Guest support", "guest inquiries and requested service updates", "The guest information you requested is available.", "We have an update on your guest service inquiry."],
  GOVERNMENT: ["public agency", "Find public services and office information", "Contact the office", "Public programs", "Service requests", "Office appointments", "public program notices, service request updates, and appointment reminders", "The public program information you requested is ready.", "Your office appointment is scheduled for tomorrow."],
  HEALTHCARE: ["healthcare provider", "Plan your visit and stay in touch", "Request a visit", "Visit information", "Appointment scheduling", "Office updates", "service announcements, appointment reminders, and scheduling updates", "The office information you requested is available.", "Your visit is scheduled for tomorrow."],
  HOSPITALITY: ["hospitality business", "Make plans for your visit", "Ask about a reservation", "Reservation inquiries", "Guest services", "Arrival details", "availability alerts, reservation confirmations, and arrival updates", "The availability information you requested is ready.", "Your reservation for tomorrow is confirmed."],
  HUMAN_RESOURCES: ["human resources organization", "Get answers about roles and interviews", "Ask about opportunities", "Role information", "Interview scheduling", "Application updates", "role announcements, interview reminders, and application updates", "The role information you requested is available.", "Your interview is scheduled for tomorrow."],
  INSURANCE: ["provider of insurance services", "Explore your coverage options", "Request a coverage review", "Coverage questions", "Quote requests", "Policy reviews", "coverage updates, requested quote follow-ups, and policy review reminders", "The coverage information you requested is ready.", "Your policy review is scheduled for tomorrow."],
  MANUFACTURING: ["manufacturer", "Plan your next production order", "Discuss your requirements", "Product specifications", "Production inquiries", "Order updates", "product announcements, production updates, and pickup notices", "The product specifications you requested are ready.", "Your production order is ready for pickup."],
  NGO: ["nonprofit organization", "Find programs and ways to get involved", "Explore our programs", "Program information", "Volunteer opportunities", "Event schedules", "program announcements, volunteer confirmations, and event reminders", "The volunteer information you requested is available.", "Your volunteer shift is confirmed for tomorrow."],
  POLITICAL: ["political organization", "Find event and volunteer information", "Contact the team", "Public events", "Volunteer inquiries", "Event schedules", "event announcements, volunteer confirmations, and scheduling updates", "The event information you requested is available.", "Your volunteer shift is scheduled for tomorrow."],
  POSTAL: ["postal services business", "Plan your shipment or pickup", "Ask about a shipment", "Shipping options", "Pickup scheduling", "Delivery inquiries", "service announcements, pickup confirmations, and shipment updates", "The shipping options you requested are ready.", "Your shipment pickup is scheduled for tomorrow."],
  PROFESSIONAL: ["professional services business", "Get the right help for your project", "Request a consultation", "Service inquiries", "Project scoping", "Consultation scheduling", "service announcements, project follow-ups, and consultation reminders", "The project information you requested is ready.", "Your project consultation is scheduled for tomorrow."],
  RETAIL: ["retail business", "Find products and plan your pickup", "Ask about a product", "Product information", "Availability checks", "Order pickup", "product announcements, availability alerts, and pickup confirmations", "The product you asked about is back in stock.", "Your order is ready for pickup."],
  TECHNOLOGY: ["technology business", "Explore products and get technical support", "Talk to our team", "Product information", "Demo scheduling", "Technical support", "product announcements, demo reminders, and support updates", "The product information you requested is ready.", "Your product demo is scheduled for tomorrow."],
  TRANSPORTATION: ["transportation provider", "Plan a trip or arrange a pickup", "Ask about transportation", "Route information", "Booking requests", "Pickup coordination", "route announcements, booking confirmations, and pickup updates", "The route information you requested is available.", "Your pickup is scheduled for tomorrow."],
};

for (const vertical of Object.keys(TELNYX_VERTICALS) as TcrVertical[]) {
  const label = TELNYX_VERTICALS[vertical];
  if (vertical === "REAL_ESTATE" || vertical === "LEGAL") {
    BY_ID.set(vertical, { ...BY_ID.get(vertical.toLowerCase())!, id: vertical, label });
    continue;
  }
  const [businessNoun, headline, cta, first, second, third, messageTypes, one, two] = SECTOR_COPY[vertical];
  BY_ID.set(vertical, {
    id: vertical, label, vertical, businessNoun, headline, cta, messageTypes,
    defaultDescription: (business) => `${business} can help with ${first.toLowerCase()}, ${second.toLowerCase()}, and ${third.toLowerCase()}. Contact our team to get started.`,
    services: [
      { title: first, desc: `Find out about ${first.toLowerCase()} and get answers from our team.` },
      { title: second, desc: `Contact us about ${second.toLowerCase()} and we’ll walk you through the next step.` },
      { title: third, desc: `Ask us about ${third.toLowerCase()} and choose how you’d like to hear back.` },
    ],
    samples: ({ business, site, phone }) => [
      `${business}: ${one} Visit ${site} or reply with a question. ${STOP}`,
      `${business}: ${two} Call ${phone} with questions. ${STOP}`,
    ],
  });
}

export function registrationVertical(value: string): TcrVertical | "" {
  return BY_ID.get(value)?.vertical || "";
}

export function isIndustryId(value: unknown): value is IndustryId {
  return typeof value === "string" && BY_ID.has(value);
}

/** Unknown, empty or legacy values fall back to the generic profile. */
export function getIndustry(id: string | null | undefined): Industry {
  return (id && BY_ID.get(id)) || BY_ID.get("other")!;
}

export function industryToVertical(id: string | null | undefined): TcrVertical {
  return getIndustry(id).vertical;
}
