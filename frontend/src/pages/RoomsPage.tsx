import React, { useEffect, useState } from 'react'
import { BedDouble, CheckCircle2, Sparkles, Wrench } from 'lucide-react'
import { getRooms } from '../services/api'
import type { Room } from '../types/room'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { StatusBadge } from '../components/common/StatusBadge'

export const RoomsPage: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFloor, setSelectedFloor] = useState<string>('all')

  const loadRooms = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getRooms()
      setRooms(data)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to load room catalogue.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRooms()
  }, [])

  // Calculate statistics
  const availableCount = rooms.filter(
    (r) => r.status === 'available' || r.status === 'ready',
  ).length
  const occupiedCount = rooms.filter(
    (r) => r.status === 'occupied' || r.status === 'reserved',
  ).length
  const cleaningCount = rooms.filter(
    (r) =>
      r.status === 'cleaning' ||
      r.status === 'dirty' ||
      r.status === 'inspection_pending',
  ).length
  const maintenanceCount = rooms.filter(
    (r) => r.status === 'maintenance' || r.status === 'out_of_service',
  ).length

  // Group rooms by floor
  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort(
    (a, b) => Number(a) - Number(b),
  )

  const filteredRooms =
    selectedFloor === 'all'
      ? rooms
      : rooms.filter((r) => r.floor === selectedFloor)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Rooms & Housekeeping
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Live room status grid across all floors at Aldwyn House.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
              Available
            </p>
            <p className="text-xl font-bold text-emerald-950 mt-0.5">
              {availableCount}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-sky-200/80 bg-sky-50/20 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
            <BedDouble className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">
              Occupied
            </p>
            <p className="text-xl font-bold text-sky-950 mt-0.5">
              {occupiedCount}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
              Cleaning
            </p>
            <p className="text-xl font-bold text-amber-950 mt-0.5">
              {cleaningCount}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
              Maintenance
            </p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">
              {maintenanceCount}
            </p>
          </div>
        </div>
      </div>

      {/* Floor Selector */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
        <span className="text-xs font-semibold text-slate-700">Filter Floor:</span>
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedFloor('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              selectedFloor === 'all'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Floors
          </button>
          {floors.map((floor) => (
            <button
              key={floor}
              type="button"
              onClick={() => setSelectedFloor(floor)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedFloor === floor
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Floor {floor}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading room status grid..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void loadRooms()} />
      ) : (
        /* Visual Room Grid Organized by Floor */
        <div className="space-y-6">
          {(selectedFloor === 'all' ? floors : [selectedFloor]).map((floor) => {
            const floorRooms = filteredRooms.filter((r) => r.floor === floor)
            if (floorRooms.length === 0) return null

            return (
              <div
                key={floor}
                className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-3"
              >
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Floor {floor} ({floorRooms.length} Rooms)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {floorRooms.map((room) => (
                    <div
                      key={room.id}
                      className="p-3 rounded-lg border border-slate-200/80 hover:border-slate-300 bg-slate-50/50 flex flex-col items-center justify-between text-center transition-all hover:shadow-xs"
                    >
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {room.room_number}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize mb-2">
                        {room.room_type}
                      </span>
                      <StatusBadge status={room.status} type="room" />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
