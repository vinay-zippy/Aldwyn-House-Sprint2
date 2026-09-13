import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Building,
  LogOut,
  Star,
  BedDouble,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react'
import { getDashboardSummary, getUpcomingArrivals } from '../services/api'
import type { DashboardSummary } from '../types/dashboard'
import type { UpcomingArrival } from '../types/reservation'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { StatusBadge } from '../components/common/StatusBadge'

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [arrivals, setArrivals] = useState<UpcomingArrival[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [sumData, arrData] = await Promise.all([
        getDashboardSummary(),
        getUpcomingArrivals(),
      ])
      setSummary(sumData)
      setArrivals(arrData)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to connect to backend',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  if (loading) {
    return <LoadingState message="Loading today's guest overview..." />
  }

  if (error || !summary) {
    return (
      <ErrorState
        title="Unable to load dashboard"
        message={error ?? 'Please check backend connection.'}
        onRetry={() => void loadData()}
      />
    )
  }

  return (
    <div className="space-y-8">
      {/* Header Greeting */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Good morning, Front Desk
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Here's today's guest overview at Aldwyn House.
        </p>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Upcoming Arrivals
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {summary.upcoming_arrivals}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              In-House Guests
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {summary.in_house_guests}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Departures
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {summary.departures}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <LogOut className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-200/80 bg-amber-50/30 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-800 uppercase tracking-wider">
              High-Priority Guests
            </p>
            <p className="text-2xl font-bold text-amber-900 mt-1">
              {summary.high_priority_guests}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
            <Star className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Upcoming Arrivals & High Priority Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Arrivals Table Section (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Upcoming Arrivals
              </h2>
              <p className="text-xs text-slate-500">
                Guests expected to check in soon
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/arrivals')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {arrivals.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              No upcoming guest arrivals scheduled.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 font-medium">
                  <tr>
                    <th className="py-2.5 px-3">Guest</th>
                    <th className="py-2.5 px-3">Arrival</th>
                    <th className="py-2.5 px-3">Departure</th>
                    <th className="py-2.5 px-3">Room</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {arrivals.slice(0, 5).map((arrival) => (
                    <tr
                      key={arrival.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-3 font-medium text-slate-900">
                        {arrival.guest_name}
                      </td>
                      <td className="py-3 px-3">{arrival.check_in}</td>
                      <td className="py-3 px-3">{arrival.check_out}</td>
                      <td className="py-3 px-3">
                        {arrival.room_number ?? 'Not assigned'}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={arrival.status} />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/guests/${arrival.guest_id}`)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                        >
                          View 360
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Attention / High Priority & Room Status */}
        <div className="space-y-6">
          {/* Attention / High Priority Section */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Attention / High Priority
              </span>
            </div>
            {arrivals.length > 0 ? (
              <div className="space-y-3">
                <div className="bg-white/90 p-3.5 rounded-lg border border-amber-200/60 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-900">
                      {arrivals[0].guest_name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-amber-100 text-amber-800 font-medium">
                      Room {arrivals[0].room_number ?? 'TBD'}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    This guest has preferences that may require additional
                    attention before arrival.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(`/guests/${arrivals[0].guest_id}`)}
                    className="mt-3 w-full py-1.5 text-xs font-medium text-amber-900 bg-amber-100 hover:bg-amber-200/80 rounded-md transition-colors text-center block cursor-pointer"
                  >
                    View Guest 360
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-800">
                No high-priority guest alerts today.
              </p>
            )}
          </div>

          {/* Compact Room Status Section */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BedDouble className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Room Status Overview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/rooms')}
                className="text-[11px] text-emerald-700 hover:underline cursor-pointer"
              >
                View Grid
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100">
                <p className="text-[10px] text-emerald-700 font-medium uppercase">
                  Available
                </p>
                <p className="text-lg font-bold text-emerald-900 mt-0.5">
                  {summary.room_summary.available}
                </p>
              </div>

              <div className="p-3 bg-sky-50/60 rounded-lg border border-sky-100">
                <p className="text-[10px] text-sky-700 font-medium uppercase">
                  Occupied
                </p>
                <p className="text-lg font-bold text-sky-900 mt-0.5">
                  {summary.room_summary.occupied}
                </p>
              </div>

              <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-100">
                <p className="text-[10px] text-amber-700 font-medium uppercase">
                  Cleaning
                </p>
                <p className="text-lg font-bold text-amber-900 mt-0.5">
                  {summary.room_summary.cleaning}
                </p>
              </div>

              <div className="p-3 bg-slate-100/70 rounded-lg border border-slate-200">
                <p className="text-[10px] text-slate-600 font-medium uppercase">
                  Maintenance
                </p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">
                  {summary.room_summary.maintenance}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
