import React from 'react'

interface LoadingStateProps {
  message?: string
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading information...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-slate-500 rounded-xl bg-white/60 border border-slate-200/80 shadow-xs my-4">
      <div className="w-8 h-8 border-3 border-emerald-600/20 border-t-emerald-700 rounded-full animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  )
}
