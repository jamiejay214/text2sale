import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "How to Text Aged Leads: Scripts and a Step-by-Step Plan | Text2Sale",
  description:
    "How to text aged insurance and sales leads: clean the list, segment, write a first message that gets replies, follow up, and move interested leads to a call. Scripts included.",
  alternates: { canonical: "/how-to-text-aged-leads" },
};

export default function Page() {
  return (
    <SeoLandingPage
      blogTags={["Reactivation", "SMS follow-up", "Scripts", "Insurance"]}
      eyebrow="How to Text Aged Leads"
      title="How to text aged leads so they reply instead of opting out."
      description="Aged leads are cheap and often written off, but many of them were simply not ready the first time. A short, honest text that reminds them who you are and asks one easy question can restart a surprising number of conversations. Here is the process and the scripts."
      secondaryCta="See old lead reactivation"
      secondaryHref="/reactivate-old-insurance-leads"
      canonicalPath="/how-to-text-aged-leads"
      sections={[
        { title: "Clean before you send", body: "Remove opt-outs, duplicates, landlines and anyone your permission does not cover. A smaller clean list beats a large messy one." },
        { title: "Segment the list", body: "Group by product, age and source so each message matches why the person originally reached out." },
        { title: "One question first", body: "Your first text should be short, name your business and ask a simple yes-or-no question." },
        { title: "Call the replies fast", body: "The value is in the replies. Route them to an agent or AI immediately and book a call while the lead is engaged." },
      ]}
      guideTitle="A step-by-step plan for texting aged leads"
      guide={[
        { heading: "Step 1: confirm who you can contact", paragraphs: ["Lead age does not decide whether you can text someone; permission does. Before you send anything, confirm that the consent you collected or bought covers texts from your business, then remove anyone who has opted out. Aged lists also collect wrong numbers and landlines, so run a cleanup first. This protects your number's reputation and keeps your reply rate meaningful."] },
        { heading: "Step 2: write a first message that sounds human", paragraphs: ["Aged leads do not remember you, so do not pretend they do. Introduce yourself, give a short reason for the text and ask one question. Avoid links, all caps and anything that looks like a promotion. Three examples that work well:"], bullets: ["\"Hi Maria, this is Jamie with Sunrise Insurance. You asked about health coverage a while back. Are you still looking for options this year?\"", "\"Hi Tom, Jamie here from Sunrise Insurance. Did you ever get your life insurance sorted, or is that still on the list?\"", "\"Hi Ana, it's Jamie with Sunrise Insurance. Rates changed since we last talked. Want me to check what's available for you?\""] },
        { heading: "Step 3: send in batches and watch the numbers", paragraphs: ["Send to a few hundred leads first, not the whole list. Watch replies, positive interest and opt-outs over the next day. If opt-outs are high, the message or the list needs work. If replies are healthy, scale up gradually. Sending in batches also makes sure your team can actually answer the replies that come in."] },
        { heading: "Step 4: follow up, then stop", paragraphs: ["One follow-up two or three days later often doubles the response. A short \"Just checking in, still interested?\" is enough. After two or three attempts with no reply, pause that lead and try again next season instead of texting every week."] },
        { heading: "Step 5: turn replies into appointments", paragraphs: ["When someone replies yes, offer two specific call times or a booking link and confirm by text. Text2Sale can route replies to a shared inbox, let AI qualify and book, and drop interested leads straight into a dialer queue so an agent calls within minutes."] },
      ]}
      faq={[
        { question: "How old is too old to text a lead?", answer: "There is no fixed cutoff. What matters is whether your permission to text still covers the message and whether the person still fits your market. Many agents see replies from leads that are months or even years old." },
        { question: "What reply rate should I expect from aged leads?", answer: "It varies widely with list quality, age and message. Start with a small batch and measure your own numbers before scaling." },
        { question: "Should I include a link in the first text?", answer: "Usually not. Links can look spammy and hurt delivery. Ask a question first and send details after the lead replies." },
        { question: "Can AI handle aged lead replies?", answer: "Yes. Text2Sale's AI can answer routine replies, ask qualifying questions and book appointments, with your team taking over at any time." },
      ]}
      relatedPages={[
        { href: "/reactivate-old-insurance-leads", label: "Reactivate old insurance leads" },
        { href: "/insurance-lead-follow-up-software", label: "Insurance lead follow-up software" },
        { href: "/ai-appointment-setter", label: "AI appointment setter" },
        { href: "/why-insurance-leads-stop-responding", label: "Why insurance leads stop responding" },
        { href: "/lead-reactivation-roi-calculator", label: "Lead reactivation ROI calculator" },
      ]}
    />
  );
}
