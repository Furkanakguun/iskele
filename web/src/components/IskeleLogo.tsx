type Props = {
  size?: number
  className?: string
  title?: string
}

/** Iskele mark — pier + container stack */
export function IskeleLogo({ size = 40, className = '', title = 'Iskele' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
    >
      <rect width="40" height="40" rx="10" fill="#1a2214" />
      <rect
        x="0.75"
        y="0.75"
        width="38.5"
        height="38.5"
        rx="9.25"
        stroke="#3d4a2a"
        strokeWidth="1.5"
      />
      {/* water line */}
      <path
        d="M8 28.5c2 .8 4 .8 6 0s4-.8 6 0 4 .8 6 0 4-.8 6 0"
        stroke="#5a6b3f"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.85"
      />
      {/* pier deck */}
      <path d="M7 26h26" stroke="#8a9a6a" strokeWidth="1.6" strokeLinecap="round" />
      {/* piles */}
      <path d="M11 26v6M20 26v6M29 26v6" stroke="#5a6b3f" strokeWidth="1.5" strokeLinecap="round" />
      {/* containers */}
      <rect x="10" y="14" width="9" height="7" rx="1.2" fill="#3d4a2a" />
      <rect x="21" y="17" width="9" height="7" rx="1.2" fill="#5a6b3f" />
      <rect x="14" y="8" width="9" height="6" rx="1.2" fill="#8a9a6a" />
      {/* crane arm hint */}
      <path
        d="M27 8v6M27 8h5"
        stroke="#b8c99a"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="32" cy="10.5" r="1.2" fill="#b8c99a" />
    </svg>
  )
}
