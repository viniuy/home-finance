'use client'
import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'

type Status = 'connecting' | 'live' | 'dropped'

interface RealtimeIndicatorProps {
  // When true: renders only the pulsing dot (no text, no border box) — for mobile topbar
  mobileOnly?: boolean
}

export function RealtimeIndicator({ mobileOnly }: RealtimeIndicatorProps) {
  const [status, setStatus] = useState<Status>('connecting')

  useEffect(() => {
    const probe = getSupabase()
      .channel('realtime-probe')
      .subscribe((state : 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED' | 'SUBSCRIBING') => {
        if (state === 'SUBSCRIBED')                                          setStatus('live')
        if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') setStatus('dropped')
        if (state === 'SUBSCRIBING')                                         setStatus('connecting')
      })
    return () => { getSupabase().removeChannel(probe) }
  }, [])

  const color = status === 'live' ? 'var(--income)' : status === 'connecting' ? 'var(--pending)' : 'var(--expense)'

  // Mobile: just the dot, no wrapper
  if (mobileOnly) {
    return (
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        title={`Realtime: ${status}`}
        style={{
          background: color,
          animation: status === 'live' ? 'rt-pulse 2s ease-in-out infinite' : 'none',
        }}
      >
        <style>{`@keyframes rt-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.75)}}`}</style>
      </span>
    )
  }

  const label = status === 'live' ? 'Live' : status === 'connecting' ? 'Connecting' : 'Dropped'

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 text-[0.65rem] font-bold uppercase tracking-[0.08em] border"
      style={{
        color,
        background:  status === 'live' ? 'var(--income-dim)' : status === 'connecting' ? 'var(--pending-dim)' : 'var(--expense-dim)',
        borderColor: `color-mix(in oklch, ${color} 30%, transparent)`,
      }}
      title={`Realtime WebSocket: ${label}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{
          background: color,
          animation:  status === 'live' ? 'rt-pulse 2s ease-in-out infinite' : 'none',
        }}
      />
      {label}
      <style>{`@keyframes rt-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.75)}}`}</style>
    </div>
  )
}
