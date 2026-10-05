# Team management, support and signup emails

## Manager access

The owner uses Admin > Users > Make Manager. A manager opens Dashboard > Workspace & team and shares the displayed team code. A teammate joins there after acknowledging delegated access. Only direct assigned accounts are accessible; removing membership, demoting or pausing the manager revokes delegated access.

Open account retains the manager's original authentication and scopes operational requests to the selected teammate. Exit account returns to the manager's team view. Operational changes are audited. Subscription billing, payment methods, account credentials and owner-only tools require the original account holder. A manager's transfer moves existing wallet balance to an assigned teammate, without charging a card or awarding deposit/referral credits. The confirmation screen shows the amount and recipient; retries use the same receipt key.

## Support

Customers use Dashboard > Support chat. Messages are the same support_messages used by the legacy Admin inbox. Customer messages trigger owner push alerts; opening an alert selects that chat in Command Center. Admin replies do not create duplicate owner pushes. Both inboxes update by polling while visible. The inbox shows the 100 most recent threads and 100 most recent messages in each thread; older records remain stored.

## Welcome email activation

New profile creation queues one welcome email. The cron worker checks confirmed authentication email, leases jobs, uses Resend idempotency keys, and retries errors. No old accounts are backfilled. Jobs remain queued while the provider is unconfigured. The legacy public welcome-email endpoint cannot send to arbitrary recipients anymore.

Production currently needs a Resend account with a verified text2sale.com sending domain. Configure RESEND_API_KEY (server-only) and RESEND_FROM_ADDRESS (for example Text2Sale <hello@text2sale.com>) in Vercel production, then redeploy. Never paste an API key into chat or commit it. The worker runs each minute using the existing CRON_SECRET. Check welcome_email_jobs for delivery status; sent means provider acceptance, not a read receipt. Failed jobs older than the provider's idempotency window need manual review before retrying.

## Password recovery

The login page and Command Center link to /forgot-password; /reset-password validates the session, checks matching passwords and updates through Supabase Auth. Configure Supabase Authentication > URL Configuration with Site URL https://text2sale.com and allow https://text2sale.com/reset-password and https://text2sale.com/dashboard. Authentication emails use Supabase's mail delivery configuration, separate from the welcome-email worker. Configure a production SMTP sender under Authentication > Emails if not already configured; use the verified sending domain. Do not disable email confirmations or other protections just to get mail working.

A reset request to the owner was accepted during verification. Inbox arrival and the final email redirect were not independently confirmed, and no password was changed.
