// Content for the free lead-magnet resources. The first section of each is
// public (and indexable); the rest unlocks after an email signup.

export type TextGroup = { title: string; when: string; texts: string[] };

export const TEXT_PACK: TextGroup[] = [
  {
    title: "New lead: first contact",
    when: "Within a minute of the lead arriving",
    texts: [
      "Hi {first}, this is {agent} with {agency}. Thanks for your {product} request. Is now a good time for a quick call?",
      "Hi {first}, {agent} here from {agency}. I got your {product} request. Would today or tomorrow be better for a 10-minute call?",
      "Hi {first}, it's {agent} with {agency}. Happy to help with {product}. What's the best time to reach you?",
      "Hi {first}, this is {agent} at {agency}. I can go over your {product} options by phone or text. Which do you prefer?",
      "Hi {first}, {agent} with {agency}. Quick question before I call: is the {product} coverage for you or your family?",
    ],
  },
  {
    title: "After a missed call",
    when: "Right after a call that went to voicemail",
    texts: [
      "Hi {first}, this is {agent} with {agency}. I just tried calling about your {product} request. When is a good time to talk?",
      "Hi {first}, sorry I missed you. It's {agent} with {agency}. Reply with a good time and I'll call you then.",
      "Hi {first}, {agent} from {agency}. I left you a quick voicemail. Texting works too if that's easier.",
      "Hi {first}, it's {agent} with {agency}. Would a call after work be better for you?",
      "Hi {first}, {agent} at {agency} again. I'll try once more this afternoon unless another time works better.",
    ],
  },
  {
    title: "Aged lead re-engagement",
    when: "Leads that went quiet weeks or months ago",
    texts: [
      "Hi {first}, this is {agent} with {agency}. You asked about {product} a while back. Are you still looking for options?",
      "Hi {first}, {agent} from {agency}. Did you ever get your {product} sorted, or is it still on the list?",
      "Hi {first}, it's {agent} with {agency}. Want me to check what {product} options are available for you this year?",
      "Hi {first}, {agent} with {agency}. A lot can change in a year. Want a quick look at your {product} options?",
      "Hi {first}, it's {agent} at {agency}. Should I keep your {product} info on file, or are you all set?",
    ],
  },
  {
    title: "After a quote",
    when: "Lead has a quote but hasn't decided",
    texts: [
      "Hi {first}, {agent} with {agency}. Did you get a chance to look over the {product} quote? Any questions I can answer?",
      "Hi {first}, it's {agent} at {agency}. Is there anything about the quote you'd like me to change, like the price or coverage?",
      "Hi {first}, {agent} here. Would it help to walk through the {product} quote together for five minutes?",
      "Hi {first}, it's {agent} with {agency}. Are you comparing other quotes? Happy to help you line them up side by side.",
      "Hi {first}, {agent} from {agency}. I'll hold your quote details for now. Just reply when you're ready to talk.",
    ],
  },
  {
    title: "Appointments and no-shows",
    when: "Confirmations, reminders and recovery",
    texts: [
      "Hi {first}, it's {agent} with {agency}. You're booked for {time}. I'll call from this number. Reply here if you need to move it.",
      "Hi {first}, {agent} from {agency}. Just a reminder about our call tomorrow at {time}. Still good for you?",
      "Hi {first}, it's {agent}. I'll call you in about an hour. Talk soon!",
      "Hi {first}, it's {agent} with {agency}. Sorry we missed each other. Is now still good, or should we pick another time?",
      "Hi {first}, {agent} here. Happy to reschedule. Does morning or afternoon work better this week?",
    ],
  },
  {
    title: "Clients: reviews, renewals and referrals",
    when: "After the sale",
    texts: [
      "Hi {first}, it's {agent} with {agency}. Your {product} renewal is coming up. Want a quick review to make sure it still fits?",
      "Hi {first}, {agent} here. Thanks again for trusting {agency}. Any questions about your new coverage?",
      "Hi {first}, it's {agent} with {agency}. If you were happy with my help, would you mind leaving a short review? It means a lot.",
      "Hi {first}, {agent} from {agency}. Do you know anyone else shopping for {product}? I'd be glad to help them too.",
      "Hi {first}, it's {agent} with {agency}. Just checking in. Has anything changed that might affect your coverage?",
    ],
  },
];

export type PlaybookStep = { title: string; body: string[]; bullets?: string[] };

export const REACTIVATION_PLAYBOOK: PlaybookStep[] = [
  {
    title: "1. Pick the right list",
    body: [
      "Start with leads that fit what you sell today and whose consent covers texts from your business. Remove anyone who opted out, any numbers marked DNC, landlines and duplicates. A clean list of 1,000 beats a messy list of 10,000.",
    ],
  },
  {
    title: "2. Segment before you send",
    body: ["Group the list so each message fits why the person reached out."],
    bullets: ["By product: health, life, final expense, auto", "By age: under 90 days, 3–12 months, over a year", "By source: vendor, your website, referral", "By past activity: never reached, talked once, quoted"],
  },
  {
    title: "3. Write a first text that sounds like a person",
    body: [
      "Name your agency, remind them of the request and ask one easy question. Leave out links, urgency and anything that reads like an ad. Add 'Reply STOP to opt out.' Run it through a character counter so it stays in one segment.",
    ],
  },
  {
    title: "4. Send in small batches",
    body: [
      "Send a few hundred at a time, spread across the day and across several days. Watch delivery failures, replies and opt-outs after each batch. If failures or opt-outs climb, stop and fix the message before sending more.",
    ],
  },
  {
    title: "5. Work replies within the hour",
    body: [
      "Most replies come quickly, so someone or something needs to answer fast. Staff the inbox right after each batch or turn on AI replies to qualify and offer call times. Call anyone who says yes within minutes.",
    ],
  },
  {
    title: "6. Follow up twice, then rest the lead",
    body: [
      "Send one follow-up two or three days later and one more about a week after that. Call anyone who replied but did not book. Leads who never answer go into a slow nurture: a check-in each season, not each week.",
    ],
  },
  {
    title: "7. Answer every callback",
    body: [
      "Texts and voicemails lead to inbound calls, often when you are busy. Make sure every callback is answered, by a person or an AI receptionist, and that the caller's history shows up so you know who they are.",
    ],
  },
  {
    title: "Your 7-day schedule",
    body: ["A simple week for a reactivation campaign."],
    bullets: [
      "Day 1: clean and segment the list; send the first batch late morning; work replies",
      "Day 2: send the second batch; call yesterday's positive replies",
      "Day 3: send the third batch; first follow-up to day 1 non-responders",
      "Day 4: power-dial everyone who replied but did not book",
      "Day 5: first follow-up to day 2–3 non-responders",
      "Day 6: review numbers by segment; drop the weakest segment",
      "Day 7: final follow-up; move non-responders to seasonal nurture",
    ],
  },
  {
    title: "What to track",
    body: ["Keep these numbers for each batch so you know what to scale."],
    bullets: ["Delivered rate", "Reply rate", "Opt-out rate", "Appointments booked", "Appointments that showed", "Policies written and commission"],
  },
];
