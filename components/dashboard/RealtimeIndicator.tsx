'use client'
import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'

type Status = 'connecting' | 'live' | 'dropped'

export function RealtimeIndicator() {
  const [status, setStatus] = useState<Status>('connecting')

  useEffect(() => {
    // Create a dedicated probe channel — its sole job is reporting connection state
    const probe = getSupabase()
      .channel('realtime-probe')
      .subscribe((state: string) => {
        if (state === 'SUBSCRIBED')   setStatus('live')
        if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') setStatus('dropped')
        if (state === 'SUBSCRIBING')  setStatus('connecting')
      })

    return () => {
      getSupabase().removeChannel(probe)
    }
  }, [])

  const label = status === 'live' ? 'Live' : status === 'connecting' ? 'Connecting' : 'Dropped'

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 text-[0.65rem] font-bold uppercase tracking-[0.08em] border"
      style={{
        color:            status === 'live' ? 'var(--income)'   : status === 'connecting' ? 'var(--pending)'  : 'var(--expense)',
        background:       status === 'live' ? 'var(--income-dim)' : status === 'connecting' ? 'var(--pending-dim)' : 'var(--expense-dim)',
        borderColor:      status === 'live' ? 'color-mix(in oklch, var(--income) 30%, transparent)'
                        : status === 'connecting' ? 'color-mix(in oklch, var(--pending) 30%, transparent)'
                        : 'color-mix(in oklch, var(--expense) 30%, transparent)',
      }}
      title={`Realtime WebSocket: ${label}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{
          background: status === 'live' ? 'var(--income)' : status === 'connecting' ? 'var(--pending)' : 'var(--expense)',
          // Pulse animation only when live
          animation: status === 'live' ? 'rt-pulse 2s ease-in-out infinite' : 'none',
        }}
      />
      {label}

      <style>{`
        @keyframes rt-pulse {
          0%, 100% { opacity: 1;    transform: scale(1);   }
          50%       { opacity: 0.4; transform: scale(0.75); }
        }
      `}</style>
    </div>
  )
}
