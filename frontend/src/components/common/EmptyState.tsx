import React from 'react'

interface EmptyStateProps {
  title: string
  message: string
  icon?: React.ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl bg-slate-50/50 border border-slate-200/80 my-4 text-slate-500">
      {icon && <div className="mb-3 text-slate-400">{icon}</div>}
      <h3 className="font-medium text-slate-800 text-sm mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm">{message}</p>
    </div>
  )
}
