import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Command Center — All Businesses",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Command Center" },
  // Belt-and-suspenders: newer Next emits `mobile-web-app-capable`; also emit
  // the legacy `apple-mobile-web-app-capable` so older iOS launches fullscreen.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#0a0712",
  width: "device-width",
  initialScale: 1,
};

export default function CommandLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
