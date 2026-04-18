"use client";

// ─── BrowserPhone ────────────────────────────────────────────────────────────
// Manages a Telnyx WebRTC session so calls happen directly in the browser
// (no phone required). The parent gets a ref handle to call makeCall/hangup
// and a callback to track state changes.
//
// We load @telnyx/webrtc dynamically to skip SSR (it uses browser APIs).

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export type BrowserCallState =
  | "idle"
  | "connecting"   // WebRTC registering
  | "calling"      // dialing out
  | "ringing"      // contact side ringing
  | "active"       // contact answered
  | "ended";       // call finished

export type BrowserPhoneStatus = {
  ready: boolean;
  callState: BrowserCallState;
  muted: boolean;
  error?: string;
};

export type BrowserPhoneHandle = {
  makeCall: (to: string, from: string) => void;
  hangup: () => void;
  mute: () => void;
  unmute: () => void;
};

type Props = {
  /** Short-lived Telnyx JWT returned by /api/telnyx/webrtc-token */
  token: string | null;
  onStateChange?: (status: BrowserPhoneStatus) => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TelnyxCall = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TelnyxClient = any;

const BrowserPhone = forwardRef<BrowserPhoneHandle, Props>(
  ({ token, onStateChange }, ref) => {
    const clientRef = useRef<TelnyxClient>(null);
    const callRef = useRef<TelnyxCall>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [muted, setMuted] = useState(false);

    const emit = (callState: BrowserCallState, extra?: Partial<BrowserPhoneStatus>) => {
      onStateChange?.({
        ready: !!clientRef.current,
        callState,
        muted,
        ...extra,
      });
    };

    useEffect(() => {
      if (!token) return;

      let destroyed = false;

      // Telnyx WebRTC uses browser APIs — must be a dynamic import
      import("@telnyx/webrtc").then(({ TelnyxRTC }) => {
        if (destroyed) return;

        emit("connecting");

        const client: TelnyxClient = new TelnyxRTC({ login_token: token });

        client.on("telnyx.ready", () => {
          if (destroyed) return;
          clientRef.current = client;
          emit("idle");
        });

        client.on("telnyx.error", (err: unknown) => {
          console.error("[BrowserPhone] telnyx.error", err);
          emit("idle", { error: "WebRTC connection error — check mic permissions." });
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        client.on("telnyx.notification", (notification: any) => {
          if (destroyed) return;
          const { call, type } = notification;
          if (type !== "callUpdate" || !call) return;

          callRef.current = call;

          // Attach remote audio stream to the hidden <audio> element
          if (call.remoteStream && audioRef.current) {
            audioRef.current.srcObject = call.remoteStream;
          }

          // Map Telnyx internal state → our BrowserCallState
          const stateMap: Record<string, BrowserCallState> = {
            new: "calling",
            requesting: "calling",
            trying: "calling",
            ringing: "ringing",
            answering: "active",
            active: "active",
            held: "active",
            done: "ended",
            destroy: "ended",
            purge: "ended",
          };
          const mapped: BrowserCallState = stateMap[call.state] ?? "idle";
          emit(mapped);
        });

        client.connect();
        // Keep a reference even before telnyx.ready fires so hangup works
        clientRef.current = client;
      });

      return () => {
        destroyed = true;
        try {
          clientRef.current?.disconnect();
        } catch {
          // best-effort
        }
        clientRef.current = null;
        callRef.current = null;
      };
      // token changes when user re-auths — reconnect
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    useImperativeHandle(ref, () => ({
      makeCall(to: string, from: string) {
        if (!clientRef.current) {
          console.warn("[BrowserPhone] makeCall called before client ready");
          return;
        }
        const call = clientRef.current.newCall({
          destinationNumber: to,
          callerNumber: from,
          audio: true,
          video: false,
        });
        callRef.current = call;
      },
      hangup() {
        try {
          callRef.current?.hangup();
        } catch {
          // ignore if already gone
        }
      },
      mute() {
        callRef.current?.muteAudio();
        setMuted(true);
        onStateChange?.({
          ready: true,
          callState: "active",
          muted: true,
        });
      },
      unmute() {
        callRef.current?.unmuteAudio();
        setMuted(false);
        onStateChange?.({
          ready: true,
          callState: "active",
          muted: false,
        });
      },
    }));

    // Hidden audio element — browser plays remote audio through it
    return (
      <audio
        ref={audioRef}
        autoPlay
        playsInline
        style={{ display: "none" }}
        aria-hidden="true"
      />
    );
  }
);

BrowserPhone.displayName = "BrowserPhone";
export default BrowserPhone;
