"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser, signupUser } from "@/lib/auth";
import Logo from "@/components/Logo";

export default function HomePage() {
  const router = useRouter();

  // Track page view
  useEffect(() => {
    fetch("/api/track-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "/", referrer: document.referrer }),
    }).catch(() => {});
  }, []);

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
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"standard" | "ai">("standard");

  const handleSelectPlan = (plan: "standard" | "ai") => {
    setSelectedPlan(plan);
    setMode("signup");
    setError("");
    // Scroll to signup form
    setTimeout(() => {
      document.getElementById("auth-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

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
    if (!agreedToTerms) return setError("You must read and agree to the Terms and Conditions before signing up.");

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

    try {
      localStorage.setItem("textalot_signup_first_name", firstName);
    } catch {}

    // Fire Meta Pixel signup event (account created, not yet paid)
    try {
      const w = window as unknown as { fbq?: (...args: unknown[]) => void };
      if (typeof w.fbq === "function") {
        w.fbq("track", "CompleteRegistration");
      }
    } catch {}

    // Fire welcome email (non-blocking; no-ops if Resend not configured)
    fetch("/api/welcome-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: signupEmail.trim(), firstName }),
    }).catch(() => {});

    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Public-facing hero / SMS program info */}
      <section className="border-b border-zinc-800 bg-gradient-to-b from-violet-950/40 via-zinc-950 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <div className="flex justify-center">
            <Logo size="xl" />
          </div>
          <div className="mt-4 text-sm uppercase tracking-[0.2em] text-violet-300">AI-Powered SMS Marketing CRM</div>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-zinc-400">
            The all-in-one AI-powered SMS marketing platform for businesses. Upload your contacts, let AI handle conversations that sound like a real person, and close deals on autopilot with compliant text messaging.
          </p>

          <div className="mx-auto mt-10 grid max-w-4xl gap-5 sm:grid-cols-2 md:grid-cols-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
              <div className="text-2xl font-bold text-violet-400">CSV</div>
              <div className="mt-1 text-sm text-zinc-400">Import Leads</div>
              <p className="mt-2 text-xs text-zinc-500">Upload your contact lists in seconds</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
              <div className="text-2xl font-bold text-sky-400">SMS</div>
              <div className="mt-1 text-sm text-zinc-400">Campaigns</div>
              <p className="mt-2 text-xs text-zinc-500">Send personalized messages at scale</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
              <div className="text-2xl font-bold text-amber-400">CRM</div>
              <div className="mt-1 text-sm text-zinc-400">Conversations</div>
              <p className="mt-2 text-xs text-zinc-500">Manage replies and follow-ups</p>
            </div>
            <div className="rounded-2xl border border-violet-700/50 bg-violet-950/30 p-6">
              <div className="text-2xl font-bold text-emerald-400">AI</div>
              <div className="mt-1 text-sm text-zinc-400">Auto-Replies</div>
              <p className="mt-2 text-xs text-zinc-500">AI replies that sound like a real person</p>
            </div>
          </div>

          {/* AI Features */}
          <div className="mx-auto mt-10 max-w-3xl">
            <div className="text-sm uppercase tracking-[0.2em] text-violet-300">Built-In AI Agent</div>
            <h3 className="mt-2 text-xl font-bold text-white">Set It and Forget It</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-400">Upload your contacts, turn on AI, and let it do the rest. Our AI handles conversations, books appointments, and closes deals like a top producer.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 text-left">
              <div className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                <span className="mt-0.5 text-lg text-violet-400">&#9672;</span>
                <div>
                  <div className="text-sm font-medium text-white">Replies Like a Real Person</div>
                  <p className="mt-1 text-xs text-zinc-500">Natural, human-sounding AI auto-replies that keep leads engaged around the clock.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                <span className="mt-0.5 text-lg text-violet-400">&#9672;</span>
                <div>
                  <div className="text-sm font-medium text-white">AI Appointment Booking</div>
                  <p className="mt-1 text-xs text-zinc-500">AI qualifies leads and books appointments directly through the conversation.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                <span className="mt-0.5 text-lg text-violet-400">&#9672;</span>
                <div>
                  <div className="text-sm font-medium text-white">Industry-Trained AI</div>
                  <p className="mt-1 text-xs text-zinc-500">Pre-trained for health insurance, real estate, life insurance, and more.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                <span className="mt-0.5 text-lg text-violet-400">&#9672;</span>
                <div>
                  <div className="text-sm font-medium text-white">Handles Objections &amp; Closes</div>
                  <p className="mt-1 text-xs text-zinc-500">AI overcomes objections and closes like a top producer -- so you don&apos;t have to.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
            {/* Standard Plan */}
            <div
              onClick={() => handleSelectPlan("standard")}
              className={`cursor-pointer rounded-3xl border ${selectedPlan === "standard" ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-zinc-700"} bg-zinc-800/60 p-6 backdrop-blur text-left transition hover:border-emerald-500/60`}
            >
              <div className="text-center">
                <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Standard</div>
                <div className="mt-2 text-3xl font-bold text-emerald-400">$39.99 <span className="text-lg font-normal text-zinc-400">/ mo</span></div>
                <div className="mt-1 text-zinc-400">$0.012 per text message</div>
              </div>
              <ul className="mt-5 space-y-2 text-sm text-zinc-400">
                <li className="flex items-center gap-2"><span className="text-emerald-400">&#10003;</span> Unlimited contacts</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">&#10003;</span> Campaign builder</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">&#10003;</span> 2-way conversations</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">&#10003;</span> Multi-step drip sequences</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">&#10003;</span> CSV import &amp; blast</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">&#10003;</span> DNC / opt-out handling</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">&#10003;</span> Team management</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">&#10003;</span> Real-time notifications</li>
              </ul>
              <button
                onClick={(e) => { e.stopPropagation(); handleSelectPlan("standard"); }}
                className="mt-5 w-full rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 transition"
              >
                Get Started
              </button>
            </div>

            {/* AI Plan */}
            <div
              onClick={() => handleSelectPlan("ai")}
              className={`relative cursor-pointer rounded-3xl border-2 ${selectedPlan === "ai" ? "border-cyan-400 ring-2 ring-cyan-400/30" : "border-cyan-600"} bg-gradient-to-b from-cyan-950/40 to-zinc-800/60 p-6 backdrop-blur text-left transition hover:border-cyan-400/80`}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-cyan-600 px-4 py-1 text-xs font-bold uppercase tracking-wider text-white">Most Popular</div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Text2Sale + AI</div>
                  <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 ring-1 ring-amber-500/40">
                    Beta
                  </span>
                </div>
                <div className="mt-2 text-3xl font-bold text-cyan-400">$59.99 <span className="text-lg font-normal text-zinc-400">/ mo</span></div>
                <div className="mt-1 text-zinc-400">$0.012 per SMS + $0.025 per AI reply</div>
              </div>
              <ul className="mt-5 space-y-2 text-sm text-zinc-300">
                <li className="flex items-center gap-2"><span className="text-cyan-400">&#10003;</span> Everything in Standard</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">&#10003;</span> AI auto-replies (sounds human)</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">&#10003;</span> Full AI mode — handles all replies</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">&#10003;</span> Per-conversation AI toggle</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">&#10003;</span> AI appointment booking</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">&#10003;</span> Google Calendar sync</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">&#10003;</span> Industry-trained (insurance, real estate, etc.)</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">&#10003;</span> SPIN selling &amp; objection handling</li>
              </ul>
              <button
                onClick={(e) => { e.stopPropagation(); handleSelectPlan("ai"); }}
                className="mt-5 w-full rounded-2xl bg-cyan-600 px-5 py-3 font-semibold text-white hover:bg-cyan-700 transition"
              >
                Get Started with AI
              </button>
            </div>
          </div>

          <div className="mx-auto mt-4 max-w-4xl">
            <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/20 px-4 py-3 text-center text-sm text-emerald-300">
              💰 <span className="font-semibold">Bulk Discount:</span> Save 10% when you add $100+ to your wallet &middot; Save 15% on $500+
            </div>
          </div>

          {/* Login / Signup */}
          <div id="auth-form" className="mx-auto mt-10 max-w-xl">
            <div className="w-full rounded-3xl border border-zinc-800 bg-zinc-900 p-8" onKeyDown={handleKeyDown}>
              <div className="mb-6">
                <Logo size="md" />
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
                  {/* Selected plan badge */}
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-800/50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${selectedPlan === "ai" ? "bg-cyan-400" : "bg-emerald-400"}`} />
                      <span className="text-sm font-medium text-zinc-300">
                        {selectedPlan === "ai" ? "Text2Sale + AI" : "Standard"} — {selectedPlan === "ai" ? "$59.99" : "$39.99"}/mo
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPlan(selectedPlan === "ai" ? "standard" : "ai")}
                      className="text-xs text-violet-400 hover:text-violet-300"
                    >
                      Switch plan
                    </button>
                  </div>

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
                      </button>{" "}
                      (<a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-violet-400 underline hover:text-violet-300">view full page</a>)
                      , and I agree to all terms outlined within it.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-600 bg-zinc-800 accent-violet-600"
                    />
                    <span className="text-sm text-zinc-400">
                      I have read and fully understand the{" "}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setShowTerms(true); }}
                        className="font-medium text-violet-400 underline hover:text-violet-300"
                      >
                        Terms and Conditions
                      </button>{" "}
                      (<a href="/terms" target="_blank" rel="noopener noreferrer" className="text-violet-400 underline hover:text-violet-300">view full page</a>)
                      , and I agree to be bound by them.
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
      </section>

      {/* SMS program disclosure (required for 10DLC compliance) */}
      <section id="sms-program" className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <h2 className="text-2xl font-bold">SMS Program Information</h2>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-zinc-400">
            <p>Text2Sale enables businesses to send SMS messages to their opted-in customers and leads for marketing, customer service, and informational purposes.</p>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
              <p><strong className="text-white">Opt-In:</strong> Recipients must voluntarily provide their phone number and consent to receive text messages. Consent is not a condition of any purchase. Opt-in is collected via web forms, in-person sign-up, or written consent before any messages are sent.</p>
              <p><strong className="text-white">Message Frequency:</strong> Message frequency varies by campaign. Users control how often messages are sent.</p>
              <p><strong className="text-white">Message &amp; Data Rates:</strong> Standard message and data rates may apply depending on your carrier.</p>
              <p><strong className="text-white">Opt-Out:</strong> Reply <span className="font-mono text-white">STOP</span> to any message to unsubscribe at any time. You will receive a confirmation and no further messages will be sent.</p>
              <p><strong className="text-white">Help:</strong> Reply <span className="font-mono text-white">HELP</span> to any message for assistance. You can also contact us at <span className="text-violet-400">support@text2sale.com</span>.</p>
              <p><strong className="text-white">Carriers:</strong> Carriers are not liable for delayed or undelivered messages.</p>
            </div>
            <div className="flex gap-4 text-xs">
              <a href="/privacy-policy" className="text-violet-400 hover:text-violet-300 underline">Privacy Policy</a>
              <a href="/terms" className="text-violet-400 hover:text-violet-300 underline">Terms and Conditions</a>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-zinc-800 py-6 text-center text-sm text-zinc-600">
        &copy; {new Date().getFullYear()} Text2Sale. All rights reserved. &middot;{" "}
        <a href="/privacy-policy" className="text-violet-400 hover:text-violet-300">Privacy Policy</a> &middot;{" "}
        <a href="/terms" className="text-violet-400 hover:text-violet-300">Terms</a>
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

      {/* Terms and Conditions Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-3xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h2 className="text-xl font-bold text-white">Terms and Conditions</h2>
              <button
                onClick={() => setShowTerms(false)}
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-zinc-300 space-y-4">
              <p className="text-xs text-zinc-500">Effective Date: April 9, 2026 &mdash; Website: www.text2sale.com</p>

              <p>These Terms and Conditions (&ldquo;Terms&rdquo;) govern your access to and use of the Text2Sale platform (&ldquo;Service&rdquo;). By accessing or using Text2Sale, you agree to be bound by these Terms. If you do not agree, you may not use the Service.</p>

              <h3 className="text-base font-semibold text-white pt-2">Platform Overview &amp; Account</h3>
              <p>Text2Sale provides a mass texting CRM platform that enables users to upload contacts, create campaigns, and send SMS and MMS messages. You must be at least 18 years old to use this Service. You agree to provide accurate information when creating an account and to keep your login credentials secure. You are responsible for all activity that occurs under your account.</p>

              <h3 className="text-base font-semibold text-white pt-2">User Responsibilities &amp; Messaging Compliance</h3>
              <p>You are solely responsible for all content and communications sent through Text2Sale. You agree that you will only send messages to recipients who have provided prior express consent (opt-in). You agree to comply with all applicable laws and regulations, including but not limited to the Telephone Consumer Protection Act (TCPA), CAN-SPAM Act, CTIA guidelines, and any applicable federal, state, or international laws governing messaging and data privacy.</p>

              <h3 className="text-base font-semibold text-white pt-2">Platform Role &amp; Disclaimer</h3>
              <p>Text2Sale is strictly a technology platform and does not control, review, or approve the content of messages sent by users. You acknowledge and agree that Text2Sale is not responsible or liable for any messages you send, including their content, timing, recipients, or legal compliance. You assume full responsibility and liability for your messaging activity.</p>

              <h3 className="text-base font-semibold text-white pt-2">Limitation of Liability &amp; Indemnification</h3>
              <p>You agree that Text2Sale shall not be liable for any direct, indirect, incidental, consequential, or punitive damages, including but not limited to fines, penalties, lawsuits, lost profits, or business interruption arising from your use of the platform or your messaging practices. You further agree to indemnify, defend, and hold harmless Text2Sale, its owners, employees, and affiliates from any claims, damages, liabilities, costs, or expenses arising out of your use of the Service, your violation of these Terms, or your violation of any law or regulation.</p>

              <h3 className="text-base font-semibold text-white pt-2">Account Suspension &amp; Termination</h3>
              <p>Text2Sale may suspend, restrict, or terminate your account at any time, without notice, if we believe you have violated these Terms, engaged in unlawful activity, or used the platform in a way that could harm the service, other users, or third parties.</p>

              <h3 className="text-base font-semibold text-white pt-2">Third-Party Services</h3>
              <p>The Service may integrate with third-party providers including messaging carriers, SMS gateways, payment processors, and hosting providers. Text2Sale is not responsible for the performance, availability, or actions of these third parties. Message delivery is not guaranteed and may be affected by carrier restrictions or external factors beyond our control.</p>

              <h3 className="text-base font-semibold text-white pt-2">Billing &amp; Payments</h3>
              <p>Users are responsible for maintaining sufficient account balance or active subscription to use the platform. All payments are final and non-refundable unless otherwise required by law. Pricing, subscription fees, and message rates may be updated at any time with notice. Failure to maintain payment may result in suspension of services.</p>

              <h3 className="text-base font-semibold text-white pt-2">Prohibited Activities</h3>
              <p>You agree not to use Text2Sale for any unlawful, abusive, or prohibited activities, including but not limited to sending spam, phishing messages, fraudulent offers, harassment, or any content that violates applicable laws or regulations.</p>

              <h3 className="text-base font-semibold text-white pt-2">Compliance Tools</h3>
              <p>Text2Sale provides compliance tools such as opt-out (STOP) handling and suppression lists; however, you are solely responsible for honoring opt-outs and maintaining compliance with all messaging laws.</p>

              <h3 className="text-base font-semibold text-white pt-2">Disclaimer of Warranties</h3>
              <p>The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind, whether express or implied. Text2Sale disclaims all warranties including merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee that the platform will be uninterrupted, error-free, or completely secure.</p>

              <h3 className="text-base font-semibold text-white pt-2">Governing Law</h3>
              <p>These Terms shall be governed by and construed in accordance with the laws of the State of Florida, without regard to conflict of law principles. Any disputes arising out of or relating to these Terms or the use of the Service shall be resolved exclusively in the courts located in Florida.</p>

              <h3 className="text-base font-semibold text-white pt-2">Changes to These Terms</h3>
              <p>We may update these Terms at any time. Continued use of the Service after updates constitutes acceptance of the revised Terms.</p>

              <h3 className="text-base font-semibold text-white pt-2">Contact Us</h3>
              <p>If you have any questions regarding these Terms, you may contact us at support@text2sale.com.</p>
            </div>

            <div className="border-t border-zinc-800 px-6 py-4">
              <button
                onClick={() => { setShowTerms(false); setAgreedToTerms(true); }}
                className="w-full rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-700 transition"
              >
                I Have Read and Agree to the Terms and Conditions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="text-sm text-zinc-500">
            © {new Date().getFullYear()} Text2Sale. All rights reserved.
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <a href="/terms" className="text-zinc-400 hover:text-white transition">Terms</a>
            <a href="/privacy-policy" className="text-zinc-400 hover:text-white transition">Privacy</a>
            <a href="mailto:support@text2sale.com" className="text-zinc-400 hover:text-white transition">Support</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
