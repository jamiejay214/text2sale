"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard, FileText, ShieldCheck, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchProfile, updateProfile } from "@/lib/supabase-data";
import type { Profile } from "@/lib/types";

export default function VerifyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [einNumber, setEinNumber] = useState("");
  const [einFileName, setEinFileName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  // emailConfirmedAt = null means they signed up but never clicked the
  // confirmation link in the email Supabase sent. We show a "verify
  // your email" banner + resend button at the top in that case.
  const [emailConfirmedAt, setEmailConfirmedAt] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/");
        return;
      }

      setEmailConfirmedAt(session.user.email_confirmed_at || null);
      setUserEmail(session.user.email || "");

      const p = await fetchProfile(session.user.id);
      if (!p) {
        router.push("/");
        return;
      }

      setProfile(p);
      setLoading(false);
    })();
  }, [router]);

  // Trigger Supabase to resend the signup confirmation email. Rate-limited
  // by Supabase (~once per minute per user) — if they spam the button
  // Supabase returns a 429 which we surface in the message bar.
  const handleResendConfirmation = async () => {
    if (!userEmail) return;
    setResendingEmail(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: userEmail,
      });
      if (error) {
        setMessage(`❌ ${error.message}`);
      } else {
        setMessage(`✅ Confirmation email sent to ${userEmail}. Check your inbox (and spam folder).`);
      }
    } catch (err) {
      setMessage(`❌ ${err instanceof Error ? err.message : "Could not resend"}`);
    } finally {
      setResendingEmail(false);
    }
  };

  const creditDiscountPreview = useMemo(() => {
    // Bulk discount: 10% off at $500+.
    const base = 500;
    const discount = 0.1;
    const final = base - base * discount;
    return { discountPercent: 10, final, threshold: base };
  }, []);

  const persistProfile = async (updates: Partial<Profile>) => {
    if (!profile) return;
    const merged = { ...profile, ...updates };
    setProfile(merged);
    await updateProfile(profile.id, updates);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEinFileName(file.name);
  };

  const handleSubmitVerification = async () => {
    if (!profile) return;
    if (!einNumber.trim()) {
      setMessage("EIN number is required.");
      return;
    }
    if (!einFileName.trim()) {
      setMessage("Please upload your EIN certificate.");
      return;
    }

    await persistProfile({ verified: true });
    setMessage("Verification submitted successfully.");
  };

  const handlePurchaseCredits = async (amount: number) => {
    if (!profile) return;

    // Bulk discount: 10% off when the top-up is $500+.
    const qualifies = amount >= 500;
    const discounted = qualifies ? amount * 0.9 : amount;

    const newBalance = Number(profile.wallet_balance) + discounted;
    const entry: import("@/lib/types").UsageHistoryItem = {
      id: crypto.randomUUID(),
      type: "fund_add",
      amount: discounted,
      description: `Purchased $${amount} in credits${qualifies ? " (10% discount)" : ""}`,
      createdAt: new Date().toISOString(),
    };
    const newHistory = [...(profile.usage_history || []), entry];

    await persistProfile({
      wallet_balance: newBalance,
      usage_history: newHistory,
    });

    setMessage(
      qualifies
        ? `Credits purchased with 10% discount. $${amount} became $${discounted.toFixed(2)}.`
        : `Credits purchased: $${discounted.toFixed(2)}.`
    );
  };

  if (loading || !profile) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </main>
    );
  }

  const plan = profile.plan || { name: "Text2Sale Package", price: 39.99, messageCost: 0.012 };

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold tracking-tight">Verify your account</div>
            <div className="mt-2 text-sm text-zinc-400">
              Confirm your information, upload your EIN certificate, and activate your workspace.
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/")}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 shadow-sm hover:bg-zinc-800 transition"
            >
              <ArrowLeft className="mr-1 inline h-4 w-4" />
              Back
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              disabled={!emailConfirmedAt}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 transition disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
              title={!emailConfirmedAt ? "Verify your email first" : "Go to dashboard"}
            >
              Go to Dashboard
            </button>
          </div>
        </div>

        {/* Email-verification banner — shows up top whenever the user
            hasn't clicked the Supabase confirmation link yet. Without
            this, anyone could sign up with a junk email and burn 10DLC
            registration attempts / Stripe charges on a fake address. */}
        {!emailConfirmedAt && (
          <div className="mb-8 rounded-3xl border border-amber-700/60 bg-amber-950/30 p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">📧</div>
              <div className="flex-1">
                <div className="text-lg font-semibold text-amber-200">Verify your email to continue</div>
                <div className="mt-1 text-sm text-amber-100/80">
                  We sent a confirmation link to <strong className="text-white">{userEmail}</strong>. Click it to unlock your dashboard.
                  Don&apos;t see it? Check spam, or resend below.
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={handleResendConfirmation}
                    disabled={resendingEmail}
                    className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
                  >
                    {resendingEmail ? "Sending…" : "Resend confirmation email"}
                  </button>
                  <button
                    onClick={async () => {
                      // Force a session refresh — Supabase populates
                      // email_confirmed_at on the session once the user
                      // clicks the link, but only after the next refresh.
                      const { data } = await supabase.auth.refreshSession();
                      setEmailConfirmedAt(data.user?.email_confirmed_at || null);
                      if (data.user?.email_confirmed_at) {
                        setMessage("✅ Email verified — you can now go to the dashboard.");
                      } else {
                        setMessage("Still waiting on the click. Check your inbox.");
                      }
                    }}
                    className="rounded-xl border border-amber-700/60 bg-transparent px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-900/30"
                  >
                    I clicked the link — refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          {/* Left column — Info + EIN */}
          <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
            <div className="mb-6 text-2xl font-bold">Submitted Information</div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard label="First Name" value={profile.first_name} />
              <InfoCard label="Last Name" value={profile.last_name} />
              <InfoCard label="Phone Number" value={profile.phone} />
              <InfoCard label="Email" value={profile.email} />
              <InfoCard label="Referral Code" value={profile.referral_code || "None"} />
              <InfoCard label="Selected Plan" value={plan.name} />
            </div>

            <div className="mt-8 rounded-3xl border border-zinc-700 bg-zinc-800/60 p-6">
              <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <ShieldCheck className="h-5 w-5 text-violet-400" />
                EIN Verification
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">EIN Number</label>
                  <input
                    value={einNumber}
                    onChange={(e) => setEinNumber(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-violet-500"
                    placeholder="12-3456789"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    EIN Certificate Upload
                  </label>
                  <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-zinc-600 bg-zinc-800 px-4 py-3 text-sm text-zinc-400 hover:bg-zinc-700/60 transition">
                    <span>{einFileName || "Upload EIN certificate"}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <span className="rounded-xl bg-violet-600 px-3 py-2 text-white text-xs font-medium">
                      Upload
                    </span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleSubmitVerification}
                className="mt-5 w-full rounded-2xl bg-violet-600 px-5 py-4 text-base font-semibold text-white transition hover:bg-violet-700"
              >
                Submit Verification
              </button>
            </div>

            {message && (
              <div className="mt-5 rounded-2xl border border-emerald-800 bg-emerald-950/60 px-4 py-3 text-sm text-emerald-300">
                {message}
              </div>
            )}
          </section>

          {/* Right column — Account + Credits */}
          <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
            <div className="mb-6 text-2xl font-bold">Account + Credits</div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-700 bg-zinc-800/60 p-5">
                <div className="text-sm text-zinc-400">Plan</div>
                <div className="mt-1 text-xl font-bold">{plan.name}</div>
                <div className="mt-2 text-sm text-zinc-400">
                  ${plan.price.toFixed(2)}/month &bull; ${plan.messageCost.toFixed(3)} per message
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-700 bg-zinc-800/60 p-5">
                <div className="text-sm text-zinc-400">Wallet Balance</div>
                <div className="mt-1 text-3xl font-bold text-emerald-400">
                  ${Number(profile.wallet_balance).toFixed(2)}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-700 bg-zinc-800/60 p-5">
                <div className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <CreditCard className="h-5 w-5 text-violet-400" />
                  Add Funds
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => handlePurchaseCredits(50)}
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-left font-medium text-zinc-200 hover:bg-zinc-700 transition"
                  >
                    Add $50.00
                  </button>

                  <button
                    onClick={() => handlePurchaseCredits(100)}
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-left font-medium text-zinc-200 hover:bg-zinc-700 transition"
                  >
                    Add $100.00
                  </button>

                  <button
                    onClick={() => handlePurchaseCredits(250)}
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-left font-medium text-zinc-200 hover:bg-zinc-700 transition"
                  >
                    Add $250.00
                  </button>

                  <button
                    onClick={() => handlePurchaseCredits(500)}
                    className="w-full rounded-2xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-left font-medium text-emerald-300 hover:bg-emerald-950/60 transition"
                  >
                    Add $500.00 &rarr; 10% off = $450.00
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-800/40 p-4">
                  <div className="text-sm font-semibold text-zinc-300">Discount Example</div>
                  <div className="mt-2 text-sm text-zinc-400">
                    $500 in credits gets {creditDiscountPreview.discountPercent}% off, so you only
                    pay ${creditDiscountPreview.final.toFixed(2)}.
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-700 bg-zinc-800/60 p-5">
                <div className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <FileText className="h-5 w-5 text-violet-400" />
                  Verification Status
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2
                    className={`h-5 w-5 ${
                      profile.verified ? "text-emerald-400" : "text-zinc-600"
                    }`}
                  />
                  <span className={profile.verified ? "text-emerald-400" : "text-zinc-500"}>
                    {profile.verified ? "Verified" : "Pending verification"}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-700 bg-zinc-800/60 p-4">
      <div className="text-sm text-zinc-400">{label}</div>
      <div className="mt-1 text-base font-semibold text-white">{value}</div>
    </div>
  );
}
