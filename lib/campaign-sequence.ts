export type SequenceStep = { message: string; delayMinutes: number };

export function validateSequence(value: unknown): SequenceStep[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20)
    throw new Error("Use between 1 and 20 campaign steps.");
  return value.map((step: unknown) => {
    if (!step || typeof step !== "object")
      throw new Error("Invalid campaign step.");
    const { message, delayMinutes } = step as Record<string, unknown>;
    if (typeof message !== "string" || !message.trim() || message.length > 5000)
      throw new Error("Every step needs a message of up to 5,000 characters.");
    if (
      typeof delayMinutes !== "number" ||
      !Number.isFinite(delayMinutes) ||
      delayMinutes < 0 ||
      delayMinutes > 525600
    )
      throw new Error("Step delays must be between zero and 365 days.");
    return { message, delayMinutes };
  });
}

const fields: Record<string, string> = {
  firstName: "first_name",
  lastName: "last_name",
  phone: "phone",
  email: "email",
  city: "city",
  state: "state",
  address: "address",
  zip: "zip",
  leadSource: "lead_source",
  quote: "quote",
  policyId: "policy_id",
  timeline: "timeline",
  householdSize: "household_size",
  dateOfBirth: "date_of_birth",
  age: "age",
  notes: "notes",
};

export function renderCampaignMessage(
  template: string,
  contact: Record<string, unknown>,
  random: () => number = Math.random,
): string {
  // Resolve variations before field substitution so contact values are never interpreted as instructions.
  return template
    .replace(/\{([^{}]*\|[^{}]*)\}/g, (_, variants: string) => {
      const choices = variants.split("|");
      return choices[
        Math.min(choices.length - 1, Math.floor(random() * choices.length))
      ];
    })
    .replace(/\{(\w+)\}/g, (token, field: string) =>
      fields[field] ? String(contact[fields[field]] ?? "") : token,
    );
}

export function sequenceTimes(
  steps: SequenceStep[],
  startsAt: number,
): string[] {
  let time = startsAt;
  return steps.map((step) => {
    time += step.delayMinutes * 60_000;
    return new Date(time).toISOString();
  });
}
