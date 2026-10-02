"use client";

import { useEffect, useRef, useState } from "react";

// The SMS sign-up form carriers review. The consent box starts unchecked, the
// disclosure sits right next to it, and the policy links are on the form — the
// things a reviewer checks. Submitting records the consent (with the exact
// wording shown) server-side; this component never claims more than the server
// confirms.

export default function OptInForm({
  businessName,
  slug,
  messageTypes,
  consent: consentWording,
  privacyHref,
  termsHref,
  supportEmail,
  supportPhone,
}: {
  businessName: string;
  slug: string;
  messageTypes: string;
  consent: string;
  privacyHref: string;
  termsHref: string;
  supportEmail: string;
  supportPhone: string;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  // Honeypot: real visitors never see or fill this; form-filling bots do.
  const [trap, setTrap] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const [confirmationSent, setConfirmationSent] = useState(false);
  // When the form was first shown, to tell a person from a script that
  // posts instantly.
  const startedAt = useRef<number | null>(null);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    setError("");

    if (!consent) {
      setError("Please check the box to agree to receive text messages.");
      return;
    }
    setState("sending");

    try {
      const res = await fetch("/api/opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          firstName,
          lastName,
          phone,
          consent,
          consentText: consentWording,
          hp: trap,
          elapsedMs: startedAt.current ? Date.now() - startedAt.current : undefined,
          page: window.location.href,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || "We couldn't save your sign-up. Please check your number and try again.");
        setState("idle");
        return;
      }
      setConfirmationSent(!!data.confirmationSent);
      setState("done");
    } catch {
      // Don't pretend it worked: a consent that wasn't recorded isn't consent.
      setError("We couldn't reach the server. Please try again.");
      setState("idle");
    }
  };

  if (state === "done") {
    return (
      <section className="flex flex-1 items-center justify-center py-24 px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-gray-900">You&apos;re signed up</h1>
          <p className="mt-4 text-gray-600">
            Thank you for opting in to receive text messages from {businessName}.{" "}
            {confirmationSent
              ? "We just sent a confirmation text to your phone."
              : `You'll hear from ${businessName} soon.`}
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Reply STOP at any time to unsubscribe, or HELP for help. Message and data rates may apply.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-lg">
        <h1 className="text-3xl font-bold text-gray-900 text-center">Get Text Updates</h1>
        <p className="mt-4 text-center text-gray-600">
          Sign up to receive text messages from {businessName}: {messageTypes}.
        </p>

        <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <dt className="font-medium text-gray-500">Program</dt>
          <dd>{businessName} text updates</dd>
          <dt className="font-medium text-gray-500">Frequency</dt>
          <dd>Message frequency varies</dd>
          <dt className="font-medium text-gray-500">Cost</dt>
          <dd>Message and data rates may apply</dd>
          <dt className="font-medium text-gray-500">Stop</dt>
          <dd>Reply STOP at any time</dd>
          <dt className="font-medium text-gray-500">Help</dt>
          <dd>
            Reply HELP
            {supportEmail ? `, or email ${supportEmail}` : ""}
            {supportPhone ? `, or call ${supportPhone}` : ""}
          </dd>
        </dl>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                required
                maxLength={60}
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
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
                maxLength={60}
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
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
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              placeholder="(555) 123-4567"
            />
          </div>

          {/* Off-screen field for bots; not display:none, which some skip. */}
          <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
            <label htmlFor="company-website">Leave this field empty</label>
            <input
              id="company-website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={trap}
              onChange={(e) => setTrap(e.target.value)}
            />
          </div>

          {/* SMS consent — unchecked by default, disclosure beside the box */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                {consentWording} View our{" "}
                <a href={privacyHref} className="text-emerald-700 underline">
                  Privacy Policy
                </a>{" "}
                and{" "}
                <a href={termsHref} className="text-emerald-700 underline">
                  Terms of Service
                </a>
                .
              </span>
            </label>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={state === "sending"}
            className="w-full rounded-xl bg-emerald-700 py-4 text-sm font-semibold text-white shadow hover:bg-emerald-800 transition disabled:opacity-60"
          >
            {state === "sending" ? "Signing you up…" : "Sign Up for Text Updates"}
          </button>
        </form>
      </div>
    </section>
  );
}
