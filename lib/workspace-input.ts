/** Normalize US/Canada numbers, including spreadsheet .0 / scientific notation. */
export function normalizeImportPhone(value: string): string {
  let raw = String(value || "")
    .trim()
    .replace(/\.0+$/, "");
  if (/^\d+(?:\.\d+)?e\+?\d+$/i.test(raw)) {
    const n = Number(raw);
    if (!Number.isSafeInteger(n)) return "";
    raw = String(n);
  }
  if (/[a-z]/i.test(raw)) return "";
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(digits) ? digits : "";
}
export function importSuppressed(value: string): boolean {
  return /^(true|yes|1|dnc|stop|unsubscribed|opt[ -]?out)$/i.test(value.trim());
}
export function delayParts(minutes: number) {
  const unit =
    minutes > 0 && minutes % 1440 === 0
      ? 1440
      : minutes > 0 && minutes % 60 === 0
        ? 60
        : 1;
  return { quantity: minutes / unit, unit };
}
