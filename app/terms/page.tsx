import React from "react";
import { LEGAL_TERMS_SECTIONS, LEGAL_EFFECTIVE_DATE, LEGAL_COMPANY, LEGAL_WEBSITE } from "@/lib/legal-text";

export const metadata = {
  title: "Terms and Conditions — Text2Sale",
  description: "Legally binding terms governing use of the Text2Sale SMS platform.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <a href="/" className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back to {LEGAL_COMPANY}
        </a>

        <h1 className="text-4xl font-bold tracking-tight">Terms and Conditions</h1>
        <p className="mt-2 text-sm text-zinc-500">Effective Date: {LEGAL_EFFECTIVE_DATE} &mdash; Website: {LEGAL_WEBSITE}</p>
        <p className="mt-1 text-sm text-zinc-500">Company Name: {LEGAL_COMPANY}</p>

        <div className="mt-10 space-y-6 text-[15px] leading-relaxed text-zinc-300">
          {LEGAL_TERMS_SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 className="text-xl font-semibold text-white pt-4">{s.heading}</h2>
              {s.paragraphs.map((p, i) => (
                <p key={i} className="mt-3">{p}</p>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-16 border-t border-zinc-800 pt-6 text-center text-sm text-zinc-600">
          &copy; {new Date().getFullYear()} {LEGAL_COMPANY}. All rights reserved.
        </div>
      </div>
    </main>
  );
}
