import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { login } from '../services/api'
import { isAuthenticated, saveSession } from '../services/auth'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (isAuthenticated()) return <Navigate to="/" replace />

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const session = await login({ username, password })
      saveSession(session)
      navigate(session.role === 'HOUSEKEEPING' ? '/rooms' : '/dashboard', { replace: true })
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to log in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-shell flex min-h-screen items-center justify-center bg-[#101c2c] px-4">
      <form onSubmit={submit} className="login-card w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9b783d]">Aldwyn House Boutique</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Hotel Operations</h1>
          <p className="mt-1 text-xs text-slate-500">Sign in to continue to your workspace.</p>
        </div>
        {error && <p role="alert" className="rounded-lg bg-[#f5e8e5] p-3 text-xs text-[#a34f4f]">{error}</p>}
        <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
          Email or username
          <input required value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-lg border border-[#d9d5cc] px-3 py-2.5 text-sm font-normal outline-hidden focus:border-[#c6a15b]" />
        </label>
        <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
          Password
          <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-[#d9d5cc] px-3 py-2.5 text-sm font-normal outline-hidden focus:border-[#c6a15b]" />
        </label>
        <button disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#101c2c] px-4 py-3 text-xs font-semibold text-white disabled:opacity-50">
          <LogIn className="h-4 w-4" /> {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </main>
  )
}
