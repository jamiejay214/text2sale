"use client";

// ─── BrowserPhone ────────────────────────────────────────────────────────────
// Manages a Telnyx WebRTC session so calls happen directly in the browser
// (no phone required). The parent gets a ref handle to call makeCall/hangup
// and a callback to track state changes.
//
// We load @telnyx/webrtc dynamically to skip SSR (it uses browser APIs).

import { browserCallState, callFailure } from "@/lib/browser-call-state";
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
  /** Set while an inbound call is ringing this browser, until answered. */
  incoming?: { from: string } | null;
};

/**
 * Play a 440+480 Hz ring cadence (onSeconds on, offSeconds off) and return
 * a stop function. Browsers may keep it silent until the page has had a
 * click; the on-screen Answer button still works either way.
 */
function startTone(onSeconds: number, offSeconds: number): () => void {
  try {
    const context = new AudioContext();
    void context.resume().catch(() => undefined);
    const gain = context.createGain();
    gain.gain.value = 0;
    gain.connect(context.destination);
    const tones = [440, 480].map((frequency) => {
      const tone = context.createOscillator();
      tone.frequency.value = frequency;
      tone.connect(gain);
      tone.start();
      return tone;
    });
    const ring = () => {
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setValueAtTime(0.05, context.currentTime);
      gain.gain.setValueAtTime(0, context.currentTime + onSeconds);
    };
    ring();
    const timer = window.setInterval(ring, (onSeconds + offSeconds) * 1000);
    return () => {
      window.clearInterval(timer);
      tones.forEach((tone) => tone.stop());
      void context.close();
    };
  } catch {
    return () => undefined;
  }
}

export type BrowserPhoneHandle = {
  makeCall: (to: string, from: string) => void;
  /** Pick up the inbound call ringing this browser. */
  answer: () => void;
  /** Reject the inbound call ringing this browser. */
  decline: () => void;
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
    const readyRef = useRef(false);
    const ringbackRef = useRef<(() => void) | null>(null);
    const ringtoneRef = useRef<(() => void) | null>(null);
    const callRef = useRef<TelnyxCall>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [muted, setMuted] = useState(false);

    const emit = (callState: BrowserCallState, extra?: Partial<BrowserPhoneStatus>) => {
      onStateChange?.({
        ready: readyRef.current,
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

        client.remoteElement = audioRef.current;

        client.on("telnyx.ready", () => {
          if (destroyed) return;
          clientRef.current = client;
          readyRef.current = true;
          emit("idle");
        });

        client.on("telnyx.error", (err: unknown) => {
          console.error("[BrowserPhone] telnyx.error", err);
          ringbackRef.current?.();
          const message = err && typeof err === "object" && "message" in err ? String(err.message) : "";
          const detail = message || "Unable to connect the browser phone. Check microphone permissions and your connection.";
          emit("ended", { error: detail });
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        client.on("telnyx.notification", (notification: any) => {
          if (destroyed) return;
          const { call, type } = notification;
          if (type !== "callUpdate" || !call) return;

          callRef.current = call;

          // Inbound call ringing this browser (routed here by the call
          // webhook): ring and show Answer / Decline until it's picked up.
          if (call.direction === "inbound" && call.state === "ringing") {
            if (!ringtoneRef.current) ringtoneRef.current = startTone(2, 4);
            emit("ringing", { incoming: { from: String(call.options?.remoteCallerNumber || call.options?.callerNumber || "") } });
            return;
          }
          if (call.state !== "ringing") {
            ringtoneRef.current?.();
            ringtoneRef.current = null;
          }

          // Attach remote audio stream to the hidden <audio> element
          if (call.remoteStream && audioRef.current) {
            audioRef.current.srcObject = call.remoteStream;
          }

          const mapped = browserCallState(call.state);
          if (mapped === "active" || mapped === "ended" || (call.state === "early" && call.remoteStream)) {
            ringbackRef.current?.();
            ringbackRef.current = null;
          }
          if (call.remoteStream && audioRef.current) {
            void audioRef.current.play().catch(() => emit(mapped, { error: "Audio playback is blocked. Allow sound for Text2Sale in your browser." }));
          }
          emit(mapped, { error: mapped === "ended" ? callFailure(call) : undefined });
        });

        client.on("telnyx.socket.close", () => { if (destroyed) return; readyRef.current = false; ringbackRef.current?.(); emit("ended", { error: "Phone connection was lost. Refresh the calling workspace to reconnect." }); });
        client.connect();
        // Keep a reference even before telnyx.ready fires so hangup works
        clientRef.current = client;
      }).catch(() => {
        if (!destroyed) emit("idle", { error: "Could not load the browser phone. Refresh to retry.", ready: false });
      });

      return () => {
        destroyed = true;
        readyRef.current = false;
        ringbackRef.current?.();
        ringbackRef.current = null;
        ringtoneRef.current?.();
        ringtoneRef.current = null;
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
        if (!clientRef.current || !readyRef.current) {
          throw new Error("The browser phone is still connecting. Wait for Phone ready before calling.");
        }
        ringbackRef.current?.();
        // Start audio during the Call button gesture so browser autoplay rules allow ringback.
        const context = new AudioContext();
        void context.resume();
        const gain = context.createGain();
        gain.gain.value = 0;
        gain.connect(context.destination);
        const tones = [440, 480].map((frequency) => {
          const tone = context.createOscillator();
          tone.frequency.value = frequency;
          tone.connect(gain);
          tone.start();
          return tone;
        });
        const ring = () => {
          gain.gain.cancelScheduledValues(context.currentTime);
          gain.gain.setValueAtTime(0.035, context.currentTime);
          gain.gain.setValueAtTime(0, context.currentTime + 2);
        };
        ring();
        const timer = window.setInterval(ring, 6000);
        ringbackRef.current = () => {
          window.clearInterval(timer);
          tones.forEach((tone) => tone.stop());
          void context.close();
          ringbackRef.current = null;
        };
        try {
          const call = clientRef.current.newCall({
            destinationNumber: to,
            callerNumber: from,
            audio: true,
            video: false,
            remoteElement: audioRef.current,
          });
          callRef.current = call;
          emit("calling");
        } catch (error) {
          ringbackRef.current?.();
          throw error;
        }
      },
      answer() {
        ringtoneRef.current?.();
        ringtoneRef.current = null;
        try {
          callRef.current?.answer();
        } catch {
          emit("ended", { error: "Could not answer the call. Check microphone permissions." });
        }
      },
      decline() {
        ringtoneRef.current?.();
        ringtoneRef.current = null;
        try {
          callRef.current?.hangup();
        } catch {
          // already gone
        }
      },
      hangup() {
        ringbackRef.current?.();
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
