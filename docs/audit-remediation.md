# Text2Sale audit remediation — 29 October 2026

## Release status

Public website fixes were released through PR #120. The calculator CTA follow-up is PR #121.
The application changes in this branch must NOT deploy before the additive migration
`supabase/migrations/20261029154503_audit_workspace_reliability.sql` is applied to the Text2Sale database.
The connected Supabase tool returned permission denied for the production project `glwjupraijvbtqttsshv`.
No production database changes have been made by this task.

## Implemented application work

- A1/A13: suppression-list mode, DNC/consent/tag mapping, US phone normalization, valid alternate-phone preservation, suppression across duplicate records, and explicit batch failures. Import no longer launches a campaign automatically. Failed-row download/resumable import jobs remain future work.
- A2/A3: corrected delay quantities/units; block unsaved launches; preview eligible recipients, rendered examples, SMS segments and estimated charges; recheck the saved revision before queueing. Unsupported merge fields block launch.
- A4/A10: account-backed pipeline stages and archive state, with one-time migration of the browser's legacy state. Pipeline search and pagination can reach contacts beyond the first 200. Added Lost stage, follow-up dates and recorded sales value. Stage history and multi-owner assignment are not included.
- A5/A7/A8: contact-specific navigation, entity search, keyboard shortcut and database-wide paginated inbox search. Search returns contact fields and the latest conversation preview, not every historical message body.
- A6: campaign-ID membership, unique-name backfill and compatible display-name updates. Ambiguous duplicate campaign names are not guessed.
- A9: complete account totals, filtered upcoming appointments and explicit all-time labels. Added workspace booking/attendance/won/value totals. Attribution by campaign/source and cost per attended appointment are not implemented.
- A11/A12: appointment contact search, edit/reschedule, timezone labels, validated status responses, visible Google sync errors/retry, cancellation sync handling and working-hour/buffer settings.
- A14: onboarding uses contact, campaign-send and connected-call data instead of hardcoded incomplete steps.
- Added Today queue for unread conversations, due follow-ups, appointments and failed scheduled messages.

## Verification completed

- Existing regression suite: 267 passing tests.
- Added three behavioral tests, including an in-memory PostgreSQL migration/RLS suite: 270 total passing tests.
- Migration test covers full-account aggregates, contact 220 search, durable archives, campaign rename, sales value, cross-account isolation and anonymous RPC denial.
- TypeScript check and production build pass locally.
- Public preview browser checked: homepage, estimator plan changes, FAQ computed color, article contents and blog-to-pricing click.

## Required release procedure

1. Connect Supabase access to `glwjupraijvbtqttsshv` and inspect production columns/policies before applying the migration.
2. Review duplicate campaign names; only unique name matches are backfilled. Ambiguous contacts need explicit campaign reassignment.
3. Apply the additive migration and verify functions, ownership/RLS and grants. Never rerun the base schema.
4. Test in a seeded account with no live outbound messages: >200 contacts, >50 conversations, two browser sessions, opt-out duplicates, campaign edits/timing, search deep links, import failures, calendar reschedule/conflict/error recovery, and plan entitlements.
5. Merge/release only after those checks. A code rollback does not require dropping the additive columns.

## Remaining audit recommendations (not claimed complete)

- Original article screenshots/illustrations, expert source review across 377 articles, approved customer case studies and a real product walkthrough.
- Search Console/Bing indexing and query-overlap investigation, measured mobile/Core Web Vitals, and evidence-led URL consolidation.
- Rich event/branch automation, booking/won goal stops, per-lead execution history/retry UI, campaign/source revenue attribution, native CRM integrations and a dedicated mobile experience.
- Full authenticated end-to-end verification, production migration/advisors and concurrency testing are blocked until the correct project/test workspace is accessible.

The new work does not fabricate testimonials, traffic, customer outcomes or rankings.
