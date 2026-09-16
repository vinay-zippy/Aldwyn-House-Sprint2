import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getNotifications, getRooms } from '../services/api'
import type { Room } from '../types/room'
import type { AppNotification, NotificationPreferences } from '../types/notification'
import { NotificationContext, type NotificationContextValue } from './notificationsStore'

const ENABLED_KEY = 'aldwyn_notify_enabled'
const CRITICAL_ONLY_KEY = 'aldwyn_notify_critical_only'
// Shared (per-origin) durable record of the last known status per room. Persisting this
// - instead of keeping it only in a per-tab ref - is what lets a *different* browser
// tab/session (e.g. Housekeeping opened after Front Desk already made a change, or a
// tab that reloaded) recover the real "previous" status instead of re-baselining to
// whatever the backend already shows by the time it starts watching.
const SNAPSHOT_KEY = 'aldwyn_room_status_snapshot'
const POLL_INTERVAL_MS = 45000
const MAX_NOTIFICATIONS = 30

type RoomStatusInfo = Pick<Room, 'room_number' | 'status'>

function readPersistedSnapshot(): Map<string, string> {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY)
    if (!raw) return new Map()
    const parsed = JSON.parse(raw) as Record<string, string>
    return new Map(Object.entries(parsed))
  } catch {
    return new Map()
  }
}

function writePersistedSnapshot(snapshot: Map<string, string>): void {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(Object.fromEntries(snapshot)))
  } catch {
    // Non-critical: if localStorage is unavailable/full, cross-tab sync degrades to polling only.
  }
}

// Statuses that represent housekeeping/maintenance issues requiring attention.
const CRITICAL_STATUSES = new Set(['dirty', 'maintenance', 'out_of_service', 'inspection_pending'])

const STATUS_LABELS: Record<string, string> = {
  dirty: 'dirty (needs cleaning)',
  cleaning: 'being cleaned',
  ready: 'cleaned and ready',
  available: 'available',
  occupied: 'occupied',
  maintenance: 'flagged for maintenance',
  out_of_service: 'out of service',
  inspection_pending: 'pending inspection',
  reserved: 'reserved',
}

function describeStatus(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, ' ')
}

function buildMessage(room: RoomStatusInfo, previousStatus?: string): string {
  if (previousStatus && previousStatus !== room.status) {
    return `Room ${room.room_number} status changed: ${describeStatus(previousStatus)} \u2192 ${describeStatus(room.status)}`
  }
  return `Room ${room.room_number} is now ${describeStatus(room.status)}`
}

