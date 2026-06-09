'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Month, Expense, MonthlyIncome } from '@/types'

export function useMonth(monthId: string | null) {
  const [month, setMonth] = useState<Month | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [income, setIncome] = useState<MonthlyIncome[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchMonth() {
    if (!monthId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const supabase = createClient()

    const [monthRes, expensesRes, incomeRes] = await Promise.all([
      supabase.from('months').select('*').eq('id', monthId).single(),
      supabase
        .from('expenses')
        .select('*')
        .eq('month_id', monthId)
        .order('created_at', { ascending: false }),
      supabase
        .from('monthly_income')
        .select('*, income_sources(*)')
        .eq('month_id', monthId),
    ])

    if (monthRes.error) setError(monthRes.error.message)
    else setMonth(monthRes.data)

    setExpenses(expensesRes.data ?? [])
    setIncome(incomeRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchMonth()
  }, [monthId])

  return { month, expenses, income, loading, error, refetch: fetchMonth }
}