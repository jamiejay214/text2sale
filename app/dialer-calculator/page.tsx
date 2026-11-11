import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import DialerCalculator from "@/components/tools/DialerCalculator";

export const metadata: Metadata = {
  title: "Dialer Calculator: Manual vs Power vs Predictive Dialing | Text2Sale",
  description:
    "Estimate monthly conversations from manual, power and predictive dialing based on your reps, hours, dials per hour and contact rate.",
  alternates: { canonical: "/dialer-calculator" },
  openGraph: { title: "Dialer Call-Volume Calculator", description: "A free calculator comparing monthly conversations from manual, power and predictive dialing.", url: "/dialer-calculator", type: "website" },
};

export default function Page() {
  return (
    <ToolPage
      path="/dialer-calculator"
      name="Text2Sale Dialer Call-Volume Calculator"
      toolDescription="A free calculator comparing monthly conversations from manual, power and predictive dialing."
      eyebrow="Compare dialing modes"
      title="How many more conversations would a dialer get your team?"
      intro="Enter your team size, dialing hours and contact rate. Compare how many conversations manual, power and predictive dialing produce each month at the dials per hour you expect."
      facts={[
        ["Power dialing", "Calls the next lead as soon as the last call ends, removing dialing and waiting time."],
        ["Predictive dialing", "Dials several numbers at once and connects the first person who answers."],
        ["Pick by list", "Predictive suits large, low-answer lists; power suits fresh leads where every answer matters."],
      ]}
      faq={[
        { question: "How many dials per hour can a rep make?", answer: "It depends on the mode, list and how long reps spend on notes. Time your team for an hour in each mode and enter the real numbers." },
        { question: "Is predictive dialing always better?", answer: "No. It produces more conversations on large lists but can drop calls when two people answer at once. Power dialing is safer on fresh, high-value leads." },
        { question: "Does Text2Sale include a predictive dialer?", answer: "Yes, on the Dialer and Complete plans, dialing up to three lines." },
      ]}
      relatedPages={[
        { href: "/power-dialer-vs-predictive-dialer", label: "Power dialer vs predictive dialer" },
        { href: "/predictive-dialer-for-insurance-agents", label: "Predictive dialer for insurance agents" },
        { href: "/text2sale-vs-phoneburner", label: "Text2Sale vs PhoneBurner" },
        { href: "/quiet-hours-checker", label: "Quiet hours checker" },
      ]}
      ctaTitle="Want to see it on your own leads?"
      ctaBody="Text2Sale's dialer switches between manual, power and predictive per list, with texts and notes on screen during every call."
      ctaHref="/predictive-dialer-for-insurance-agents"
      ctaLabel="See the dialer"
    >
      <DialerCalculator />
    </ToolPage>
  );
}
