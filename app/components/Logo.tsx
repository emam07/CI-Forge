export function Logo({ size = 22 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[13px] tracking-tight text-ink-50">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
      >
        <rect width="32" height="32" rx="8" fill="#0a0a0d" />
        <rect
          width="32"
          height="32"
          rx="8"
          stroke="rgba(255,255,255,0.08)"
        />
        <path
          d="M8 22 L14 10 L20 18 L24 12"
          stroke="#f5a524"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-sans font-medium tracking-tight">CIForge</span>
    </span>
  );
}
