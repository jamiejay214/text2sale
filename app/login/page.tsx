import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";
import MarketingHeader from "@/components/MarketingHeader";

export const metadata: Metadata = {
  title: "Log In | Text2Sale",
  description: "Log in to your Text2Sale workspace.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <main className="public-theme min-h-screen bg-zinc-950 text-white">
      <MarketingHeader />
      <section className="px-6 py-16 sm:py-24">
        <LoginForm />
      </section>
    </main>
  );
}
