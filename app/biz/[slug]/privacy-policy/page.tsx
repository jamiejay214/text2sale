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
    title: `Privacy Policy | ${site.name}`,
    description: `Privacy policy for ${site.name}, including how SMS consent and mobile information are handled.`,
    canonical: site.canonical("/privacy-policy"),
  });
}

export default async function PrivacyPolicyPage({
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
        <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="text-sm text-gray-500">Last updated: {BIZ_LEGAL_UPDATED}</p>

        <h2 className="mt-8 text-xl font-semibold text-gray-900">1. Introduction</h2>
        <p className="mt-2 text-gray-700 leading-relaxed">
          {businessName} (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
          is committed to protecting your personal information and your right to privacy. This
          Privacy Policy describes the types of information we collect, how we use that
          information, and the choices available to you.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-gray-900">2. Information We Collect</h2>
        <p className="mt-2 text-gray-700 leading-relaxed">
          We may collect the following personal information when you interact with our website,
          opt-in forms, or services:
        </p>
        <ul className="mt-2 list-disc pl-6 text-gray-700 space-y-1">
          <li>Full name</li>
          <li>Email address</li>
          <li>Mobile phone number</li>
          <li>ZIP code or state of residence</li>
          <li>Service preferences and inquiries</li>
          <li>
            Text message consent records: the date and time you agreed to receive text messages,
            the wording you agreed to, and technical details such as your IP address and browser
            type, so that we can show when and how consent was given
          </li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold text-gray-900">3. How We Use Your Information</h2>
        <p className="mt-2 text-gray-700 leading-relaxed">We use the information we collect to:</p>
        <ul className="mt-2 list-disc pl-6 text-gray-700 space-y-1">
          <li>Provide you with the services you request</li>
          <li>
            Send you text messages ({industry.messageTypes}) if you have opted in to receive them
          </li>
          <li>Respond to your inquiries and provide customer support</li>
          <li>Improve our services and website experience</li>
          <li>Comply with applicable laws and regulations</li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold text-gray-900">
          4. Mobile Phone Number &amp; SMS Privacy
        </h2>
        <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-gray-800 leading-relaxed font-medium">
            We respect your mobile privacy. Your mobile phone number and any information collected
            through our SMS program will be handled in accordance with this policy. Specifically:
          </p>
          <ul className="mt-3 list-disc pl-6 text-gray-700 space-y-2">
            <li>
              <strong>
                No mobile information will be shared with third parties or affiliates for
                marketing or promotional purposes.
              </strong>{" "}
              We will not sell, rent, loan, trade, lease, or otherwise transfer your mobile phone
              number or any information collected through our SMS messaging program to any third
              party for marketing or promotional purposes.
            </li>
            <li>
              Text messaging originator opt-in data and consent records are excluded from any
              information sharing and will not be shared with any third party.
            </li>
            <li>
              Your mobile phone number will only be used to send you the text messages you have
              expressly consented to receive from {businessName}.
            </li>
            <li>
              We may share your mobile phone number with our messaging service providers solely
              to deliver messages on our behalf. Those providers may not use it for any other
              purpose and are obligated to protect it.
            </li>
            <li>
              We may disclose your mobile phone number if required by law, court order, or
              governmental request.
            </li>
          </ul>
        </div>

        <h2 className="mt-8 text-xl font-semibold text-gray-900">5. SMS Messaging Terms</h2>
        <p className="mt-2 text-gray-700 leading-relaxed">
          When you opt in to receive text messages from {businessName}:
        </p>
        <ul className="mt-2 list-disc pl-6 text-gray-700 space-y-1">
          <li>
            You will receive recurring text messages about {industry.messageTypes}.
          </li>
          <li>Message frequency varies.</li>
          <li>Message and data rates may apply.</li>
          <li>
            You may opt out at any time by replying <strong>STOP</strong> to any message.
          </li>
          <li>
            You may request help by replying <strong>HELP</strong> to any message
            {contact.email ? `, or by emailing us at ${contact.email}` : ""}.
          </li>
          <li>
            <strong>
              Consent to receive text messages is not a condition of purchase or enrollment in any
              product or service.
            </strong>
          </li>
        </ul>
        <p className="mt-2 text-gray-700 leading-relaxed">
          See our <a href={href("/terms")} className="text-emerald-700 underline">Terms of Service</a>{" "}
          for the full SMS program terms.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-gray-900">
          6. Data Sharing &amp; Third Parties
        </h2>
        <p className="mt-2 text-gray-700 leading-relaxed">
          We do not sell your personal information. We may share your information with:
        </p>
        <ul className="mt-2 list-disc pl-6 text-gray-700 space-y-1">
          <li>
            Service providers who assist us in operating our business (for example text message
            delivery and customer-management software), subject to confidentiality obligations
          </li>
          <li>Law enforcement or regulatory bodies when required by applicable law</li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold text-gray-900">7. Data Retention</h2>
        <p className="mt-2 text-gray-700 leading-relaxed">
          We keep your information for as long as needed to provide the services you requested and
          to keep records of your consent. You can ask us to delete your information at any time
          using the contact details below.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-gray-900">8. Data Security</h2>
        <p className="mt-2 text-gray-700 leading-relaxed">
          We implement reasonable administrative, technical, and physical safeguards to protect
          your personal information from unauthorized access, use, or disclosure. However, no
          method of transmission over the Internet or electronic storage is 100% secure.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-gray-900">9. Your Rights &amp; Choices</h2>
        <p className="mt-2 text-gray-700 leading-relaxed">You have the right to:</p>
        <ul className="mt-2 list-disc pl-6 text-gray-700 space-y-1">
          <li>
            Opt out of text messages at any time by replying <strong>STOP</strong>
          </li>
          {contact.email && (
            <li>
              Request access to, correction of, or deletion of your personal information by
              contacting us at {contact.email}
            </li>
          )}
          <li>Withdraw consent for future communications</li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold text-gray-900">10. Children&apos;s Privacy</h2>
        <p className="mt-2 text-gray-700 leading-relaxed">
          Our services are not directed to individuals under the age of 18. We do not knowingly
          collect personal information from children.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-gray-900">11. Changes to This Policy</h2>
        <p className="mt-2 text-gray-700 leading-relaxed">
          We may update this Privacy Policy from time to time. Any changes will be posted on this
          page with an updated &quot;Last updated&quot; date.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-gray-900">12. Contact Us</h2>
        <p className="mt-2 text-gray-700 leading-relaxed">
          If you have any questions about this Privacy Policy or our data practices, please contact
          us:
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
