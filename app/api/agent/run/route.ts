import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildAiSystemPrompt } from "@/lib/ai-sales-prompts";
import { shouldAiSkipReply } from "@/lib/ai-decline-check";

// Proactive follow-up agent. Runs every hour (Vercel Cron).
// For accounts with agent_plan=true and conversations with agent_enabled=true,
// it decides whether to send a follow-up text when a lead has gone silent.
//
// Rules:
//  - Only follows up when the LAST message is inbound (lead spoke last)
//  - Waits at least 22 hours since the last message before following up
//  - Caps total agent follow-ups per conversation at 3
//  - Respects TCPA quiet hours (8am–9pm local time based on contact's area code)
//  - Stops if the contact has opted out
//  - Charges the wallet per normal AI reply + SMS rates

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const AI_MESSAGE_COST = 0.025;
const SMS_COST = 0.012;
const MIN_HOURS_SINCE_LAST = 22;
const MAX_FOLLOW_UPS = 3;

// Rough area-code -> timezone offset (hours from UTC, standard time).
// Good enough for TCPA 8am–9pm quiet-hour checks.
const AREA_CODE_TZ: Record<string, number> = {
  // Eastern (-5)
  "201": -5, "202": -5, "203": -5, "207": -5, "212": -5, "215": -5, "216": -5, "217": -5,
  "227": -5, "240": -5, "267": -5, "272": -5, "301": -5, "302": -5, "304": -5, "305": -5,
  "315": -5, "321": -5, "330": -5, "332": -5, "339": -5, "347": -5, "351": -5, "352": -5,
  "386": -5, "401": -5, "404": -5, "407": -5, "410": -5, "412": -5, "413": -5, "419": -5,
  "423": -5, "434": -5, "440": -5, "443": -5, "470": -5, "475": -5, "478": -5, "484": -5,
  "508": -5, "516": -5, "518": -5, "539": -5, "540": -5, "551": -5, "561": -5, "564": -5,
  "567": -5, "570": -5, "571": -5, "585": -5, "586": -5, "603": -5, "607": -5, "609": -5,
  "610": -5, "614": -5, "615": -5, "616": -5, "617": -5, "631": -5, "646": -5,
  "667": -5, "678": -5, "681": -5, "689": -5, "703": -5, "704": -5, "706": -5, "717": -5,
  "718": -5, "724": -5, "727": -5, "732": -5, "734": -5, "740": -5, "743": -5, "754": -5,
  "757": -5, "762": -5, "770": -5, "772": -5, "774": -5, "781": -5, "786": -5, "803": -5,
  "810": -5, "813": -5, "814": -5, "828": -5, "843": -5, "845": -5, "848": -5,
  "856": -5, "857": -5, "860": -5, "862": -5, "863": -5, "865": -5, "878": -5, "904": -5,
  "908": -5, "910": -5, "912": -5, "914": -5, "917": -5, "919": -5, "929": -5, "937": -5,
  "941": -5, "947": -5, "954": -5, "959": -5, "973": -5, "978": -5, "980": -5, "984": -5,
  // Central (-6)
  "205": -6, "210": -6, "214": -6, "218": -6, "219": -6, "220": -6, "224": -6, "225": -6,
  "228": -6, "229": -6, "251": -6, "254": -6, "256": -6, "260": -6, "262": -6, "270": -6,
  "281": -6, "309": -6, "312": -6, "314": -6, "316": -6, "318": -6, "319": -6, "320": -6,
  "325": -6, "331": -6, "334": -6, "337": -6, "346": -6, "361": -6, "364": -6, "402": -6,
  "405": -6, "409": -6, "414": -6, "417": -6, "430": -6, "432": -6, "469": -6, "479": -6,
  "501": -6, "502": -6, "504": -6, "507": -6, "512": -6, "515": -6, "573": -6, "580": -6,
  "601": -6, "618": -6, "620": -6, "630": -6, "636": -6, "641": -6, "651": -6,
  "662": -6, "682": -6, "701": -6, "708": -6, "712": -6, "713": -6, "715": -6, "731": -6,
  "737": -6, "763": -6, "769": -6, "773": -6, "785": -6, "806": -6, "815": -6, "816": -6,
  "817": -6, "830": -6, "832": -6, "847": -6, "850": -6, "870": -6, "901": -6, "903": -6,
  "913": -6, "915": -6, "920": -6, "931": -6, "936": -6, "940": -6, "956": -6, "972": -6,
  "979": -6, "985": -6,
  // Mountain (-7)
  "303": -7, "307": -7, "385": -7, "406": -7, "435": -7, "480": -7, "505": -7, "520": -7,
  "575": -7, "602": -7, "623": -7, "719": -7, "720": -7, "801": -7, "928": -7, "970": -7,
  // Pacific (-8)
  "206": -8, "209": -8, "213": -8, "253": -8, "310": -8, "323": -8, "341": -8, "408": -8,
  "415": -8, "424": -8, "425": -8, "442": -8, "510": -8, "530": -8, "559": -8, "562": -8,
  "619": -8, "626": -8, "628": -8, "650": -8, "657": -8, "661": -8, "669": -8, "707": -8,
  "714": -8, "747": -8, "760": -8, "775": -8, "805": -8, "818": -8, "831": -8, "858": -8,
  "909": -8, "916": -8, "925": -8, "949": -8, "951": -8, "971": -8,
};

