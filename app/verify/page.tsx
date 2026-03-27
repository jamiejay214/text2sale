"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard, FileText, ShieldCheck } from "lucide-react";

type Plan = {
  key: "starter" | "textalot" | "elite";
  name: string;
  price: number;
  freeCredits: number;
  messageCost: number;
  accent: string;
  badge: string;
};

type AccountRecord = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  referralCode?: string;
  plan: Plan;
  credits: number;
  createdAt: string;
  verified: boolean;
  einNumber: string;
  einCertificateName: string;
  workflowNote?: string;
};

export default function VerifyPage() {
  const router = useRouter();
  const [account, setAccount] = useState<AccountRecord | null>(null);
  const [einNumber, setEinNumber] = useState("");
  const [einFileName, setEinFileName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("textalot_pending_signup");
    if (!raw) {
      router.push("/");
      return;
    }

    const parsed = JSON.parse(raw) as AccountRecord;
    setAccount(parsed);
    setEinNumber(parsed.einNumber || "");
    setEinFileName(parsed.einCertificateName || "");
  }, [router]);

  const creditDiscountPreview = useMemo(() => {
    const base = 100;
    const discount = 0.1;
    const final = base - base * discount;
    return {
      discountPercent: 10,
      final,
    };
  }, []);

  const updateStoredAccount = (updates: Partial<AccountRecord>) => {
    if (!account) return;

    const updated = { ...account, ...updates };
    setAccount(updated);
    localStorage.setItem("textalot_pending_signup", JSON.stringify(updated));
    localStorage.setItem("textalot_current_user", JSON.stringify(updated));

    const all = JSON.parse(localStorage.getItem("textalot_accounts") || "[]");
    const updatedAll = all.map((item: AccountRecord) =>
      item.id === updated.id ? updated : item
    );
    localStorage.setItem("textalot_accounts", JSON.stringify(updatedAll));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEinFileName(file.name);
    updateStoredAccount({ einCertificateName: file.name });
  };

  const handleSubmitVerification = () => {
    if (!account) return;
    if (!einNumber.trim()) {
      setMessage("EIN number is required.");
      return;
    }
    if (!einFileName.trim()) {
      setMessage("Please upload your EIN certificate.");
      return;
    }

    updateStoredAccount({
      einNumber,
      einCertificateName: einFileName,
      verified: true,
    });

    setMessage("Verification submitted successfully.");
  };

  const handlePurchaseCredits = (amount: number) => {
    if (!account) return;

    const discounted = amount >= 100 ? amount * 0.9 : amount;
    const purchasedCredits = discounted;

    updateStoredAccount({
      credits: Number(account.credits) + purchasedCredits,
    });

    setMessage(
      amount >= 100
        ? `Credits purchased with 10% discount. $${amount} became $${discounted.toFixed(
            2
          )}.`
        : `Credits purchased: $${discounted.toFixed(2)}.`
    );
  };

  if (!account) return null;

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold tracking-tight">Verify your account</div>
            <div className="mt-2 text-sm text-slate-500">
              Confirm your information, upload your EIN certificate, and activate your workspace.
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/")}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
            >
              Back Home
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
            >
              Go to Dashboard
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <div className="mb-6 text-2xl font-bold">Submitted Information</div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard label="First Name" value={account.firstName} />
              <InfoCard label="Last Name" value={account.lastName} />
              <InfoCard label="Phone Number" value={account.phone} />
              <InfoCard label="Email" value={account.email} />
              <InfoCard label="Referral Code" value={account.referralCode || "None"} />
              <InfoCard label="Selected Plan" value={account.plan.name} />
            </div>

            <div className="mt-8 rounded-3xl bg-slate-50 p-6 ring-1 ring-slate-200">
              <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <ShieldCheck className="h-5 w-5 text-slate-900" />
                EIN Verification
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">EIN Number</label>
                  <input
                    value={einNumber}
                    onChange={(e) => {
                      setEinNumber(e.target.value);
                      updateStoredAccount({ einNumber: e.target.value });
                    }}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-900"
                    placeholder="12-3456789"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    EIN Certificate Upload
                  </label>
                  <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-slate-400 bg-white px-4 py-3 text-sm text-slate-600 hover:bg-slate-50">
                    <span>{einFileName || "Upload EIN certificate"}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <span className="rounded-xl bg-slate-900 px-3 py-2 text-white">
                      Upload
                    </span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleSubmitVerification}
                className="mt-5 w-full rounded-2xl bg-slate-900 px-5 py-4 text-base font-semibold text-white transition hover:bg-slate-800"
              >
                Submit Verification
              </button>
            </div>

            {message && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <div className="mb-6 text-2xl font-bold">Account + Credits</div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <div className="text-sm text-slate-500">Plan</div>
                <div className="mt-1 text-xl font-bold">{account.plan.name}</div>
                <div className="mt-2 text-sm text-slate-600">
                  ${account.plan.price.toFixed(2)}/month • {account.plan.freeCredits} free
                  credits • ${account.plan.messageCost.toFixed(3)} per message
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <div className="text-sm text-slate-500">Current Credits</div>
                <div className="mt-1 text-3xl font-bold">{account.credits}</div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <div className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <CreditCard className="h-5 w-5 text-slate-900" />
                  Buy Credits
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => handlePurchaseCredits(50)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-left font-medium hover:bg-slate-50"
                  >
                    Buy $50 in credits
                  </button>

                  <button
                    onClick={() => handlePurchaseCredits(100)}
                    className="w-full rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-left font-medium text-emerald-800 hover:bg-emerald-100"
                  >
                    Buy $100 in credits → 10% off = $90
                  </button>

                  <button
                    onClick={() => handlePurchaseCredits(250)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-left font-medium hover:bg-slate-50"
                  >
                    Buy $250 in credits
                  </button>
                </div>

                <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <div className="text-sm font-semibold text-slate-700">
                    Discount Example
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    $100 in credits gets {creditDiscountPreview.discountPercent}% off, so
                    you only pay ${creditDiscountPreview.final.toFixed(2)}.
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <div className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <FileText className="h-5 w-5 text-slate-900" />
                  Verification Status
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2
                    className={`h-5 w-5 ${
                      account.verified ? "text-emerald-600" : "text-slate-300"
                    }`}
                  />
                  <span className={account.verified ? "text-emerald-700" : "text-slate-500"}>
                    {account.verified ? "Verified" : "Pending verification"}
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
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-base font-semibold text-slate-900">{value}</div>
    </div>
  );
}