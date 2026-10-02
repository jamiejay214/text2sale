import Link from "next/link";
import { loadSite } from "@/lib/biz-site";

export default async function BizLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = (await loadSite(slug, { required: true }))!;
  const { name, contact, href } = site;

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Link href={href("")} className="text-xl font-bold text-emerald-700">
            {name}
          </Link>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm font-medium text-gray-600">
            <Link href={href("")} className="hover:text-emerald-700 transition">
              Home
            </Link>
            <Link href={href("/opt-in")} className="hover:text-emerald-700 transition">
              Text Updates
            </Link>
            <Link href={href("/privacy-policy")} className="hover:text-emerald-700 transition">
              Privacy Policy
            </Link>
            <Link href={href("/terms")} className="hover:text-emerald-700 transition">
              Terms
            </Link>
          </nav>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row">
            <div className="text-sm text-gray-600">
              <div className="font-semibold text-gray-900">{name}</div>
              {contact.address && <div className="mt-1">{contact.address}</div>}
              {contact.phone && (
                <div className="mt-1">
                  <a href={`tel:${contact.phone.replace(/\D/g, "")}`} className="hover:text-emerald-700">
                    {contact.phone}
                  </a>
                </div>
              )}
              {contact.email && (
                <div className="mt-1">
                  <a href={`mailto:${contact.email}`} className="hover:text-emerald-700">
                    {contact.email}
                  </a>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500 sm:justify-end">
              <Link href={href("/privacy-policy")} className="hover:text-gray-900 transition">
                Privacy Policy
              </Link>
              <Link href={href("/terms")} className="hover:text-gray-900 transition">
                Terms of Service
              </Link>
              <Link href={href("/opt-in")} className="hover:text-gray-900 transition">
                SMS Opt-In
              </Link>
            </div>
          </div>
          <div className="mt-6 border-t border-gray-200 pt-4 text-xs leading-relaxed text-gray-500">
            Text message program: message frequency varies. Message and data rates may apply. Reply STOP to
            cancel, HELP for help. Mobile information is never shared with third parties for marketing
            purposes.
          </div>
          <div className="mt-3 text-xs text-gray-400">
            &copy; {new Date().getFullYear()} {name}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
