export function browserCallState(state: string): "idle" | "calling" | "ringing" | "active" | "ended" {
  if (["new", "requesting", "trying", "recovering"].includes(state)) return "calling";
  if (["ringing", "early"].includes(state)) return "ringing";
  if (["answering", "active", "held"].includes(state)) return "active";
  if (["hangup", "done", "destroy", "purge"].includes(state)) return "ended";
  return "idle";
}

export function callFailure(call: { cause?: string; causeCode?: number; sipCode?: number; sipReason?: string }) {
  if (!call.sipCode || call.sipCode < 400) {
    if (call.cause && !["NORMAL_CLEARING", "ORIGINATOR_CANCEL", "SUCCESS"].includes(call.cause)) {
      return `Call could not connect: ${call.sipReason || call.cause.replace(/_/g, " ").toLowerCase()}.`;
    }
    return undefined;
  }
  if (call.sipCode === 486 || call.cause === "USER_BUSY") return "The person you called is busy. Try again later.";
  if (call.sipCode === 488 && /encrypt/i.test(call.sipReason || "")) return "Call could not connect: the calling line requires encrypted media, which browser calls can't use. Refresh the page and call again. If it repeats, turn off SRTP on the Telnyx SIP connection.";
  if (call.sipCode === 404) return "The destination number could not be reached. Check the number.";
  return `Call could not connect (${call.sipCode}): ${call.sipReason || call.cause || "The provider rejected the call"}.`;
}
