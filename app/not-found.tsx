import Link from "next/link";

export default function NotFound() {
  return (
    <div className="public-theme flex min-h-screen items-center justify-center bg-zinc-950 text-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="mt-4 text-xl text-zinc-400">Page not found</p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-6 py-3 font-semibold text-emerald-950 hover:brightness-110">
          Go Home
        </Link>
      </div>
    </div>
  );
}
