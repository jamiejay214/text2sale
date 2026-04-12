"use client";

import React, { useState } from "react";

// US state abbreviation → SVG path data (simplified)
// Uses Vercel geo header region codes (2-letter state abbreviations)
const STATE_PATHS: Record<string, { d: string; name: string }> = {
  AL: { name: "Alabama", d: "M628,396 L628,440 L622,456 L630,462 L628,466 L618,466 L606,456 L606,396Z" },
  AK: { name: "Alaska", d: "M161,485 L183,485 L183,510 L161,510Z" },
  AZ: { name: "Arizona", d: "M205,370 L260,370 L268,430 L250,450 L205,450 L195,410Z" },
  AR: { name: "Arkansas", d: "M548,390 L600,390 L600,432 L548,432Z" },
  CA: { name: "California", d: "M120,250 L170,250 L185,310 L190,370 L170,420 L135,420 L115,350 L110,290Z" },
  CO: { name: "Colorado", d: "M280,280 L370,280 L370,340 L280,340Z" },
  CT: { name: "Connecticut", d: "M800,215 L822,210 L826,228 L806,232Z" },
  DE: { name: "Delaware", d: "M768,275 L780,270 L782,295 L770,295Z" },
  FL: { name: "Florida", d: "M640,440 L710,440 L720,460 L710,510 L680,530 L660,510 L630,470Z" },
  GA: { name: "Georgia", d: "M650,370 L700,370 L710,440 L650,440Z" },
  HI: { name: "Hawaii", d: "M260,485 L290,485 L290,510 L260,510Z" },
  ID: { name: "Idaho", d: "M210,140 L250,140 L260,230 L220,230 L205,190Z" },
  IL: { name: "Illinois", d: "M580,230 L610,230 L618,280 L610,340 L580,360 L565,310 L570,260Z" },
  IN: { name: "Indiana", d: "M618,240 L648,240 L648,330 L618,340Z" },
  IA: { name: "Iowa", d: "M490,220 L560,220 L565,270 L490,275Z" },
  KS: { name: "Kansas", d: "M380,310 L480,310 L480,365 L380,365Z" },
  KY: { name: "Kentucky", d: "M610,320 L700,305 L710,330 L670,350 L610,355Z" },
  LA: { name: "Louisiana", d: "M548,435 L600,435 L610,470 L590,490 L560,480 L548,460Z" },
  ME: { name: "Maine", d: "M830,110 L855,100 L865,140 L840,170 L825,155Z" },
  MD: { name: "Maryland", d: "M720,270 L770,265 L775,290 L740,295 L720,285Z" },
  MA: { name: "Massachusetts", d: "M800,195 L840,190 L845,205 L805,210Z" },
  MI: { name: "Michigan", d: "M595,140 L640,135 L660,190 L640,230 L610,230 L595,180Z" },
  MN: { name: "Minnesota", d: "M470,110 L540,110 L540,200 L470,200Z" },
  MS: { name: "Mississippi", d: "M590,390 L622,390 L622,456 L600,465 L590,440Z" },
  MO: { name: "Missouri", d: "M500,300 L570,290 L580,360 L550,390 L500,380 L490,340Z" },
  MT: { name: "Montana", d: "M250,100 L380,100 L380,170 L250,170Z" },
  NE: { name: "Nebraska", d: "M370,250 L480,245 L485,305 L370,310Z" },
  NV: { name: "Nevada", d: "M170,220 L215,220 L220,340 L190,370 L165,310Z" },
  NH: { name: "New Hampshire", d: "M818,135 L832,130 L836,185 L820,190Z" },
  NJ: { name: "New Jersey", d: "M780,235 L795,230 L795,280 L778,290Z" },
  NM: { name: "New Mexico", d: "M260,370 L340,370 L340,450 L260,450Z" },
  NY: { name: "New York", d: "M730,160 L800,150 L810,210 L780,230 L735,230 L720,195Z" },
  NC: { name: "North Carolina", d: "M660,340 L770,320 L780,345 L700,365 L660,362Z" },
  ND: { name: "North Dakota", d: "M380,100 L470,100 L470,165 L380,165Z" },
  OH: { name: "Ohio", d: "M650,230 L700,220 L715,270 L700,310 L650,325Z" },
  OK: { name: "Oklahoma", d: "M370,365 L480,365 L490,340 L500,380 L490,410 L380,410Z" },
  OR: { name: "Oregon", d: "M115,120 L210,120 L215,195 L120,200Z" },
  PA: { name: "Pennsylvania", d: "M700,215 L775,205 L780,245 L710,260 L700,240Z" },
  RI: { name: "Rhode Island", d: "M820,215 L832,212 L834,228 L822,230Z" },
  SC: { name: "South Carolina", d: "M680,360 L730,345 L740,380 L700,395 L680,380Z" },
  SD: { name: "South Dakota", d: "M380,170 L470,170 L470,245 L380,245Z" },
  TN: { name: "Tennessee", d: "M590,350 L700,335 L710,360 L596,378Z" },
  TX: { name: "Texas", d: "M340,400 L480,400 L490,420 L500,480 L460,520 L400,520 L350,490 L330,450Z" },
  UT: { name: "Utah", d: "M225,230 L280,230 L280,340 L240,345 L225,300Z" },
  VT: { name: "Vermont", d: "M800,130 L815,125 L818,180 L803,185Z" },
  VA: { name: "Virginia", d: "M680,295 L760,270 L775,305 L720,330 L660,335Z" },
  WA: { name: "Washington", d: "M130,60 L215,60 L215,130 L130,115Z" },
  WV: { name: "West Virginia", d: "M700,270 L730,260 L740,300 L720,320 L700,310Z" },
  WI: { name: "Wisconsin", d: "M530,120 L590,125 L595,200 L535,210 L520,190Z" },
  WY: { name: "Wyoming", d: "M260,170 L370,170 L370,250 L260,250Z" },
  DC: { name: "Washington DC", d: "M755,280 L762,277 L762,285 L755,288Z" },
};

