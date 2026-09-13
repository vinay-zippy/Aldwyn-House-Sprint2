import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Star,
  Utensils,
  BedDouble,
  History,
  Sparkles,
  Search,
} from 'lucide-react'
import { getGuest, getGuestPreferences, getGuests, getUpcomingArrivals } from '../services/api'
import type { GuestDetail, PreferenceItem, PastRequest, Guest } from '../types/guest'
import type { UpcomingArrival } from '../types/reservation'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'

export const Guest360Page: React.FC = () => {
  const { guestId } = useParams<{ guestId?: string }>()
  const navigate = useNavigate()

  const [guest, setGuest] = useState<GuestDetail | null>(null)
  const [pastRequests, setPastRequests] = useState<PastRequest[]>([])
  const [arrivalInfo, setArrivalInfo] = useState<UpcomingArrival | null>(null)
  const [allGuests, setAllGuests] = useState<Guest[]>([])
  const [selectedGuestId, setSelectedGuestId] = useState<string>(guestId ?? '')
  const [loading, setLoading] = useState(Boolean(guestId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load guest list for selector dropdown
    getGuests()
      .then(setAllGuests)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!guestId) {
      setLoading(false)
      setGuest(null)
      return
    }

    const loadGuestDetails = async () => {
      try {
        setLoading(true)
        setError(null)

        const [guestData, prefResp, arrData] = await Promise.all([
          getGuest(guestId),
          getGuestPreferences(guestId).catch(() => null),
          getUpcomingArrivals().catch(() => []),
        ])

        setGuest(guestData)
        if (prefResp) {
          setPastRequests(prefResp.past_requests)
        }
        const matchingArr = arrData.find((a) => a.guest_id === guestId)
        setArrivalInfo(matchingArr ?? null)
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : 'Unable to retrieve guest profile.',
        )
      } finally {
        setLoading(false)
      }
    }

    void loadGuestDetails()
  }, [guestId])

  const handleSelectGuest = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedGuestId(val)
    if (val) {
      navigate(`/guests/${val}`)
    }
  }

  // Check if guest has high priority preferences
  const isHighPriority =
    guest?.preferences &&
    (guest.preferences.dietary.some((p) => p.is_high_priority || p.priority === 'high') ||
      guest.preferences.room_preferences.some((p) => p.is_high_priority || p.priority === 'high') ||
      guest.preferences.notes.some((p) => p.is_high_priority || p.priority === 'high'))

  const hasPreferences =
    guest?.preferences &&
    (guest.preferences.dietary.length > 0 ||
      guest.preferences.room_preferences.length > 0 ||
      guest.preferences.notes.length > 0)

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation & Guest Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/arrivals')}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← Back to Arrivals</span>
        </button>

        {/* Guest Selector Dropdown */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 font-medium">Select Guest:</span>
          <select
            value={selectedGuestId}
            onChange={handleSelectGuest}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-emerald-500 shadow-2xs"
          >
            <option value="">-- Choose Guest --</option>
            {allGuests.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.loyalty_tier.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {!guestId && (
        <EmptyState
          title="Select a Guest"
          message="Please select a guest from the dropdown above or search by ID to view their 360 Profile."
          icon={<Search className="w-8 h-8" />}
        />
      )}

      {loading && <LoadingState message="Loading Guest 360 profile..." />}

      {error && (
        <ErrorState
          title="Unable to load guest profile"
          message={error}
          onRetry={() => navigate(0)}
        />
      )}

      {!loading && !error && guest && (
        <div className="space-y-6">
          {/* Guest Header Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-xs">
                {guest.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    {guest.name}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                    {guest.loyalty_tier} tier
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Guest ID: <span className="font-mono">{guest.id}</span>
                </p>
              </div>
            </div>

            {/* AI Assistant Quick Action */}
            <button
              type="button"
              onClick={() => navigate(`/ai-assistance?guestId=${guest.id}`)}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>✦ View AI Experience Matches</span>
            </button>
          </div>

          {/* High Priority Banner */}
          {isHighPriority && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center space-x-3 shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  ⭐ HIGH PRIORITY
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  This guest has preferences that may require additional attention before arrival.
                </p>
              </div>
            </div>
          )}

          {/* Two Main Columns Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: Reservation & Past Requests */}
            <div className="space-y-6">
              {/* Reservation Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
                  <BedDouble className="w-4 h-4 text-slate-600" />
                  <h3>Reservation Details</h3>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 font-medium block">Room</span>
                    <span className="font-semibold text-slate-900 font-mono text-sm">
                      {arrivalInfo?.room_number ?? 'Assigned at check-in'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block">Status</span>
                    <span className="font-semibold text-emerald-700 capitalize">
                      {arrivalInfo?.status ?? 'Confirmed'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block">Arrival</span>
                    <span className="font-medium text-slate-800">
                      {arrivalInfo?.check_in ?? 'Scheduled'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block">Departure</span>
                    <span className="font-medium text-slate-800">
                      {arrivalInfo?.check_out ?? 'Scheduled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Past Requests Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
                  <History className="w-4 h-4 text-slate-600" />
                  <h3>Past Requests</h3>
                </div>

                {pastRequests.length === 0 ? (
                  <p className="text-xs text-slate-500 italic pt-2 border-t border-slate-100">
                    No previous requests recorded.
                  </p>
                ) : (
                  <ul className="space-y-2 pt-2 border-t border-slate-100">
                    {pastRequests.map((req, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-0"
                      >
                        <span className="text-slate-800">{req.request}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-sm capitalize">
                          {req.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Column 2: Dietary, Room Preferences & Notes */}
            <div className="space-y-6">
              {!hasPreferences ? (
                <div className="bg-white rounded-xl border border-slate-200/80 p-8 shadow-xs text-center space-y-2">
                  <h3 className="font-semibold text-slate-900 text-sm">
                    No preferences saved
                  </h3>
                  <p className="text-xs text-slate-500">
                    There are currently no saved guest preferences for this reservation.
                  </p>
                </div>
              ) : (
                <>
                  {/* Dietary Preferences Card */}
                  <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                    <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
                      <Utensils className="w-4 h-4 text-slate-600" />
                      <h3>Dietary Preferences</h3>
                    </div>

                    {guest.preferences.dietary.length === 0 ? (
                      <p className="text-xs text-slate-400 italic pt-2 border-t border-slate-100">
                        None specified
                      </p>
                    ) : (
                      <ul className="space-y-2 pt-2 border-t border-slate-100">
                        {guest.preferences.dietary.map((pref, idx) => (
                          <PreferenceRow key={idx} item={pref} />
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Room Preferences Card */}
                  <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                    <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
                      <BedDouble className="w-4 h-4 text-slate-600" />
                      <h3>Room Preferences</h3>
                    </div>

                    {guest.preferences.room_preferences.length === 0 ? (
                      <p className="text-xs text-slate-400 italic pt-2 border-t border-slate-100">
                        None specified
                      </p>
                    ) : (
                      <ul className="space-y-2 pt-2 border-t border-slate-100">
                        {guest.preferences.room_preferences.map((pref, idx) => (
                          <PreferenceRow key={idx} item={pref} />
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Staff Notes */}
                  {guest.preferences.notes.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                      <h3 className="text-slate-900 font-semibold text-sm">
                        Staff Notes
                      </h3>
                      <ul className="space-y-2 pt-2 border-t border-slate-100">
                        {guest.preferences.notes.map((pref, idx) => (
                          <PreferenceRow key={idx} item={pref} />
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PreferenceRow({ item }: { item: PreferenceItem }) {
  const isHigh = item.is_high_priority || item.priority === 'high'

  return (
    <li className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md bg-slate-50 border border-slate-100">
      <span className="text-slate-800 capitalize font-medium">{item.value}</span>
      {isHigh && (
        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
          <span>High Priority</span>
        </span>
      )}
    </li>
  )
}
