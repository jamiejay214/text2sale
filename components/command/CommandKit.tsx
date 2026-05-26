"use client";

// Reusable neon dashboard primitives for the Command Center.
// Pure SVG + framer-motion — no chart library needed.

import React, { useEffect, useRef, useState } from "react";
import { motion, animate, useInView } from "framer-motion";

export type Pt = { date: string; value: number };
export type Bar = { label: string; value: number };

// ── animated number ──────────────────────────────────────────────────────────
export function CountUp({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.1,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value]);
  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

// ── glass panel ───────────────────────────────────────────────────────────────
export function Panel({
  children,
  className = "",
  glow = "#a855f7",
  title,
  right,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: string;
  title?: string;
  right?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl ${className}`}
      style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.02), 0 18px 50px -20px ${glow}40` }}
    >
      <div
        className="pointer-events-none absolute -top-px left-6 right-6 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${glow}, transparent)` }}
      />
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between">
          {title && (
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">{title}</h3>
          )}
          {right}
        </div>
      )}
      {children}
    </motion.div>
  );
}

// ── smooth area chart ─────────────────────────────────────────────────────────
function smoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export function AreaChart({
  data,
  color = "#a855f7",
  height = 160,
}: {
  data: Pt[];
  color?: string;
  height?: number;
}) {
  const w = 600;
  const h = height;
  const pad = 8;
  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX = (w - pad * 2) / Math.max(data.length - 1, 1);
  const pts = data.map((d, i) => ({
    x: pad + i * stepX,
    y: h - pad - (d.value / max) * (h - pad * 2 - 12),
  }));
  const line = smoothPath(pts);
  const area = line ? `${line} L ${pts[pts.length - 1].x},${h} L ${pts[0].x},${h} Z` : "";
  const id = React.useId().replace(/:/g, "");
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id={`glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1="0" x2={w} y1={h * g} y2={h * g} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      {area && <path d={area} fill={`url(#fill-${id})`} />}
      {line && (
        <motion.path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          filter={`url(#glow-${id})`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />
      )}
      {last && (
        <>
          <circle cx={last.x} cy={last.y} r="4" fill={color} filter={`url(#glow-${id})`} />
          <circle cx={last.x} cy={last.y} r="4" fill="none" stroke={color}>
            <animate attributeName="r" from="4" to="11" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.7" to="0" dur="1.6s" repeatCount="indefinite" />
          </circle>
        </>
      )}
    </svg>
  );
}

// ── horizontal bar list ───────────────────────────────────────────────────────
export function BarList({ data, color = "#a855f7", emptyLabel = "No data yet" }: { data: Bar[]; color?: string; emptyLabel?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (data.length === 0) return <div className="py-6 text-center text-xs text-white/30">{emptyLabel}</div>;
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={d.label + i} className="group">
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-white/70" title={d.label}>{d.label}</span>
            <span className="shrink-0 font-mono text-white/90">{d.value.toLocaleString()}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)`, boxShadow: `0 0 8px ${color}80` }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max((d.value / max) * 100, 3)}%` }}
              transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── donut ─────────────────────────────────────────────────────────────────────
const DONUT_COLORS = ["#a855f7", "#22d3ee", "#34d399", "#fbbf24", "#fb7185", "#818cf8"];
export function Donut({ data, size = 150 }: { data: Bar[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="py-6 text-center text-xs text-white/30">No data yet</div>;
  const r = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} className="-rotate-90">
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * circ;
          const el = (
            <circle
              key={d.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth="14"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              style={{ filter: `drop-shadow(0 0 4px ${DONUT_COLORS[i % DONUT_COLORS.length]}80)` }}
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="text-white/65">{d.label}</span>
            <span className="font-mono text-white/90">{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── funnel ────────────────────────────────────────────────────────────────────
export function Funnel({ steps, color = "#a855f7" }: { steps: Bar[]; color?: string }) {
  const max = Math.max(...steps.map((s) => s.value), 1);
  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const pct = (s.value / max) * 100;
        const conv = i > 0 && steps[i - 1].value > 0 ? Math.round((s.value / steps[i - 1].value) * 100) : null;
        return (
          <div key={s.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-white/70">{s.label}</span>
              <span className="font-mono text-white/90">
                {s.value.toLocaleString()}
                {conv !== null && <span className="ml-2 text-white/35">{conv}%</span>}
              </span>
            </div>
            <div className="h-6 overflow-hidden rounded-lg bg-white/[0.05]">
              <motion.div
                className="flex h-full items-center rounded-lg"
                style={{ background: `linear-gradient(90deg, ${color}dd, ${color}66)` }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(pct, 4)}%` }}
                transition={{ duration: 0.7, delay: i * 0.08 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── KPI tile ──────────────────────────────────────────────────────────────────
export function StatTile({
  label,
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  spark,
  color = "#a855f7",
  sub,
  icon,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  spark?: Pt[];
  color?: string;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Panel glow={color} className="!p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">{label}</div>
          <div className="mt-1.5 font-mono text-2xl font-bold tracking-tight text-white">
            <CountUp value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
          </div>
          {sub && <div className="mt-0.5 text-[11px] text-white/40">{sub}</div>}
        </div>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: `${color}1f`, color }}
        >
          {icon}
        </div>
      </div>
      {spark && spark.length > 1 && (
        <div className="-mb-1 mt-2 h-9">
          <AreaChart data={spark} color={color} height={36} />
        </div>
      )}
    </Panel>
  );
}
