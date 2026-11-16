// Public integration pages (/integrations and /integrations/<slug>).
// Only connections that exist in the product are listed here: the lead
// webhook (app/api/integrations/inbound), Google Calendar sync and CSV
// import. Zapier and similar tools work through the same webhook; there is
// no native Zapier app, and the page says so.

export type IntegrationPage = {
  slug: string;
  name: string;
  icon: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  description: string;
  summary: string;
  sections: { title: string; body: string }[];
  guideTitle: string;
  guide: { heading: string; paragraphs: string[]; bullets?: string[] }[];
  faq: { question: string; answer: string }[];
  blogTags: string[];
};

export const INTEGRATIONS_UPDATED = "2026-11-16";

const WEBHOOK_FIELDS = [
  "first_name (also firstName, fname)",
  "last_name (also lastName, lname)",
  "phone (also phone_number, mobile, cell). Required",
  "email",
  "address, city, state and zip",
  "notes (also comments, description)",
  "lead_source (also source, vendor)",
];

export const INTEGRATION_PAGES: IntegrationPage[] = [
  {
    slug: "lead-vendor-webhook",
    name: "Lead vendor webhooks",
    icon: "webhook",
    metaTitle: "Lead Vendor Webhook Integration | Post Leads into Text2Sale",
    metaDescription:
      "Send new leads from a lead vendor, web form or CRM straight into Text2Sale with a private webhook URL. Contacts are saved instantly and can get an automatic first text.",
    eyebrow: "Lead vendor webhooks",
    title: "Post new leads straight into Text2Sale the moment you buy them.",
    description:
      "Create a private webhook URL in Settings, hand it to your lead vendor, and every new lead is saved as a contact, attached to the campaign you chose and, if you want, sent a first text right away.",
    summary: "Give a lead vendor or web form a private URL and each new lead becomes a contact, with an optional first text.",
    sections: [
      { title: "One URL per lead source", body: "Create a separate key for each vendor or form. Each has its own name, so you can see where leads come from and switch one source off without touching the others." },
      { title: "Flexible field names", body: "Vendors rarely agree on field names. Text2Sale accepts the common spellings for name, phone, email, address and notes, in JSON or form-encoded posts." },
      { title: "No duplicate contacts", body: "Leads are matched on phone number. If a vendor sends the same person twice, the existing contact is updated instead of a second one being created." },
      { title: "Optional automatic first text", body: "Turn on the automatic first message for a key and a new lead hears from you within moments of arriving, even while you are on another call." },
    ],
    guideTitle: "How to connect a lead vendor to Text2Sale",
    guide: [
      {
        heading: "1. Create the connection",
        paragraphs: [
          "In your dashboard open Settings, then Integrations. Under lead vendor connections, name the connection after the source (for example the vendor's name), choose the campaign new leads should join, and decide whether a first text should go out automatically.",
          "Text2Sale generates a private URL that contains a secret key. Treat it like a password: anyone who has it can add leads to your account. If a key is ever exposed, delete it and the vendor stops being able to post immediately.",
        ],
      },
      {
        heading: "2. Give the URL to your vendor",
        paragraphs: [
          "Most lead vendors have a delivery or posting setting where you paste a URL. Ask for an HTTP POST with the lead in the body. Text2Sale reads JSON first and falls back to form-encoded data, so either format works.",
          "The only required field is a phone number. Everything else is optional and is saved when present.",
        ],
        bullets: WEBHOOK_FIELDS,
      },
      {
        heading: "3. Send a test lead",
        paragraphs: [
          "Ask the vendor to post a test lead using your own cell number, then check that the contact appears with the right name, state and lead source. If the automatic first text is on, you should receive it.",
          "Texting still follows your account's rules. A first text only sends once your 10DLC campaign is approved and you have a number and wallet balance, and you should only connect sources whose leads agreed to be contacted by text.",
        ],
      },
    ],
    faq: [
      { question: "Which lead vendors work with the Text2Sale webhook?", answer: "Any vendor, form tool or CRM that can send an HTTP POST with the lead's details to a URL. There is no fixed list, because the webhook accepts the common field names most vendors already use." },
      { question: "What happens if the vendor sends a lead without a phone number?", answer: "The request is accepted so the vendor does not keep retrying, but no contact is created, because Text2Sale needs a phone number to text or call the lead." },
      { question: "Does the automatic first text cost extra?", answer: "It is billed like any other outbound text, at the standard per-segment rate from your prepaid balance. There is no separate fee for the webhook itself." },
      { question: "Can I connect more than one vendor?", answer: "Yes. Create a separate connection for each source so every lead is labelled with where it came from and each source can be removed on its own." },
    ],
    blogTags: ["Integrations", "Lead management", "Speed to lead"],
  },
  {
    slug: "google-calendar",
    name: "Google Calendar",
    icon: "calendar",
    metaTitle: "Google Calendar Integration for Appointment Booking | Text2Sale",
    metaDescription:
      "Connect Google Calendar to Text2Sale so booked appointments land on your calendar and the AI assistant only offers times you actually have free.",
    eyebrow: "Google Calendar",
    title: "Booked appointments land on the calendar you already use.",
    description:
      "Connect Google Calendar once. Appointments booked by text, by the AI assistant or by the AI receptionist appear on your calendar, and the times offered to leads are checked against what you already have scheduled.",
    summary: "Booked appointments appear on your calendar, and the AI only offers times you actually have open.",
    sections: [
      { title: "Real availability", body: "Before offering a time, Text2Sale checks your calendar's busy periods, including events you added yourself outside Text2Sale, so a lead is never offered a slot you have already filled." },
      { title: "Booked by text or by phone", body: "The AI text assistant and the AI receptionist both book into the same calendar, so an appointment made on a call and one made by text cannot collide." },
      { title: "Your details stay private", body: "Availability is read as busy and free blocks. Text2Sale does not need to read what your other events are about to avoid double-booking you." },
      { title: "Disconnect any time", body: "Remove the connection from Settings whenever you like. Reconnecting takes one sign-in." },
    ],
    guideTitle: "How to connect Google Calendar",
    guide: [
      {
        heading: "1. Connect from Settings",
        paragraphs: [
          "Open Settings, then Integrations, and choose Google Calendar. Sign in with the Google account whose calendar you want appointments on and approve calendar access on Google's consent screen.",
          "If you skip the calendar permission on that screen, booking will not work. Disconnect, reconnect and approve calendar access.",
        ],
      },
      {
        heading: "2. Set when you take appointments",
        paragraphs: [
          "Set the days and hours you are willing to meet. The assistant offers times inside those hours and skips anything your calendar already shows as busy.",
        ],
      },
      {
        heading: "3. Let a lead book",
        paragraphs: [
          "When a lead agrees to talk, the assistant offers open times, books the one they choose and confirms the details. The appointment appears on your Google Calendar like any other event.",
        ],
      },
    ],
    faq: [
      { question: "Does Text2Sale work with Outlook or Apple Calendar?", answer: "The built-in connection is for Google Calendar. If your team uses another calendar, you can still book appointments in Text2Sale and add them to your own calendar manually." },
      { question: "Will the AI double-book me?", answer: "It checks your calendar's busy times before offering a slot, including events created outside Text2Sale, so it only offers times that are open when it asks." },
      { question: "Which plans include calendar booking?", answer: "Appointment booking and calendar integration are included in the Text, Dialer and Complete plans." },
    ],
    blogTags: ["Appointments", "AI", "Integrations"],
  },
  {
    slug: "csv-import",
    name: "CSV and spreadsheet import",
    icon: "spreadsheet",
    metaTitle: "CSV Lead Import: Upload a Spreadsheet and Text Your Leads | Text2Sale",
    metaDescription:
      "Export leads from any CRM, lead vendor or spreadsheet and upload the CSV to Text2Sale. Map your columns once, save the list, and start a text or calling campaign.",
    eyebrow: "CSV and spreadsheet import",
    title: "Bring the lead lists you already own. Upload a CSV and start following up.",
    description:
      "Every CRM and lead vendor can export a spreadsheet. Upload it to Text2Sale, match your columns to contact fields, and the list is ready for a text campaign or a dialing session.",
    summary: "Export from any CRM or lead source, upload the file and map the columns to contact fields.",
    sections: [
      { title: "Works with any export", body: "Excel, Google Sheets, a lead vendor download or a CRM export: save it as CSV and upload it. No template is required." },
      { title: "Column mapping", body: "Tell Text2Sale which column is the first name, phone number, state and so on." },
      { title: "Saved lead lists", body: "Keep each upload as its own list, so last week's quotes and last year's aged leads can get different follow-up." },
      { title: "Straight into a campaign", body: "Start a text campaign from the list right away, or save it and work it later with the dialer." },
    ],
    guideTitle: "How to import a lead list",
    guide: [
      {
        heading: "1. Clean the file first",
        paragraphs: [
          "Open the spreadsheet and make sure there is one lead per row and one header row at the top. Remove rows with no phone number and anyone who has asked you not to contact them. Landlines cannot receive texts, so if your source marks the line type, filter those out before a text campaign.",
        ],
      },
      {
        heading: "2. Upload and map columns",
        paragraphs: [
          "Upload the CSV and match each column to a contact field. Phone number is the one field you must map. First name is worth mapping too, because a text that opens with the lead's name gets read.",
        ],
      },
      {
        heading: "3. Choose what happens next",
        paragraphs: [
          "Either save the list for later or start a campaign. Before a campaign sends you see how many people will receive it and the estimated cost, so there are no surprises on a large list.",
          "Only upload leads who agreed to hear from you by text, and keep the record of where that consent came from.",
        ],
      },
    ],
    faq: [
      { question: "Is there a limit on how many contacts I can upload?", answer: "Plans do not cap the number of contacts. You pay for the texts and call minutes you use, not for the size of your list." },
      { question: "Can I get my contacts back out?", answer: "Yes. Contacts can be exported from the dashboard as a CSV file at any time." },
      { question: "Can I import from Excel?", answer: "Yes. In Excel choose Save As and pick CSV, then upload that file." },
    ],
    blogTags: ["CSV import", "Lead management", "Getting started"],
  },
  {
    slug: "zapier-webhooks",
    name: "Zapier and automation tools",
    icon: "zap",
    metaTitle: "Connect Zapier, Make or Any Webhook Tool to Text2Sale",
    metaDescription:
      "Use Zapier, Make or any automation tool that can send a webhook to add new leads to Text2Sale from Facebook lead ads, web forms, Google Sheets and thousands of other apps.",
    eyebrow: "Zapier and automation tools",
    title: "If an app can send a webhook, it can send leads to Text2Sale.",
    description:
      "Text2Sale does not have its own Zapier app. It does not need one: automation tools such as Zapier and Make can post to a Text2Sale webhook URL, which is enough to bring in leads from Facebook lead ads, form builders, spreadsheets and other CRMs.",
    summary: "Any tool that can send a webhook, including Zapier and Make, can post new leads into Text2Sale.",
    sections: [
      { title: "Facebook and Instagram lead ads", body: "Use your automation tool's lead-ad trigger and post each new lead to your Text2Sale URL, so a first text can go out while the person still has the ad in front of them." },
      { title: "Web forms", body: "Website form builders either send webhooks themselves or connect through an automation tool. Either way a form fill becomes a contact." },
      { title: "Spreadsheets", body: "Trigger on a new spreadsheet row to pass leads along as a teammate or vendor adds them." },
      { title: "Other CRMs", body: "Keep your existing CRM as the system of record and send only the leads you want to text or call into Text2Sale." },
    ],
    guideTitle: "How to send leads from an automation tool",
    guide: [
      {
        heading: "1. Create a Text2Sale webhook URL",
        paragraphs: [
          "In Settings, then Integrations, add a lead vendor connection and name it after the source, for example Facebook lead ads. Choose the campaign and whether to send an automatic first text, then copy the private URL.",
        ],
      },
      {
        heading: "2. Add a webhook step in your automation tool",
        paragraphs: [
          "In Zapier this is the Webhooks action with the POST method; other tools have an equivalent HTTP or webhook step. Paste the Text2Sale URL, choose JSON as the format and map your trigger's fields to these names.",
        ],
        bullets: WEBHOOK_FIELDS,
      },
      {
        heading: "3. Test, then switch it on",
        paragraphs: [
          "Send a test with your own phone number and confirm the contact appears in Text2Sale. Webhook steps may require a paid plan on the automation tool's side; check its pricing before you rely on it.",
        ],
      },
    ],
    faq: [
      { question: "Is there a native Text2Sale app in Zapier?", answer: "No. The connection uses Zapier's generic webhook action posting to your Text2Sale URL. It takes a few minutes to set up and needs no code." },
      { question: "Can Text2Sale send data out to other apps?", answer: "These pages cover bringing leads in. For getting data out, contacts can be exported from the dashboard as a CSV file." },
      { question: "Do I need a developer?", answer: "No. Pasting a URL and matching field names is the whole job." },
    ],
    blogTags: ["Integrations", "Automation", "Lead generation"],
  },
];

export function getIntegration(slug: string): IntegrationPage | undefined {
  return INTEGRATION_PAGES.find((page) => page.slug === slug);
}
