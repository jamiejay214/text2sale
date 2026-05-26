import { ImageResponse } from "next/og";

// Generates the PWA / app icons on the fly so we don't ship binary PNGs.
// Used by app/manifest.ts at /command-icon?size=192|512[&maskable=1].
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const size = Math.min(Number(searchParams.get("size")) || 512, 1024);
  const maskable = searchParams.get("maskable") === "1";
  const inset = maskable ? Math.round(size * 0.14) : 0; // safe-zone padding
  const inner = size - inset * 2;

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
            width: inner,
            height: inner,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: maskable ? inner : Math.round(inner * 0.22),
            background: "linear-gradient(135deg, #a855f7 0%, #6d28d9 45%, #22d3ee 100%)",
            boxShadow: `inset 0 0 ${inner * 0.2}px rgba(255,255,255,0.35)`,
          }}
        >
          {/* concentric orb mark */}
          <div
            style={{
              width: inner * 0.62,
              height: inner * 0.62,
              borderRadius: inner,
              border: `${Math.max(inner * 0.05, 6)}px solid rgba(255,255,255,0.9)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: inner * 0.22,
                height: inner * 0.22,
                borderRadius: inner,
                background: "#fff",
              }}
            />
          </div>
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
