import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  BedDouble,
  Sparkles,
  Settings,
  X,
  UserPlus,
} from 'lucide-react'
import { getRole } from '../../services/auth'
import { getUsername } from '../../services/auth'

interface SidebarProps {
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen = false,
  onCloseMobile,
}) => {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Upcoming Arrivals', path: '/arrivals', icon: Users },
    { label: 'Guest 360', path: '/guests', icon: UserCheck },
    { label: 'Walk-in Guest', path: '/walk-in-guest', icon: UserPlus },
    { label: 'Rooms', path: '/rooms', icon: BedDouble },
    { label: 'Amenities', path: '/amenities', icon: Sparkles },
    { label: 'Settings', path: '/settings', icon: Settings },
  ]
  const visibleItems = getRole() === 'HOUSEKEEPING'
    ? navItems.filter((item) => item.path === '/rooms')
    : navItems

  const navContent = (
    <div className="flex flex-col h-full bg-[#f0ece4] text-slate-600 w-64 border-r border-[#dfd7ca] select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#dfd7ca] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#78947c] flex items-center justify-center text-white font-bold text-base shadow-sm">
            AH
          </div>
          <div>
            <h1 className="font-semibold text-[#33403d] text-sm tracking-tight">
              Aldwyn House
            </h1>
            <p className="text-[11px] text-[#7d8982]">Personalized Guest 360</p>
          </div>
        </div>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#dce9dd] text-[#496c52] font-semibold border-l-2 border-[#78947c]'
                    : 'text-[#71807b] hover:bg-[#e7e1ef] hover:text-[#42534e]'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Staff footer */}
      <div className="p-4 border-t border-[#dfd7ca] bg-[#e9e4da]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-[#dce7ef] text-[#52798f] flex items-center justify-center text-xs font-semibold">
            {(getUsername() ?? 'ST').slice(0, 2).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-medium text-[#42534e] truncate">
              {getRole() === 'HOUSEKEEPING' ? 'Housekeeping Staff' : 'Front Desk Staff'}
            </p>
            <p className="text-[10px] text-[#7d8982]">{getUsername() ?? 'Staff workspace'}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block fixed top-0 left-0 bottom-0 z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10">{navContent}</div>
        </div>
      )}
    </>
  )
}
