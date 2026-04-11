// Compliance Audit Log — tracks opt-in/opt-out events for TCPA compliance
// Stored in the profile's usage_history as compliance entries

export type ComplianceEvent = {
  id: string;
  type: "opt_out" | "opt_in" | "dnc_added" | "dnc_removed" | "consent_recorded";
  contactPhone: string;
  contactName: string;
  method: "sms_keyword" | "manual" | "csv_import" | "api";
  keyword?: string; // e.g., "STOP", "START"
  fromNumber?: string;
  timestamp: string;
  userId: string;
};

export type ComplianceLog = {
  events: ComplianceEvent[];
};

export function createComplianceEvent(
  type: ComplianceEvent["type"],
  contactPhone: string,
  contactName: string,
  method: ComplianceEvent["method"],
  userId: string,
  extra?: { keyword?: string; fromNumber?: string }
): ComplianceEvent {
  return {
    id: `compliance_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    contactPhone,
    contactName,
    method,
    keyword: extra?.keyword,
    fromNumber: extra?.fromNumber,
    timestamp: new Date().toISOString(),
    userId,
  };
}

// Get compliance log from profile (stored in a2p_registration or separate field)
export function parseComplianceLog(raw: ComplianceEvent[] | null | undefined): ComplianceEvent[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw;
}

// Add event to log (returns new array)
export function addComplianceEvent(
  log: ComplianceEvent[],
  event: ComplianceEvent
): ComplianceEvent[] {
  return [event, ...log].slice(0, 10000); // Keep last 10,000 events
}

// Format for display
export function formatComplianceType(type: ComplianceEvent["type"]): string {
  switch (type) {
    case "opt_out": return "Opt-Out";
    case "opt_in": return "Opt-In";
    case "dnc_added": return "DNC Added";
    case "dnc_removed": return "DNC Removed";
    case "consent_recorded": return "Consent Recorded";
    default: return type;
  }
}

export function formatComplianceMethod(method: ComplianceEvent["method"]): string {
  switch (method) {
    case "sms_keyword": return "SMS Keyword";
    case "manual": return "Manual";
    case "csv_import": return "CSV Import";
    case "api": return "API";
    default: return method;
  }
}
