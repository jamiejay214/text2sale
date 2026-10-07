import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  "title": "Turn coverage inquiries into scheduled conversations. | Text2Sale AI",
  "description": "Keep individual and family coverage inquiries moving with AI follow-up, qualification, and appointment booking.",
  "alternates": {
    "canonical": "/health-insurance"
  }
};

const content = {
  "eyebrow": "Text2Sale AI for health insurance agents",
  "title": "Turn coverage inquiries into scheduled conversations.",
  "description": "Keep individual and family coverage inquiries moving with AI follow-up, qualification, and appointment booking. Upload your leads. Turn on AI. Text2Sale texts, qualifies, follows up, and books appointments for you.",
  "primaryCta": "Put My Leads on Autopilot",
  "secondaryCta": "Watch AI Book an Appointment",
  "secondaryHref": "/#ai-booking-demo",
  "canonicalPath": "/health-insurance",
  "sections": [
    {
      "title": "Upload your opted-in leads",
      "body": "Import your CSV, map fields, and organize contacts into the right campaign."
    },
    {
      "title": "Start conversations with AI",
      "body": "Set your instructions and follow-up sequence. AI helps qualify interest and handles replies in your inbox."
    },
    {
      "title": "Book with your calendar",
      "body": "Connect Google Calendar, set availability, and help interested prospects choose a time."
    },
    {
      "title": "Start with the coverage timeline",
      "body": "Organize inquiries by desired start date so agents can prepare for the call. Avoid collecting sensitive medical details by text."
    }
  ],
  "guideTitle": "A practical workflow for health insurance agents",
  "guide": [
    {
      "heading": "Give older inquiries a clear next step",
      "paragraphs": [
        "Ask whether the prospect still needs coverage and when they want it to start, then book a consultation.",
        "Use existing contact history to guide the follow-up. Send from your business identity and keep conversations and appointments in one workspace."
      ]
    },
    {
      "heading": "One workspace, transparent usage",
      "paragraphs": [
        "Text2Sale is $39.99/month with AI appointment booking, CRM, campaign automation, and Google Calendar sync. Outbound SMS costs $0.015 per segment; AI replies cost $0.020 each plus SMS. Inbound SMS is free.",
        "A $500+ wallet purchase unlocks the existing volume rate of $0.0135 per outbound SMS segment. Subscription and usage charges are separate. Sending requires completed messaging setup and registration approval."
      ]
    }
  ],
  "faq": [
    {
      "question": "Can I use older leads?",
      "answer": "Use leads whose permission covers text messages from your business. Lead age alone does not establish consent."
    },
    {
      "question": "Will every lead book an appointment?",
      "answer": "No. Results depend on the lead list, offer, timing, instructions, and availability. AI helps automate the follow-up and scheduling workflow."
    },
    {
      "question": "Is there a free trial?",
      "answer": "No. Payment is required at signup. Text2Sale is $39.99/month, with messaging and AI usage charged separately."
    }
  ],
  "relatedPages": [
    {
      "href": "/insurance-agents",
      "label": "Insurance agents"
    },
    {
      "href": "/life-insurance",
      "label": "Life insurance"
    },
    {
      "href": "/medicare",
      "label": "Medicare"
    },
    {
      "href": "/recruiters",
      "label": "Recruiters"
    },
    {
      "href": "/solar",
      "label": "Solar"
    },
    {
      "href": "/real-estate",
      "label": "Real estate"
    },
    {
      "href": "/roofing",
      "label": "Roofing"
    }
  ]
};

export default function Page() { return <SeoLandingPage {...content} />; }
