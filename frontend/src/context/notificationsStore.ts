import { createContext, useContext } from 'react'
import type { Room } from '../types/room'
import type { AppNotification, NotificationPreferences } from '../types/notification'

export interface NotificationContextValue {
  notifications: AppNotification[]
  unreadCount: number
  markAllRead: () => void
  markRead: (id: string) => void
  clearAll: () => void
  recordRoomUpdate: (room: Room, previousStatus?: string) => void
  preferences: NotificationPreferences
  setPreferences: (preferences: Partial<NotificationPreferences>) => void
  latestRooms: Room[]
}

export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider')
  return ctx
}
