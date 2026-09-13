import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Calendar } from 'lucide-react'
import { getUpcomingArrivals } from '../services/api'
import type { UpcomingArrival } from '../types/reservation'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'
import { StatusBadge } from '../components/common/StatusBadge'

export const UpcomingArrivalsPage: React.FC = () => {
  const [arrivals, setArrivals] = useState<UpcomingArrival[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const navigate = useNavigate()

  const loadArrivals = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getUpcomingArrivals()
      setArrivals(data)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to load arrivals.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadArrivals()
  }, [])

  const filteredArrivals = arrivals.filter((arrival) => {
    const matchesSearch =
      arrival.guest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      arrival.guest_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (arrival.room_number ?? '').includes(searchTerm)

    const matchesStatus =
      statusFilter === 'all' ||
      arrival.status.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Upcoming Arrivals
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Guests arriving within the configured arrival period.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by guest, ID, room..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 text-slate-900 placeholder:text-slate-400 rounded-lg border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-hidden transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked_in">Checked In</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <LoadingState message="Loading upcoming arrivals..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void loadArrivals()} />
      ) : filteredArrivals.length === 0 ? (
        <EmptyState
          title="No upcoming arrivals found"
          message="There are no guest arrivals matching your current search filters."
          icon={<Calendar className="w-8 h-8" />}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Guest</th>
                  <th className="py-3 px-4">Arrival Date</th>
                  <th className="py-3 px-4">Departure Date</th>
                  <th className="py-3 px-4">Room</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredArrivals.map((arrival) => (
                  <tr
                    key={arrival.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                          {arrival.guest_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {arrival.guest_name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            ID: {arrival.guest_id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">{arrival.check_in}</td>
                    <td className="py-3.5 px-4">{arrival.check_out}</td>
                    <td className="py-3.5 px-4 font-medium">
                      {arrival.room_number ? (
                        <span className="px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                          {arrival.room_number}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={arrival.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/guests/${arrival.guest_id}`)}
                        className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                      >
                        Guest 360
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
