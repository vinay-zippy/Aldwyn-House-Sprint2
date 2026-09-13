import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Sparkles,
  Bot,
  User,
  CheckCircle2,
  XCircle,
  ShieldCheck,
} from 'lucide-react'
import {
  getGuests,
  getGuest,
  getAmenityRecommendations,
  reviewAmenityRecommendation,
} from '../services/api'
import type { Guest, GuestDetail } from '../types/guest'
import type { AmenityRecommendation } from '../types/amenity'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'
import { StatusBadge } from '../components/common/StatusBadge'

export const AIAssistancePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialGuestId = searchParams.get('guestId') ?? ''

  const [guests, setGuests] = useState<Guest[]>([])
  const [selectedGuestId, setSelectedGuestId] = useState<string>(initialGuestId)
  const [selectedGuest, setSelectedGuest] = useState<GuestDetail | null>(null)
  const [recommendations, setRecommendations] = useState<
    AmenityRecommendation[]
  >([])

  const [loadingGuest, setLoadingGuest] = useState(false)
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load guest list
  useEffect(() => {
    getGuests()
      .then((data) => {
        setGuests(data)
        if (!selectedGuestId && data.length > 0) {
          setSelectedGuestId(data[0].id)
        }
      })
      .catch(() => {})
  }, [])

  // Load details & auto-fetch matches when selectedGuestId changes
  useEffect(() => {
    if (!selectedGuestId) {
      setSelectedGuest(null)
      setRecommendations([])
      return
    }

    setSearchParams({ guestId: selectedGuestId }, { replace: true })

    const loadProfileAndMatches = async () => {
      try {
        setLoadingGuest(true)
        setError(null)

        const [gDetail, recs] = await Promise.all([
          getGuest(selectedGuestId),
          getAmenityRecommendations(selectedGuestId),
        ])

        setSelectedGuest(gDetail)
        setRecommendations(recs)
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to retrieve guest intelligence.',
        )
      } finally {
        setLoadingGuest(false)
      }
    }

    void loadProfileAndMatches()
  }, [selectedGuestId, setSearchParams])

  const handleFindMatches = async () => {
    if (!selectedGuestId) return
    try {
      setLoadingMatches(true)
      setError(null)
      const recs = await getAmenityRecommendations(selectedGuestId)
      setRecommendations(recs)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to find AI matches.',
      )
    } finally {
      setLoadingMatches(false)
    }
  }

  const handleReview = async (amenityId: string, status: 'approved' | 'rejected') => {
    if (!selectedGuestId) return
    try {
      setReviewingId(amenityId)
      await reviewAmenityRecommendation(selectedGuestId, amenityId, status)
      // Update local state
      setRecommendations((prev) =>
        prev.map((r) =>
          r.amenity.id === amenityId ? { ...r, status } : r,
        ),
      )
    } catch {
      alert('Unable to save staff review decision.')
    } finally {
      setReviewingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-emerald-700">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Guest Intelligence
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Match sanitized guest preferences with available Aldwyn House amenities and experiences.
        </p>
      </div>

      {/* Privacy Notice Banner */}
      <div className="bg-slate-900 text-slate-200 p-4 rounded-xl shadow-xs flex items-center justify-between text-xs border border-slate-800">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <p>
            <strong className="text-white">Privacy Protected:</strong> Matching operates on sanitized preference terms only. Guest PII (names, phone numbers, emails, payment data) is stripped prior to processing.
          </p>
        </div>
      </div>

      {/* Guest Selector Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <label htmlFor="guest-select" className="block text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Select Guest
            </label>
            <select
              id="guest-select"
              value={selectedGuestId}
              onChange={(e) => setSelectedGuestId(e.target.value)}
              className="px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-emerald-500 min-w-64"
            >
              <option value="">-- Choose Guest --</option>
              {guests.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.loyalty_tier.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleFindMatches}
            disabled={!selectedGuestId || loadingMatches}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>✦ Find Matches</span>
          </button>
        </div>

        {/* Selected Guest Preferences Preview */}
        {selectedGuest && (
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-100">
              <span className="font-semibold text-slate-700 block mb-1">
                Dietary Preferences
              </span>
              <p className="text-slate-600">
                {selectedGuest.preferences.dietary.map((d) => d.value).join(', ') || 'None'}
              </p>
            </div>

            <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-100">
              <span className="font-semibold text-slate-700 block mb-1">
                Room Preferences
              </span>
              <p className="text-slate-600">
                {selectedGuest.preferences.room_preferences.map((r) => r.value).join(', ') || 'None'}
              </p>
            </div>

            <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-100">
              <span className="font-semibold text-slate-700 block mb-1">
                Special Requests / Notes
              </span>
              <p className="text-slate-600">
                {selectedGuest.preferences.notes.map((n) => n.value).join(', ') || 'None'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Loading States & Recommendations List */}
      {loadingGuest || loadingMatches ? (
        <LoadingState message="Finding suitable experiences..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void handleFindMatches()} />
      ) : !selectedGuestId ? (
        <EmptyState
          title="Select a guest to match"
          message="Choose a guest from the dropdown above to view AI experience matches."
          icon={<User className="w-8 h-8" />}
        />
      ) : recommendations.length === 0 ? (
        <EmptyState
          title="No direct experience matches"
          message="No active catalogue amenities directly match the guest's saved preference rules."
          icon={<Bot className="w-8 h-8" />}
        />
      ) : (
        /* Recommendations Cards */
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            AI Experience Matches ({recommendations.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((rec) => {
              const isApproved = rec.status === 'approved'
              const isRejected = rec.status === 'rejected'

              return (
                <div
                  key={rec.amenity.id}
                  className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {rec.amenity.category.replace(/_/g, ' ')}
                      </span>
                      <StatusBadge status={rec.status} type="recommendation" />
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-900">
                        {rec.amenity.name}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {rec.amenity.description}
                      </p>
                    </div>

                    {/* Matched terms */}
                    <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-100 text-xs">
                      <p className="font-semibold text-emerald-900 text-[11px] mb-1">
                        Strong preference match
                      </p>
                      <p className="text-emerald-800 text-[11px]">
                        Matched terms: {rec.matched_terms.join(', ')}
                      </p>
                    </div>
                  </div>

                  {/* Staff Review Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">
                      Staff Review
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        disabled={reviewingId === rec.amenity.id || isApproved}
                        onClick={() => void handleReview(rec.amenity.id, 'approved')}
                        className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          isApproved
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>

                      <button
                        type="button"
                        disabled={reviewingId === rec.amenity.id || isRejected}
                        onClick={() => void handleReview(rec.amenity.id, 'rejected')}
                        className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          isRejected
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Dismiss</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
