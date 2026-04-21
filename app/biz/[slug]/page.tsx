import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchBusiness, getBusinessName, getBusinessContact } from "@/lib/biz-fetch";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const biz = await fetchBusiness(slug);
  if (!biz) return { title: "Business Not Found" };

  const name = getBusinessName(biz);
  const description =
    biz.business_description ||
    `${name} is a licensed insurance agency dedicated to helping individuals, families, and businesses find affordable, comprehensive coverage that fits their needs.`;

  return {
    title: `${name} | Official Business Page`,
    description,
    openGraph: { title: name, description, type: "website" },
    robots: { index: true, follow: true },
  };
}

// Insurance-focused service grid — matches the jjjohnsonhealth.org design.
// These are generic enough to work for any licensed agency on the platform.
const SERVICES = [
  {
    title: "Individual & Family Plans",
    desc: "ACA-compliant plans, short-term coverage, and supplemental options tailored to your budget.",
  },
  {
    title: "Medicare Solutions",
    desc: "Medicare Advantage, Supplement, and Part D plans to ensure you get the care you need.",
  },
  {
    title: "Life Insurance",
    desc: "Term and whole-life policies to protect the people who matter most.",
  },
];

export default async function BizHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const biz = await fetchBusiness(slug);
  if (!biz) notFound();

  const businessName = getBusinessName(biz);
  const contact = getBusinessContact(biz);
  const description =
    biz.business_description ||
    `${businessName} is a licensed insurance brokerage dedicated to helping individuals, families, and businesses find affordable, comprehensive coverage that fits their needs.`;

  return (
    <>
      {/* Hero — emerald gradient, centered content, two CTAs */}
      <section className="bg-gradient-to-br from-emerald-700 to-emerald-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl">
            Insurance Made Simple
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-emerald-100">
            {description}
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href={`/biz/${slug}/opt-in`}
              className="rounded-xl bg-white px-8 py-4 text-sm font-semibold text-emerald-800 shadow-lg hover:bg-emerald-50 transition"
            >
              Get a Free Quote
            </Link>
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="rounded-xl border border-emerald-400 px-8 py-4 text-sm font-semibold text-white hover:bg-emerald-800 transition"
              >
                Contact Us
              </a>
            )}
          </div>
        </div>
      </section>

      {/* What We Offer — three service cards */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900 sm:text-4xl">
            What We Offer
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-gray-500">
            We work with top carriers to find the best rates and coverage for your unique situation.
          </p>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((svc) => (
              <div
                key={svc.title}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-6 transition hover:border-emerald-300 hover:shadow-md"
              >
                <h3 className="text-lg font-semibold text-emerald-800">
                  {svc.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {svc.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      {(contact.phone || contact.email || contact.address) && (
        <section className="bg-gray-50 py-16">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Get in Touch</h2>
            <dl className="mt-8 space-y-3 text-gray-700">
              {contact.phone && (
                <div>
                  <dt className="inline font-medium text-gray-500">Phone: </dt>
                  <dd className="inline">
                    <a
                      href={`tel:${contact.phone.replace(/\D/g, "")}`}
                      className="text-emerald-700 hover:underline"
                    >
                      {contact.phone}
                    </a>
                  </dd>
                </div>
              )}
              {contact.email && (
                <div>
                  <dt className="inline font-medium text-gray-500">Email: </dt>
                  <dd className="inline">
                    <a href={`mailto:${contact.email}`} className="text-emerald-700 hover:underline">
                      {contact.email}
                    </a>
                  </dd>
                </div>
              )}
              {contact.address && (
                <div>
                  <dt className="inline font-medium text-gray-500">Address: </dt>
                  <dd className="inline">{contact.address}</dd>
                </div>
              )}
            </dl>
          </div>
        </section>
      )}

      {/* CTA — Stay in the loop */}
      <section className="bg-emerald-50 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Stay in the Loop</h2>
          <p className="mt-4 text-gray-600">
            Sign up to receive updates, reminders, and personalized offers from {businessName} via text message.
          </p>
          <Link
            href={`/biz/${slug}/opt-in`}
            className="mt-8 inline-block rounded-xl bg-emerald-700 px-8 py-4 text-sm font-semibold text-white shadow hover:bg-emerald-800 transition"
          >
            Sign Up for SMS Updates
          </Link>
        </div>
      </section>
    </>
  );
}
