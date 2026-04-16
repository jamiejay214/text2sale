import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildAiSystemPrompt } from "@/lib/ai-sales-prompts";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const AI_MESSAGE_COST = 0.025;

type DaySlot = { enabled: boolean; start: string; end: string };
type AvailableHours = {
  enabled: boolean;
  timezone: string;
  slots: Record<string, DaySlot>;
  slotDuration: number;
  bufferMinutes: number;
  maxDaysOut: number;
};

// Format time "14:00:00" -> "2:00 PM"
function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// Format date "2026-04-17" -> "Thursday, April 17"
function formatDateNice(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// Get available slots for the next N days, excluding already-booked
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAvailableSlots(
  supabase: any,
  userId: string,
  hours: AvailableHours,
  limit = 6
): Promise<{ date: string; time: string; display: string }[]> {
  const today = new Date();
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + hours.maxDaysOut);

  const { data: existing } = await supabase
    .from("appointments")
    .select("date, time")
    .eq("user_id", userId)
    .eq("status", "confirmed")
    .gte("date", today.toISOString().split("T")[0])
    .lte("date", maxDate.toISOString().split("T")[0]);

  const bookedSet = new Set((existing || []).map((a: { date: string; time: string }) => `${a.date}_${a.time}`));
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const slots: { date: string; time: string; display: string }[] = [];

  for (let d = 1; d <= hours.maxDaysOut && slots.length < limit; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() + d);
    const dayName = dayNames[date.getDay()];
    const dayConfig = hours.slots[dayName];
    if (!dayConfig?.enabled) continue;

    const [startH, startM] = dayConfig.start.split(":").map(Number);
    const [endH, endM] = dayConfig.end.split(":").map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    const step = hours.slotDuration + hours.bufferMinutes;
    const dateStr = date.toISOString().split("T")[0];

    for (let m = startMin; m + hours.slotDuration <= endMin && slots.length < limit; m += step) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const timeStr = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;

      if (!bookedSet.has(`${dateStr}_${timeStr}`)) {
        slots.push({
          date: dateStr,
          time: timeStr,
          display: `${formatDateNice(dateStr)} at ${formatTime12(timeStr)}`,
        });
      }
    }
  }

  return slots;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, conversationId, contactId, sendReply } = await req.json();

    if (!userId || !conversationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

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

    if (!profile.ai_plan) {
      return NextResponse.json(
        { error: "AI replies require the Text2Sale + AI plan ($59.99/mo). Upgrade in Settings." },
        { status: 403 }
      );
    }

    const balance = Number(profile.wallet_balance) || 0;
    if (sendReply && balance < AI_MESSAGE_COST) {
      return NextResponse.json(
        { error: `Insufficient funds. AI reply costs $${AI_MESSAGE_COST}. Balance: $${balance.toFixed(2)}` },
        { status: 402 }
      );
    }

    const messages = messagesRes.data || [];
    const contact = contactRes.data;

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

    // Get available slots for appointment context
    const hours: AvailableHours = profile.available_hours || {
      enabled: true, timezone: "America/New_York",
      slots: {}, slotDuration: 30, bufferMinutes: 15, maxDaysOut: 14,
    };

    let availabilityContext = "";
    let availableSlots: { date: string; time: string; display: string }[] = [];
    if (hours.enabled) {
      availableSlots = await getAvailableSlots(supabase, userId, hours, 8);
      if (availableSlots.length > 0) {
        availabilityContext = `\nAPPOINTMENT SCHEDULING:
You can book appointments for the customer. Available slots (${hours.timezone}):
${availableSlots.map((s, i) => `${i + 1}. ${s.display}`).join("\n")}
Slot duration: ${hours.slotDuration} minutes.

When the customer wants to schedule/book/meet/talk/call:
- Use the book_appointment tool to create the appointment
- Then confirm the booking in your reply message
- If they pick a specific day/time, match it to the closest available slot
- If they're vague ("sometime this week"), suggest 2-3 specific options
- Always confirm the date and time in your SMS reply after booking\n`;
      }
    }

    const industry = profile.industry || "health_insurance";

    const systemPrompt = buildAiSystemPrompt({
      agentName,
      industry,
      userInstructions,
      contactInfo,
      conversationHistory,
      availabilityContext,
    });

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json(
        { error: "AI is not configured. Add ANTHROPIC_API_KEY to environment variables." },
        { status: 500 }
      );
    }

    // Define tools for appointment booking
    const tools = availableSlots.length > 0
      ? [
          {
            name: "book_appointment",
            description: "Book an appointment with the customer. Use this when the customer wants to schedule a call, meeting, or appointment. Pick the slot that best matches what they requested.",
            input_schema: {
              type: "object" as const,
              properties: {
                date: {
                  type: "string" as const,
                  description: "Appointment date in YYYY-MM-DD format. Must be one of the available dates.",
                },
                time: {
                  type: "string" as const,
                  description: "Appointment time in HH:MM:SS format. Must be one of the available times.",
                },
                title: {
                  type: "string" as const,
                  description: "Brief title for the appointment (e.g., 'Insurance Quote Call', 'Policy Review')",
                },
              },
              required: ["date", "time"],
            },
          },
        ]
      : [];

    // First Claude call — may return tool_use or text
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: systemPrompt,
        tools: tools.length > 0 ? tools : undefined,
        messages: [
          {
            role: "user",
            content: "Generate the next SMS reply to send to this customer.",
          },
        ],
      }),
    });

    const aiData = await aiRes.json();

    if (!aiRes.ok) {
      console.error("Claude API error:", JSON.stringify(aiData));
      const detail = aiData?.error?.message || "AI failed to generate a reply.";
      return NextResponse.json(
        { error: `AI error: ${detail}` },
        { status: 502 }
      );
    }

    // Process the response — handle tool use if present
    let aiReply = "";
    let appointmentBooked = false;
    let appointmentDetails: { date: string; time: string; title: string } | null = null;

    const content = aiData.content || [];

    // Check if Claude wants to use a tool
    const toolUse = content.find((c: { type: string }) => c.type === "tool_use");
    const textBlock = content.find((c: { type: string }) => c.type === "text");

    if (toolUse && toolUse.name === "book_appointment") {
      const input = toolUse.input as { date: string; time: string; title?: string };

      // Verify the slot is valid
      const slotValid = availableSlots.some((s) => s.date === input.date && s.time === input.time);

      if (slotValid) {
        // Book the appointment
        const { error: aptError } = await supabase.from("appointments").insert({
          user_id: userId,
          contact_id: contactId || null,
          conversation_id: conversationId,
          title: input.title || "Appointment",
          date: input.date,
          time: input.time,
          duration_minutes: hours.slotDuration,
          notes: `Booked by AI during conversation. Contact: ${contact?.first_name || "Unknown"} ${contact?.last_name || ""}`.trim(),
          status: "confirmed",
        });

        if (!aptError) {
          appointmentBooked = true;
          appointmentDetails = {
            date: input.date,
            time: input.time,
            title: input.title || "Appointment",
          };
        }
      }

      // Get the text reply — Claude may have included it alongside the tool call,
      // or we need a follow-up call with the tool result
      if (textBlock?.text) {
        aiReply = textBlock.text.trim();
      } else {
        // Follow-up call with tool result
        const followUp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 300,
            system: systemPrompt,
            messages: [
              {
                role: "user",
                content: "Generate the next SMS reply to send to this customer.",
              },
              {
                role: "assistant",
                content: content,
              },
              {
                role: "user",
                content: [
                  {
                    type: "tool_result",
                    tool_use_id: toolUse.id,
                    content: appointmentBooked
                      ? `Appointment booked successfully for ${formatDateNice(input.date)} at ${formatTime12(input.time)}. Confirm this with the customer in your reply.`
                      : "Failed to book — that time slot is no longer available. Suggest alternative times.",
                  },
                ],
              },
            ],
          }),
        });

        const followUpData = await followUp.json();
        const followUpText = followUpData.content?.find((c: { type: string }) => c.type === "text");
        aiReply = followUpText?.text?.trim() || `You're all set for ${formatDateNice(input.date)} at ${formatTime12(input.time)}! Looking forward to it.`;
      }
    } else if (textBlock?.text) {
      aiReply = textBlock.text.trim();
    } else {
      return NextResponse.json(
        { error: "AI failed to generate a reply. Please try again." },
        { status: 502 }
      );
    }

    // If sendReply is true, send via Telnyx and charge
    if (sendReply) {
      const telnyxKey = process.env.TELNYX_API_KEY;
      if (!telnyxKey) {
        return NextResponse.json({ error: "Telnyx not configured" }, { status: 500 });
      }

      if (!contact?.phone) {
        return NextResponse.json({ error: "No phone number for this contact" }, { status: 400 });
      }

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

      // Normalize from_number — may be stored as "(561) 344-5416" but Telnyx needs E.164
      const fromDigits = fromNumber.replace(/\D/g, "");
      const fromE164 = `+${fromDigits.startsWith("1") ? fromDigits : `1${fromDigits}`}`;

      const toDigits = contact.phone.replace(/\D/g, "");
      const toE164 = `+${toDigits.startsWith("1") ? toDigits : `1${toDigits}`}`;

      const smsRes = await fetch("https://api.telnyx.com/v2/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${telnyxKey}`,
        },
        body: JSON.stringify({
          from: fromE164,
          to: toE164,
          text: aiReply,
          type: "SMS",
          ...(process.env.TELNYX_MESSAGING_PROFILE_ID ? { messaging_profile_id: process.env.TELNYX_MESSAGING_PROFILE_ID } : {}),
        }),
      });

      const smsData = await smsRes.json();
      if (smsData.errors) {
        return NextResponse.json(
          { error: smsData.errors[0]?.detail || "Failed to send SMS" },
          { status: 500 }
        );
      }

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

      // Charge wallet
      const newBalance = Number((balance - AI_MESSAGE_COST).toFixed(2));
      const entry = {
        id: `ai_msg_${Date.now()}`,
        type: "charge",
        amount: AI_MESSAGE_COST,
        description: `AI reply — ${contact?.first_name || "Unknown"} ${contact?.last_name || ""}`.trim(),
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
        appointmentBooked,
        appointmentDetails,
      });
    }

    return NextResponse.json({
      success: true,
      reply: aiReply,
      sent: false,
      appointmentBooked,
      appointmentDetails,
    });
  } catch (error) {
    console.error("AI reply error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI reply" },
      { status: 500 }
    );
  }
}
