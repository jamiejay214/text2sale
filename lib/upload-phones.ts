import Papa from "papaparse";
import { normalizeImportPhone } from "@/lib/workspace-input";

/**
 * Every phone number in an uploaded CSV, normalized to 10 digits, so an
 * upload can be matched back to its contacts. Exports name phone columns
 * many ways (Phone, Phone 1, Phone number, Mobile, Home, Business, Cell), so
 * all of them are read; text values (a company name in "Business") are
 * dropped by the normalizer.
 */
export function uploadPhones(csv: string): string[] {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
  const headers = (parsed.meta.fields || []).filter((h) => /phone|mobile|cell|home|business|work|tel/i.test(h) && !/type|carrier|status|address|owner|dob/i.test(h));
  const phones = new Set<string>();
  for (const row of parsed.data) {
    for (const h of headers) {
      const phone = normalizeImportPhone(String(row[h] || ""));
      if (phone) phones.add(phone);
    }
  }
  return [...phones];
}

/** Every email address in an uploaded CSV (its email columns), trimmed; matched case-insensitively. */
export function uploadEmails(csv: string): string[] {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
  const headers = (parsed.meta.fields || []).filter((h) => /e-?mail/i.test(h));
  const emails = new Set<string>();
  for (const row of parsed.data) {
    for (const h of headers) {
      const email = String(row[h] || "").trim();
      if (/^[^\s@,;]+@[^\s@,;]+\.[a-z]{2,}$/i.test(email)) emails.add(email);
    }
  }
  return [...emails];
}
