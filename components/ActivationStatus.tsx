"use client";

import { useEffect, useRef, useState } from "react";

// ── Activation progress ────────────────────────────────────────────────────
//
// What the customer watches while their texting number is provisioned.
//
// The old flow made the browser drive registration, so the customer had to
// keep the tab open through a carrier review that can run for hours. This
// component only *reports* — /api/messaging/advance does the work server-side,
// so closing the tab is now harmless and reopening it shows current state.
//
// Deliberately free of telecom vocabulary: no brand, campaign, TCR or MNO.

type StatusPayload = {
  success: boolean;
  status: string;
  headline: string;
  detail: string;
  progress: number;
  needsCustomerAction: boolean;
  error: string | null;
  activeNumber: string | null;
  amountNeeded: number;
};

const POLL_MS = 15_000;

export default function ActivationStatus({
  authFetch,
  onActive,
  onFixDetails,
  onAddFunds,
  onStart,
}: {
  /** Injected so this component doesn't need to know how auth is wired. */
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onActive?: () => void;
  onFixDetails?: () => void;
  onAddFunds?: (amountNeeded: number) => void;
  onStart?: () => void;
}) {
  const [state, setState] = useState<StatusPayload | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // Ref rather than state so the poll effect doesn't restart on every tick.
  const notifiedActive = useRef(false);

  // One effect owns both the first fetch and the polling. Keeping the
  // initial load inside the subscription (rather than its own effect that
  // calls setState synchronously) is what React 19 wants, and it also means
  // there is a single place that knows when to stop.
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const tick = async () => {
      try {
        const res = await authFetch("/api/messaging/status");
        const data = (await res.json()) as StatusPayload;
        if (cancelled) return;

        if (data.success) {
          setState(data);
          setLoadFailed(false);

          if (data.status === "ACTIVE" && !notifiedActive.current) {
            notifiedActive.current = true;
            onActive?.();
          }
          // Nothing left to wait for: stop polling rather than hitting the
          // endpoint forever on a settled account.
          if (data.status === "ACTIVE" || data.needsCustomerAction) {
            if (timer) window.clearInterval(timer);
            timer = undefined;
          }
        }
      } catch {
        // Transient network failure — keep the last known state on screen
        // rather than flashing an error at someone mid-activation.
        if (!cancelled) setLoadFailed(true);
      }
    };

    void tick();
    timer = window.setInterval(tick, POLL_MS);

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [authFetch, onActive]);

  if (!state) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-7">
        <p className="text-zinc-400">Checking your texting status…</p>
      </div>
    );
  }

  const notStarted = state.status === "NOT_STARTED";
  const isActive = state.status === "ACTIVE";
  const isProblem = state.status === "REJECTED";
  const needsFunds = state.status === "AWAITING_PAYMENT";

  const accent = isActive
    ? "border-emerald-400/40 bg-emerald-400/10"
    : isProblem
      ? "border-red-400/40 bg-red-400/10"
      : "border-zinc-800 bg-zinc-900/40";

  return (
    <div className={`rounded-3xl border p-7 ${accent}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-black tracking-tight text-white">{state.headline}</h3>
          <p className="mt-2 leading-7 text-zinc-300">{state.detail}</p>
        </div>
        {isActive && <span className="text-2xl" aria-hidden="true">✓</span>}
      </div>

      {!isActive && !isProblem && !notStarted && (
        <div className="mt-6">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-zinc-800"
            role="progressbar"
            aria-valuenow={state.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Texting activation progress"
          >
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-700"
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-zinc-500">
            {state.needsCustomerAction
              ? "Waiting on you"
              : "This runs in the background — you can close this page and come back."}
          </p>
        </div>
      )}

      {isActive && state.activeNumber && (
        <p className="mt-5 text-lg font-bold text-emerald-300">{state.activeNumber}</p>
      )}

      {needsFunds && (
        <div className="mt-6">
          <p className="text-sm text-zinc-400">
            Add ${state.amountNeeded.toFixed(2)} and we&apos;ll finish automatically — no need to come back to
            this screen.
          </p>
          <button
            type="button"
            onClick={() => onAddFunds?.(state.amountNeeded)}
            className="mt-4 rounded-2xl bg-emerald-400 px-6 py-3 font-bold text-zinc-950 hover:bg-emerald-300"
          >
            Add funds
          </button>
        </div>
      )}

      {notStarted && (
        <button
          type="button"
          onClick={() => onStart?.()}
          className="mt-6 rounded-2xl bg-emerald-400 px-6 py-3 font-bold text-zinc-950 hover:bg-emerald-300"
        >
          Activate texting
        </button>
      )}

      {isProblem && (
        <div className="mt-6">
          {state.error && <p className="text-sm text-red-200">{state.error}</p>}
          <button
            type="button"
            onClick={() => onFixDetails?.()}
            className="mt-4 rounded-2xl bg-white px-6 py-3 font-bold text-zinc-950 hover:bg-zinc-200"
          >
            Review business details
          </button>
        </div>
      )}

      {loadFailed && (
        <p className="mt-4 text-xs text-zinc-500">
          Couldn&apos;t refresh just now — retrying.
        </p>
      )}
    </div>
  );
}
