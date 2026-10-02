This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# text2sale

## Customer activation pipeline (signup → texting live)

After a customer subscribes and submits their business details once, everything else is automatic:

1. **Website** – a compliance site is generated from their details (`/biz/<slug>`, served on their own domain). With "build one for me" the driver registers the domain they picked, **after** debiting their wallet.
2. **Business registration** – submitted to Telnyx once the site answers.
3. **Messaging (10DLC) registration** – filed when the business is approved; industry-specific wording, privacy/terms links on their own domain.
4. **Phone number** – bought (wallet debited first) and attached when the campaign is approved.

`lib/messaging-driver.ts` does the work and runs every minute from the cron `/api/messaging/advance`. `lib/activation-pipeline.ts` turns a profile row into the progress shown in **Admin → Activation**.

### Settings the automation needs (Vercel env vars)

| Variable | Why |
| --- | --- |
| `CRON_SECRET` | Authorises the minute cron. **Without it the activation cron (and every other cron) refuses to run.** |
| `MESSAGING_AUTOBUY=true` | Lets the driver buy phone numbers. Off = accounts wait at "campaign approved". |
| `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` | Lets the driver register and attach customer domains. Without them customers fall back to "I own a domain". |
| `TELNYX_API_KEY`, `TELNYX_MESSAGING_PROFILE_ID` | Telnyx. Keep the Telnyx account balance funded: a low balance holds registrations and texts you (it never rejects the customer). |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Subscriptions, wallet top-ups, AI-plan upgrades. |

### Pay-first rules

Nothing is bought for an account that isn't paying. Brand/campaign registration needs an active (or comped) subscription; phone numbers and domains debit the customer's wallet before the supplier is called and are refunded if the order fails; opt-in confirmation texts and 1:1 texts are charged before they are sent.
