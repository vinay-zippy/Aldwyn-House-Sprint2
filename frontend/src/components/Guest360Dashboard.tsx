import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getGuest } from '../services/api'
import type { Guest, PreferenceItem } from '../types/guest'
import {
  BadgeIcon,
  BedIcon,
  BuildingIcon,
  CompassIcon,
  CutleryIcon,
  IdIcon,
  MailIcon,
  NoteIcon,
  PhoneIcon,
  SearchIcon,
  SpinnerIcon,
  StarIcon,
  UserIcon,
} from './icons'

type PreferenceGroup = {
  key: keyof Guest['preferences']
  label: string
  description: string
  icon: (props: { className?: string }) => React.JSX.Element
}

const preferenceGroups: PreferenceGroup[] = [
  { key: 'dietary', label: 'Dietary', description: 'Food and beverage requirements', icon: CutleryIcon },
  { key: 'room_preferences', label: 'Room preferences', description: 'Stay and room setup requests', icon: BedIcon },
  { key: 'notes', label: 'Notes', description: 'Context for a thoughtful stay', icon: NoteIcon },
]

function initialGuestId(): string {
  return new URLSearchParams(window.location.search).get('guestId') ?? ''
}

function formatDate(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function PreferenceRow({ item }: { item: PreferenceItem }) {
  const isHighPriority = item.is_high_priority === true

  return (
    <li className={`preference-row${isHighPriority ? ' preference-row--priority' : ''}`}>
      <span className="preference-value">{item.value}</span>
      {isHighPriority && (
        <span className="priority-badge" aria-label="High priority preference">
          <StarIcon className="priority-badge-icon" />
          High priority
        </span>
      )}
    </li>
  )
}

function Guest360Dashboard() {
  const [guestId, setGuestId] = useState(initialGuestId)
  const [selectedGuestId, setSelectedGuestId] = useState(initialGuestId)
  const [guest, setGuest] = useState<Guest | null>(null)
  const [isLoading, setIsLoading] = useState(() => Boolean(initialGuestId()))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedGuestId) {
      return
    }

    let isCurrentRequest = true

    getGuest(selectedGuestId)
      .then((result) => {
        if (isCurrentRequest) setGuest(result)
      })
      .catch(() => {
        if (isCurrentRequest) {
          setGuest(null)
          setError('We could not load this guest profile. Check the guest ID and try again.')
        }
      })
      .finally(() => {
        if (isCurrentRequest) setIsLoading(false)
      })

    return () => {
      isCurrentRequest = false
    }
  }, [selectedGuestId])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextGuestId = guestId.trim()
    setSelectedGuestId(nextGuestId)
    setIsLoading(Boolean(nextGuestId))
    setError(null)
    if (!nextGuestId) setGuest(null)
    if (nextGuestId) window.history.replaceState(null, '', `?guestId=${encodeURIComponent(nextGuestId)}`)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <span className="brand-mark" aria-hidden="true">AH</span>
          <div className="brand-text">
            <span className="brand-name">Aldwyn House</span>
            <span className="brand-divider" aria-hidden="true">/</span>
            <span className="brand-section">Guest 360</span>
          </div>
        </div>
        <div className="topbar-meta">
          <span className="workspace-indicator">
            <BuildingIcon className="workspace-icon" />
            Front Desk Workspace
          </span>
          <div className="staff-profile" aria-label="Signed in staff member">
            <span className="staff-avatar" aria-hidden="true">FD</span>
            <div className="staff-info">
              <span className="staff-name">Front Desk</span>
              <span className="staff-role">Guest Services</span>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-shell">
        <section className="welcome-section">
          <p className="eyebrow">Front desk workspace</p>
          <h1>Guest 360</h1>
          <p className="header-copy">A focused view of the details that make each stay feel personal.</p>
        </section>

        <section className="guest-selector" aria-labelledby="guest-selector-title">
          <div className="guest-selector-heading">
            <p className="section-kicker">Guest profile</p>
            <h2 id="guest-selector-title">Look up a guest</h2>
          </div>
          <form className="guest-search" onSubmit={handleSubmit}>
            <label htmlFor="guest-id">Guest ID</label>
            <div className="search-controls">
              <div className="search-input-wrap">
                <SearchIcon className="search-input-icon" />
                <input
                  id="guest-id"
                  value={guestId}
                  onChange={(event) => setGuestId(event.target.value)}
                  placeholder="Enter guest ID"
                  autoComplete="off"
                />
              </div>
              <button type="submit">View profile</button>
            </div>
          </form>
        </section>

        {isLoading && (
          <p className="state-panel state-panel--loading" role="status">
            <SpinnerIcon className="state-icon" />
            Loading guest profile&hellip;
          </p>
        )}

        {error && (
          <p className="state-panel state-panel--error" role="alert">
            <BadgeIcon className="state-icon" />
            {error}
          </p>
        )}

        {!selectedGuestId && !isLoading && (
          <p className="state-panel state-panel--empty">
            <CompassIcon className="state-icon" />
            Enter a guest ID to view preferences and front-desk notes.
          </p>
        )}

        {guest && !isLoading && (
          <section className="profile-content" aria-labelledby="guest-name">
            <div className="profile-card">
              <div className="profile-summary">
                <div className="guest-avatar" aria-hidden="true">{guest.name.charAt(0).toUpperCase()}</div>
                <div className="profile-heading">
                  <p className="section-kicker">Active guest</p>
                  <h2 id="guest-name">{guest.name}</h2>
                </div>
                <span className="loyalty-tier">
                  <StarIcon className="loyalty-icon" />
                  {guest.loyalty_tier} member
                </span>
              </div>

              <div className="profile-meta">
                <span className="profile-meta-item">
                  <MailIcon className="profile-meta-icon" />
                  {guest.email}
                </span>
                {guest.phone && (
                  <span className="profile-meta-item">
                    <PhoneIcon className="profile-meta-icon" />
                    {guest.phone}
                  </span>
                )}
                <span className="profile-meta-item">
                  <IdIcon className="profile-meta-icon" />
                  Guest ID {guest.id}
                </span>
                <span className="profile-meta-item">
                  <UserIcon className="profile-meta-icon" />
                  Guest since {formatDate(guest.created_at)}
                </span>
              </div>
            </div>

            <div className="preferences-heading">
              <div>
                <p className="section-kicker">Stay intelligence</p>
                <h2>Preferences &amp; notes</h2>
              </div>
              <p className="priority-legend">
                <StarIcon className="legend-icon" />
                High priority
              </p>
            </div>

            <div className="preference-grid">
              {preferenceGroups.map((group) => {
                const items = guest.preferences[group.key]
                const Icon = group.icon
                return (
                  <section className="preference-card" key={group.key} aria-labelledby={`${group.key}-title`}>
                    <div className="preference-card-heading">
                      <span className="preference-card-icon" aria-hidden="true"><Icon /></span>
                      <div>
                        <h3 id={`${group.key}-title`}>{group.label}</h3>
                        <p>{group.description}</p>
                      </div>
                    </div>
                    {items.length > 0 ? (
                      <ul className="preference-list">
                        {items.map((item, index) => <PreferenceRow key={`${item.value}-${index}`} item={item} />)}
                      </ul>
                    ) : <p className="no-preferences">No preferences recorded.</p>}
                  </section>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default Guest360Dashboard