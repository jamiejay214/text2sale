import type { BlogPost } from "./blog-posts";

type NewArticle = Omit<BlogPost, "datePublished" | "dateModified" | "readMinutes">;

// This collection contains original operating guides and documented buyer
// comparisons. Reading estimates use the actual article text rather than a
// fixed number. The registry supplies sitemap, RSS, topic and IndexNow links.
const ARTICLES: NewArticle[] = [
  {
    slug: "ringy-vs-text2sale-insurance-crm",
    metaTitle: "Ringy vs. Text2Sale: Insurance CRM Workflow Comparison",
    title: "Ringy vs. Text2Sale: what insurance teams should test before switching",
    description: "Compare Ringy and Text2Sale with a practical insurance CRM test covering vendor leads, texting, calling, campaigns, AI controls and migration.",
    excerpt: "A fair comparison starts with the same quote-request lead in both systems. Use this test to find the workflow that fits your agency.",
    tags: ["Insurance", "CRM comparisons", "Lead management"],
    intro: [
      "An insurance agency switching CRMs is moving a daily operating system, not just a contact list. Lead deliveries, sending numbers, opt-outs, campaigns, notes and appointments all affect whether agents can keep working during the transition.",
      "Ringy and Text2Sale both serve teams that communicate with leads by text and phone. This guide compares the work you should test, rather than declaring a winner from a feature checklist. Ringy's official product and help pages are linked below; verify current plans and limits with each provider before buying.",
    ],
    sections: [
      { heading: "Recognize the overlap before looking for differences", paragraphs: [
        "Ringy's product documentation describes SMS and email campaigns, calling, lead management, integrations and AI assistance. Its lead-vendor guide also describes several delivery and distribution options. It would be inaccurate to treat it as a basic texting app.",
        "Text2Sale combines contact imports, SMS campaign steps, two-way conversations, calling, AI assistance, calendar integration and messaging setup in one workspace. The useful question is how each system fits your team's particular sequence of actions and whether the required capabilities are available in the quoted plan.",
      ] },
      { heading: "Run one realistic new-lead scenario", paragraphs: [
        "Create an internal sample lead with a name, mobile number, state, ZIP code, source and product interest. Deliver it through the method your agency uses, then inspect the field mapping, owner, campaign and first-message timing. Test a duplicate delivery as well as a new record.",
        "Reply from the test phone with 'Can you call me after 4?' The agent should see the reply, stop any conflicting automated follow-up, make a call and record a next action. Do the same test when the assigned agent is unavailable. Document the manual steps instead of relying on a sales demonstration.",
      ] },
      { heading: "Evaluate the calling flow independently", paragraphs: [
        "Ask a rep to work ten internal records consecutively. Check whether the next lead is clear, the previous conversation is visible, and outcomes such as voicemail, callback requested and appointment booked produce the right follow-up.",
        "Ringy's help center distinguishes its power-dialer workflow from its progressive dialer. Read the current setup guide and confirm what is included or added separately. In every system, compare the actual rep experience, controls and total cost of the calling method you intend to use.",
      ] },
      { heading: "Test AI on your difficult conversations", paragraphs: [
        "Use scenarios such as a vague 'yes,' a request for a licensed agent, a wrong number and a prospect who already booked. Review what the AI sends, where its instructions live, and how a person takes control. Automatic sending and suggested replies are different operating models; confirm which behavior each plan provides.",
        "Keep insurance advice in the approved human workflow. A convincing AI response is not evidence that coverage guidance is accurate. Test escalation, appointment details and whether the assistant preserves the contact's existing history.",
      ] },
      { heading: "Plan a migration that preserves trust", paragraphs: [
        "Before changing providers, export what is available: contacts, custom fields, source IDs, ownership, opt-outs, consent context, notes and campaign definitions. Determine what cannot be transferred, including historical messages or number configuration.",
        "Use a controlled pilot and one active sender per audience. Reconcile totals and suppression records before enabling broad outreach. The best CRM choice is the one that passes your agency's tests at an understandable cost, with a transition your agents can execute confidently.",
      ] },
    ],
    keyTakeaways: ["Both products have overlapping sales communication capabilities; verify current plan details.", "Test one complete lead-to-callback scenario and a duplicate delivery.", "Compare AI behavior and calling controls in practice.", "Preserve opt-outs and source history before migration."],
    faq: [
      { question: "Is this a claim that Ringy lacks SMS automation?", answer: "No. Ringy's official materials describe SMS campaigns and automation. This comparison evaluates workflow fit, migration and plan requirements rather than claiming those features are absent." },
      { question: "Can I keep both CRMs during a pilot?", answer: "You can test them with internal or carefully controlled audiences, but avoid having both send overlapping sequences to the same live leads. Assign one system responsibility for each audience and preserve suppression in both." },
    ],
    relatedSlugs: ["switching-sms-providers", "crm-for-purchased-insurance-leads", "sms-crm-with-built-in-dialer"],
    relatedPages: [{ href: "/sms-crm-for-insurance-agents", label: "Text2Sale for insurance agents" }],
    sources: [{ href: "https://www.ringy.com/product", label: "Ringy: official product features" }, { href: "https://www.ringy.com/knowledge/lead-vendor-distribution-options", label: "Ringy: lead-vendor distribution options" }, { href: "https://www.ringy.com/knowledge/power-dialer-setup", label: "Ringy: power-dialer setup" }],
  },
  {
    slug: "hubspot-vs-texting-first-crm",
    metaTitle: "HubSpot vs. a Texting CRM: How to Choose | Text2Sale",
    title: "HubSpot vs. a texting CRM: which setup fits your lead follow-up?",
    description: "Compare HubSpot's documented SMS workflow with a texting CRM using contact intake, registration, campaigns, replies and total operating cost.",
    excerpt: "A broad CRM and a texting workspace can both be good choices. The decision depends on the job your team needs to do every day.",
    tags: ["CRM comparisons", "SMS follow-up", "Sales teams"],
    intro: [
      "Some teams need marketing, service, sales reporting and a large integration ecosystem around one customer record. Others spend most of their day importing leads, texting them, making calls and booking conversations. Those priorities can lead to different software decisions.",
      "HubSpot supports SMS through documented products and add-ons. A fair comparison must acknowledge those capabilities and examine the actual subscription requirements. This guide uses HubSpot's official SMS setup and workflow documentation, linked below, and a repeatable evaluation process.",
    ],
    sections: [
      { heading: "Compare the systems around your primary job", paragraphs: [
        "Write a one-sentence requirement such as 'A consented quote request should reach an agent, receive the approved first touch and become a tracked appointment.' Then list everything else the business must support: email campaigns, service tickets, detailed deals, reporting or external integrations.",
        "A broad platform may be appropriate when those additional functions are central. A focused texting CRM may fit when conversation operations dominate. Neither category automatically wins; every extra tool or integration adds setup and ownership that the team must account for.",
      ] },
      { heading: "Verify the SMS entitlement and registration path", paragraphs: [
        "HubSpot's current marketing SMS documentation specifies supported subscriptions and SMS add-ons, and its workflow guide requires business registration and opted-in contacts. Check the exact account edition, region and message type with HubSpot before assuming SMS is included in a base CRM subscription.",
        "For any texting CRM, ask the same questions: which plan supports the required campaign, how the business registers, when its number can send, and which fees recur. Registration assistance does not guarantee approval, and switching applications does not remove the sender's responsibility for appropriate outreach.",
      ] },
      { heading: "Make replies part of the demo", paragraphs: [
        "Do not stop at a successful outbound send. Reply as a prospect, ask for a callback, change the requested time and then opt out. Inspect which screen receives the reply, who owns it, which scheduled actions stop and what appears in the timeline.",
        "A sales process breaks when activity is technically logged but nobody notices it. Require the demonstration to include an unavailable owner and a conversation that another rep must continue.",
      ] },
      { heading: "Model the full monthly operating cost", paragraphs: [
        "Include the CRM subscription, relevant add-ons, users, texting volume, phone numbers, calling, AI activity and any integration service. Avoid comparing a base subscription from one system to a fully configured quote from another.",
        "Estimate setup time separately. If the agency needs a consultant or developer to maintain field mappings and automations, name that responsibility and budget for it. A workflow that saves rep time may still need ongoing administration.",
      ] },
      { heading: "Choose a clean data owner", paragraphs: [
        "If two systems remain in use, decide which owns the contact, appointment, opt-out and campaign status. A vague promise that everything will sync is not enough; each event needs a direction and a failure-handling rule.",
        "Before purchase, run a small test that includes a duplicate record and a stopped campaign. Select the setup that meets the broader business needs while making the daily texting and calling work understandable for the people using it.",
      ] },
    ],
    keyTakeaways: ["HubSpot has documented SMS capabilities; check current editions and add-ons.", "Include inbound replies and opt-outs in every demo.", "Compare complete configured costs and administration time.", "Assign a clear system of record if tools are combined."],
    faq: [
      { question: "Does every HubSpot CRM account include marketing SMS?", answer: "Do not assume that. HubSpot's SMS documentation identifies required subscriptions and add-ons. Confirm the current requirements for your specific account and message type." },
      { question: "Should a texting CRM replace our entire CRM?", answer: "Only if it supports the functions your business needs. Some teams use a focused conversation workspace alongside a broader CRM, with explicit rules for data ownership, opt-outs and appointment synchronization." },
    ],
    relatedSlugs: ["sms-crm-integration", "what-is-a-texting-crm", "google-calendar-texting-crm-workflow"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Explore the texting CRM workflow" }],
    sources: [{ href: "https://knowledge.hubspot.com/sms/set-up-sms-messaging", label: "HubSpot: SMS messaging setup and requirements" }, { href: "https://knowledge.hubspot.com/sms/send-automated-sms-messages-using-workflows", label: "HubSpot: automated SMS workflows" }],
  },
  {
    slug: "pipedrive-vs-sms-crm-for-lead-follow-up",
    metaTitle: "Pipedrive vs. an SMS CRM for Lead Follow-Up | Text2Sale",
    title: "Pipedrive with SMS integrations vs. an all-in-one texting CRM",
    description: "Compare a Pipedrive SMS integration stack with a unified texting CRM across conversation history, sync ownership, campaigns, calling and costs.",
    excerpt: "The choice is often a pipeline plus integrations or a unified conversation workspace. Test the connections that make that stack reliable.",
    tags: ["CRM comparisons", "Integrations", "Texting CRM"],
    intro: [
      "A team already using Pipedrive may want to add texting without abandoning its deal pipeline. Another team may prefer texting, campaigns and calling in one product from the start. Both are plausible choices.",
      "Pipedrive's official marketplace includes providers for SMS and calling, including Dexatel and Aloware. Their documented capabilities establish that an integration route exists. They do not prove that every connector supports your exact campaign, consent or synchronization requirements.",
    ],
    sections: [
      { heading: "Diagram the real connection", paragraphs: [
        "Identify where a lead enters, where the contact lives, which application sends the text and where the reply appears. Add the dialer, appointment calendar and reporting destination to that map. Every connection needs an owner.",
        "For a unified texting CRM, repeat the same exercise. Fewer applications can simplify daily work, but the platform still needs to fit your pipeline and reporting needs. Do not remove a critical deal-management function merely to reduce the tool count.",
      ] },
      { heading: "Test synchronization in both directions", paragraphs: [
        "Import one internal contact, edit its mobile number, send a text, receive a reply and record a call. Check which changes travel between systems and how long they take. A connector that logs activity may behave differently from one that manages campaigns.",
        "Then simulate a duplicate and an opt-out. Decide which system is authoritative when values conflict. Suppression must remain effective even if a contact is edited or re-imported in the other application.",
      ] },
      { heading: "Ask where the rep should work", paragraphs: [
        "An agent should not need to watch three inboxes to discover one callback request. Decide which screen is the primary conversation workspace and whether it shows texts, call notes, lead source and appointments together.",
        "Test the busiest routine: ten replies arrive while two agents are calling. Watch how the team assigns, opens, finishes and archives conversations. This is a better usability test than sending one example SMS from a deal record.",
      ] },
      { heading: "Budget for the stack, not just the CRM", paragraphs: [
        "Add the Pipedrive edition, connector subscription, message usage, numbers, calling and any automation service. Confirm support responsibility when the connector fails: the CRM, the communications provider or an internal administrator.",
        "For an all-in-one option, request the same complete estimate and review any feature gates. Avoid using historical prices from comparison blogs as the basis for a buying decision; plans and integrations change.",
      ] },
      { heading: "Use a pilot with a defined exit", paragraphs: [
        "Pick a small eligible audience, one owner and one campaign. Define success as a complete trace from lead arrival to conversation and appointment, with suppression intact. Record unexpected manual actions during the pilot.",
        "If your existing pipeline is valuable and the integration passes, keeping it may be sensible. If most effort goes into repairing connections, a unified texting CRM is worth evaluating. Choose based on evidence from the process, not the number of logos on an integrations page.",
      ] },
    ],
    keyTakeaways: ["Pipedrive's marketplace offers SMS and calling integration paths.", "Activity logging and campaign control are different capabilities.", "Test duplicate handling and opt-out synchronization.", "Compare the total stack and support responsibility."],
    faq: [
      { question: "Can Pipedrive be used with business texting?", answer: "Yes. Its official marketplace includes communications integrations. Review the current connector documentation, plan, number support and campaign behavior for the provider you choose." },
      { question: "What is the biggest risk of a multi-tool CRM stack?", answer: "Unclear ownership of contact changes, replies and suppression can cause missed work or conflicting actions. Document the direction, timing and failure handling of each synchronization." },
    ],
    relatedSlugs: ["sms-crm-integration", "texting-crm-vs-mass-texting-app", "sms-crm-with-built-in-dialer"],
    relatedPages: [{ href: "/sales-team-texting-crm", label: "Unified texting and calling for sales teams" }],
    sources: [{ href: "https://www.pipedrive.com/en/marketplace/app/dexatel/8bd4b197f9cbe5b7", label: "Pipedrive marketplace: Dexatel SMS integration" }, { href: "https://www.pipedrive.com/en/marketplace/app/aloware-contact-center/320051c9826670f0", label: "Pipedrive marketplace: Aloware contact center" }],
  },
  {
    slug: "sms-campaign-preflight-checklist",
    metaTitle: "SMS Campaign Launch Checklist for Sales Teams | Text2Sale",
    title: "The SMS campaign preflight checklist: what to check before launch",
    description: "Review audience eligibility, merge fields, segments, sender readiness, delays, reply stops, wallet balance and owner coverage before launching an SMS campaign.",
    excerpt: "Use a repeatable preflight so campaign mistakes are caught on a test phone rather than in thousands of customer conversations.",
    tags: ["Campaigns", "Operations", "SMS follow-up"],
    intro: [
      "A campaign launch combines audience data, copy, a phone number, timing, billing and human response coverage. Checking only the message text leaves most failure points untouched.",
      "Use a short, repeatable preflight and keep the results with the campaign version. The purpose is to make launch predictable: everyone should know who receives what, when it happens and who handles the reply.",
    ],
    sections: [
      { heading: "1. Reconcile the audience", paragraphs: [
        "Start with the file or segment count, then account for duplicates, invalid numbers, opted-out contacts, exclusions and records already in the same sequence. Confirm the remaining eligible total before you schedule anything.",
        "Review the source and permission context for the intended outreach. A technically valid phone number is not the same as an appropriate recipient. Keep location and time-zone uncertainty visible rather than applying one guessed default to the whole list.",
      ], bullets: ["Original records and final eligible records reconcile.", "Duplicates and suppression are checked.", "Campaign purpose matches the audience's context."] },
      { heading: "2. Preview the fully rendered first message", paragraphs: [
        "Render the message using long names, blank names and unusual field values. Include the business identification and the campaign's required opt-out instruction at the end of the first message. Test every spin-text variation, not just the version visible in the editor.",
        "Paste each representative final message into the SMS character counter. The final body includes replacement values, links and opt-out wording, so a short template can still become a multi-segment message after rendering.",
      ] },
      { heading: "3. Verify sender and account readiness", paragraphs: [
        "Confirm the correct sending number, supported channel, registration status and any remaining setup requirements shown by your provider. A completed brand record does not by itself prove that every number is ready for campaign traffic.",
        "Review available funds and the expected usage. Test with internal records before committing the larger audience. If the setup screen shows a blocked requirement, resolve it rather than treating a campaign activation button as proof that sending will work.",
      ] },
      { heading: "4. Walk through the timing and exit rules", paragraphs: [
        "Write down the actual first five actions: text, wait, text, wait, call task, for example. Specify whether each delay starts after enrollment or after the previous completed action. Confirm how send windows affect the planned times.",
        "Reply, book an appointment and opt out from a test phone. Each event should stop or change the appropriate later steps. A successful outbound test alone does not establish that the campaign will behave correctly after a response.",
      ] },
      { heading: "5. Assign reply coverage and a review time", paragraphs: [
        "Name the person watching the inbox, the backup owner and the threshold for pausing the campaign if delivery or negative responses look unusual. Start with a manageable batch that the team can actually work.",
        "At the review, compare sent, delivered, replied, qualified and booked totals. Record what changed before the next batch. A launch checklist becomes more useful when it captures lessons from the last campaign instead of remaining a static document.",
      ] },
    ],
    keyTakeaways: ["Reconcile the eligible audience before launch.", "Preview rendered copy, variations and opt-out language.", "Test sender readiness, delays and every exit rule.", "Assign a real inbox owner and review the first batch."],
    faq: [
      { question: "Should I test a campaign even if I copied a working one?", answer: "Yes. The audience, fields, sender, timing and account state may differ. Reusing the structure does not eliminate the need to test the rendered message and exit rules." },
      { question: "Why count segments after merge fields are filled?", answer: "Names, links and appended wording can increase message length. Counting only the template can underestimate what the provider actually receives." },
    ],
    relatedSlugs: ["multi-step-sms-follow-up-campaign", "sms-merge-fields-personalization", "business-texting-number-deliverability"],
    relatedPages: [{ href: "/sms-character-counter", label: "Free SMS character and segment counter" }, { href: "/bulk-sms-software", label: "Bulk SMS campaign tools" }],
  },
  {
    slug: "csv-reenrollment-without-duplicate-texts",
    metaTitle: "Re-Enroll CSV Leads Without Duplicate Texts | Text2Sale",
    title: "How to reuse a CSV lead audience without sending duplicate texts",
    description: "Re-enroll eligible CSV leads in a later campaign while preserving source history, suppressions, appointments and existing campaign activity.",
    excerpt: "Keep an uploaded file as an audience, then select the people who should receive the next campaign instead of importing everyone again.",
    tags: ["CSV import", "Campaigns", "Data quality"],
    intro: [
      "A lead file is often reused after the original campaign finishes. Re-uploading the entire file can create duplicate records or restart outreach to people who replied, booked or opted out since the first upload.",
      "The safer approach is to treat the file as a source cohort: a stable set of contacts with a history. The next campaign should use a reviewed subset of that cohort, not a fresh interpretation of the old spreadsheet.",
    ],
    sections: [
      { heading: "Preserve the original upload identity", paragraphs: [
        "Record the file name, vendor, upload time, batch identifier and original campaign. Keep those values attached to contacts even when their owner or campaign changes. If a vendor sends overlapping files, store its individual lead IDs as well.",
        "This history answers an important question later: which contacts came from this purchase, and what happened to them? It also prevents a reactivation campaign from being reported as a new vendor delivery.",
      ] },
      { heading: "Create the later audience from current CRM state", paragraphs: [
        "Filter the original cohort using current facts: opt-out status, last reply, appointment state, active campaign, wrong-number flag and last completed outcome. The old CSV cannot tell you what happened after import.",
        "For example, a 1,000-row file may contain 850 unique usable contacts. A later review might exclude 100 with replies, 40 with appointments, 30 suppressed records and 80 still in an active sequence, leaving 600 candidates. These are illustrative counts; make the categories mutually exclusive before subtracting them.",
      ] },
      { heading: "Preview the new campaign before assignment", paragraphs: [
        "Select the eligible group and inspect the intended campaign, first message, sender and timing. The opening should reference the appropriate earlier context instead of pretending the prospect has just submitted a new form.",
        "Decide whether a current campaign must end before a later one starts. Campaign reassignment should be deliberate; two sequences chasing the same lead can create confusing messages and difficult attribution.",
      ] },
      { heading: "Use deduplication as a second guardrail", paragraphs: [
        "When a file really must be imported again, normalize numbers and match existing records before creating new contacts. Retain suppression and previous activity. A blank status in the incoming file should not erase a known opt-out.",
        "Review the import summary for new, updated, duplicate, rejected and skipped rows. Keep the rejected-row reason so the team can fix source data without repeatedly attempting the same bad records.",
      ] },
      { heading: "Report reactivation separately", paragraphs: [
        "Measure the later campaign's eligible contacts, successful deliveries, new replies and booked conversations independently of the first sequence. Keep the same source attribution, but add a distinct campaign label.",
        "This allows an agency to see whether the vendor's leads produce value over time without giving the new-lead campaign credit for a much later result. It also shows whether repeating outreach is adding useful conversations or simply more activity.",
      ] },
    ],
    keyTakeaways: ["Reuse an upload as a source cohort rather than recreating every record.", "Build the later audience from current replies, appointments and suppression.", "Avoid overlapping active sequences.", "Measure reactivation separately while preserving original attribution."],
    faq: [
      { question: "Does adding a lead to a new campaign mean it is a new contact?", answer: "No. It is usually a new campaign enrollment for an existing contact. Preserve the contact identity, prior messages, source history and opt-out state." },
      { question: "What if the CRM only supports another CSV upload?", answer: "Export a reviewed eligible subset, confirm its deduplication behavior and test a small import first. Ensure a re-import cannot overwrite suppression or create a second active sender for the same person." },
    ],
    relatedSlugs: ["csv-lead-import-to-text-campaign", "reengage-old-leads-with-sms-campaign", "cleaning-phone-numbers-before-import"],
    relatedPages: [{ href: "/bulk-sms-software", label: "CSV and bulk campaign management" }],
  },
  {
    slug: "archive-vs-delete-crm-conversations",
    metaTitle: "Archive vs. Delete CRM Conversations: A Practical Guide",
    title: "Archive or delete? How to clean a sales inbox without losing context",
    description: "Create a practical CRM inbox policy for archived conversations, deleted records, opt-outs, ownership and bulk cleanup.",
    excerpt: "A clean inbox should show work that needs attention while preserving the records required to explain past communication.",
    tags: ["Conversations", "Operations", "Lead management"],
    intro: [
      "A busy campaign can leave the inbox full of completed threads. Agents start ignoring unread badges, managers cannot see who still needs help, and genuinely important replies disappear among old conversations.",
      "Cleanup is necessary, but archiving and deleting have different effects. Build a simple policy around active work, retained context and deliberate removal so bulk actions do not turn a tidy screen into a damaged contact history.",
    ],
    sections: [
      { heading: "Define the purpose of the active inbox", paragraphs: [
        "Treat the main inbox as a work queue. A conversation belongs there when someone needs to answer, call, confirm a detail or complete a next action. A finished conversation can usually move out of that view without erasing its record.",
        "Do not use archive as an unspoken rejection status. If a lead bought elsewhere, booked a meeting or requested a later callback, record that outcome first. The next agent should understand why the conversation left the active queue.",
      ] },
      { heading: "Use archive to remove visual noise", paragraphs: [
        "Archiving generally hides a thread from the main view while keeping its history, depending on the product. Verify whether a new inbound message reopens the conversation automatically or requires a separate filter.",
        "A useful default is to archive completed exchanges after the next action is assigned or resolved. For example, a consultation that is already on the calendar may no longer need an active inbox thread, but it still needs a contact record and appointment history.",
      ] },
      { heading: "Reserve deletion for a deliberate reason", paragraphs: [
        "Deleting can remove messages, contacts or both, and some systems offer a recoverable trash while others do not. Inspect the exact effect and retention policy before a bulk deletion. Account owners should understand what data can be restored.",
        "Do not delete an opt-out merely to hide it from the inbox. Suppression must continue to prevent future unwanted contact. A deleted conversation and a contact's eligibility are separate concerns, and the interface should not blur them.",
      ] },
      { heading: "Clean in small, understandable batches", paragraphs: [
        "Filter by outcome, last activity, owner or campaign, inspect the selected count and open a few representative records. Archive one small batch first and verify its new location before applying the same action more broadly.",
        "Select-all behavior deserves special attention. A checked box may select only the visible page or every matching record. Confirm the scope from the interface rather than assuming a page of twenty records means twenty will be changed.",
      ], bullets: ["Record the lead outcome before cleanup.", "Check whether new replies reopen archived threads.", "Verify the scope of every select-all action.", "Preserve suppression independently of inbox visibility."] },
      { heading: "Review the queue instead of chasing zero", paragraphs: [
        "An inbox with zero visible threads is not necessarily healthy. Look for overdue callbacks, unassigned replies, stalled conversations and appointments that need confirmation. Cleanup should improve attention, not make the dashboard look impressive.",
        "Add a short weekly review of active and archived views. If agents repeatedly archive unresolved conversations, fix the ownership or task process. The best inbox policy helps someone identify the next useful action quickly.",
      ] },
    ],
    keyTakeaways: ["Use the active inbox for conversations requiring a next action.", "Archive completed threads when their history should remain accessible.", "Verify deletion and recovery behavior before bulk removal.", "Never confuse archiving with opt-out suppression."],
    faq: [
      { question: "Does archiving stop a campaign?", answer: "Not necessarily. Inbox visibility and campaign enrollment are often independent. Confirm the platform's behavior and pause or end the campaign separately when required." },
      { question: "Should opted-out conversations be deleted?", answer: "Removing them from the active queue may be reasonable, but retain effective suppression and any records required by the business's policy. Deletion must not make the number eligible again." },
    ],
    relatedSlugs: ["handling-wrong-number-and-angry-replies", "closing-the-loop-with-lost-deals", "crm-bulk-campaign-assignment-checklist"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Organize sales conversations in Text2Sale" }],
  },
  {
    slug: "crm-bulk-campaign-assignment-checklist",
    metaTitle: "Bulk Add Leads to a Campaign: CRM Checklist | Text2Sale",
    title: "How to add many leads to a new campaign safely",
    description: "Use filters, selection scope, active-campaign review and a confirmation summary when assigning multiple CRM contacts to a campaign.",
    excerpt: "Bulk assignment should be quick and explicit: select the right people, choose an active campaign, review the impact and confirm.",
    tags: ["Campaigns", "Contacts", "Operations"],
    intro: [
      "Bulk campaign assignment saves hours when a team needs to follow up with an entire audience. It also amplifies mistakes: one incorrect filter can move many leads into a sequence that does not fit their current situation.",
      "A good operating routine keeps the action fast without making its scope ambiguous. The user should always know which contacts are selected and what the new campaign will do first.",
    ],
    sections: [
      { heading: "Build a meaningful selection before opening the picker", paragraphs: [
        "Start with a business condition, such as eligible leads from one source that have not replied and are no longer in an active sequence. Apply the filters, inspect representative contacts and note the total matching count.",
        "Avoid treating all contacts as a useful segment. The right group may depend on consent context, product interest, location, outcome or recency. Select records because the campaign fits them, not merely because they are easy to highlight.",
      ] },
      { heading: "Confirm what select all actually means", paragraphs: [
        "Some interfaces select the visible page; others can select all matching results. A selection banner should distinguish those states. Check the count before choosing the campaign, especially after changing a filter or search.",
        "For example, if a filtered audience contains 800 contacts and the page shows 25, '25 selected' and '800 selected' represent very different actions. Review exclusions again if the interface expands the selection beyond the visible records.",
      ] },
      { heading: "Choose an active campaign with a clear opening", paragraphs: [
        "Use a campaign picker that identifies the campaign by name and status. Review the first message, next wait step and sending configuration before enrolling the group. A campaign with a familiar name may have changed since it was last used.",
        "Test the rendered text with a contact from this particular audience. If its first message assumes a new quote request, it may be wrong for a months-old list or a group that has already spoken to an agent.",
      ] },
      { heading: "Decide how existing enrollments should behave", paragraphs: [
        "Determine whether the action adds another enrollment, replaces the current campaign or skips already enrolled contacts. Never assume the word 'move' means future steps are stopped unless the product confirms it.",
        "Preserve outcomes that should exclude a lead, including opt-outs, wrong numbers and booked appointments where the new sequence would conflict. Record skipped contacts separately from failures so the team can understand what happened.",
      ] },
      { heading: "Verify the result and retain the action summary", paragraphs: [
        "After assignment, compare selected, enrolled, skipped and failed counts. Open a sample contact to confirm its campaign and next scheduled action. If the total differs from the selection, investigate the reason before repeating the operation.",
        "Keep a dated summary with the audience filter, campaign version and operator. This is especially useful when managers work large batches or several agents share responsibility for the same source.",
      ] },
    ],
    keyTakeaways: ["Select an audience based on campaign fit and current eligibility.", "Distinguish visible-page selection from all matching records.", "Review existing enrollments before adding another sequence.", "Reconcile enrollment results instead of repeating uncertain actions."],
    faq: [
      { question: "Should adding leads to a campaign redirect to another page?", answer: "A focused picker or modal can preserve the working context. It should still show campaign status, selected count and the action's effect before confirmation." },
      { question: "What if some selected leads are skipped?", answer: "Inspect the reason, such as an existing enrollment, suppression or invalid data. A skip may be an intentional guardrail rather than an error to bypass." },
    ],
    relatedSlugs: ["csv-reenrollment-without-duplicate-texts", "archive-vs-delete-crm-conversations", "multi-step-sms-follow-up-campaign"],
    relatedPages: [{ href: "/bulk-sms-software", label: "Manage bulk campaign audiences" }],
  },
  {
    slug: "crm-contact-deduplication-phone-email",
    metaTitle: "CRM Contact Deduplication: Phone, Email and Lead IDs",
    title: "Deduplicate CRM contacts without erasing important history",
    description: "Build a CRM deduplication policy using normalized phones, emails, vendor IDs, ownership and conservative handling of opt-outs and conflicting fields.",
    excerpt: "A duplicate is a record-identity problem. Cleaning phone formatting is only the first step toward a reliable contact history.",
    tags: ["Data quality", "Contacts", "CSV import"],
    intro: [
      "The same person can arrive from a form, a CSV and two lead vendors. If each delivery becomes a new contact, agents can send overlapping messages, report inflated lead totals and miss the opt-out stored on the earlier record.",
      "Deduplication should preserve context while reducing repetition. A simple matching policy is more useful than a blind rule that merges every similar name.",
    ],
    sections: [
      { heading: "Normalize before you compare", paragraphs: [
        "Store phone numbers in a consistent format and trim accidental whitespace from emails and source IDs. Remove spreadsheet artifacts only when they are formatting errors, not real digits. Preserve the original input when it helps explain a rejected row.",
        "A US number displayed as '(954) 555-0142' and '+1 954 555 0142' can represent the same destination. A different last digit does not. Country context matters, and a number with uncertain geography should not be converted by guessing.",
      ] },
      { heading: "Use a hierarchy of matching signals", paragraphs: [
        "A stable vendor lead ID is useful within that source. A normalized mobile number is often useful across sources. Email and name can add context, but shared household emails and recycled numbers mean no single field proves identity forever.",
        "Separate exact matches from possible matches. Exact matches can follow a documented update policy; conflicting records should enter a review queue. Matching on name alone is particularly risky for common names.",
      ] },
      { heading: "Choose field-by-field merge rules", paragraphs: [
        "Decide which source can update each field. A recent confirmed callback preference may outrank an old CSV value; a new vendor name may not outrank information the prospect supplied directly. Keep changes traceable.",
        "Never let a blank incoming field erase useful existing information by default. Treat opt-outs and suppression conservatively, and do not replace a known restricted status with a vendor's generic 'new lead' label.",
      ] },
      { heading: "Preserve communication and attribution", paragraphs: [
        "Combine source history without duplicating the active outreach. A person can be associated with multiple purchases or campaigns while remaining one contact. Store the delivery event separately from the contact identity.",
        "Check that notes, calls, appointments and ownership survive a merge. If the CRM cannot combine histories safely, link the records for review instead of deleting one immediately. The operator should be able to explain the resulting contact.",
      ] },
      { heading: "Measure duplicates as a source-quality signal", paragraphs: [
        "Report duplicate deliveries by vendor and batch, distinguishing repeated delivery of the same lead ID from a person who genuinely re-inquired. Those cases may require different vendor conversations and follow-up decisions.",
        "After import, reconcile new, updated, duplicate, rejected and review-required counts. Test the policy with a few known duplicates before a large upload. A cleaner database should also produce fewer conflicting campaign actions, not merely fewer rows.",
      ] },
    ],
    keyTakeaways: ["Normalize contact fields before matching.", "Distinguish exact duplicates from uncertain identity matches.", "Use conservative field and suppression merge rules.", "Preserve communication history and every source event."],
    faq: [
      { question: "Can two leads share a phone number?", answer: "Yes. Household numbers, business numbers and recycled numbers complicate identity. Use other context and review conflicts rather than assuming one phone always represents one permanent person." },
      { question: "Should a duplicate vendor delivery restart the campaign?", answer: "Not automatically. Review the existing contact's replies, active sequence and suppression, then determine whether a genuine new inquiry warrants a different action." },
    ],
    relatedSlugs: ["cleaning-phone-numbers-before-import", "csv-lead-import-to-text-campaign", "crm-for-purchased-insurance-leads"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Manage contact and campaign history" }],
  },
  {
    slug: "sms-stop-on-reply-campaign-rules",
    metaTitle: "SMS Stop-on-Reply Rules for Campaigns | Text2Sale",
    title: "Stop on reply: designing SMS campaign exits that make sense",
    description: "Define how replies, opt-outs, appointments, human takeover and ambiguous responses should change an automated SMS follow-up campaign.",
    excerpt: "Once a lead responds, the campaign should react to the new situation. Map these exits before scheduling the next message.",
    tags: ["Campaigns", "Workflow automation", "Conversations"],
    intro: [
      "Few things make automation feel careless faster than a prospect answering a question and receiving the same question again an hour later. A reply changes the state of the conversation, even if it is only 'later' or 'who is this?'",
      "Stop-on-reply rules connect the scheduled sequence to the live inbox. They should explain what stops, what continues and who becomes responsible when the next step is no longer a routine follow-up.",
    ],
    sections: [
      { heading: "Separate the prospecting sequence from the conversation", paragraphs: [
        "A prospecting sequence assumes the lead has not responded. The first meaningful inbound message ends that assumption. Pause further prospecting while the team or trained assistant resolves the reply.",
        "The conversation may continue by text, phone or an appointment workflow. Stopping one campaign does not require stopping every useful interaction; it means the old schedule should no longer speak as if nothing happened.",
      ] },
      { heading: "Define explicit terminal events", paragraphs: [
        "Opt-outs, wrong-number reports and other suppression events must prevent later outreach according to the business's rules and applicable requirements. A completed appointment booking should stop messages still asking the prospect to book.",
        "Human takeover should also have a clear effect. If an agent is answering, the assistant or campaign must not compete with them. Record the takeover and whether automation can resume, rather than relying on someone to remember another hidden toggle.",
      ], bullets: ["Reply: pause prospecting and assign a response.", "Opt-out: suppress later sends.", "Appointment booked: replace booking outreach with the approved appointment flow.", "Human takeover: prevent competing automated messages."] },
      { heading: "Handle ambiguous replies conservatively", paragraphs: [
        "'Yes' can mean interested, available or simply acknowledging the message. 'Tomorrow' may be a callback preference without a time. Do not mark these as fully qualified or booked without enough information.",
        "Use a short clarification or human task. For example: 'Happy to help. Would you prefer a call tomorrow morning or afternoon?' The next action should reduce ambiguity, not automatically restart the original campaign.",
      ] },
      { heading: "Test the timing collision", paragraphs: [
        "Send a test reply shortly before a wait step expires. Confirm that the later message does not send after the system has recorded the reply. Also test a reply arriving while a sender is already processing a batch.",
        "Some actions cannot be recalled once submitted to a provider. That makes the order of internal checks important. The application should evaluate current eligibility as close to dispatch as possible, not only when the contact first enters the campaign.",
      ] },
      { heading: "Review campaign exits as an operating metric", paragraphs: [
        "Count replies, opt-outs, appointments, manual stops and completed-without-response outcomes separately. A campaign with fewer scheduled sends may be performing better because more people responded early.",
        "Investigate conversations that continued receiving prospecting steps after contact. They can reveal delayed events, unclear ownership or missing branch rules. Fix the event handling before adding more follow-up messages.",
      ] },
    ],
    keyTakeaways: ["A reply invalidates the assumption behind a no-response sequence.", "Define campaign behavior for opt-outs, bookings and human takeover.", "Clarify ambiguous responses instead of inventing a completed outcome.", "Test replies that arrive just before a scheduled send."],
    faq: [
      { question: "Should every inbound message stop every campaign?", answer: "Define the scope deliberately. Prospecting should usually pause while the reply is handled, while a separate appointment workflow may remain appropriate. Opt-outs require suppression according to the applicable rules." },
      { question: "Does stop on reply mean AI can never respond?", answer: "No. It can stop the scheduled no-response sequence while an approved AI or human conversation continues. Keep those responsibilities distinct and visible." },
    ],
    relatedSlugs: ["multi-step-sms-follow-up-campaign", "ai-texting-and-calling-crm", "crm-bulk-campaign-assignment-checklist"],
    relatedPages: [{ href: "/sms-follow-up-for-sales-teams", label: "Create responsive follow-up campaigns" }],
  },
  {
    slug: "sms-delivery-rate-vs-reply-rate",
    metaTitle: "SMS Delivery Rate vs. Reply Rate: What Each Means",
    title: "Delivery rate vs. reply rate: measure what happened after the send",
    description: "Define SMS delivery, reply, conversation and appointment metrics with clear denominators and campaign examples for sales teams.",
    excerpt: "A delivered message is not a conversation. Use a simple funnel with explicit denominators to see where a campaign actually loses leads.",
    tags: ["Analytics", "Deliverability", "Campaigns"],
    intro: [
      "Two dashboards can report different reply rates for the same campaign because they divide by different totals. One uses sent messages, another uses delivered contacts, and a third counts every response rather than unique people.",
      "Before comparing performance, define the funnel. A shared set of denominators lets agents and managers discuss whether the problem is delivery, relevance, handling or appointment conversion.",
    ],
    sections: [
      { heading: "Distinguish messages, segments and people", paragraphs: [
        "One contact may receive several messages, and one long message may produce several SMS segments. Keep those units separate. Use segment totals for usage analysis and unique contact totals for most audience conversion questions.",
        "A campaign that sends three texts to 100 people has 100 contacted people and up to 300 message attempts, with potentially more segments. Calling the latter '300 leads reached' overstates the audience.",
      ] },
      { heading: "Use an explicit delivery denominator", paragraphs: [
        "Define message delivery rate as finalized delivered messages divided by the comparable submitted message attempts, excluding or separately reporting pending records. Explain how failures before provider submission are treated.",
        "Provider delivery statuses describe network handling; they do not prove that a person read the message. Telnyx's metrics documentation distinguishes sent, delivered and inbound activity. Keep that distinction in the agency report instead of labeling delivery as engagement.",
      ] },
      { heading: "Calculate unique-contact reply rate", paragraphs: [
        "For a sales campaign, count unique people who replied during a defined attribution window. Divide by the eligible contacted cohort or delivered-contact cohort, then label which denominator you used. Multiple replies from one enthusiastic prospect should not inflate audience response.",
        "Illustration: 1,000 contacted people, 900 with at least one delivered message and 90 unique replies produce a 9% contacted-person reply rate or a 10% delivered-person reply rate. Both calculations can be correct; they answer different questions.",
      ] },
      { heading: "Separate replies from useful conversations", paragraphs: [
        "A wrong-number report, opt-out and qualified buying question are all inbound responses, but their business meaning differs. Classify responses without hiding negative outcomes. Track qualified conversations and appointments independently.",
        "Using the same example, if 30 of the 90 responders book, the responder-to-booking rate is 33.3%, while the contacted-person booking rate is 3%. Do not present the larger figure without its denominator or imply the illustration is a platform benchmark.",
      ] },
      { heading: "Diagnose one funnel stage at a time", paragraphs: [
        "Low delivery calls for reviewing numbers, registration, errors, content and list quality. Healthy delivery with few replies calls for reviewing message fit and audience context. Many replies with few bookings may indicate slow handling, weak qualification or limited availability.",
        "Compare like-for-like cohorts and consistent observation windows. A campaign launched yesterday should not be judged against one that has completed a two-week sequence. Preserve the definitions with the report so weekly changes remain interpretable.",
      ] },
    ],
    keyTakeaways: ["Keep SMS segments, messages and unique contacts separate.", "Delivery is a network status, not proof of reading.", "Label every percentage's denominator and attribution window.", "Review reply quality and appointments separately from total inbound activity."],
    faq: [
      { question: "What is a good SMS reply rate?", answer: "There is no useful universal number without audience, consent, message purpose, cadence and denominator. Establish a baseline from comparable campaigns, then measure improvements at each funnel stage." },
      { question: "Should opt-outs count as replies?", answer: "They can be included in total inbound response counts, but report them separately from interested conversations. A higher reply rate caused by more opt-outs is not improved sales performance." },
    ],
    relatedSlugs: ["sales-rep-texting-kpis", "sms-marketing-roi-metrics", "business-texting-number-deliverability"],
    relatedPages: [{ href: "/mass-texting-crm", label: "Track campaign activity and replies" }],
    sources: [{ href: "https://developers.telnyx.com/api/messaging/get-messaging-profile-metrics", label: "Telnyx: sent, delivered and inbound messaging metrics" }],
  },
  {
    slug: "lead-source-attribution-utm-campaigns",
    metaTitle: "Lead Source Attribution for SMS Campaigns and Agencies",
    title: "Which lead source produced the appointment? Build an attribution record you can trust",
    description: "Connect vendor IDs, UTM fields, campaign enrollment and appointment outcomes without overwriting the original source of an insurance lead.",
    excerpt: "The last campaign is not necessarily the original lead source. Preserve both so your agency can see which acquisition channels and follow-ups contribute.",
    tags: ["Analytics", "Lead management", "Insurance"],
    intro: [
      "A lead arrives from a vendor, receives two texts, replies to a callback campaign and books with an agent. If the CRM now labels the source only as 'Callback campaign,' the acquisition report loses the information needed to evaluate the vendor.",
      "Attribution becomes useful when you separate where the person came from, which communications they received and what happened afterward. You do not need an elaborate model to begin; you need consistent fields and a clear question.",
    ],
    sections: [
      { heading: "Keep acquisition source separate from campaign membership", paragraphs: [
        "Record the originating channel, vendor name, external lead ID and acquisition timestamp. For web traffic, retain the available UTM source, medium and campaign values at intake. Store identifiers as text so leading zeros and vendor prefixes survive imports.",
        "A CRM campaign is an operational sequence, not a substitute for an acquisition source. Keep enrollment records with campaign ID, enrollment time and exit reason. Reenrolling the person later should add history rather than rewrite the original vendor.",
      ] },
      { heading: "Define the outcome and its timestamp", paragraphs: [
        "An appointment requested, an appointment booked and an appointment attended are different events. Choose the event you want to explain, then capture its time and stable contact or appointment identifier. Repeated reschedules should not appear as several newly acquired customers.",
        "For example, a quote-request lead purchased on Monday may book on Thursday after a Wednesday reply. Preserve all three dates. They reveal acquisition age, follow-up timing and the delay between conversation and booking.",
      ] },
      { heading: "Start with two understandable views", paragraphs: [
        "A first-source view groups outcomes by the original acquisition channel. It helps answer which vendor or website generates useful opportunities. A latest-eligible-campaign view groups outcomes by a defined recent enrollment or interaction. It helps evaluate the follow-up process.",
        "Neither view proves causation. A booked lead may have interacted with several campaigns and a phone call. Label the attribution rule, its lookback window and how overlapping activity is handled. Avoid presenting two attributed totals as additive revenue.",
      ] },
      { heading: "Reconcile a small sample before trusting the dashboard", paragraphs: [
        "Choose ten booked appointments and trace each from intake to outcome. Confirm source fields, duplicate merges, enrollment history and agent ownership. Check a contact that changed agents and another that returned after several months.",
        "If records disagree, fix the intake mapping or outcome event before expanding the report. A beautiful chart built from overwritten fields produces confident but unreliable decisions. Keep unknown sources visible instead of assigning them to the most convenient channel.",
      ] },
      { heading: "Use the report to choose the next experiment", paragraphs: [
        "Compare sources on comparable cohorts: acquisition period, product interest, eligible audience and observation time. Include lead cost, delivered contacts, useful replies, booked appointments and attendance when those records are available.",
        "Suppose Vendor A has more bookings but Vendor B has more attended appointments per dollar. That suggests a different purchasing decision than booking volume alone. Change one intake or follow-up variable at a time, document it, and evaluate after the agreed observation period.",
      ] },
    ],
    keyTakeaways: ["Preserve original source and vendor IDs through later campaign changes.", "Record bookings, reschedules and attendance as distinct outcomes.", "Publish the attribution rule alongside the report.", "Audit real contact histories before using source metrics to buy more leads."],
    faq: [
      { question: "Should I use UTM campaign as the CRM campaign name?", answer: "You can map the value into a separate acquisition field. Keep the CRM campaign's own identifier and enrollment history because one acquired lead may later enter several follow-up sequences." },
      { question: "Which attribution model is best for a small agency?", answer: "Begin with original-source reporting and a clearly labeled recent-campaign view. More complex weighting is useful only after source, interaction and outcome records are dependable." },
    ],
    relatedSlugs: ["sms-delivery-rate-vs-reply-rate", "crm-for-purchased-insurance-leads", "sms-marketing-roi-metrics"],
    relatedPages: [{ href: "/sms-crm-for-insurance-agents", label: "Organize insurance lead follow-up" }],
  },
  {
    slug: "cost-per-booked-insurance-appointment",
    metaTitle: "Calculate Cost per Booked Insurance Appointment",
    title: "How much did that appointment cost? A practical agency calculation",
    description: "Calculate cost per booked and attended appointment using lead spend, communication usage and operating costs, with transparent example math.",
    excerpt: "Compare acquisition sources and campaigns with a complete cost calculation, then separate booked appointments from people who actually attend.",
    tags: ["Analytics", "Insurance", "Billing"],
    intro: [
      "An inexpensive lead can become an expensive appointment when it needs extensive cleanup and repeated follow-up. A more expensive source can be economical if agents reach the right people quickly.",
      "Cost per appointment connects acquisition, communication and operating effort to a defined outcome. It is a planning metric, not a promise of revenue. The calculation below uses illustrative numbers so you can replace them with your agency's actual records.",
    ],
    sections: [
      { heading: "Choose the cohort before adding costs", paragraphs: [
        "Define the audience and observation period, such as eligible quote-request leads acquired from one source during a specific month and observed for 30 days. Keep that cohort fixed even when leads reply in the following month.",
        "Do not compare a completed cohort with one acquired yesterday. Use a consistent maturity window and disclose incomplete outcomes. Count unique appointments according to your rule rather than counting every calendar reschedule as another booking.",
      ] },
      { heading: "List the costs that belong to that cohort", paragraphs: [
        "Start with acquisition spend and identifiable communication usage. Add an explicit allocation of platform subscriptions, numbers, AI usage or other operating costs when appropriate. Keep taxes and credits consistent across the sources you compare.",
        "Agent time can be included if you have a reasonable measurement and cost assumption. Document that assumption separately. Do not mix a source with fully allocated labor costs against another source with lead spend alone.",
      ] },
      { heading: "Calculate booked and attended costs separately", paragraphs: [
        "Illustration: a cohort costs $1,200 in leads, $80 in attributable communication usage and $120 in allocated operating costs. The total is $1,400. If it produces 35 unique bookings, cost per booked appointment is $1,400 divided by 35, or $40.",
        "If only 25 of those appointments are attended, cost per attended appointment is $56. These are example calculations, not Text2Sale performance statistics or insurance industry benchmarks. A zero-booking cohort has no finite cost per booking; show its spend and zero outcomes.",
      ] },
      { heading: "Explain the difference instead of chasing one number", paragraphs: [
        "A low booking cost can hide a high no-show rate, unsuitable product interest or agents booking conversations they cannot serve. Pair the cost with attendance, qualification and the next useful business outcome.",
        "If an agency reduces booking cost from $50 to $40 but attendance falls sharply, the change may not be an improvement. Review reminder timing, expectations and qualification before buying more of the same audience.",
      ] },
      { heading: "Create a monthly decision sheet", paragraphs: [
        "For each source, record eligible leads, total attributed cost, unique bookings, attended appointments and the formulas used. Add notes for unusual credits, incomplete data and operational changes. Preserve the original exported totals for reconciliation.",
        "Use a small controlled test when changing vendors or campaign cadence. Keep the eligibility criteria and cost treatment stable. The goal is to understand where agent effort and acquisition money produce useful conversations, not to make the report look favorable.",
      ] },
    ],
    keyTakeaways: ["Fix the audience and observation window before calculating cost.", "Include comparable cost categories for every source.", "Report cost per booking and cost per attended appointment separately.", "Illustrative math and platform performance claims are different things."],
    faq: [
      { question: "Should a CRM subscription be included in appointment cost?", answer: "You can allocate it using a consistent method, such as eligible lead share or agent usage. Label the allocation and also keep a direct-cost view if that helps purchasing decisions." },
      { question: "Does low appointment cost mean the campaign is profitable?", answer: "No. Profitability also depends on conversion, revenue, servicing costs and other business factors. Appointment cost measures one stage of the funnel." },
    ],
    relatedSlugs: ["lead-source-attribution-utm-campaigns", "sms-marketing-roi-metrics", "measuring-ai-appointment-setting"],
    relatedPages: [{ href: "/sms-follow-up-for-sales-teams", label: "Connect follow-up with appointment outcomes" }],
  },
  {
    slug: "audit-speed-to-lead-sales-team",
    metaTitle: "Audit Speed to Lead: Timestamps, Median and Tail Delays",
    title: "Audit your speed to lead before adding more automation",
    description: "Measure acquisition, delivery, first outreach and human response delays with a practical timestamp audit for insurance and sales teams.",
    excerpt: "A campaign can send quickly while the rep still answers slowly. Trace the timestamps to find the delay that actually needs attention.",
    tags: ["Lead management", "Analytics", "Sales teams"],
    intro: [
      "A dashboard that says 'first message sent in one minute' does not explain whether a vendor held the lead for an hour or a prospect waited until the next morning for an answer. Each delay belongs to a different part of the process.",
      "A speed audit follows the same lead through acquisition, CRM intake, outbound contact and inbound handling. It gives managers a specific operating problem to fix before they add another automated message.",
    ],
    sections: [
      { heading: "Choose four timestamps with clear meanings", paragraphs: [
        "Record the source creation time when available, CRM receipt time, first eligible outreach attempt and the first useful human response after an inbound message. Use one time standard for calculations and show the contact's local time for operating decisions.",
        "Also retain provider status time if you need to analyze delivery. A message created in the CRM, accepted by a provider and delivered by a network are separate events. A queued message is not automatically a completed contact attempt.",
      ] },
      { heading: "Calculate delays by stage", paragraphs: [
        "Source-to-receipt measures delivery lag. Receipt-to-outreach measures intake and campaign handling. Reply-to-human-response measures conversation coverage. Analyze these separately so a vendor delay is not blamed on the rep.",
        "Example: a source creates a lead at 10:00, the CRM receives it at 10:20, a text is attempted at 10:22, and a 10:25 reply gets a human answer at 11:10. The respective delays are 20 minutes, 2 minutes and 45 minutes. The last stage needs a different fix from the first.",
      ] },
      { heading: "Use median and slower-case views", paragraphs: [
        "The median shows the middle experience and is less affected by a few very long delays than the average. A slower-case measure such as the 90th percentile highlights leads experiencing substantial waits. State the sample size and period alongside both.",
        "Inspect the individual delayed records. A small dataset, missing source time or a contact intentionally deferred until an allowed sending window can distort interpretation. Keep missing measurements separate rather than replacing them with zero.",
      ] },
      { heading: "Account for hours, ownership and exceptions", paragraphs: [
        "Split in-hours and out-of-hours intake when evaluating team coverage. Respect the applicable sending rules and contact preferences; reducing a clock measurement does not justify contacting people at an inappropriate time.",
        "Review records with no assigned owner, agent reassignment, duplicate imports, registration blocks or insufficient account funds. Use an exception reason so the report distinguishes avoidable inactivity from an intentional eligibility hold.",
      ] },
      { heading: "Run one targeted improvement", paragraphs: [
        "If source delivery is slow, discuss intake timing with the vendor. If CRM processing is delayed, inspect routing and enrollment. If replies wait too long, change coverage, notifications or ownership rules. Match the intervention to the measured stage.",
        "Repeat the audit on a comparable cohort after the change. Track useful replies and appointments alongside speed so you can see whether faster handling actually helps. Avoid using a universal speed target without considering your audience, hours and process.",
      ] },
    ],
    keyTakeaways: ["Measure intake, outreach and response delays separately.", "Retain timestamp meanings and time zones.", "Use median plus a slower-case view with sample size.", "Fix the delayed stage and verify business outcomes afterward."],
    faq: [
      { question: "Is the first automated text the same as a rep response?", answer: "No. Track the initial outreach and the useful response to a prospect separately. Fast automation can coexist with slow conversation handling." },
      { question: "Should overnight leads count as slow?", answer: "Keep elapsed time visible, but evaluate coverage with an additional hours-aware view. Explain the sending window and intentional holds rather than hiding them." },
    ],
    relatedSlugs: ["how-fast-to-text-insurance-leads", "sales-rep-texting-kpis", "send-windows-and-time-zones-by-contact"],
    relatedPages: [{ href: "/sales-team-texting-crm", label: "Review the sales communication workspace" }],
  },
  {
    slug: "test-ai-sales-assistant-before-launch",
    metaTitle: "Test an AI Sales Assistant Before Automatic Sending",
    title: "An AI assistant launch test: the conversations to rehearse before going live",
    description: "Build a practical AI assistant test set for sales texting with ambiguous replies, opt-outs, wrong numbers, scheduling conflicts and human escalation.",
    excerpt: "A friendly greeting is the easy test. Rehearse the difficult replies and verify the resulting actions before enabling automatic messaging.",
    tags: ["AI", "Appointment setting", "Sales teams"],
    intro: [
      "An assistant can sound warm and still choose the wrong next action. It might treat 'yes' as a confirmed appointment, continue after a wrong-number report or answer a question that belongs with a licensed professional.",
      "Before allowing automatic sending, test both the words and the workflow. Start with internal phone numbers and a written expected outcome for each scenario. The purpose is to reveal uncertainty while it is easy to correct.",
    ],
    sections: [
      { heading: "Write the assistant's boundary first", paragraphs: [
        "State its business identity, approved goal, information it may collect and topics it must escalate. Define whether it suggests messages, sends automatically, qualifies interest or books appointments. An instruction to 'close every lead' is too vague for a dependable launch test.",
        "For insurance outreach, keep coverage recommendations and suitability decisions with the appropriate human professional. Train the assistant to collect relevant scheduling context and route questions, without promising eligibility, savings or benefits it cannot verify.",
      ] },
      { heading: "Build a compact but varied test set", paragraphs: [
        "Include clear interest, clear disinterest, an opt-out, a wrong number, an existing appointment, a requested callback and a request for a person. Add incomplete replies such as 'sure' and 'next week,' which require clarification.",
        "Test a message containing several instructions: 'I can talk Friday, but please stop texting and have Jamie call.' The expected result should honor the channel preference and hand off the callback; it should not continue a booking conversation simply because Friday appears.",
      ] },
      { heading: "Score actions as well as wording", paragraphs: [
        "For each case, record the expected response, campaign stop or pause, owner notification and next task. Check that the real system state matches the message. 'I've stopped the reminders' is incorrect if the scheduled messages remain active.",
        "Use simple outcomes: passed, needs revision or blocked. Record the exact input, observed output, configuration version and reason. Do not use a polished answer as evidence of passing when the contact was routed incorrectly.",
      ] },
      { heading: "Challenge scheduling and missing information", paragraphs: [
        "Test unavailable time slots, time-zone ambiguity, dates around daylight-saving changes and a prospect changing their mind. Confirm that the assistant asks for clarification when necessary and only claims a booking after the booking action succeeds.",
        "Remove a required detail and observe behavior. A system should not invent a ZIP code, agent availability or business policy to complete its goal. Provide an approved fallback or route the thread to a human.",
      ] },
      { heading: "Launch narrowly and review real exceptions", paragraphs: [
        "Begin with a small eligible audience after the internal tests pass. Review the first conversations closely and make takeover easy. Pause expansion when incorrect actions, confusing promises or missed handoffs appear.",
        "Retest the affected scenarios whenever you change prompts, goals, calendars or campaign rules. Keep the test set as an operating checklist rather than treating launch approval as permanent. Good instructions evolve from observable failures and business feedback.",
      ] },
    ],
    keyTakeaways: ["Define an approved goal and clear escalation boundaries.", "Test opt-outs, ambiguity, wrong numbers and mixed requests.", "Verify campaign and calendar actions, not only message quality.", "Use a small pilot and retest when configuration changes."],
    faq: [
      { question: "How many scenarios should I test?", answer: "Start with the common and high-consequence replies your team receives, then add examples from actual exceptions. Coverage of different outcomes matters more than an arbitrary scenario count." },
      { question: "Can the AI handle every insurance question?", answer: "Do not assume that. Define which factual business questions it may answer and route professional advice or uncertain claims to an appropriate human." },
    ],
    relatedSlugs: ["writing-instructions-for-an-ai-appointment-setter", "ai-qualifying-questions-before-booking", "sms-stop-on-reply-campaign-rules"],
    relatedPages: [{ href: "/ai-texting-crm", label: "Explore AI-assisted sales conversations" }],
  },
  {
    slug: "ai-texting-human-takeover-workflow",
    metaTitle: "AI Texting Human Takeover: Ownership and Resume Rules",
    title: "How to hand an AI conversation to a person without double texting",
    description: "Define global AI settings, conversation ownership, campaign pauses and explicit resume rules so agents and assistants do not send conflicting replies.",
    excerpt: "A takeover button needs a clear operating rule behind it. Make the owner, paused automation and next action visible to everyone handling the thread.",
    tags: ["AI", "Conversations", "Sales teams"],
    intro: [
      "A prospect asks a complicated question. The agent starts typing while the assistant is also preparing a response. Both messages arrive, and the prospect now has two answers and no clear sense of who is helping.",
      "Human takeover should transfer responsibility, not merely open the conversation. Define what pauses, who owns the next response and what must happen before automation can resume.",
    ],
    sections: [
      { heading: "Distinguish workspace permission from thread ownership", paragraphs: [
        "A workspace AI setting describes whether automatic assistance is allowed generally. A conversation setting describes whether the assistant may act in a particular thread. A global enabled setting should not silently undo a deliberate human takeover.",
        "Document how these settings interact in your CRM and test the actual behavior. Agents need to know whether turning off one thread also pauses scheduled campaigns, or whether those controls must be handled separately.",
      ] },
      { heading: "Create a handoff record with useful context", paragraphs: [
        "Record the reason for escalation, current owner, prospect's request and next promised action. A short note such as 'Asked about family coverage; wants Jamie to call after 4 PM Eastern' is more useful than 'AI stopped.'",
        "Preserve the recent messages and any collected information. Avoid making the prospect repeat what the assistant already asked. If the assistant made an uncertain statement, flag it for the agent to verify before responding.",
      ] },
      { heading: "Pause competing sends at the same time", paragraphs: [
        "Inspect AI automatic replies, no-response campaign steps and separately scheduled messages. Taking control of the thread should be paired with whatever pauses are needed to prevent conflicting contact. Confirm how the platform treats work already submitted to the provider.",
        "Test takeover just before a planned send and while a reply is being processed. A message already dispatched may not be recallable. Clear event handling and last-moment eligibility checks reduce avoidable collisions.",
      ] },
      { heading: "Give the human a specific next action", paragraphs: [
        "The handoff should end in a task, callback, clarification or resolved conversation. Set a due time and coverage owner when the original agent is unavailable. A thread labeled 'human' without a responsible person can become an unattended queue.",
        "When responding, acknowledge the existing context: 'I saw your question about the appointment. I can help with the next step.' Avoid claiming the person spoke to a human earlier if they were interacting with an assistant.",
      ] },
      { heading: "Resume only after checking the new state", paragraphs: [
        "Before returning the thread to automation, confirm whether the person booked, opted out, changed channel preference or needs a continuing human conversation. Update the assistant goal and active campaign when the situation has changed.",
        "Resume deliberately and review the first resulting action. Do not reactivate an old no-response sequence simply because the agent has finished a call. The conversation history should determine the next step.",
      ] },
    ],
    keyTakeaways: ["Global AI permission and conversation ownership are separate decisions.", "A handoff needs context, an owner and a due action.", "Pause conflicting campaign and AI sends together.", "Resume deliberately after reviewing the contact's current state."],
    faq: [
      { question: "Does turning off AI stop a scheduled campaign?", answer: "That depends on the system and configuration. Verify the interaction directly and include campaign pauses in your takeover checklist when they are separate controls." },
      { question: "When should an assistant hand over to a person?", answer: "Examples include a requested human, professional advice, uncertain facts, complaints or repeated misunderstanding. Define the boundaries before automatic sending begins." },
    ],
    relatedSlugs: ["test-ai-sales-assistant-before-launch", "writing-instructions-for-an-ai-appointment-setter", "archive-vs-delete-crm-conversations"],
    relatedPages: [{ href: "/ai-texting-crm", label: "Manage AI and human conversation handoffs" }],
  },
  {
    slug: "lead-vendor-webhook-retries-idempotency",
    metaTitle: "Lead Vendor Webhook Retries Without Duplicate Outreach",
    title: "One delivered lead, one enrollment: design vendor webhooks for retries",
    description: "Plan lead delivery integrations with stable event IDs, secure authentication, durable receipt records and separate campaign enrollment checks.",
    excerpt: "A vendor can retry a successful delivery when its acknowledgment gets lost. Design the intake and campaign enrollment rules so that retry does not trigger another first text.",
    tags: ["Integrations", "Lead management", "Campaigns"],
    intro: [
      "Your CRM receives a lead and creates the contact, but the vendor does not receive the acknowledgment before its timeout. It sends the payload again. Without duplicate protection, the agency may get two records or enroll one person in the same campaign twice.",
      "Treat retries as an ordinary integration condition. Agree on an event identity, persist receipt information and make the enrollment decision independently of contact creation. This guide describes a design to review with your developer and vendor, not a promise that every integration already implements it.",
    ],
    sections: [
      { heading: "Agree on an event ID and delivery contract", paragraphs: [
        "Ask for a stable event ID that remains unchanged across retries, plus a vendor lead ID and event type. A new lead, correction and reassignment may be separate events concerning the same person. A phone number alone cannot distinguish them.",
        "Document field names, required values, authentication, acknowledgment rules and retry behavior. Preserve the external identifiers in the intake record. If the vendor supplies no event ID, agree on a deterministic identifier before using automated campaign enrollment.",
      ] },
      { heading: "Authenticate and store before acknowledging", paragraphs: [
        "Validate the integration credential or documented signature and the payload before treating the delivery as accepted. Keep API keys in protected configuration; do not publish them in a blog, spreadsheet, support screenshot or URL shared with unrelated parties.",
        "Persist an accepted event or durable queue entry, then acknowledge according to the vendor contract. If persistence fails, returning success can lose the lead. Long-running cleanup, routing and enrollment can happen after a durable receipt rather than inside the acknowledgment path.",
      ] },
      { heading: "Make duplicate protection survive multiple workers", paragraphs: [
        "Use a persistent uniqueness rule scoped to the workspace, vendor and event ID. An in-memory list disappears during restarts and does not coordinate multiple application instances. Keep processing state so a repeated event can resume safely or return its recorded result.",
        "The same principle applies to communication-provider callbacks. Telnyx advises guarding against repeated webhook events and verifying signatures. Lead-vendor endpoints have their own contracts, so confirm their specific behavior instead of copying one provider's retry timing.",
      ] },
      { heading: "Check campaign eligibility separately", paragraphs: [
        "An existing contact is not automatically an eligible new enrollment. Check opt-outs, current conversation ownership, active enrollments, recent outreach and the configured purpose. A field correction should not resend the introduction unless that is an explicit approved action.",
        "Record the enrollment decision and reason against the event. Distinguish 'contact updated, no new enrollment' from 'new eligible lead enrolled.' That gives support a useful explanation when the vendor reports a successful delivery but the agent sees no new text.",
      ] },
      { heading: "Rehearse uncertain outcomes", paragraphs: [
        "Test the exact same event twice, a timeout after receipt, malformed fields, an unavailable database and two simultaneous deliveries. Also test a legitimate update with the same lead ID and a different event ID. Verify contact totals and enrollment totals after each case.",
        "Use safe test numbers and redact credentials from logs. Monitor failed or stuck processing with an owner and retry policy. A reliable integration tells you which stage completed, which is uncertain and how to recover without starting outreach again blindly.",
      ] },
    ],
    keyTakeaways: ["A retry needs the same stable event identity.", "Acknowledge after durable acceptance, according to the vendor contract.", "Persist duplicate protection across restarts and workers.", "Contact updates and campaign enrollments require separate decisions."],
    faq: [
      { question: "Is matching on phone number enough to prevent duplicate deliveries?", answer: "It can help identify a contact, but it does not identify the delivery event or prove that a new campaign enrollment is appropriate. Use stable source identifiers and enrollment checks as well." },
      { question: "Should every repeated webhook return an error?", answer: "Follow the vendor contract. A previously accepted event can often be acknowledged without repeating its actions. Return errors for actual failures that need retry, not simply because the event was seen before." },
    ],
    relatedSlugs: ["sms-crm-integration", "crm-contact-deduplication-phone-email", "csv-reenrollment-without-duplicate-texts"],
    relatedPages: [{ href: "/sales-team-texting-crm", label: "Connect lead intake with sales follow-up" }],
    sources: [{ href: "https://support.telnyx.com/en/articles/4334722-how-to-leverage-webhooks", label: "Telnyx: webhook acknowledgments, duplicate events and signature verification" }],
  },
  {
    slug: "crm-migration-optout-suppression-checklist",
    metaTitle: "CRM Migration Checklist for Opt-Outs and Suppression",
    title: "Move the do-not-contact history before you move the campaign",
    description: "Preserve opt-outs, wrong-number flags, contact preferences and consent context during a CRM migration before enabling messaging in the new workspace.",
    excerpt: "A new CRM account does not make an old audience newly eligible. Migrate suppression and contact history before switching on outreach.",
    tags: ["Lead management", "Conversations", "CRM migration"],
    intro: [
      "A contact export often looks complete because it includes names and phone numbers. The dangerous omissions are less visible: an opt-out date, a wrong-number note, an unresolved complaint or the reason the old CRM stopped messaging.",
      "Make suppression the first migration workstream. The goal is to preserve contact choices and useful operating context while the team changes tools. Registration with a provider does not replace the need to evaluate each audience's eligibility.",
    ],
    sections: [
      { heading: "Inventory suppression wherever it lives", paragraphs: [
        "Review the old CRM, messaging provider, spreadsheets, vendor records and manual agent notes. Identify global opt-outs, number-level blocks, channel preferences, wrong-number flags and internal holds. These records may not all be included in a default contact export.",
        "Record the source and timestamp when available. Separate a person's request to stop texting from a technical delivery failure. Do not flatten every non-active record into one ambiguous status that the new team cannot interpret.",
      ] },
      { heading: "Normalize matching keys carefully", paragraphs: [
        "Standardize phone numbers with explicit country context and retain original values for reconciliation. Keep email and external IDs as supporting keys. A misplaced country code can cause a suppression record to miss its corresponding contact.",
        "Handle shared numbers and conflicting records conservatively. If one matching record is opted out and another looks active, flag the conflict before enabling sends. Do not choose the active value merely because it makes the import easier.",
      ] },
      { heading: "Map operational flags and consent context", paragraphs: [
        "Document which destination field or suppression mechanism represents each source status. Carry the consent source, evidence reference and recorded time where available. Missing evidence should remain missing; do not manufacture a consent date during migration.",
        "Create a separate hold reason for unresolved records. An archived conversation may still need suppression, while an active conversation may already be opted out. Folder location is not a reliable messaging-eligibility rule.",
      ] },
      { heading: "Verify suppression before enrolling anyone", paragraphs: [
        "Use internal test records representing an opt-out, wrong number, missing consent context and eligible contact. Attempt the planned enrollment or send path and confirm the expected outcomes. Reconcile imported suppression totals against the source.",
        "Check all send paths you intend to use: campaign, manual message, AI response and vendor-triggered enrollment. A block that works in one screen but is ignored by an integration leaves the migration incomplete.",
      ] },
      { heading: "Control the overlap period", paragraphs: [
        "Choose which system owns new outreach and stop competing campaigns during cutover. Keep the old system accessible for reconciliation where your retention arrangements allow it. Document how new opt-outs received during the transition reach the new workspace.",
        "Run a small eligible pilot after the suppression checks pass. Review exceptions and source totals before expanding. Exporting contacts is a technical step; preserving their history is what makes the operational move dependable.",
      ] },
    ],
    keyTakeaways: ["Export suppression from every relevant system, not only contacts.", "Keep opt-outs distinct from delivery failures and archive status.", "Resolve conflicting flags before enabling outreach.", "Test suppression across campaigns, manual sends, AI and integrations."],
    faq: [
      { question: "Can I reset opt-outs when moving to a new CRM?", answer: "A change of software does not erase the contact's request or establish new consent. Preserve the suppression and handle any legitimate renewed permission under the applicable rules and provider policies." },
      { question: "Do I need to migrate every historical message?", answer: "Determine what the destination supports and what your retention requirements require. At minimum, preserve the actionable suppression, preferences, evidence references and context needed to handle the person appropriately." },
    ],
    relatedSlugs: ["switching-sms-providers", "sms-consent-records", "crm-contact-deduplication-phone-email"],
    relatedPages: [{ href: "/sms-crm-for-insurance-agents", label: "Plan a move to a connected texting workspace" }],
  },
  {
    slug: "10dlc-business-website-readiness-checklist",
    metaTitle: "10DLC Website Readiness Checklist for Business Messaging",
    title: "Before you submit 10DLC: review the website a real visitor will see",
    description: "Review business identity, working pages, SMS opt-in evidence and consistent sample messages using Telnyx's published 10DLC guidance.",
    excerpt: "Buying a domain is one step. Check the live business pages, consent path and registration details together before submitting your messaging program.",
    tags: ["10DLC", "Onboarding", "Insurance"],
    intro: [
      "A domain purchase receipt is not evidence that a business website is ready for messaging review. The reviewer needs to understand the actual business and how someone agrees to receive the proposed texts.",
      "Use the live site in a signed-out browser and compare it with your registration. Telnyx publishes campaign compliance and approval guidance; review the current requirements for your use case. This checklist organizes that review and does not guarantee approval or replace legal advice.",
    ],
    sections: [
      { heading: "Confirm that the business identity is consistent", paragraphs: [
        "Compare the business name, business activity, website and representative contact information with the registration. Explain any trading name in a way that a visitor can understand. Avoid copying generic content for a different company or a different service.",
        "Telnyx's approval guidance calls for consistency between the brand, website, sample messages and use case. Review these as one package rather than completing each field in isolation.",
      ] },
      { heading: "Test the published pages, not the editor preview", paragraphs: [
        "Open the production domain over HTTPS, navigate its main pages and test contact links. Check mobile readability, obvious placeholders, broken links and whether the business purpose is clear. A parked domain or unavailable preview does not describe an operating business.",
        "Publish accurate contact information and reachable privacy and messaging terms pages. Check the exact URLs referenced in the registration. A footer link that opens an empty page or requires an administrator login is not useful evidence.",
      ] },
      { heading: "Review the actual SMS opt-in path", paragraphs: [
        "Identify how the subscriber provides their number and agrees to this messaging program. If it is a web form, inspect the signed-out form and its disclosures. If it is another process, document that actual process rather than describing a web checkbox nobody uses.",
        "Telnyx's campaign compliance requirements specify disclosures and evidence for the opt-in method, including program identity, message expectations and opt-out or help information. Use the current provider guidance to check your exact form; do not assume a general contact request covers every communication channel.",
      ] },
      { heading: "Match the message flow to real examples", paragraphs: [
        "Describe the path a visitor takes and supply the relevant evidence where required. Sample texts should show the business and purpose that the site describes. An appointment-reminder use case and a prospecting sequence are different programs.",
        "Use realistic samples without personal prospect data. Check personalization fallbacks, sender identity and opt-out handling against the applicable provider requirements. Do not invent a consent process or sample use case simply because it appears easier to approve.",
      ] },
      { heading: "Keep a dated readiness record", paragraphs: [
        "Save the final page URLs, screenshots of the actual opt-in path and the registration details you submitted. Keep tax documents and private registration data in protected storage, not public website links. Record changes made after review feedback.",
        "Brand verification, campaign review and number assignment remain distinct parts of setup. A published website supports the application; it does not authorize sending by itself. Wait for the relevant provider states and configuration to be ready before launching the audience.",
      ] },
    ],
    keyTakeaways: ["A purchased domain needs working, accurate production pages.", "Check the brand, site, use case and samples together.", "Document the actual opt-in path using current provider guidance.", "Website readiness is separate from campaign approval and number assignment."],
    faq: [
      { question: "Does creating a website guarantee 10DLC approval?", answer: "No. Review also considers the business, use case, message flow, samples and other required information. A functioning website is supporting evidence, not an approval guarantee." },
      { question: "Should an EIN certificate be linked publicly on the website?", answer: "No. Treat tax and identity documents as private registration materials and submit them through the provider's authorized secure process when required." },
    ],
    relatedSlugs: ["10dlc-registration-guide-for-agents", "sms-consent-records", "a2p-brand-vetting-explained"],
    relatedPages: [{ href: "/sms-crm-for-insurance-agents", label: "Plan insurance messaging setup and follow-up" }],
    sources: [
      { href: "https://support.telnyx.com/en/articles/7127078-10dlc-campaign-approval-best-practices", label: "Telnyx: 10DLC campaign approval best practices" },
      { href: "https://support.telnyx.com/en/articles/9940291-10dlc-campaign-compliance-requirements", label: "Telnyx: campaign compliance and opt-in requirements" },
      { href: "https://support-v2.telnyx.com/en/articles/10562019-guide-to-10dlc-message-flow-field", label: "Telnyx: documenting the message flow field" },
    ],
  },
  {
    slug: "10dlc-brand-verified-campaign-pending",
    metaTitle: "10DLC Brand Verified but Campaign Pending: What to Check",
    title: "Your 10DLC brand is verified. Why is messaging still not ready?",
    description: "Distinguish brand verification, campaign review and number assignment, then collect the right identifiers and status evidence before troubleshooting.",
    excerpt: "A verified business is only one part of messaging setup. Check campaign review and number assignment separately before interpreting the workspace as ready.",
    tags: ["10DLC", "Onboarding", "Deliverability"],
    intro: [
      "A business owner completes registration and sees a verified brand. They understandably expect to send immediately, but the campaign or its phone-number assignment may still need review or provisioning.",
      "Use a stage-by-stage status check. Do not resubmit the whole registration simply because one dashboard label says pending. Preserve the existing identifiers and determine which object has actually completed.",
    ],
    sections: [
      { heading: "Read brand identity and registration separately", paragraphs: [
        "The brand represents the business. Telnyx's brand response documents both identityStatus and a separate status field, along with identifiers and potential failure details. A label that displays one field alone may not summarize the entire setup.",
        "Record the provider brand ID, registry ID when available, current values and last checked time. Do not copy an EIN or private contact data into a public screenshot. For an integration issue, sanitized identifiers and states are often the useful starting evidence.",
      ] },
      { heading: "Find the campaign linked to that brand", paragraphs: [
        "The campaign describes the messaging program, purpose, samples and opt-in flow. Verify that a campaign record exists and belongs to the intended brand. A local draft or queued job is different from a campaign accepted by the provider for review.",
        "Telnyx's campaign creation guide describes a review after registration. Preserve the campaign ID and provider feedback. Avoid treating a successful submission response as final approval or assuming a finished website completes the campaign stage automatically.",
      ] },
      { heading: "Check number assignment after campaign readiness", paragraphs: [
        "An approved campaign still needs the sending number associated with it. Telnyx's number-assignment guidance explains that assignment can remain in progress after the association is requested. Verify the provider's assignment state, not only the local request history.",
        "Check the specific number and campaign together. A purchased number, messaging profile and campaign assignment are related but different records. A new number should not be assumed ready because another number in the workspace works.",
      ] },
      { heading: "Separate review waiting from a processing failure", paragraphs: [
        "Look for the most recent successful provider read, explicit feedback and any failed internal job. A stale dashboard, an unsuccessful API call and an ongoing external review require different actions. Collect the object IDs, timestamps and sanitized error text.",
        "If money was added after an insufficient-funds error, verify whether the application retried the intended step and recorded its result. Funding an account is not itself evidence that a brand, campaign or assignment completed. Avoid creating duplicates to test whether the balance fixed it.",
      ] },
      { heading: "Escalate with a concise status packet", paragraphs: [
        "Provide support with the brand ID, campaign ID, affected number, current states, last successful check and relevant error. Include a description of the intended use case without attaching private tax materials to an open ticket or public thread.",
        "Follow the current provider guidance for correction or review. There is no universal completion time for every registration. Keep broad sending paused until the campaign, number configuration and audience eligibility are confirmed, then use a small controlled test.",
      ] },
    ],
    keyTakeaways: ["Brand verification is separate from campaign review.", "Provider records and local drafts represent different stages.", "Verify the specific number's campaign assignment.", "Preserve identifiers and diagnose the failing stage before resubmitting."],
    faq: [
      { question: "Can a verified brand send without an approved campaign?", answer: "Do not interpret brand verification as full messaging readiness. Check the relevant campaign review, number assignment and provider configuration for the intended traffic." },
      { question: "Should I create another campaign if the first is pending?", answer: "First inspect the existing campaign and current feedback. Recreating records can introduce duplicates, fees or confusion without resolving the original issue." },
    ],
    relatedSlugs: ["10dlc-business-website-readiness-checklist", "a2p-brand-vetting-explained", "business-texting-number-deliverability"],
    relatedPages: [{ href: "/sms-crm-for-insurance-agents", label: "Connect messaging setup with your CRM" }],
    sources: [
      { href: "https://developers.telnyx.com/api-reference/brands/get-brand", label: "Telnyx: brand identity, registration status and identifiers" },
      { href: "https://support-v2.telnyx.com/en/articles/6339152-how-to-create-a-10dlc-campaign", label: "Telnyx: campaign creation and review" },
      { href: "https://support.telnyx.com/en/articles/11072276-10dlc-number-assignment-status", label: "Telnyx: checking number assignment status" },
    ],
  },
  {
    slug: "insurance-crm-demo-checklist-30-agent-agency",
    metaTitle: "Insurance CRM Demo Checklist for a 30-Agent Agency",
    title: "The CRM demo a 30-agent insurance agency should actually run",
    description: "Evaluate insurance CRMs with realistic lead routing, ownership, access, campaign controls, AI handoffs and reporting tests for a growing agency.",
    excerpt: "A single-rep demo cannot show how the system handles competing owners, coverage gaps and team reporting. Test the agency workflow before committing.",
    tags: ["Insurance", "CRM comparisons", "Sales teams"],
    intro: [
      "A CRM can feel effortless when one person demonstrates a clean contact. Thirty agents create different questions: who owns a lead, who can see it, what happens when someone is unavailable, and how the agency prevents competing outreach.",
      "Bring a realistic test script to every vendor, including Text2Sale. Confirm the availability and cost of each required capability in the current plan. Treat this as an evaluation checklist, not a claim that every CRM provides every team feature.",
    ],
    sections: [
      { heading: "Prepare records that expose real operating problems", paragraphs: [
        "Use internal sample contacts across two sources, several states, different time zones and different product interests. Include an existing customer, opted-out contact, duplicate vendor delivery and lead with missing information. Keep real applicant data out of a sales demo.",
        "Have a manager, assigned agent and covering agent perform the test from their intended roles. A vendor administrator's view can hide restrictions or missing permissions that the team will encounter after launch.",
      ] },
      { heading: "Test ownership from intake through reassignment", paragraphs: [
        "Deliver a lead through the intended vendor or import path and inspect its owner. Reassign it while a campaign is active, then ask the previous owner to open the thread. Confirm what happens to scheduled messages, notifications and recorded tasks.",
        "Ask how shared numbers, shared inboxes and individual agent identities work. Require a clear answer for after-hours coverage and employee departures. The agency should understand who is responsible for a reply at every point.",
      ] },
      { heading: "Inspect access and bulk-action controls", paragraphs: [
        "Test who can export contacts, delete records, edit campaigns, view billing, create API keys or enable AI. Confirm the supported role model and any plan restrictions. A permission checkbox is meaningful only if the underlying action is controlled.",
        "Select several contacts and attempt an archive or campaign assignment. Review the selection scope, suppression handling and audit record. An agency needs to know whether a manager's select-all action covers one page, the current filter or the entire database.",
      ] },
      { heading: "Run an unavailable-agent and AI escalation scenario", paragraphs: [
        "Reply to an automated message with a request for a licensed agent while the owner is unavailable. Observe whether the campaign pauses, the conversation gets an owner and the request reaches coverage. Then make a human takeover and verify that competing sends stop.",
        "Ask an agent to call an internal list consecutively and record outcomes. Confirm that callback notes, conversation context and appointments remain visible to the next responsible person. A fast dialer is useful only when the resulting work is organized.",
      ] },
      { heading: "Reconcile reporting and the full quote", paragraphs: [
        "Trace a sample booking into the manager's report and confirm the source, owner, attribution rule and observation period. Inspect exports so the agency can audit counts independently. A chart that cannot explain one contact is difficult to trust at larger scale.",
        "Request a quote showing seats, messaging usage, numbers, AI access, calling, setup costs and any required integrations. Document limitations and onboarding responsibilities. Choose a pilot with pass criteria before moving the full audience and agent team.",
      ] },
    ],
    keyTakeaways: ["Evaluate with realistic exceptions and actual user roles.", "Test ownership changes while automation is active.", "Verify bulk selection scope and access controls.", "Reconcile one booking and every required cost before the full rollout."],
    faq: [
      { question: "Should every agent attend the CRM demo?", answer: "Use representatives of the main roles first: manager, active seller and covering agent. Let a small pilot expose everyday issues before asking the whole team to change tools." },
      { question: "What should make us delay the migration?", answer: "Examples include unresolved suppression mapping, unclear ownership, missing required permissions or a failed lead-to-reply-to-booking test. Define your own pass criteria before the demonstration." },
    ],
    relatedSlugs: ["lead-distribution-for-sales-teams", "managing-team-texting-quality", "ringy-vs-text2sale-insurance-crm"],
    relatedPages: [{ href: "/sales-team-texting-crm", label: "Evaluate Text2Sale for your sales workflow" }],
  },
];

export const BLOG_POSTS_6: BlogPost[] = ARTICLES.map((article) => {
  const text = [article.title, ...article.intro,
    ...article.sections.flatMap((section) => [section.heading, ...section.paragraphs, ...(section.bullets || [])]),
    ...article.keyTakeaways, ...article.faq.flatMap((item) => [item.question, item.answer])].join(" ");
  return { ...article, datePublished: "2026-10-04", dateModified: "2026-10-04",
    readMinutes: Math.max(1, Math.ceil(text.split(/\s+/).length / 200)) };
});
