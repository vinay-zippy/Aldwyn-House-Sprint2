type IconProps = { className?: string }

const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  )
}

export function UserIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6" />
    </svg>
  )
}

export function MailIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6 8.5 7 8.5-7" />
    </svg>
  )
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6.6 3.5 9 5.9c.4.4.4 1 .1 1.5L7.6 9.7a12 12 0 0 0 6.7 6.7l2.3-1.5c.5-.3 1.1-.3 1.5.1l2.4 2.4c.5.5.5 1.3-.1 1.7l-2 1.5c-.6.4-1.3.6-2 .5A17.5 17.5 0 0 1 3.6 8a3 3 0 0 1 .5-2l1.5-2c.4-.6 1.2-.6 1.7-.1Z" />
    </svg>
  )
}

export function BadgeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="9" r="5" />
      <path d="m8 13-1.5 7 5.5-3 5.5 3L16 13" />
    </svg>
  )
}

export function CutleryIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M7 3v7a2 2 0 0 0 2 2v9M7 3v7M9 3v7" />
      <path d="M17 3c-1.7 0-3 1.8-3 4s1.3 4 3 4v10" />
    </svg>
  )
}

export function BedIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7" />
      <path d="M3 18v2M21 18v2M3 13h18" />
      <path d="M7 13V9a1 1 0 0 1 1-1h3v5" />
    </svg>
  )
}

export function NoteIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M15 3v5h5M8 12h8M8 16h5" />
    </svg>
  )
}

export function StarIcon({ className }: IconProps) {
  return (
    <svg {...base} fill="currentColor" stroke="none" className={className}>
      <path d="M12 2.5l2.7 6 6.5.6-4.9 4.4 1.5 6.4L12 16.7l-5.8 3.2 1.5-6.4-4.9-4.4 6.5-.6Z" />
    </svg>
  )
}

export function BuildingIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 21V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v16" />
      <path d="M15 21V9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v12" />
      <path d="M4 21h17M8 8h.01M8 12h.01M8 16h.01" />
    </svg>
  )
}

export function SpinnerIcon({ className }: IconProps) {
  return (
    <svg {...base} className={`icon-spin ${className ?? ''}`}>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  )
}

export function AlertIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v4M12 17.5h.01" />
    </svg>
  )
}

export function CompassIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m14.5 9.5-1.6 4.9-4.9 1.6 1.6-4.9z" />
    </svg>
  )
}

export function IdIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="12" r="2" />
      <path d="M13.5 10h4M13.5 14h4" />
    </svg>
  )
}
