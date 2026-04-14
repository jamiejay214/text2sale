import { notFound } from "next/navigation";
import { fetchBusiness, getBusinessName, getBusinessContact } from "@/lib/biz-fetch";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const biz = await fetchBusiness(slug);
  if (!biz) return { title: "Not Found" };
  return { title: `Terms of Service | ${getBusinessName(biz)}` };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const biz = await fetchBusiness(slug);
  if (!biz) notFound();

  const businessName = getBusinessName(biz);
  const contact = getBusinessContact(biz);
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-3xl prose prose-gray prose-emerald">
        <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
        <p className="text-sm text-gray-500">Last updated: {today}</p>

        <h2 className="mt-8 text-xl font-semibold text-gray-900">1. Agreement to Terms</h2>
        <p className="mt-2 text-gray-700 leading-relaxed">
          By accessing or using the website and services of {businessName} (&quot;Company,&quot;
          &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by these Terms
          of Service. If you do not agree, please do not use our services.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-gray-900">2. Services</h2>
        <p className="mt-2 text-gray-700 leading-relaxed">
          {businessName} provides professional services to its customers. The specific scope of
          services is described on our website or communicated to you directly. We reserve the
          right to modify or discontinue services at any time.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-gray-900">3. SMS Messaging</h2>
        <p className="mt-2 text-gray-700 leading-relaxed">
          By opting in to our SMS program, you agree to receive recurring marketing text messages
          from {businessName} at the mobile number you provide. These messages may include updates,
          reminders, and promotional offers.
        </p>
        <ul className="mt-2 list-disc pl-6 text-gray-700 space-y-1">
          <li>Message frequency varies.</li>
          <li>Message and data rates may apply.</li>
          <li>
            Reply <strong>STOP</strong> to cancel. Reply <strong>HELP</strong> for help.
          </li>
          <li>
            <strong>
              Consent to receive text messages is not a condition of purchase or enrollment.
            </strong>
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
          or opting in to our SMS program. We are not responsible for errors resulting from
          inaccurate information you provide.
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
