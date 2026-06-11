'use client'
import { useEffect, useState, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import type { Month, MonthlyIncome, MonthlyBill, MonthlyExpense, MiscExpense } from '@/types/types'

export interface MonthSummaryRow {
  month:    Month
  income:   MonthlyIncome[]
  bills:    MonthlyBill[]
  expenses: MonthlyExpense[]
  misc:     MiscExpense[]
  totals: {
    totalIncome:   number
    totalBills:    number
    totalExpenses: number
    totalMisc:     number
    savings:       number
    savingsRate:   number
    pendingBills:  number
  }
}

export function useSummaryData() {
  const [rows,    setRows]    = useState<MonthSummaryRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const sb = getSupabase()

    const { data: months } = await sb
      .from('months')
      .select('*')
      .order('year',  { ascending: true })
      .order('month', { ascending: true })

    if (!months || months.length === 0) {
      setRows([])
      setLoading(false)
      return
    }

    const ids = months.map((m: Month) => m.id)

    const [iRes, bRes, eRes, mRes] = await Promise.all([
      sb.from('monthly_income')  .select('*').in('month_id', ids).order('sort_order'),
      sb.from('monthly_bills')   .select('*').in('month_id', ids).order('sort_order'),
      sb.from('monthly_expenses').select('*').in('month_id', ids).order('sort_order'),
      sb.from('misc_expenses')   .select('*').in('month_id', ids).order('created_at'),
    ])

    const incomeMap:   Record<string, MonthlyIncome[]>  = {}
    const billsMap:    Record<string, MonthlyBill[]>    = {}
    const expMap:      Record<string, MonthlyExpense[]> = {}
    const miscMap:     Record<string, MiscExpense[]>    = {}

    for (const id of ids) {
      incomeMap[id]  = []
      billsMap[id]   = []
      expMap[id]     = []
      miscMap[id]    = []
    }

    for (const r of (iRes.data ?? []))  incomeMap[r.month_id]?.push(r)
    for (const r of (bRes.data ?? []))  billsMap[r.month_id]?.push(r)
    for (const r of (eRes.data ?? []))  expMap[r.month_id]?.push(r)
    for (const r of (mRes.data ?? []))  miscMap[r.month_id]?.push(r)

    const result: MonthSummaryRow[] = months.map((month: Month) => {
      const income   = incomeMap[month.id]  ?? []
      const bills    = billsMap[month.id]   ?? []
      const expenses = expMap[month.id]     ?? []
      const misc     = miscMap[month.id]    ?? []

      const rollover       = month.rollover_amount ?? 0
      const totalIncome    = income.reduce((s, r) => s + r.amount, 0) + rollover
      const totalBills     = bills.reduce((s, r) => s + r.amount, 0)
      const totalExpenses  = expenses.reduce((s, r) => s + (r.amount ?? 0), 0)
      const totalMisc      = misc.reduce((s, r) => s + r.amount, 0)
      const savings        = totalIncome - totalBills - totalExpenses - totalMisc
      const savingsRate    = totalIncome > 0 ? savings / totalIncome : 0
      const pendingBills   = bills.filter(b => b.is_variable && !b.is_updated).length

      return {
        month, income, bills, expenses, misc,
        totals: { totalIncome, totalBills, totalExpenses, totalMisc, savings, savingsRate, pendingBills },
      }
    })

    // Most recent first for display
    setRows([...result].reverse())
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { rows, loading, refetch: fetch }
}
