import type { BlogPost } from "./blog-posts";

type NewArticle = Omit<BlogPost, "datePublished" | "dateModified" | "readMinutes">;

// Volume 15: problems and fixes, part three. Text-only leads, spammy texts,
// "send me info", lead surges, cancellations, competing with bigger shops,
// split histories, data entry, cost per sale and owner-led follow-up.
const ARTICLES: NewArticle[] = [
  {
    slug: "leads-who-only-answer-texts-not-calls",
    metaTitle: "Leads Who Only Answer Texts, Never Calls: How to Sell to Them | Text2Sale",
    title: "Leads who only answer texts, never calls: how to sell to them",
    description:
      "A growing share of leads will text back happily but never pick up a call. Here is how to move those conversations forward and close deals without forcing a phone call.",
    excerpt: "Some leads will text all day and never answer a call. Here is how to work with them.",
    tags: ["Two-way texting", "SMS follow-up", "Sales teams"],
    intro: [
      "You have probably seen it: a lead replies to every text within minutes, asks good questions and seems genuinely interested, but every call goes straight to voicemail. It is tempting to read that as a lack of seriousness. Usually it is not. Many people, especially younger buyers and those who work all day, simply prefer texting and treat unknown calls as spam.",
      "Treating these leads as hopeless until they answer the phone loses deals. Meeting them where they are, and using the phone only when it adds something, wins them.",
    ],
    sections: [
      {
        heading: "The problem: a phone-first process for text-first people",
        paragraphs: [
          "Most sales processes were designed around the phone. Qualifying happens on a call, quotes are explained on a call and closing happens on a call. When a lead will not pick up, the process stalls. Reps keep calling, the lead keeps declining and eventually someone marks the lead as unresponsive even though it was responding all along, just in a different channel.",
          "The mismatch also creates friction for the lead. Being called repeatedly after making it clear you prefer texting feels pushy, and pushy is a fast way to lose a sale.",
        ],
      },
      {
        heading: "Why people avoid calls",
        bullets: [
          "Unknown numbers are often spam, so many people never answer them",
          "They cannot take calls at work but can text discreetly",
          "Texting lets them respond when it suits them",
          "They want a written record of prices and details",
          "Some people simply find calls stressful",
        ],
        paragraphs: [
          "None of these reasons mean the lead is not a buyer. They mean the lead wants control over when and how the conversation happens.",
        ],
      },
      {
        heading: "The fix: run more of the sale by text",
        paragraphs: [
          "Start by asking. 'Is texting easier for you, or would you prefer a quick call?' respects their preference and saves you from guessing. If they choose texting, run as much of the process as you can there. Ask qualifying questions one or two at a time, keep each message short and confirm understanding as you go.",
          "Summarize key details in writing. Text-first leads appreciate a clear summary of options, prices and next steps they can refer back to. That written record often moves them toward a decision faster than a call would.",
          "Save the call for when it truly helps, such as walking through a complex quote or finalizing paperwork, and schedule it by text: 'Would a five-minute call at 6 tonight be easier to go over the final details, or should we keep going by text?' A scheduled call with a text-first lead is far more likely to be answered than a surprise call.",
        ],
      },
      {
        heading: "Keep it personal",
        paragraphs: [
          "Texting can feel transactional if every reply is a template. Use the lead's name, refer back to what they told you and answer their actual questions. Fast, specific, human replies are what make text-first buyers trust you enough to buy without ever hearing your voice, or before they agree to.",
          "When you do need to call, a quick heads-up text right before the call ('Calling you now from this number') makes it much more likely they answer.",
        ],
      },
      {
        heading: "How Text2Sale helps",
        paragraphs: [
          "Text2Sale keeps the full two-way conversation with each lead in a shared inbox, so anyone on the team can pick up the thread. AI replies can answer common questions and offer appointment times when you are busy. When a call makes sense, you can call from the same number the lead has been texting, so the call is recognized, and the call notes sit right next to the text history.",
        ],
      },
      {
        heading: "Measure by channel",
        paragraphs: [
          "Track how many deals close mostly by text versus mostly by phone. Many teams find that the text-first share is larger than they assumed, which is a good reason to train reps to sell confidently in both channels.",
        ],
      },
    ],
    keyTakeaways: [
      "Text-first leads are often serious buyers who avoid unknown calls.",
      "Ask which channel they prefer instead of guessing.",
      "Run qualifying and quoting by text, with clear written summaries.",
      "Schedule calls by text and call from the same number.",
    ],
    faq: [
      {
        question: "Can you really close a sale entirely by text?",
        answer:
          "For many products, yes, especially when paperwork can be completed electronically. For others, texting gets you most of the way and a short scheduled call finishes it.",
      },
      {
        question: "How many times should I call a text-only lead?",
        answer: "If they have told you they prefer texting, stop cold calling and schedule calls by text instead.",
      },
      {
        question: "Won't texting take longer than a call?",
        answer: "Sometimes, but it often closes leads a call never would have reached, which is the trade that matters.",
      },
    ],
    relatedSlugs: ["sms-vs-cold-calling-leads", "voicemail-vs-text-follow-up", "how-to-book-appointments-by-text"],
    relatedPages: [{ href: "/sms-follow-up-for-sales-teams", label: "SMS follow-up for sales teams" }],
  },
  {
    slug: "texts-that-sound-like-spam",
    metaTitle: "Why Your Business Texts Sound Like Spam (and How to Fix Them) | Text2Sale",
    title: "Why your business texts sound like spam, and how to fix them",
    description:
      "Texts that read like spam get ignored, reported and filtered. Here are the patterns that trigger the spam reaction and how to rewrite messages so people actually reply.",
    excerpt: "The patterns that make texts read like spam, and the rewrites that fix them.",
    tags: ["Copywriting", "Deliverability", "SMS marketing"],
    intro: [
      "People decide in about two seconds whether a text is from a real person or a mass blast. If it reads like spam, it gets ignored at best and reported at worst. Reports hurt your delivery for everyone else on your list, so a spammy message costs you more than one lost reply.",
      "Most spammy texts are not written by spammers. They are written by well-meaning businesses that borrowed the style of advertising for a channel built for conversation.",
    ],
    sections: [
      {
        heading: "The patterns that trigger the spam reaction",
        bullets: [
          "Starting with 'Attention', 'Congratulations' or 'Limited time'",
          "ALL CAPS words and repeated exclamation points",
          "Vague senders with no business name",
          "Shortened links from public link services",
          "Long messages packed with offers and conditions",
          "Generic greetings like 'Dear customer' or no name at all",
          "Urgency that feels manufactured, like 'Act now'",
        ],
        paragraphs: [
          "Each of these signals that the message was sent to thousands of people at once, which is exactly what spam is.",
        ],
      },
      {
        heading: "The problem: advertising habits in a personal channel",
        paragraphs: [
          "Text messages sit in the same app as messages from family and friends. People expect texts to be personal and conversational. Advertising language that works on a billboard feels intrusive in that setting.",
          "Carriers have also learned these patterns. Messages with spam-like wording and links are more likely to be filtered, so a spammy style can mean your text never arrives at all.",
        ],
      },
      {
        heading: "The fix: write like a person who knows them",
        paragraphs: [
          "Imagine texting a client you have already met. You would use their first name, say who you are, mention what they asked about and ask a simple question. That is the template for good business texts.",
          "Compare 'ATTENTION!!! Exclusive health plan savings available NOW. Click here: [short link]' with 'Hi Maria, it is Jake with Coastal Health Quotes. You asked about coverage for your family last week. Still looking, or did you find something?' The second one gets replies because it reads like a real conversation.",
          "Keep messages short, ideally under two short sentences plus a question. Leave out links in first messages unless the person asked for one, and use your own domain when you do include a link. Identify your business clearly, especially to new contacts.",
        ],
      },
      {
        heading: "Before and after examples",
        bullets: [
          "Before: 'Huge roofing discounts this week only!!!' After: 'Hi Dan, it is Lisa with Peak Roofing. Saw your inspection request, does Thursday or Friday work?'",
          "Before: 'Refinance today and SAVE!' After: 'Hi Priya, it is Sam with Lakeview Mortgage. You asked about refinancing, want me to run updated numbers?'",
          "Before: 'Your quote is ready, click here.' After: 'Hi Joe, your quote is ready. Want me to text the highlights or walk you through it on a quick call?'",
        ],
        paragraphs: [
          "Each rewrite is personal, specific and ends with an easy question.",
        ],
      },
      {
        heading: "Test and measure",
        paragraphs: [
          "Run two versions of a message on similar leads and compare reply and opt-out rates. Conversational versions almost always win. Keep a library of your best-performing messages so the whole team writes in a style that works.",
        ],
      },
      {
        heading: "Read your message out loud before sending",
        paragraphs: [
          "A simple test catches most spammy wording: read the text out loud as if you were saying it to the person face to face. If it sounds like an advertisement, a script or something you would never say in a real conversation, rewrite it. Real people use first names, short sentences and plain questions.",
          "Also look at the shape of the message. A wall of text, several links, all capital letters or a string of exclamation points all signal marketing. One clear sentence about who you are and one simple question about what they need will almost always outperform a longer, louder message.",
        ],
      },
      {
        heading: "How Text2Sale helps",
        paragraphs: [
          "Text2Sale supports personalization with your lead fields, so every message can include the person's name and what they asked about. Campaigns are sent from registered local numbers in paced waves, and reports show replies and opt-outs so you can see which messages work. Spintax lets you vary wording across a campaign so it reads less like a single blast.",
        ],
      },
    ],
    keyTakeaways: [
      "Spammy texts get ignored, reported and filtered.",
      "Advertising language feels intrusive in a personal channel.",
      "Use names, say who you are and ask one easy question.",
      "Skip public short links and test messages against each other.",
    ],
    faq: [
      {
        question: "Can I ever send promotional texts?",
        answer: "Yes, to people who agreed to receive them, but keep the tone conversational and the frequency low.",
      },
      {
        question: "Do emojis make texts look like spam?",
        answer: "One relevant emoji is fine for many audiences. Several in a row start to look like marketing.",
      },
      {
        question: "Should every text include my business name?",
        answer: "The first message to a new contact should. In an ongoing conversation, a first name is usually enough.",
      },
    ],
    relatedSlugs: ["first-text-to-a-new-lead-examples", "texts-not-delivering-how-to-diagnose", "why-leads-dont-reply-to-your-texts"],
    relatedPages: [{ href: "/sms-character-counter", label: "Free SMS character counter" }],
  },
  {
    slug: "leads-who-say-send-me-info",
    metaTitle: "When Leads Say 'Just Send Me Info': How to Respond | Text2Sale",
    title: "When leads say 'just send me info': how to respond",
    description:
      "'Send me some information' often ends a conversation politely. Here is how to respond so the conversation continues and the information actually leads somewhere.",
    excerpt: "'Just send me info' usually means 'go away politely'. Here is how to keep talking.",
    tags: ["Scripts", "SMS follow-up", "Copywriting"],
    intro: [
      "'Can you just send me some information?' is one of the most common lines in sales. Sometimes it is sincere. Often it is the most polite way to end a call or text conversation without saying no. Either way, if you respond by emailing a brochure and waiting, the conversation usually ends there.",
      "The goal is not to argue with the request. It is to honor it in a way that keeps the conversation going.",
    ],
    sections: [
      {
        heading: "The problem: information without a next step",
        paragraphs: [
          "When you send a generic packet of information, you hand the lead a task: read this and decide. Most people never do. The packet sits in an inbox, the lead does not reply and your follow-up feels awkward because you are now checking whether they read something they never planned to read.",
          "Generic information also misses the point. The lead does not need everything you offer. They need the one or two things relevant to their situation, and you do not know what those are yet.",
        ],
      },
      {
        heading: "What 'send me info' usually means",
        bullets: [
          "They are busy right now and want to end the call",
          "They are not sure they are interested and do not want to say no",
          "They want something in writing to compare",
          "They genuinely need details before they can decide",
        ],
        paragraphs: [
          "Your response should work for all four.",
        ],
      },
      {
        heading: "The fix: agree, narrow and schedule",
        paragraphs: [
          "First, agree. 'Absolutely, I can send that.' Arguing or pushing only confirms their desire to leave.",
          "Second, narrow. Ask one or two quick questions so you send what matters: 'So I send the right thing, is this mainly for you or the whole family? And is monthly cost or coverage the bigger priority?' Those questions also restart the conversation, and many leads answer more than you asked.",
          "Third, schedule the next step. 'I will text it over now. Would tomorrow at 5 or Thursday at noon be a good time for a quick call to answer questions?' If they decline a call, offer to check in by text instead. Either way, there is a clear next touch.",
          "Then send the information by text, not just email, with a short personal note. A concise summary or two or three key points in the text itself is more likely to be read than an attachment.",
        ],
      },
      {
        heading: "The follow-up",
        paragraphs: [
          "Follow up at the agreed time with a specific question, not 'did you read it?'. Something like 'Hi Kim, any questions on the two plan options I sent? The second one keeps your current doctor.' A specific question invites a specific answer.",
          "If they go quiet, put them into a gentle follow-up sequence rather than dropping them. Some 'send me info' leads take weeks to decide, and staying in touch without pressure is how you are there when they do.",
        ],
      },
      {
        heading: "How Text2Sale helps",
        paragraphs: [
          "With Text2Sale you can send information right from the text conversation, schedule a callback or appointment for the agreed time and put the lead into a follow-up sequence that stops when they reply. Saved templates make it easy to send concise summaries, and AI replies can answer simple follow-up questions when you are busy.",
        ],
      },
      {
        heading: "A short script to keep handy",
        paragraphs: [
          "'Absolutely, I will text it over now. So I send the right thing, quick question: is this for you or your whole household? Great. And would tomorrow at 5 or Thursday at noon be better for a five-minute call to go over it?' Practice it until it feels natural and you will turn many polite brush-offs into real conversations.",
        ],
      },
    ],
    keyTakeaways: [
      "'Send me info' often ends conversations politely.",
      "Agree, then ask a narrowing question.",
      "Always schedule the next step before sending.",
      "Send short, specific information by text and follow up with a specific question.",
    ],
    faq: [
      {
        question: "What if they refuse to answer any questions?",
        answer: "Send a short, general summary anyway and schedule a text check-in. Some people need space before engaging.",
      },
      {
        question: "Should I send information by email or text?",
        answer: "Text a short summary and offer to email full details if they want them. The text is far more likely to be read.",
      },
      {
        question: "How soon should I follow up?",
        answer: "At the time you agreed on, or within one to two days if you did not set one.",
      },
    ],
    relatedSlugs: ["sms-objection-handling-scripts", "what-to-text-a-lead-who-ghosted-you", "lead-says-call-me-later-text-reply"],
    relatedPages: [{ href: "/how-to-text-insurance-leads", label: "How to text insurance leads" }],
  },
  {
    slug: "handling-lead-surges-without-hiring",
    metaTitle: "Handling Lead Surges Without Hiring More Staff | Text2Sale",
    title: "Handling lead surges without hiring more staff",
    description:
      "Open enrollment, storm season and big ad campaigns bring more leads than a small team can handle. Here is how to keep up during surges without adding headcount.",
    excerpt: "When leads spike, these steps keep a small team from drowning.",
    tags: ["Operations", "Automation", "Speed to lead"],
    intro: [
      "Many businesses have a busy season. Insurance agents have open enrollment and annual enrollment periods. Roofers get flooded after hail and windstorms. Tax preparers live through spring. A successful ad campaign can produce a surge any time. The leads arrive faster than the team can call them, and the ones that wait go cold.",
      "Hiring for a few busy weeks is expensive and slow, and new people are rarely effective in time. The better approach is to change how the team handles leads during the surge.",
    ],
    sections: [
      {
        heading: "The problem: fixed capacity, variable demand",
        paragraphs: [
          "A team that can comfortably handle fifty new leads a week will struggle with two hundred. Response times stretch from minutes to hours to days. Reps start triaging by instinct, calling the leads that look best and leaving the rest. Follow-up stops entirely because there is no time for anything but new leads.",
          "The cruel irony is that surges usually happen when buyers are most motivated. Losing leads during a surge means losing the best leads of the year.",
        ],
      },
      {
        heading: "The fix: automate the first touch and let leads sort themselves",
        paragraphs: [
          "During a surge, the most valuable thing a person can do is talk to leads who want to talk. Everything else should be automated or deferred. Start by sending every new lead an automatic first text that acknowledges their request and asks a simple qualifying question or offers appointment times. Leads who reply are ready to engage; leads who do not reply go into a follow-up sequence.",
          "Let AI handle routine back-and-forth. AI replies can answer common questions, collect basic details and offer open slots on the calendar. Your team then spends its time on booked appointments and engaged conversations instead of first contacts.",
          "Use the dialer for volume. A power or predictive dialer lets reps work through lists of engaged and warm leads far faster than manual dialing, which is exactly what a surge needs.",
        ],
        bullets: [
          "Automatic first text to every new lead",
          "AI replies for common questions and booking",
          "Dialer sessions focused on leads who replied",
          "Follow-up sequences for everyone else",
          "Short, protected time blocks for appointments",
        ],
      },
      {
        heading: "Prepare before the surge",
        paragraphs: [
          "Surges are predictable for most businesses. Write your first-touch texts, follow-up sequences and AI instructions before the busy season starts. Test them on current leads. Make sure your calendar has clear availability so AI and reps can book appointments without back-and-forth. Clean your old lead lists so you can also run reactivation campaigns while demand is high.",
        ],
      },
      {
        heading: "Protect follow-up during the rush",
        paragraphs: [
          "It is tempting to abandon follow-up when new leads are pouring in. Do not. Let automation keep follow-up running in the background, and set aside a small block each day for scheduled callbacks and quotes waiting on decisions. Those deals are often closer to closing than any new lead.",
        ],
      },
      {
        heading: "After the surge",
        paragraphs: [
          "When things calm down, review what happened. Which messages got the best replies? Which lead sources produced appointments? Where did leads wait the longest? Those answers make the next surge easier. Leads that did not convert during the rush also make a great list for a follow-up campaign a few weeks later.",
        ],
      },
      {
        heading: "How Text2Sale helps",
        paragraphs: [
          "Text2Sale sends instant first texts, runs follow-up sequences with delays and stop-on-reply, and uses AI replies to answer questions and book appointments into your calendar. The predictive dialer helps a small team work large volumes of engaged leads, and the AI receptionist can catch inbound calls when everyone is busy. Usage is billed from a prepaid wallet, so a busy month costs more only in the texts and minutes you actually use.",
        ],
      },
    ],
    keyTakeaways: [
      "Surges bring the most motivated leads, so losing them is costly.",
      "Automate first touches and let replies tell you who to call.",
      "Use AI for routine questions and booking.",
      "Prepare messages and sequences before the busy season.",
    ],
    faq: [
      {
        question: "Can automation really replace extra staff during busy season?",
        answer:
          "It cannot replace selling, but it can handle first contact, routine questions and scheduling, which frees your team to sell.",
      },
      {
        question: "How do I decide which leads to call first?",
        answer: "Leads who replied to your first text, then leads with booked appointments, then warm leads from recent days.",
      },
      {
        question: "Should I pause marketing if we are overwhelmed?",
        answer: "Usually not. Fix the handling first; pausing during peak demand often means missing your best season.",
      },
    ],
    relatedSlugs: ["open-enrollment-dialer-strategy", "lead-temperature-who-to-call-first", "after-hours-ai-appointment-booking"],
    relatedPages: [{ href: "/health-insurance", label: "Health insurance appointments" }],
  },
  {
    slug: "policy-cancellations-and-lapse-prevention",
    metaTitle: "Preventing Policy Cancellations and Lapses With Better Follow-Up | Text2Sale",
    title: "Preventing policy cancellations and lapses with better follow-up",
    description:
      "Every lapsed policy undoes the work of a sale. Here is why clients cancel or lapse and how proactive texting and calling keep more of your book in force.",
    excerpt: "Keeping a client is cheaper than finding a new one. Here is how to cut lapses.",
    tags: ["Retention", "Insurance", "Customer service"],
    intro: [
      "Insurance agents spend most of their energy on new sales. Yet for many agencies the quickest way to grow income is to keep more of the clients they already have. A policy that lapses in month three can mean lost commission, a chargeback and a client who never comes back.",
      "Most cancellations and lapses are not sudden decisions. They build over time from small problems nobody addressed. Proactive follow-up catches many of them early.",
    ],
    sections: [
      {
        heading: "Why clients cancel or lapse",
        bullets: [
          "A payment fails and the client does not notice",
          "They forget what the policy covers and question its value",
          "A cheaper offer reaches them and nobody explains the trade-offs",
          "Their situation changes and the policy no longer fits",
          "They feel forgotten after the sale",
        ],
        paragraphs: [
          "Almost all of these can be prevented or softened by a timely, friendly contact from the agent.",
        ],
      },
      {
        heading: "The problem: silence after the sale",
        paragraphs: [
          "After a sale, many agents move straight on to the next lead. The client hears nothing until renewal, or until something goes wrong. In that silence, doubts grow, competitors make offers and missed payments go unnoticed. By the time the agent finds out, the policy has already lapsed.",
        ],
      },
      {
        heading: "The fix: a simple retention rhythm",
        paragraphs: [
          "Set up a light, regular rhythm of contact for every new client. A welcome text right after the sale confirms the details and tells them how to reach you. A check-in after the first payment confirms everything went through. A short message at thirty, sixty and ninety days reminds them what their coverage does and invites questions.",
          "Add timely reminders around key moments: payment dates, renewals, enrollment periods and policy anniversaries. A short text before a payment date prevents many accidental lapses. A note before renewal gives you a chance to review coverage before a competitor does.",
          "When a payment fails or a client signals doubt, act fast. A same-day text and call to help fix a failed payment or answer a concern saves policies that would otherwise quietly disappear.",
        ],
        bullets: [
          "Welcome text right after the sale",
          "Check-in after the first payment",
          "Value reminders at 30, 60 and 90 days",
          "Reminders before payments and renewals",
          "Same-day outreach on failed payments or doubts",
        ],
      },
      {
        heading: "Make it personal, not robotic",
        paragraphs: [
          "Retention messages work because they come from someone the client remembers. Sign them with your name, refer to their specific coverage and keep the tone warm. 'Hi Rosa, it is Mike from Sunrise Insurance. Just checking that your first payment went through okay, and reminding you that your plan covers urgent care visits too. Anything I can help with?' reads like genuine care, because it is.",
        ],
      },
      {
        heading: "Turn retention into referrals",
        paragraphs: [
          "Clients who feel looked after are the most likely to refer friends and family. After a positive check-in, a simple ask such as 'If you know anyone else shopping for coverage, I would be glad to help them too' turns your retention rhythm into a referral engine.",
        ],
      },
      {
        heading: "Build a simple retention calendar",
        paragraphs: [
          "Most lapses are predictable. Payment dates, renewal dates, rate changes and the first few months after a sale are the moments when clients are most likely to cancel or miss a payment. Put those dates on a calendar for every client and plan a short, friendly touch before each one.",
          "A text a few days before a payment draft, a quick check-in ninety days after the sale and a review call a month before renewal cost very little time. They show clients you are paying attention, they surface problems while there is still time to fix them and they give clients an easy way to ask questions instead of quietly cancelling.",
          "Track which clients lapse and why. Over a few months, patterns appear, such as a certain carrier, a certain payment method or clients who never heard from you after the sale, and each pattern points to a specific fix.",
        ],
      },
      {
        heading: "How Text2Sale helps",
        paragraphs: [
          "Text2Sale lets you build retention sequences for new clients with timed messages and personalization, send reminders on a schedule and keep every client conversation in one shared inbox. Tags make it easy to segment clients by product and renewal date, and the dialer can call clients who need a personal conversation. AI replies can answer simple questions between your check-ins.",
        ],
      },
    ],
    keyTakeaways: [
      "Most lapses build slowly from small, fixable problems.",
      "Silence after the sale is when doubts and competitors creep in.",
      "A light retention rhythm prevents many cancellations.",
      "Act the same day on failed payments or doubts.",
    ],
    faq: [
      {
        question: "Won't regular check-ins annoy clients?",
        answer: "Not if they are spaced out and genuinely useful. Most clients appreciate an agent who stays in touch.",
      },
      {
        question: "What is the most important retention message?",
        answer: "The reminder before payment dates, because it prevents accidental lapses that clients never intended.",
      },
      {
        question: "Can retention outreach be automated?",
        answer: "The scheduled check-ins can be. Problems like failed payments still deserve a personal call.",
      },
    ],
    relatedSlugs: ["insurance-policy-review-texts", "insurance-referral-request-texts", "lead-nurturing-sequences-for-agents"],
    relatedPages: [{ href: "/life-insurance-texting-crm", label: "Life insurance agents" }],
  },
  {
    slug: "how-small-teams-compete-with-bigger-agencies",
    metaTitle: "How Small Teams Compete With Bigger Agencies and Call Centers | Text2Sale",
    title: "How small teams compete with bigger agencies and call centers",
    description:
      "Large agencies have more reps, bigger budgets and call centers. Small teams can still win by being faster, more personal and more persistent. Here is how.",
    excerpt: "You cannot outspend the big shops. You can out-respond and out-care them.",
    tags: ["Strategy", "Sales teams", "Speed to lead"],
    intro: [
      "If you run a small agency or sales team, you are competing with organizations that have dozens or hundreds of reps, large marketing budgets and call centers that dial around the clock. It is easy to feel outgunned.",
      "But size has costs. Big organizations are often impersonal, slow to adapt and inconsistent. A small team that responds fast, follows up patiently and treats every lead like a person can win business they cannot.",
    ],
    sections: [
      {
        heading: "The problem: you cannot win on volume",
        paragraphs: [
          "Large competitors can buy more leads, run more ads and make more calls than you. If you try to beat them at raw volume, you will lose. Small teams that copy the call-center playbook end up with the worst of both worlds: high-pressure tactics without the scale to make them pay.",
        ],
      },
      {
        heading: "Where big organizations are weak",
        bullets: [
          "Leads often wait in queues before anyone responds",
          "Callers are passed between departments and repeat themselves",
          "Reps follow rigid scripts and sound like it",
          "Follow-up is inconsistent once a lead leaves the main queue",
          "Clients rarely talk to the same person twice",
        ],
        paragraphs: [
          "Every one of these is an opening for a small team.",
        ],
      },
      {
        heading: "The fix: speed, personality and persistence",
        paragraphs: [
          "Be faster. With an automatic first text, a small team can respond to every lead within seconds, which many large organizations do not do. Being first to reply often matters more than having the biggest brand.",
          "Be personal. Use names, remember details and let leads talk to the same person from first contact to sale. People notice when they are treated as individuals, and they reward it with trust and referrals.",
          "Be persistent. Big organizations often drop leads that do not convert quickly. A small team that follows up thoughtfully over weeks catches the leads that larger competitors abandoned.",
          "Be efficient. Use tools that give a small team big-team capabilities: automated texting, AI replies for routine questions, a predictive dialer for calling volume and an AI receptionist for missed calls. That lets three people handle what used to take ten without losing the personal touch.",
        ],
      },
      {
        heading: "Play to your local strengths",
        paragraphs: [
          "Many small teams serve specific regions or communities. Mention local details in your messages, offer in-person meetings when they help and build relationships with referral partners. A national call center cannot say 'I live ten minutes from you and I will be here when you need to file a claim.'",
        ],
      },
      {
        heading: "Measure what matters",
        paragraphs: [
          "Track time to first contact, follow-up attempts per lead, show rate and referral rate. Those are the numbers where small teams beat big ones. If you keep them strong, you will win your share of business regardless of how many reps your competitors have.",
        ],
      },
      {
        heading: "Turn being small into a selling point",
        paragraphs: [
          "Large agencies often feel impersonal. Leads get passed between departments, wait in queues and talk to a different person every time. A small team can promise the opposite: one person who knows the client by name, answers quickly and remembers the details of their situation.",
          "Say that out loud in your messages and on your calls. A line such as 'You will deal with me directly, not a call center' resonates with many buyers, especially those who have already been bounced around by a bigger firm. Then back it up with fast replies, consistent follow-up and notes that let you pick up every conversation exactly where it left off.",
          "Collect reviews and referrals from the clients who appreciate that personal service. Social proof from real local customers is something a small team can build quickly, and it often carries more weight than a large agency's advertising budget.",
        ],
      },
      {
        heading: "How Text2Sale helps",
        paragraphs: [
          "Text2Sale gives small teams the tools larger organizations use, at small-team pricing: instant first texts, campaigns and follow-up sequences, AI replies and appointment booking, power and predictive dialing up to three lines and an AI receptionist. Everything lives in one shared inbox and lead history, so your team can stay personal while handling more volume.",
        ],
      },
    ],
    keyTakeaways: [
      "Do not try to beat big competitors on volume.",
      "Win on speed, personal attention and persistence.",
      "Use automation and dialers to get big-team capacity.",
      "Lean into local knowledge and relationships.",
    ],
    faq: [
      {
        question: "Can a solo agent really compete with a call center?",
        answer: "Yes, on speed and relationships. Many clients prefer a dedicated person over a rotating queue.",
      },
      {
        question: "What is the single biggest advantage a small team has?",
        answer: "Continuity. The same person can handle a lead from first text to sale and beyond.",
      },
      {
        question: "Do I need a predictive dialer as a small team?",
        answer: "Not always, but it helps when you work larger lists. Start small and add lines as volume grows.",
      },
    ],
    relatedSlugs: ["predictive-dialer-for-small-insurance-agencies", "why-leads-go-cold-before-you-call-back", "referral-programs-by-text-local-business"],
    relatedPages: [{ href: "/insurance-agents", label: "Insurance agent appointments" }],
  },
  {
    slug: "call-and-text-history-in-one-place",
    metaTitle: "Why Call and Text History Belong in One Place | Text2Sale",
    title: "Why call and text history belong in one place",
    description:
      "When calls live in one system and texts in another, every rep works with half the story. Here is what split histories cost and why a single timeline per lead matters.",
    excerpt: "Split call and text histories mean every conversation starts with half the story.",
    tags: ["Lead management", "Dialer", "Two-way texting"],
    intro: [
      "Imagine calling a lead to follow up on a quote, only to learn they texted your colleague yesterday to say they had already signed. Or texting a lead a cheerful check-in a few minutes after they told another rep on the phone that they were not interested. These moments are common when calls and texts are tracked in separate places.",
      "Every interaction with a lead is part of one conversation, even when it moves between channels. Your records should reflect that.",
    ],
    sections: [
      {
        heading: "The problem: two channels, two histories",
        paragraphs: [
          "Many teams use a texting tool for messages and a separate phone system or dialer for calls. Each keeps its own record. Notes may live in a third place. To understand where a lead stands, a rep has to check several systems, and under time pressure they often check none.",
          "The result is contacts that ignore what just happened, repeated questions, mixed messages and leads who feel like nobody is listening.",
        ],
      },
      {
        heading: "What split histories cost",
        bullets: [
          "Reps contact leads without knowing the latest interaction",
          "Leads repeat information they already gave",
          "Promises made on a call are forgotten in later texts",
          "Managers cannot see the full picture of what works",
          "Handoffs between reps lose context",
        ],
        paragraphs: [
          "Each of these chips away at trust. Together they make a business feel disorganized, which is costly in industries where clients are trusting you with their health, home or money.",
        ],
      },
      {
        heading: "The fix: one timeline per lead",
        paragraphs: [
          "Bring calls, texts, notes and appointments together into a single timeline for each lead. When a rep opens a lead, they should see everything in order: the form fill, the first text, the reply, the call with its disposition and notes, the appointment booked and the reminders sent.",
          "That timeline lets anyone on the team pick up the conversation correctly. It also makes it easy to choose the right next step: if the lead replied to a text but missed two calls, text again; if they had a great call but went quiet afterwards, a short text referring back to the call is the natural follow-up.",
          "Calling and texting from the same number matters too. When a lead receives texts and calls from one familiar number, they are more likely to answer and less likely to be confused about who is reaching out.",
        ],
      },
      {
        heading: "Better decisions from better data",
        paragraphs: [
          "A single timeline also improves management. You can see which combinations of texts and calls lead to appointments, how many touches deals usually need and where leads tend to stall. Those insights are invisible when history is split across tools.",
        ],
      },
      {
        heading: "Simple habits that keep the timeline useful",
        paragraphs: [
          "Tools only help if the team uses them consistently. Agree on two habits: always open the lead's timeline before contacting them, and always leave a one-line note and disposition after a call. Those small habits keep the history accurate and make every future conversation better.",
        ],
      },
      {
        heading: "What a complete lead record should show",
        paragraphs: [
          "When everything lives in one place, anyone who opens a lead record should be able to understand the relationship in under a minute. A good record shows the source and date the lead arrived, every text sent and received, every call with its outcome and any notes, upcoming appointments or callbacks, the current stage and who owns the lead.",
          "Use that list as a checklist for your current setup. Open five random leads and see how many of those items you can find without switching tools or asking a teammate. Every missing item is a gap where context gets lost, and every gap is a place where a lead can feel forgotten or receive a message that does not fit the conversation they already had.",
        ],
      },
      {
        heading: "How Text2Sale helps",
        paragraphs: [
          "In Text2Sale, texts, calls, dispositions, notes, callbacks and appointments all sit in the same lead record. Reps call and text from the same numbers, see the full history before the next contact and can hand a lead to a teammate with complete context. Managers see calling stats and texting results in one place.",
        ],
      },
    ],
    keyTakeaways: [
      "Calls and texts with a lead are one conversation.",
      "Split histories cause repeated questions and mixed messages.",
      "A single timeline lets anyone pick up where things left off.",
      "Calling and texting from one number builds recognition.",
    ],
    faq: [
      {
        question: "Can't reps just check both systems?",
        answer: "In theory. In practice, under time pressure, they often do not, and mistakes follow.",
      },
      {
        question: "Does a single timeline help with compliance?",
        answer: "It helps you see opt-outs and do-not-call requests regardless of channel, which reduces mistakes.",
      },
      {
        question: "What should a good call note include?",
        answer: "The outcome, anything the lead told you that matters and the agreed next step.",
      },
    ],
    relatedSlugs: ["dialing-crm-vs-separate-dialer", "text-then-call-dialer-sequence", "two-reps-texting-the-same-lead"],
    relatedPages: [{ href: "/sales-team-texting-crm", label: "Calling and texting for sales teams" }],
  },
  {
    slug: "too-much-data-entry-after-calls",
    metaTitle: "Too Much Data Entry After Calls? How to Cut Admin Time | Text2Sale",
    title: "Too much data entry after calls? How to cut admin time",
    description:
      "Logging calls, updating spreadsheets and setting reminders can eat a third of a rep's day. Here is how to cut after-call admin without losing the information you need.",
    excerpt: "After-call admin quietly eats selling time. Here is how to shrink it.",
    tags: ["Operations", "Dialer", "Automation"],
    intro: [
      "Ask sales reps what they dislike most about the job and many will say paperwork. After every call there is something to record: what happened, what was promised, when to follow up, what the lead needs. Multiply that by dozens of calls and admin can consume a big share of the day.",
      "The information matters. Without it, follow-up suffers and handoffs fail. The goal is not to skip it, but to capture it with as little effort as possible.",
    ],
    sections: [
      {
        heading: "The problem: manual logging in several places",
        paragraphs: [
          "On many teams, a rep finishes a call and then updates a spreadsheet, writes notes in a CRM, sets a reminder in their phone, books an appointment in a calendar and maybe sends a follow-up email. Each step lives in a different tool. Each takes a minute or two. Over a day, those minutes add up to hours.",
          "Because the work is tedious, it also gets skipped or rushed. Notes become vague, reminders are not set and the next contact suffers.",
        ],
      },
      {
        heading: "Where the time goes",
        bullets: [
          "Recording the outcome of each call",
          "Typing notes about the conversation",
          "Setting follow-up reminders or callbacks",
          "Booking appointments in a separate calendar",
          "Sending follow-up messages by hand",
          "Updating lead status in a spreadsheet",
        ],
        paragraphs: [
          "Most of these can be reduced to a click or happen automatically.",
        ],
      },
      {
        heading: "The fix: capture by default, type only what matters",
        paragraphs: [
          "Start by putting calling, texting and lead records in one system, so the call itself is logged automatically with time, duration and number. The rep should not have to record that a call happened.",
          "Use one-click dispositions for outcomes like interested, not interested, call back, appointment set and do not call. Dispositions are fast to choose, consistent across the team and easy to report on.",
          "Let dispositions trigger the next step. A call-back disposition can schedule the callback. An appointment disposition can book the time and send a confirmation text. A not-interested disposition can move the lead into a long-term sequence or close it.",
          "Keep notes short. One or two lines about what matters for the next conversation is usually enough: 'Wants lower deductible, wife decides, call Thursday after 6'.",
        ],
        bullets: [
          "Automatic call logging",
          "One-click dispositions",
          "Dispositions that trigger callbacks, appointments or sequences",
          "Short, focused notes",
          "Automatic confirmation and follow-up texts",
        ],
      },
      {
        heading: "The payoff",
        paragraphs: [
          "Cutting after-call work gives reps more time to talk to leads, which is the part of the job that produces revenue. It also improves the data, because one-click dispositions and automatic logging are more consistent than typed summaries. Managers get better reports and reps get better context for the next call.",
        ],
      },
      {
        heading: "Roll it out gradually",
        paragraphs: [
          "Agree as a team on a short list of dispositions that cover most outcomes. Too many choices slow reps down; five to eight usually works. Review notes in the first week to make sure they are useful, then let the habit settle.",
        ],
      },
      {
        heading: "Measure the time you are losing",
        paragraphs: [
          "For one day, have each rep note how long they spend on updates after every call: typing notes, changing statuses, scheduling callbacks and copying information between tools. Multiply the average by the number of calls they make in a week.",
          "Most teams find the total is several hours per rep, every week. That is time that could have gone to more conversations. Knowing the real number makes it easier to decide which steps to automate first, and it gives you a baseline to compare against once you have simplified the process with dispositions, templates and automatic logging.",
        ],
      },
      {
        heading: "How Text2Sale helps",
        paragraphs: [
          "Text2Sale logs every dialer call automatically and lets reps set an outcome, add a note, schedule a callback or book an appointment from the same screen. Confirmation and follow-up texts can go out automatically, and the call sits in the same lead history as every text. Reps spend less time on admin and more time in conversations.",
        ],
      },
    ],
    keyTakeaways: [
      "After-call admin can consume hours of a rep's day.",
      "Log calls automatically and use one-click dispositions.",
      "Let dispositions trigger callbacks, appointments and sequences.",
      "Keep notes short and focused on the next conversation.",
    ],
    faq: [
      {
        question: "Won't one-click dispositions lose detail?",
        answer: "They capture the outcome consistently. A short note alongside covers the details that matter.",
      },
      {
        question: "How many dispositions should we use?",
        answer: "Five to eight is a good range. Enough to be useful, few enough to choose quickly.",
      },
      {
        question: "Should notes be required on every call?",
        answer: "On every conversation, yes, briefly. Not on calls that did not connect.",
      },
    ],
    relatedSlugs: ["power-dialer-dispositions-workflow", "dialer-call-dispositions-that-drive-follow-up", "tagging-lead-outcomes-in-your-crm"],
    relatedPages: [{ href: "/pricing", label: "Text2Sale plans" }],
  },
  {
    slug: "lowering-cost-per-sale-on-paid-leads",
    metaTitle: "How to Lower Your Cost per Sale on Paid Leads | Text2Sale",
    title: "How to lower your cost per sale on paid leads",
    description:
      "Cost per lead is easy to see. Cost per sale is what decides profit. Here is how to bring cost per sale down without cutting lead spend.",
    excerpt: "Cost per lead is a vanity metric. Here is how to lower cost per sale.",
    tags: ["Lead generation", "Analytics", "Strategy"],
    intro: [
      "When paid leads feel too expensive, the instinct is to find cheaper leads. Sometimes that works. Often it just produces cheaper leads that convert even worse. The number that actually decides whether your lead spend is profitable is cost per sale: what you spend on leads divided by the sales they produce.",
      "You can lower cost per sale in two ways: pay less per lead or convert more of the leads you buy. The second is usually easier and more within your control.",
    ],
    sections: [
      {
        heading: "The problem: optimizing the wrong number",
        paragraphs: [
          "Cost per lead is visible on every invoice, so it gets attention. Conversion is spread across many small steps, so it gets ignored. A team might switch from twenty-five dollar leads to fifteen dollar leads and celebrate, only to find that cost per sale went up because the cheaper leads were harder to reach and less interested.",
        ],
      },
      {
        heading: "Know your funnel",
        paragraphs: [
          "Break your process into steps and measure each: leads purchased, leads contacted, conversations held, appointments booked, appointments held and sales closed. Calculate the rate from each step to the next. The step with the weakest rate is where improvement will have the biggest effect on cost per sale.",
        ],
        bullets: [
          "Contact rate: leads reached divided by leads purchased",
          "Appointment rate: appointments divided by conversations",
          "Show rate: appointments held divided by booked",
          "Close rate: sales divided by appointments held",
        ],
      },
      {
        heading: "The fixes, step by step",
        paragraphs: [
          "Raise contact rate with speed and persistence. An automatic first text within seconds and a structured sequence of texts and calls over two weeks reach many more leads than a single call attempt.",
          "Raise appointment rate by making booking easy. Offer specific times, let leads book by text and use AI to schedule when your team is busy.",
          "Raise show rate with confirmations and reminders, plus an easy way to reschedule.",
          "Raise close rate with good preparation and follow-up on quotes, using the history of each lead to tailor the conversation.",
          "Finally, recover value from leads that did not convert by putting them into long-term nurture and periodic reactivation campaigns. Every sale from an older lead lowers your overall cost per sale.",
        ],
      },
      {
        heading: "Then look at lead sources",
        paragraphs: [
          "Once your process is strong, compare cost per sale by lead source. Some vendors with higher prices produce cheaper sales; some bargain sources never pay off. Shift budget toward sources with the best cost per sale, not the lowest cost per lead.",
        ],
      },
      {
        heading: "A quick example",
        paragraphs: [
          "Suppose you buy 100 leads at 20 dollars each, reach 40, book 12 appointments, hold 8 and close 3 sales. Cost per sale is about 667 dollars. If faster response and better follow-up raise contact to 55 and everything else stays the same, you hold 11 appointments and close about 4 sales, dropping cost per sale to around 500 dollars without spending a cent more on leads.",
        ],
      },
      {
        heading: "Know your numbers by source",
        paragraphs: [
          "Cost per sale only becomes useful when you break it down by lead source. Track, for each vendor or campaign, the cost per lead, contact rate, appointment rate and close rate. Two sources with the same price per lead can produce very different costs per sale once those rates are applied.",
          "Review those numbers monthly. Move budget toward the sources that produce sales at a cost you are comfortable with, reduce spend on the ones that do not and test new sources in small batches before scaling them. Combined with faster response and consistent follow-up, that discipline steadily lowers what you pay for each new client.",
        ],
      },
      {
        heading: "How Text2Sale helps",
        paragraphs: [
          "Text2Sale improves the steps that drive cost per sale: instant first texts and follow-up sequences raise contact rate, AI replies and appointment booking raise appointment rate, automated reminders raise show rate and the dialer helps work more leads in less time. Tags by lead source let you compare results across vendors.",
        ],
      },
    ],
    keyTakeaways: [
      "Cost per sale, not cost per lead, decides profitability.",
      "Measure each funnel step to find the weakest link.",
      "Speed, follow-up, easy booking and reminders lower cost per sale.",
      "Compare lead sources by cost per sale after fixing your process.",
    ],
    faq: [
      {
        question: "Should I stop buying expensive leads?",
        answer: "Only if they produce a worse cost per sale than your alternatives after your process is strong.",
      },
      {
        question: "Which funnel step usually has the most room to improve?",
        answer: "Contact rate, for most teams, because response speed and follow-up are often weak.",
      },
      {
        question: "How often should I review cost per sale?",
        answer: "Monthly by lead source is a good rhythm for most small teams.",
      },
    ],
    relatedSlugs: ["cost-per-booked-insurance-appointment", "lead-source-attribution-utm-campaigns", "buying-leads-but-not-closing-deals"],
    relatedPages: [{ href: "/sms-crm-for-insurance-agents", label: "SMS CRM for insurance agents" }],
  },
  {
    slug: "owner-doing-all-the-follow-up",
    metaTitle: "When the Owner Does All the Follow-Up: How to Get Out of the Bottleneck | Text2Sale",
    title: "When the owner does all the follow-up: getting out of the bottleneck",
    description:
      "In many small businesses, every lead waits on the owner. Here is how to stop being the bottleneck without losing the personal touch that built the business.",
    excerpt: "If every lead waits on you, growth waits too. Here is how to step out of the way.",
    tags: ["Local business", "Automation", "Operations"],
    intro: [
      "In a lot of small businesses, the owner is the salesperson, the customer service desk and the follow-up department. Every new lead, question and quote runs through one person's phone. That works when the business is small. As it grows, the owner becomes the bottleneck, and leads wait for the one person who is always busy.",
      "Owners often hold on because they worry no one else will care as much or follow up as well. That concern is fair. The answer is not to step away entirely, but to build a system that carries the routine work so the owner can focus where they matter most.",
    ],
    sections: [
      {
        heading: "The problem: every lead depends on one person's attention",
        paragraphs: [
          "When the owner is on a job site, at an appointment or simply exhausted, follow-up stops. New leads wait, quotes go unanswered and reminders are never sent. The business can only grow as fast as the owner can respond, and the owner's evenings and weekends disappear into catching up.",
          "This also makes the business fragile. A week of illness or a family vacation can cause a noticeable drop in revenue.",
        ],
      },
      {
        heading: "Signs you are the bottleneck",
        bullets: [
          "Customers text your personal cell about business",
          "Leads wait until evening for a reply because you are busy all day",
          "Nobody else can answer questions about a lead's status",
          "Vacations mean lost business",
          "You spend evenings catching up on messages",
        ],
        paragraphs: [
          "If several of these sound familiar, the business has outgrown its follow-up system.",
        ],
      },
      {
        heading: "The fix: automate the routine, share the rest",
        paragraphs: [
          "Start with automation for the repetitive work. An automatic first text to every new lead, appointment confirmations and reminders, and follow-up sequences for quotes handle much of what used to depend on the owner remembering.",
          "Next, move conversations into a shared inbox so someone else can help. An office manager, part-time assistant or family member can answer simple questions, book appointments and keep conversations moving, while the owner handles the conversations that need their expertise.",
          "Then write down how you like things done. Your favorite first text, the way you answer common questions, your pricing guidelines and when you want to be pulled in. Those notes, plus message templates and AI instructions, let others follow up in your voice.",
        ],
        bullets: [
          "Automatic first texts and reminders",
          "Follow-up sequences for quotes",
          "A shared inbox someone else can work",
          "Templates and AI replies written in your voice",
          "Clear rules for when to involve the owner",
        ],
      },
      {
        heading: "Keep the personal touch where it counts",
        paragraphs: [
          "Customers chose your business partly because of you. Keep yourself involved in the moments that matter most: the first real conversation, the quote review, the close and the thank-you after the job. Let the system and your team handle scheduling, reminders and routine questions.",
        ],
      },
      {
        heading: "What changes",
        paragraphs: [
          "Leads get faster responses, even when you are busy. Your evenings and weekends come back. The business can take on more work without you working more hours. And when you take a vacation, the follow-up keeps happening.",
        ],
      },
      {
        heading: "Start delegating with the easiest tasks",
        paragraphs: [
          "Handing off follow-up does not have to happen all at once. Start with the most repetitive work: first replies to new leads, appointment reminders and check-ins with older leads. Those tasks follow a predictable pattern and can be handled by automation or a newer team member with good templates.",
          "Keep the high-value conversations, such as closing calls and complex questions, for yourself at first. As your system proves it is working, hand off more.",
        ],
      },
      {
        heading: "How Text2Sale helps",
        paragraphs: [
          "Text2Sale gives you a business number and shared inbox your team can work, automatic first texts and reminders, follow-up sequences and AI replies that answer questions and book appointments in your calendar. If you also take calls, the AI receptionist can answer when you are on a job. You stay involved through the inbox and step in when a conversation needs you.",
        ],
      },
    ],
    keyTakeaways: [
      "An owner who handles all follow-up caps the business's growth.",
      "Automate first texts, reminders and quote follow-ups.",
      "A shared inbox lets others help without losing context.",
      "Keep yourself involved in the moments that matter most.",
    ],
    faq: [
      {
        question: "Will customers notice I am not answering every message?",
        answer: "They will notice faster replies. As long as the tone stays personal, most will not mind who sent it.",
      },
      {
        question: "Who should handle the shared inbox?",
        answer: "An office manager, part-time assistant or another team member who knows the business basics.",
      },
      {
        question: "Can AI replies sound like me?",
        answer: "If you give them clear instructions and examples of how you write, they can stay close to your tone.",
      },
    ],
    relatedSlugs: ["using-your-personal-cell-for-business-texts", "writing-instructions-for-an-ai-appointment-setter", "leads-arriving-while-you-are-with-a-client"],
    relatedPages: [{ href: "/roofing", label: "Roofing appointments" }],
  },
];

export const BLOG_POSTS_15: BlogPost[] = ARTICLES.map((article) => {
  const text = [article.title, ...article.intro,
    ...article.sections.flatMap((section) => [section.heading, ...section.paragraphs, ...(section.bullets || [])]),
    ...article.keyTakeaways, ...article.faq.flatMap((item) => [item.question, item.answer])].join(" ");
  return { ...article, datePublished: "2026-10-24", dateModified: "2026-10-24",
    readMinutes: Math.max(1, Math.ceil(text.split(/\s+/).length / 200)) };
});
