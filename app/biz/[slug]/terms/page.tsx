import { BIZ_LEGAL_UPDATED, loadSite } from "@/lib/biz-site";
import { cleanBizMetadata } from "@/lib/biz-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = await loadSite(slug);
  if (!site) return { title: "Not Found" };
  return cleanBizMetadata({
    title: `Terms of Service | ${site.name}`,
    description: `Terms of service for ${site.name}, including SMS messaging terms.`,
    canonical: site.canonical("/terms"),
  });
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = (await loadSite(slug, { required: true }))!;
  const { name: businessName, contact, href, industry } = site;

  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-3xl prose prose-gray prose-emerald">
        <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
        <p className="text-sm text-gray-500">Last updated: {BIZ_LEGAL_UPDATED}</p>

        <h2 className="mt-8 text-xl font-semibold text-gray-900">1. Agreement to Terms</h2>
        <p className="mt-2 text-gray-700 leading-relaxed">
          By accessing or using the website and services of {businessName} (&quot;Company,&quot;
          &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by these Terms
          of Service. If you do not agree, please do not use our services.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-gray-900">2. Services</h2>
        <p className="mt-2 text-gray-700 leading-relaxed">
          {businessName} is a {industry.businessNoun}. The specific scope of services is described
          on our website or communicated to you directly. We reserve the right to modify or
          discontinue services at any time.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-gray-900">3. SMS Text Messaging Program</h2>
        <p className="mt-2 text-gray-700 leading-relaxed">
          These terms apply to the {businessName} text message program (the &quot;Program&quot;).
          By opting in, you agree to receive recurring text messages from {businessName} at the
          mobile number you provide.
        </p>
        <ul className="mt-2 list-disc pl-6 text-gray-700 space-y-2">
          <li>
            <strong>Program description:</strong> You will receive {industry.messageTypes}.
          </li>
          <li>
            <strong>How to join:</strong> You join by submitting your mobile number and checking the
            consent box on our{" "}
            <a href={href("/opt-in")} className="text-emerald-700 underline">opt-in page</a>, or by
            giving written consent to {businessName}. You must be 18 or older and the account holder
            or authorized user of the mobile number.
          </li>
          <li>
            <strong>Message frequency:</strong> Message frequency varies.
          </li>
          <li>
            <strong>Cost:</strong> Message and data rates may apply, according to your mobile plan.
          </li>
          <li>
            <strong>How to opt out:</strong> Reply <strong>STOP</strong> to any message at any time.
            You will receive one final message confirming you have been unsubscribed, and no
            further messages will be sent. To rejoin, reply <strong>START</strong> or sign up
            again.
          </li>
          <li>
            <strong>Help:</strong> Reply <strong>HELP</strong> to any message
            {contact.email ? `, email ${contact.email}` : ""}
            {contact.phone ? `, or call ${contact.phone}` : ""} for assistance.
          </li>
          <li>
            <strong>Carriers:</strong> Wireless carriers and their affiliates are not liable for
            delayed or undelivered messages.
          </li>
          <li>
            <strong>Not a condition of purchase:</strong> Consent to receive text messages is not a
            condition of purchasing any goods or services.
          </li>
          <li>
            <strong>Privacy:</strong> Our{" "}
            <a href={href("/privacy-policy")} className="text-emerald-700 underline">Privacy Policy</a>{" "}
            explains how we handle your information. Mobile information is not shared with third
            parties or affiliates for marketing or promotional purposes.
          </li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold text-gray-900">4. No Professional Advice</h2>
        <p className="mt-2 text-gray-700 leading-relaxed">
          The information provided through our website and text messages is for informational
          purposes only and does not constitute legal, financial, medical, or other professional
          advice. You should consult a qualified professional before making any decisions based on
          the information provided.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-gray-900">5. Accuracy of Information</h2>
        <p className="mt-2 text-gray-700 leading-relaxed">
          You agree to provide accurate, current, and complete information when using our services
          or opting in to our text message program. We are not responsible for errors resulting
          from inaccurate information you provide.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-gray-900">6. Limitation of Liability</h2>
        <p className="mt-2 text-gray-700 leading-relaxed">
          To the maximum extent permitted by law, {businessName} shall not be liable for any
          indirect, incidental, special, consequential, or punitive damages arising from your use
          of our services or reliance on any information provided.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-gray-900">7. Changes to Terms</h2>
        <p className="mt-2 text-gray-700 leading-relaxed">
          We reserve the right to update these Terms at any time. Changes will be posted on this
          page with an updated date. Continued use of our services constitutes acceptance of the
          revised Terms.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-gray-900">8. Contact Us</h2>
        <p className="mt-2 text-gray-700 leading-relaxed">
          If you have any questions about these Terms, please contact us:
        </p>
        <ul className="mt-2 list-none pl-0 text-gray-700 space-y-1">
          <li>
            <strong>{businessName}</strong>
          </li>
          {contact.email && <li>Email: {contact.email}</li>}
          {contact.phone && <li>Phone: {contact.phone}</li>}
          {contact.address && <li>Address: {contact.address}</li>}
        </ul>
      </div>
    </section>
  );
}
