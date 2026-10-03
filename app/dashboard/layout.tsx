import type { Metadata } from "next";
import { Suspense } from "react";
import "./workspace-v2.css";

// App-only route: keep it out of search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
