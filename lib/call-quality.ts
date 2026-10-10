// ── Call audio quality ────────────────────────────────────────────────────
// Telnyx reports per-call audio stats on call.hangup (call_quality_stats):
// for the caller's audio reaching us, a MOS score, jitter and packets lost;
// for the audio we send, packets skipped. Kept with the AI call so the
// operator can tell a bad phone connection (caller side) from gaps in what
// Telnyx played (our side) without digging through Telnyx reports.

export type CallQuality = {
  /** Mean Opinion Score of the caller's audio, 1 (bad) to 5 (perfect). */
  mos: number | null;
  /** Percent of the caller's audio packets lost on the way to Telnyx. */
  inboundLossPct: number | null;
  /** Maximum jitter variance on the caller's audio (ms). */
  jitterMs: number | null;
  /** Percent of the audio we sent that Telnyx had to skip. */
  outboundLossPct: number | null;
  rating: "good" | "fair" | "poor" | "unknown";
};

type RawSide = Record<string, unknown> | null | undefined;

const num = (value: unknown): number | null => {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : null;
};

const lossPct = (side: RawSide): number | null => {
  const packets = num(side?.packet_count);
  const skipped = num(side?.skip_packet_count);
  if (packets === null || skipped === null || packets + skipped <= 0) return null;
  return +((skipped / (packets + skipped)) * 100).toFixed(1);
};

/** Summarize Telnyx's call_quality_stats; null when there is nothing to report. */
export function summarizeCallQuality(stats: unknown): CallQuality | null {
  if (!stats || typeof stats !== "object") return null;
  const raw = stats as { inbound?: RawSide; outbound?: RawSide };
  const mos = num(raw.inbound?.mos);
  const inboundLossPct = lossPct(raw.inbound);
  const jitterMs = num(raw.inbound?.jitter_max_variance);
  const outboundLossPct = lossPct(raw.outbound);
  if (mos === null && inboundLossPct === null && outboundLossPct === null) return null;

  // MOS 4+ is toll quality, under 3.6 people notice; a few percent of lost
  // packets is already audible as choppy speech.
  const worstLoss = Math.max(inboundLossPct ?? 0, outboundLossPct ?? 0);
  let rating: CallQuality["rating"] = "good";
  if ((mos !== null && mos < 3.6) || worstLoss >= 3) rating = "poor";
  else if ((mos !== null && mos < 4) || worstLoss >= 1) rating = "fair";
  return { mos, inboundLossPct, jitterMs, outboundLossPct, rating };
}
