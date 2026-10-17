# Text2Sale organic acquisition: conversion-first action pack
**Draft for approval — October 15, 2026. No live website or advertising changes.**

## Verified observations and limits
- The publicly indexed Text2Sale homepage snapshot still presents a free trial, Standard $39.99 and Text2Sale + AI $59.99 plans, and highly specific numbers for message volume, delivery, AI response time and reviews. Indexing can lag current deployments; verify against production before treating these as live discrepancies.
- Current GitHub `app/HomeClient.tsx` imports `MarketingHome` from `components/MarketingHome` and has in-page sign-up flow. Examine that component and current server-side plan/billing logic before editing displayed prices.
- Public blog post https://text2sale.com/blog/sms-drip-templates-for-insurance-agents already targets a relevant high-intent insurance audience. Its copy can link to an insurance product page and direct sign-up CTA if the routes work.
- Subscription MRR, active paying accounts, visitors, and conversions are **unknown** without verified data access. Do not represent unknown as zero.

## First 3 recommended changes — draft only
### 1. Honest, focused homepage hero
Proposed headline: **Stop losing leads to missed follow-ups.**
Proposed subhead: **Text2Sale puts opted-in leads, SMS campaigns, replies, and AI-assisted follow-up in one workspace—so your team can stay on top of every conversation.**
Primary CTA: **See plans and get started** (wire to actual verified paid signup flow).
Secondary CTA: **See how it works** (link to genuine in-product demo; never use a simulated dashboard as real data).
Remove or clearly label demo-only metrics and testimonials unless independently substantiated. Replace any unverified performance guarantees with plain feature explanations.

### 2. Make the existing insurance guide convert
At https://text2sale.com/blog/sms-drip-templates-for-insurance-agents add two restrained, relevant CTAs:
- After templates: **Want to manage permission-based follow-ups in one inbox? Explore Text2Sale for insurance agents.**
- At end: **See plans and sign up online**.
Destination: verify current /insurance-agents or /health-insurance URL and paid signup path before implementation. Add conversion-event instrumentation to both CTAs; no inferred clicks.

### 3. Minimal instrumented funnel checklist
Track privacy-respecting events:
- landing_view with utm_source, utm_medium, utm_campaign, landing_path (no personal data in analytics)
- pricing_view
- signup_started when an actual user opens or begins the form, not a generic page visit
- checkout_started
- subscription_paid from verified Stripe server-side event, deduplicated by event ID; record product, amount, billing cycle, currency.
Dashboard: verified unique visitors, signup rate, checkout completion, net new paid accounts and MRR, split by channel and date. Treat missing instrumentation as **unavailable**.

## Organic assets: 3 ready-to-review posts
**Insurance:** “Still following up with health insurance leads one at a time? Text2Sale helps organize opted-in contacts, automate permitted text follow-ups, and keep replies in one inbox. Explore the platform: https://www.text2sale.com #InsuranceAgents #InsuranceMarketing #BusinessTexting”
**Solar:** “Solar inquiries deserve a timely response. Organize permitted follow-ups and conversations in one texting workspace with Text2Sale. See how: https://www.text2sale.com #SolarSales #SolarMarketing #LeadFollowUp”
**Recruiting:** “Hiring teams juggle candidates, replies and scheduling. Keep opted-in candidate text conversations organized with Text2Sale. Learn more: https://www.text2sale.com #Recruiting #Staffing #SMSCRM”

No posts are published, and product features, integrations and signup claims should be checked before publishing.

## Product discovery and comparison article outline
**Article title:** Texting CRM for Insurance Agents: What to Compare Before You Buy
- 1. Consent management, opt-outs, 10DLC and region/country limitations
- 2. Import quality and segmentation
- 3. Shared inbox and conversation assignment
- 4. Follow-up workflow builder
- 5. AI availability by plan and what happens when AI hands off
- 6. Monthly subscription, SMS, inbound, calling, AI reply and carrier pass-through fees
- 7. Actual onboarding and registration times, without universal promises
- CTA: truthful Text2Sale plans and online sign-up.
Do not quote competitor prices without dated official sources.

## Launch validation / explicit approval required
- Verify verified pricing and billing plan with checkout tests.
- Check features on an ordinary paying customer account, especially AI calling.
- Resolve any inconsistent price/trial text before new traffic.
- Confirm no unsupported statistics, ratings or testimonials.
- Verify email sender support@text2sale.com, business postal address and real unsubscribe handling before any email campaign.
- Obtain approval before deployment, publication, directory submission, email/SMS outreach, or other external actions.