type Props = {
  stateData: Record<string, number>;
};

export default function USMapChart({ stateData }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const maxViews = Math.max(...Object.values(stateData), 1);

  const getColor = (code: string) => {
    const count = stateData[code] || 0;
    if (count === 0) return "#27272a"; // zinc-800
    const intensity = Math.min(count / maxViews, 1);
    // Violet gradient: low = dim, high = bright
    if (intensity < 0.25) return "#4c1d95"; // violet-900
    if (intensity < 0.5) return "#6d28d9"; // violet-700
    if (intensity < 0.75) return "#7c3aed"; // violet-600
    return "#8b5cf6"; // violet-500
  };

  // Sort states by count for the legend list
  const sortedStates = Object.entries(stateData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
      <h3 className="mb-4 text-lg font-bold">Visitor Locations (USA)</h3>

      {Object.keys(stateData).length === 0 ? (
        <div className="text-center text-sm text-zinc-500 py-8">
          No location data yet. Geographic data will appear as new visitors arrive.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Map */}
          <div className="relative">
            <svg viewBox="100 50 780 480" className="w-full h-auto">
              {Object.entries(STATE_PATHS).map(([code, { d, name }]) => {
                const count = stateData[code] || 0;
                return (
                  <path
                    key={code}
                    d={d}
                    fill={hovered === code ? "#a78bfa" : getColor(code)}
                    stroke="#18181b"
                    strokeWidth="1.5"
                    className="transition-colors duration-150 cursor-pointer"
                    onMouseEnter={() => setHovered(code)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <title>{`${name} (${code}): ${count} view${count !== 1 ? "s" : ""}`}</title>
                  </path>
                );
              })}
            </svg>
            {/* Color legend */}
            <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-zinc-500">
              <span>Less</span>
              <div className="flex gap-0.5">
                <div className="w-6 h-3 rounded-sm" style={{ background: "#27272a" }} />
                <div className="w-6 h-3 rounded-sm" style={{ background: "#4c1d95" }} />
                <div className="w-6 h-3 rounded-sm" style={{ background: "#6d28d9" }} />
                <div className="w-6 h-3 rounded-sm" style={{ background: "#7c3aed" }} />
                <div className="w-6 h-3 rounded-sm" style={{ background: "#8b5cf6" }} />
              </div>
              <span>More</span>
            </div>
          </div>

          {/* Top states list */}
          <div>
            <div className="mb-2 text-xs text-zinc-500 uppercase tracking-wide">Top States</div>
            <div className="space-y-1.5">
              {sortedStates.map(([code, count], i) => {
                const name = STATE_PATHS[code]?.name || code;
                const pct = (count / maxViews) * 100;
                return (
                  <div key={code} className="flex items-center gap-2">
                    <span className="w-5 text-right text-[10px] text-zinc-600">{i + 1}.</span>
                    <span className="w-8 text-xs font-mono text-zinc-400">{code}</span>
                    <div className="flex-1 h-5 rounded bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded bg-violet-600 transition-all"
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs text-zinc-300">{count}</span>
                  </div>
                );
              })}
              {sortedStates.length === 0 && (
                <div className="text-xs text-zinc-600">No state data yet</div>
              )}
            </div>
            <div className="mt-4 rounded-xl bg-zinc-800 p-3 text-center">
              <div className="text-lg font-bold text-violet-400">{Object.keys(stateData).length}</div>
              <div className="text-[10px] text-zinc-500">States Reached</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
