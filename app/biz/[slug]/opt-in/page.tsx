import { notFound } from "next/navigation";
import { fetchBusiness, getBusinessName } from "@/lib/biz-fetch";
import { cleanBizMetadata } from "@/lib/biz-metadata";
import OptInForm from "./OptInForm";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const biz = await fetchBusiness(slug);
  if (!biz) return { title: "Not Found" };
  const name = getBusinessName(biz);
  return cleanBizMetadata({
    title: `SMS Opt-In | ${name}`,
    description: `Sign up to receive recurring SMS updates, appointment reminders, and promotional messages from ${name}. Reply STOP to opt out at any time.`,
  });
}

export default async function OptInPageWrapper({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const biz = await fetchBusiness(slug);
  if (!biz) notFound();

  return <OptInForm businessName={getBusinessName(biz)} slug={slug} />;
}
