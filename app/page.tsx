"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser, signupUser } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [error, setError] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (mode === "login") handleLogin();
      else handleSignup();
    }
  };

  const handleLogin = async () => {
    setError("");
    if (!loginEmail.trim()) return setError("Email is required.");
    if (!loginPassword.trim()) return setError("Password is required.");

    setLoading(true);
    const result = await loginUser(loginEmail, loginPassword);
    setLoading(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    router.push("/dashboard");
  };

  const handleSignup = async () => {
    setError("");
    if (!firstName.trim()) return setError("First name is required.");
    if (!lastName.trim()) return setError("Last name is required.");
    if (!signupEmail.trim()) return setError("Email is required.");
    if (!phone.trim()) return setError("Phone number is required.");
    if (!password.trim()) return setError("Password is required.");
    if (!confirmPassword.trim()) return setError("Confirm password is required.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (!agreedToPrivacy) return setError("You must read and agree to the Privacy Policy before signing up.");

    setLoading(true);
    const result = await signupUser({
      firstName,
      lastName,
      email: signupEmail,
      phone,
      password,
      referralCode,
    });
    setLoading(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        <div className="hidden lg:flex lg:items-center lg:justify-center bg-gradient-to-br from-violet-900/80 via-zinc-900 to-zinc-950 border-r border-zinc-800">
          <div className="max-w-xl px-10">
            <div className="text-sm uppercase tracking-[0.2em] text-violet-300">
              SMS Marketing CRM
            </div>
            <div className="mt-4 text-5xl font-bold tracking-tight">Text2Sale</div>
            <div className="mt-4 text-lg leading-8 text-zinc-400">
              One simple plan. Log in, upload leads, choose a campaign, and start texting.
            </div>

            <div className="mt-10 rounded-3xl border border-zinc-700 bg-zinc-800/60 p-6 backdrop-blur">
              <div className="text-3xl font-bold text-emerald-400">$39.99 <span className="text-lg font-normal text-zinc-400">/ month</span></div>
              <div className="mt-2 text-zinc-400">$0.012 per text message</div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 text-center">
                <div className="text-2xl font-bold text-violet-400">CSV</div>
                <div className="mt-1 text-xs text-zinc-500">Import Leads</div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 text-center">
                <div className="text-2xl font-bold text-sky-400">SMS</div>
                <div className="mt-1 text-xs text-zinc-500">Campaigns</div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 text-center">
                <div className="text-2xl font-bold text-amber-400">CRM</div>
                <div className="mt-1 text-xs text-zinc-500">Conversations</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-xl rounded-3xl border border-zinc-800 bg-zinc-900 p-8" onKeyDown={handleKeyDown}>
            <div className="mb-6">
              <div className="text-3xl font-bold text-white">Text2Sale</div>
              <div className="mt-2 text-sm text-zinc-400">
                {mode === "login"
                  ? "Log in to your account and start texting."
                  : "Create your account and go straight to your dashboard."}
              </div>
            </div>

            <div className="mb-6 flex rounded-2xl bg-zinc-800 p-1">
              <button
                onClick={() => { setMode("login"); setError(""); }}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  mode === "login" ? "bg-violet-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                }`}
              >
                Login
              </button>
              <button
                onClick={() => { setMode("signup"); setError(""); }}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  mode === "signup" ? "bg-violet-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                }`}
              >
                Create Account
              </button>
            </div>

            {mode === "login" ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">Email</label>
                  <input
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-violet-500"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">Password</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-violet-500"
                    placeholder="Enter your password"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl bg-red-950 px-4 py-3 text-sm text-red-200 ring-1 ring-red-800">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full rounded-2xl bg-violet-600 px-5 py-4 font-semibold text-white hover:bg-violet-700 transition disabled:opacity-50"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>

                <div className="text-center text-sm text-zinc-500">
                  New here?{" "}
                  <button onClick={() => { setMode("signup"); setError(""); }} className="font-medium text-violet-400 hover:text-violet-300">
                    Create an account
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-300">First name</label>
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-violet-500" placeholder="Enter first name" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-300">Last name</label>
                    <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-violet-500" placeholder="Enter last name" />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">Email</label>
                  <input value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-violet-500" placeholder="Enter email" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">Phone number</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-violet-500" placeholder="Enter phone number" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-300">Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-violet-500" placeholder="Enter password" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-300">Confirm password</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-violet-500" placeholder="Confirm password" />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">Referral Code (Optional — deposit $50 and you both get $50 free!)</label>
                  <input value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 font-mono uppercase tracking-wider text-white outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-zinc-500 focus:ring-1 focus:ring-violet-500" placeholder="e.g. T2S-ABC123" />
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-400">
                  <div className="font-semibold text-white">Plan: Text2Sale Package</div>
                  <div className="mt-1">$39.99 per month</div>
                  <div>$0.012 per text message</div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToPrivacy}
                    onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-600 bg-zinc-800 accent-violet-600"
                  />
                  <span className="text-sm text-zinc-400">
                    I have read and fully understand the{" "}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setShowPrivacyPolicy(true); }}
                      className="font-medium text-violet-400 underline hover:text-violet-300"
                    >
                      Privacy Policy
                    </button>
                    , and I agree to all terms and conditions outlined within it.
                  </span>
                </label>

                {error && (
                  <div className="rounded-2xl bg-red-950 px-4 py-3 text-sm text-red-200 ring-1 ring-red-800">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSignup}
                  disabled={loading}
                  className="w-full rounded-2xl bg-violet-600 px-5 py-4 font-semibold text-white hover:bg-violet-700 transition disabled:opacity-50"
                >
                  {loading ? "Creating account..." : "Sign Up"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Privacy Policy Modal */}
      {showPrivacyPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-3xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h2 className="text-xl font-bold text-white">Privacy Policy</h2>
              <button
                onClick={() => setShowPrivacyPolicy(false)}
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-zinc-300 space-y-4">
              <p className="text-xs text-zinc-500">Effective Date: April 9, 2026 &mdash; Website: www.text2sale.com</p>

              <p>Text2Sale (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) operates a mass texting CRM platform that enables users to send SMS and MMS communications to their contacts. This Privacy Policy explains how we collect, use, store, and protect information when you use our platform. By accessing or using Text2Sale, you agree to this Privacy Policy.</p>

              <h3 className="text-base font-semibold text-white pt-2">Information We Collect</h3>
              <p>We collect information that you provide directly to us, including your name, email address, phone number, account login credentials, billing and payment information, and any data you upload to the platform such as contact lists, phone numbers, and related information.</p>
              <p>We also automatically collect certain information including your IP address, device and browser type, usage data such as login activity and campaign history, and cookies or similar tracking technologies.</p>
              <p>Additionally, we collect messaging data including message content sent through the platform, delivery status such as delivered or failed messages, and recipient responses or engagement data.</p>

              <h3 className="text-base font-semibold text-white pt-2">How We Use Your Information</h3>
              <p>We use your information to provide, operate, and maintain the platform, deliver SMS and MMS messages on your behalf, process payments and manage billing, improve system performance and user experience, monitor usage to prevent fraud or abuse, and comply with legal obligations.</p>

              <h3 className="text-base font-semibold text-white pt-2">User Responsibilities &amp; Messaging Compliance</h3>
              <p>You are solely responsible for all messages sent using Text2Sale. By using our platform, you agree that you will obtain prior express consent (opt-in) from all recipients before sending messages and that you will comply with all applicable laws and regulations including the Telephone Consumer Protection Act (TCPA), CAN-SPAM Act, CTIA guidelines, and any applicable state or international laws. Text2Sale does not verify, monitor, or guarantee that your messaging practices are compliant.</p>

              <h3 className="text-base font-semibold text-white pt-2">Limitation of Liability &amp; Indemnification</h3>
              <p>Text2Sale acts strictly as a technology platform and delivery service. We do not create, control, or approve the content of messages sent through our platform. We are not responsible or liable for the content of any messages you send, any legal claims, damages, fines, or penalties resulting from your messaging activity, or any misuse of the platform.</p>
              <p>You agree that you are fully and solely liable for all communications sent through Text2Sale. You further agree to indemnify, defend, and hold harmless Text2Sale from any claims, liabilities, damages, or expenses arising from your use of the platform, your messaging practices, or your violation of any law or regulation.</p>

              <h3 className="text-base font-semibold text-white pt-2">Data Sharing</h3>
              <p>We do not sell your personal data. We may share information with messaging providers and carriers for the purpose of delivering messages, payment processors to handle billing and transactions, cloud hosting and infrastructure providers, and legal authorities if required by law.</p>

              <h3 className="text-base font-semibold text-white pt-2">Data Retention</h3>
              <p>We retain information as long as your account remains active and as necessary to comply with legal, regulatory, or operational requirements. You may request deletion of your data by contacting us.</p>

              <h3 className="text-base font-semibold text-white pt-2">Security</h3>
              <p>We implement commercially reasonable security measures including encryption, secure servers, and access controls to protect your information. However, no system is completely secure and we cannot guarantee absolute security.</p>

              <h3 className="text-base font-semibold text-white pt-2">Opt-Out &amp; Compliance Tools</h3>
              <p>Text2Sale provides tools such as STOP or opt-out handling and suppression (Do Not Contact) lists; however, you are responsible for honoring opt-out requests immediately and maintaining your own compliance with all applicable laws.</p>

              <h3 className="text-base font-semibold text-white pt-2">Third-Party Services</h3>
              <p>Our platform relies on third-party providers for messaging delivery, payment processing, and hosting infrastructure. These providers operate under their own privacy policies and we are not responsible for their practices.</p>

              <h3 className="text-base font-semibold text-white pt-2">Your Rights</h3>
              <p>You may have the right to access, correct, or request deletion of your data. To make a request, contact us at support@text2sale.com.</p>

              <h3 className="text-base font-semibold text-white pt-2">Children&apos;s Privacy</h3>
              <p>Text2Sale is not intended for individuals under the age of 18 and we do not knowingly collect personal information from minors.</p>

              <h3 className="text-base font-semibold text-white pt-2">Changes to This Policy</h3>
              <p>We may update this Privacy Policy at any time. Changes will be posted on this page with an updated effective date, and continued use of the platform constitutes acceptance of those changes.</p>

              <h3 className="text-base font-semibold text-white pt-2">Contact Us</h3>
              <p>If you have any questions about this Privacy Policy, you can contact us at support@text2sale.com.</p>
            </div>

            <div className="border-t border-zinc-800 px-6 py-4">
              <button
                onClick={() => { setShowPrivacyPolicy(false); setAgreedToPrivacy(true); }}
                className="w-full rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-700 transition"
              >
                I Have Read and Agree to the Privacy Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
