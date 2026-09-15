import React from 'react'
import { Server, ShieldCheck, UserCircle2, Bell, Sparkles, BedDouble } from 'lucide-react'
import { getRole, getUsername } from '../services/auth'
import { useNotifications } from '../context/notificationsStore'

const ROLE_LABELS: Record<string, string> = {
  FRONT_DESK: 'Front Desk Staff',
  HOUSEKEEPING: 'Housekeeping Staff',
}

export const SettingsPage: React.FC = () => {
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
  const role = getRole()
  const { preferences, setPreferences } = useNotifications()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Hotel Operations Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Workspace, notification, and privacy preferences for Aldwyn House staff.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Workspace */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
            <UserCircle2 className="w-4 h-4 text-emerald-600" />
            <h3>Workspace</h3>
          </div>

          <div className="text-xs space-y-3 pt-2 border-t border-slate-100">
            <div>
              <span className="text-slate-400 font-medium block">Signed in as</span>
              <span className="font-semibold text-slate-800">{getUsername() ?? 'Staff member'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Role</span>
              <span className="font-semibold text-slate-800">
                {role ? ROLE_LABELS[role] ?? role : 'Unknown'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Property</span>
              <span className="font-semibold text-slate-800">Aldwyn House</span>
            </div>
          </div>
        </div>

        {/* Operations */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
            <Bell className="w-4 h-4 text-emerald-600" />
            <h3>Notification Preferences</h3>
          </div>

          <div className="text-xs space-y-3 pt-2 border-t border-slate-100">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-600">
                Notify on room status changes
                <span className="block text-[10px] text-slate-400">Show a bell alert whenever a room's status is updated.</span>
              </span>
              <input
                type="checkbox"
                checked={preferences.enabled}
                onChange={(event) => setPreferences({ enabled: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0 ml-3"
              />
            </label>

            <label className={`flex items-center justify-between ${preferences.enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
              <span className="text-slate-600">
                Only notify on housekeeping/maintenance issues
                <span className="block text-[10px] text-slate-400">Hide routine changes like available/occupied and only alert for dirty, maintenance, out-of-service, and inspection-pending rooms.</span>
              </span>
              <input
                type="checkbox"
                disabled={!preferences.enabled}
                checked={preferences.criticalOnly}
                onChange={(event) => setPreferences({ criticalOnly: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0 ml-3"
              />
            </label>
          </div>
        </div>

        {/* AI Concierge */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h3>AI Concierge</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              Enabled
            </span>
          </div>

          <div className="text-xs space-y-2 pt-2 border-t border-slate-100 text-slate-600 leading-relaxed">
            <p>
              The AI Concierge answers guest and staff questions using hotel policy documents and live operational data (rooms, amenities, and reservations) retrieved at query time.
            </p>
            <p className="text-slate-500">
              Available from the assistant chat and the floating chat widget. No configuration is required or exposed here.
            </p>
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3>Privacy & Security</h3>
          </div>

          <div className="text-xs space-y-2 pt-2 border-t border-slate-100 text-slate-600 leading-relaxed">
            <p>
              Guest preference matching uses deterministic, rule-based sanitization before AI recommendation generation.
            </p>
            <p className="text-emerald-800 font-medium bg-emerald-50 p-2 rounded-md border border-emerald-100">
              ✓ PII Protection Active (Names, emails, phone numbers & payment details excluded from matching prompts).
            </p>
          </div>
        </div>

        {/* System / API */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4 md:col-span-2">
          <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
            <Server className="w-4 h-4 text-emerald-600" />
            <h3>System Information</h3>
          </div>

          <div className="text-xs grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <span className="text-slate-400 font-medium block">API Base URL</span>
              <span className="font-mono text-slate-800 bg-slate-100 px-2 py-1 rounded-md inline-block mt-1">
                {apiBaseUrl}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Environment</span>
              <span className="font-semibold text-emerald-700">Production / Local Development</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-1">
            <BedDouble className="w-3 h-3" /> Displayed for reference only — these values reflect the current deployment and are not editable here.
          </p>
        </div>
      </div>
    </div>
  )
}
