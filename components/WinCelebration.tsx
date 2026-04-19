"use client";

// ─── WinCelebration ──────────────────────────────────────────────────────
// Full-screen confetti + fireworks blast for 10 seconds when a rep drags a
// lead into "Won". Pure canvas — no deps, no images. Auto-unmounts after
// the show so we don't leak animation frames.
//
// Implementation notes:
//  - Setup runs ONCE per activation (keyed off the `active` prop). We use
//    a ref for onDone so a re-rendered parent doesn't restart the show.
//  - The dramatic gradient "background change" is a full-bleed animated
//    div behind the canvas, not a subtle 10% veil.

import React, { useEffect, useRef, useState } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rot: number;
  vr: number;
  shape: "rect" | "circle";
  life: number;
};

const COLORS = [
  "#10b981", // emerald
  "#34d399", // emerald-light
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#eab308", // yellow
  "#ffffff", // white sparkle
];

const DURATION_MS = 10_000;

type Props = {
  active: boolean;
  message?: string;
  onDone?: () => void;
};

export default function WinCelebration({ active, message, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const onDoneRef = useRef(onDone);
  const [visible, setVisible] = useState(false);

  // Keep onDone ref fresh without retriggering the setup effect
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!active) {
      // Parent dismissed us — make sure we're hidden and bail.
      setVisible(false);
      return;
    }

    setVisible(true);
    const startedAt = performance.now();

    // HARD safety timeout — no matter what happens below (canvas init
    // failing, RAF loop getting killed, etc), we ALWAYS tear down the
    // overlay after the duration. Without this, a failed animation left
    // the gradient background flashing on screen until a page refresh.
    const hardStopId = window.setTimeout(() => {
      setVisible(false);
      onDoneRef.current?.();
    }, DURATION_MS + 300);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d") || null;
    if (!canvas || !ctx) {
      // Canvas unavailable — we still honor DURATION_MS via the hard
      // timeout above, so the label + background animations play out
      // and then cleanly dismiss.
      return () => {
        window.clearTimeout(hardStopId);
      };
    }

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    particlesRef.current = [];

    const seedConfetti = (count: number) => {
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: -20 - Math.random() * 200,
          vx: (Math.random() - 0.5) * 5,
          vy: 2 + Math.random() * 4,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 8 + Math.random() * 8,
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.4,
          shape: Math.random() < 0.7 ? "rect" : "circle",
          life: 1,
        });
      }
    };

    const firework = (cx: number, cy: number) => {
      const n = 60 + Math.floor(Math.random() * 40);
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n + Math.random() * 0.1;
        const speed = 5 + Math.random() * 6;
        particlesRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          size: 4 + Math.random() * 4,
          rot: 0,
          vr: 0,
          shape: "circle",
          life: 1,
        });
      }
    };

    // Opening burst
    seedConfetti(260);
    firework(canvas.width * 0.5, canvas.height * 0.3);

    const timers: number[] = [];
    // Fireworks on a schedule
    for (let i = 0; i < 12; i++) {
      timers.push(
        window.setTimeout(() => {
          firework(
            canvas.width * (0.15 + Math.random() * 0.7),
            canvas.height * (0.15 + Math.random() * 0.35)
          );
        }, 200 + i * 700)
      );
    }
    // Rolling confetti refills
    for (let i = 0; i < 6; i++) {
      timers.push(
        window.setTimeout(() => seedConfetti(140), 1200 + i * 1300)
      );
    }

    const step = () => {
      const elapsed = performance.now() - startedAt;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particlesRef.current) {
        p.vy += 0.14;
        p.vx *= 0.995;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (elapsed > DURATION_MS - 2000) {
          p.life = Math.max(0, 1 - (elapsed - (DURATION_MS - 2000)) / 2000);
        }

        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.4);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      particlesRef.current = particlesRef.current.filter(
        (p) => p.y < canvas.height + 50 && p.life > 0.05
      );

      if (elapsed < DURATION_MS) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setVisible(false);
        onDoneRef.current?.();
      }
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(hardStopId);
      window.removeEventListener("resize", resize);
    };
    // Only re-run when `active` flips — onDone is held in a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[200]">
      {/* DRAMATIC animated background — multiple color wash layers */}
      <div className="absolute inset-0 animate-[winBg_10s_ease-in-out_forwards]">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-violet-600 to-pink-600" />
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/60 via-transparent to-cyan-500/60" />
      </div>

      {/* Pulsing spotlight behind the banner */}
      <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 animate-[winPulse_2s_ease-in-out_infinite] rounded-full bg-white/20 blur-3xl" />

      {/* Confetti + fireworks canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* 🎉 Big centered label */}
      <div className="absolute inset-x-0 top-24 flex justify-center">
        <div className="animate-[winPop_10s_ease-out_forwards] rounded-[2rem] border-2 border-white/60 bg-gradient-to-br from-white/30 via-white/10 to-white/30 px-12 py-8 shadow-2xl shadow-black/40 ring-4 ring-white/20 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <span className="text-6xl drop-shadow-lg">🎉</span>
            <div className="text-center">
              <div className="text-[13px] font-bold uppercase tracking-[0.3em] text-white/90 drop-shadow">
                Closed &amp; Won
              </div>
              <div className="mt-1 text-4xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                {message || "Cha-ching! 💰"}
              </div>
            </div>
            <span className="text-6xl drop-shadow-lg">🎊</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes winPop {
          0% { transform: scale(0.2) rotate(-8deg); opacity: 0; }
          8% { transform: scale(1.15) rotate(3deg); opacity: 1; }
          14% { transform: scale(1) rotate(0deg); }
          85% { transform: scale(1) rotate(0deg); opacity: 1; }
          100% { transform: scale(0.9) translateY(-30px); opacity: 0; }
        }
        @keyframes winBg {
          0% { opacity: 0; }
          5%, 80% { opacity: 0.85; }
          100% { opacity: 0; }
        }
        @keyframes winPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.4; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
