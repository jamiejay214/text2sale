"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase";
import { trackCheckout, type VerifiedCheckout } from "@/lib/track-checkout";

export default function ThankYouPage() {
  const [firstName, setFirstName] = useState("");
  const [paymentState, setPaymentState] = useState<"checking" | "verified" | "unverified">("checking");

  useEffect(() => {
    const firstNameTimer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem("textalot_signup_first_name");
        if (saved) setFirstName(saved);
      } catch {}
    }, 0);

    const controller = new AbortController();
    let retryTimer: number | undefined;
    async function verifyPayment() {
      try {
        const sessionId = new URLSearchParams(window.location.search).get("session_id");
        if (!sessionId) { setPaymentState("unverified"); return; }
        const { data: { session } } = await supabase.auth.getSession();
        if (controller.signal.aborted) return;
        if (!session) { setPaymentState("unverified"); return; }
        const response = await fetch("/api/checkout-conversion", {
          method: "POST", signal: controller.signal,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ sessionId }),
        });
        if (!response.ok) throw new Error("Payment verification failed");
        const checkout: VerifiedCheckout = await response.json();
        if (controller.signal.aborted) return;
        setPaymentState(checkout.verified ? "verified" : "unverified");
        if (!checkout.verified || !checkout.trackable || !/^(www\.)?text2sale\.com$/.test(window.location.hostname)) return;
        let attempts = 0;
        function reportWhenReady() {
          if (controller.signal.aborted) return;
          const pixel = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
          // Wait for the layout's afterInteractive pixel bootstrap instead of
          // silently losing the conversion when the effect runs first.
          let storage: Storage;
          try { storage = window.localStorage; } catch { return; }
          if (!trackCheckout(checkout, pixel, storage) && ++attempts < 60) {
            retryTimer = window.setTimeout(reportWhenReady, 500);
          }
        }
        reportWhenReady();
      } catch {
        if (!controller.signal.aborted) setPaymentState("unverified");
      }
    }
    void verifyPayment();
    return () => { controller.abort(); window.clearTimeout(firstNameTimer); window.clearTimeout(retryTimer); };
  }, []);

  return (
    <div className="public-theme relative min-h-screen overflow-hidden bg-zinc-950 text-white">
      {/* ambient gradient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-lime-300/15 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16">
        <div className="mb-8">
          <Logo />
        </div>

        {/* success check animation */}
        <div className="relative mb-8">
          <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/40" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/40">
            <svg
              className="h-10 w-10 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-center text-4xl font-bold tracking-tight sm:text-5xl">
          {paymentState === "verified" ? `Welcome to Text2Sale${firstName ? `, ${firstName}` : ""} 🎉` : "Your Text2Sale account"}
        </h1>
        <p className="mt-4 max-w-xl text-center text-lg text-zinc-400">
          {paymentState === "checking" ? "Checking your payment confirmation…" : paymentState === "verified"
            ? "Your payment is confirmed. Complete messaging setup to prepare your first campaign."
            : "We could not verify a completed payment from this link. Open your dashboard to check your subscription before trying another payment."}
        </p>

        {/* next steps */}
        <div className="mt-12 grid w-full gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-300/15 text-xl">
              1️⃣
            </div>
            <h3 className="mt-4 font-semibold">Register your business (10DLC)</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Carriers require 10DLC approval before you can purchase a number. Takes 1–3 business days.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-300/15 text-xl">
              2️⃣
            </div>
            <h3 className="mt-4 font-semibold">Buy a phone number</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Once your 10DLC is approved, pick a local number and start messaging.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-300/15 text-xl">
              3️⃣
            </div>
            <h3 className="mt-4 font-semibold">Launch a campaign</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Import contacts, craft a message, hit send. It&apos;s that simple.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard?tab=settings&subtab=10dlc"
            className="rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-400 px-8 py-4 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/20 transition hover:brightness-110"
          >
            Start 10DLC Registration →
          </Link>
          <Link
            href="/dashboard"
            className="rounded-2xl border border-zinc-700 px-8 py-4 text-sm font-semibold text-zinc-300 transition hover:border-zinc-600 hover:text-white"
          >
            View Dashboard
          </Link>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-600">
          Need help getting started? Email{" "}
          <a
            href="mailto:support@text2sale.com"
            className="text-zinc-400 hover:text-lime-300"
          >
            support@text2sale.com
          </a>
        </p>
      </div>
    </div>
  );
}
