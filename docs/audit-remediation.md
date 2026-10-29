# Text2Sale audit remediation — 29 October 2026

## Release status

Public website fixes were released through PR #120. The calculator CTA follow-up is PR #121.
The additive workspace migration was applied to production project `glwjupraijvbtqttsshv`
on 29 October 2026 (Supabase migration version `20261029180847`). The repository filename
matches the applied migration history. Existing RLS policies remain unchanged.
The application release is pending signed-in browser validation; PR #122 remains draft.

The release candidate incorporates main through `160a31f`, preserving the newer comparison,
free-tool and lead-magnet work.

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
- Added three migration/input tests and ten route behavior tests: 280 tests in total. The route tests cover campaign dry-run, duplicate suppression, revision changes, subscription requirements, appointment ownership, rescheduling, overlap rejection and Google sync/cancellation recovery.
- Migration test covers full-account aggregates, contact 220 search, durable archives, campaign rename, sales value, cross-account isolation and anonymous RPC denial.
- TypeScript check and production build pass locally.
- Public preview browser checked: homepage, estimator plan changes, FAQ computed color, article contents and blog-to-pricing click.

## Production database verification

- Migration completed; no eligible campaign links remain unbackfilled and no cross-workspace campaign links were found.
- New RPCs are security invoker; anonymous execution is denied, authenticated execution is granted.
- Production SQL tests under the authenticated role verified full-account sent totals, inaccessible foreign workspace totals/inbox, archive writes and pipeline/value writes. All test writes were rolled back.
- Post-migration security advisors returned no findings for the new functions and no additional findings versus the baseline.
- Existing advisor warnings remain outside this release: mutable function search paths, legacy security-definer RPC grants, `pg_net` placement and leaked-password protection. These require a separate review of dependencies and intentional public endpoints. Do not blanket-change grants.
  References: https://supabase.com/docs/guides/database/database-linter and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Required release procedure

1. Completed: connected Supabase and inspected production columns, policies and triggers.
2. Completed: no duplicate campaign name groups found; unique matches backfilled.
3. Completed: applied additive migration and verified functions, ownership/RLS and grants.
4. Test in a seeded account with no live outbound messages: >200 contacts, >50 conversations, two browser sessions, opt-out duplicates, campaign edits/timing, search deep links, import failures, calendar reschedule/conflict/error recovery, and plan entitlements.
5. Merge/release only after those checks. A code rollback does not require dropping the additive columns.

## Remaining audit recommendations (not claimed complete)

- Original article screenshots/illustrations, expert source review across 377 articles, approved customer case studies and a real product walkthrough.
- Search Console/Bing indexing and query-overlap investigation, measured mobile/Core Web Vitals, and evidence-led URL consolidation.
- Rich event/branch automation, booking/won goal stops, per-lead execution history/retry UI, campaign/source revenue attribution, native CRM integrations and a dedicated mobile experience.
- Signed-in browser checks, connected Google Calendar end-to-end checks and booking concurrency testing remain pending. Database access is resolved; browser sign-in is separate.

The new work does not fabricate testimonials, traffic, customer outcomes or rankings.
