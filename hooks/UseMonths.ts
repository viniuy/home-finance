'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Month } from '@/types'

export function useMonths() {
  const [months, setMonths] = useState<Month[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchMonths() {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('months')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (error) setError(error.message)
    else setMonths(data ?? [])
    setLoading(false)
  }

  async function createMonth(year: number, month: number) {
    const supabase = createClient()
    const label = new Date(year, month - 1, 1).toLocaleString('en-PH', {
      month: 'long',
      year: 'numeric',
    })
    const { data, error } = await supabase
      .from('months')
      .insert({ year, month, label })
      .select()
      .single()

    if (error) throw new Error(error.message)
    await fetchMonths()
    return data as Month
  }

  useEffect(() => {
    fetchMonths()
  }, [])

  return { months, loading, error, createMonth, refetch: fetchMonths }
}