function readBoolean(key: string, fallback: boolean): boolean {
  const raw = localStorage.getItem(key)
  if (raw === null) return fallback
  return raw === 'true'
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [preferences, setPreferencesState] = useState<NotificationPreferences>(() => ({
    enabled: readBoolean(ENABLED_KEY, true),
    criticalOnly: readBoolean(CRITICAL_ONLY_KEY, false),
  }))

  // Seed from the persisted (per-origin) snapshot rather than an empty Map so a tab that
  // starts *after* another tab already recorded a status has the real previous value to
  // diff against, instead of re-baselining to whatever the backend currently shows.
  const initialSnapshot = readPersistedSnapshot()
  const statusSnapshot = useRef<Map<string, string>>(initialSnapshot)
  // Only the very first observation ever made on this origin (no persisted data at all)
  // should be treated as a pure baseline with no notifications - anything else is a real
  // comparison against a previously known state.
  const initialized = useRef(initialSnapshot.size > 0)
  // Latest room snapshot from the shared poll, so pages (e.g. RoomsPage) can stay in
  // sync across roles without running a second independent polling loop.
  const [latestRooms, setLatestRooms] = useState<Room[]>([])

  const pushNotification = useCallback((room: RoomStatusInfo, previousStatus?: string) => {
    if (!preferences.enabled) return
    if (preferences.criticalOnly && !CRITICAL_STATUSES.has(room.status)) return

    setNotifications((current) => [
      {
        id: `${room.room_number}-${room.status}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        roomNumber: room.room_number,
        status: room.status,
        previousStatus,
        message: buildMessage(room, previousStatus),
        timestamp: new Date().toISOString(),
        read: false,
      },
      ...current,
    ].slice(0, MAX_NOTIFICATIONS))
  }, [preferences])

  const diffRooms = useCallback((rooms: Room[]) => {
    const snapshot = statusSnapshot.current
    if (!initialized.current) {
      // Genuinely the first observation ever made on this origin: record the baseline
      // only, no notifications (requirement: initial load is never a "change").
      rooms.forEach((room) => snapshot.set(room.room_number, room.status))
      initialized.current = true
      writePersistedSnapshot(snapshot)
      return
    }
    rooms.forEach((room) => {
      // Read the OLD value before writing the new one - never derive "previous" from a
      // snapshot that has already been overwritten with the incoming value.
      snapshot.set(room.room_number, room.status)
    })
    writePersistedSnapshot(snapshot)
  }, [])

  const recordRoomUpdate = useCallback((room: Room) => {
    statusSnapshot.current.set(room.room_number, room.status)
    initialized.current = true
    writePersistedSnapshot(statusSnapshot.current)
    setLatestRooms((current) => current.map((r) => (r.room_number === room.room_number ? room : r)))
  }, [])

  const loadPersistedNotifications = useCallback(async () => {
    try {
      const incoming = await getNotifications()
      if (!preferences.enabled) return
      setNotifications((current) => incoming
        .filter((notification) => !preferences.criticalOnly || CRITICAL_STATUSES.has(notification.status))
        .map((notification) => ({ ...notification, read: current.find((item) => item.id === notification.id)?.read ?? false })))
    } catch {
      // Keep previously received notifications visible during a transient API failure.
    }
  }, [preferences])

  // Cross-tab fast path: the 'storage' event only fires in *other* tabs/windows of the
  // same origin when one of them writes SNAPSHOT_KEY (never in the tab that wrote it),
  // so this lets a different session pick up a change almost immediately instead of
  // waiting for its own next 45s poll tick - without duplicating anything, since each
  // tab still only maintains and reads its own in-memory snapshot/notification list.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== SNAPSHOT_KEY || !event.newValue) return
      let incoming: Record<string, string>
      try {
        incoming = JSON.parse(event.newValue) as Record<string, string>
      } catch {
        return
      }
      const snapshot = statusSnapshot.current
      Object.entries(incoming).forEach(([roomNumber, status]) => {
        const previous = snapshot.get(roomNumber)
        if (previous && previous !== status) {
          setLatestRooms((current) =>
            current.map((r) => (r.room_number === roomNumber ? { ...r, status: status as Room['status'] } : r)),
          )
        }
        snapshot.set(roomNumber, status)
      })
      initialized.current = true
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [pushNotification])

  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const rooms = await getRooms()
        if (!cancelled) {
          diffRooms(rooms)
          setLatestRooms(rooms)
          void loadPersistedNotifications()
        }
      } catch {
        // Non-critical: notifications simply skip this cycle if rooms can't be fetched.
      }
    }
    void poll()
    const interval = setInterval(() => void poll(), POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [diffRooms, loadPersistedNotifications])

  const markAllRead = useCallback(() => {
    setNotifications((current) => current.map((n) => ({ ...n, read: true })))
  }, [])

  const markRead = useCallback((id: string) => {
    setNotifications((current) => current.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const setPreferences = useCallback((updates: Partial<NotificationPreferences>) => {
    setPreferencesState((current) => {
      const next = { ...current, ...updates }
      localStorage.setItem(ENABLED_KEY, String(next.enabled))
      localStorage.setItem(CRITICAL_ONLY_KEY, String(next.criticalOnly))
      return next
    })
  }, [])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  )

  const value = useMemo<NotificationContextValue>(() => ({
    notifications,
    unreadCount,
    markAllRead,
    markRead,
    clearAll,
    recordRoomUpdate,
    preferences,
    setPreferences,
    latestRooms,
  }), [notifications, unreadCount, markAllRead, markRead, clearAll, recordRoomUpdate, preferences, setPreferences, latestRooms])

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}
