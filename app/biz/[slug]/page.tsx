import Link from "next/link";
import type { Metadata } from "next";
import { loadSite } from "@/lib/biz-site";
import { cleanBizMetadata } from "@/lib/biz-metadata";

// ─── The cookie-cutter business site ──────────────────────────────────────
// Every customer gets this same page, filled in from their own details: name,
// industry, description, address and contact info. Carriers read it during
// brand and campaign review, so it states plainly who the business is, what
// it does, how to reach it, and exactly what the text-message program is and
// how to join or leave it — nothing more elaborate than that is needed, and
// nothing here is invented beyond what the customer told us.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const site = await loadSite(slug);
  if (!site) return { title: "Business Not Found" };

  return cleanBizMetadata({
    title: `${site.name} | Official Business Page`,
    description: site.description,
    canonical: site.canonical(""),
  });
}

export default async function BizHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = (await loadSite(slug, { required: true }))!;
  const { name, contact, industry, description, href } = site;
  const where = [contact.city, contact.state].filter(Boolean).join(", ");

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-emerald-700 to-emerald-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl">{industry.headline}</h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-emerald-100">{description}</p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href={href("/opt-in")}
              className="rounded-xl bg-white px-8 py-4 text-sm font-semibold text-emerald-800 shadow-lg hover:bg-emerald-50 transition"
            >
              {industry.cta}
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

      {/* What We Offer */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900 sm:text-4xl">What We Offer</h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-gray-500">
            {name} is a {industry.businessNoun}
            {where ? ` based in ${where}` : ""}. Here is how we can help.
          </p>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {industry.services.map((svc) => (
              <div
                key={svc.title}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-6 transition hover:border-emerald-300 hover:shadow-md"
              >
                <h3 className="text-lg font-semibold text-emerald-800">{svc.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{svc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Text message program */}
      <section id="sms-program" className="bg-emerald-50 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-2xl font-bold text-gray-900">Text Message Updates</h2>
          <p className="mt-4 text-center text-gray-600">
            {name} offers an optional text message program. If you sign up, you will receive {industry.messageTypes}.
          </p>
          <ul className="mx-auto mt-6 max-w-xl list-disc space-y-1.5 pl-6 text-sm text-gray-700">
            <li>You join by submitting your mobile number on our <Link href={href("/opt-in")} className="text-emerald-700 underline">sign-up page</Link> and agreeing to receive texts.</li>
            <li>Message frequency varies. Message and data rates may apply.</li>
            <li>Reply <strong>STOP</strong> at any time to cancel, or <strong>HELP</strong> for help.</li>
            <li>Consent is not a condition of any purchase.</li>
            <li>We never share your mobile number or opt-in data with third parties for marketing purposes.</li>
          </ul>
          <div className="mt-8 text-center">
            <Link
              href={href("/opt-in")}
              className="inline-block rounded-xl bg-emerald-700 px-8 py-4 text-sm font-semibold text-white shadow hover:bg-emerald-800 transition"
            >
              Sign Up for Text Updates
            </Link>
          </div>
          <p className="mt-6 text-center text-xs text-gray-500">
            See our <Link href={href("/privacy-policy")} className="underline">Privacy Policy</Link> and{" "}
            <Link href={href("/terms")} className="underline">Terms of Service</Link>.
          </p>
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
                    <a href={`tel:${contact.phone.replace(/\D/g, "")}`} className="text-emerald-700 hover:underline">
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
    </>
  );
}
