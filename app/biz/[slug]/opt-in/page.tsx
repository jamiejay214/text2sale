import { consentText, loadSite } from "@/lib/biz-site";
import { cleanBizMetadata } from "@/lib/biz-metadata";
import OptInForm from "./OptInForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = await loadSite(slug);
  if (!site) return { title: "Not Found" };
  return cleanBizMetadata({
    title: `SMS Opt-In | ${site.name}`,
    description: `Sign up to receive text messages from ${site.name}: ${site.industry.messageTypes}. Message frequency varies. Reply STOP to opt out at any time.`,
    canonical: site.canonical("/opt-in"),
  });
}

export default async function OptInPageWrapper({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = (await loadSite(slug, { required: true }))!;

  return (
    <OptInForm
      businessName={site.name}
      slug={slug}
      messageTypes={site.industry.messageTypes}
      consent={consentText(site.name, site.industry)}
      privacyHref={site.href("/privacy-policy")}
      termsHref={site.href("/terms")}
      supportEmail={site.contact.email}
      supportPhone={site.contact.phone}
    />
  );
}
