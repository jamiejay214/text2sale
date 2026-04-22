"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser, signupUser } from "@/lib/auth";
import Logo from "@/components/Logo";
import { LEGAL_TERMS_SECTIONS, LEGAL_PRIVACY_SECTIONS, LEGAL_EFFECTIVE_DATE } from "@/lib/legal-text";

export default function HomePage() {
  const router = useRouter();

  // Track page view (fire-and-forget)
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
  const [agreedToLiability, setAgreedToLiability] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"standard" | "ai">("ai");

  // Live counter animation on hero — pure vanity but investors love it
  const [msgsSent, setMsgsSent] = useState(2_847_293);
  useEffect(() => {
    const t = window.setInterval(() => {
      setMsgsSent((n) => n + Math.floor(Math.random() * 3) + 1);
    }, 1800);
    return () => window.clearInterval(t);
  }, []);

  const scrollToAuth = () => {
    document.getElementById("auth-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleSelectPlan = (plan: "standard" | "ai") => {
    setSelectedPlan(plan);
    setMode("signup");
    setError("");
    setTimeout(scrollToAuth, 100);
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
    if (!agreedToLiability) return setError("You must acknowledge sole responsibility for all messaging activity.");

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

    try { localStorage.setItem("textalot_signup_first_name", firstName); } catch {}

    try {
      const w = window as unknown as { fbq?: (...args: unknown[]) => void };
      if (typeof w.fbq === "function") w.fbq("track", "CompleteRegistration");
    } catch {}

    fetch("/api/welcome-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: signupEmail.trim(), firstName }),
    }).catch(() => {});

    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen overflow-hidden bg-zinc-950 text-white">
      {/* ═══════ HERO ═══════ */}
      <section className="relative overflow-hidden">
        {/* Animated gradient mesh background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-600/30 via-fuchsia-500/20 to-transparent blur-3xl" />
          <div className="absolute left-[10%] top-[30%] h-[400px] w-[400px] rounded-full bg-fuchsia-600/15 blur-3xl" />
          <div className="absolute right-[5%] top-[10%] h-[500px] w-[500px] rounded-full bg-cyan-500/15 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        {/* Top nav */}
        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <Logo size="md" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setMode("login"); scrollToAuth(); }}
              className="text-sm font-medium text-zinc-300 hover:text-white"
            >
              Sign in
            </button>
            <button
              onClick={() => { setMode("signup"); scrollToAuth(); }}
              className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:brightness-110"
            >
              Start free trial
            </button>
          </div>
        </nav>

        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-12 md:py-20 lg:grid-cols-2 lg:gap-16">
          {/* LEFT: headline */}
          <div className="flex flex-col justify-center">
            {/* Social proof chip */}
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="tabular-nums">{msgsSent.toLocaleString()}</span>
              <span className="text-zinc-400">messages sent by agents right now</span>
            </div>

            <h1 className="mt-6 text-5xl font-black leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
              <span className="text-white">Turn every text</span>
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                into a sale.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-300 md:text-xl">
              The AI-powered SMS CRM that replies in milliseconds, closes like a top producer, and <span className="font-semibold text-white">never sleeps</span>. Text them. Qualify them. Close them — all from one dashboard.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => { setMode("signup"); setSelectedPlan("ai"); scrollToAuth(); }}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 px-7 py-4 text-base font-bold text-white shadow-xl shadow-violet-500/40 transition hover:scale-105 hover:shadow-2xl"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Start free trial
                  <svg className="h-5 w-5 transition group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 opacity-0 transition group-hover:opacity-100" />
              </button>
              <a
                href="#features"
                className="rounded-2xl border border-zinc-700 bg-zinc-900/50 px-7 py-4 text-base font-semibold text-zinc-200 backdrop-blur transition hover:border-violet-500/60 hover:bg-violet-500/10 hover:text-white"
              >
                See how it works
              </a>
            </div>

            {/* Stats bar */}
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-6 border-t border-zinc-800/80 pt-6">
              <div>
                <div className="text-2xl font-bold text-white md:text-3xl">99.2%</div>
                <div className="mt-1 text-xs text-zinc-400">Delivery rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white md:text-3xl">&lt;2s</div>
                <div className="mt-1 text-xs text-zinc-400">AI reply speed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white md:text-3xl">4.9<span className="text-amber-400">★</span></div>
                <div className="mt-1 text-xs text-zinc-400">Avg. rating</div>
              </div>
            </div>
          </div>

          {/* RIGHT: Product preview */}
          <div className="relative flex items-center justify-center">
            {/* Glow behind card */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 blur-3xl" />

            <div className="relative w-full max-w-md rotate-1 rounded-[28px] border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 shadow-2xl ring-1 ring-white/5 transition hover:rotate-0">
              {/* Fake browser chrome */}
              <div className="mb-4 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                <span className="ml-3 rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">text2sale.com/dashboard</span>
              </div>

              {/* Hero stat card */}
              <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">Today</div>
                    <div className="mt-1 text-3xl font-bold text-white">1,247</div>
                    <div className="text-[11px] text-zinc-400">texts sent · 94 replies</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-400">+23%</div>
                    <div className="text-[10px] text-zinc-500">vs yesterday</div>
                  </div>
                </div>
                {/* Mini bars */}
                <div className="mt-3 flex h-10 items-end gap-1">
                  {[30, 50, 35, 70, 55, 90, 75].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-violet-500 to-fuchsia-400" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>

              {/* Fake conversation */}
              <div className="mt-4 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold">BJ</div>
                  <div className="rounded-2xl rounded-bl-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-zinc-100">
                    How much for a family of 4?
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-200">
                      💰 Ready
                    </span>
                  </div>
                </div>
                <div className="flex items-start justify-end gap-2">
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-2 text-xs text-white shadow-lg shadow-violet-500/30">
                    Awesome Billy! Sending over a quote right now — what&apos;s your ZIP?
                  </div>
                </div>
                <div className="flex justify-end">
                  <span className="rounded-md bg-violet-500/20 px-2 py-0.5 text-[9px] font-semibold text-violet-300">
                    ✨ AI replied in 1.4s
                  </span>
                </div>
              </div>

              {/* Smart suggestion chip */}
              <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-2">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  <span>💡</span> Smart suggestion
                </div>
                <div className="mt-1 text-[11px] text-zinc-300">&ldquo;Want me to lock in coverage today?&rdquo;</div>
              </div>
            </div>

            {/* Floating badges */}
            <div className="absolute -left-4 bottom-8 rotate-[-6deg] rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-300 shadow-xl backdrop-blur">
              🔥 Lead Temp: BLAZING
            </div>
            <div className="absolute -right-2 top-8 rotate-[4deg] rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-[11px] font-semibold text-cyan-300 shadow-xl backdrop-blur">
              🤖 AI handling 34 convos
            </div>
          </div>
        </div>

        {/* Trust bar */}
        <div className="relative border-y border-zinc-800/60 bg-zinc-950/60 py-6 backdrop-blur">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium uppercase tracking-widest text-zinc-500 md:gap-12">
              <span className="flex items-center gap-2">🛡️ 10DLC Compliant</span>
              <span className="flex items-center gap-2">🔒 Bank-grade Encryption</span>
              <span className="flex items-center gap-2">📡 99.99% Uptime</span>
              <span className="flex items-center gap-2">⚡ Real-time Delivery</span>
              <span className="flex items-center gap-2">🇺🇸 US-Based Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section id="features" className="relative border-b border-zinc-800 bg-zinc-950 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <div className="inline-block rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-violet-300 ring-1 ring-violet-500/30">
              Every tool you need
            </div>
            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Built different. <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Built to close.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
              Every feature you wish your old CRM had — plus ten you didn&apos;t know were possible.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: "🤖", tint: "violet", title: "AI That Sounds Human", body: "Pre-trained on top-producer scripts. Objection handling, qualifying questions, appointment booking — all in a casual voice leads actually reply to." },
              { icon: "🔥", tint: "rose", title: "Lead Temperature Scoring", body: "Every conversation is scored 0–100 in real time. Know who's blazing hot, who's cooling off, and who needs a follow-up — at a glance." },
              { icon: "💡", tint: "amber", title: "Smart Reply Suggestions", body: "Sentiment-aware 1-tap responses tailored to each inbound message. Ready-to-buy, objection, or negative — the perfect reply is waiting." },
              { icon: "⏰", tint: "emerald", title: "Smart Send Windows", body: "AI learns each contact's optimal send time from their reply history + timezone. Texts land when they're actually checking their phone." },
              { icon: "📊", tint: "cyan", title: "Live Dashboards", body: "Hero stats with 7-day sparklines, delivery rate heatmaps, campaign performance leaderboards, cohort retention — investor-grade analytics, baked in." },
              { icon: "⚡", tint: "fuchsia", title: "Command Palette (⌘K)", body: "Jump anywhere in half a second. 30+ keyboard shortcuts. Fuzzy search across every contact, campaign, and conversation. Feels like Linear, ships with SMS." },
              { icon: "📱", tint: "sky", title: "Multi-Number Routing", body: "Own multiple lines? Color-coded star indicators on every thread show which line sent what. No more wondering what number a lead is texting." },
              { icon: "🛡️", tint: "teal", title: "TCPA + 10DLC Built In", body: "Auto opt-out (STOP), suppression lists, consent logging, opt-in receipts, A2P 10DLC registration workflow — compliance isn't an add-on." },
              { icon: "💰", tint: "violet", title: "Transparent Pricing", body: "$0.012/text. No long-term contracts. Volume discounts at $100+ and $500+. You'll know your cost-per-lead before you press send." },
            ].map((f) => (
              <div
                key={f.title}
                className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-950 p-6 transition hover:-translate-y-1 hover:border-violet-500/40 hover:shadow-2xl hover:shadow-violet-500/10"
              >
                <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-violet-500/0 via-violet-500/0 to-fuchsia-500/0 opacity-0 transition group-hover:from-violet-500/5 group-hover:to-fuchsia-500/5 group-hover:opacity-100" />
                <div className="text-3xl">{f.icon}</div>
                <h3 className="mt-3 text-lg font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section className="relative border-b border-zinc-800 bg-gradient-to-b from-zinc-950 to-black py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center">
            <div className="inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-300 ring-1 ring-emerald-500/30">
              Live in under 5 minutes
            </div>
            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Three steps to <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">revenue on autopilot</span>
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", title: "Upload leads", body: "Drag your CSV. We auto-map First/Last/Phone/State and clean up duplicates, formatting, and opt-outs in one pass." },
              { n: "02", title: "Turn on AI", body: "Flip one switch. Our AI picks up on your scripts, handles objections, qualifies, and books appointments 24/7." },
              { n: "03", title: "Count the closes", body: "Deliverability, reply rate, booked meetings — all streaming live. Every hot lead gets a 🔥 before it goes cold." },
            ].map((s, i) => (
              <div key={s.n} className="relative rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
                <div className="text-5xl font-black text-violet-500/20">{s.n}</div>
                <h3 className="mt-2 text-xl font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.body}</p>
                {i < 2 && (
                  <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-2xl text-violet-500/40 md:block">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ TESTIMONIALS ═══════ */}
      <section className="relative border-b border-zinc-800 bg-zinc-950 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <div className="inline-block rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-300 ring-1 ring-amber-500/30">
              What agents are saying
            </div>
            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Top producers use it. <span className="bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent">Every. Single. Day.</span>
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { q: "Booked 18 appointments my first week. The AI handles every inbound while I'm on calls. I genuinely can't imagine going back.", a: "Marcus T.", t: "Health Insurance Agent · Tampa, FL" },
              { q: "The lead temperature scoring is witchcraft. I called everyone on the Blazing list Monday morning and closed 4 of them before lunch.", a: "Priscilla R.", t: "Final Expense · Atlanta, GA" },
              { q: "Switched from Salesmsg + GoHighLevel. Text2Sale does both better, costs 1/3, and the AI is in a different league.", a: "Devon K.", t: "Medicare Agency Owner · Dallas, TX" },
            ].map((t, i) => (
              <div key={i} className="flex flex-col rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">
                <div className="flex gap-0.5 text-amber-400">{"★★★★★"}</div>
                <blockquote className="mt-3 flex-1 text-base leading-relaxed text-zinc-200">
                  &ldquo;{t.q}&rdquo;
                </blockquote>
                <div className="mt-4 border-t border-zinc-800 pt-3">
                  <div className="text-sm font-semibold text-white">{t.a}</div>
                  <div className="text-xs text-zinc-500">{t.t}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ PRICING + SIGN-IN ═══════ */}
      <section className="relative border-b border-zinc-800 bg-gradient-to-b from-zinc-950 via-violet-950/10 to-zinc-950 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <div className="inline-block rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-violet-300 ring-1 ring-violet-500/30">
              Simple pricing
            </div>
            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">Pick your plan. <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Cancel anytime.</span></h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">No long-term contracts. No hidden fees. Just results.</p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            {/* Standard */}
            <div
              onClick={() => handleSelectPlan("standard")}
              className={`group relative cursor-pointer rounded-3xl border bg-zinc-900/60 p-7 backdrop-blur transition hover:-translate-y-1 hover:shadow-2xl ${selectedPlan === "standard" ? "border-emerald-500/70 shadow-emerald-500/20 shadow-2xl" : "border-zinc-800 hover:border-emerald-500/50"}`}
            >
              <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Standard</div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-5xl font-black text-white">$39.99</span>
                <span className="text-sm text-zinc-400">/month</span>
              </div>
              <div className="mt-1 text-sm text-zinc-400">+ $0.012 per text · $0.045/min outbound · $0.025/min inbound</div>

              <ul className="mt-6 space-y-2.5 text-sm text-zinc-300">
                {[
                  "Unlimited contacts",
                  "Campaign builder + drip sequences",
                  "2-way conversations",
                  "CSV import & blast",
                  "Team management",
                  "Real-time notifications",
                  "Command palette (⌘K)",
                ].map((x) => (
                  <li key={x} className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> {x}
                  </li>
                ))}
              </ul>

              <button
                onClick={(e) => { e.stopPropagation(); handleSelectPlan("standard"); }}
                className="mt-6 w-full rounded-2xl bg-emerald-500 px-5 py-3 font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:brightness-110"
              >
                Start with Standard
              </button>
            </div>

            {/* AI */}
            <div
              onClick={() => handleSelectPlan("ai")}
              className={`group relative cursor-pointer overflow-hidden rounded-3xl border-2 p-7 backdrop-blur transition hover:-translate-y-1 hover:shadow-2xl ${selectedPlan === "ai" ? "border-cyan-400/80 shadow-2xl shadow-cyan-500/30" : "border-cyan-500/70"} bg-gradient-to-br from-cyan-950/40 via-zinc-900/80 to-violet-950/30`}
            >
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-500/30 blur-3xl" />
              <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-violet-500/30 blur-3xl" />

              <div className="relative">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Text2Sale + AI</div>
                  <span className="inline-flex items-center rounded-full bg-gradient-to-r from-amber-400 to-rose-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-950 shadow">
                    Most Popular
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">$59.99</span>
                  <span className="text-sm text-zinc-400">/month</span>
                </div>
                <div className="mt-1 text-sm text-zinc-400">+ $0.012 per SMS · $0.025 per AI reply</div>

                <ul className="mt-6 space-y-2.5 text-sm text-zinc-200">
                  {[
                    "Everything in Standard",
                    "AI auto-replies (sounds human)",
                    "Full AI mode — handles every reply",
                    "Per-conversation AI toggle",
                    "AI appointment booking",
                    "Google Calendar sync",
                    "Sentiment-scored bubbles + smart replies",
                    "SPIN selling & objection handling",
                    "Lead temperature + smart send windows",
                  ].map((x) => (
                    <li key={x} className="flex items-center gap-2">
                      <span className="text-cyan-400">✓</span> {x}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={(e) => { e.stopPropagation(); handleSelectPlan("ai"); }}
                  className="relative mt-6 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500 px-5 py-3 font-bold text-white shadow-xl shadow-cyan-500/30 transition hover:brightness-110"
                >
                  Start with AI → Close more
                </button>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-6 max-w-4xl">
            <div className="rounded-2xl border border-emerald-800/50 bg-emerald-950/30 px-4 py-3 text-center text-sm text-emerald-200">
              💰 <span className="font-semibold">Volume discounts:</span> Save 10% on $100+ wallet adds &middot; Save 15% on $500+
            </div>
          </div>

          {/* Sign-in / Sign-up form */}
          <div id="auth-form" className="mx-auto mt-16 max-w-xl">
            <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-8 shadow-2xl ring-1 ring-white/5" onKeyDown={handleKeyDown}>
              <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />

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
                      mode === "login" ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => { setMode("signup"); setError(""); }}
                    className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      mode === "signup" ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30" : "text-zinc-400 hover:text-white"
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
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-500 transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-zinc-200">Password</label>
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-500 transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
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
                      className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 px-5 py-4 font-bold text-white shadow-xl shadow-violet-500/30 transition hover:brightness-110 disabled:opacity-60"
                    >
                      {loading ? "Signing in..." : "Sign in → Dashboard"}
                    </button>

                    <div className="text-center text-sm text-zinc-500">
                      New here?{" "}
                      <button onClick={() => { setMode("signup"); setError(""); }} className="font-semibold text-violet-400 hover:text-violet-300">
                        Create an account
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`relative flex h-2.5 w-2.5`}>
                          <span className={`absolute inset-0 animate-ping rounded-full opacity-60 ${selectedPlan === "ai" ? "bg-cyan-400" : "bg-emerald-400"}`} />
                          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${selectedPlan === "ai" ? "bg-cyan-400" : "bg-emerald-400"}`} />
                        </span>
                        <span className="text-sm font-semibold text-white">
                          {selectedPlan === "ai" ? "Text2Sale + AI" : "Standard"} — <span className="text-zinc-400">${selectedPlan === "ai" ? "59.99" : "39.99"}/mo</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPlan(selectedPlan === "ai" ? "standard" : "ai")}
                        className="text-xs font-semibold text-violet-400 hover:text-violet-300"
                      >
                        Switch
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-zinc-200">First name</label>
                        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30" placeholder="Jane" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-zinc-200">Last name</label>
                        <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30" placeholder="Doe" />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-zinc-200">Email</label>
                      <input value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30" placeholder="you@example.com" />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-zinc-200">Phone number</label>
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30" placeholder="(555) 123-4567" />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-zinc-200">Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30" placeholder="At least 6 chars" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-zinc-200">Confirm</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30" placeholder="Repeat it" />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-zinc-200">
                        Referral Code <span className="ml-1 text-xs font-normal text-emerald-400">(Optional — $50 deposit = both get $50!)</span>
                      </label>
                      <input value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 font-mono uppercase tracking-wider text-white outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-zinc-500 transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30" placeholder="e.g. T2S-ABC123" />
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedToPrivacy}
                        onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-600 bg-zinc-800 accent-violet-600"
                      />
                      <span className="text-sm text-zinc-400">
                        I have read and agree to the{" "}
                        <button type="button" onClick={(e) => { e.preventDefault(); setShowPrivacyPolicy(true); }} className="font-semibold text-violet-400 underline hover:text-violet-300">
                          Privacy Policy
                        </button>
                        {" "}(<a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-violet-400 underline hover:text-violet-300">full page</a>).
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
                        I have read and agree to be bound by the{" "}
                        <button type="button" onClick={(e) => { e.preventDefault(); setShowTerms(true); }} className="font-semibold text-violet-400 underline hover:text-violet-300">
                          Terms and Conditions
                        </button>
                        {" "}(<a href="/terms" target="_blank" rel="noopener noreferrer" className="text-violet-400 underline hover:text-violet-300">full page</a>).
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
                      className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 px-5 py-4 font-bold text-white shadow-xl shadow-violet-500/30 transition hover:brightness-110 disabled:opacity-60"
                    >
                      {loading ? "Creating account..." : "Create account → Go to Dashboard"}
                    </button>
                    <div className="text-center text-[11px] text-zinc-500">
                      By creating an account you agree to all terms above. Cancel anytime.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

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
              <p><strong className="text-white">Help:</strong> Reply <span className="font-mono text-white">HELP</span> for assistance, or email <span className="text-violet-400">support@text2sale.com</span>.</p>
              <p><strong className="text-white">Carriers:</strong> Carriers are not liable for delayed or undelivered messages.</p>
            </div>
            <div className="flex gap-4 text-xs">
              <a href="/privacy-policy" className="text-violet-400 hover:text-violet-300 underline">Privacy Policy</a>
              <a href="/terms" className="text-violet-400 hover:text-violet-300 underline">Terms and Conditions</a>
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
                className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 font-bold text-white shadow-lg shadow-violet-500/30 hover:brightness-110 transition"
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
                className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 font-bold text-white shadow-lg shadow-violet-500/30 hover:brightness-110 transition"
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
          <div className="text-sm text-zinc-500">© {new Date().getFullYear()} Text2Sale. All rights reserved.</div>
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
