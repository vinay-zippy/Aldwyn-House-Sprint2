import React, { useEffect, useState } from 'react'
import { Sparkles, Utensils, Compass, Wine, Coffee, X, Tag } from 'lucide-react'
import { getAmenities } from '../services/api'
import type { Amenity } from '../types/amenity'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'

// No local spa/dining/travel photography exists in the project's assets, so stable
// Unsplash CDN images are used as category imagery (no API key/auth required, fixed IDs).
const CATEGORY_IMAGE = {
  spa: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=70',
  dining: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=70',
  local_experience: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=900&q=70',
  default: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=900&q=70',
} as const

// Fixed display order/styling for the three core amenity categories.
const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; gradient: string; activeClasses: string; iconWrap: string; image: string }> = {
  spa: {
    label: 'Spa',
    icon: <Sparkles className="w-5 h-5" />,
    gradient: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
    activeClasses: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
    iconWrap: 'bg-emerald-100 text-emerald-700',
    image: CATEGORY_IMAGE.spa,
  },
  dining: {
    label: 'Dining',
    icon: <Utensils className="w-5 h-5" />,
    gradient: 'from-amber-500/15 via-amber-500/5 to-transparent',
    activeClasses: 'bg-amber-600 text-white border-amber-600 shadow-sm',
    iconWrap: 'bg-amber-100 text-amber-700',
    image: CATEGORY_IMAGE.dining,
  },
  local_experience: {
    label: 'Local Experience',
    icon: <Compass className="w-5 h-5" />,
    gradient: 'from-sky-500/15 via-sky-500/5 to-transparent',
    activeClasses: 'bg-sky-600 text-white border-sky-600 shadow-sm',
    iconWrap: 'bg-sky-100 text-sky-700',
    image: CATEGORY_IMAGE.local_experience,
  },
}

const CATEGORY_ORDER = ['spa', 'dining', 'local_experience']

function categoryMeta(category: string) {
  return (
    CATEGORY_META[category.toLowerCase()] ?? {
      label: category.replace(/_/g, ' '),
      icon: <Wine className="w-5 h-5" />,
      gradient: 'from-rose-500/15 via-rose-500/5 to-transparent',
      activeClasses: 'bg-rose-600 text-white border-rose-600 shadow-sm',
      iconWrap: 'bg-rose-100 text-rose-700',
      image: CATEGORY_IMAGE.default,
    }
  )
}

export const AmenitiesPage: React.FC = () => {
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null)

  const loadAmenities = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAmenities()
      setAmenities(data)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to retrieve amenities.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAmenities()
  }, [])

  const filteredAmenities =
    categoryFilter === 'all'
      ? amenities
      : amenities.filter((a) => a.category.toLowerCase() === categoryFilter.toLowerCase())

  const presentCategories = Array.from(new Set(amenities.map((a) => a.category.toLowerCase())))
  const orderedCategories = [
    ...CATEGORY_ORDER.filter((cat) => presentCategories.includes(cat)),
    ...presentCategories.filter((cat) => !CATEGORY_ORDER.includes(cat)),
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Hotel Amenities Catalogue
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Aldwyn House available services, dining options, and guest experiences.
        </p>
      </div>

      {/* Category Filter Bar */}
      <div className="flex items-center space-x-2 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs overflow-x-auto">
        <span className="text-xs font-semibold text-slate-700 shrink-0">
          Category:
        </span>
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          aria-pressed={categoryFilter === 'all'}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 border ${
            categoryFilter === 'all'
              ? 'bg-slate-900 text-white font-semibold border-slate-900'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-transparent'
          }`}
        >
          All Amenities
        </button>
        {orderedCategories.map((cat) => {
          const meta = categoryMeta(cat)
          const isActive = categoryFilter.toLowerCase() === cat
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              aria-pressed={isActive}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer shrink-0 border ${
                isActive
                  ? meta.activeClasses
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-transparent'
              }`}
            >
              {meta.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <LoadingState message="Loading amenity catalogue..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void loadAmenities()} />
      ) : filteredAmenities.length === 0 ? (
        <EmptyState
          title="No amenities found"
          message="There are currently no active amenities matching this category."
          icon={<Coffee className="w-8 h-8" />}
        />
      ) : (
        /* Amenities Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAmenities.map((amenity) => {
            const meta = categoryMeta(amenity.category)
            return (
              <button
                key={amenity.id}
                type="button"
                onClick={() => setSelectedAmenity(amenity)}
                className="group relative text-left bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 hover:border-slate-300 transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <div className="relative h-36 w-full overflow-hidden">
                  <img
                    src={meta.image}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${meta.gradient} from-slate-950/70 via-slate-950/10 to-transparent`} />
                  <div className={`absolute top-3 left-3 p-2 rounded-lg ${meta.iconWrap} shadow-xs`}>
                    {meta.icon}
                  </div>
                  <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-white/90 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                  <h3 className="absolute bottom-2.5 left-4 right-4 text-base font-bold text-white drop-shadow-sm">
                    {amenity.name}
                  </h3>
                </div>
                <div className="p-5 space-y-3">
                  <p className="text-xs font-semibold text-slate-500 capitalize">
                    {meta.label}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {amenity.description ?? 'No description provided.'}
                  </p>

                  {amenity.tags && amenity.tags.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {amenity.tags.slice(0, 4).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] font-semibold text-slate-400 group-hover:text-emerald-600 transition-colors pt-1">
                    View details →
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Amenity Detail Modal */}
      {selectedAmenity && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          onClick={() => setSelectedAmenity(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative h-56 w-full overflow-hidden">
              <img
                src={categoryMeta(selectedAmenity.category).image}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${categoryMeta(selectedAmenity.category).gradient} from-slate-950/80 via-slate-950/20 to-transparent`} />
              <button
                type="button"
                onClick={() => setSelectedAmenity(null)}
                aria-label="Close details"
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className={`absolute top-3 left-3 p-2.5 rounded-xl ${categoryMeta(selectedAmenity.category).iconWrap} shadow-xs`}>
                {categoryMeta(selectedAmenity.category).icon}
              </div>
              <div className="absolute bottom-4 left-6 right-6">
                <p className="text-[11px] font-semibold text-white/80 uppercase tracking-wider capitalize">
                  {categoryMeta(selectedAmenity.category).label}
                </p>
                <h2 className="text-2xl font-bold text-white drop-shadow-sm mt-0.5">
                  {selectedAmenity.name}
                </h2>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                {selectedAmenity.description ?? 'No description provided.'}
              </p>

              {selectedAmenity.tags && selectedAmenity.tags.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <Tag className="w-3 h-3" /> Tags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAmenity.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active amenity
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
