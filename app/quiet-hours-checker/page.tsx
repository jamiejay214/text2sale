import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import QuietHoursChecker from "@/components/QuietHoursChecker";

export const metadata: Metadata = {
  title: "Quiet Hours Checker: Can I Text or Call This Lead Now? | Text2Sale",
  description:
    "Pick a lead's state to see their local time and whether you are inside the allowed calling and texting window, including states with stricter hours than the federal 8 AM–9 PM rule.",
  alternates: { canonical: "/quiet-hours-checker" },
  openGraph: {
    title: "Free Quiet Hours Checker for Calls and Texts",
    description: "Check a lead's local time and the allowed contact window before you call or text.",
    url: "/quiet-hours-checker",
    type: "website",
  },
};

export default function Page() {
  return (
    <ToolPage
      path="/quiet-hours-checker"
      name="Text2Sale Quiet Hours Checker"
      toolDescription="A free tool that shows a lead's local time by state and whether it falls inside the allowed window for sales calls and texts."
      eyebrow="Contact leads at the right time"
      title="Can I text or call this lead right now?"
      intro="Choose the lead's state. The checker shows their local time, the contact window that applies there and whether you are inside it. It includes states that set stricter hours than the federal rule."
      facts={[
        ["Their time, not yours", "Contact windows are based on the recipient's local time. A 7:30 PM text from Florida reaches California at 4:30 PM, but an 8:30 PM text sent from California reaches Florida at 11:30 PM."],
        ["Some states are stricter", "Florida, Oklahoma, Maryland, Washington, Connecticut and Texas set narrower windows than the federal 8 AM–9 PM rule."],
        ["Automate it", "Text2Sale checks quiet hours by each contact's state: campaign texts wait for the window to open and one-off texts are blocked until it does."],
      ]}
      faq={[
        { question: "What hours can I text leads?", answer: "Federal rules limit telemarketing calls and texts to 8 AM–9 PM in the recipient's local time. Several states set narrower windows, so check the lead's state." },
        { question: "Do quiet hours apply to texts as well as calls?", answer: "Generally yes. Texts are treated like calls under federal telemarketing rules, and many state laws explicitly include text messages." },
        { question: "What about leads who text me first?", answer: "Replying to a message the lead just sent is different from starting a sales conversation, but many teams still keep replies inside normal hours unless the lead asks otherwise." },
        { question: "Is this legal advice?", answer: "No. Laws change and depend on your situation. Use this as a quick check and confirm the rules with your compliance advisor." },
      ]}
      relatedPages={[
        { href: "/10dlc-compliant-texting", label: "10DLC compliant texting" },
        { href: "/insurance-lead-follow-up-cadence", label: "Insurance lead follow-up cadence" },
        { href: "/speed-to-lead-for-insurance-agents", label: "Speed to lead for insurance agents" },
        { href: "/insurance-lead-follow-up-software", label: "Insurance lead follow-up software" },
        { href: "/predictive-dialer-for-insurance-agents", label: "Predictive dialer for insurance agents" },
      ]}
      ctaTitle="Let Text2Sale watch the clock for you."
      ctaBody="Text2Sale checks quiet hours by each contact's state before sending and suppresses opt-outs automatically."
      ctaHref="/10dlc-compliant-texting"
      ctaLabel="See compliant texting"
    >
      <QuietHoursChecker />
    </ToolPage>
  );
}
