export function AuktivoLogo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Auktivo"
    >
      {/* Hammer-Icon */}
      <rect x="2" y="18" width="20" height="5" rx="2.5" className="fill-brand-500" transform="rotate(-45 2 18)" />
      <rect x="12" y="8" width="10" height="6" rx="2" className="fill-brand-600" transform="rotate(-45 12 8)" />
      {/* KI-Punkt */}
      <circle cx="22" cy="22" r="3" className="fill-brand-400" />
      {/* Wortmarke */}
      <text
        x="36"
        y="28"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="700"
        fontSize="20"
        className="fill-zinc-900 dark:fill-zinc-50"
        fill="currentColor"
      >
        Auktivo
      </text>
    </svg>
  );
}
