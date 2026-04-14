import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchBusiness, getBusinessName } from "@/lib/biz-fetch";

export default async function BizLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const biz = await fetchBusiness(slug);
  if (!biz) notFound();

  const businessName = getBusinessName(biz);
  const base = `/biz/${slug}`;

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href={base} className="text-xl font-bold text-emerald-700">
            {businessName}
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href={base} className="hover:text-emerald-700 transition">
              Home
            </Link>
            <Link href={`${base}/opt-in`} className="hover:text-emerald-700 transition">
              Get Updates
            </Link>
            <Link href={`${base}/privacy-policy`} className="hover:text-emerald-700 transition">
              Privacy Policy
            </Link>
            <Link href={`${base}/terms`} className="hover:text-emerald-700 transition">
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
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} {businessName}. All rights reserved.
            </div>
            <div className="flex gap-6 text-sm text-gray-500">
              <Link href={`${base}/privacy-policy`} className="hover:text-gray-900 transition">
                Privacy Policy
              </Link>
              <Link href={`${base}/terms`} className="hover:text-gray-900 transition">
                Terms of Service
              </Link>
              <Link href={`${base}/opt-in`} className="hover:text-gray-900 transition">
                SMS Opt-In
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
