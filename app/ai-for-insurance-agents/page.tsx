import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "AI for Insurance Agents: Practical Uses That Book More Appointments | Text2Sale",
  description:
    "Where AI actually helps insurance agents: instant lead replies, qualification, appointment booking, answering inbound calls, and follow-up. Practical uses, limits, and how to start.",
  alternates: { canonical: "/ai-for-insurance-agents" },
};

export default function Page() {
  return (
    <SeoLandingPage
      blogTags={["AI", "Insurance", "Appointments", "Automation"]}
      eyebrow="AI for Insurance Agents"
      title="AI for insurance agents: let it handle the first reply, keep humans on the close."
      description="AI is most useful to insurance agents in the moments when nobody is available: the lead that texts at 10 PM, the inbound call during a client meeting, the hundredth follow-up that never gets sent. Here is where it helps, where it does not, and how to start."
      secondaryCta="See the AI appointment setter"
      secondaryHref="/ai-appointment-setter"
      canonicalPath="/ai-for-insurance-agents"
      sections={[
        { title: "Instant replies to new leads", body: "AI answers inbound texts in seconds, asks a few qualifying questions and keeps the lead engaged until a person can call." },
        { title: "Appointment booking", body: "AI offers open times from your calendar and books the call, so interested leads do not wait for a rep to see the message." },
        { title: "Answering inbound calls", body: "An AI receptionist picks up when your team is busy, collects details and routes hot callers to a live agent." },
        { title: "Consistent follow-up", body: "AI keeps conversations moving across hundreds of leads without the gaps that happen when reps get busy." },
      ]}
      guideTitle="Practical ways insurance agents use AI today"
      guide={[
        { heading: "Use AI where speed matters more than expertise", paragraphs: ["Most insurance leads are lost in the first hour, not in the final pitch. The lead filled out a form, did not hear back quickly, and moved on to the agent who replied first. AI is well suited to that first hour because it can reply instantly, any time of day, with a friendly message that confirms what the lead asked for and asks one simple question.", "The close still belongs to a licensed agent. Product recommendations, plan comparisons and anything that needs judgment about a client's health, budget or family situation should stay with a person. A good setup uses AI to start and organize conversations and hands them to an agent at the right moment."] },
        { heading: "Five uses that pay off quickly", paragraphs: ["Agents who get value from AI usually start with narrow, repetitive jobs rather than trying to automate the whole sale."], bullets: ["Replying to new web leads within seconds with a short, personal text", "Asking qualifying questions such as coverage type, household size or current carrier", "Offering appointment times and booking them on your calendar", "Answering inbound calls after hours or when every agent is on the phone", "Re-engaging older leads with a simple check-in and routing the replies"] },
        { heading: "Set guardrails before you turn it on", paragraphs: ["Write down what the AI is allowed to say and what it should hand off. Most agencies tell it not to quote prices, not to give coverage advice and to pass any complaint or complicated question to a human. Review a sample of conversations each week during the first month and adjust the instructions.", "Keep compliance basics in place. Contact leads only when you have appropriate permission, identify your business in the first message, honor opt-outs immediately and avoid texting outside reasonable hours. Text2Sale enforces STOP suppression and quiet hours on AI messages the same way it does for human ones."] },
        { heading: "Measure what changes", paragraphs: ["Track the time to first reply, the share of leads that respond, the number of appointments booked and how many of those appointments show up. Compare the month before AI with the month after. If replies go up but appointments do not, adjust the questions or hand off earlier. If appointments go up but show rates fall, add reminders."] },
        { heading: "How Text2Sale puts AI to work", paragraphs: ["Text2Sale includes AI text replies that qualify and book, an AI receptionist for inbound calls, and the texting, dialing and calendar tools around them. Your team sees every AI conversation in the same inbox and can take over at any point with one click."] },
      ]}
      faq={[
        { question: "Can AI sell insurance on its own?", answer: "No. AI can start conversations, qualify interest and book appointments, but recommending and selling coverage should be done by a licensed agent." },
        { question: "Will leads know they are talking to AI?", answer: "You decide how your AI introduces itself. Many agencies keep the tone personal and let the AI hand off to a named agent for the call." },
        { question: "What does AI cost in Text2Sale?", answer: "AI text replies are $0.02 each plus the text segments. AI receptionist calls are $0.18 per minute. Both are paid from your prepaid wallet." },
        { question: "Is AI hard to set up?", answer: "No. You give it your business details, the questions you want asked and your calendar, then review conversations as they come in." },
      ]}
      relatedPages={[
        { href: "/ai-appointment-setter", label: "AI appointment setter" },
        { href: "/ai-receptionist-for-insurance-agents", label: "AI receptionist for insurance agents" },
        { href: "/insurance-lead-follow-up-software", label: "Insurance lead follow-up software" },
        { href: "/ai-appointment-setter-for-life-insurance", label: "AI appointment setter for life insurance" },
        { href: "/speed-to-lead-for-insurance-agents", label: "Speed to lead for insurance agents" },
      ]}
    />
  );
}
