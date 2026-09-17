import React, { useEffect, useState } from 'react'
import { CheckCircle2, UserPlus, X } from 'lucide-react'
import { createWalkIn, findGuestMatch, getAvailableRooms, getGuests } from '../services/api'
import { useNotifications } from '../context/notificationsStore'
import type { Guest } from '../types/guest'
import type { Room } from '../types/room'

type Match = { guest: Guest; previous_stays: { check_in: string; check_out: string; room_number?: string | null; status: string }[] }
type Result = { guestName: string; guestCode: string; reservationId: string }
type Field = 'name' | 'email' | 'phone' | 'id_number' | 'check_in' | 'check_in_time' | 'check_out' | 'check_out_time' | 'room_number'
const localDate = () => new Date().toLocaleDateString('en-CA')
const SUCCESS_TOAST_MS = 7000
const inputClass = 'w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-hidden focus:border-emerald-500'
const countryCodes = [
  ['+91', 'India'], ['+1', 'United States / Canada'], ['+44', 'United Kingdom'], ['+61', 'Australia'], ['+81', 'Japan'], ['+86', 'China'],
  ['+49', 'Germany'], ['+33', 'France'], ['+39', 'Italy'], ['+34', 'Spain'], ['+7', 'Russia / Kazakhstan'], ['+55', 'Brazil'],
  ['+52', 'Mexico'], ['+27', 'South Africa'], ['+65', 'Singapore'], ['+64', 'New Zealand'], ['+82', 'South Korea'], ['+971', 'United Arab Emirates'],
  ['+31', 'Netherlands'], ['+32', 'Belgium'], ['+41', 'Switzerland'], ['+43', 'Austria'], ['+45', 'Denmark'], ['+46', 'Sweden'],
  ['+47', 'Norway'], ['+48', 'Poland'], ['+351', 'Portugal'], ['+353', 'Ireland'], ['+90', 'Turkey'], ['+972', 'Israel'],
  ['+20', 'Egypt'], ['+234', 'Nigeria'], ['+254', 'Kenya'], ['+66', 'Thailand'], ['+60', 'Malaysia'], ['+62', 'Indonesia'],
] as const
const validStartingDigits: Record<string, RegExp> = {
  '+91': /^[6-9]/, '+1': /^[2-9]/, '+44': /^[1-9]/, '+61': /^[2-478]/, '+65': /^[6-9]/, '+971': /^[2-9]/,
}

