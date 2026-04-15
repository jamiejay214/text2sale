import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const AI_MESSAGE_COST = 0.025; // per AI-generated reply
const REGULAR_MESSAGE_COST = 0.012;

export async function POST(req: NextRequest) {
  try {
    const { userId, conversationId, contactId, sendReply } = await req.json();

    if (!userId || !conversationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch profile, conversation messages, and contact in parallel
    const [profileRes, messagesRes, contactRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase
        .from("messages")
        .select("direction, body, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(30),
      contactId
        ? supabase.from("contacts").select("*").eq("id", contactId).single()
        : Promise.resolve({ data: null }),
    ]);

    const profile = profileRes.data;
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check AI plan
    if (!profile.ai_plan) {
      return NextResponse.json(
        { error: "AI replies require the Text2Sale + AI plan ($59.99/mo). Upgrade in Settings." },
        { status: 403 }
      );
    }

    // Check wallet balance
    const totalCost = sendReply ? AI_MESSAGE_COST : 0; // Only charge if actually sending
    const balance = Number(profile.wallet_balance) || 0;
    if (sendReply && balance < totalCost) {
      return NextResponse.json(
        { error: `Insufficient funds. AI reply costs $${AI_MESSAGE_COST}. Current balance: $${balance.toFixed(2)}` },
        { status: 402 }
      );
    }

    const messages = messagesRes.data || [];
    const contact = contactRes.data;

    // Build conversation context for Claude
    const contactInfo = contact
      ? [
          contact.first_name && `Name: ${contact.first_name} ${contact.last_name || ""}`.trim(),
          contact.city && `Location: ${contact.city}${contact.state ? `, ${contact.state}` : ""}`,
          contact.lead_source && `Lead Source: ${contact.lead_source}`,
          contact.notes && `Notes: ${contact.notes}`,
          contact.quote && `Quote: ${contact.quote}`,
          contact.timeline && `Timeline: ${contact.timeline}`,
        ]
          .filter(Boolean)
          .join("\n")
      : "";

    const conversationHistory = messages
      .map((m) => `${m.direction === "outbound" ? "Agent" : "Customer"}: ${m.body}`)
      .join("\n");

    const userInstructions = profile.ai_instructions?.trim() || "";
    const agentName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Agent";

    const systemPrompt = `You are an AI assistant helping ${agentName} respond to SMS text messages from customers. You ARE ${agentName} — write as them, in first person.

RULES:
- Keep responses SHORT — this is SMS texting, not email. 1-3 sentences max.
- Sound natural and human, like a real person texting. Use casual but professional tone.
- Never use emojis excessively — one max per message if appropriate.
- Never mention you are an AI or automated system.
- Push toward booking appointments or closing sales when appropriate.
- If the customer seems uninterested, be respectful but try one soft follow-up.
- Match the customer's energy — if they're brief, be brief. If they're chatty, be slightly warmer.
- Never make up specific policy details, pricing, or commitments you can't verify.
- If asked something you don't know, say you'll check and get back to them.

${userInstructions ? `ADDITIONAL INSTRUCTIONS FROM ${agentName.toUpperCase()}:\n${userInstructions}\n` : ""}
${contactInfo ? `CUSTOMER INFO:\n${contactInfo}\n` : ""}
CONVERSATION SO FAR:
${conversationHistory}

Respond with ONLY the SMS reply text — no quotes, no "Agent:", no explanation. Just the message to send.`;

    // Call Claude API
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json(
        { error: "AI is not configured. Add ANTHROPIC_API_KEY to environment variables." },
        { status: 500 }
      );
    }

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: "Generate the next SMS reply to send to this customer.",
          },
        ],
      }),
    });

    const aiData = await aiRes.json();

    if (!aiRes.ok || !aiData.content?.[0]?.text) {
      console.error("Claude API error:", aiData);
      return NextResponse.json(
        { error: "AI failed to generate a reply. Please try again." },
        { status: 502 }
      );
    }

    const aiReply = aiData.content[0].text.trim();

    // If sendReply is true, actually send the message via Telnyx and charge
    if (sendReply) {
      const telnyxKey = process.env.TELNYX_API_KEY;
      if (!telnyxKey) {
        return NextResponse.json({ error: "Telnyx not configured" }, { status: 500 });
      }

      if (!contact?.phone) {
        return NextResponse.json({ error: "No phone number for this contact" }, { status: 400 });
      }

      // Determine from number — use the conversation's from_number or the user's first owned number
      const { data: conv } = await supabase
        .from("conversations")
        .select("from_number")
        .eq("id", conversationId)
        .single();

      let fromNumber = conv?.from_number;
      if (!fromNumber) {
        const ownedNumbers = profile.owned_numbers || [];
        if (ownedNumbers.length > 0) {
          const digits = ownedNumbers[0].number.replace(/\D/g, "");
          fromNumber = `+${digits.startsWith("1") ? digits : `1${digits}`}`;
        }
      }

      if (!fromNumber) {
        return NextResponse.json({ error: "No phone number to send from" }, { status: 400 });
      }

      const toDigits = contact.phone.replace(/\D/g, "");
      const toE164 = `+${toDigits.startsWith("1") ? toDigits : `1${toDigits}`}`;

      // Send via Telnyx
      const smsRes = await fetch("https://api.telnyx.com/v2/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${telnyxKey}`,
        },
        body: JSON.stringify({
          from: fromNumber,
          to: toE164,
          text: aiReply,
          type: "SMS",
        }),
      });

      const smsData = await smsRes.json();
      if (smsData.errors) {
        return NextResponse.json(
          { error: smsData.errors[0]?.detail || "Failed to send SMS" },
          { status: 500 }
        );
      }

      // Record the message in DB
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        direction: "outbound",
        body: aiReply,
        status: "sent",
      });

      await supabase
        .from("conversations")
        .update({
          preview: aiReply.slice(0, 100),
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      // Charge wallet — AI message rate
      const newBalance = Number((balance - AI_MESSAGE_COST).toFixed(2));
      const entry = {
        id: `ai_msg_${Date.now()}`,
        type: "charge",
        amount: AI_MESSAGE_COST,
        description: `AI reply — ${contact.first_name || "Unknown"} ${contact.last_name || ""}`.trim(),
        createdAt: new Date().toISOString(),
        status: "succeeded",
      };
      const history = [entry, ...(profile.usage_history || [])];

      await supabase
        .from("profiles")
        .update({ wallet_balance: newBalance, usage_history: history })
        .eq("id", userId);

      return NextResponse.json({
        success: true,
        reply: aiReply,
        sent: true,
        cost: AI_MESSAGE_COST,
        newBalance,
      });
    }

    // Just return the suggestion without sending
    return NextResponse.json({
      success: true,
      reply: aiReply,
      sent: false,
    });
  } catch (error) {
    console.error("AI reply error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI reply" },
      { status: 500 }
    );
  }
}
