import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Final Expense Texting CRM | Text2Sale",
  description: "Text2Sale is a final expense texting CRM for agents who need bulk SMS campaigns, lead follow-up, AI replies, appointment setting, and 2-way conversations.",
  alternates: { canonical: "/final-expense-texting-crm" },
};

export default function Page() {
  return (
    <SeoLandingPage
      blogTags={["Final Expense", "Insurance"]}
      eyebrow="Final Expense Texting CRM"
      title="Final expense texting CRM for faster follow-up and more booked appointments."
      description="Text2Sale helps final expense agents text prospects, revive aged leads, manage replies, use AI-assisted follow-up, and move interested people toward a call or appointment."
      sections={[
        { title: "Work aged leads by text", body: "Restart conversations with final expense prospects who ignored calls or never completed the quoting process." },
        { title: "Manage objections", body: "Keep price questions, timing concerns, coverage interest, and appointment requests organized inside one inbox." },
        { title: "AI-assisted replies", body: "Use AI support to answer faster and guide interested prospects toward a real conversation." },
        { title: "Campaign follow-up", body: "Send campaigns, track replies, handle opt-outs, and keep every lead conversation connected to your sales workflow." }
      ]}
      bullets={["Final expense lead texting", "Aged lead reactivation", "AI replies", "Appointment setting", "Mass SMS campaigns", "2-way inbox"]}
      noteTitle="Best fit"
      noteBody="Text2Sale is a strong fit for final expense agents who need better speed-to-lead, more consistent follow-up, and a cleaner way to manage texting conversations."
      canonicalPath="/final-expense-texting-crm"
      guideTitle="A final expense follow-up system that respects the buyer"
      guide={[
        {
          heading: "Lead with reassurance, not a pitch",
          paragraphs: [
            "Final expense is an emotional purchase. Buyers are thinking about their family and funeral costs, not product features, and many are older adults who are cautious about unknown numbers and wary of scams. The first text needs to feel calm, identify you clearly, and make replying feel safe.",
            "A good opener names you and your agency, references the request they made, and asks one easy question. For example: \"Hi Linda, this is Marcus with Liberty Final Expense. You asked about coverage to help your family with funeral costs. Is this still something you're looking into? Reply STOP to opt out.\"",
          ],
        },
        {
          heading: "Follow up more than once, and space it out",
          paragraphs: [
            "Final expense buyers are often slow to respond, and a lead who ignored Tuesday's message may answer on Saturday. Agents who give up after one or two attempts leave a lot of placed policies on the table. A steady, polite sequence over one to two weeks catches people when they are ready.",
            "Use Text2Sale drip campaigns to schedule the sequence and stop it automatically when someone replies or opts out. Send during daytime hours in the lead's time zone. Early morning and evening messages feel intrusive to this audience and draw complaints.",
          ],
          bullets: [
            "Day 1: introduction and one question",
            "Day 2: a short follow-up offering two call times",
            "Day 4: a plain-language answer to a common question, such as how much coverage costs",
            "Day 7: a check-in that makes it easy to say not now",
            "Day 14: a final message that leaves the door open",
          ],
        },
        {
          heading: "Handle the price question honestly",
          paragraphs: [
            "\"How much does it cost?\" is the most common reply. Premiums depend on age, health, coverage amount, and whether the policy is simplified issue or guaranteed issue, so a single number by text is usually misleading. Give an honest range if you can, explain what changes the price, and invite a short call to get an exact quote.",
            "Be clear about how the policy works. Many guaranteed issue policies have a graded death benefit during the first two or three years, and buyers who learn that after the fact feel misled. Explaining it up front builds the trust that closes final expense sales and keeps policies in force.",
          ],
        },
      ]}
      faq={[
        {
          question: "How many times should I text a final expense lead?",
          answer: "A sequence of four to six messages over one to two weeks works well for most agents. Stop as soon as the lead replies or opts out, and send during daytime hours in their time zone.",
        },
        {
          question: "Should I quote prices by text?",
          answer: "Give an honest range if you can, but exact premiums depend on age, health, and the policy type. Use the text to explain what affects the price and set up a short call for an accurate quote.",
        },
        {
          question: "Can I text aged final expense leads?",
          answer: "Only if the lead's consent covers texts from you. Check the consent language from your lead source. For leads you can contact, a respectful reactivation message with a clear opt-out works well.",
        },
        {
          question: "Does Text2Sale stop a drip when someone replies?",
          answer: "Yes. Drip sequences stop when a contact replies or opts out, so a lead who is already talking to you does not keep receiving automated follow-ups.",
        },
      ]}
      relatedPages={[
        {
          href: "/sms-crm-for-insurance-agents",
          label: "SMS CRM for insurance agents",
        },
        {
          href: "/health-insurance-texting-crm",
          label: "Health insurance texting CRM",
        },
        {
          href: "/life-insurance-texting-crm",
          label: "Life insurance texting CRM",
        },
        {
          href: "/medicare-agent-texting-crm",
          label: "Medicare agent texting CRM",
        },
        {
          href: "/10dlc-compliant-texting",
          label: "10DLC compliant texting",
        },
      ]}
    />
  );
}
