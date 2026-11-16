"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginUser } from "@/lib/auth";
import Logo from "@/components/Logo";

const field =
  "w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-500 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

// Sign-in used to sit in the middle of the homepage, so every visitor
// scrolled past a password box. Customers now sign in here.
export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError("");
    if (!email.trim()) return setError("Email is required.");
    if (!password.trim()) return setError("Password is required.");
    setLoading(true);
    try {
      const result = await loginUser(email, password);
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Something went wrong signing in. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-md rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-8 shadow-2xl ring-1 ring-white/5">
      <Logo size="md" />
      <h1 className="mt-4 text-2xl font-bold text-white">Log in to Text2Sale</h1>
      <p className="mt-1 text-sm text-zinc-400">Welcome back. Log in and keep closing.</p>

      <label htmlFor="login-email" className="mb-2 mt-6 block text-sm font-semibold text-zinc-200">Email</label>
      <input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={field} placeholder="you@example.com" autoComplete="email" />

      <div className="mb-2 mt-4 flex items-center justify-between gap-3">
        <label htmlFor="login-password" className="block text-sm font-semibold text-zinc-200">Password</label>
        <Link href="/forgot-password" className="text-xs font-semibold text-lime-300 hover:text-lime-200">Forgot password?</Link>
      </div>
      <input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className={field} placeholder="••••••••" autoComplete="current-password" />

      {error && <div role="alert" className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">{error}</div>}

      <button type="submit" disabled={loading} className="mt-6 w-full rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-400 to-emerald-400 px-5 py-4 font-bold text-emerald-950 shadow-xl shadow-emerald-500/20 transition hover:brightness-110 disabled:opacity-60">
        {loading ? "Signing in..." : "Sign in → Dashboard"}
      </button>

      <p className="mt-5 text-center text-sm text-zinc-500">
        New here? <Link href="/?signup=1#auth-form" className="font-semibold text-lime-300 hover:text-lime-200">Create an account</Link>
      </p>
    </form>
  );
}
