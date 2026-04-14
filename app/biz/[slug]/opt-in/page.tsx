import { notFound } from "next/navigation";
import { fetchBusiness, getBusinessName } from "@/lib/biz-fetch";
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
  return { title: `SMS Opt-In | ${getBusinessName(biz)}` };
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
