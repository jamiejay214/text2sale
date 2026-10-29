import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "How to Reduce Insurance Appointment No-Shows | Text2Sale",
  description:
    "Practical ways insurance agents cut no-shows: book sooner, confirm by text, send reminders, make rescheduling easy, and follow up fast when someone misses a call.",
  alternates: { canonical: "/reduce-insurance-appointment-no-shows" },
};

export default function Page() {
  return (
    <SeoLandingPage
      blogTags={["Appointments", "Insurance", "Automation", "Follow-up"]}
      eyebrow="Reduce Insurance Appointment No-Shows"
      title="Fewer no-shows: book sooner, confirm by text and make rescheduling easy."
      description="Every missed appointment costs you the time you blocked and often the lead itself. Most no-shows are not rejections; people forget, get busy or feel awkward cancelling. A few simple habits around booking and reminders can bring a lot of those calls back."
      secondaryCta="See the AI appointment setter"
      secondaryHref="/ai-appointment-setter"
      canonicalPath="/reduce-insurance-appointment-no-shows"
      sections={[
        { title: "Book close to the moment", body: "Appointments booked for the same day or next day show up far more often than ones set a week out." },
        { title: "Confirm by text", body: "A confirmation right after booking makes the appointment feel real and gives the lead your number." },
        { title: "Remind twice", body: "A reminder the day before and an hour before catches most of the people who would forget." },
        { title: "Make rescheduling easy", body: "Let leads reply to move the time. A rescheduled call is far better than a silent no-show." },
      ]}
      guideTitle="A no-show reduction plan for insurance agents"
      guide={[
        { heading: "Why insurance appointments get missed", paragraphs: ["Most no-shows are not a firm no. The lead forgot, got pulled into something, did not recognize the number when you called, or felt uncomfortable saying they needed to reschedule. Each of these has a simple fix, and together they can make a noticeable difference in your show rate."] },
        { heading: "Book sooner", paragraphs: ["The longer the gap between booking and the call, the more chances for life to get in the way. Offer times within the next 24 hours whenever possible. If the lead is engaged right now, offer to call in the next 15 minutes."] },
        { heading: "Confirm and remind by text", paragraphs: ["A good reminder sequence is short and personal."], bullets: ["Right after booking: confirm the day, time and who will call", "The day before: a friendly reminder with an easy way to reschedule", "One hour before: a short heads-up so they keep their phone nearby", "At the time of the call: call from the same number they have been texting"] },
        { heading: "Follow up fast after a miss", paragraphs: ["If the lead does not answer, text right away: \"Sorry I missed you, is now still a good time or should we pick another?\" Many missed appointments turn into same-day calls with this one message. Try again later that day before marking the lead as a no-show."] },
        { heading: "Track your show rate", paragraphs: ["Measure the percentage of booked appointments that happen, by lead source and by how far out they were booked. If appointments booked more than two days out show up much less often, tighten your booking window. Text2Sale tracks appointments, sends confirmations and reminders automatically and lets leads reply to reschedule."] },
      ]}
      faq={[
        { question: "What is a normal no-show rate for insurance appointments?", answer: "It varies by lead source and booking method. Measure your own baseline first, then track how reminders and faster booking change it." },
        { question: "How many reminders should I send?", answer: "Two is a good starting point: one the day before and one about an hour before the call." },
        { question: "Should reminders be texts or emails?", answer: "Texts are usually seen faster. Many agents send both, with the text as the main reminder." },
        { question: "Can reminders be automated?", answer: "Yes. Text2Sale sends confirmations and reminders automatically when an appointment is booked." },
      ]}
      relatedPages={[
        { href: "/ai-appointment-setter", label: "AI appointment setter" },
        { href: "/insurance-lead-follow-up-software", label: "Insurance lead follow-up software" },
        { href: "/ai-receptionist-for-insurance-agents", label: "AI receptionist for insurance agents" },
        { href: "/ai-appointment-setter-for-life-insurance", label: "AI appointment setter for life insurance" },
        { href: "/blog/sales-appointment-no-shows-causes-and-fixes", label: "Sales appointment no-shows: causes and fixes" },
      ]}
    />
  );
}
