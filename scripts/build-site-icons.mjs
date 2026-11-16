// Generates the small illustration tiles used on the homepage and the
// integration pages into public/home/icons/. Each is a real image file with
// its own alt text on the page, so the sections are more than bare text.
// Icon paths come from lucide-react (ISC license), already a dependency.
//
// Run: node scripts/build-site-icons.mjs

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconDir = join(root, "node_modules/lucide-react/dist/esm/icons");
const outDir = join(root, "public/home/icons");

// output file name -> lucide icon
const ICONS = {
  // three steps
  "step-import": "upload", "step-campaign": "list-checks", "step-reply": "messages-square",
  // texting
  "csv-upload": "file-spreadsheet", "bulk-campaigns": "send", "follow-up-steps": "timer", "personalization": "user-pen",
  "message-variations": "shuffle", "two-way-inbox": "inbox", "picture-messages": "image", "opt-out": "octagon-x",
  "cost-estimate": "calculator", "quiet-hours": "moon", "local-numbers": "map-pin", "reporting": "chart-column",
  // dialer
  "manual-dial": "phone", "power-dial": "phone-forwarded", "predictive-dial": "phone-call", "call-outcomes": "clipboard-check",
  "callbacks": "alarm-clock", "live-transfer": "arrow-left-right", "team-calls": "users", "browser-calling": "headset",
  // AI
  "ai-replies": "bot", "ai-qualify": "list-filter", "ai-booking": "calendar-check", "ai-receptionist": "phone-incoming",
  "ai-handoff": "user-check", "ai-instructions": "sliders-horizontal",
  // industries
  "insurance": "shield", "health": "heart-pulse", "life": "umbrella", "medicare": "stethoscope", "final-expense": "hand-heart",
  "auto": "car", "real-estate": "house", "mortgage": "landmark", "solar": "sun", "roofing": "hammer",
  "recruiting": "user-search", "med-spa": "sparkles", "sales-team": "handshake",
  // integrations
  "webhook": "webhook", "calendar": "calendar-days", "spreadsheet": "sheet", "zap": "zap",
  // tools
  "tool-counter": "type", "tool-cost": "circle-dollar-sign", "tool-roi": "trending-up", "tool-quiet": "clock",
  "tool-cadence": "calendar-range", "tool-templates": "message-square-text", "tool-speed": "gauge", "tool-dialer": "sigma",
  "tool-noshow": "calendar-x", "tool-10dlc": "badge-check",
  // compliance
  "compliance-registration": "file-check", "compliance-consent": "signature", "compliance-records": "archive",
};

function attrs(node) {
  return Object.entries(node).filter(([key]) => key !== "key").map(([key, value]) => `${key}="${value}"`).join(" ");
}

mkdirSync(outDir, { recursive: true });
for (const [name, icon] of Object.entries(ICONS)) {
  const source = readFileSync(join(iconDir, `${icon}.js`), "utf8");
  const match = source.match(/const __iconNode = (\[[\s\S]*?\]);\n/);
  if (!match) throw new Error(`No icon data for ${icon}`);
  const nodes = Function(`return ${match[1]}`)();
  const shapes = nodes.map(([tag, node]) => `<${tag} ${attrs(node)}/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="#e2efe2"/><g transform="translate(24 24) scale(2)" fill="none" stroke="#174f3e" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${shapes}</g></svg>\n`;
  writeFileSync(join(outDir, `${name}.svg`), svg);
}
console.log(`Wrote ${Object.keys(ICONS).length} icons to public/home/icons`);
