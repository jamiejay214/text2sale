import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Text2Sale",
  description: "Text2Sale CRM for campaigns, contacts, analytics, billing, and admin management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}