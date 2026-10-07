"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import Logo from "@/components/Logo";
import { loginUser, logoutUser } from "@/lib/auth";
import { checkAdminAccess } from "@/lib/admin-access";

export default function AdminAccess({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "signed-out" | "denied" | "authorized" | "error">("checking");
  const [attempt, setAttempt] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    checkAdminAccess().then((next) => {
      if (active) setState(next);
    }).catch((reason) => {
      if (!active) return;
      setError(reason instanceof Error ? reason.message : "Could not open admin. Please try again.");
      setState("error");
    });
    return () => { active = false; };
  }, [attempt]);

  function retry() {
    setError("");
    setState("checking");
    setAttempt((value) => value + 1);
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await loginUser(email, password);
      if (!result.success) { setError(result.message); return; }
      setPassword("");
      retry();
    } finally {
      setBusy(false);
    }
  }

  async function switchAccount() {
    setBusy(true);
    setError("");
    try {
      await logoutUser();
      setState("signed-out");
    } catch {
      setError("Could not sign out. Please try again.");
    } finally { setBusy(false); }
  }

  if (state === "authorized") return children;

  return (
    <main className="crm-theme recovery-page">
      <section className="recovery-card" aria-busy={busy || state === "checking"}>
        <Link href="/" className="recovery-brand" aria-label="Text2Sale home"><Logo /></Link>
        <LockKeyhole size={28} aria-hidden="true" />
        <h1>Admin sign in</h1>
        <p>Secure access to Text2Sale administration.</p>
        {state === "checking" && <p role="status">Checking your session…</p>}
        {state === "signed-out" && (
          <form onSubmit={signIn}>
            <label htmlFor="admin-email">Email address</label>
            <input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} />
            <label htmlFor="admin-password">Password</label>
            <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} />
            {error && <p role="alert" className="recovery-error">{error}</p>}
            <button className="marketing-button lime" disabled={busy}>{busy ? "Signing in…" : "Sign in to admin"}</button>
            <Link href="/forgot-password">Forgot password?</Link>
          </form>
        )}
        {state === "denied" && <p role="alert">This account does not have admin access.</p>}
        {state !== "signed-out" && error && <p role="alert" className="recovery-error">{error}</p>}
        {state === "error" && <button className="marketing-button lime" onClick={retry}>Try again</button>}
        {(state === "denied" || state === "error") && <button className="marketing-button" disabled={busy} onClick={switchAccount}>Sign in with another account</button>}
        <Link href="/dashboard">Go to dashboard</Link>
      </section>
    </main>
  );
}
