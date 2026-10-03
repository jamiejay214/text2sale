"use client";

import React, { useEffect, useRef, useState } from "react";
import { INDUSTRIES } from "@/lib/industries";
import { formatPhoneNumber } from "@/lib/auth";

// ── Business details ───────────────────────────────────────────────────────
//
// The one form a customer fills in to get texting activated. It is used by
// the onboarding wizard and by Settings → 10DLC, which used to carry two
// separate copies that had drifted apart (the Settings copy's submit button
// was permanently disabled for anyone without a website).
//
// Everything after this form is automatic: the website is built, the
// business is registered, the campaign is filed and a number is attached. For
// someone without a website that includes picking an address for it, so the
// form offers real, available domains with their price instead of telling
// the customer to go and buy one elsewhere and edit DNS records.

export type BusinessFormValues = {
  businessName: string;
  businessType: "llc" | "corporation" | "partnership" | "non_profit" | "sole_proprietor";
  ein: string;
  businessAddress: string;
  businessCity: string;
  businessState: string;
  businessZip: string;
  contactPhone: string;
  contactEmail: string;
  industry: string;
  businessDescription: string;
  hasWebsite: "yes" | "no";
  website: string;
  /** A domain they already own and will point at us. */
  customDomain: string;
  /** A domain we register for them (charged from their balance). */
  domainRequest: { domain: string; price: number } | null;
  areaCode: string;
};

export const EMPTY_BUSINESS_FORM: BusinessFormValues = {
  businessName: "",
  businessType: "llc",
  ein: "",
  businessAddress: "",
  businessCity: "",
  businessState: "",
  businessZip: "",
  contactPhone: "",
  contactEmail: "",
  industry: "",
  businessDescription: "",
  hasWebsite: "no",
  website: "",
  customDomain: "",
  domainRequest: null,
  areaCode: "",
};

