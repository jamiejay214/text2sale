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
    </main>
  );
}
