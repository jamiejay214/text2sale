"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ExternalLink,
  Globe2,
  LayoutTemplate,
  LoaderCircle,
  Monitor,
  Paintbrush,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  ShieldCheck,
  Smartphone,
  Trash2,
} from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { fetchProfile } from "@/lib/supabase-data";
import type { BusinessSiteConfig, BusinessSiteTemplate } from "@/lib/site-config";
import type { WorkspaceViewProps } from "../WorkspaceApp";
import { PageHeader, Panel, StatusPill } from "../WorkspacePrimitives";

type Suggestion = { domain: string; price: number; renewalPrice: number | null };
type SiteData = {
  success: boolean;
  businessName: string;
  contact: { phone: string; email: string; address: string };
  config: BusinessSiteConfig;
  domain: string | null;
  slug: string | null;
  previewUrl: string | null;
  liveUrl: string | null;
  urls: { home: string; optIn: string; privacy: string; terms: string } | null;
  status: {
    businessDetails: boolean;
    domain: boolean;
    published: boolean;
    pagesVerified: boolean;
    carrierSubmitted: boolean;
    messagingApproved: boolean;
  };
};

const TEMPLATES: Array<{ id: BusinessSiteTemplate; name: string; description: string; primary: string; accent: string }> = [
  { id: "studio", name: "Modern studio", description: "Warm, premium, and conversion focused", primary: "#153f32", accent: "#d9f779" },
  { id: "trust", name: "Trusted advisor", description: "Calm, established, and professional", primary: "#173c66", accent: "#8fd7ff" },
  { id: "bold", name: "Bold growth", description: "Confident, high-energy, and memorable", primary: "#4b2b80", accent: "#ffcb65" },
];

function contrast(hex: string) {
  const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "153f32";
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.57 ? "#10231a" : "#ffffff";
}

function WebsitePreview({ data, config, mobile }: { data: SiteData; config: BusinessSiteConfig; mobile: boolean }) {
  const css = {
    "--preview-primary": config.primaryColor,
    "--preview-primary-ink": contrast(config.primaryColor),
    "--preview-accent": config.accentColor,
    "--preview-accent-ink": contrast(config.accentColor),
  } as CSSProperties;
  return (
    <div className={`v2-site-preview-frame ${mobile ? "is-mobile" : ""}`}>
      <div className={`v2-site-preview is-${config.template}`} style={css}>
        <div className="v2-site-preview-browser"><i /><i /><i /><span>{data.domain || "yourbusiness.com"}</span></div>
        <div className="v2-site-preview-announcement">{config.announcement}</div>
        <header>
          <div className="v2-site-preview-brand">
            {config.logoUrl ? <img src={config.logoUrl} alt="" /> : <span>{data.businessName.charAt(0)}</span>}
            <strong>{data.businessName}</strong>
          </div>
          <nav><span>Services</span><span>About</span><span>Contact</span><b>{config.ctaLabel}</b></nav>
        </header>
        <section className="v2-site-preview-hero">
          <div>
            <small>LOCAL EXPERTISE · PERSONAL SERVICE</small>
            <h2>{config.headline}</h2>
            <p>{config.subheadline}</p>
            <div><b>{config.ctaLabel}</b><span>Contact us</span></div>
          </div>
          <aside><span>✓</span><strong>Real help. Clear next steps.</strong><small>{data.contact.phone || "Your business phone"}</small></aside>
        </section>
        <section className="v2-site-preview-services">
          <small>HOW WE CAN HELP</small><h3>Solutions built around you.</h3>
          <div>{config.services.slice(0, 3).map((service, index) => <article key={`${service.title}-${index}`}><span>{index + 1}</span><strong>{service.title}</strong><p>{service.description}</p></article>)}</div>
        </section>
        <footer><strong>{data.businessName}</strong><span>Privacy Policy · Terms · SMS Opt-In</span></footer>
      </div>
    </div>
  );
}

