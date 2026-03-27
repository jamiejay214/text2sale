"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type StoredUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  referralCode?: string;
  credits: number;
  verified: boolean;
  paused: boolean;
  workflowNote?: string;
  usageHistory: {
    id: string;
    type: "charge" | "credit_add" | "credit_remove";
    amount: number;
    description: string;
    createdAt: string;
  }[];
  plan: {
    name: string;
    price: number;
    messageCost: number;
  };
  createdAt: string;
};

export default function HomePage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");

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

  const plan = {
    name: "TextALot Package",
    price: 39.99,
    messageCost: 0.012,
  };

  const handleLogin = () => {
    setError("");

    if (!loginEmail.trim()) return setError("Email is required.");
    if (!loginPassword.trim()) return setError("Password is required.");

    const users: StoredUser[] = JSON.parse(
      localStorage.getItem("textalot_accounts") || "[]"
    );

    const foundUser = users.find(
      (user) =>
        user.email.toLowerCase() === loginEmail.toLowerCase() &&
        user.password === loginPassword
    );

    if (!foundUser) {
      setError("Invalid email or password.");
      return;
    }

    if (foundUser.paused) {
      setError("This account is paused. Contact support.");
      return;
    }

    localStorage.setItem("textalot_current_user", JSON.stringify(foundUser));
    router.push("/dashboard");
  };

  const handleSignup = () => {
    setError("");

    if (!firstName.trim()) return setError("First name is required.");
    if (!lastName.trim()) return setError("Last name is required.");
    if (!signupEmail.trim()) return setError("Email is required.");
    if (!phone.trim()) return setError("Phone number is required.");
    if (!password.trim()) return setError("Password is required.");
    if (!confirmPassword.trim()) return setError("Confirm password is required.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    const users: StoredUser[] = JSON.parse(
      localStorage.getItem("textalot_accounts") || "[]"
    );

    const alreadyExists = users.some(
      (user) => user.email.toLowerCase() === signupEmail.toLowerCase()
    );

    if (alreadyExists) {
      setError("An account with that email already exists.");
      return;
    }

    const newUser: StoredUser = {
      id: `acct_${Date.now()}`,
      firstName,
      lastName,
      email: signupEmail,
      phone,
      password,
      referralCode,
      credits: 0,
      verified: false,
      paused: false,
      workflowNote: "",
      usageHistory: [],
      plan,
      createdAt: new Date().toISOString(),
    };

    const updatedUsers = [...users, newUser];
    localStorage.setItem("textalot_accounts", JSON.stringify(updatedUsers));
    localStorage.setItem("textalot_current_user", JSON.stringify(newUser));

    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-2">
        <div className="hidden bg-[#5b39d3] lg:flex lg:items-center lg:justify-center">
          <div className="max-w-xl px-10 text-white">
            <div className="mb-4 text-4xl font-bold">TextALot</div>
            <div className="text-lg leading-8 text-white/90">
              One simple plan. Log in, upload leads, choose a campaign, and start texting.
            </div>

            <div className="mt-10 rounded-3xl bg-white/10 p-6 backdrop-blur">
              <div className="text-2xl font-bold">$39.99 / month</div>
              <div className="mt-2 text-white/90">$0.012 per text message</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-sm">
            <div className="mb-6">
              <div className="text-3xl font-bold text-[#5b39d3]">TextALot</div>
              <div className="mt-2 text-sm text-slate-500">
                {mode === "login"
                  ? "Log in to your account and start texting."
                  : "Create your account and go straight to your dashboard."}
              </div>
            </div>

            <div className="mb-6 flex rounded-2xl bg-slate-100 p-1">
              <button
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium ${
                  mode === "login"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                Login
              </button>
              <button
                onClick={() => {
                  setMode("signup");
                  setError("");
                }}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium ${
                  mode === "signup"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                Create Account
              </button>
            </div>

            {mode === "login" ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Email</label>
                  <input
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Password</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3"
                    placeholder="Enter your password"
                  />
                </div>

                {error ? (
                  <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <button
                  onClick={handleLogin}
                  className="w-full rounded-2xl bg-[#6c5ce7] px-5 py-4 font-semibold text-white hover:bg-[#5b39d3]"
                >
                  Sign In
                </button>

                <div className="text-center text-sm text-slate-500">
                  New here?{" "}
                  <button
                    onClick={() => {
                      setMode("signup");
                      setError("");
                    }}
                    className="font-medium text-[#6c5ce7]"
                  >
                    Create an account
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">First name</label>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3"
                      placeholder="Enter first name"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Last name</label>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3"
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Email</label>
                  <input
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3"
                    placeholder="Enter email"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Phone number</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3"
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3"
                      placeholder="Enter password"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Confirm password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3"
                      placeholder="Confirm password"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Referral Code (Optional)
                  </label>
                  <input
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3"
                    placeholder="Enter referral code"
                  />
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="font-semibold">Plan: TextALot Package</div>
                  <div className="mt-1">$39.99 per month</div>
                  <div>$0.012 per text message</div>
                </div>

                {error ? (
                  <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <button
                  onClick={handleSignup}
                  className="w-full rounded-2xl bg-[#6c5ce7] px-5 py-4 font-semibold text-white hover:bg-[#5b39d3]"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}