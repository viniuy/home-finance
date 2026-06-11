'use client'
import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import type { Settings } from '@/types/types'

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading]   = useState(true)

  async function fetchSettings() {
    const { data } = await getSupabase().from('settings').select('*').single()
    setSettings(data)
    setLoading(false)
  }

  async function toggleRollover(value: boolean) {
    if (!settings) return
    await getSupabase().from('settings').update({ rollover_savings: value }).eq('id', settings.id)
    setSettings(prev => prev ? { ...prev, rollover_savings: value } : prev)
  }

  useEffect(() => { fetchSettings() }, [])

  return { settings, loading, toggleRollover }
}