export default function WebsiteWorkspace({ profile, onProfile, onNavigate }: WorkspaceViewProps) {
  const [data, setData] = useState<SiteData | null>(null);
  const [config, setConfig] = useState<BusinessSiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"draft" | "publish" | "">("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [editor, setEditor] = useState<"design" | "content" | "domain">("design");
  const [mobile, setMobile] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [buying, setBuying] = useState("");
  const [registrarMessage, setRegistrarMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch("/api/business-site");
      const next = await response.json();
      if (!response.ok || !next.success) throw new Error(next.error || "The website could not be loaded.");
      setData(next);
      setConfig(next.config);
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "The website could not be loaded." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const dirty = useMemo(() => !!data && !!config && JSON.stringify(data.config) !== JSON.stringify(config), [data, config]);

  const patch = (value: Partial<BusinessSiteConfig>) => setConfig((current) => current ? { ...current, ...value } : current);

  const save = async (publish: boolean) => {
    if (!config) return;
    setSaving(publish ? "publish" : "draft");
    setNotice(null);
    try {
      const response = await authFetch("/api/business-site", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, publish }),
      });
      const next = await response.json();
      if (!response.ok || !next.success) throw new Error(next.error || "The website could not be saved.");
      setData(next);
      setConfig(next.config);
      const latest = await fetchProfile(profile.id);
      if (latest) onProfile(latest);
      setNotice({ tone: "ok", text: publish ? `Published to ${next.domain}. All required 10DLC pages are included.` : "Website draft saved." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "The website could not be saved." });
      if (publish && !data?.domain) setEditor("domain");
    } finally {
      setSaving("");
    }
  };

  const findDomains = async () => {
    if (!data) return;
    setSearching(true);
    setRegistrarMessage("");
    setSuggestions([]);
    try {
      const response = await authFetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suggest", businessName: data.businessName, industry: profile.industry }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Domain search failed.");
      setSuggestions(result.suggestions || []);
      if (result.registrarAvailable === false) setRegistrarMessage(result.registrarProblem || "Automatic domain registration is temporarily unavailable.");
      else if (!result.suggestions?.length) setRegistrarMessage("No matching addresses were available. Search again or contact support for a custom choice.");
    } catch (error) {
      setRegistrarMessage(error instanceof Error ? error.message : "Domain search failed.");
    } finally {
      setSearching(false);
    }
  };

  const buyDomain = async (choice: Suggestion) => {
    const accepted = window.confirm(
      `Register ${choice.domain} for $${choice.price.toFixed(2)} for the first year? This amount will be charged from your Text2Sale balance.`,
    );
    if (!accepted) return;
    setBuying(choice.domain);
    setNotice(null);
    try {
      let result: { success?: boolean; pending?: boolean; error?: string; message?: string } = {};
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const response = await authFetch("/api/domains", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "buy", domain: choice.domain, agreedPrice: choice.price }),
        });
        result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "The domain could not be purchased.");
        if (!result.pending) break;
        if (attempt < 5) await new Promise((resolve) => window.setTimeout(resolve, 1_500));
      }
      const latest = await fetchProfile(profile.id);
      if (latest) onProfile(latest);
      await load();
      setSuggestions([]);
      setNotice({
        tone: "ok",
        text: result.pending
          ? `${choice.domain} has been ordered. Registration is finishing in the background; you will not be charged twice.`
          : `${choice.domain} is yours and connected. Publish when the preview looks right.`,
      });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "The domain could not be purchased." });
    } finally {
      setBuying("");
    }
  };

  if (loading) return <div className="v2-loading"><span /><strong>Opening website studio</strong><small>Loading your brand and domain.</small></div>;
  if (!data || !config) return <Panel className="v2-site-error"><Globe2 size={24} /><h2>Website studio is unavailable</h2><p>{notice?.text || "Try again in a moment."}</p><button className="v2-btn" onClick={load}><RefreshCw size={14} /> Try again</button></Panel>;

  const statusRows = [
    ["Business details", data.status.businessDetails, "Required identity is saved"],
    ["Domain connected", data.status.domain, data.domain || "Choose an address below"],
    ["Website published", data.status.published, data.status.published ? "Your design is public" : "Publish after reviewing"],
    ["Four pages verified", data.status.pagesVerified, "Home, opt-in, privacy, and terms"],
    ["Sent to Telnyx", data.status.carrierSubmitted, data.status.carrierSubmitted ? "Carrier review started" : "Starts only after verification"],
  ] as const;

  return (
    <div className="v2-website-workspace">
      <PageHeader
        eyebrow="Website studio"
        title="Build the website behind your brand."
        description="Design a real public site, purchase its domain, and keep every page Telnyx checks in one guided workspace."
        actions={<div className="v2-site-header-actions">{data.liveUrl && <a className="v2-btn" href={data.liveUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open site</a>}<button className="v2-btn" onClick={() => void save(false)} disabled={saving !== "" || !dirty}><Save size={14} />{saving === "draft" ? "Saving…" : "Save draft"}</button><button className="v2-btn v2-btn-primary" onClick={() => void save(true)} disabled={saving !== ""}><Rocket size={14} />{saving === "publish" ? "Publishing…" : "Publish website"}</button></div>}
      />

      {notice && <div className={`v2-notice is-${notice.tone}`}>{notice.text}<button onClick={() => setNotice(null)}>×</button></div>}

      <div className="v2-site-status-strip">
        <div><span className={data.status.pagesVerified ? "is-live" : ""}><Globe2 size={16} /></span><div><small>WEBSITE</small><strong>{data.domain || "Domain not selected"}</strong></div></div>
        <div><StatusPill tone={data.status.pagesVerified ? "success" : data.status.domain ? "warning" : "neutral"}>{data.status.pagesVerified ? "Live & verified" : data.status.domain ? "Ready to publish" : "Setup needed"}</StatusPill></div>
        <div><small>10DLC HANDOFF</small><strong>{data.status.carrierSubmitted ? "Submitted to Telnyx" : "Waiting for verified website"}</strong></div>
        {data.urls && <div className="v2-site-page-links"><a href={data.urls.optIn} target="_blank" rel="noreferrer">Opt-in <ArrowUpRight size={12} /></a><a href={data.urls.privacy} target="_blank" rel="noreferrer">Privacy <ArrowUpRight size={12} /></a><a href={data.urls.terms} target="_blank" rel="noreferrer">Terms <ArrowUpRight size={12} /></a></div>}
      </div>

      <div className="v2-site-builder">
        <Panel className="v2-site-controls">
          <div className="v2-site-control-tabs">
            <button className={editor === "design" ? "is-active" : ""} onClick={() => setEditor("design")}><Paintbrush size={15} /> Design</button>
            <button className={editor === "content" ? "is-active" : ""} onClick={() => setEditor("content")}><LayoutTemplate size={15} /> Content</button>
            <button className={editor === "domain" ? "is-active" : ""} onClick={() => setEditor("domain")}><Globe2 size={15} /> Domain & 10DLC</button>
          </div>

          {editor === "design" && <div className="v2-site-control-body">
            <div className="v2-site-section-title"><div><h2>Choose a direction</h2><p>Start with a polished layout, then make the colors yours.</p></div></div>
            <div className="v2-site-template-list">{TEMPLATES.map((template) => <button key={template.id} className={config.template === template.id ? "is-active" : ""} onClick={() => patch({ template: template.id, primaryColor: template.primary, accentColor: template.accent })}><span style={{ background: template.primary }}><i style={{ background: template.accent }} /></span><div><strong>{template.name}</strong><small>{template.description}</small></div>{config.template === template.id && <Check size={15} />}</button>)}</div>
            <div className="v2-site-color-grid"><label>Primary color<div><input type="color" value={config.primaryColor} onChange={(event) => patch({ primaryColor: event.target.value })} /><code>{config.primaryColor}</code></div></label><label>Accent color<div><input type="color" value={config.accentColor} onChange={(event) => patch({ accentColor: event.target.value })} /><code>{config.accentColor}</code></div></label></div>
            <label className="v2-site-field">Logo image URL <input type="url" value={config.logoUrl} onChange={(event) => patch({ logoUrl: event.target.value })} placeholder="https://yourbusiness.com/logo.png" /><small>Optional. Use a secure HTTPS image. Without one, we create a clean letter mark.</small></label>
            <div className="v2-site-visibility"><strong>Contact details shown</strong>{[["showPhone", "Phone"], ["showEmail", "Email"], ["showAddress", "Business address"]].map(([key, label]) => <label key={key}><span>{label}</span><input type="checkbox" checked={config[key as "showPhone" | "showEmail" | "showAddress"]} onChange={(event) => patch({ [key]: event.target.checked })} /><i /></label>)}</div>
          </div>}

          {editor === "content" && <div className="v2-site-control-body">
            <div className="v2-site-section-title"><div><h2>Tell your story</h2><p>Everything updates instantly in the preview.</p></div></div>
            <label className="v2-site-field">Announcement <input value={config.announcement} maxLength={90} onChange={(event) => patch({ announcement: event.target.value })} /></label>
            <label className="v2-site-field">Headline <textarea rows={3} value={config.headline} maxLength={100} onChange={(event) => patch({ headline: event.target.value })} /><small>{config.headline.length}/100</small></label>
            <label className="v2-site-field">Supporting message <textarea rows={5} value={config.subheadline} maxLength={420} onChange={(event) => patch({ subheadline: event.target.value })} /><small>{config.subheadline.length}/420</small></label>
            <label className="v2-site-field">Main button <input value={config.ctaLabel} maxLength={42} onChange={(event) => patch({ ctaLabel: event.target.value })} /></label>
            <div className="v2-site-services-head"><div><strong>Services</strong><small>Show customers exactly how you help.</small></div><button onClick={() => patch({ services: [...config.services, { title: "New service", description: "Describe the value this service provides." }].slice(0, 6) })} disabled={config.services.length >= 6}><Plus size={13} /> Add</button></div>
            <div className="v2-site-service-editor">{config.services.map((service, index) => <div key={index}><span>{index + 1}</span><label>Title<input value={service.title} maxLength={60} onChange={(event) => patch({ services: config.services.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) })} /></label><label>Description<textarea rows={3} value={service.description} maxLength={220} onChange={(event) => patch({ services: config.services.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item) })} /></label><button aria-label={`Remove ${service.title}`} onClick={() => patch({ services: config.services.filter((_, itemIndex) => itemIndex !== index) })} disabled={config.services.length <= 1}><Trash2 size={14} /></button></div>)}</div>
          </div>}

          {editor === "domain" && <div className="v2-site-control-body">
            <div className="v2-site-section-title"><div><h2>Your domain and approval path</h2><p>The exact site we verify and submit to Telnyx.</p></div></div>
            {data.domain ? <div className="v2-site-connected-domain"><span><CheckCircle2 size={20} /></span><div><small>CONNECTED DOMAIN</small><strong>{data.domain}</strong><p>Registered, routed to Text2Sale, and owned by your business.</p></div>{data.liveUrl && <a href={data.liveUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /></a>}</div> : <div className="v2-site-domain-search"><div><Globe2 size={19} /><span><strong>Compare familiar website endings</strong><small>See .com, .org, .net, .us, and more with first-year and renewal prices before choosing.</small></span></div><button className="v2-btn v2-btn-primary" onClick={findDomains} disabled={searching || !data.status.businessDetails}>{searching ? <LoaderCircle className="v2-spin" size={15} /> : <Globe2 size={15} />}{searching ? "Checking live prices…" : suggestions.length ? "Refresh prices" : "Compare domain prices"}</button>{!data.status.businessDetails && <button className="v2-text-link" onClick={() => onNavigate("settings", "10dlc")}>Finish business details first →</button>}{registrarMessage && <p className="is-error">{registrarMessage}</p>}<div className="v2-site-domain-results">{suggestions.map((choice, index) => { const extension = choice.domain.slice(choice.domain.lastIndexOf(".")); return <article key={choice.domain} className={index === 0 ? "is-best-value" : ""}><span className="v2-domain-extension">{extension}</span><div><strong>{choice.domain}</strong><small>{index === 0 ? "Lowest available first-year price" : "Available now"}</small></div><div className="v2-domain-prices"><b>${choice.price.toFixed(2)}</b><small>first year</small><span>{choice.renewalPrice != null ? `$${choice.renewalPrice.toFixed(2)}/yr renewal` : "Renewal shown at checkout"}</span></div><button onClick={() => void buyDomain(choice)} disabled={!!buying}>{buying === choice.domain ? "Registering…" : "Choose"}</button></article>; })}</div><small className="v2-domain-price-note">Prices are checked live. Nothing is charged until you confirm one exact domain.</small></div>}
            <div className="v2-site-compliance-list"><div className="v2-panel-head"><div><h2>Telnyx readiness</h2><p>Automatic checks prevent an incomplete site from being submitted.</p></div><ShieldCheck size={18} /></div>{statusRows.map(([label, complete, detail]) => <div key={label}><span className={complete ? "is-done" : ""}>{complete ? <Check size={13} /> : ""}</span><div><strong>{label}</strong><small>{detail}</small></div></div>)}</div>
            <div className="v2-site-locked-compliance"><ShieldCheck size={18} /><div><strong>Compliance copy stays protected</strong><p>You can style the entire site. The unchecked consent box, STOP/HELP disclosures, privacy language, and terms stay locked so a design edit cannot break your 10DLC submission.</p></div></div>
          </div>}
        </Panel>

        <section className="v2-site-preview-column">
          <div className="v2-site-preview-toolbar"><div><button className={!mobile ? "is-active" : ""} onClick={() => setMobile(false)} aria-label="Desktop preview"><Monitor size={15} /></button><button className={mobile ? "is-active" : ""} onClick={() => setMobile(true)} aria-label="Mobile preview"><Smartphone size={15} /></button></div><span>{dirty ? "Unsaved changes" : data.status.published ? "Published" : "Draft saved"}</span>{data.previewUrl && <a href={data.previewUrl} target="_blank" rel="noreferrer">Full preview <ArrowUpRight size={13} /></a>}</div>
          <WebsitePreview data={data} config={config} mobile={mobile} />
        </section>
      </div>
    </div>
  );
}
