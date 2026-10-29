import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "AI Appointment Setter for Life Insurance Agents | Text2Sale",
  description:
    "How life insurance agents use an AI appointment setter to reply to leads instantly, qualify interest, book calls on their calendar, and reduce no-shows.",
  alternates: { canonical: "/ai-appointment-setter-for-life-insurance" },
};

export default function Page() {
  return (
    <SeoLandingPage
      blogTags={["AI", "Appointments", "Insurance", "Speed to lead"]}
      eyebrow="AI Appointment Setter for Life Insurance"
      title="An AI appointment setter that books life insurance calls while you are on other calls."
      description="Life insurance leads are often curious but hesitant. They respond to a friendly, low-pressure text far more often than a cold call. An AI appointment setter replies instantly, asks a few simple questions and books the call, so your calendar fills while you focus on the conversations that close."
      secondaryCta="See the AI appointment setter"
      secondaryHref="/ai-appointment-setter"
      canonicalPath="/ai-appointment-setter-for-life-insurance"
      sections={[
        { title: "Instant, friendly replies", body: "AI texts new life leads within seconds and keeps the tone personal and low-pressure." },
        { title: "Light qualification", body: "It confirms coverage type, who the policy is for and the best time to talk, without asking for sensitive details by text." },
        { title: "Books on your calendar", body: "AI offers your open times and books the call, then sends reminders so more appointments show up." },
        { title: "Hands off to you", body: "As soon as a lead is booked or asks something complex, the conversation moves to you with the full history." },
      ]}
      guideTitle="How an AI appointment setter works for life insurance"
      guide={[
        { heading: "Why life leads need a softer first touch", paragraphs: ["Life insurance is a sensitive purchase. People think about family, health and money, and many are not ready to talk to an agent the moment they fill out a form. A phone call can feel like pressure. A short text that acknowledges their request and asks when would be a good time to talk gives them control, which makes them more likely to engage."] },
        { heading: "What the AI handles", paragraphs: ["A well-configured AI appointment setter takes care of the repetitive work between the lead arriving and the call starting."], bullets: ["Confirms the request and introduces your agency", "Asks whether the coverage is for them, a spouse or family", "Asks about general goals such as final expense, term or mortgage protection", "Offers two or three open appointment times", "Books the appointment and sends a confirmation", "Sends reminders before the call"] },
        { heading: "What should stay with the agent", paragraphs: ["Health history, beneficiaries, budget and product recommendations belong in a conversation with a licensed agent. Configure the AI to avoid those topics and to hand off right away if a lead raises them. That keeps sensitive information out of text threads and makes sure the advice comes from you."] },
        { heading: "Reducing no-shows", paragraphs: ["Booked calls only matter if the lead shows up. Send a confirmation right after booking, a reminder the day before and another an hour before. Make it easy to reschedule by replying. Text2Sale sends these reminders automatically and lets the lead reply to move the time."] },
        { heading: "Getting started with Text2Sale", paragraphs: ["Connect your Google Calendar, write a short description of your agency and the questions you want asked, and turn on AI replies for your life insurance leads. Review the first few dozen conversations and adjust the instructions. Your team can take over any thread at any time."] },
      ]}
      faq={[
        { question: "Can AI book life insurance appointments?", answer: "Yes. Text2Sale's AI can reply to leads, ask simple qualifying questions and book calls on your connected calendar." },
        { question: "Will the AI give coverage advice?", answer: "No. You configure it to schedule the conversation and hand off anything about coverage, health or pricing to a licensed agent." },
        { question: "Does it work with final expense leads?", answer: "Yes. Final expense agents use the same workflow, often with a slightly warmer tone and earlier handoff to a call." },
        { question: "How much does it cost?", answer: "AI replies are $0.02 each plus text segments, on top of a Text2Sale plan starting at $39.99 per month." },
      ]}
      relatedPages={[
        { href: "/ai-appointment-setter", label: "AI appointment setter" },
        { href: "/insurance-lead-follow-up-software", label: "Insurance lead follow-up software" },
        { href: "/ai-receptionist-for-insurance-agents", label: "AI receptionist for insurance agents" },
        { href: "/life-insurance-texting-crm", label: "Life insurance texting CRM" },
        { href: "/reduce-insurance-appointment-no-shows", label: "Reduce insurance appointment no-shows" },
      ]}
    />
  );
}
