import { renderCampaignMessage } from "./campaign-sequence";
import { countSegments, sanitizeForSms, smsUnits } from "./sms-text";

const example = { first_name: "xxxxx", last_name: "Morgan", phone: "9545550123", email: "jamie@example.com", city: "Miami", state: "FL", address: "123 Main St", zip: "33101", lead_source: "Website", quote: "125", policy_id: "12345", timeline: "this month", household_size: "3", date_of_birth: "1985-01-01", age: "40", notes: "Requested information" };

export function campaignSegmentPreview(template: string, firstName = "", contact?: Record<string, unknown>) {
  const estimated = /\{[^{}]+\}/.test(template);
  // Compare spin choices by their encoded size without expanding all combinations.
  // The campaign sender rejects unsanitized non-ASCII characters before queueing.
  const render = (longest: boolean) => sanitizeForSms(renderCampaignMessage(template.replace(/\{([^{}]*\|[^{}]*)\}/g, (_, text: string) =>
    text.split("|").reduce((a,b) => (smsUnits(sanitizeForSms(b)) > smsUnits(sanitizeForSms(a))) === longest ? b : a)), contact ?? {...example, first_name: firstName.trim() || "x".repeat(longest ? 16 : 1), last_name: "x".repeat(longest ? 16 : 1)}));
  const sample = render(false), other = render(true);
  const sizes = [countSegments(sample),countSegments(other)];
  const lengths = [sample.length,other.length];
  return { sample, segments: Math.min(...sizes), maxSegments: Math.max(...sizes), length: Math.min(...lengths), maxLength: Math.max(...lengths), estimated };
}
