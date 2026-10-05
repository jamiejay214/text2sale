"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, ChevronDown, Globe, UserPlus } from "lucide-react";

type Notice = {
  id: string;
  kind: "visit" | "signup" | "support" | "test";
  title: string;
  body: string;
  url: string;
  created_at: string;
  read_at: string | null;
  push_status: "pending" | "queued" | "sent" | "failed";
};

export default function Notifications({ token, demo }: { token: string | null; demo: boolean }) {
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "visit" | "signup" | "support">("all");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!token || demo) return;
    try {
      const response = await fetch("/api/command-center/notifications", {
        headers: { authorization: `Bearer ${token}` }, cache: "no-store", signal,
      });
      if (!response.ok) throw new Error("Notifications couldn't refresh.");
      const data = await response.json();
      setItems(data.items);
      setUnread(data.unread);
      setError("");
      setLoaded(true);
    } catch {
      if (!signal?.aborted) setError("Notifications couldn't refresh. Try again.");
    }
  }, [token, demo]);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh(controller.signal);
    }, 15_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh(controller.signal);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  async function markRead(body: { id: string } | { before: string }) {
    if (!token || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/command-center/notifications", {
        method: "PATCH",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error();
      await refresh();
    } catch { setError("Couldn't mark notifications as read. Try again."); }
    finally { setBusy(false); }
  }

  const visible = items.filter((item) => filter === "all" || item.kind === filter);
  return (
    <section className="mb-5 rounded-2xl border border-emerald-400/20 bg-[#0c1820]" aria-label="Command Center notifications">
      <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="command-notification-list">
        <span className="rounded-xl bg-emerald-400/10 p-2 text-emerald-300"><Bell className="h-4 w-4" /></span>
        <span className="flex-1">
          <span className="text-sm font-semibold text-white">Notifications</span>
          <span className="mt-0.5 block text-xs text-slate-300">Visits, CRM signups and support replies</span>
        </span>
        <span aria-live="polite" className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-200">
          {error ? "Check connection" : unread ? `${unread} unread` : loaded || demo ? "All caught up" : "Loading…"}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-300 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id="command-notification-list" className="border-t border-white/10 p-4">
          <p className="mb-4 text-xs leading-5 text-slate-300">
            One alert per tracked website session, plus every new CRM account and customer support message. Known bots and internal pages are excluded.
            Phone alerts use your registered Command Center device, even while the app is closed.
          </p>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {(["all", "visit", "signup", "support"] as const).map((kind) => (
              <button key={kind} onClick={() => setFilter(kind)} aria-pressed={filter === kind}
                className={`rounded-lg px-3 py-1.5 text-xs ${filter === kind ? "bg-emerald-400 text-slate-950" : "bg-white/5 text-slate-200"}`}>
                {kind === "all" ? "All" : kind === "visit" ? "Visits" : kind === "support" ? "Support" : "Signups"}
              </button>
            ))}
            <button disabled={busy || !unread || !items.length} onClick={() => void markRead({ before: items[0].created_at })}
              className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-200 disabled:opacity-40">
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          </div>
          {error && <div role="alert" className="mb-3 text-xs text-amber-200">{error} <button onClick={() => void refresh()} className="underline">Retry</button></div>}
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {!visible.length && <p className="py-6 text-center text-sm text-slate-300">{loaded || demo ? "New notifications will appear here." : "Loading notifications…"}</p>}
            {visible.map((item) => (
              <article key={item.id} className={`rounded-xl border p-3 ${item.read_at ? "border-white/5 bg-white/[0.02]" : "border-emerald-400/25 bg-emerald-400/5"}`}>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-emerald-300">{item.kind === "signup" ? <UserPlus className="h-4 w-4" /> : <Globe className="h-4 w-4" />}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    {item.kind === "support" && <a className="mt-1 block text-xs text-emerald-200 underline" href={item.url}>Open chat & reply</a>}
                    <p className="mt-1 break-words text-xs leading-5 text-slate-300">{item.body}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time>
                      <span>{item.push_status === "sent" ? "Push sent" : item.push_status === "failed" ? "Push failed — check device alerts" : "Push pending"}</span>
                      {!item.read_at && <button disabled={busy} onClick={() => void markRead({ id: item.id })} className="text-emerald-200 underline disabled:opacity-40">Mark read</button>}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {items.length === 100 && <p className="mt-3 text-xs text-slate-400">Showing the latest 100 notifications.</p>}
        </div>
      )}
    </section>
  );
}
