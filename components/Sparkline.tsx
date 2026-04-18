"use client";

import React from "react";

// ────────────────────────────────────────────────────────────────────────────
// Sparkline — tiny inline chart used in dashboard hero stat cards.
//
// Renders an SVG polyline + soft gradient fill. Gracefully handles flat /
// empty data by drawing a centered baseline.
// ────────────────────────────────────────────────────────────────────────────

type Props = {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;        // e.g. "#34d399" (emerald-400)
  fill?: string;          // matching translucent color, e.g. "rgba(52,211,153,0.18)"
  strokeWidth?: number;
  className?: string;
};

export default function Sparkline({
  values,
  width = 120,
  height = 36,
  stroke = "#a78bfa",
  fill = "rgba(167, 139, 250, 0.18)",
  strokeWidth = 1.5,
  className = "",
}: Props) {
  const clean = values && values.length >= 2 ? values : [0, 0];
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = max - min || 1;
  const step = clean.length > 1 ? width / (clean.length - 1) : width;

  const points = clean.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${width.toFixed(1)},${height} L0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
    >
      <path d={areaPath} fill={fill} />
      <path d={path} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      {/* Endpoint dot */}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1][0]}
          cy={points[points.length - 1][1]}
          r={2.2}
          fill={stroke}
        />
      )}
    </svg>
  );
}
