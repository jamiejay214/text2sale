import Link from "next/link";

// One header for every public page: sticky, with a short menu into the
// insurance product pages, comparisons and key guides. Built on
// hover/focus-within and <details>, so it needs no client JavaScript and
// every link is in the server-rendered HTML.
//
// Kept deliberately short: every page used to link all ~76 landing pages from
// both the header and the footer, which spread crawl attention across pages
// Google had not indexed. Other pages are reached from contextual links in
// page bodies, the blog and the hub pages (/insurance-agents, /blog).

type MenuLink = { href: string; label: string };
type Menu = { label: string; columns: { heading?: string; links: MenuLink[] }[] };

const MENUS: Menu[] = [
  {
    label: "Product",
    columns: [{ links: [
      { href: "/sms-crm-for-insurance-agents", label: "SMS CRM for insurance agents" },
      { href: "/insurance-lead-follow-up-software", label: "Lead follow-up software" },
      { href: "/ai-for-insurance-agents", label: "AI for insurance agents" },
      { href: "/10dlc-compliant-texting", label: "10DLC registration" },
    ] }],
  },
  {
    label: "Insurance",
    columns: [{ links: [
      { href: "/insurance-agents", label: "All insurance agents" },
      { href: "/health-insurance-texting-crm", label: "Health insurance" },
      { href: "/crm-for-aca-agents", label: "ACA agents" },
      { href: "/life-insurance", label: "Life insurance" },
      { href: "/final-expense-texting-crm", label: "Final expense" },
      { href: "/medicare-agent-texting-crm", label: "Medicare" },
      { href: "/auto-insurance-texting-crm", label: "Auto insurance" },
    ] }],
  },
  {
    label: "Compare",
    columns: [{ links: [
      { href: "/text2sale-vs-textdrip", label: "Text2Sale vs TextDrip" },
      { href: "/text2sale-vs-onlysales", label: "Text2Sale vs OnlySales" },
      { href: "/text2sale-vs-gohighlevel", label: "Text2Sale vs GoHighLevel" },
      { href: "/text2sale-vs-salesmsg", label: "Text2Sale vs Salesmsg" },
    ] }],
  },
  {
    label: "Resources",
    columns: [{ links: [
      { href: "/blog", label: "Blog" },
      { href: "/speed-to-lead-for-insurance-agents", label: "Speed to lead" },
      { href: "/how-to-text-insurance-leads", label: "How to text insurance leads" },
      { href: "/insurance-text-templates", label: "Insurance text templates" },
    ] }],
  },
];

export const SIGNUP_HREF = "/?signup=1#auth-form";

function LogoMark() {
  return (
    <svg aria-hidden="true" width="30" height="30" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="10" fill="#16634b" />
      <path d="M8 9.75C8 7.68 9.68 6 11.75 6h8.5C22.32 6 24 7.68 24 9.75v6.5A3.75 3.75 0 0 1 20.25 20H15l-4.9 4.08c-.65.54-1.63.08-1.61-.77L8.6 20.6A3.75 3.75 0 0 1 8 18.55v-8.8Z" fill="white" />
      <path d="m11.5 16 3.2-3.15 2.35 2.1 3.55-4.1m-2.15 0h2.15V13" fill="none" stroke="#16634b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-emerald-800 bg-[#102c23] text-white">
      <nav aria-label="Main navigation" className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link href="/" className="mr-auto flex items-center gap-2 text-xl font-bold tracking-tight text-white">
          <LogoMark /> Text2Sale
        </Link>

        <ul className="hidden items-center lg:flex">
          {MENUS.map((menu) => (
            <li key={menu.label} className="group relative">
              <button type="button" aria-haspopup="true" className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-emerald-50 hover:bg-white/10">
                {menu.label}
                <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
              </button>
              <div className="invisible absolute left-1/2 top-full z-50 w-max max-w-[92vw] -translate-x-1/2 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <div className="flex gap-8 rounded-2xl border border-emerald-800 bg-[#0b241b] p-5 shadow-2xl">
                  {menu.columns.map((column, index) => (
                    <div key={column.heading ?? index}>
                      {column.heading && <p className="mb-2 text-xs font-bold uppercase tracking-wider text-lime-200">{column.heading}</p>}
                      <ul className="space-y-1">
                        {column.links.map((link) => (
                          <li key={link.href}>
                            <Link href={link.href} className="block rounded-md px-2 py-1 text-sm text-emerald-50 hover:bg-white/10 hover:text-white">
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </li>
          ))}
          <li>
            <Link href="/pricing" className="rounded-lg px-3 py-2 text-sm font-semibold text-emerald-50 hover:bg-white/10">Pricing</Link>
          </li>
        </ul>

        <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-emerald-50 hover:bg-white/10 sm:block">Log in</Link>
        <Link href="/demo" className="hidden rounded-xl border border-emerald-300/60 px-4 py-2 text-sm font-bold text-emerald-50 hover:bg-white/10 md:block">Book a demo</Link>
        <Link href={SIGNUP_HREF} className="whitespace-nowrap rounded-xl bg-emerald-300 px-4 py-2 text-sm font-bold text-emerald-950 hover:bg-emerald-200">Get started</Link>

        <details className="group/menu lg:hidden">
          <summary aria-label="Open menu" className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-emerald-700 [&::-webkit-details-marker]:hidden">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </summary>
          <div className="absolute inset-x-0 top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-emerald-800 bg-[#0b241b] px-4 pb-6 pt-2 shadow-2xl">
            {MENUS.map((menu) => (
              <details key={menu.label} className="border-b border-emerald-900">
                <summary className="cursor-pointer py-3 text-base font-semibold text-white">{menu.label}</summary>
                <ul className="grid gap-x-4 pb-3 sm:grid-cols-2">
                  {menu.columns.flatMap((column) => column.links).map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="block py-2 text-sm text-emerald-100">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
            <Link href="/pricing" className="block border-b border-emerald-900 py-3 text-base font-semibold text-white">Pricing</Link>
            <Link href="/login" className="block border-b border-emerald-900 py-3 text-base font-semibold text-white">Log in</Link>
            <div className="mt-4 grid gap-3">
              <Link href={SIGNUP_HREF} className="rounded-xl bg-emerald-300 px-4 py-3 text-center font-bold text-emerald-950">Get started</Link>
              <Link href="/demo" className="rounded-xl border border-emerald-300/60 px-4 py-3 text-center font-bold text-emerald-50">Book a demo</Link>
            </div>
          </div>
        </details>
      </nav>
    </header>
  );
}
