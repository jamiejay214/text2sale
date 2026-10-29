import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import NoShowCalculator from "@/components/tools/NoShowCalculator";

export const metadata: Metadata = {
  title: "Appointment No-Show Cost Calculator for Insurance Agents | Text2Sale",
  description:
    "See what missed appointments cost your agency each month and how much you recover by cutting your no-show rate with confirmations and reminders.",
  alternates: { canonical: "/appointment-no-show-calculator" },
  openGraph: { title: "Appointment No-Show Calculator", description: "A free calculator that estimates revenue lost to missed sales appointments and the revenue recovered by lowering the no-show rate.", url: "/appointment-no-show-calculator", type: "website" },
};

export default function Page() {
  return (
    <ToolPage
      path="/appointment-no-show-calculator"
      name="Text2Sale Appointment No-Show Calculator"
      toolDescription="A free calculator that estimates revenue lost to missed sales appointments and the revenue recovered by lowering the no-show rate."
      eyebrow="Put a number on missed calls"
      title="What are no-shows costing you each month?"
      intro="Enter your weekly appointments, no-show rate, close rate and commission. The calculator shows the revenue that disappears with every missed call and what you get back by hitting a lower no-show rate."
      facts={[
        ["Most no-shows forget", "People rarely cancel on purpose. They forget, get busy or feel awkward rescheduling."],
        ["Book sooner", "Appointments set for the same or next day show up more often than ones a week out."],
        ["Remind twice", "A text the day before and an hour before catches most of the people who would forget."],
      ]}
      faq={[
        { question: "What is a normal no-show rate?", answer: "It varies by lead source and how far out the call is booked. Measure your own baseline, then track how reminders change it." },
        { question: "How do I reduce no-shows?", answer: "Book sooner, confirm by text right after booking, send reminders the day before and an hour before, and make rescheduling as easy as replying." },
        { question: "Can reminders be automated?", answer: "Yes. Text2Sale sends confirmations and reminders automatically when an appointment is booked." },
      ]}
      relatedPages={[
        { href: "/reduce-insurance-appointment-no-shows", label: "Reduce appointment no-shows" },
        { href: "/ai-appointment-setter", label: "AI appointment setter" },
        { href: "/ai-appointment-setter-for-life-insurance", label: "AI appointment setter for life insurance" },
        { href: "/follow-up-cadence-generator", label: "Follow-up cadence generator" },
      ]}
      ctaTitle="Want Text2Sale to send the reminders for you?"
      ctaBody="Appointments booked in Text2Sale get a confirmation and reminders automatically, and leads can reply to reschedule."
      ctaHref="/ai-appointment-setter"
      ctaLabel="See the AI appointment setter"
    >
      <NoShowCalculator />
    </ToolPage>
  );
}
