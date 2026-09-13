import React from 'react'
import { Server, ShieldCheck } from 'lucide-react'

export const SettingsPage: React.FC = () => {
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          System Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Front desk workspace configuration and API connectivity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
            <Server className="w-4 h-4 text-emerald-600" />
            <h3>Backend API Connection</h3>
          </div>

          <div className="text-xs space-y-2 pt-2 border-t border-slate-100">
            <div>
              <span className="text-slate-400 font-medium block">API Base URL</span>
              <span className="font-mono text-slate-800 bg-slate-100 px-2 py-1 rounded-md block mt-1">
                {apiBaseUrl}
              </span>
            </div>

            <div className="pt-2">
              <span className="text-slate-400 font-medium block">Environment</span>
              <span className="font-semibold text-emerald-700">Production / Local Development</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3>Privacy & AI Governance</h3>
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
      </div>
    </div>
  )
}
