import { ImageResponse } from "next/og";

// iOS home-screen icon for the Command Center PWA. Next.js auto-emits the
// <link rel="apple-touch-icon"> for /command routes from this file (clean URL,
// no query string — avoids iOS finickiness). 180×180 is the iPhone retina size;
// iOS applies its own rounded-rect mask, so we render a full-bleed dark tile
// with the glowing orb mark.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0712",
        }}
      >
        <div
          style={{
            width: 132,
            height: 132,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 38,
            background: "linear-gradient(135deg, #a855f7 0%, #6d28d9 45%, #22d3ee 100%)",
            boxShadow: "inset 0 0 26px rgba(255,255,255,0.35)",
          }}
        >
          <div
            style={{
              width: 82,
              height: 82,
              borderRadius: 82,
              border: "9px solid rgba(255,255,255,0.92)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 30, height: 30, borderRadius: 30, background: "rgba(255,255,255,0.95)" }} />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
