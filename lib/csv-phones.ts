import Papa from "papaparse";
import { toE164 } from "./browser-calls";

/**
 * Every US phone number in an uploaded CSV, as +1XXXXXXXXXX, from every
 * column. Lead exports often carry several phone columns (Business, Mobile,
 * Home) with the number in whichever one the vendor filled, so no single
 * column can be trusted. Other values that happen to look like a phone
 * number are harmless: the result is only used to pick out existing
 * contacts by phone.
 */
export function phonesFromCsv(text: string): Set<string> {
  const parsed = Papa.parse<string[]>(text || "", { header: false, skipEmptyLines: true });
  const phones = new Set<string>();
  for (const row of parsed.data || []) {
    for (const cell of Array.isArray(row) ? row : []) {
      const phone = toE164(cell);
      if (phone) phones.add(phone);
    }
  }
  return phones;
}
