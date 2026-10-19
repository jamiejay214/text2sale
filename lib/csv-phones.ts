import Papa from "papaparse";
import { toE164 } from "./browser-calls";

const PHONE_HEADERS = new Set(["phone", "phonenumber", "mobile", "cell", "cellphone", "mobilephone", "primaryphone", "telephone"]);

/**
 * Every US phone number in an uploaded CSV, as +1XXXXXXXXXX. Uses the phone
 * column by its header (the same names the importer recognizes), else the
 * first column whose values are mostly phone numbers.
 */
export function phonesFromCsv(text: string): Set<string> {
  const parsed = Papa.parse<Record<string, string>>(text || "", { header: true, skipEmptyLines: true });
  const rows = parsed.data || [];
  const headers = parsed.meta.fields || [];
  const normalized = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, "");
  let column = headers.find((header) => PHONE_HEADERS.has(normalized(header)));
  if (!column) {
    const sample = rows.slice(0, 50);
    column = headers.find((header) => sample.length > 0 && sample.filter((row) => toE164(row[header])).length >= sample.length / 2);
  }
  const phones = new Set<string>();
  if (!column) return phones;
  for (const row of rows) {
    const phone = toE164(row[column]);
    if (phone) phones.add(phone);
  }
  return phones;
}
