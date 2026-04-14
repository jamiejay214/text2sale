"use client";

export default function Logo({ size = "md", showText = true }: { size?: "sm" | "md" | "lg" | "xl"; showText?: boolean }) {
  const sizes = {
    sm: { icon: 20, text: "text-xl", gap: "gap-1.5", plane: 14 },
    md: { icon: 28, text: "text-3xl", gap: "gap-2", plane: 20 },
    lg: { icon: 36, text: "text-4xl", gap: "gap-2.5", plane: 26 },
    xl: { icon: 48, text: "text-6xl", gap: "gap-3", plane: 34 },
  };

  const s = sizes[size];

  return (
    <div className={`flex items-center ${s.gap}`}>
      {showText && (
        <span className={`${s.text} font-extrabold tracking-tight leading-none`}>
          <span className="text-white">Text</span>
          <span className="relative">
            <span className="text-violet-400">2</span>
            {/* Small bar chart dots above the 2 */}
            <span className="absolute -top-[40%] left-[15%] flex items-end gap-[2px]">
              <span className="block rounded-[1px] bg-violet-400" style={{ width: Math.max(2, s.plane * 0.12), height: s.plane * 0.15 }} />
              <span className="block rounded-[1px] bg-violet-400" style={{ width: Math.max(2, s.plane * 0.12), height: s.plane * 0.25 }} />
              <span className="block rounded-[1px] bg-violet-500" style={{ width: Math.max(2, s.plane * 0.12), height: s.plane * 0.38 }} />
            </span>
          </span>
          <span className="text-violet-400">Sale</span>
        </span>
      )}
      {/* Paper airplane icon */}
      <svg
        width={s.plane}
        height={s.plane}
        viewBox="0 0 24 24"
        fill="none"
        className="-mt-1"
      >
        <path
          d="M2.5 12.5L22 3L15 21.5L12 14L2.5 12.5Z"
          fill="url(#plane-gradient)"
          stroke="none"
        />
        <path
          d="M12 14L22 3"
          stroke="rgba(139,92,246,0.3)"
          strokeWidth="0.5"
        />
        <defs>
          <linearGradient id="plane-gradient" x1="2" y1="3" x2="20" y2="22">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
