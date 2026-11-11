import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Best Follow-Up Cadence for Insurance Leads (Day-by-Day Plan) | Text2Sale",
  description:
    "A day-by-day follow-up cadence for insurance leads: when to call, when to text, how many attempts to make, and when to move a lead to long-term nurture.",
  alternates: { canonical: "/insurance-lead-follow-up-cadence" },
};

export default function Page() {
  return (
    <SeoLandingPage
      blogTags={["Insurance", "Follow-up", "Speed to lead", "Drip"]}
      eyebrow="Insurance Lead Follow-Up Cadence"
      title="The follow-up cadence that keeps insurance leads from slipping away."
      description="Most insurance leads need several touches before they answer, but most agents stop after one or two. A simple, written cadence of calls and texts over two weeks makes follow-up consistent and gives every lead a fair chance to convert."
      secondaryCta="See insurance follow-up software"
      secondaryHref="/insurance-lead-follow-up-software"
      canonicalPath="/insurance-lead-follow-up-cadence"
      sections={[
        { title: "Minute one", body: "Text and call within minutes of the lead arriving. The first agent to reach a shopped lead usually wins the conversation." },
        { title: "Days one to three", body: "Mix calls at different times of day with short texts. Most contacts happen in this window." },
        { title: "Days four to fourteen", body: "Space attempts out and change the angle: a question, a useful fact, a simple check-in." },
        { title: "Long-term nurture", body: "Leads that never answered move to a monthly or seasonal touch instead of being deleted." },
      ]}
      guideTitle="A day-by-day follow-up cadence for insurance leads"
      guide={[
        { heading: "Why a written cadence matters", paragraphs: ["Without a cadence, follow-up depends on memory and mood. Busy days push leads down the list, and by the time someone gets back to them the lead has bought elsewhere. A written plan turns follow-up into a checklist: every lead gets the same number of attempts at the right times, and managers can see who is falling behind."] },
        { heading: "A sample 14-day cadence", paragraphs: ["Adjust timing for your products and lead sources, but this pattern is a strong starting point for internet leads."], bullets: ["Day 1, minute 0: automatic text confirming the request and asking a simple question", "Day 1, minutes 1 to 5: first call; leave a short voicemail if no answer", "Day 1, afternoon or evening: second call at a different time", "Day 2: text with a specific question about their needs, then a call", "Day 3: call in the morning; if missed, a short check-in text", "Day 5: call plus a text offering two appointment times", "Day 7: final call of the first week and a friendly text", "Day 10: text asking whether they found coverage", "Day 14: close-the-loop text: should I keep your info on file?"] },
        { heading: "Stop when they answer, or ask you to", paragraphs: ["The cadence ends the moment a lead replies, books or opts out. Automated sequences must stop on a reply so the lead does not receive a canned message after they have already answered. An opt-out must end all messages immediately."] },
        { heading: "What to do with leads who never answer", paragraphs: ["Move them to a slow nurture: a short text every month or around enrollment periods and renewal dates. Some will respond months later when their situation changes. A lead you already paid for is cheaper to re-engage than a new one is to buy."] },
        { heading: "Automating the cadence in Text2Sale", paragraphs: ["Text2Sale runs the text side of the cadence with drip sequences that pause on reply, creates call tasks and callbacks for reps, and dials through due follow-ups with the power or predictive dialer. Quiet hours and opt-outs are applied automatically, and every touch is logged on one record."] },
      ]}
      faq={[
        { question: "How many times should I follow up with an insurance lead?", answer: "Many agents make six to ten attempts across calls and texts over the first two weeks, then move unresponsive leads to a slower nurture." },
        { question: "Should I call or text first?", answer: "Do both within the first few minutes. A text gives the lead a way to reply when they cannot talk, and the call catches them while they are still thinking about it." },
        { question: "What time of day is best to call insurance leads?", answer: "Try different times across the cadence, such as late morning, early evening and around lunch. Your own call data will show which hours work best for your leads." },
        { question: "Can follow-up be automated?", answer: "Yes. Text2Sale automates texts, reminders and callbacks so reps only handle live conversations and calls that are due." },
      ]}
      relatedPages={[
        { href: "/insurance-lead-follow-up-software", label: "Insurance lead follow-up software" },
        { href: "/predictive-dialer-for-insurance-agents", label: "Predictive dialer for insurance agents" },
        { href: "/ai-appointment-setter", label: "AI appointment setter" },
        { href: "/speed-to-lead-for-insurance-agents", label: "Speed to lead for insurance agents" },
        { href: "/why-insurance-leads-stop-responding", label: "Why insurance leads stop responding" },
      ]}
    />
  );
}
