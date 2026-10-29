import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Why Insurance Leads Stop Responding (and How to Fix It) | Text2Sale",
  description:
    "The most common reasons insurance leads go silent: slow response, too few attempts, spammy texts, wrong timing, bad data. How to diagnose each one and get conversations back.",
  alternates: { canonical: "/why-insurance-leads-stop-responding" },
};

export default function Page() {
  return (
    <SeoLandingPage
      blogTags={["Insurance", "Follow-up", "Speed to lead", "Deliverability"]}
      eyebrow="Why Insurance Leads Stop Responding"
      title="Why insurance leads stop responding, and what to do about each reason."
      description="When leads go quiet, it is tempting to blame the lead vendor. Often the real causes are on the follow-up side: response time, the number of attempts, how the messages read and when they are sent. Most of these can be fixed within a week."
      secondaryCta="See insurance follow-up software"
      secondaryHref="/insurance-lead-follow-up-software"
      canonicalPath="/why-insurance-leads-stop-responding"
      sections={[
        { title: "You reached them too late", body: "A shopped lead that hears from three other agents first rarely answers the fourth." },
        { title: "You stopped too early", body: "Many leads answer on the fourth or fifth attempt. Stopping after two leaves most of the value on the table." },
        { title: "Your texts look like spam", body: "Links, long messages and pushy language get ignored or filtered." },
        { title: "The data is bad", body: "Wrong numbers, landlines and duplicates make healthy follow-up look like silence." },
      ]}
      guideTitle="How to diagnose and fix silent insurance leads"
      guide={[
        { heading: "Check your speed to lead first", paragraphs: ["Look at the time between a lead arriving and your first call or text. If it is more than a few minutes, that is the most likely reason for low contact rates. Shopped internet leads are contacted by several agents, and the first one to start a real conversation usually wins. Automating an instant first text and call task is the single biggest fix for most agencies."] },
        { heading: "Count your attempts", paragraphs: ["Pull ten recent leads that never answered and count how many times each was contacted. Many agencies find the number is two or three. A written cadence of six to ten touches across calls and texts over two weeks gives every lead a real chance and usually raises contact rates noticeably."] },
        { heading: "Read your messages out loud", paragraphs: ["Texts that sound like ads get ignored. Each message should name your business, sound like a person and ask one easy question. Avoid links in the first message, all caps and phrases like \"limited time\". If you see many opt-outs or no replies at all, rewrite the first text before blaming the list."] },
        { heading: "Look for delivery and data problems", paragraphs: ["If replies suddenly drop, your messages may not be delivered. Check that your number is registered for business texting, look at delivery reports and watch for carrier filtering. On the data side, remove landlines, duplicates and numbers that fail repeatedly."], bullets: ["Delivery rate dropping: review registration, content and sending volume", "Lots of wrong numbers: talk to the lead vendor with specific data", "Replies but no appointments: make booking easier and faster", "Appointments but no shows: add confirmations and reminders"] },
        { heading: "How Text2Sale keeps leads responding", paragraphs: ["Text2Sale sends an instant first text, queues calls in the dialer, runs follow-up sequences that stop on reply, and lets AI answer routine questions and book calls. Delivery status, replies and outcomes show on each lead so you can see exactly where conversations stall."] },
      ]}
      faq={[
        { question: "Why do my insurance leads not answer the phone?", answer: "Most often because they were contacted too late, by an unknown number, or only once or twice. A fast first text plus several calls at different times helps." },
        { question: "Are my texts being blocked?", answer: "They might be. Unregistered numbers, links and promotional language can trigger carrier filtering. Check delivery reports and make sure your number is registered." },
        { question: "How do I know if the lead vendor is the problem?", answer: "Track contact rate, wrong numbers and appointments by source. If one source is far worse than others with the same follow-up, the vendor is likely the issue." },
        { question: "Can old silent leads still convert?", answer: "Yes. Many leads who went quiet were simply not ready. A short re-engagement text months later can restart the conversation." },
      ]}
      relatedPages={[
        { href: "/insurance-lead-follow-up-software", label: "Insurance lead follow-up software" },
        { href: "/reactivate-old-insurance-leads", label: "Reactivate old insurance leads" },
        { href: "/predictive-dialer-for-insurance-agents", label: "Predictive dialer for insurance agents" },
        { href: "/insurance-lead-follow-up-cadence", label: "Insurance lead follow-up cadence" },
        { href: "/how-to-text-aged-leads", label: "How to text aged leads" },
      ]}
    />
  );
}
