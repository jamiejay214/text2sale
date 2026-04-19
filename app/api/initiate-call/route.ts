import { NextResponse } from "next/server";

// ─── POST /api/initiate-call ─────────────────────────────────────────────
// ⛔ Hard-disabled.
//
// This used to be a two-leg bridged outbound call: we'd ring the user's
// cell phone first, they'd pick up, and then Telnyx would bridge in the
// contact on the second leg. That pattern is gone — calls now run
// directly in the browser over WebRTC (see /api/telnyx/webrtc-token and
// components/BrowserPhone.tsx).
//
// We keep this route so any cached browser tab or stale deploy that still
// POSTs here fails fast with a 410, instead of actually ringing anyone's
// phone. If you need to resurrect bridging, restore from git history —
// but do NOT re-enable without a UI opt-in; this behavior has surprised
// users more than once.
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error:
        "Outbound phone bridging is disabled. Calls go through the browser now — reload the dashboard if you just updated.",
    },
    { status: 410 }
  );
}
