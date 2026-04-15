"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";

export default function ThankYouPage() {
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("textalot_signup_first_name");
      if (saved) setFirstName(saved);
    } catch {}
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-white">
      {/* ambient gradient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
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
          Welcome to Text2Sale{firstName ? `, ${firstName}` : ""} 🎉
        </h1>
        <p className="mt-4 max-w-xl text-center text-lg text-zinc-400">
          Your account is all set. You&apos;re one step away from sending your
          first campaign.
        </p>

        {/* next steps */}
        <div className="mt-12 grid w-full gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-xl">
              1️⃣
            </div>
            <h3 className="mt-4 font-semibold">Register your business (10DLC)</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Carriers require 10DLC approval before you can purchase a number. Takes 1–3 business days.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-xl">
              2️⃣
            </div>
            <h3 className="mt-4 font-semibold">Buy a phone number</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Once your 10DLC is approved, pick a local number and start messaging.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-xl">
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
            className="rounded-2xl bg-violet-600 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition hover:bg-violet-500"
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
            className="text-zinc-400 hover:text-violet-400"
          >
            support@text2sale.com
          </a>
        </p>
      </div>
    </div>
  );
}
