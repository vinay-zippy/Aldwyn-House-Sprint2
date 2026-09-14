import React, { useEffect, useState } from 'react'
import { CheckCircle2, UserPlus } from 'lucide-react'
import { createWalkIn, findGuestMatch, getAvailableRooms } from '../services/api'
import type { Guest } from '../types/guest'
import type { Room } from '../types/room'

type Match = { guest: Guest; previous_stays: { check_in: string; check_out: string; room_number?: string | null; status: string }[] }
const today = new Date().toISOString().slice(0, 10)

export const WalkInGuestPage: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', id_type: 'passport', id_number: '', check_in: today, check_in_time: '14:00', check_out: '', check_out_time: '11:00', number_of_guests: '1', room_number: '', dietary: '', room_preferences: '', notes: '' })
  const [rooms, setRooms] = useState<Room[]>([])
  const [match, setMatch] = useState<Match | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const setField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }))

  useEffect(() => {
    if (!form.check_in || !form.check_out || form.check_out <= form.check_in) return
    getAvailableRooms(form.check_in, form.check_out).then(setRooms).catch(() => setRooms([]))
  }, [form.check_in, form.check_out])

  const checkReturningGuest = async () => {
    if (!form.name || !form.email || !form.phone) return
    try { setMatch(await findGuestMatch(form.name, form.email, form.phone)) } catch { setMatch(null) }
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true); setError(null); setResult(null)
    try {
      const response = await createWalkIn({
        ...(match ? { guest_id: match.guest.id } : {}), name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), id_type: form.id_type, id_number: form.id_number.trim(), check_in: form.check_in, check_in_time: form.check_in_time, check_out: form.check_out, check_out_time: form.check_out_time, number_of_guests: Number(form.number_of_guests), room_number: form.room_number, loyalty_tier: match?.guest.loyalty_tier ?? 'standard',
        dietary: form.dietary ? [{ value: form.dietary, priority: 'normal' }] : [], room_preferences: form.room_preferences ? [{ value: form.room_preferences, priority: 'normal' }] : [], notes: form.notes ? [{ value: form.notes, priority: 'normal' }] : [],
      })
      setResult(`${response.guest.guest_code} registered and reservation ${response.reservation.id.slice(0, 8)} created.`)
      setForm((current) => ({ ...current, name: '', email: '', phone: '', id_number: '', room_number: '', dietary: '', room_preferences: '', notes: '' })); setMatch(null)
    } catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : 'Unable to register walk-in guest.') } finally { setLoading(false) }
  }

  return <div className="max-w-5xl space-y-6">
    <div><div className="flex items-center gap-2 text-emerald-700"><UserPlus className="h-5 w-5" /><h1 className="text-2xl font-semibold text-slate-900">Walk-in Guest Registration</h1></div><p className="mt-1 text-xs text-slate-500">Register a guest and assign a room from live availability.</p></div>
    {result && <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800"><CheckCircle2 className="h-5 w-5" />{result}</div>}
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">{error}</div>}
    {match && <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><strong>Returning Guest Found: {match.guest.guest_code} · {match.guest.name}</strong><p className="mt-1 text-xs">{match.guest.email} · {match.guest.phone}</p><p className="mt-3 text-xs font-semibold">Previous stays ({match.previous_stays.length})</p><ul className="mt-1 text-xs">{match.previous_stays.map((stay) => <li key={`${stay.check_in}-${stay.check_out}`}>{stay.check_in} to {stay.check_out} · Room {stay.room_number ?? 'unassigned'} · {stay.status}</li>)}</ul><button type="button" onClick={() => { setField('name', match.guest.name); setField('email', match.guest.email); setField('phone', match.guest.phone ?? '') }} className="mt-3 rounded-lg bg-amber-900 px-3 py-2 text-xs font-semibold text-white">Use Existing Guest</button></div>}
    <form onSubmit={submit} className="space-y-6 rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs">
      <fieldset className="space-y-4"><legend className="text-sm font-semibold text-slate-900">Guest Information</legend><div className="grid grid-cols-1 gap-4 md:grid-cols-2">{([['name','Full name','text'],['email','Email','email'],['phone','Phone number','tel'],['id_number','ID number','text']] as const).map(([field, label, type]) => <label key={field} className="space-y-1 text-xs font-semibold text-slate-700">{label}<input required type={type} value={form[field]} onBlur={field === 'phone' ? checkReturningGuest : undefined} onChange={(event) => setField(field, event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-hidden focus:border-emerald-500" /></label>)}<label className="space-y-1 text-xs font-semibold text-slate-700">ID type<select value={form.id_type} onChange={(event) => setField('id_type', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal"><option>passport</option><option>national_id</option><option>driver_license</option></select></label></div></fieldset>
      <fieldset className="space-y-4"><legend className="text-sm font-semibold text-slate-900">Stay Details</legend><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><label className="space-y-1 text-xs font-semibold text-slate-700">Check-in date<input required type="date" value={form.check_in} onChange={(event) => setField('check_in', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label><label className="space-y-1 text-xs font-semibold text-slate-700">Check-in time<input required type="time" value={form.check_in_time} onChange={(event) => setField('check_in_time', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label><label className="space-y-1 text-xs font-semibold text-slate-700">Check-out date<input required type="date" value={form.check_out} onChange={(event) => setField('check_out', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label><label className="space-y-1 text-xs font-semibold text-slate-700">Check-out time<input required type="time" value={form.check_out_time} onChange={(event) => setField('check_out_time', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label><label className="space-y-1 text-xs font-semibold text-slate-700">Number of guests<input required min="1" type="number" value={form.number_of_guests} onChange={(event) => setField('number_of_guests', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label><label className="space-y-1 text-xs font-semibold text-slate-700">Available room<select required value={form.room_number} onChange={(event) => setField('room_number', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal"><option value="">{rooms.length ? 'Select a ready room' : 'No ready rooms available'}</option>{rooms.map((room) => <option key={room.id} value={room.room_number}>{room.room_number} · {room.room_type} · {room.status}</option>)}</select></label></div></fieldset>
      <fieldset className="space-y-4"><legend className="text-sm font-semibold text-slate-900">Guest Preferences <span className="font-normal text-slate-500">(optional)</span></legend><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><label className="space-y-1 text-xs font-semibold text-slate-700">Dietary preference<input value={form.dietary} onChange={(event) => setField('dietary', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label><label className="space-y-1 text-xs font-semibold text-slate-700">Room preference<input value={form.room_preferences} onChange={(event) => setField('room_preferences', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label></div><label className="space-y-1 text-xs font-semibold text-slate-700">Special requests<textarea value={form.notes} onChange={(event) => setField('notes', event.target.value)} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label></fieldset>
      <div className="flex justify-end border-t border-slate-100 pt-5"><button disabled={loading || !rooms.length} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50"><UserPlus className="h-4 w-4" />{loading ? 'Registering...' : 'Register Walk-in Guest'}</button></div>
    </form>
  </div>
}
