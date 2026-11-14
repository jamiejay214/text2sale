"use client";

import { useState } from "react";
import { Gift, X } from "lucide-react";

const DISMISS_KEY = "t2s_referral_banner_dismissed";

/** The invite link a customer shares: opens signup with their code filled in. */
export function referralLink(code: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}/?ref=${encodeURIComponent(code)}`;
}

/**
 * Dashboard home banner: "Refer a friend, get $100 in credits". The reward is
 * paid by the Stripe webhook once the friend's deposits reach $50 ($100 to the
 * referrer, $50 to the friend). Dismissible per browser.
 */
export default function ReferralBanner({ code }: { code?: string | null }) {
  const [hidden, setHidden] = useState(() => {
    try { return typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });
  const [copied, setCopied] = useState(false);

  if (!code || hidden) return null;
  const link = referralLink(code, typeof window === "undefined" ? "https://text2sale.com" : window.location.origin);

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  const share = async () => {
    const text = "I use Text2Sale for texting and calling my leads. Sign up with my link and get $50 in credits:";
    if (navigator.share) {
      try { await navigator.share({ title: "Text2Sale", text, url: link }); return; } catch { return; }
    }
    await copy();
  };
  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setHidden(true);
  };

  return (
    <section className="v2-referral-banner" aria-label="Refer a friend">
      <span className="v2-referral-gift"><Gift size={26} /></span>
      <div className="v2-referral-copy">
        <h2>Refer a friend, get <b>$100 in credits</b></h2>
        <p>Share your link. When your friend signs up and adds $50 to their wallet, $100 in credits lands in your account automatically, and they get $50 too.</p>
      </div>
      <div className="v2-referral-actions">
        <code>{code}</code>
        <button className="v2-referral-copy-btn" onClick={copy}>{copied ? "Link copied!" : "Copy invite link"}</button>
        <button className="v2-referral-share" onClick={share}>Share</button>
      </div>
      <button className="v2-referral-close" onClick={dismiss} aria-label="Hide referral banner"><X size={16} /></button>
    </section>
  );
}
