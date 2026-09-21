import { ImageResponse } from "next/og";

// ── Shared social card renderer ────────────────────────────────────────────
// Blog routes declare `twitter: { card: "summary_large_image" }` but supplied
// no image, so every shared link rendered an empty card. Next picks these up
// through the colocated opengraph-image convention and fills in both the
// og:image and twitter:image tags.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export function renderOgCard({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#09090b",
          padding: "72px",
          // Satori has no gradient shorthand support worth relying on, so the
          // accent is a solid bar rather than a background image.
          borderTop: "16px solid #34d399",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#6ee7b7",
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 32,
              fontSize: title.length > 70 ? 60 : 72,
              fontWeight: 800,
              lineHeight: 1.1,
              color: "#ffffff",
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 28,
            color: "#a1a1aa",
          }}
        >
          <div style={{ display: "flex", fontWeight: 700, color: "#ffffff" }}>Text2Sale</div>
          {meta ? <div style={{ display: "flex" }}>{meta}</div> : null}
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
