import type { BlogPost } from "./blog-posts";

type NewArticle = Omit<BlogPost, "datePublished" | "dateModified" | "readMinutes">;

// Volume 13: problems and fixes, part one. Each article names a problem
// sales teams and local businesses run into with leads and follow-up, explains
// why it happens and what it costs, and walks through the fix.
const ARTICLES: NewArticle[] = [
  {
    slug: "why-leads-go-cold-before-you-call-back",
    metaTitle: "Why Your Leads Go Cold Before You Call Back (and How to Fix It) | Text2Sale",
    title: "Why your leads go cold before you call back, and how to fix it",
    description:
      "Most leads are not lost to a competitor's better price. They are lost in the gap between the form fill and your first reply. Here is why that gap opens and how to close it.",
    excerpt:
      "The gap between a form fill and your first reply is where most leads die. Here is how to close it.",
    tags: ["Speed to lead", "Lead management", "SMS follow-up"],
    intro: [
      "Ask a room of agents, loan officers or contractors why they lose deals and you will hear about price, timing and competition. Ask them how long it took to reach the leads they lost and the room usually gets quiet. For most small sales teams the biggest leak in the pipeline is not the pitch. It is the hours, sometimes days, between the moment someone asks for help and the moment a person actually reaches them.",
      "A lead is never warmer than the minute they submit a form. They are thinking about the problem, they have their phone in their hand and they are open to a conversation. Every hour after that, the problem slides down their list, other companies reach them first and your message turns from welcome to unfamiliar. This article covers why that delay happens and the practical steps that shrink it to almost nothing.",
    ],
    sections: [
      {
        heading: "The problem: a slow first touch",
        paragraphs: [
          "When a new lead arrives, most teams rely on a person noticing it. Someone has to check an email notification, open the lead portal, copy the number and dial. If that person is on another call, driving to an appointment, at lunch or asleep, the lead waits. On a busy day a lead that came in at 10 a.m. can easily sit until mid-afternoon, and a lead from Saturday night might not hear anything until Monday.",
          "Meanwhile, the person who filled out the form has often filled out two or three others. Shared leads in insurance, mortgage, solar and home services are sold to several buyers at once, and even exclusive leads are usually comparing options. The first business to respond sets the frame for the whole conversation. The fourth one to call is just another number to ignore.",
        ],
      },
      {
        heading: "Why it happens",
        paragraphs: [
          "Slow response is rarely laziness. It is a process problem. Leads arrive at random times, but people work in blocks. Notifications land in an inbox that is already full. The person who owns follow-up is also the person who closes deals, answers existing customers and handles paperwork. Nothing in the workflow forces the first touch to happen right away, so it happens whenever there is a gap.",
          "Teams also tend to treat the first contact as a big event that needs a phone call and a prepared pitch. That raises the bar. If the first touch requires twenty free minutes, it gets pushed until twenty free minutes appear, and on a full calendar that might be tomorrow.",
        ],
      },
      {
        heading: "What it costs you",
        paragraphs: [
          "The cost shows up as a contact rate that keeps sliding. Leads that would have answered in the first few minutes stop picking up by the afternoon, and voicemail becomes the default outcome. If you buy leads, that slide is money spent on people you never actually spoke to. If your leads come from your own ads, it is marketing budget that produced interest you did not convert.",
          "There is a quieter cost too. When reps keep calling leads that have gone cold, they get discouraged, start cherry-picking and skip the harder follow-ups. A slow first touch drags down the whole team's energy, not just the conversion rate on that one lead.",
        ],
      },
      {
        heading: "The fix: automate the first touch, then call the people who reply",
        paragraphs: [
          "The first contact does not need to be a phone call, and it does not need to wait for a free person. A short, friendly text sent automatically the moment a lead arrives keeps you first in line while a human catches up. Something like 'Hi Dana, this is Sarah with Johnson Health Quotes. I got your request about coverage for your family. Is now a good time for a quick call, or is later today better?' reads like a real person and invites a one-word reply.",
          "Once the lead replies, the conversation has started and the pressure to call immediately drops. You can call when the lead says it is a good time, or keep the conversation going by text. The leads who do not reply move into a short follow-up sequence over the next few days, so nobody is forgotten.",
        ],
        bullets: [
          "Send the first text automatically within seconds of the lead arriving",
          "Keep it short, personal and easy to answer",
          "Call the leads who reply first, while they are engaged",
          "Put non-responders on a spaced follow-up sequence",
          "Measure time to first touch weekly and keep it under five minutes",
        ],
      },
      {
        heading: "How Text2Sale helps",
        paragraphs: [
          "Text2Sale connects to your lead sources and CSV uploads and can send that first message the moment a lead lands, day or night. Replies come into a shared inbox your whole team can see, and AI replies can answer simple questions or offer appointment times when nobody is free. When you are ready to call, the built-in power and predictive dialer works the replied and warm leads first, so the phone time goes to people who are actually interested.",
        ],
      },
      {
        heading: "Getting started this week",
        paragraphs: [
          "Pick your single biggest lead source and write one first-touch text for it. Turn on the automatic send, then compare your contact rate for the next two weeks against the two weeks before. Most teams see the difference within days, and once you trust it you can roll the same approach out to every source you have.",
        ],
      },
    ],
    keyTakeaways: [
      "Leads are warmest in the first minutes after they ask for help.",
      "Slow response is a process problem, not a people problem.",
      "An automatic first text keeps you first in line while a person catches up.",
      "Call the leads who reply first, and sequence the rest.",
    ],
    faq: [
      {
        question: "Does an automated first text feel impersonal?",
        answer:
          "Not if it is short and specific. A text that uses the lead's name, mentions what they asked about and asks a simple question reads like a person, because it says what a person would say.",
      },
      {
        question: "Should I still call new leads right away?",
        answer:
          "If you can, yes. The automatic text is a safety net for the times you cannot, which for most teams is most of the time.",
      },
      {
        question: "What is a good target for time to first touch?",
        answer: "Under five minutes for every lead, including nights and weekends, is a realistic goal once the first text is automated.",
      },
    ],
    relatedSlugs: ["how-fast-to-text-insurance-leads", "first-text-to-a-new-lead-examples", "audit-speed-to-lead-sales-team"],
    relatedPages: [{ href: "/sms-follow-up-for-sales-teams", label: "SMS follow-up for sales teams" }],
  },
  {
    slug: "ending-phone-tag-with-leads",
    metaTitle: "How to End Phone Tag With Leads for Good | Text2Sale",
    title: "How to end phone tag with leads for good",
    description:
      "Phone tag wastes days of selling time and loses leads who give up waiting. Here is why it keeps happening and a simple text-first process that ends it.",
    excerpt: "Phone tag costs days of selling time. A text-first process ends it.",
    tags: ["SMS follow-up", "Appointments", "Sales teams"],
    intro: [
      "You call, they miss it. They call back, you are on another line. You leave a voicemail, they text a number that goes nowhere. Three days later you finally talk, and by then they have already spoken with someone else. Phone tag is so common in sales that most people accept it as part of the job. It does not have to be.",
      "Phone tag is a scheduling problem dressed up as a communication problem. Two busy people are trying to be free at the same moment without agreeing on when that moment is. Once you see it that way, the fix is straightforward: stop guessing when the other person is free and ask them.",
    ],
    sections: [
      {
        heading: "The problem: two people, two schedules, no overlap",
        paragraphs: [
          "Every unplanned call is a guess. You call when you are free, which has nothing to do with when the lead is free. If they are at work, driving or with their kids, the call goes to voicemail. When they call back on their own schedule, you are likely busy with someone else. Each round trip can take hours, and each one makes the lead a little less patient.",
          "Voicemail makes it worse. Many people never listen to voicemails from unknown numbers, and those who do often cannot call back at a convenient time. A voicemail that says 'call me back at your convenience' hands the scheduling problem straight back to them.",
        ],
      },
      {
        heading: "Why it keeps happening",
        paragraphs: [
          "Most sales processes are built around outbound calls because that is how the work used to be done. Reps are measured on dials, so they dial. There is no step where the rep and the lead agree on a time, so every attempt is another guess. And when the lead does call back, the call often lands on a personal cell or a main line where nobody knows the context.",
        ],
      },
      {
        heading: "What it costs you",
        paragraphs: [
          "Phone tag stretches a five-minute conversation across several days. In that time leads cool off, shop around or simply forget why they reached out. For your team, every missed round is a dial, a voicemail and a mental note to try again, which adds up to hours each week spent on calls that never connect. For a small team that time is the difference between working all of your leads and working only some of them.",
        ],
      },
      {
        heading: "The fix: text to agree on a time, then call at that time",
        paragraphs: [
          "Replace the guessing with a short text that offers two specific times. 'Hi Marcus, it is Jordan with Summit Roofing. I have your inspection request. Would 4:15 today or 10:30 tomorrow work for a quick call?' Most people can answer that in a few seconds, wherever they are. Once they pick a time, you call at that time and they pick up because they are expecting you.",
          "When a call does go unanswered, follow it with a text instead of relying on voicemail alone. 'Sorry I missed you, Marcus. When is a better time today?' keeps the thread alive in a channel they actually read. If the lead calls back while you are busy, an automatic text acknowledging the call and offering a callback time stops the cycle before it starts.",
        ],
        bullets: [
          "Offer two specific times instead of asking when they are free",
          "Send a text after every missed call",
          "Confirm the agreed time with a reminder a few minutes before",
          "Log the callback time so nobody forgets it",
        ],
      },
      {
        heading: "How Text2Sale helps",
        paragraphs: [
          "Text2Sale keeps calls and texts with each lead in one conversation, so you can see what was said and when. You can schedule a callback for a specific time from the dialer, and the lead comes back to the top of your queue when that time arrives, from the same number they already know. AI replies can offer appointment times and book them straight into your calendar when you are tied up, and automatic reminders make sure the lead is ready when you call.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "For one week, try a simple rule: no call without either a reply or an agreed time. Send a text first, call when they answer or at the time they choose, and text after every miss. Track how many conversations you have compared with the week before. The number of dials will usually drop while the number of real conversations goes up, which is the whole point.",
        ],
      },
    ],
    keyTakeaways: [
      "Phone tag is a scheduling problem, not a communication problem.",
      "Offering two specific times gets a fast answer.",
      "Text after every missed call instead of relying on voicemail.",
      "Scheduled callbacks connect far more often than cold redials.",
    ],
    faq: [
      {
        question: "What if the lead never answers the scheduling text?",
        answer:
          "Put them on a short follow-up sequence and try one call at a different time of day. Some people simply are not ready yet, and a spaced sequence keeps you in touch without pestering them.",
      },
      {
        question: "Is it better to text or leave a voicemail?",
        answer: "Do both if you like, but never rely on voicemail alone. A text is read far more often and is easier to answer.",
      },
      {
        question: "Can I let leads book their own time?",
        answer:
          "Yes. Offering times by text and letting AI or a booking link confirm the slot removes the back-and-forth entirely.",
      },
    ],
    relatedSlugs: ["voicemail-vs-text-follow-up", "how-to-book-appointments-by-text", "lead-says-call-me-later-text-reply"],
    relatedPages: [{ href: "/sales-team-texting-crm", label: "Calling and texting for sales teams" }],
  },
  {
    slug: "sales-appointment-no-shows-causes-and-fixes",
    metaTitle: "Sales Appointment No-Shows: Causes and Fixes | Text2Sale",
    title: "Sales appointment no-shows: what causes them and how to fix them",
    description:
      "No-shows waste prepared time and stall your pipeline. Here are the real reasons people miss sales appointments and the reminder and confirmation process that cuts them.",
    excerpt: "Why people miss sales appointments, and the reminder process that cuts no-shows.",
    tags: ["Appointments", "Retention", "Automation"],
    intro: [
      "Few things deflate a salesperson faster than prepping for an appointment, blocking the time and then staring at a phone that never rings or a doorstep with nobody home. One no-show is annoying. A steady rate of them quietly removes a big slice of your selling week.",
      "The good news is that most no-shows are not people deciding to blow you off. They are people who forgot, got busy or were never quite sure the appointment was real. Those causes are fixable with a simple, consistent process.",
    ],
    sections: [
      {
        heading: "The problem: booked is not the same as committed",
        paragraphs: [
          "An appointment set on a call three days ago lives in your calendar, not theirs. Many people agree to a time just to end a call politely, never write it down and are surprised when you show up. Others meant to attend but had something come up and did not know how to reschedule, so they simply did not answer.",
          "The longer the gap between booking and the appointment, the worse this gets. A meeting set for later today usually happens. A meeting set for next week competes with everything else in that person's life.",
        ],
      },
      {
        heading: "Why no-shows happen",
        bullets: [
          "The lead never put the appointment in their own calendar",
          "Nobody reminded them, or the reminder went to an email they do not check",
          "Rescheduling felt awkward, so they avoided it",
          "The value of the appointment was never made clear",
          "Too much time passed between booking and the meeting",
        ],
        paragraphs: [
          "Notice that most of these are about communication after the booking, not the booking itself. Teams put effort into getting the yes and almost none into protecting it.",
        ],
      },
      {
        heading: "What no-shows cost",
        paragraphs: [
          "Each no-show burns the prep time, the travel or blocked calendar slot and the follow-up needed to rebook. It also distorts your forecasting, because a calendar full of appointments looks like a healthy pipeline until half of them do not happen. For field sales like roofing, solar and home services, a missed in-home appointment can cost hours of drive time on top of the lost opportunity.",
        ],
      },
      {
        heading: "The fix: confirm, remind, and make rescheduling easy",
        paragraphs: [
          "Start with a confirmation text right after booking that restates the day, time and what will happen. Ask for a quick reply to confirm. That reply is a small commitment, and small commitments make people more likely to show up.",
          "Then send a reminder the day before and another an hour or two before. Keep reminders short and include an easy way to reschedule: 'Hi Lisa, just a reminder about your 2:00 call with Mike tomorrow to go over your quote. Reply C to confirm or R to pick another time.' Making rescheduling easy sounds like it would increase cancellations, but in practice it turns silent no-shows into rescheduled appointments.",
          "Finally, if someone does miss, follow up the same day with a friendly text offering new times. Many no-shows rebook happily when you make it easy and skip the guilt trip.",
        ],
        bullets: [
          "Confirmation text right after booking, asking for a reply",
          "Reminder the day before",
          "Reminder one to two hours before",
          "One-tap or one-word option to reschedule",
          "Same-day follow-up for anyone who misses",
        ],
      },
      {
        heading: "How Text2Sale helps",
        paragraphs: [
          "Text2Sale can book appointments from a text conversation or a call and sync them to your Google Calendar. Automatic reminders go out on the schedule you set, replies land in your shared inbox, and AI replies can handle simple reschedule requests by offering new times. Because the whole conversation history is in one place, whoever picks up the follow-up knows exactly what was promised.",
        ],
      },
      {
        heading: "Measure it",
        paragraphs: [
          "Track show rate for a month before and after you add confirmations and reminders. Look at it by lead source and by how far in advance the appointment was booked. You will likely find that same-day and next-day appointments show at a much higher rate, which is a good reason to offer the soonest available time first.",
        ],
      },
    ],
    keyTakeaways: [
      "Most no-shows are forgetfulness or awkwardness, not rejection.",
      "Ask for a confirmation reply right after booking.",
      "Remind the day before and shortly before the appointment.",
      "Easy rescheduling turns silent no-shows into new appointments.",
    ],
    faq: [
      {
        question: "How many reminders is too many?",
        answer: "Two reminders plus the initial confirmation is a good default. More than that starts to feel like nagging.",
      },
      {
        question: "Should reminders be texts or emails?",
        answer: "Texts are read much more reliably and faster. Email can be a backup, but texts should lead.",
      },
      {
        question: "What should I say to someone who no-showed?",
        answer:
          "Keep it light and offer new times: 'Looks like today got busy. No problem, would Thursday at 11 or Friday at 3 work better?'",
      },
    ],
    relatedSlugs: ["appointment-reminder-text-templates", "solar-appointment-no-show-texts", "google-calendar-sync-for-appointments"],
    relatedPages: [{ href: "/insurance-agents", label: "Insurance agent appointments" }],
  },
  {
    slug: "agents-spend-more-time-dialing-than-talking",
    metaTitle: "When Agents Spend More Time Dialing Than Talking | Text2Sale",
    title: "When your agents spend more time dialing than talking",
    description:
      "Manual dialing eats most of a sales rep's phone time in ringing, voicemail and dead numbers. Here is how to tell if it is happening on your team and how a dialer fixes it.",
    excerpt: "If most of the phone day is ringing and voicemail, here is the fix.",
    tags: ["Dialer", "Predictive dialer", "Sales teams"],
    intro: [
      "Watch a rep work a call list by hand for an hour and count how many minutes they actually spend talking to a person. For most teams the number is surprisingly small. The rest of the hour goes to finding the next lead, dialing, listening to rings, leaving voicemails and hanging up on disconnected numbers.",
      "That is not a work ethic problem. It is the math of outbound calling. Most calls do not connect, and every one that does not connect still takes time. If your team feels busy all day but has few real conversations to show for it, this is probably why.",
    ],
    sections: [
      {
        heading: "The problem: most dials do not reach anyone",
        paragraphs: [
          "On a typical list, the majority of calls end in no answer, voicemail, a busy signal or a bad number. Each of those still costs twenty to forty seconds of ringing plus the time to log the result and pull up the next lead. Multiply that across a hundred dials and you have an hour or more of phone time with nothing to show for it.",
          "The cost compounds because talking is the only part that produces sales. A rep who spends seventy percent of their phone time waiting is operating at a fraction of their potential, no matter how good they are on the phone.",
        ],
      },
      {
        heading: "How to tell if this is happening on your team",
        bullets: [
          "Reps report a high number of dials but few conversations",
          "Talk time is a small share of total logged phone time",
          "Lists are only partly worked before leads go stale",
          "Reps cherry-pick leads they think will answer",
          "Afternoons drag because the list feels endless",
        ],
        paragraphs: [
          "If two or three of these sound familiar, the bottleneck is not your people or your leads. It is the way the calls are placed.",
        ],
      },
      {
        heading: "The fix: let software do the dialing",
        paragraphs: [
          "A power dialer calls the next lead automatically as soon as the rep finishes the last one, removing the lookup and dialing steps. A predictive dialer goes further by calling several leads at once and connecting the rep only when a person answers, skipping the ringing, voicemails and dead numbers entirely.",
          "The result is that reps spend most of their phone time in conversations rather than waiting for them. Teams that switch commonly see their conversations per hour multiply, which lets a small team work a list in a day that would otherwise take a week.",
          "The right setup depends on your leads. Fresh, high-value leads may deserve a power dialer so the rep never risks a delay. Larger lists of aged or lower-intent leads are where a predictive dialer earns its keep.",
        ],
      },
      {
        heading: "Doing it without hurting the lead experience",
        paragraphs: [
          "Predictive dialing works best when it is paced sensibly. Dialing too many lines at once can leave people answering to silence, which hurts your reputation and can break calling rules. Start with one or two lines per rep, watch how often a person answers when nobody is free, and only increase when the numbers support it. Make sure the rep hears a cue and sees the lead's details the instant a call connects, so the first words come without a pause.",
        ],
      },
      {
        heading: "How Text2Sale helps",
        paragraphs: [
          "Text2Sale includes manual, power and predictive dialing up to three lines, built into the same system as your texting. Reps hear a short beep when a person answers and see the lead's name and notes immediately. Dispositions, notes, callbacks and transfers are a click away, and every call sits next to the text history for that lead. You can work only the leads that replied to a text first, then move to the rest of the list.",
        ],
      },
      {
        heading: "Start with a simple measurement",
        paragraphs: [
          "Before changing anything, measure conversations per hour for a week. Then run the same list type through a dialer for a week and compare. Talk time and conversations per hour are the numbers that matter, far more than total dials.",
        ],
      },
    ],
    keyTakeaways: [
      "Most manual dials end without a conversation.",
      "Talk time, not dials, is the number that drives sales.",
      "Power dialers remove lookup time; predictive dialers skip unanswered calls.",
      "Pace predictive dialing carefully to protect the lead experience.",
    ],
    faq: [
      {
        question: "Is a predictive dialer right for a small team?",
        answer:
          "Often, yes. Even one or two reps benefit, as long as the dialer is paced to the team size. Start with fewer lines and increase gradually.",
      },
      {
        question: "Will leads know they were called by a dialer?",
        answer:
          "Not if the rep speaks right away. The pause before speaking is what gives dialers away, which is why an instant cue and visible lead details matter.",
      },
      {
        question: "Should I still text leads if I use a dialer?",
        answer: "Yes. Texting first and calling the people who reply gives you warmer conversations and better use of dialer time.",
      },
    ],
    relatedSlugs: ["what-is-a-predictive-dialer", "dialer-vs-manual-dialing-productivity", "predictive-vs-power-vs-preview-dialer"],
    relatedPages: [{ href: "/pricing", label: "Text2Sale Dialer and Complete plans" }],
  },
  {
    slug: "leads-lost-in-spreadsheets-and-sticky-notes",
    metaTitle: "Leads Lost in Spreadsheets and Sticky Notes? Here's the Fix | Text2Sale",
    title: "Leads lost in spreadsheets and sticky notes, and how to stop it",
    description:
      "If your follow-up lives in spreadsheets, notebooks and memory, leads slip through without anyone noticing. Here is what that costs and how to move to a system that cannot forget.",
    excerpt: "Spreadsheets cannot remind you to follow up. Here is what to use instead.",
    tags: ["Lead management", "Getting started", "Operations"],
    intro: [
      "Plenty of profitable small businesses run their leads out of a spreadsheet, a notebook and a stack of sticky notes. It works, more or less, when the volume is low and one person handles everything. As soon as leads pick up or a second person joins, the cracks start to show.",
      "The trouble with these systems is not that they are messy. It is that they are passive. A spreadsheet will hold a phone number forever without ever telling you it is time to call. Follow-up only happens when someone remembers to look.",
    ],
    sections: [
      {
        heading: "The problem: passive tools for an active job",
        paragraphs: [
          "Follow-up is a timing job. The right message needs to go out at the right moment: right after the lead arrives, two days later, a week after the quote, the day before the appointment. A spreadsheet has no sense of time. It cannot send anything, remind anyone or notice that a row has not been touched in ten days.",
          "So the system depends entirely on memory and discipline. On a calm week that might be fine. On a busy week, the leads that need a second or third touch quietly fall off the list, and nobody notices because there is no list of what did not happen.",
        ],
      },
      {
        heading: "Signs your leads are slipping through",
        bullets: [
          "You find old leads you meant to call and never did",
          "Two people contacted the same lead, or nobody did",
          "Notes about a conversation live in someone's head or phone",
          "You cannot easily say how many leads are waiting for a reply",
          "Follow-up stops after the first or second attempt",
        ],
        paragraphs: [
          "Every one of these is a lead you paid for, in money or effort, that never got a fair chance.",
        ],
      },
      {
        heading: "What it costs",
        paragraphs: [
          "Many deals close after several touches, not one. When follow-up depends on memory, the later touches are the first to go, which means the leads that needed a little more patience are exactly the ones you lose. There is also the time cost of hunting for information, re-asking leads questions they already answered and untangling who said what.",
        ],
      },
      {
        heading: "The fix: a system that acts on time for you",
        paragraphs: [
          "Moving to a CRM built for follow-up changes the job from remembering to reviewing. Leads come in automatically, the first message goes out on its own, follow-up sequences send the next touches on schedule and replies land in a single inbox. Your job becomes handling the conversations that need a person, not tracking every lead by hand.",
          "The move does not need to be a big project. Export your spreadsheet as a CSV, map the columns to fields like name, phone and lead source, and import it. Tag leads by where they came from and where they are in the process, then set up one follow-up sequence for new leads and one for older leads. That alone puts every row back into motion.",
        ],
        bullets: [
          "Export your current spreadsheet to CSV",
          "Import it and map the columns to CRM fields",
          "Tag leads by source and stage",
          "Create one sequence for new leads and one for older leads",
          "Review the shared inbox daily instead of the spreadsheet",
        ],
      },
      {
        heading: "How Text2Sale helps",
        paragraphs: [
          "Text2Sale takes CSV uploads with field mapping and saved lists, then lets you put those leads straight into texting campaigns, follow-up sequences or the dialer. Every call, text, note and appointment for a lead lives in one record your team can see. Uploading a CSV is free; you only pay for the texts and minutes you actually use.",
        ],
      },
      {
        heading: "Keep it simple",
        paragraphs: [
          "The goal is not to build a perfect system on day one. It is to make sure no lead depends on someone's memory. Start with import, one sequence and a daily look at the inbox. Add more as you learn what your leads respond to.",
        ],
      },
    ],
    keyTakeaways: [
      "Spreadsheets store leads but never prompt follow-up.",
      "Later follow-ups are the first to be forgotten.",
      "A CRM turns follow-up from remembering into reviewing.",
      "Import, tag and add one sequence to get every lead moving again.",
    ],
    faq: [
      {
        question: "Will I lose my existing notes when I import?",
        answer: "Not if you include them as a column. Map your notes column to a notes field during import and they come along.",
      },
      {
        question: "How long does it take to switch?",
        answer: "For most small teams, importing a spreadsheet and setting up a first sequence takes an afternoon.",
      },
      {
        question: "Do I need a CRM if I only get a few leads a week?",
        answer:
          "If every lead matters, yes. Low volume makes each forgotten follow-up more expensive, not less.",
      },
    ],
    relatedSlugs: ["csv-lead-import-to-text-campaign", "multi-step-sms-follow-up-campaign", "tagging-lead-outcomes-in-your-crm"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Mass texting CRM" }],
  },
  {
    slug: "two-reps-texting-the-same-lead",
    metaTitle: "Two Reps Texting the Same Lead? How to Fix Team Overlap | Text2Sale",
    title: "Two reps texting the same lead: how to fix team overlap",
    description:
      "When two people on your team contact the same lead, it confuses the customer and wastes effort. Here is why it happens and how a shared inbox and clear ownership prevent it.",
    excerpt: "Duplicate outreach confuses leads. A shared inbox and clear ownership fix it.",
    tags: ["Sales teams", "Two-way texting", "Lead management"],
    intro: [
      "A lead gets a text from one rep, a call from another and an email from a third, each introducing themselves as if they are the first. To the lead it looks disorganized. To your team it is wasted effort and, sometimes, a fight over who gets credit.",
      "Team overlap happens to almost every growing sales team. The fix is not more rules on a whiteboard. It is making ownership and conversation history visible to everyone, in real time.",
    ],
    sections: [
      {
        heading: "The problem: nobody can see what anyone else did",
        paragraphs: [
          "When each rep texts from their own phone and keeps their own notes, the team has no shared view of who has spoken to whom. A lead who replied to one rep last night might get a cold introduction from another this morning. A lead one rep promised to call at 3 p.m. might get called at noon by someone else.",
          "Overlap gets worse during busy periods, when leads are flowing in faster than anyone can sort them and everyone is trying to help.",
        ],
      },
      {
        heading: "Why it happens",
        bullets: [
          "Reps text and call from personal phones",
          "Leads are not assigned, or assignment is unclear",
          "Conversation history lives in separate places",
          "Lists are shared without any lock on who is working them",
        ],
        paragraphs: [
          "Each of these comes down to the same root cause: there is no single source of truth for each lead.",
        ],
      },
      {
        heading: "What it costs",
        paragraphs: [
          "The customer cost is trust. Being contacted by several people who do not know about each other makes a business look careless, and careless is not a word people associate with someone they want to handle their insurance, mortgage or roof. The internal cost is duplicated effort and friction between reps, plus leads that fall through because everyone assumed someone else had them.",
        ],
      },
      {
        heading: "The fix: one inbox, one history, clear ownership",
        paragraphs: [
          "Move all lead texting and calling into one shared system so every conversation is visible to the team. When a rep opens a lead, they should see every text and call that has already happened, who made it and what was promised.",
          "Then make ownership explicit. Assign each lead to a rep, either automatically by rotation or by rules like lead source or territory. Others can still see and help, but the owner is responsible. When a rep hands a lead to a teammate, the handoff should carry the full history so the lead never has to repeat themselves.",
        ],
        bullets: [
          "Text and call from one shared system, not personal phones",
          "Assign every lead an owner",
          "Show full conversation history to anyone who opens the lead",
          "Hand off leads with context, not just a name and number",
        ],
      },
      {
        heading: "How Text2Sale helps",
        paragraphs: [
          "Text2Sale gives your team one inbox where every text conversation is visible, with calls, notes and appointments in the same lead record. On the dialer, a rep can send a live call to a teammate when someone else is better placed to help, and inbound calls can roll over to an available teammate when the owner is busy. Because the history travels with the lead, whoever picks up knows exactly where things stand.",
        ],
      },
      {
        heading: "Handoffs that do not drop the ball",
        paragraphs: [
          "Overlap is one failure; the opposite failure is a lead that falls between two people during a handoff. A rep goes on vacation, a lead is reassigned to a specialist or a call needs a licensed colleague. If the handoff is just a name and a number, the lead has to explain everything again and often loses patience.",
          "A good handoff includes three things: the conversation history, a one-line summary of where things stand and the next step that was promised. When those travel with the lead, the new owner can open with 'I see you were talking with Jess about adding your daughter to the policy' instead of 'How can I help you?', and the lead feels taken care of rather than passed around.",
          "It also helps to tell the lead about the handoff. A quick text such as 'Hi Carla, Jess asked me to help with the rest of your quote, I have all the details she gathered' prevents the confusion of an unexpected new name.",
        ],
      },
      {
        heading: "A quick team agreement",
        paragraphs: [
          "Alongside the tools, agree on two simple habits: check the lead's history before every contact, and leave a one-line note after every conversation. Those two habits, backed by a shared inbox, prevent almost all overlap.",
        ],
      },
    ],
    keyTakeaways: [
      "Overlap comes from having no single source of truth per lead.",
      "Duplicate outreach makes your business look disorganized.",
      "A shared inbox and history let everyone see what has happened.",
      "Clear ownership and contextual handoffs prevent dropped leads.",
    ],
    faq: [
      {
        question: "Should reps ever text from their personal phones?",
        answer:
          "It is best to avoid it. Personal phones hide conversations from the team and leave you without a record if the rep leaves.",
      },
      {
        question: "How should leads be assigned?",
        answer:
          "Round robin works well for evenly skilled teams. Rules by source, product or territory suit teams with specialists.",
      },
      {
        question: "What if two reps both want the same lead?",
        answer: "Ownership settles it. Decide the rule in advance and let the system apply it, so it is never personal.",
      },
    ],
    relatedSlugs: ["lead-distribution-for-sales-teams", "sharing-dialer-calls-across-a-team", "weekly-texting-review-meeting"],
    relatedPages: [{ href: "/sales-team-texting-crm", label: "Calling and texting for sales teams" }],
  },
  {
    slug: "using-your-personal-cell-for-business-texts",
    metaTitle: "The Problem With Using Your Personal Cell for Business Texts | Text2Sale",
    title: "The problem with using your personal cell for business texts",
    description:
      "Texting customers from your personal phone feels easy, but it mixes your life with your business, hides conversations from your team and leaves you without records. Here is a better setup.",
    excerpt: "Personal-phone texting is easy until it isn't. Here is a better setup.",
    tags: ["Two-way texting", "Operations", "Local business"],
    intro: [
      "Almost every small business starts by texting customers from the owner's personal cell. It is free, it is already in your pocket and customers like it. For a while it works. Then the business grows, a second person joins or a customer texts at 11 p.m. about something urgent, and the downsides arrive all at once.",
      "This article covers the problems that come with personal-phone texting and how to move to a business setup without losing the personal feel customers liked in the first place.",
    ],
    sections: [
      {
        heading: "The problem: your business lives in your pocket",
        paragraphs: [
          "When customer conversations live on a personal phone, they are mixed in with family group chats, friends and spam. Important messages get buried. There is no way for anyone else to see or answer them, so the owner becomes a bottleneck for every customer question.",
          "If the phone is lost, upgraded or broken, the history can disappear. If an employee who has been texting customers from their own phone leaves, those relationships and conversations leave with them.",
        ],
      },
      {
        heading: "Specific risks",
        bullets: [
          "No shared visibility, so nobody can cover for you",
          "No reliable record of what was promised to whom",
          "Customers have your personal number forever",
          "No way to send reminders or follow-ups automatically",
          "Bulk texting from a personal phone can get the number blocked",
        ],
        paragraphs: [
          "That last point surprises people. Carriers watch for personal numbers sending business-style messages to many recipients, and they can filter or block them.",
        ],
      },
      {
        heading: "What it costs",
        paragraphs: [
          "The biggest cost is that the business cannot scale past one person's attention. Every unanswered text is a customer waiting on you specifically. Vacations become stressful, evenings are interrupted and growth is capped by how many conversations one phone can handle.",
        ],
      },
      {
        heading: "The fix: a dedicated business number with a shared inbox",
        paragraphs: [
          "Move customer texting to a dedicated local business number that your whole team can work from a shared inbox on the web or phone. Customers still get a real person and a local number, but conversations are visible to the team, saved in one place and separate from your personal life.",
          "Once texting runs through a proper system you can also automate the repetitive parts: appointment reminders, follow-ups after quotes and responses to common questions. That frees the owner from being the only person who can keep things moving.",
          "When switching, let existing customers know your new business number with a friendly text from your personal phone, and update your website, signage and business listings. Most customers save the new number without a second thought.",
        ],
      },
      {
        heading: "How Text2Sale helps",
        paragraphs: [
          "Text2Sale gives you local business numbers, a shared two-way texting inbox and the registration needed for business texting. Every conversation is saved with the customer's record, your team can answer from anywhere, and reminders and follow-ups can go out automatically. If you also call customers, calls and texts from the same number sit together in one history.",
        ],
      },
      {
        heading: "Making the switch step by step",
        paragraphs: [
          "Switching does not need to be disruptive. A simple sequence over a week or two keeps customers informed and nothing gets lost.",
        ],
        bullets: [
          "Set up your business number and complete texting registration",
          "Export important contacts and import them into the new system",
          "Text active customers from your personal phone introducing the new number",
          "Update your website, Google Business Profile, cards and signage",
          "For a few weeks, forward business texts that still reach your personal phone",
          "Set your personal number's voicemail greeting to mention the new business line",
        ],
      },
      {
        heading: "Keep the personal touch",
        paragraphs: [
          "A business number does not have to sound corporate. Sign texts with a first name, keep the tone conversational and reply quickly. Customers care that they are talking to a helpful person, not which phone the message came from.",
        ],
      },
    ],
    keyTakeaways: [
      "Personal-phone texting does not scale past one person.",
      "It hides conversations from your team and risks losing history.",
      "A dedicated business number with a shared inbox fixes both.",
      "You can keep the personal tone while gaining automation.",
    ],
    faq: [
      {
        question: "Will customers be confused by a new number?",
        answer: "Rarely, if you tell them. A short text introducing your business number is usually all it takes.",
      },
      {
        question: "Can I text from the new number on my phone?",
        answer: "Yes. A web and mobile inbox lets you reply from your phone without using your personal number.",
      },
      {
        question: "Do I need to register to text from a business number?",
        answer:
          "In the US, business texting from local numbers requires brand and campaign registration. A good platform walks you through it.",
      },
    ],
    relatedSlugs: ["10dlc-registration-guide-for-agents", "how-to-choose-an-sms-platform", "missed-call-text-back"],
    relatedPages: [{ href: "/10dlc-compliant-texting", label: "10DLC compliant texting" }],
  },
  {
    slug: "leads-arriving-while-you-are-with-a-client",
    metaTitle: "What Happens to Leads That Arrive While You're With a Client | Text2Sale",
    title: "What happens to leads that arrive while you are with a client",
    description:
      "Solo agents and small teams lose leads that arrive mid-appointment. Here is how to respond instantly without walking out of the meeting you are already in.",
    excerpt: "You cannot leave a client meeting to answer a new lead. You do not have to.",
    tags: ["Speed to lead", "AI", "Automation"],
    intro: [
      "If you sell for a living, your best hours are spent with clients. That is the work that pays. Unfortunately, those are also the hours when new leads keep arriving, and you cannot exactly excuse yourself from a closing appointment to call someone who just filled out a form.",
      "For solo agents and small teams this is a constant tension. You either neglect the person in front of you or the person who just reached out. With the right setup, you do not have to choose.",
    ],
    sections: [
      {
        heading: "The problem: you can only be in one conversation",
        paragraphs: [
          "A one-hour client meeting is a one-hour blind spot for new leads. Add travel, a second appointment and some paperwork and a lead that arrived in the morning may not hear from you until evening. By then they have likely spoken with someone who was free.",
          "The same is true for inbound calls. When your phone rings during an appointment, you send it to voicemail, and many callers do not leave one. They just call the next business on the list.",
        ],
      },
      {
        heading: "Why it is hard to fix with more effort",
        paragraphs: [
          "Glancing at your phone between sentences does not work, and clients notice. Checking messages on breaks helps a little, but breaks are short and the follow-up still waits. Hiring an assistant solves it but costs more than many solo businesses can justify early on.",
        ],
      },
      {
        heading: "The fix: an automatic first response and a way to book",
        paragraphs: [
          "Set up an automatic text that goes to every new lead immediately, acknowledging the request and offering times to talk. The lead hears from you within seconds, even while you are mid-meeting. When they reply with a time, it can go straight into your calendar.",
          "For calls you miss, a text-back message lets the caller know you saw the call and offers a callback time, so they do not move on to the next business. An AI receptionist can go further by answering inbound calls, asking a few qualifying questions and booking an appointment or taking a message.",
          "Then block a few minutes after each appointment to review the inbox. Instead of starting cold, you will find conversations already underway and appointments already booked.",
        ],
        bullets: [
          "Instant automatic text to every new lead",
          "Text-back for every missed call",
          "AI replies or an AI receptionist to book appointments",
          "Short inbox review between appointments",
        ],
      },
      {
        heading: "What changes for your clients and leads",
        paragraphs: [
          "Your current client gets your full attention, which they notice and appreciate. Your new leads get a fast, friendly response and often an appointment, which keeps them from shopping around. And you stop feeling torn between the two.",
        ],
      },
      {
        heading: "How Text2Sale helps",
        paragraphs: [
          "Text2Sale sends your first-touch text the moment a lead arrives, uses AI replies to answer common questions and book appointments into your calendar, and offers an AI receptionist on Dialer and Complete plans to answer inbound calls when you are busy. Every conversation lands in one inbox, so after your meeting you can see exactly who reached out and what was arranged.",
        ],
      },
      {
        heading: "What a good automatic first text looks like",
        paragraphs: [
          "The automatic message carries a lot of weight, so it is worth a few minutes to get right. It should sound like you, mention what the lead asked about and give them something easy to answer. It should not pretend you are free this second if you are not.",
          "For example: 'Hi Rachel, this is Dan with Lakeside Insurance. I got your request about a home and auto quote. I am with a client right now but can call at 2:30 or 4:00 today. Which works better?' That message is honest, specific and makes the next step easy. Most leads reply with a time, and the ones who are in a hurry often say so, which tells you who to call first.",
          "For missed calls, keep it even shorter: 'Sorry I missed your call, this is Dan with Lakeside Insurance. I am with a client and will call you back by 3. Or text me here if that is easier.' Callers who were about to try the next agency usually wait.",
        ],
      },
      {
        heading: "Start small",
        paragraphs: [
          "Begin with the automatic first text and a missed-call text-back. Those two pieces close most of the gap. Add AI booking once you are comfortable with how leads respond.",
        ],
      },
    ],
    keyTakeaways: [
      "Time with clients creates blind spots for new leads.",
      "An instant automatic text keeps new leads from shopping around.",
      "Missed-call text-backs and an AI receptionist catch inbound calls.",
      "Review the inbox between appointments to find conversations already started.",
    ],
    faq: [
      {
        question: "Will leads know the first text is automated?",
        answer:
          "Not if it is written well. A short, personal message with their name and request reads like you sent it, because you wrote it.",
      },
      {
        question: "Can the AI book appointments without me?",
        answer: "Yes. It can offer open times from your calendar and confirm the booking, then you see it in your inbox and calendar.",
      },
      {
        question: "What if a lead needs an answer only I can give?",
        answer: "The AI can let them know you will follow up personally and flag the conversation for you.",
      },
    ],
    relatedSlugs: ["after-hours-ai-appointment-booking", "missed-call-text-back", "ai-appointment-booking-by-text"],
    relatedPages: [{ href: "/ai-texting-crm", label: "AI texting CRM" }],
  },
  {
    slug: "why-leads-dont-reply-to-your-texts",
    metaTitle: "Why Leads Don't Reply to Your Texts (and What to Change) | Text2Sale",
    title: "Why leads do not reply to your texts, and what to change",
    description:
      "Low reply rates usually come down to a handful of fixable mistakes in timing, wording and targeting. Here is how to diagnose them and get more leads talking.",
    excerpt: "Low reply rates come from a few fixable mistakes. Here is how to find them.",
    tags: ["Copywriting", "SMS marketing", "Campaigns"],
    intro: [
      "You send a batch of texts to new leads and wait. A few replies trickle in, but most of the list stays silent. It is tempting to blame the leads, the season or texting itself. More often, the silence is telling you something specific about the message, the timing or who received it.",
      "Below are the most common reasons leads do not reply, how to tell which one applies to you and what to change.",
    ],
    sections: [
      {
        heading: "Reason 1: the text sounds like a mass blast",
        paragraphs: [
          "Messages that start with 'Attention' or 'Special offer', use all caps or read like an ad get ignored or reported. People reply to texts that sound like a person talking to them specifically.",
          "Fix it by writing the way you would text a client you already know: first names, plain language, one idea and one easy question. 'Hi Tom, it is Ana with Coastal Mortgage. You asked about refinancing last week. Still looking, or did you get it sorted?' gets far more replies than a paragraph about rates.",
        ],
      },
      {
        heading: "Reason 2: there is no easy question",
        paragraphs: [
          "A text that gives information without asking anything gives the lead nothing to respond to. A text that asks something big, like 'When can we schedule a full consultation?', asks for too much effort. The best first texts ask something that can be answered in a word: yes or no, morning or afternoon, a choice between two times.",
        ],
      },
      {
        heading: "Reason 3: the timing is off",
        paragraphs: [
          "Texts sent at 7 a.m. or 9 p.m. reach people at bad moments. Texts sent days after a lead requested information arrive after the interest has faded. Send first touches immediately, and send follow-ups during normal waking hours in the lead's time zone. Mid-morning and early evening often work well, but your own data will tell you more than any general rule.",
        ],
      },
      {
        heading: "Reason 4: the list is old or wrong",
        paragraphs: [
          "If the leads are months old, purchased from a source you have not tested or missing context about what they asked for, low replies are expected. Treat older lists differently: lead with a reason to reconnect, like a seasonal change or a new option, and expect a lower but still valuable response rate.",
        ],
      },
      {
        heading: "Reason 5: the messages are not being delivered",
        paragraphs: [
          "Sometimes silence is not silence at all. Texts that are filtered by carriers never reach the phone. Unregistered numbers, links from public URL shorteners and spam-like wording all raise the risk. Check delivery reports and make sure your business texting is properly registered.",
        ],
      },
      {
        heading: "Reason 6: you only try once",
        paragraphs: [
          "Many teams send one text, get no answer and move on. But people miss messages all the time: they were driving, in a meeting or meant to reply later and forgot. A second and third touch, spaced a day or two apart and each with a slightly different angle, often brings in as many replies as the first message did.",
          "Vary the follow-ups instead of repeating yourself. The second text might offer specific times, the third might ask whether they already found what they needed. A simple 'Should I close out your request, or are you still looking?' tends to get honest answers, because it gives people an easy way to say yes or no without feeling pressured.",
        ],
      },
      {
        heading: "How to find your problem",
        bullets: [
          "Check delivery rates first; if they are low, fix delivery before wording",
          "Compare reply rates for fresh versus older leads",
          "Test two versions of your first text on similar leads",
          "Compare reply rates by send time",
        ],
        paragraphs: [
          "Change one thing at a time so you can tell what made the difference.",
        ],
      },
      {
        heading: "How Text2Sale helps",
        paragraphs: [
          "Text2Sale shows delivery and reply results for every campaign, supports personalization with your lead fields, and lets you build follow-up sequences that stop as soon as someone replies. Registered local numbers help delivery, and AI replies keep conversations moving once leads start answering.",
        ],
      },
    ],
    keyTakeaways: [
      "Write like a person, not an ad.",
      "Ask one easy question every time.",
      "Send first touches immediately and follow-ups at sensible hours.",
      "Check delivery before blaming the wording.",
    ],
    faq: [
      {
        question: "What is a good reply rate?",
        answer:
          "It varies by lead type. Fresh inbound leads reply far more than aged lists. Track your own baseline and aim to improve it.",
      },
      {
        question: "Should I include a link in the first text?",
        answer: "Usually not. Links reduce trust from unknown senders and can hurt delivery. Start a conversation first.",
      },
      {
        question: "How many follow-ups should I send?",
        answer: "A handful spaced over one to two weeks is reasonable, stopping the moment the lead replies.",
      },
    ],
    relatedSlugs: ["good-sms-response-rate", "first-text-to-a-new-lead-examples", "best-time-to-text-sales-leads"],
    relatedPages: [{ href: "/sms-character-counter", label: "Free SMS character counter" }],
  },
  {
    slug: "texts-not-delivering-how-to-diagnose",
    metaTitle: "Texts Not Delivering? How to Diagnose and Fix It | Text2Sale",
    title: "Texts not delivering? How to diagnose and fix it",
    description:
      "When business texts silently fail to arrive, campaigns look like they flopped. Here is how to tell if delivery is the problem and the common fixes for carrier filtering.",
    excerpt: "When texts silently fail, campaigns look like they flopped. Here is how to check.",
    tags: ["Deliverability", "10DLC", "SMS"],
    intro: [
      "A campaign goes out, replies are far lower than usual and a couple of customers mention they never got your message. That is the classic sign of a delivery problem. Unlike email, there is no spam folder for texts. Filtered messages usually just disappear, which makes delivery issues easy to miss and easy to mistake for a bad message.",
      "This guide walks through how to confirm whether delivery is the problem and what typically causes it.",
    ],
    sections: [
      {
        heading: "Step 1: look at delivery reports",
        paragraphs: [
          "Most business texting platforms report the status of each message: sent, delivered, failed or filtered. Start there. If a meaningful share of messages are failing or show carrier errors, you have a delivery problem. If nearly all messages show as delivered but replies are low, the issue is more likely the message or the list.",
          "Look for patterns. Are failures concentrated on one carrier, one number, one message template or one time period? The pattern usually points to the cause.",
        ],
      },
      {
        heading: "Common causes of filtering",
        bullets: [
          "Unregistered or incompletely registered business texting",
          "Message content that does not match the registered use case",
          "Public link shorteners or suspicious-looking links",
          "Spam-like wording, all caps or excessive punctuation",
          "Sending large volumes from a single number too quickly",
          "High opt-out or complaint rates on your messages",
        ],
        paragraphs: [
          "Carriers look at sender reputation and content together. A registered sender with clean, conversational messages has a lot more room than an unknown sender with promotional wording.",
        ],
      },
      {
        heading: "The fixes",
        paragraphs: [
          "Make sure your brand and campaign registration is complete and that your messages match what you registered. If you registered for customer care but are sending promotional offers, carriers notice the mismatch.",
          "Clean up content. Remove shortened links from public services, avoid all caps and repeated exclamation points, and keep the tone conversational. Identify your business in the first message to a new contact and include a simple way to opt out.",
          "Pace large sends. Spread big campaigns over time and across appropriate numbers rather than blasting thousands of messages at once from one line.",
          "Finally, watch opt-outs. A spike usually means the list or the message is off, and continued high opt-outs will hurt delivery for everything else you send.",
        ],
      },
      {
        heading: "Testing your fix",
        paragraphs: [
          "After making changes, send a small batch and check delivery reports before resuming full volume. Send test messages to phones on different carriers that your team owns. Improvements in delivery usually show up quickly once the cause is addressed.",
        ],
      },
      {
        heading: "How Text2Sale helps",
        paragraphs: [
          "Text2Sale handles 10DLC brand and campaign registration, shows delivery status on your campaigns and processes opt-outs automatically. Campaigns are sent in paced waves rather than all at once, and the platform's local numbers are registered for business texting. If delivery looks off, the reports make it easy to see which messages and numbers are affected.",
        ],
      },
      {
        heading: "Message habits that protect delivery",
        paragraphs: [
          "Day-to-day writing habits matter as much as registration. Carriers are looking for messages that look like legitimate conversations with people who expect to hear from you, so the closer your texts are to that, the safer they are.",
        ],
        bullets: [
          "Name your business in the first message to a new contact",
          "Personalize with the contact's name and what they asked about",
          "Keep promotional language to a minimum",
          "Use your own domain for any links, and only when needed",
          "Avoid sending the exact same message to huge lists all at once",
          "Remove numbers that bounce or opt out right away",
        ],
      },
      {
        heading: "Prevention beats repair",
        paragraphs: [
          "Delivery problems are much easier to prevent than to undo. Register properly before you start, text people who asked to hear from you, keep messages human and honor opt-outs immediately. Those habits keep your sender reputation healthy and your texts arriving.",
        ],
      },
    ],
    keyTakeaways: [
      "Filtered texts disappear silently, so check delivery reports first.",
      "Registration, content and sending patterns all affect delivery.",
      "Avoid public link shorteners and spam-like wording.",
      "Test fixes with small batches before full sends.",
    ],
    faq: [
      {
        question: "Why do some carriers deliver and others do not?",
        answer: "Each carrier applies its own filtering. Failures concentrated on one carrier usually point to content or registration issues it flags.",
      },
      {
        question: "Does registering guarantee delivery?",
        answer: "No, but it greatly improves it. Good content and low opt-out rates still matter.",
      },
      {
        question: "How quickly does delivery recover?",
        answer: "Often within days once the cause is fixed, though a damaged reputation can take longer to rebuild.",
      },
    ],
    relatedSlugs: ["10dlc-registration-guide-for-agents", "import-and-text-thousands-of-leads", "tcpa-compliance-texting-leads"],
    relatedPages: [{ href: "/10dlc-compliant-texting", label: "10DLC compliant texting" }],
  },
];

export const BLOG_POSTS_13: BlogPost[] = ARTICLES.map((article) => {
  const text = [article.title, ...article.intro,
    ...article.sections.flatMap((section) => [section.heading, ...section.paragraphs, ...(section.bullets || [])]),
    ...article.keyTakeaways, ...article.faq.flatMap((item) => [item.question, item.answer])].join(" ");
  return { ...article, datePublished: "2026-10-24", dateModified: "2026-10-24",
    readMinutes: Math.max(1, Math.ceil(text.split(/\s+/).length / 200)) };
});
