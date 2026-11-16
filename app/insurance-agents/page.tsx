import type { Metadata } from "next";
import InsuranceHero from "@/components/InsuranceHero";
import InsuranceWalkthrough from "@/components/InsuranceWalkthrough";
import SeoLandingPage from "@/components/SeoLandingPage";
import { INSURANCE_AGENTS_EXTRAS } from "@/lib/money-page-extras";

export const metadata: Metadata = {
  "title": "Insurance Agent CRM for Texting, Follow-Up and Calls | Text2Sale",
  "description": "See how insurance agents follow up on opted-in quote requests by text, manage replies and make callbacks. Try the interactive example and compare CRM plans.",
  "alternates": {
    "canonical": "/insurance-agents"
  }
};

const content = {
  "eyebrow": "Insurance agent CRM",
  "title": "Follow up on insurance quotes without losing the next call.",
  "description": "Import a list of opted-in leads, read their replies, and keep callback notes beside each contact. Start with texting, add a dialer, or use both when your agency needs one place to follow up.",
  "primaryCta": "Compare plans and usage",
  "secondaryCta": "Try the quote walkthrough",
  "secondaryHref": "#quote-walkthrough",
  "canonicalPath": "/insurance-agents",
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
      "title": "Keep advice with the agent",
      "body": "Use AI for basic qualification and scheduling. Coverage recommendations and policy decisions stay with your licensed team."
    }
  ],
  "guideTitle": "A practical workflow for insurance agents",
  "guide": [
    {
      "heading": "Give older inquiries a clear next step",
      "paragraphs": [
        "Follow up with an older quote request, confirm whether the prospect still wants help, and offer a time with a licensed agent.",
        "Use existing contact history to guide the follow-up. Send from your business identity and keep conversations and appointments in one workspace."
      ]
    },
    {
      "heading": "One workspace, transparent usage",
      "paragraphs": [
        "Text2Sale Text is $39.99/month with AI appointment booking, CRM, campaign automation, and Google Calendar sync. Outbound SMS costs $0.015 per segment; AI replies cost $0.020 each plus SMS. Inbound SMS is free.",
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
      "answer": "No. Payment is required at signup. Plans are $39.99/month (Text), $89.99 (Dialer) or $119.99 (Complete), with calling, messaging and AI usage charged separately."
    }
  ],
  "relatedPages": [
    {
      "href": "/health-insurance",
      "label": "Health insurance"
    },
    {
      "href": "/life-insurance",
      "label": "Life insurance"
    },
    {
      "href": "/predictive-dialer-for-insurance-agents",
      "label": "Insurance predictive dialer"
    },
    {
      "href": "/ai-receptionist-for-insurance-agents",
      "label": "Insurance AI receptionist"
    },
    {
      "href": "/insurance-text-templates",
      "label": "Free insurance text templates"
    }
  ],
  "blogTags": [
    "Insurance",
    "Appointments"
  ]
};

export default function Page() { return <SeoLandingPage
      extras={INSURANCE_AGENTS_EXTRAS} {...content} customHero={<InsuranceHero />} primaryHref="/pricing" afterHero={<InsuranceWalkthrough />} foundingAgentOffer />; }
