# Campaign approval emails

Customers receive “Your Text2Sale 10DLC campaign is approved” after a backend status update reaches MNO_ACCEPTED, MNO_PROVISIONED, or ACTIVE. Brand approval, TCR_ACCEPTED, and pending review do not qualify. The message explains that phone-number assignment, account funding, and an active subscription may still be needed.

## Rollout

1. Apply `supabase/migrations/20261007175157_campaign_approval_emails.sql` to the production Text2Sale database using the authorized Supabase connection. This only installs the outbox and trigger; it does not enqueue historical approvals or send email.
2. Confirm the table has RLS enabled and only the service role can read/write it or call `claim_campaign_approval_emails`. Run Supabase security advisors after applying the migration.
3. Confirm production `RESEND_API_KEY`, `CRON_SECRET`, and the verified `RESEND_FROM_ADDRESS` used by the existing welcome-email sender. The fallback sender is `Text2Sale <support@text2sale.com>` and replies go to `support@text2sale.com`.
4. Merge/deploy the application changes. Vercel calls `/api/email/campaign-approved` every minute using the cron secret. Inspect the first natural approval and provider delivery result; do not fake a customer's approval to test production email.

The migration and production delivery have not been applied/verified in this checkout. The connected Supabase account returned no projects during implementation. Keep this change unmerged until the production database is available and the migration is installed.

## Delivery behavior

- Unique customer/campaign outbox records prevent repeated status polls from creating duplicate emails.
- Three jobs per cron run use five-minute leases. Expired leases can be recovered, and stale workers cannot reserve a send.
- Only the verified account email is used. A changed recipient on an already attempted job requires manual review.
- The exact payload is persisted before the provider call; retries reuse the same Resend idempotency key.
- Uncertain delivery stops for review after 23 hours, inside Resend's 24-hour key retention. Provider failures back off and stop after five attempts.
- Replaced/rejected campaigns cancel queued notifications. A new approval can reactivate a cancelled job only if no send was ever attempted.
- `sent` means the provider accepted the email. Inbox placement is verified through the provider's delivery events, not inferred from that status.
- Existing approved accounts are not backfilled automatically. Newly observed approvals are notified; already-approved profiles are not mailed just because the migration is installed.

## Validation

`node --test tests/campaign-approval-email.test.mjs` exercises actual Postgres trigger/lease/permission behavior with PGlite and mocked provider delivery. `npx tsc --noEmit` and ESLint cover the changed TypeScript files. No customer emails are sent by these tests.
