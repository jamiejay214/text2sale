"use client";

// ─── WinCelebration ──────────────────────────────────────────────────────
// Full-screen confetti + fireworks blast for 10 seconds when a rep drags a
// lead into "Won". Pure canvas — no deps, no images. Auto-unmounts after
// the show so we don't leak animation frames.
//
// Usage:
//   const [celebrate, setCelebrate] = useState(false);
//   <WinCelebration active={celebrate} onDone={() => setCelebrate(false)} />

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
  const startedAtRef = useRef<number>(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) return;
    setVisible(true);
    startedAtRef.current = performance.now();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    particlesRef.current = [];

    // Seed an initial confetti burst across the top of the screen
    const seedConfetti = (count: number) => {
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: -20 - Math.random() * 200,
          vx: (Math.random() - 0.5) * 4,
          vy: 1 + Math.random() * 3,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 6 + Math.random() * 6,
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.3,
          shape: Math.random() < 0.7 ? "rect" : "circle",
          life: 1,
        });
      }
    };

    // Firework — radial burst from a point
    const firework = (cx: number, cy: number) => {
      const n = 40 + Math.floor(Math.random() * 30);
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n + Math.random() * 0.1;
        const speed = 4 + Math.random() * 4;
        particlesRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          size: 3 + Math.random() * 3,
          rot: 0,
          vr: 0,
          shape: "circle",
          life: 1,
        });
      }
    };

    seedConfetti(180);

    // Fire fireworks on a schedule
    const fireworkTimers: number[] = [];
    const scheduleFirework = (delay: number) => {
      const t = window.setTimeout(() => {
        firework(
          canvas.width * (0.2 + Math.random() * 0.6),
          canvas.height * (0.15 + Math.random() * 0.3)
        );
      }, delay);
      fireworkTimers.push(t);
    };
    for (let i = 0; i < 8; i++) {
      scheduleFirework(300 + i * 1000);
    }
    // Secondary confetti refills to keep the screen full
    const confettiTimers: number[] = [];
    for (let i = 0; i < 5; i++) {
      confettiTimers.push(
        window.setTimeout(() => seedConfetti(120), 1500 + i * 1500)
      );
    }

    const step = () => {
      const elapsed = performance.now() - startedAtRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particlesRef.current) {
        // Basic physics: gravity + air drag
        p.vy += 0.12;
        p.vx *= 0.995;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        // Fade out in the last 2 seconds of the show
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

      // Drop particles that have left the viewport or faded
      particlesRef.current = particlesRef.current.filter(
        (p) => p.y < canvas.height + 50 && p.life > 0.05
      );

      if (elapsed < DURATION_MS) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setVisible(false);
        onDone?.();
      }
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fireworkTimers.forEach((t) => window.clearTimeout(t));
      confettiTimers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("resize", resize);
    };
  }, [active, onDone]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[200]">
      {/* Soft gradient veil that fades in then out */}
      <div className="absolute inset-0 animate-[winVeil_10s_ease-in-out] bg-gradient-to-br from-emerald-500/10 via-transparent to-violet-500/10" />

      {/* Confetti + fireworks canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* 🎉 Big centered label */}
      <div className="absolute inset-x-0 top-20 flex justify-center">
        <div className="animate-[winPop_10s_ease-out] rounded-3xl border border-emerald-400/50 bg-gradient-to-br from-emerald-500/30 via-green-500/20 to-emerald-600/30 px-10 py-6 shadow-2xl shadow-emerald-500/40 backdrop-blur-xl ring-1 ring-white/10">
          <div className="flex items-center gap-3">
            <span className="text-5xl">🎉</span>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-emerald-200">
                Closed & Won
              </div>
              <div className="text-3xl font-black tracking-tight text-white drop-shadow-lg">
                {message || "Cha-ching! 💰"}
              </div>
            </div>
            <span className="text-5xl">🎊</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes winPop {
          0% { transform: scale(0.2) rotate(-6deg); opacity: 0; }
          10% { transform: scale(1.15) rotate(2deg); opacity: 1; }
          15% { transform: scale(1) rotate(0deg); }
          85% { transform: scale(1) rotate(0deg); opacity: 1; }
          100% { transform: scale(0.95) translateY(-20px); opacity: 0; }
        }
        @keyframes winVeil {
          0%, 100% { opacity: 0; }
          10%, 80% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
