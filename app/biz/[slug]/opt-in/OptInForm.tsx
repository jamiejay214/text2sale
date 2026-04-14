"use client";

import { useState } from "react";

export default function OptInForm({
  businessName,
  slug,
}: {
  businessName: string;
  slug: string;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <section className="flex flex-1 items-center justify-center py-24 px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-gray-900">You&apos;re Signed Up!</h1>
          <p className="mt-4 text-gray-600">
            Thank you for opting in to receive SMS updates from {businessName}. You&apos;ll receive
            a confirmation text shortly.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Reply STOP at any time to unsubscribe. Message and data rates may apply.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-lg">
        <h1 className="text-3xl font-bold text-gray-900 text-center">Get SMS Updates</h1>
        <p className="mt-4 text-center text-gray-600">
          Sign up to receive updates, reminders, and personalized offers from {businessName} via
          text message.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                placeholder="Jamie"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                placeholder="Johnson"
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Mobile Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              placeholder="(555) 123-4567"
            />
          </div>

          {/* SMS Consent Checkbox — required by 10DLC */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                By checking this box and providing your mobile phone number, you consent to receive
                recurring marketing text messages (e.g., updates, appointment reminders, and
                promotional offers) from <strong>{businessName}</strong> at the phone number
                provided above. Message frequency varies. Message and data rates may apply. Reply{" "}
                <strong>STOP</strong> to unsubscribe at any time. Reply <strong>HELP</strong> for
                help.{" "}
                <strong>Consent is not a condition of purchase or enrollment.</strong> View our{" "}
                <a href={`/biz/${slug}/privacy-policy`} className="text-emerald-700 underline">
                  Privacy Policy
                </a>{" "}
                and{" "}
                <a href={`/biz/${slug}/terms`} className="text-emerald-700 underline">
                  Terms of Service
                </a>
                .
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-700 py-4 text-sm font-semibold text-white shadow hover:bg-emerald-800 transition"
          >
            Sign Up for SMS Updates
          </button>

          <p className="text-center text-xs text-gray-400">
            By signing up you agree to our{" "}
            <a href={`/biz/${slug}/privacy-policy`} className="underline">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href={`/biz/${slug}/terms`} className="underline">
              Terms of Service
            </a>
            .
          </p>
        </form>
      </div>
    </section>
  );
}
