export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <a href="/" className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Text2Sale
        </a>

        <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-zinc-500">Effective Date: April 9, 2026 &mdash; Website: www.text2sale.com</p>
        <p className="mt-1 text-sm text-zinc-500">Company Name: Text2Sale</p>

        <div className="mt-10 space-y-6 text-[15px] leading-relaxed text-zinc-300">
          <p>Text2Sale (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) operates a mass texting CRM platform that enables users to send SMS and MMS communications to their contacts. This Privacy Policy explains how we collect, use, store, and protect information when you use our platform. By accessing or using Text2Sale, you agree to this Privacy Policy.</p>

          <h2 className="text-xl font-semibold text-white pt-4">Information We Collect</h2>
          <p>We collect information that you provide directly to us, including your name, email address, phone number, account login credentials, billing and payment information, and any data you upload to the platform such as contact lists, phone numbers, and related information.</p>
          <p>We also automatically collect certain information including your IP address, device and browser type, usage data such as login activity and campaign history, and cookies or similar tracking technologies.</p>
          <p>Additionally, we collect messaging data including message content sent through the platform, delivery status such as delivered or failed messages, and recipient responses or engagement data.</p>

          <h2 className="text-xl font-semibold text-white pt-4">How We Use Your Information</h2>
          <p>We use your information to provide, operate, and maintain the platform, deliver SMS and MMS messages on your behalf, process payments and manage billing, improve system performance and user experience, monitor usage to prevent fraud or abuse, and comply with legal obligations.</p>

          <h2 className="text-xl font-semibold text-white pt-4">User Responsibilities &amp; Messaging Compliance</h2>
          <p>You are solely responsible for all messages sent using Text2Sale. By using our platform, you agree that you will obtain prior express consent (opt-in) from all recipients before sending messages and that you will comply with all applicable laws and regulations including the Telephone Consumer Protection Act (TCPA), CAN-SPAM Act, CTIA guidelines, and any applicable state or international laws. Text2Sale does not verify, monitor, or guarantee that your messaging practices are compliant.</p>

          <h2 className="text-xl font-semibold text-white pt-4">Limitation of Liability &amp; Indemnification</h2>
          <p>Text2Sale acts strictly as a technology platform and delivery service. We do not create, control, or approve the content of messages sent through our platform. We are not responsible or liable for the content of any messages you send, any legal claims, damages, fines, or penalties resulting from your messaging activity, or any misuse of the platform.</p>
          <p>You agree that you are fully and solely liable for all communications sent through Text2Sale. You further agree to indemnify, defend, and hold harmless Text2Sale from any claims, liabilities, damages, or expenses arising from your use of the platform, your messaging practices, or your violation of any law or regulation.</p>

          <h2 className="text-xl font-semibold text-white pt-4">Data Sharing</h2>
          <p>We do not sell your personal data. We may share information with messaging providers and carriers for the purpose of delivering messages, payment processors to handle billing and transactions, cloud hosting and infrastructure providers, and legal authorities if required by law.</p>

          <h2 className="text-xl font-semibold text-white pt-4">Data Retention</h2>
          <p>We retain information as long as your account remains active and as necessary to comply with legal, regulatory, or operational requirements. You may request deletion of your data by contacting us.</p>

          <h2 className="text-xl font-semibold text-white pt-4">Security</h2>
          <p>We implement commercially reasonable security measures including encryption, secure servers, and access controls to protect your information. However, no system is completely secure and we cannot guarantee absolute security.</p>

          <h2 className="text-xl font-semibold text-white pt-4">SMS Messaging Program</h2>
          <p>Text2Sale enables businesses to send SMS messages to their customers and leads. By opting in to receive messages from a Text2Sale user, recipients consent to receive recurring marketing, informational, and customer service text messages. Message frequency varies by campaign. Message and data rates may apply. Consent is not a condition of purchase.</p>
          <p>To opt out at any time, reply STOP to any message. For help, reply HELP or contact support@text2sale.com. Carriers are not liable for delayed or undelivered messages.</p>

          <h2 className="text-xl font-semibold text-white pt-4">Opt-Out &amp; Compliance Tools</h2>
          <p>Text2Sale provides tools such as STOP or opt-out handling and suppression (Do Not Contact) lists; however, you are responsible for honoring opt-out requests immediately and maintaining your own compliance with all applicable laws.</p>

          <h2 className="text-xl font-semibold text-white pt-4">Third-Party Services</h2>
          <p>Our platform relies on third-party providers for messaging delivery, payment processing, and hosting infrastructure. These providers operate under their own privacy policies and we are not responsible for their practices.</p>

          <h2 className="text-xl font-semibold text-white pt-4">Your Rights</h2>
          <p>You may have the right to access, correct, or request deletion of your data. To make a request, contact us at support@text2sale.com.</p>

          <h2 className="text-xl font-semibold text-white pt-4">Children&apos;s Privacy</h2>
          <p>Text2Sale is not intended for individuals under the age of 18 and we do not knowingly collect personal information from minors.</p>

          <h2 className="text-xl font-semibold text-white pt-4">Changes to This Policy</h2>
          <p>We may update this Privacy Policy at any time. Changes will be posted on this page with an updated effective date, and continued use of the platform constitutes acceptance of those changes.</p>

          <h2 className="text-xl font-semibold text-white pt-4">Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, you can contact us at support@text2sale.com.</p>
        </div>

        <div className="mt-16 border-t border-zinc-800 pt-6 text-center text-sm text-zinc-600">
          &copy; {new Date().getFullYear()} Text2Sale. All rights reserved.
        </div>
      </div>
    </main>
  );
}
