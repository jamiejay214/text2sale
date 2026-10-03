import Link from "next/link";
import type { Metadata } from "next";
import { loadSite } from "@/lib/biz-site";
import { cleanBizMetadata } from "@/lib/biz-metadata";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const site = await loadSite(slug);
  if (!site) return { title: "Business Not Found" };
  return cleanBizMetadata({
    title: `${site.name} | Official Business Page`,
    description: site.description,
    canonical: site.canonical(""),
  });
}

export default async function BizHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = (await loadSite(slug, { required: true }))!;
  const { name, contact, industry, href, config } = site;
  const where = [contact.city, contact.state].filter(Boolean).join(", ");

  return (
    <>
      <section className="biz-hero">
        <div className="biz-hero-inner">
          <div>
            <div className="biz-eyebrow">Local expertise · Personal service</div>
            <h1>{config.headline}</h1>
            <p className="biz-hero-copy">{config.subheadline}</p>
            <div className="biz-actions">
              <Link href={href("/opt-in")} className="biz-button biz-button-primary">{config.ctaLabel}</Link>
              {contact.email && <a href={`mailto:${contact.email}`} className="biz-button">Talk with our team</a>}
            </div>
          </div>
          <aside className="biz-hero-card">
            <span>✓</span>
            <h2>Clear guidance. Real support.</h2>
            <p>Connect with {name} for thoughtful help and a straightforward next step.</p>
            <dl>
              {where && <div><dt>Serving</dt><dd>{where}</dd></div>}
              {config.showPhone && contact.phone && <div><dt>Call</dt><dd>{contact.phone}</dd></div>}
              {config.showEmail && contact.email && <div><dt>Email</dt><dd>{contact.email}</dd></div>}
            </dl>
          </aside>
        </div>
      </section>

      <section id="services" className="biz-section">
        <div className="biz-section-inner">
          <div className="biz-section-heading">
            <small>How we can help</small>
            <h2>Solutions built around you.</h2>
            <p>{name} is a {industry.businessNoun}{where ? ` based in ${where}` : ""}. Explore the services our team provides.</p>
          </div>
          <div className="biz-services">
            {config.services.map((service, index) => <article className="biz-service" key={`${service.title}-${index}`}><span>{index + 1}</span><h3>{service.title}</h3><p>{service.description}</p></article>)}
          </div>
        </div>
      </section>

      <section id="sms-program" className="biz-section biz-sms">
        <div className="biz-sms-grid">
          <div className="biz-sms-copy">
            <span>✦</span>
            <h2>Stay connected by text.</h2>
            <p>{name} offers an optional text message program for {industry.messageTypes}. You choose whether to join, and you can opt out whenever you want.</p>
            <Link href={href("/opt-in")} className="biz-button">Sign up for text updates</Link>
          </div>
          <div className="biz-sms-card">
            <h3>What to expect</h3>
            <ul>
              <li><span>✓</span>You opt in with your mobile number and an unchecked consent box.</li>
              <li><span>✓</span>Message frequency varies. Message and data rates may apply.</li>
              <li><span>✓</span>Reply STOP to cancel at any time or HELP for help.</li>
              <li><span>✓</span>Consent is not a condition of any purchase.</li>
              <li><span>✓</span>Mobile information is not shared for third-party marketing.</li>
            </ul>
          </div>
        </div>
      </section>

      {(contact.phone || contact.email || contact.address) && <section className="biz-section biz-contact"><div className="biz-contact-inner"><h2>Let&apos;s talk about what comes next.</h2><p>Reach out to {name}. Our team is ready to answer questions and help you find a clear path forward.</p><div className="biz-contact-list">{config.showPhone && contact.phone && <a href={`tel:${contact.phone.replace(/\D/g, "")}`}>{contact.phone}</a>}{config.showEmail && contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}{config.showAddress && contact.address && <span>{contact.address}</span>}</div></div></section>}
    </>
  );
}
