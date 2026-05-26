"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ClipboardCopy, Check, Globe, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";

const SITES = [
  { id: "abg", name: "AI Business Growth", color: "#22d3ee", host: "aibusinessgrowth.com" },
  { id: "tq", name: "Trusted Quotes", color: "#34d399", host: "trustedquotes.com" },
  { id: "text2sale", name: "Text2Sale (already installed)", color: "#a78bfa", host: "text2sale.com" },
] as const;

function snippetFor(siteId: string) {
  return `<script src="https://text2sale.com/t2s.js" data-site="${siteId}" defer></script>`;
}

export default function InstallTrackerPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [active, setActive] = useState<(typeof SITES)[number]["id"]>("abg");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Don't redirect off /command/* — the installed PWA/Electron app stays
      // here. If not signed in or not admin, bounce to /command which renders
      // the inline sign-in / not-admin screens.
      if (!session) return router.replace("/command");
      const { data: p } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
      if (!p || p.role !== "admin") return router.replace("/command");
      setAuthed(true);
    })();
  }, [router]);

  const copy = async () => {
    await navigator.clipboard.writeText(snippetFor(active));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  if (!authed) return <div className="flex min-h-screen items-center justify-center bg-[#07060d] text-white/40">Loading…</div>;

  const site = SITES.find((s) => s.id === active)!;

  return (
    <div className="min-h-screen bg-[#07060d] text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/command" className="mb-4 inline-flex items-center gap-2 text-xs text-white/50 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Command Center
        </Link>

        <header className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg,#a855f7,#22d3ee)", boxShadow: "0 0 30px #a855f780" }}>
            <Globe className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Install tracker</h1>
            <p className="text-xs text-white/40">Add one line of HTML to your other sites and they start flowing rich data into the Command Center.</p>
          </div>
        </header>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {SITES.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className="rounded-xl border px-4 py-2 text-sm font-medium transition"
              style={{
                borderColor: active === s.id ? `${s.color}80` : "rgba(255,255,255,0.08)",
                background: active === s.id ? `${s.color}1a` : "rgba(255,255,255,0.02)",
                color: active === s.id ? "#fff" : "rgba(255,255,255,0.55)",
                boxShadow: active === s.id ? `0 0 20px ${s.color}40` : "none",
              }}
            >
              <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ background: s.color }} />
              {s.name}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
          {site.id === "text2sale" ? (
            <p className="text-sm text-emerald-300/90 flex items-center gap-2"><Check className="h-4 w-4" /> Tracker is already running on text2sale.com via the universal <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px]">&lt;Tracker /&gt;</code> in <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px]">app/layout.tsx</code>. Every page is recorded.</p>
          ) : (
            <>
              <h2 className="mb-1 text-base font-semibold text-white/95">Install on {site.host}</h2>
              <p className="mb-4 text-xs text-white/55">
                Paste this <strong>once</strong> inside the <code className="rounded bg-white/10 px-1 text-[11px]">&lt;head&gt;</code> of every page (or in your site&apos;s global header / template). It loads asynchronously — won&apos;t slow your site.
              </p>

              <div className="relative mb-4 overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4 pr-12 font-mono text-[12px] leading-relaxed">
                <code className="text-cyan-300">{snippetFor(site.id)}</code>
                <button
                  onClick={copy}
                  className="absolute right-2 top-2 flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70 hover:text-white"
                  aria-label="Copy"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <div className="mb-3 flex items-center gap-2 text-[11px] text-amber-300/85">
                <Sparkles className="h-3.5 w-3.5" /> Once paste-deployed, fresh sessions begin flowing within minutes.
              </div>

              <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                <Feature title="Visitor identity" desc="Persistent visitor_id (2-year cookie) lets you see repeat visits & total sessions per person." />
                <Feature title="How they got here" desc="UTMs + referrer → channel classification (organic / paid / social / email / referral / direct)." />
                <Feature title="Where they go next" desc="Outbound link clicks fire to /api/track-exit — see what competitor they checked out after you." />
                <Feature title="Lead intent signals" desc="Form-field focuses, CTA clicks, scroll milestones — buying signals before they convert." />
                <Feature title="Device & geo" desc="Device, browser, OS, screen, language, timezone, plus Vercel-derived city/region/country." />
                <Feature title="Privacy-safe" desc="No form input VALUES are captured. IP is hashed server-side. SameSite=Lax cookies only." />
              </div>
            </>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-xs text-white/55">
          <h3 className="mb-2 text-sm font-semibold text-white/90">How the data is routed</h3>
          <ul className="space-y-1 list-disc pl-5">
            <li><span className="text-white/85">data-site=&quot;abg&quot;</span> → writes to <code className="rounded bg-white/10 px-1">public.website_visits</code> in your text2sale Supabase project.</li>
            <li><span className="text-white/85">data-site=&quot;tq&quot;</span> → writes to <code className="rounded bg-white/10 px-1">public.visitors</code> in the Trusted Quotes Supabase project (uses your <code className="rounded bg-white/10 px-1">TRUSTEDQUOTES_SERVICE_ROLE_KEY</code>).</li>
            <li><span className="text-white/85">data-site=&quot;text2sale&quot;</span> → writes to <code className="rounded bg-white/10 px-1">public.page_views</code> (the rich primary table).</li>
            <li>All extra signals (exits, intents) go to <code className="rounded bg-white/10 px-1">exit_clicks</code> and <code className="rounded bg-white/10 px-1">lead_intents</code> in your main project so cross-business comparisons work.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
      <div className="mb-0.5 text-xs font-semibold text-white/90">{title}</div>
      <div className="text-[11px] text-white/55">{desc}</div>
    </div>
  );
}
