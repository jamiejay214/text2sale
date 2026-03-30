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

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/");
        return;
      }

      const p = await fetchProfile(session.user.id);
      if (!p) {
        router.push("/");
        return;
      }

      setProfile(p);
      setLoading(false);
    })();
  }, [router]);

  const creditDiscountPreview = useMemo(() => {
    const base = 100;
    const discount = 0.1;
    const final = base - base * discount;
    return { discountPercent: 10, final };
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

    const discounted = amount >= 100 ? amount * 0.9 : amount;

    const newBalance = Number(profile.wallet_balance) + discounted;
    const entry: import("@/lib/types").UsageHistoryItem = {
      id: crypto.randomUUID(),
      type: "fund_add",
      amount: discounted,
      description: `Purchased $${amount} in credits${amount >= 100 ? " (10% discount)" : ""}`,
      createdAt: new Date().toISOString(),
    };
    const newHistory = [...(profile.usage_history || []), entry];

    await persistProfile({
      wallet_balance: newBalance,
      usage_history: newHistory,
    });

    setMessage(
      amount >= 100
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
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 transition"
            >
              Go to Dashboard
            </button>
          </div>
        </div>

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
                    className="w-full rounded-2xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-left font-medium text-emerald-300 hover:bg-emerald-950/60 transition"
                  >
                    Add $100.00 &rarr; 10% off = $90.00
                  </button>

                  <button
                    onClick={() => handlePurchaseCredits(250)}
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-left font-medium text-zinc-200 hover:bg-zinc-700 transition"
                  >
                    Add $250.00
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-800/40 p-4">
                  <div className="text-sm font-semibold text-zinc-300">Discount Example</div>
                  <div className="mt-2 text-sm text-zinc-400">
                    $100 in credits gets {creditDiscountPreview.discountPercent}% off, so you only
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
