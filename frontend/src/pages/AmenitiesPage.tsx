import React, { useEffect, useState } from 'react'
import { Sparkles, Utensils, Compass, Dumbbell, Wine, Coffee } from 'lucide-react'
import { getAmenities } from '../services/api'
import type { Amenity } from '../types/amenity'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'

export const AmenitiesPage: React.FC = () => {
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

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

  const categories = Array.from(new Set(amenities.map((a) => a.category)))

  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase()
    if (cat.includes('dining')) return <Utensils className="w-5 h-5 text-amber-600" />
    if (cat.includes('spa')) return <Sparkles className="w-5 h-5 text-emerald-600" />
    if (cat.includes('local')) return <Compass className="w-5 h-5 text-sky-600" />
    if (cat.includes('fitness')) return <Dumbbell className="w-5 h-5 text-purple-600" />
    return <Wine className="w-5 h-5 text-rose-600" />
  }

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
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
            categoryFilter === 'all'
              ? 'bg-slate-900 text-white font-semibold'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Amenities
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer shrink-0 ${
              categoryFilter === cat
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat.replace(/_/g, ' ')}
          </button>
        ))}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAmenities.map((amenity) => (
            <div
              key={amenity.id}
              className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    {getCategoryIcon(amenity.category)}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {amenity.name}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 capitalize mt-0.5">
                    {amenity.category.replace(/_/g, ' ')}
                  </p>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {amenity.description ?? 'No description provided.'}
                </p>
              </div>

              {/* Tags */}
              {amenity.tags && amenity.tags.length > 0 && (
                <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                  {amenity.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
