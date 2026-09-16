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
    <header className="sticky top-0 z-20 bg-[#fffdf9]/90 backdrop-blur-md border-b border-[#e4ddd3] px-4 md:px-8 py-3 flex items-center justify-between">
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
            Meridian Hospitality Guest Platform
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-3">
        <div className="relative" ref={panelRef}>
          <button
            type="button"
            onClick={toggleNotifications}
            className="p-2 text-[#71807b] hover:text-[#33403d] rounded-lg hover:bg-[#f4efe7] transition-colors relative"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#b97577] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-10 z-40 w-80 rounded-xl border border-[#e4ddd3] bg-[#fffdf9] shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">Room Notifications</p>
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Clear all
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <BedDouble className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No room status changes yet.</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">Updates from Rooms & Housekeeping will appear here.</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => markRead(notification.id)}
                      className={`w-full text-left px-4 py-2.5 flex items-start gap-2.5 transition-colors hover:bg-slate-50 ${
                        notification.read ? '' : 'bg-[#edf2eb]'
                      }`}
                    >
                      <span
                        className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                          notification.read ? 'bg-[#ded8d0]' : 'bg-[#78947c]'
                        }`}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs text-slate-800 leading-snug">
                          {notification.message}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          {formatTime(notification.timestamp)}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="px-4 py-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all as read
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[#e4ddd3] bg-[#fffdf9] px-2 py-1.5 text-xs text-slate-700">
          <span className="font-semibold hidden sm:inline">{getUsername()}</span>
          <button
            type="button"
            aria-label="Sign out"
            onClick={() => { clearSession(); navigate('/login', { replace: true }) }}
            className="flex items-center gap-1 rounded-md px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </header>
  )
}
