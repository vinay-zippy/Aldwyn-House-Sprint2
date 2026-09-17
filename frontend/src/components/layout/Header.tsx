import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Bell, LogOut, CheckCheck, Trash2, BedDouble } from 'lucide-react'
import { clearSession, getUsername } from '../../services/auth'
import { useNotifications } from '../../context/notificationsStore'

interface HeaderProps {
  onOpenMobileMenu?: () => void
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, markAllRead, markRead, clearAll } = useNotifications()

  useEffect(() => {
    if (!notificationsOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [notificationsOpen])

  const toggleNotifications = () => {
    setNotificationsOpen((open) => !open)
  }

  return (
    <header className="sticky top-0 z-20 bg-[#ffffff]/90 backdrop-blur-md border-b border-[#d9d5cc] px-4 md:px-8 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-sm md:text-base font-semibold text-slate-900 tracking-tight">
            Operations Overview
          </h2>
          <p className="text-[11px] text-slate-500 hidden sm:block">
            Aldwyn House Boutique Operations
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-3">
        <div className="relative" ref={panelRef}>
          <button
            type="button"
            onClick={toggleNotifications}
            className="p-2 text-[#4b5563] hover:text-[#17202a] rounded-lg hover:bg-[#dce6f0] transition-colors relative"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#a34f4f] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="notification-panel absolute right-0 top-10 z-40 w-80 overflow-hidden rounded-xl border border-[#d9d5cc] bg-[#ffffff] shadow-lg">
              <div className="notification-panel-header flex items-center justify-between px-4 py-3">
                <p className="notification-title text-xs font-semibold">Room Notifications</p>
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="notification-secondary-action flex items-center gap-1 text-[10px] font-semibold transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Clear all
                  </button>
                )}
              </div>

              <div className="notification-list max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="notification-empty px-4 py-8 text-center">
                    <BedDouble className="mx-auto mb-2 h-6 w-6" />
                    <p className="text-xs">No room status changes yet.</p>
                    <p className="mt-0.5 text-[10px]">Updates from Rooms & Housekeeping will appear here.</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => markRead(notification.id)}
                      className={`notification-item w-full text-left px-4 py-2.5 flex items-start gap-2.5 transition-colors ${
                        notification.read ? 'notification-item--read' : 'notification-item--unread'
                      }`}
                    >
                      <span
                        className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                          notification.read ? 'bg-[#d9d5cc]' : 'bg-[#c6a15b]'
                        }`}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="notification-message block text-xs leading-snug">
                          {notification.message}
                        </span>
                        <span className="notification-timestamp block text-[10px] mt-0.5">
                          {formatTime(notification.timestamp)}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="notification-panel-footer px-4 py-2">
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="notification-primary-action flex items-center gap-1.5 text-[10px] font-semibold transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all as read
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[#d9d5cc] bg-[#ffffff] px-2 py-1.5 text-xs text-slate-700">
          <span className="font-semibold hidden sm:inline">{getUsername()}</span>
          <button
            type="button"
            aria-label="Sign out"
            onClick={() => { clearSession(); navigate('/login', { replace: true }) }}
            className="flex items-center gap-1 rounded-md bg-[#101c2c] px-2 py-1 font-semibold text-white hover:bg-[#172a46] transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </header>
  )
}
