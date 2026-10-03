type LogoSize = "sm" | "md" | "lg" | "xl";

type LogoProps = {
  size?: LogoSize;
  showText?: boolean;
  className?: string;
};

const sizes: Record<LogoSize, { mark: number; text: string; gap: string }> = {
  sm: { mark: 28, text: "text-xl", gap: "gap-2" },
  md: { mark: 34, text: "text-3xl", gap: "gap-2.5" },
  lg: { mark: 42, text: "text-4xl", gap: "gap-3" },
  xl: { mark: 54, text: "text-6xl", gap: "gap-3.5" },
};

/** A compact conversation + momentum mark that remains clear at small sizes. */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="32" height="32" rx="10" fill="#D9F779" />
      <path
        d="M8 9.75C8 7.68 9.68 6 11.75 6h8.5C22.32 6 24 7.68 24 9.75v6.5A3.75 3.75 0 0 1 20.25 20H15l-4.9 4.08c-.65.54-1.63.08-1.61-.77L8.6 20.6A3.75 3.75 0 0 1 8 18.55v-8.8Z"
        fill="#153F32"
      />
      <path
        d="m11.5 16 3.2-3.15 2.35 2.1 3.55-4.1"
        stroke="#F7FFE7"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.45 10.85h2.15V13"
        stroke="#F7FFE7"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Logo({
  size = "md",
  showText = true,
  className = "",
}: LogoProps) {
  const selected = sizes[size];

  return (
    <span
      className={`t2s-logo inline-flex items-center ${selected.gap} ${className}`.trim()}
      aria-label={showText ? "Text2Sale" : "Text2Sale logo"}
    >
      <BrandMark size={selected.mark} />
      {showText && (
        <span
          className={`${selected.text} font-extrabold leading-none tracking-[-0.055em]`}
          aria-hidden="true"
        >
          <span className="text-current">text2</span>
          <span className="text-emerald-400">sale</span>
          <span className="text-lime-300">.</span>
        </span>
      )}
    </span>
  );
}
