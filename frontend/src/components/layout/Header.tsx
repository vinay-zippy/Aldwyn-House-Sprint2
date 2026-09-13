import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Search, Bell, Sparkles } from 'lucide-react'

interface HeaderProps {
  onOpenMobileMenu?: () => void
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/guests/${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3 flex items-center justify-between">
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
            Aldwyn House Operations
          </h2>
          <p className="text-[11px] text-slate-500 hidden sm:block">
            Meridian Hospitality Guest Platform
          </p>
        </div>
      </div>

      {/* Search & Actions */}
      <div className="flex items-center space-x-3">
        <form
          onSubmit={handleSearchSubmit}
          className="relative hidden sm:block w-48 md:w-64"
        >
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guest ID..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-lg border border-transparent focus:border-emerald-500 focus:outline-hidden transition-all"
          />
        </form>

        <button
          type="button"
          onClick={() => navigate('/ai-assistance')}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100/80 transition-colors shadow-2xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden md:inline">Guest Intelligence</span>
        </button>

        <div className="relative">
          <button
            type="button"
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          </button>
        </div>
      </div>
    </header>
  )
}
