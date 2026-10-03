import Link from "next/link";
import type { CSSProperties } from "react";
import { loadSite } from "@/lib/biz-site";
import { readableTextColor } from "@/lib/site-config";
import "./site.css";

export default async function BizLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = (await loadSite(slug, { required: true }))!;
  const { name, contact, href, config } = site;
  const style = {
    "--biz-primary": config.primaryColor,
    "--biz-primary-ink": readableTextColor(config.primaryColor),
    "--biz-accent": config.accentColor,
    "--biz-accent-ink": readableTextColor(config.accentColor),
  } as CSSProperties;

  return (
    <div className={`biz-shell is-${config.template}`} style={style}>
      {config.announcement && <div className="biz-announcement">{config.announcement}</div>}
      <header className="biz-header">
        <div className="biz-header-inner">
          <Link href={href("")} className="biz-brand">
            {config.logoUrl ? <img src={config.logoUrl} alt={`${name} logo`} /> : <span className="biz-brand-mark">{name.charAt(0)}</span>}
            <span>{name}</span>
          </Link>
          <nav aria-label="Main navigation">
            <Link href={href("")}>Home</Link>
            <Link href={`${href("")}#services`}>Services</Link>
            <Link href={href("/privacy-policy")}>Privacy</Link>
            <Link href={href("/opt-in")}>{config.ctaLabel}</Link>
          </nav>
        </div>
      </header>

      <main className="biz-main biz-legal">{children}</main>

      <footer className="biz-footer">
        <div className="biz-footer-inner">
          <div className="biz-footer-grid">
            <div>
              <h2>{name}</h2>
              <p>
                {config.showAddress && contact.address ? `${contact.address}. ` : ""}
                {config.showPhone && contact.phone ? `${contact.phone}. ` : ""}
                {config.showEmail && contact.email ? contact.email : ""}
              </p>
            </div>
            <nav aria-label="Legal navigation">
              <Link href={href("/privacy-policy")}>Privacy Policy</Link>
              <Link href={href("/terms")}>Terms of Service</Link>
              <Link href={href("/opt-in")}>SMS Opt-In</Link>
            </nav>
          </div>
          <div className="biz-footer-compliance">
            Text message program: message frequency varies. Message and data rates may apply. Reply STOP to cancel or HELP for help. Consent is not a condition of purchase. Mobile information and opt-in data are not shared with third parties or affiliates for marketing or promotional purposes.
          </div>
          <div className="biz-footer-copy">&copy; {new Date().getFullYear()} {name}. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