// Check if it's between 9am and 8pm in the contact's local time (conservative
// window inside the 8am–9pm TCPA rule).
function isWithinQuietHours(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  const ten = digits.startsWith("1") ? digits.slice(1) : digits;
  const areaCode = ten.slice(0, 3);
  const offset = AREA_CODE_TZ[areaCode] ?? -5; // default to Eastern

  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const localHour = (utcHour + offset + 24) % 24;
  // Also factor in minutes implicitly by using floor hour; we want 9 ≤ hour < 20
  void utcMinutes;
  return localHour >= 9 && localHour < 20;
}

async function generateFollowUp(
  anthropicKey: string,
  industry: string,
  messageHistory: { role: "user" | "assistant"; content: string }[],
  agentName: string,
  userInstructions: string,
  contactInfo: string,
  conversationHistory: string
): Promise<string | null> {
  const systemPrompt = buildAiSystemPrompt({
    agentName,
    industry,
    userInstructions,
    contactInfo,
    conversationHistory,
    availabilityContext: "",
  });
  const followUpInstructions = `\n\n=== FOLLOW-UP MODE ===\nThe lead went silent. Send ONE short, casual follow-up text (1 sentence, max 15 words) to re-engage them. Do NOT apologize. Do NOT say "just checking in" or "just following up" — sound human. Pick up naturally where the conversation left off. If you already asked a question, rephrase it more casually. Never reveal you're an AI or an agent.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: systemPrompt + followUpInstructions,
      messages: messageHistory,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text || typeof text !== "string") return null;
  return text.trim();
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Test mode bypasses the 22h silence rule and TCPA quiet-hours (still honors
  // DNC, wallet, and max follow-ups). Append ?test=1 (auth still required).
  const url = new URL(req.url);
  const testMode = url.searchParams.get("test") === "1";
  const testConversationId = url.searchParams.get("conversation_id");

  const supabase = createClient(supabaseUrl, supabaseKey);
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const telnyxKey = process.env.TELNYX_API_KEY;

  if (!anthropicKey || !telnyxKey) {
    return NextResponse.json({ error: "Missing API keys" }, { status: 500 });
  }

  // Find accounts with agent_plan enabled
  const { data: accounts } = await supabase
    .from("profiles")
    .select("id, first_name, industry, owned_numbers, wallet_balance, usage_history, ai_instructions")
    .eq("agent_plan", true);

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ processed: 0, sent: 0, reason: "no agent accounts" });
  }

  let sent = 0;
  let processed = 0;
  const errors: string[] = [];

  for (const account of accounts) {
    const balance = Number(account.wallet_balance) || 0;
    if (balance < AI_MESSAGE_COST + SMS_COST) continue;

    const ownedNumbers = account.owned_numbers || [];
    if (ownedNumbers.length === 0) continue;

    // Find agent-enabled conversations for this account
    let convQuery = supabase
      .from("conversations")
      .select("id, contact_id, last_message_at, agent_follow_up_count, agent_last_follow_up_at, from_number, contacts(first_name, last_name, phone, dnc)")
      .eq("user_id", account.id)
      .eq("agent_enabled", true);
    if (testMode && testConversationId) {
      convQuery = convQuery.eq("id", testConversationId);
    }
    const { data: convs } = await convQuery;

    if (!convs) continue;

    for (const conv of convs) {
      processed++;
      try {
        const contact = conv.contacts as unknown as { first_name?: string; last_name?: string; phone?: string; dnc?: boolean } | null;
        if (!contact || !contact.phone) continue;
        if (contact.dnc) continue;

        // Cap follow-ups
        const followUpCount = conv.agent_follow_up_count || 0;
        if (followUpCount >= MAX_FOLLOW_UPS) continue;

        // Need at least MIN_HOURS_SINCE_LAST hours of silence (bypassed in test mode)
        if (!testMode) {
          const lastMsgTime = new Date(conv.last_message_at).getTime();
          const hoursSince = (Date.now() - lastMsgTime) / (1000 * 60 * 60);
          if (hoursSince < MIN_HOURS_SINCE_LAST) continue;
        }

        // Don't re-follow up within 24 hours of our own last agent follow-up
        if (!testMode && conv.agent_last_follow_up_at) {
          const lastAgentTime = new Date(conv.agent_last_follow_up_at).getTime();
          const hoursSinceAgent = (Date.now() - lastAgentTime) / (1000 * 60 * 60);
          if (hoursSinceAgent < 24) continue;
        }

        // Respect TCPA quiet hours (bypassed in test mode)
        if (!testMode && !isWithinQuietHours(contact.phone)) continue;

        // Fetch recent message history to build context
        const { data: msgs } = await supabase
          .from("messages")
          .select("direction, body, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (!msgs || msgs.length === 0) continue;

        // Last message must be inbound (lead spoke last) — don't follow up if we already did
        const lastMsg = msgs[0];
        if (lastMsg.direction !== "inbound") continue;

        // If the lead's last message was a decline ("N", "No", "Not interested",
        // etc.) don't chase them — would look pushy and hurt the user's reputation.
        if (shouldAiSkipReply(lastMsg.body)) continue;

        const history = msgs
          .reverse()
          .map((m) => ({
            role: (m.direction === "inbound" ? "user" : "assistant") as "user" | "assistant",
            content: m.body,
          }));

        // Generate the follow-up
        const industry = (account.industry as string) || "health_insurance";
        const agentName = (account.first_name as string) || "there";
        const userInstructions = (account.ai_instructions as string) || "";
        const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "the customer";
        const contactInfo = `Name: ${contactName}\nPhone: ${contact.phone}`;
        const conversationSummary = history
          .map((m) => `${m.role === "user" ? "Lead" : agentName}: ${m.content}`)
          .join("\n");

        const followUp = await generateFollowUp(
          anthropicKey,
          industry,
          history,
          agentName,
          userInstructions,
          contactInfo,
          conversationSummary
        );
        if (!followUp) continue;

        // Determine from number
        const fromDigits = (conv.from_number || ownedNumbers[0].number).replace(/\D/g, "");
        const fromE164 = `+${fromDigits.startsWith("1") ? fromDigits : `1${fromDigits}`}`;
        const toDigits = contact.phone.replace(/\D/g, "");
        const toE164 = `+${toDigits.startsWith("1") ? toDigits : `1${toDigits}`}`;

        // Send via Telnyx
        const smsRes = await fetch("https://api.telnyx.com/v2/messages", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${telnyxKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromE164,
            to: toE164,
            text: followUp,
            ...(process.env.TELNYX_MESSAGING_PROFILE_ID ? { messaging_profile_id: process.env.TELNYX_MESSAGING_PROFILE_ID } : {}),
          }),
        });

        if (!smsRes.ok) {
          const err = await smsRes.text();
          errors.push(`conv ${conv.id}: telnyx ${err.slice(0, 100)}`);
          continue;
        }

        // Save the message
        await supabase.from("messages").insert({
          conversation_id: conv.id,
          direction: "outbound",
          body: followUp,
          status: "sent",
          from_number: fromE164,
        });

        // Update conversation counters
        await supabase
          .from("conversations")
          .update({
            last_message_at: new Date().toISOString(),
            preview: followUp.slice(0, 100),
            agent_follow_up_count: followUpCount + 1,
            agent_last_follow_up_at: new Date().toISOString(),
          })
          .eq("id", conv.id);

        // Deduct cost from wallet
        const cost = AI_MESSAGE_COST + SMS_COST;
        const newBalance = balance - cost;
        const history_entry = {
          type: "agent_follow_up",
          amount: cost,
          conversation_id: conv.id,
          timestamp: new Date().toISOString(),
        };
        const usageHistory = Array.isArray(account.usage_history) ? account.usage_history : [];
        await supabase
          .from("profiles")
          .update({
            wallet_balance: newBalance,
            usage_history: [...usageHistory, history_entry],
          })
          .eq("id", account.id);

        sent++;
      } catch (e) {
        errors.push(`conv ${conv.id}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }
  }

  return NextResponse.json({ processed, sent, errors });
}