export function formatEin(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

const digitsOnly = (v: string) => v.replace(/\D/g, "");

/** Why the form can't be submitted yet, or null when it can. */
export function businessFormProblem(v: BusinessFormValues): string | null {
  if (v.businessName.trim().length < 2) return "Enter your legal business name.";
  if (digitsOnly(v.ein).length !== 9) return "Your EIN must be 9 digits.";
  if (v.businessAddress.trim().length < 3) return "Enter your street address.";
  if (v.businessCity.trim().length < 2) return "Enter your city.";
  if (!/^[A-Za-z]{2}$/.test(v.businessState.trim())) return "Enter your 2-letter state.";
  if (!/^\d{5}(-\d{4})?$/.test(v.businessZip.trim())) return "Enter a 5-digit ZIP code.";
  if (digitsOnly(v.contactPhone).replace(/^1(?=\d{10}$)/, "").length !== 10) return "Enter a 10-digit business phone number.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.contactEmail.trim())) return "Enter a valid business email.";
  if (!v.industry) return "Choose your industry.";
  if (v.hasWebsite === "yes" && !v.website.trim()) return "Enter your website address.";
  if (v.hasWebsite === "no" && !v.domainRequest && !v.customDomain.trim()) return "Choose an address for your website.";
  return null;
}

type Suggestion = { domain: string; price: number };

const INPUT =
  "w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm outline-none focus:border-violet-500";
const LABEL = "mb-1 block text-xs font-medium text-zinc-400";

function DomainPicker({
  values,
  onChange,
  authFetch,
}: {
  values: BusinessFormValues;
  onChange: (patch: Partial<BusinessFormValues>) => void;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
}) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [registrarAvailable, setRegistrarAvailable] = useState(true);
  const [registrarProblem, setRegistrarProblem] = useState("");
  const [error, setError] = useState("");
  const [useOwned, setUseOwned] = useState(!!values.customDomain);
  const searchedFor = useRef("");

  const name = values.businessName.trim();

  const search = async (force = false) => {
    if (name.length < 3) return;
    const key = `${name}|${values.industry}`;
    if (!force && searchedFor.current === key) return;
    searchedFor.current = key;
    setLoading(true);
    setError("");
    setRegistrarProblem("");
    try {
      const res = await authFetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suggest", businessName: name, industry: values.industry || undefined }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Couldn't look up addresses right now.");
        return;
      }
      setSuggestions(data.suggestions || []);
      setRegistrarAvailable(data.registrarAvailable !== false);
      setRegistrarProblem(data.registrarAvailable === false ? data.registrarProblem || "Automatic domain registration is temporarily unavailable." : "");
      // Keep a previous choice only if it is still on offer.
      if (values.domainRequest && !(data.suggestions || []).some((s: Suggestion) => s.domain === values.domainRequest!.domain)) {
        onChange({ domainRequest: null });
      }
    } catch {
      setError("Couldn't look up addresses right now.");
    } finally {
      setLoading(false);
    }
  };

  // Look up addresses once the business name settles, without hammering the
  // registrar on every keystroke.
  useEffect(() => {
    if (useOwned || name.length < 3) return;
    const t = window.setTimeout(() => void search(false), 900);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, values.industry, useOwned]);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-violet-800/40 bg-violet-950/20 p-3 text-xs text-violet-200/90">
        Carriers need a real website for your business. We build it for you — homepage, text sign-up form, privacy policy and
        terms, filled in with your details — and put it on its own web address.
      </div>

      {!useOwned && (
        <>
          <div className="flex items-center justify-between">
            <span className={LABEL + " mb-0"}>Choose your website address *</span>
            <button type="button" onClick={() => void search(true)} disabled={loading || name.length < 3} className="text-[11px] text-violet-400 hover:text-violet-300 disabled:opacity-40">
              {loading ? "Searching…" : "Search again"}
            </button>
          </div>
          {name.length < 3 && <p className="text-xs text-zinc-500">Enter your business name above and we&apos;ll find available addresses.</p>}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="space-y-1.5">
            {suggestions.map((s) => {
              const selected = values.domainRequest?.domain === s.domain;
              return (
                <button
                  key={s.domain}
                  type="button"
                  onClick={() => onChange({ domainRequest: { domain: s.domain, price: s.price }, customDomain: "" })}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left text-sm transition ${
                    selected ? "border-violet-500 bg-violet-500/10 text-white" : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                  }`}
                >
                  <span className="font-medium">{s.domain}</span>
                  <span className="text-xs text-zinc-400">${s.price.toFixed(2)} first year</span>
                </button>
              );
            })}
            {!loading && suggestions.length === 0 && name.length >= 3 && !error && (
              <p className="text-xs text-zinc-500">No suggestions yet — try &ldquo;Search again&rdquo;, or use a domain you already own.</p>
            )}
          </div>
          {values.domainRequest && (
            <p className="text-[11px] text-zinc-500">
              ${values.domainRequest.price.toFixed(2)} is charged from your balance when we register {values.domainRequest.domain}. If your balance is short, we&apos;ll
              ask you to add funds and finish by ourselves.
            </p>
          )}
        </>
      )}

      {useOwned && (
        <div>
          <label className={LABEL}>Domain you own *</label>
          <input
            className={INPUT}
            placeholder="yourbusiness.com"
            value={values.customDomain}
            onChange={(e) =>
              onChange({
                customDomain: e.target.value.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/.*$/, ""),
                domainRequest: null,
              })
            }
          />
          <p className="mt-1 text-[11px] text-zinc-500">
            You&apos;ll need to point it at us: an A record for @ with the value 76.76.21.21 and a CNAME for www to cname.vercel-dns.com. We continue automatically as soon as it
            works.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setUseOwned(!useOwned);
          onChange({ domainRequest: null, customDomain: "" });
        }}
        className="text-[11px] text-zinc-400 underline hover:text-zinc-200"
      >
        {useOwned ? "← Let Text2Sale find and buy my address" : "I already own a domain"}
      </button>
      {!registrarAvailable && !useOwned && (
        <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-3 text-[11px] leading-relaxed text-amber-200">
          <strong className="block text-amber-100">We couldn&apos;t reach the domain registrar.</strong>
          Your choice has not changed and nothing was purchased. {registrarProblem || "Try Search again in a moment."}
        </div>
      )}
    </div>
  );
}

export default function BusinessDetailsForm({
  values,
  onChange,
  authFetch,
}: {
  values: BusinessFormValues;
  onChange: (patch: Partial<BusinessFormValues>) => void;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
}) {
  const einBad = values.ein !== "" && digitsOnly(values.ein).length !== 9;
  const phoneBad = values.contactPhone !== "" && digitsOnly(values.contactPhone).replace(/^1(?=\d{10}$)/, "").length !== 10;

  return (
    <div className="space-y-3">
      <div>
        <label className={LABEL}>Legal Business Name *</label>
        <input className={INPUT} placeholder="e.g. Johnson Health Insurance LLC" value={values.businessName} onChange={(e) => onChange({ businessName: e.target.value })} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Business Type *</label>
          <select className={INPUT} value={values.businessType} onChange={(e) => onChange({ businessType: e.target.value as BusinessFormValues["businessType"] })}>
            <option value="llc">LLC</option>
            <option value="corporation">Corporation</option>
            <option value="partnership">Partnership</option>
            <option value="non_profit">Non-Profit</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>EIN (Tax ID) *</label>
          <input
            className={`${INPUT} ${einBad ? "border-red-500/60" : ""}`}
            inputMode="numeric"
            placeholder="XX-XXXXXXX"
            value={values.ein}
            onChange={(e) => onChange({ ein: formatEin(e.target.value) })}
          />
          {einBad && <p className="mt-1 text-[10px] text-red-400">EIN must be 9 digits (XX-XXXXXXX).</p>}
        </div>
      </div>

      <div>
        <label className={LABEL}>Industry *</label>
        <select className={INPUT} value={values.industry} onChange={(e) => onChange({ industry: e.target.value })}>
          <option value="">Select your industry…</option>
          {INDUSTRIES.map((i) => (
            <option key={i.id} value={i.id}>{i.label}</option>
          ))}
        </select>
        <p className="mt-1 text-[10px] text-zinc-600">Used to word your registration and your website to match what you do.</p>
      </div>

      <div>
        <label className={LABEL}>Business Address *</label>
        <input className={INPUT} placeholder="123 Main St, Suite 100" value={values.businessAddress} onChange={(e) => onChange({ businessAddress: e.target.value })} />
        <p className="mt-1 text-[10px] text-zinc-600">Must match your IRS records exactly, or carriers reject the registration.</p>
      </div>

      <div className="grid grid-cols-6 gap-2">
        <div className="col-span-3">
          <label className={LABEL}>City *</label>
          <input className={INPUT} value={values.businessCity} onChange={(e) => onChange({ businessCity: e.target.value })} />
        </div>
        <div className="col-span-1">
          <label className={LABEL}>State *</label>
          <input className={`${INPUT} uppercase`} maxLength={2} placeholder="FL" value={values.businessState} onChange={(e) => onChange({ businessState: e.target.value.toUpperCase() })} />
        </div>
        <div className="col-span-2">
          <label className={LABEL}>ZIP *</label>
          <input className={INPUT} inputMode="numeric" value={values.businessZip} onChange={(e) => onChange({ businessZip: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Business Phone *</label>
          <input
            type="tel"
            inputMode="tel"
            className={`${INPUT} ${phoneBad ? "border-red-500/60" : ""}`}
            placeholder="(555) 555-5555"
            value={values.contactPhone}
            onChange={(e) => onChange({ contactPhone: formatPhoneNumber(e.target.value) })}
          />
          {phoneBad && <p className="mt-1 text-[10px] text-red-400">Enter a 10-digit US phone number.</p>}
        </div>
        <div>
          <label className={LABEL}>Business Email *</label>
          <input type="email" className={INPUT} placeholder="you@yourbusiness.com" value={values.contactEmail} onChange={(e) => onChange({ contactEmail: e.target.value })} />
        </div>
      </div>

      <div>
        <label className={LABEL}>What does your business do? (optional)</label>
        <textarea
          className={INPUT}
          rows={2}
          maxLength={500}
          placeholder="We help families find affordable coverage that fits their needs…"
          value={values.businessDescription}
          onChange={(e) => onChange({ businessDescription: e.target.value })}
        />
        <p className="mt-1 text-[10px] text-zinc-600">Shown at the top of your website. Leave blank and we&apos;ll write a standard one.</p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Your website *</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ hasWebsite: "no", website: "" })}
            className={`flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition ${values.hasWebsite === "no" ? "border-violet-500 bg-violet-500/10 text-violet-300" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
          >
            Build one for me <span className="opacity-70">(recommended)</span>
          </button>
          <button
            type="button"
            onClick={() => onChange({ hasWebsite: "yes", domainRequest: null, customDomain: "" })}
            className={`flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition ${values.hasWebsite === "yes" ? "border-violet-500 bg-violet-500/10 text-violet-300" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
          >
            I have a website
          </button>
        </div>
      </div>

      {values.hasWebsite === "yes" ? (
        <div>
          <label className={LABEL}>Website address *</label>
          <input type="url" className={INPUT} placeholder="https://yourbusiness.com" value={values.website} onChange={(e) => onChange({ website: e.target.value })} />
          <p className="mt-1 text-[10px] text-zinc-600">We still host your text sign-up form, privacy policy and terms for the carrier review.</p>
        </div>
      ) : (
        <DomainPicker values={values} onChange={onChange} authFetch={authFetch} />
      )}

      <div>
        <label className={LABEL}>Preferred area code for your number (optional)</label>
        <input
          className={`${INPUT} w-28`}
          inputMode="numeric"
          maxLength={3}
          placeholder="954"
          value={values.areaCode}
          onChange={(e) => onChange({ areaCode: e.target.value.replace(/\D/g, "").slice(0, 3) })}
        />
      </div>
    </div>
  );
}