export const WalkInGuestPage: React.FC = () => {
  const { refreshRooms } = useNotifications()
  const [form, setForm] = useState({ name: '', email: '', phone: '', id_type: 'passport', id_number: '', check_in: localDate(), check_in_time: '14:00', check_out: '', check_out_time: '11:00', number_of_guests: '1', room_number: '', dietary: '', room_preferences: '', notes: '' })
  const [countryCode, setCountryCode] = useState('+91')
  const [rooms, setRooms] = useState<Room[]>([])
  const [match, setMatch] = useState<Match | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [availability, setAvailability] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const [loading, setLoading] = useState(false)
  const setField = (field: keyof typeof form, value: string) => { setForm((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: undefined })) }

  useEffect(() => {
    if (!result) return
    const timer = setTimeout(() => setResult(null), SUCCESS_TOAST_MS)
    return () => clearTimeout(timer)
  }, [result])

  useEffect(() => {
    if (!form.check_in || !form.check_out || form.check_out < form.check_in) { setRooms([]); setAvailability('idle'); return }
    let cancelled = false
    setAvailability('loading')
    getAvailableRooms(form.check_in, form.check_out)
      .then((data) => { if (!cancelled) { setRooms(data); setAvailability('loaded') } })
      .catch((requestError: unknown) => { if (!cancelled) { setRooms([]); setAvailability('error'); setError(requestError instanceof Error ? requestError.message : 'Unable to load room availability.') } })
    return () => { cancelled = true }
  }, [form.check_in, form.check_out])

  const checkReturningGuest = async () => {
    if (!form.name || !form.email || !form.phone) return
    try { setMatch(await findGuestMatch(form.name, form.email, `${countryCode}${form.phone.replace(/\D/g, '')}`)) } catch { setMatch(null) }
  }

  const validate = () => {
    const next: Partial<Record<Field, string>> = {}
    if (!form.name.trim()) next.name = 'Guest name is required.'
    if (!form.email.trim()) next.email = 'Email is required.'
    else if (!/^[^\s@]+@gmail\.com$/i.test(form.email.trim())) next.email = 'Enter a valid Gmail address ending in @gmail.com.'
    if (!form.phone.trim()) next.phone = 'Phone number is required.'
    else if (!/^\d{10}$/.test(form.phone.replace(/\D/g, '')) || (validStartingDigits[countryCode] && !validStartingDigits[countryCode].test(form.phone.replace(/\D/g, '')))) next.phone = 'Enter a valid number.'
    if (!form.id_number.trim()) next.id_number = 'Guest identification is required.'
    if (!form.check_in) next.check_in = 'Check-in date is required.'
    if (!form.check_in_time) next.check_in_time = 'Check-in time is required.'
    if (!form.check_out) next.check_out = 'Check-out date is required.'
    if (!form.check_out_time) next.check_out_time = 'Check-out time is required.'
    const now = new Date(); now.setSeconds(0, 0)
    const checkIn = new Date(`${form.check_in}T${form.check_in_time}`)
    const checkOut = new Date(`${form.check_out}T${form.check_out_time}`)
    if (form.check_in && form.check_in_time && checkIn < now) next.check_in = 'Check-in date and time cannot be in the past.'
    if (form.check_in && form.check_out && form.check_in_time && form.check_out_time && checkOut <= checkIn) next.check_out = 'Check-out must be after check-in.'
    if (!form.room_number) next.room_number = 'Select an available room.'
    return next
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validate(); setErrors(nextErrors)
    if (Object.keys(nextErrors).length) { setError('Correct the highlighted required fields before registering the guest.'); requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()); return }
    setLoading(true); setError(null); setResult(null)
    try {
      let guestId = match?.guest.id
      if (!guestId) {
        try {
          const existingGuest = (await getGuests()).find((guest) => guest.email.toLowerCase() === form.email.trim().toLowerCase())
          guestId = existingGuest?.id
        } catch {
          // Continue with normal registration if the duplicate-check lookup is unavailable.
        }
      }
      const response = await createWalkIn({ ...(guestId ? { guest_id: guestId } : {}), name: form.name.trim(), email: form.email.trim(), phone: `${countryCode}${form.phone.replace(/\D/g, '')}`, id_type: form.id_type, id_number: form.id_number.trim(), check_in: form.check_in, check_in_time: form.check_in_time, check_out: form.check_out, check_out_time: form.check_out_time, number_of_guests: Number(form.number_of_guests), room_number: form.room_number, loyalty_tier: match?.guest.loyalty_tier ?? 'standard', dietary: form.dietary ? [{ value: form.dietary, priority: 'normal' }] : [], room_preferences: form.room_preferences ? [{ value: form.room_preferences, priority: 'normal' }] : [], notes: form.notes ? [{ value: form.notes, priority: 'normal' }] : [] })
      await refreshRooms()
      setResult({ guestName: response.guest.name, guestCode: response.guest.guest_code, reservationId: response.reservation.id.slice(0, 8) })
      setForm((current) => ({ ...current, name: '', email: '', phone: '', id_number: '', room_number: '', dietary: '', room_preferences: '', notes: '' })); setMatch(null)
    } catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : 'Unable to register walk-in guest.') } finally { setLoading(false) }
  }

  const fieldError = (field: Field) => errors[field] && <p className="text-xs font-normal text-rose-700">{errors[field]}</p>
  const invalid = (field: Field) => Boolean(errors[field])
  return <div className="max-w-5xl space-y-6">
    {result && <div role="status" aria-live="polite" className="fixed top-4 right-4 z-50 w-full max-w-sm rounded-xl border border-emerald-200 bg-white shadow-xl overflow-hidden"><div className="flex items-start gap-3 p-4"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-4 w-4" /></span><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-emerald-900">Guest registered successfully</p><p className="mt-0.5 text-xs text-slate-600">{result.guestName} ({result.guestCode}) · Reservation {result.reservationId}</p></div><button type="button" onClick={() => setResult(null)} aria-label="Dismiss success message" className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><div className="h-1 bg-emerald-100"><div className="h-full bg-emerald-500" style={{ animation: `toast-countdown ${SUCCESS_TOAST_MS}ms linear forwards` }} /></div></div>}
    <div><div className="flex items-center gap-2 text-emerald-700"><UserPlus className="h-5 w-5" /><h1 className="text-2xl font-semibold text-slate-900">Walk-in Guest Registration</h1></div><p className="mt-1 text-xs text-slate-500">Register a guest and assign a room from live availability. <span className="text-rose-700">*</span> Required field</p></div>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">{error}</div>}
    {match && <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><strong>Returning Guest Found: {match.guest.guest_code} · {match.guest.name}</strong><p className="mt-1 text-xs">{match.guest.email} · {match.guest.phone}</p><button type="button" onClick={() => { setField('name', match.guest.name); setField('email', match.guest.email); setField('phone', (match.guest.phone ?? '').replace(/\D/g, '').slice(-10)) }} className="mt-3 rounded-lg bg-amber-900 px-3 py-2 text-xs font-semibold text-white">Use Existing Guest</button></div>}
    <form noValidate onSubmit={submit} className="space-y-6 rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs">
      <fieldset className="space-y-4"><legend className="text-sm font-semibold text-slate-900">Guest Information</legend><div className="grid grid-cols-1 gap-4 md:grid-cols-2">{([['name', 'Full name', 'text'], ['email', 'Email', 'email'], ['phone', 'Phone number', 'tel'], ['id_number', 'ID number', 'text']] as const).map(([field, label, type]) => <label key={field} className="space-y-1 text-xs font-semibold text-slate-700">{label} <span className="text-rose-700">*</span>{field === 'phone' ? <span className="flex gap-1.5"><select aria-label="Country code" value={countryCode} onChange={(event) => { setCountryCode(event.target.value); setErrors((current) => ({ ...current, phone: undefined })) }} className="w-24 shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-sm font-normal outline-hidden focus:border-emerald-500">{countryCodes.map(([code, country]) => <option key={code} value={code}>{code} {country}</option>)}</select><input required aria-invalid={invalid(field)} type={type} value={form[field]} onBlur={checkReturningGuest} onChange={(event) => setField(field, event.target.value.replace(/\D/g, '').slice(0, 10))} className={inputClass} /></span> : <input required aria-invalid={invalid(field)} type={type} value={form[field]} onChange={(event) => setField(field, event.target.value)} className={inputClass} />}{fieldError(field)}</label>)}<label className="space-y-1 text-xs font-semibold text-slate-700">ID type <span className="text-rose-700">*</span><select required value={form.id_type} onChange={(event) => setField('id_type', event.target.value)} className={inputClass}><option value="passport">Passport</option><option value="national_id">National ID</option><option value="driver_license">Driver license</option></select></label></div></fieldset>
      <fieldset className="space-y-4"><legend className="text-sm font-semibold text-slate-900">Stay Details</legend><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><label className="space-y-1 text-xs font-semibold text-slate-700">Check-in date <span className="text-rose-700">*</span><input required min={localDate()} aria-invalid={invalid('check_in')} type="date" value={form.check_in} onChange={(event) => setField('check_in', event.target.value)} className={inputClass} />{fieldError('check_in')}</label><label className="space-y-1 text-xs font-semibold text-slate-700">Check-in time <span className="text-rose-700">*</span><input required aria-invalid={invalid('check_in_time')} type="time" value={form.check_in_time} onChange={(event) => setField('check_in_time', event.target.value)} className={inputClass} />{fieldError('check_in_time')}</label><label className="space-y-1 text-xs font-semibold text-slate-700">Check-out date <span className="text-rose-700">*</span><input required min={form.check_in || localDate()} aria-invalid={invalid('check_out')} type="date" value={form.check_out} onChange={(event) => setField('check_out', event.target.value)} className={inputClass} />{fieldError('check_out')}</label><label className="space-y-1 text-xs font-semibold text-slate-700">Check-out time <span className="text-rose-700">*</span><input required aria-invalid={invalid('check_out_time')} type="time" value={form.check_out_time} onChange={(event) => setField('check_out_time', event.target.value)} className={inputClass} />{fieldError('check_out_time')}</label><label className="space-y-1 text-xs font-semibold text-slate-700">Number of guests <span className="text-rose-700">*</span><input required min="1" type="number" value={form.number_of_guests} onChange={(event) => setField('number_of_guests', event.target.value)} className={inputClass} /></label><label className="space-y-1 text-xs font-semibold text-slate-700">Available room <span className="text-rose-700">*</span><select required aria-invalid={invalid('room_number')} value={form.room_number} onChange={(event) => setField('room_number', event.target.value)} disabled={availability === 'loading' || availability === 'error'} className={inputClass}><option value="">{availability === 'loading' ? 'Loading available rooms...' : availability === 'error' ? 'Room availability unavailable' : rooms.length ? 'Select an available room' : 'No available rooms for these dates'}</option>{rooms.map((room) => <option key={room.id} value={room.room_number}>Room {room.room_number} · {room.room_type}</option>)}</select>{fieldError('room_number')}{availability === 'error' && <p className="text-xs font-normal text-rose-700">Room availability could not be loaded. Check your connection or session.</p>}</label></div></fieldset>
      <fieldset className="space-y-4"><legend className="text-sm font-semibold text-slate-900">Guest Preferences <span className="font-normal text-slate-500">(optional)</span></legend><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><label className="space-y-1 text-xs font-semibold text-slate-700">Dietary preference<input value={form.dietary} onChange={(event) => setField('dietary', event.target.value)} className={inputClass} /></label><label className="space-y-1 text-xs font-semibold text-slate-700">Room preference<input value={form.room_preferences} onChange={(event) => setField('room_preferences', event.target.value)} className={inputClass} /></label></div><label className="space-y-1 text-xs font-semibold text-slate-700">Special requests<textarea value={form.notes} onChange={(event) => setField('notes', event.target.value)} rows={3} className={inputClass} /></label></fieldset>
      <div className="flex justify-end border-t border-slate-100 pt-5"><button disabled={loading || availability !== 'loaded' || !rooms.length} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50"><UserPlus className="h-4 w-4" />{loading ? 'Registering...' : 'Register Walk-in Guest'}</button></div>
    </form>
  </div>
}