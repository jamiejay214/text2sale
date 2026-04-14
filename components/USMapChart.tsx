"use client";

import React, { useState, useMemo } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

// TopoJSON from us-atlas — served from CDN
const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

// State FIPS code → 2-letter abbreviation (matches Vercel geo header region codes)
const FIPS_TO_ABBR: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO",
  "09": "CT", "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI",
  "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY",
  "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
  "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH",
  "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
  "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
  "54": "WV", "55": "WI", "56": "WY",
};

const ABBR_TO_NAME: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "Washington DC",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
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
    if (intensity < 0.25) return "#4c1d95"; // violet-900
    if (intensity < 0.5) return "#6d28d9"; // violet-700
    if (intensity < 0.75) return "#7c3aed"; // violet-600
    return "#8b5cf6"; // violet-500
  };

  const sortedStates = useMemo(
    () =>
      Object.entries(stateData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
    [stateData]
  );

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
            <ComposableMap
              projection="geoAlbersUsa"
              projectionConfig={{ scale: 1000 }}
              width={800}
              height={500}
              style={{ width: "100%", height: "auto" }}
            >
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const fips = geo.id as string;
                    const code = FIPS_TO_ABBR[fips];
                    const count = code ? stateData[code] || 0 : 0;
                    const name = code ? ABBR_TO_NAME[code] : geo.properties?.name || "";
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={hovered === code ? "#a78bfa" : getColor(code || "")}
                        stroke="#18181b"
                        strokeWidth={0.75}
                        style={{
                          default: { outline: "none" },
                          hover: { outline: "none", cursor: "pointer" },
                          pressed: { outline: "none" },
                        }}
                        onMouseEnter={() => code && setHovered(code)}
                        onMouseLeave={() => setHovered(null)}
                      >
                        <title>{`${name}${code ? ` (${code})` : ""}: ${count} view${count !== 1 ? "s" : ""}`}</title>
                      </Geography>
                    );
                  })
                }
              </Geographies>
            </ComposableMap>

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
                const name = ABBR_TO_NAME[code] || code;
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
