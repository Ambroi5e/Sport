/** Logo Fonte : disque de fonte vu de face, aux couleurs du style choisi. */
export function Logo({ size = 32, title = "Fonte" }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" role="img" aria-label={title}>
      <circle cx="28" cy="28" r="26" className="fill-accent" />
      <g className="fill-on-accent stroke-on-accent">
        <circle cx="28" cy="28" r="17" fill="none" strokeWidth="2.5" />
        <circle cx="28" cy="28" r="6" stroke="none" />
        <rect x="11" y="25" width="7" height="6" rx="3" stroke="none" />
        <rect x="38" y="25" width="7" height="6" rx="3" stroke="none" />
      </g>
    </svg>
  );
}
