import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Recruiting Texting CRM | Text2Sale",
  description: "Text2Sale is a recruiting texting CRM for teams that need mass texting, candidate follow-up, AI replies, appointment setting, and 2-way conversations.",
  alternates: { canonical: "/recruiting-texting-crm" },
};

export default function Page() {
  return (
    <SeoLandingPage
      blogTags={["Recruiting", "Staffing", "Sales teams"]}
      eyebrow="Recruiting Texting CRM"
      title="Recruiting texting CRM for faster candidate follow-up and booked interviews."
      description="Text2Sale helps recruiting teams and agency leaders text candidates, manage replies, follow up after interviews, use AI-assisted responses, and keep conversations organized from one dashboard."
      sections={[
        { title: "Reach candidates faster", body: "Use SMS campaigns to follow up with applicants, referrals, no-shows, and warm recruiting leads." },
        { title: "Book more interviews", body: "Move interested candidates toward interview times, quick calls, or next-step conversations." },
        { title: "AI-assisted replies", body: "Use AI support to answer common questions and keep recruiting conversations moving when your team is busy." },
        { title: "Organized team inbox", body: "Keep candidate replies, notes, and follow-up conversations in one place instead of scattered across phones." }
      ]}
      bullets={["Candidate texting", "Interview follow-up", "AI replies", "Mass SMS campaigns", "Team inbox", "Recruiting outreach"]}
      noteTitle="Best fit"
      noteBody="Text2Sale is a strong fit for recruiting teams that need to reach candidates quickly and manage high-volume SMS conversations without losing track of interested people."
      canonicalPath="/recruiting-texting-crm"
      guideTitle="Texting candidates from application to first day"
      guide={[
        {
          heading: "Reply to applicants the same day",
          paragraphs: [
            "Good candidates apply to several roles at once and tend to go with whoever engages them first. They also screen unknown calls and rarely read recruiting email quickly. A text sent within minutes of an application is often the difference between an interview and a candidate who has already accepted something else.",
            "Be specific. A vague message reads like a scam, which is exactly what candidates are watching for. Name yourself, the company, and the role, then offer two interview times. If applications reach Text2Sale through a connected form or integration, the first message can go out automatically, and every reply lands in one inbox your recruiting team can work.",
          ],
          bullets: [
            "\"Hi Jordan, this is Priya with Summit Staffing about the warehouse lead role in Tulsa. Do you have 10 minutes today? I have 11:00 or 3:30.\"",
            "\"Interview confirmed: Thursday at 2:00 with Dana. Parking is behind the building. Reply C to confirm.\"",
          ],
        },
        {
          heading: "Cut interview and first-day no-shows",
          paragraphs: [
            "Most no-shows are logistics failures rather than lost interest. The candidate forgot the time, could not find the building, or did not know who to ask for. A confirmation when the interview is booked, a reminder the day before, and a morning-of message with the address and contact name recover a surprising number of them.",
            "The same pattern works for start dates. A day-before text with arrival time, what to bring, and who to ask for makes the first day smoother and shows the new hire your team is organized.",
          ],
        },
        {
          heading: "Recruit by text without crossing the line",
          paragraphs: [
            "Texting people who applied, or who opted in through your careers page, is standard practice. Cold texting names scraped from job boards or license lists is different: those people never agreed to hear from you, and unsolicited texts can violate carrier rules and consent laws.",
            "Keep a clear opt-in on your application forms, identify your company in every first message, and honor opt-outs right away. Text2Sale records opt-outs automatically and blocks future messages to that number, which protects both the candidate experience and your sending reputation.",
          ],
        },
      ]}
      faq={[
        {
          question: "Can I text job applicants?",
          answer: "Yes, when they applied or opted in to receive texts from you. Include your company name and opt-out instructions, and keep messages about the application process.",
        },
        {
          question: "Is it okay to cold text candidates from job boards?",
          answer: "It is risky. People whose numbers you found on a job board or license list did not agree to texts from you, and unsolicited texts can violate consent laws and carrier rules. Build an opt-in list through applications and your careers page instead.",
        },
        {
          question: "Can a recruiting manager see the team's conversations?",
          answer: "Yes. Recruiters join your team with a team code, and team management lets a manager see each recruiter's contacts, campaigns, and candidate conversations instead of having them scattered across personal phones.",
        },
        {
          question: "Can AI answer candidate questions?",
          answer: "On the Text2Sale + AI plan, AI can reply to routine questions and help schedule interviews. You can turn it off for any conversation and step in yourself.",
        },
      ]}
      relatedPages={[
        {
          href: "/sales-team-texting-crm",
          label: "Sales team texting CRM",
        },
        {
          href: "/mass-texting-crm",
          label: "Mass texting CRM",
        },
        {
          href: "/ai-texting-crm",
          label: "AI texting CRM",
        },
        {
          href: "/10dlc-compliant-texting",
          label: "10DLC compliant texting",
        },
      ]}
    />
  );
}
