export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="mt-4 text-xl text-zinc-400">Page not found</p>
        <a href="/" className="mt-6 inline-block rounded-xl bg-violet-600 px-6 py-3 font-medium hover:bg-violet-700">
          Go Home
        </a>
      </div>
    </div>
  );
}
