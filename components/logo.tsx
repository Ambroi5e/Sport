/** Logo Fonte : disque de fonte vu de face. */
export function Logo({ size = 32, title = "Fonte" }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" role="img" aria-label={title}>
      <circle cx="28" cy="28" r="26" fill="#FF6B1A" />
      <circle cx="28" cy="28" r="17" fill="none" stroke="#121315" strokeWidth="2.5" />
      <circle cx="28" cy="28" r="6" fill="#121315" />
      <rect x="11" y="25" width="7" height="6" rx="3" fill="#121315" />
      <rect x="38" y="25" width="7" height="6" rx="3" fill="#121315" />
    </svg>
  );
}
