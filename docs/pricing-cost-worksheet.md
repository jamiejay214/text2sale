# Text2Sale pricing and cost worksheet

Pricing version `2026-10-20` (see `lib/plans.ts`). Internal only: wholesale costs stay out of customer-facing pages.

> **Status: planning basis, not reconciled.** Every cost below is a published Telnyx list rate or an estimate from code comments. None of it has been checked against this account's Telnyx invoices or negotiated rates. Pull the last 2–3 Telnyx invoices and a Telnyx usage export, then replace each figure before changing any customer rate.

## Plans (software access)

| Plan | Monthly per user | Capabilities |
| --- | --- | --- |
| Text2Sale Text | $39.99 | Texting, campaigns, AI text replies |
| Text2Sale Dialer | $89.99 | Manual, power and predictive dialing; AI receptionist |
| Text2Sale Complete | $119.99 | Both (saves $9.99/month versus buying Text and Dialer separately) |

These rules keep the revenue streams separate:

- Subscriptions never become wallet credit.
- Wallet deposits are not revenue until they are spent on usage.
- Phone numbers and messaging registration are separate pass-through charges.

## Usage rates against the 60% gross-margin target

**Target:** retail price = fully loaded variable cost ÷ 0.40.

**Payment processing comes on top of every margin below.** Stripe takes about 2.9% + $0.30 per wallet top-up: about 3.5% on a $50 top-up and about 3.0% on $500. Subtract that from each margin.

| Service | Customer rate | Assumed variable cost | Gross margin | Price at 60% | Verdict |
| --- | --- | --- | --- | --- | --- |
| Outbound SMS, standard | $0.015 / segment | $0.004 + $0.0035 carrier (AT&T) = $0.0075 | 50% | $0.0188 | **Below target** |
| Outbound SMS, volume ($500+ deposit) | $0.0135 / segment | $0.0075 | 44% | $0.0188 | **Below target** |
| Inbound SMS | Free | $0.004 + carrier fee | Loss per message | n/a | Absorbed by design; watch reply-heavy accounts |
| AI text reply fee | $0.02 + SMS | Model tokens, not measured | Unknown | n/a | **Measure**: log tokens per reply |
| Outbound call, dialer to browser | $0.025 / min | $0.002 call control + **~$0.005 SIP termination (assumed)** + $0.002 browser leg = $0.009 | ~64% | $0.0225 | Meets target if termination ≤ $0.006 |
| Answering-machine detection | Not charged separately | $0.002 per invocation | n/a | n/a | Absorbed; scales with answered dials |
| Unanswered predictive attempts | Not charged | **Unknown**: confirm whether Telnyx bills ring time or setup | Possible loss | n/a | **Verify on invoice** |
| Voicemail-detected dialer calls | Refunded in code today | Billed by Telnyx while connected | Loss per call | n/a | **Loss**: revisit the refund |
| Inbound call to browser | $0.015 / min | $0.0052 inbound + $0.002 browser leg = $0.0072 | ~52% | $0.018 | **Below target** |
| Forwarded call to a cell | $0.04 / min | $0.0052 + $0.002 + ~$0.005 termination = $0.0122 | ~70% | $0.0305 | OK |
| Dialer call transferred to a cell | $0.05 / min | Two outbound legs, about $0.014 | ~72% | $0.035 | OK |
| AI receptionist | $0.18 / min (replaces the inbound rate) | ~$0.043: carrier, speech-to-text, text-to-speech, model (from `lib/call-pricing.ts`) | ~76% | $0.1075 | OK |
| Local number | $1.50 / month | $1.00 published, before extras | 33% | $2.50 | **Below target** |
| Number activation | $0 | Any one-time Telnyx fee | Unknown | n/a | Verify |
| Messaging registration | Pass-through: $4.50 brand + $15 per review + campaign fees | Same | 0% (pass-through) | n/a | OK by design |

### Rates that miss the 60% target

None of these rates has been changed. Changing live customer prices needs verified costs and your decision.

- **SMS, standard rate:** 50% margin.
- **SMS, volume rate:** 44% margin.
- **Inbound calls:** about 52% margin.
- **Number rental:** 33% margin.
- **Voicemail refunds on dialer calls:** a loss on every refunded call.
- **AMD fees:** absorbed, so they cost money on every answered dial.
- **Unanswered predictive attempts:** possibly billed by Telnyx, so possibly a loss.

## Customer examples

These exclude taxes, the first registration fees and optional services. Calls are billed per started minute, rounded up.

| Customer | Usage | Monthly total |
| --- | --- | --- |
| Text only | $39.99 + 10,000 segments ($150) + 1 number ($1.50) + standard campaign ($10) | $201.49 |
| Dialer only | $89.99 + 3,000 outbound minutes ($75) + 100 AI receptionist minutes ($18) + 1 number ($1.50) | $184.49 |
| Complete | $119.99 + $150 + $75 + $18 + $1.50 + $10 | $374.49 |

1,000 leads is not 1,000 billable minutes or 1,000 SMS segments.

- **Dialing:** cost depends on the answer rate and talk time.
- **Texting:** cost depends on message length (number of segments) and how many follow-ups are sent.

## Still to verify

1. **Telnyx invoices.** Get actual per-minute rates for termination, inbound DID, browser (WebRTC/SIP credential) legs, AMD, unanswered attempts, carrier SMS fees by carrier, and number extras.
2. **AI reply cost.** Measure model tokens per reply and per AI-receptionist minute from real usage.
3. **Stripe fees.** Check actual fees and the refund and chargeback history.
4. **Billing paths.** Confirm each charges the rate above:
   - `lib/call-metering.ts`
   - the call webhook's settlement
   - `send-sms` and `send-campaign`
   - the number billing cron
