import React from 'react'

interface StatusBadgeProps {
  status: string
  type?: 'reservation' | 'room' | 'recommendation'
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'reservation',
}) => {
  const normalized = status.toLowerCase()

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200'

  if (type === 'reservation') {
    if (normalized === 'confirmed' || normalized === 'checked_in') {
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200'
    } else if (normalized === 'pending') {
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200'
    } else if (normalized === 'cancelled') {
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200'
    } else if (normalized === 'checked_out') {
      colorClasses = 'bg-slate-100 text-slate-600 border-slate-200'
    }
  } else if (type === 'room') {
    if (normalized === 'available' || normalized === 'ready') {
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200'
    } else if (normalized === 'occupied' || normalized === 'reserved') {
      colorClasses = 'bg-sky-50 text-sky-700 border-sky-200'
    } else if (normalized === 'cleaning' || normalized === 'dirty') {
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200'
    } else if (normalized === 'maintenance' || normalized === 'out_of_service') {
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200'
    }
  } else if (type === 'recommendation') {
    if (normalized === 'approved') {
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200'
    } else if (normalized === 'rejected') {
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200'
    } else {
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200'
    }
  }

  const formatted = status.replace(/_/g, ' ')

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize border ${colorClasses}`}
    >
      {formatted}
    </span>
  )
}
