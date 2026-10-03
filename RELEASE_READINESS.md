# Text2Sale integration — release gate

This branch combines the new CRM theme with the existing production application, messaging activation branch, and AI receptionist branch. It is a review build. Production promotion is blocked until the live checks below pass.

## Implemented

- Responsive sidebar, persistent balance header, light/dark mode, and green/lime visual theme.
- New homepage, signup entry points, confirmation handling, password recovery, and password update screens.
- Existing inbox, CSV mapping/history, campaigns, contacts, templates, pipeline, billing, numbers, calendar, integration, and owner-console flows retained.
- AI receptionist and messaging activation code integrated from their existing feature branches.
- Owner console limited to the verified `johnsonhealthquotes@gmail.com` identity, with server guards and a database migration protecting direct database access.
- Campaign launches, CSV-selected campaigns, and scheduled campaigns enqueue durable sequences. Browser timers no longer control follow-up delivery.
- Sequence pauses, reply cancellation, contact/number ownership checks, per-contact ordering, and delays measured from actual send acceptance.
- Idempotent scheduled-message wallet reservations; ambiguous provider outcomes are held for review instead of automatically resent.
- One-to-one SMS requires sufficient funds before dispatch. Confirmed provider rejections refund the reservation. Canonical phone lookup prevents formatting changes from bypassing opt-outs.
- Calling queue displays city, state, and ZIP. Browser calling stays disabled until the existing Telnyx routing issue is resolved.

## Validation commands

```sh
npm ci
npm run test:readiness
npx tsc --noEmit
npm run build
```

The readiness tests use isolated PGlite PostgreSQL fixtures and mocked provider responses. They exercise the new SQL, sequence timing, ownership, pause/resume, wallet reservation, dispatch uncertainty, and owner restriction. They do not certify the current production schema, provider configuration, or live delivery.

## Required before production promotion

1. Connect the actual Supabase project. The available Supabase connection returned no projects during this work. Verify the deployed schema and migration history; do not reapply the starter `supabase-schema.sql` over a live database.
2. Review and apply migrations `010_messaging_status.sql`, `011_ai_call_assistant.sql`, `012_owner_admin_scope.sql`, and `013_durable_campaign_sequences.sql` in order where not already applied. Take the normal database backup first. Migration 013 replaces `claim_scheduled_messages(integer)` with the documented row-returning contract.
3. Confirm Vercel environment configuration: Supabase public URL/anon key and service key; Stripe secret/webhook keys and prices; Telnyx messaging, call control, webhook verification, and browser-calling settings; Anthropic key; Google OAuth credentials; `CRON_SECRET`; `INTERNAL_WEBHOOK_SECRET`; and the canonical app URL. Keep all secret values outside source control.
4. Configure Supabase allowed auth redirects for the production `/dashboard` and `/reset-password` URLs and the approved preview URL. Verify signup confirmation, reset-email delivery, expired links, password updates, and sign-out using a test account.
5. Verify the owner account has a confirmed email and admin role. A regular client must receive 403 from every owner endpoint and must not read or change another tenant's contacts, campaigns, wallet, or files through direct database requests.
6. Verify Stripe Checkout, payment-method portal, signed/replayed webhooks, subscription activation/cancellation, auto recharge, and the wallet ledger in test mode. A redirect back from Checkout alone must never credit funds.
7. Verify Telnyx routing with designated test numbers, resolve the existing provider routing issue, then enable `NEXT_PUBLIC_CALLING_ENABLED=true`. Test incoming calls, keyboard dialer, call queue advancement, caller address, hangup, AI receptionist greeting/instructions, transfer, booking, and billing.
8. Verify messaging activation and carrier approvals, sending-number attachment, STOP/START suppression, delivery webhooks, and opt-outs. Do not treat a submitted registration as an approved registration.
9. Run a small opted-in campaign through the real queue: close the browser, wait for each step, pause/resume, reply to cancel follow-ups, and confirm costs and delivery results. Verify the every-minute cron is authorized and runs within the deployment execution limit.
10. Verify Google Calendar OAuth and booking against real availability, and a vendor/API import against the configured endpoint. Check duplicate-import behavior, field mapping, saved batches, and re-enrollment.

## Operational notes

- Campaign sequences support up to 20 steps and 100,000 queued messages per enrollment. Larger audiences must be split into batches. An active campaign cannot be relaunched concurrently; paused sequences resume without duplicating rows.
- A provider timeout can leave delivery uncertain. Scheduled messages with `dispatch_started_at` are never automatically resent; stale ambiguous attempts are marked failed with `last_error` explaining that review is required. Reconcile against the provider before refunding or sending again.
- The balance uses realtime updates plus a one-second visible-tab polling backstop, with overlapping requests prevented.
- No real charge, lead outreach, number purchase, carrier submission, or production database mutation was performed as part of isolated testing.
