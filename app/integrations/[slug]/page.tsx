import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SeoLandingPage from "@/components/SeoLandingPage";
import { INTEGRATION_PAGES, getIntegration } from "@/lib/integrations-pages";

export const dynamicParams = false;

export function generateStaticParams() {
  return INTEGRATION_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = getIntegration(slug);
  if (!page) return { title: "Integration Not Found | Text2Sale" };
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: `/integrations/${page.slug}` },
  };
}

export default async function IntegrationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getIntegration(slug);
  if (!page) notFound();
  return (
    <SeoLandingPage
      eyebrow={page.eyebrow}
      title={page.title}
      description={page.description}
      primaryCta="Get started"
      secondaryCta="All integrations"
      secondaryHref="/integrations"
      sections={page.sections}
      guideTitle={page.guideTitle}
      guide={page.guide}
      faq={page.faq}
      canonicalPath={`/integrations/${page.slug}`}
      blogTags={page.blogTags}
      relatedPages={[
        ...INTEGRATION_PAGES.filter((other) => other.slug !== page.slug).map((other) => ({ href: `/integrations/${other.slug}`, label: other.name })),
        { href: "/demo", label: "Book a demo" },
      ]}
    />
  );
}
