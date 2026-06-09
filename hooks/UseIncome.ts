'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { IncomeSource, MonthlyIncome } from '@/types'

export function useIncome(monthId: string | null) {
  const [sources, setSources] = useState<IncomeSource[]>([])
  const [monthlyIncome, setMonthlyIncome] = useState<MonthlyIncome[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  async function fetchIncome() {
    if (!monthId) return
    setLoading(true)

    const [sourcesRes, incomeRes] = await Promise.all([
      supabase.from('income_sources').select('*').eq('is_active', true).order('sort_order'),
      supabase
        .from('monthly_income')
        .select('*, income_sources(*)')
        .eq('month_id', monthId),
    ])

    setSources(sourcesRes.data ?? [])
    setMonthlyIncome(incomeRes.data ?? [])
    setLoading(false)
  }

  async function seedIncomeForMonth(monthId: string) {
    const { data: allSources } = await supabase
      .from('income_sources')
      .select('*')
      .eq('is_active', true)

    if (!allSources?.length) return

    const rows = allSources.map((s) => ({
      month_id: monthId,
      source_id: s.id,
      amount: s.amount,
    }))

    const { error } = await supabase.from('monthly_income').insert(rows)
    if (error) throw new Error(error.message)
    await fetchIncome()
  }

  async function updateMonthlyIncome(id: string, amount: number) {
    const { error } = await supabase
      .from('monthly_income')
      .update({ amount })
      .eq('id', id)

    if (error) throw new Error(error.message)
    await fetchIncome()
  }

  useEffect(() => {
    fetchIncome()
  }, [monthId])

  return {
    sources,
    monthlyIncome,
    loading,
    seedIncomeForMonth,
    updateMonthlyIncome,
    refetch: fetchIncome,
  }
}