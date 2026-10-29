# Text2Sale

**Text2Sale** is an AI lead follow-up CRM for insurance agents and sales teams.

Website: https://text2sale.com

## What Text2Sale does

Text2Sale brings lead follow-up into one workspace:

- Mass SMS campaigns and two-way texting
- AI text replies and lead qualification
- AI appointment setting with Google Calendar workflows
- Manual, power, and predictive dialing
- AI receptionist for inbound calls
- CSV lead import and contact management
- Drip sequences and campaign analytics
- STOP suppression, quiet hours, and 10DLC workflow tools

### Key product pages

- AI appointment setter: https://text2sale.com/ai-appointment-setter
- AI receptionist for insurance agents: https://text2sale.com/ai-receptionist-for-insurance-agents
- Predictive dialer for insurance agents: https://text2sale.com/predictive-dialer-for-insurance-agents
- Insurance lead follow-up software: https://text2sale.com/insurance-lead-follow-up-software
- Reactivate old insurance leads: https://text2sale.com/reactivate-old-insurance-leads
- Mass texting CRM: https://text2sale.com/mass-texting-crm
- Pricing: https://text2sale.com/pricing

## Customer activation pipeline

After a customer subscribes and submits their business details, the application can automate compliance-site setup, business registration, messaging registration, and phone-number activation.

1. **Website** – a compliance site is generated from the customer's details.
2. **Business registration** – submitted after the compliance site is available.
3. **Messaging registration** – filed when business registration is approved.
4. **Phone number** – purchased and attached when the messaging campaign is approved.

`lib/messaging-driver.ts` handles the workflow and `lib/activation-pipeline.ts` maps status into the Admin activation view.

## Environment configuration

| Variable | Purpose |
| --- | --- |
| `CRON_SECRET` | Authorizes scheduled jobs. |
| `MESSAGING_AUTOBUY=true` | Allows the activation driver to purchase phone numbers. |
| `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` | Domain automation. |
| `TELNYX_API_KEY`, `TELNYX_MESSAGING_PROFILE_ID` | Messaging and telephony. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Subscriptions and wallet payments. |

## Pay-first rules

Supplier purchases are tied to eligible paid or comped accounts. Phone numbers and domains debit the customer's wallet before the supplier call and are refunded if the order fails.

## Support

support@text2sale.com
