"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginUser, signupUser } from "@/lib/auth";
import { authFetch } from "@/lib/auth-fetch";
import Logo from "@/components/Logo";
import MarketingHome from "@/components/MarketingHome";
import { captureProspect, FOLLOWUP_NOTICE } from "@/lib/prospect-capture";
import { LEGAL_TERMS_SECTIONS, LEGAL_PRIVACY_SECTIONS, LEGAL_EFFECTIVE_DATE } from "@/lib/legal-text";

export default function HomeClient({
  faqSection,
  siteLinks,
}: {
  faqSection: React.ReactNode;
  siteLinks: React.ReactNode;
}) {
  const router = useRouter();

  // Page-view tracking is handled by the universal <Tracker /> in app/layout.tsx
  // (visitor_id, session_id, UTMs, channel, device, exit clicks, form intents).

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("signup") === "1") setMode("signup");
  }, []);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [followup, setFollowup] = useState(false);

  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToLiability, setAgreedToLiability] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState("");

  const scrollToAuth = () => {
    document.getElementById("auth-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleSelectPlan = () => {
    setMode("signup");
    setError("");
    setTimeout(scrollToAuth, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (mode === "login") handleLogin();
      else if (signupStep === 1) handleContactStep();
      else handleSignup();
    }
  };

  const handleLogin = async () => {
    if (loading) return;
    setError("");
    if (!loginEmail.trim()) return setError("Email is required.");
    if (!loginPassword.trim()) return setError("Password is required.");

    setLoading(true);
    // try/finally so the button ALWAYS resets — a thrown/rejected sign-in used
    // to skip setLoading(false) and leave it stuck on "Signing in…".
    try {
      const result = await loginUser(loginEmail, loginPassword);
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.push("/dashboard");
    } catch (e) {
      console.error("[login] error:", e);
      setError("Something went wrong signing in. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleContactStep = async () => {
    if (loading) return;
    setError("");
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) { setError("Enter your first name, last name and phone number."); return; }
    setLoading(true);
    try {
      await captureProspect({ name: `${firstName.trim()} ${lastName.trim()}`, email: signupEmail, phone, kind: "signup", followup });
      setSignupStep(2);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save your details. Please try again."); }
    finally { setLoading(false); }
  };

  const handleSignup = async () => {
    if (loading) return;
    setError("");
    if (!firstName.trim()) return setError("First name is required.");
    if (!lastName.trim()) return setError("Last name is required.");
    if (!signupEmail.trim()) return setError("Email is required.");
    if (!phone.trim()) return setError("Phone number is required.");
    if (!password.trim()) return setError("Password is required.");
    if (!confirmPassword.trim()) return setError("Confirm password is required.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (!agreedToPrivacy) return setError("You must read and agree to the Privacy Policy before signing up.");
    if (!agreedToTerms) return setError("You must read and agree to the Terms and Conditions before signing up.");
    if (!agreedToLiability) return setError("You must acknowledge sole responsibility for all messaging activity.");

    setLoading(true);
    let result;
    try { result = await signupUser({
      firstName,
      lastName,
      email: signupEmail,
      phone,
      password,
      referralCode,
    }); } catch {
      setError("Could not create your account. Please try again.");
      setLoading(false);
      return;
    }
    setLoading(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    try { localStorage.setItem("textalot_signup_first_name", firstName); } catch {}


    // A database-triggered welcome email is queued for this new account.

    // No free workspace access: new accounts go straight to paid checkout.
    // If Supabase requires email confirmation first, verification is the only
    // step allowed before payment.
    if (result.requiresEmailConfirmation) {
      router.push("/verify");
      return;
    }

    try {
      await authFetch("/api/onboarding/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: "standard" }),
      });
      const checkoutResponse = await authFetch("/api/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: result.user?.id, userEmail: signupEmail.trim().toLowerCase() }),
      });
      const checkout = await checkoutResponse.json().catch(() => ({}));
      if (!checkoutResponse.ok || !checkout.url) {
        throw new Error(checkout.error || "Secure checkout could not be opened.");
      }
      window.location.href = checkout.url;
      return;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Account created, but checkout could not be opened. Sign in to continue payment.");
      setMode("login");
    }
  };

  return (
    <main className="crm-theme marketing-site min-h-screen overflow-hidden">
      <MarketingHome
        onLogin={() => { setMode("login"); scrollToAuth(); }}
        onSignup={() => { setMode("signup"); scrollToAuth(); }}
      />

      {/* ═══════ PRICING + SIGN-IN ═══════ */}
      <section id="pricing" className="marketing-auth marketing-plan-section relative border-b border-emerald-900/70 bg-gradient-to-b from-[#102c23] via-[#173b2f] to-[#0b241b] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <div className="inline-block rounded-full bg-lime-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-lime-200 ring-1 ring-emerald-500/20">
              Simple pricing
            </div>
            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">Pick your plan. <span className="bg-gradient-to-r from-lime-200 to-emerald-300 bg-clip-text text-transparent">Cancel anytime.</span></h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">No long-term contracts. No hidden fees. Just results.</p>
          </div>

          <div className="mx-auto mt-12 max-w-2xl">
            <div
              onClick={() => handleSelectPlan()}
              className="group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-lime-300/70 bg-gradient-to-br from-emerald-950/70 via-zinc-900/80 to-emerald-950/30 p-8 backdrop-blur transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-lime-300/20"
            >
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-lime-300/20 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold uppercase tracking-widest text-lime-200">Text2Sale</div>
                  <span className="inline-flex items-center rounded-full bg-lime-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-950">
                    AI included
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">$39.99</span>
                  <span className="text-sm text-zinc-400">/month</span>
                </div>
                <div className="mt-2 text-sm text-zinc-300">$0.015/SMS segment · inbound SMS free · $0.020/AI reply + SMS</div>
                <div className="mt-1 text-xs text-zinc-400">$0.025/min outbound calls · $0.015/min inbound calls · $0.18/min AI calls</div>

                <ul className="mt-6 grid gap-2.5 text-sm text-zinc-200 sm:grid-cols-2">
                  {[
                    "Unlimited contacts",
                    "Campaigns + drip workflows",
                    "2-way conversations",
                    "CSV import & blast",
                    "AI auto-replies + qualification",
                    "AI appointment booking",
                    "AI calling receptionist",
                    "Google Calendar sync",
                    "Team management",
                    "10DLC onboarding tools",
                  ].map((x) => (
                    <li key={x} className="flex items-center gap-2">
                      <span className="text-lime-300">✓</span> {x}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={(e) => { e.stopPropagation(); handleSelectPlan(); }}
                  className="mt-7 w-full rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-lime-400 px-5 py-3 font-bold text-emerald-950 shadow-xl shadow-lime-300/20 transition hover:brightness-110"
                >
                  Start Texting Leads · $39.99/month
                </button>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-6 max-w-2xl">
            <div className="rounded-2xl border border-emerald-800/50 bg-emerald-950/30 px-4 py-3 text-center text-sm text-emerald-200">
              💰 <span className="font-semibold">Volume SMS:</span> a $500+ wallet purchase unlocks $0.0135/SMS.
            </div>
          </div>

          {/* Sign-in / Sign-up form */}
          <div id="auth-form" className="mx-auto mt-16 max-w-xl">
            <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-8 shadow-2xl ring-1 ring-white/5" onKeyDown={handleKeyDown}>
              <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-lime-300/15 blur-3xl" />

              <div className="relative">
                <div className="mb-6">
                  <Logo size="md" />
                  <div className="mt-2 text-sm text-zinc-400">
                    {mode === "login"
                      ? "Welcome back. Log in and keep closing."
                      : "Create your account. Your dashboard is seconds away."}
                  </div>
                </div>

                <div className="mb-6 flex rounded-2xl border border-zinc-800 bg-zinc-950/60 p-1">
                  <button
                    onClick={() => { setMode("login"); setError(""); }}
                    className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      mode === "login" ? "bg-gradient-to-r from-emerald-500 to-lime-400 text-emerald-950 shadow-lg shadow-emerald-500/20" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => { setMode("signup"); setError(""); }}
                    className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      mode === "signup" ? "bg-gradient-to-r from-emerald-500 to-lime-400 text-emerald-950 shadow-lg shadow-emerald-500/20" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Create account
                  </button>
                </div>

                {mode === "login" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-zinc-200">Email</label>
                      <input
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-500 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="block text-sm font-semibold text-zinc-200">Password</label>
                        <Link href="/forgot-password" className="text-xs font-semibold text-lime-300 hover:text-lime-200">
                          Forgot password?
                        </Link>
                      </div>
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-500 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                    </div>

                    {error && (
                      <div className="rounded-2xl border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">{error}</div>
                    )}

                    <button
                      onClick={handleLogin}
                      disabled={loading}
                      className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-400 to-emerald-400 px-5 py-4 font-bold text-emerald-950 shadow-xl shadow-emerald-500/20 transition hover:brightness-110 disabled:opacity-60"
                    >
                      {loading ? "Signing in..." : "Sign in → Dashboard"}
                    </button>

                    <div className="text-center text-sm text-zinc-500">
                      New here?{" "}
                      <button onClick={() => { setMode("signup"); setError(""); }} className="font-semibold text-lime-300 hover:text-lime-200">
                        Create an account
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-emerald-800/60 bg-emerald-950/30 px-4 py-3">
                      <span className="text-sm font-semibold text-white">Text2Sale — <span className="text-zinc-300">$39.99/month</span></span>
                      <p className="mt-1 text-xs text-zinc-400">AI included. Payment is required immediately after account creation; there is no free trial.</p>
                    </div>

                    <p className="text-sm text-lime-200">Step {signupStep} of 2 · {signupStep === 1 ? "Your contact details" : "Secure your account"}</p>
                    {error && <p role="alert" className="rounded-xl bg-rose-950 p-3 text-rose-200">{error}</p>}
                    {signupStep === 1 ? <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-zinc-200">First name</label>
                        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" placeholder="Jane" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-zinc-200">Last name</label>
                        <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" placeholder="Doe" />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-zinc-200">Email</label>
                      <input value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" placeholder="you@example.com" />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-zinc-200">Phone number</label>
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" placeholder="(555) 123-4567" />
                    </div>

                    <label className="flex gap-3 text-sm leading-6 text-zinc-200"><input type="checkbox" checked={followup} onChange={e => setFollowup(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-lime-300" />{FOLLOWUP_NOTICE}</label>
                    <p className="text-xs text-zinc-300">This does not subscribe you to marketing texts or automated calls. <Link href="/privacy-policy" className="text-lime-200 underline">Privacy policy</Link></p>
                    <button onClick={handleContactStep} disabled={loading} className="w-full rounded-2xl bg-lime-300 px-5 py-4 font-bold text-emerald-950 disabled:opacity-60">{loading ? "Saving…" : "Continue → Account security"}</button>
                    </> : <>
                    <p className="text-sm text-zinc-200">Contact details saved for {signupEmail}. <button type="button" onClick={() => { setSignupStep(1); setError(""); }} className="text-lime-200 underline">Edit</button></p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-zinc-200">Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" placeholder="At least 8 characters" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-zinc-200">Confirm</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" placeholder="Repeat it" />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-zinc-200">
                        Referral Code <span className="ml-1 text-xs font-normal text-emerald-400">(Optional — $50 deposit = both get $50!)</span>
                      </label>
                      <input value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 font-mono uppercase tracking-wider text-white outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-zinc-500 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" placeholder="e.g. T2S-ABC123" />
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedToPrivacy}
                        onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-600 bg-zinc-800 accent-emerald-500"
                      />
                      <span className="text-sm text-zinc-400">
                        I have read and agree to the{" "}
                        <button type="button" onClick={(e) => { e.preventDefault(); setShowPrivacyPolicy(true); }} className="font-semibold text-lime-300 underline hover:text-lime-200">
                          Privacy Policy
                        </button>
                        {" "}(<a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-lime-300 underline hover:text-lime-200">full page</a>).
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-600 bg-zinc-800 accent-emerald-500"
                      />
                      <span className="text-sm text-zinc-400">
                        I have read and agree to be bound by the{" "}
                        <button type="button" onClick={(e) => { e.preventDefault(); setShowTerms(true); }} className="font-semibold text-lime-300 underline hover:text-lime-200">
                          Terms and Conditions
                        </button>
                        {" "}(<a href="/terms" target="_blank" rel="noopener noreferrer" className="text-lime-300 underline hover:text-lime-200">full page</a>).
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3">
                      <input
                        type="checkbox"
                        checked={agreedToLiability}
                        onChange={(e) => setAgreedToLiability(e.target.checked)}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-amber-600 bg-zinc-800 accent-amber-500"
                      />
                      <span className="text-sm text-amber-100/90">
                        <span className="font-bold text-amber-200">Sole Responsibility Acknowledgment.</span>{" "}
                        I understand and agree that I am <span className="font-bold">solely and fully responsible</span> for all messaging activity, content, and outcomes arising from my use of Text2Sale — including compliance with all applicable laws (including TCPA, CAN-SPAM, CTIA, and state regulations) — and that no liability, fines, damages, penalties, or claims of any kind shall ever fall back on Text2Sale, its operators, affiliates, employees, or contractors.
                      </span>
                    </label>

                    {error && (
                      <div className="rounded-2xl border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">{error}</div>
                    )}

                    <button
                      onClick={handleSignup}
                      disabled={loading}
                      className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-400 to-emerald-400 px-5 py-4 font-bold text-emerald-950 shadow-xl shadow-emerald-500/20 transition hover:brightness-110 disabled:opacity-60"
                    >
                      {loading ? "Creating account..." : "Create account → Secure checkout"}
                    </button>
                    <div className="text-center text-[11px] text-zinc-500">
                      By creating an account you agree to all terms above. Cancel anytime.
                    </div>
                    </>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Server-rendered FAQ (its FAQPage JSON-LD lives in app/page.tsx) */}
      {faqSection}

      {/* ═══════ SMS PROGRAM INFO (compliance) ═══════ */}
      <section id="sms-program" className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <h2 className="text-2xl font-bold">SMS Program Information</h2>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-zinc-400">
            <p>Text2Sale enables businesses to send SMS messages to their opted-in customers and leads for marketing, customer service, and informational purposes.</p>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
              <p><strong className="text-white">Opt-In:</strong> Recipients must voluntarily provide their phone number and consent to receive text messages. Consent is not a condition of any purchase. Opt-in is collected via web forms, in-person sign-up, or written consent before any messages are sent.</p>
              <p><strong className="text-white">Message Frequency:</strong> Message frequency varies by campaign. Users control how often messages are sent.</p>
              <p><strong className="text-white">Message &amp; Data Rates:</strong> Standard message and data rates may apply depending on your carrier.</p>
              <p><strong className="text-white">Opt-Out:</strong> Reply <span className="font-mono text-white">STOP</span> to any message to unsubscribe at any time.</p>
              <p><strong className="text-white">Help:</strong> Reply <span className="font-mono text-white">HELP</span> for assistance, or email <span className="text-lime-300">support@text2sale.com</span>.</p>
              <p><strong className="text-white">Carriers:</strong> Carriers are not liable for delayed or undelivered messages.</p>
            </div>
            <div className="flex gap-4 text-xs">
              <a href="/privacy-policy" className="text-lime-300 hover:text-lime-200 underline">Privacy Policy</a>
              <a href="/terms" className="text-lime-300 hover:text-lime-200 underline">Terms and Conditions</a>
            </div>
          </div>
        </div>
      </section>

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
              <p className="text-xs text-zinc-500">Effective Date: {LEGAL_EFFECTIVE_DATE} &mdash; Website: www.text2sale.com</p>
              {LEGAL_PRIVACY_SECTIONS.map((s) => (
                <React.Fragment key={s.heading}>
                  <h3 className="text-base font-semibold text-white pt-2">{s.heading}</h3>
                  {s.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </React.Fragment>
              ))}
            </div>
            <div className="border-t border-zinc-800 px-6 py-4">
              <button
                onClick={() => { setShowPrivacyPolicy(false); setAgreedToPrivacy(true); }}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-400 px-5 py-3 font-bold text-emerald-950 shadow-lg shadow-emerald-500/20 hover:brightness-110 transition"
              >
                I Have Read and Agree to the Privacy Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms Modal */}
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
              <p className="text-xs text-zinc-500">Effective Date: {LEGAL_EFFECTIVE_DATE} &mdash; Website: www.text2sale.com</p>
              {LEGAL_TERMS_SECTIONS.map((s) => (
                <React.Fragment key={s.heading}>
                  <h3 className="text-base font-semibold text-white pt-2">{s.heading}</h3>
                  {s.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </React.Fragment>
              ))}
            </div>
            <div className="border-t border-zinc-800 px-6 py-4">
              <button
                onClick={() => { setShowTerms(false); setAgreedToTerms(true); }}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-400 px-5 py-3 font-bold text-emerald-950 shadow-lg shadow-emerald-500/20 hover:brightness-110 transition"
              >
                I Have Read and Agree to the Terms and Conditions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950">
        {siteLinks}
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="text-sm text-zinc-500">© {new Date().getFullYear()} Text2Sale. All rights reserved.</div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <Link href="/blog" className="text-zinc-400 hover:text-white transition">Blog</Link>
            <Link href="/terms" className="text-zinc-400 hover:text-white transition">Terms</Link>
            <Link href="/privacy-policy" className="text-zinc-400 hover:text-white transition">Privacy</Link>
            <a href="mailto:support@text2sale.com" className="text-zinc-400 hover:text-white transition">Support</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
