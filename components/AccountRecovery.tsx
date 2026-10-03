"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockKeyhole, MailCheck } from "lucide-react";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase";

export default function AccountRecovery({
  mode,
}: {
  mode: "forgot" | "reset" | "verify";
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [checking, setChecking] = useState(mode === "reset");
  const [ready, setReady] = useState(mode !== "reset");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        active &&
        mode === "reset" &&
        (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") &&
        session
      ) {
        setReady(true);
        setChecking(false);
      }
    });
    if (mode === "reset") {
      supabase.auth
        .getSession()
        .then(({ data, error }) => {
          if (active) {
            setReady(Boolean(data.session) && !error);
            setChecking(false);
          }
        })
        .catch(() => {
          if (active) {
            setReady(false);
            setChecking(false);
          }
        });
    } else if (mode === "verify") {
      supabase.auth
        .getUser()
        .then(({ data }) => {
          if (!active) return;
          if (data.user?.email_confirmed_at)
            router.replace("/dashboard?tab=settings");
          else if (data.user?.email) setEmail(data.user.email);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [mode, router]);

  const copy = {
    forgot: {
      title: "Let's get you back in.",
      description:
        "Enter your account email and we'll send you a secure password reset link.",
      action: "Send reset link",
      success:
        "If an account exists for this email, a reset link is on its way. Check your inbox and spam folder.",
    },
    reset: {
      title: "Choose a fresh start.",
      description:
        "Use at least 8 characters. Choose a password you don't use elsewhere.",
      action: "Update password",
      success:
        "Your password has been updated. Sign in with your new password.",
    },
    verify: {
      title: "Check your inbox.",
      description:
        "Confirm your email using the link we sent you. Then sign in to finish your business registration, connect a number, and fund your account.",
      action: "Resend confirmation email",
      success:
        "If this account needs confirmation, a new link has been sent. Check your inbox and spam folder.",
    },
  }[mode];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (mode === "reset" && password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (mode === "reset" && password !== confirm) {
      setError("The passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const origin = window.location.origin;
      if (mode === "reset") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          setError(error.message);
          return;
        }
        await supabase.auth.signOut();
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: `${origin}/reset-password` },
        );
        if (error) {
          setError(error.message);
          return;
        }
      } else {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email: email.trim(),
          options: { emailRedirectTo: `${origin}/dashboard` },
        });
        if (error) {
          setError(error.message);
          return;
        }
      }
      setDone(true);
    } catch {
      setError("We couldn't complete that request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="recovery-page">
      <section className="recovery-card">
        <div className="recovery-brand">
          <Logo size="sm" />
          <span className="brand-symbol">
            {mode === "reset" ? (
              <LockKeyhole size={18} />
            ) : (
              <MailCheck size={18} />
            )}
          </span>
        </div>
        <h1>{copy.title}</h1>
        {checking ? (
          <p role="status">Checking your reset link…</p>
        ) : done ? (
          <div className="auth-notice" role="status">
            {copy.success}
          </div>
        ) : !ready ? (
          <>
            <p>
              This reset link has expired or is invalid. Request a new link to
              continue.
            </p>
            <Link href="/forgot-password">Get a new reset link</Link>
          </>
        ) : (
          <>
            <p>{copy.description}</p>
            <form onSubmit={submit}>
              {mode === "reset" ? (
                <>
                  <label htmlFor="new-password">New password</label>
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <label htmlFor="confirm-password">Confirm password</label>
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </>
              ) : (
                <>
                  <label htmlFor="account-email">Account email</label>
                  <input
                    id="account-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </>
              )}
              {error && (
                <p role="alert" className="recovery-error">
                  {error}
                </p>
              )}
              <button className="marketing-button lime" disabled={busy}>
                {busy ? "Please wait…" : copy.action}
              </button>
            </form>
          </>
        )}
        <Link href="/#auth-form">Back to sign in</Link>
      </section>
    </main>
  );
}
