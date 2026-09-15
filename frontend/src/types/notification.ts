export interface AppNotification {
  id: string
  roomNumber: string
  status: string
  previousStatus?: string
  message: string
  timestamp: string
  read: boolean
}

export interface NotificationPreferences {
  enabled: boolean
  criticalOnly: boolean
}
