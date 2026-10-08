import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  "title": "Turn roofing inquiries into booked estimate calls. | Text2Sale AI",
  "description": "Keep opted-in inspection and repair requests moving with AI follow-up, qualification, and scheduling.",
  "alternates": {
    "canonical": "/roofing"
  }
};

const content = {
  "eyebrow": "Text2Sale AI for roofing teams",
  "title": "Turn roofing inquiries into booked estimate calls.",
  "description": "Keep opted-in inspection and repair requests moving with AI follow-up, qualification, and scheduling. Upload your leads. Turn on AI. Text2Sale texts, qualifies, follows up, and books appointments for you.",
  "primaryCta": "Put My Leads on Autopilot",
  "secondaryCta": "Watch AI Book an Appointment",
  "secondaryHref": "/#ai-booking-demo",
  "canonicalPath": "/roofing",
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
      "title": "Prepare the next step",
      "body": "Record the homeowner\u2019s project interest and availability before your team confirms inspection logistics. Your team provides estimates and technical recommendations."
    }
  ],
  "guideTitle": "A practical workflow for roofing teams",
  "guide": [
    {
      "heading": "Give older inquiries a clear next step",
      "paragraphs": [
        "Confirm whether a homeowner still needs a roofing estimate, ask about the project, and offer time for a call.",
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
      "href": "/health-insurance",
      "label": "Health insurance"
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
    }
  ]
};

export default function Page() { return <SeoLandingPage {...content} />; }
