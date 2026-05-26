"use client";

// NEXUS — the talk-to-it / talks-back assistant.
// Speech-to-text via the browser SpeechRecognition API, answers from
// /api/command-center/ask, then speaks the reply with speechSynthesis.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Send, Volume2, VolumeX, X, Sparkles, Loader2 } from "lucide-react";
import type { Overview } from "@/lib/command-center";

type Msg = { role: "user" | "nexus"; text: string };

type SRResult = { transcript: string };
interface SREvent { results: ArrayLike<ArrayLike<SRResult>> }
interface SR {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (e: SREvent) => void;
  onerror: (e: unknown) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}
type SRCtor = new () => SR;

export default function CommandVoice({
  token,
  snapshot,
  accent = "#a855f7",
}: {
  token: string | null;
  snapshot: Overview | null;
  accent?: string;
}) {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [supported, setSupported] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "nexus", text: "I'm NEXUS. Tap the mic and ask me anything — revenue, visitors, leads, which business is winning." },
  ]);
  const recRef = useRef<SR | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript || "";
      if (transcript) ask(transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    return () => {
      try { rec.stop(); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const speak = useCallback(
    (text: string) => {
      if (muted || typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.04;
      u.pitch = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => /Google US English|Samantha|Jenny|Aria|Natural/i.test(v.name)) ||
        voices.find((v) => v.lang === "en-US");
      if (preferred) u.voice = preferred;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    },
    [muted]
  );

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q) return;
      setMessages((m) => [...m, { role: "user", text: q }]);
      setInput("");
      setThinking(true);
      try {
        const res = await fetch("/api/command-center/ask", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ question: q, snapshot: snapshotRef.current }),
        });
        const data = await res.json();
        const answer = data.answer || data.error || "I couldn't reach the data just now.";
        setMessages((m) => [...m, { role: "nexus", text: answer }]);
        speak(answer);
      } catch {
        const fallback = "Something went wrong reaching the server.";
        setMessages((m) => [...m, { role: "nexus", text: fallback }]);
      } finally {
        setThinking(false);
      }
    },
    [token, speak]
  );

  const toggleListen = () => {
    if (!recRef.current) return;
    if (listening) {
      recRef.current.stop();
      setListening(false);
    } else {
      try {
        window.speechSynthesis?.cancel();
        recRef.current.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    }
  };

  const active = listening || speaking || thinking;

  return (
    <>
      {/* Floating orb */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${accent}, #1a0a2e)`,
          boxShadow: `0 0 0 1px ${accent}55, 0 0 40px ${accent}80`,
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        animate={active ? { scale: [1, 1.08, 1] } : {}}
        transition={active ? { repeat: Infinity, duration: 1.1 } : {}}
        aria-label="Open NEXUS assistant"
      >
        {[0, 1].map((i) =>
          active ? (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full"
              style={{ border: `1.5px solid ${accent}` }}
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.5 }}
            />
          ) : null
        )}
        <Sparkles className="h-7 w-7 text-white" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-28 right-6 z-50 flex h-[30rem] w-[22rem] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0a0712]/95 backdrop-blur-2xl"
            style={{ boxShadow: `0 24px 70px -20px ${accent}80` }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: accent }} />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
                </span>
                <span className="text-sm font-semibold tracking-wide text-white">NEXUS</span>
                <span className="text-[10px] uppercase tracking-widest text-white/35">co-pilot</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setMuted((m) => !m)} className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Toggle voice">
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      m.role === "user" ? "bg-white/10 text-white" : "text-white/90"
                    }`}
                    style={m.role === "nexus" ? { background: `${accent}1f`, border: `1px solid ${accent}33` } : {}}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> NEXUS is thinking…
                </div>
              )}
            </div>

            <div className="border-t border-white/10 p-3">
              {!supported && (
                <div className="mb-2 text-center text-[11px] text-amber-300/80">
                  Voice input needs Chrome/Edge/Safari. You can still type.
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleListen}
                  disabled={!supported}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40"
                  style={{
                    background: listening ? accent : `${accent}22`,
                    color: listening ? "#fff" : accent,
                    boxShadow: listening ? `0 0 20px ${accent}` : "none",
                  }}
                  aria-label="Talk"
                >
                  {listening ? <Mic className="h-5 w-5" /> : supported ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && ask(input)}
                  placeholder={listening ? "Listening…" : "Ask about your numbers…"}
                  className="h-10 flex-1 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
                />
                <button
                  onClick={() => ask(input)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ background: accent }}
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
