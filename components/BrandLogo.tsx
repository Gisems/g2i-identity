"use client"

// Trazos del logo de landing-g2i: el navbar usa la versión sobre fondo claro y el footer la inversa.
const STROKES = {
  default: { outer: "#004952", inner: "#00707c", mark: "#ed7755" },
  inverse: { outer: "#ffffff", inner: "#d7e8e9", mark: "#ff8f70" },
} as const

/**
 * Isotipo en tres trazos más el wordmark "G2I digital". Dentro de un `Sidebar` colapsado
 * el wordmark se oculta y queda solo el isotipo.
 */
export default function BrandLogo({ variant = "default" }: Readonly<{ variant?: keyof typeof STROKES }>) {
  const strokes = STROKES[variant]
  const inverse = variant === "inverse"

  return (
    <div className="flex items-center gap-2.5">
      <svg
        width="38"
        height="38"
        viewBox="13 13 74 74"
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        aria-hidden="true"
        className="shrink-0"
      >
        <path d="M70.28 27.02 A30 30 0 1 0 70.28 72.98" stroke={strokes.outer} />
        <path d="M61.29 37.74 A16 16 0 1 0 61.29 62.26" stroke={strokes.inner} />
        <path d="M79 40 V60" stroke={strokes.mark} />
      </svg>
      <span className="flex flex-col group-data-[collapsible=icon]:hidden">
        <span
          className={`font-display text-[28px] leading-[0.95] font-bold tracking-[-0.04em] ${inverse ? "text-white" : "text-primary"}`}
        >
          G2<span className={inverse ? "text-[#ff8f70]" : "text-accent"}>I</span>
        </span>
        <span
          className={`font-mono text-[9px] tracking-[0.42em] uppercase ${inverse ? "text-[#d7e8e9]" : "text-primary-light"}`}
        >
          digital
        </span>
      </span>
    </div>
  )
}
