import Link from "next/link";

// Footer links on every public page. Kept to the core pages: this
// used to list all ~76 landing pages on every page, spreading crawl attention
// across pages Google had not indexed. Other pages are reached from links in
// page bodies, the blog and the hub pages (/insurance-agents, /blog).

const COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/demo", label: "Book a demo" },
      { href: "/sms-crm-for-insurance-agents", label: "SMS CRM for insurance agents" },
      { href: "/10dlc-compliant-texting", label: "10DLC registration" },
    ],
  },
  {
    heading: "Industries",
    links: [
      { href: "/insurance-agents", label: "Insurance agents" },
      { href: "/health-insurance-texting-crm", label: "Health insurance" },
      { href: "/life-insurance", label: "Life insurance" },
      { href: "/real-estate-texting-crm", label: "Real estate" },
      { href: "/solar-sales-texting-crm", label: "Solar" },
      { href: "/roofing", label: "Home services" },
      { href: "/med-spa", label: "Med spas" },
    ],
  },
  {
    heading: "Compare",
    links: [
      { href: "/text2sale-vs-textdrip", label: "vs TextDrip" },
      { href: "/text2sale-vs-onlysales", label: "vs OnlySales" },
      { href: "/text2sale-vs-gohighlevel", label: "vs GoHighLevel" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/speed-to-lead-for-insurance-agents", label: "Speed to lead" },
      { href: "/insurance-text-templates", label: "Insurance text templates" },
    ],
  },
];

export default function SiteLinks() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 border-b border-zinc-800 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
      {COLUMNS.map((column) => (
        <div key={column.heading}>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">{column.heading}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {column.links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-zinc-400 transition hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
