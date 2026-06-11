'use client'
import { useEffect, useState, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import type {
  Month, MonthlyIncome, MonthlyBill,
  MonthlyExpense, MiscExpense, MonthlySummary
} from '@/types/types'

interface MonthData {
  month:           Month | null
  income:          MonthlyIncome[]
  bills:           MonthlyBill[]
  monthlyExpenses: MonthlyExpense[]
  miscExpenses:    MiscExpense[]
  summary:         MonthlySummary
  loading:         boolean
}

function computeSummary(
  month: Month | null,
  income: MonthlyIncome[],
  bills: MonthlyBill[],
  monthlyExpenses: MonthlyExpense[],
  miscExpenses: MiscExpense[],
): MonthlySummary {
  const rollover       = month?.rollover_amount ?? 0
  const totalIncome    = income.reduce((s, r) => s + r.amount, 0) + rollover
  const totalBills     = bills.reduce((s, r) => s + r.amount, 0)
  // Only count monthly_expenses that have been logged (amount is not null)
  const totalMonthly   = monthlyExpenses.reduce((s, r) => s + (r.amount ?? 0), 0)
  const totalMisc      = miscExpenses.reduce((s, r) => s + r.amount, 0)
  const totalExpenses  = totalBills + totalMonthly + totalMisc
  const savings        = totalIncome - totalExpenses
  const savingsRate    = totalIncome > 0 ? savings / totalIncome : 0
  const pendingBills   = bills.filter(b => b.is_variable && !b.is_updated).length

  return { totalIncome, totalBills, totalMonthlyExpenses: totalMonthly, totalMisc, totalExpenses, savings, savingsRate, pendingBills }
}

export function useMonthData(monthId: string | null): MonthData & {
  updateIncome:         (id: string, amount: number) => Promise<void>
  updateBill:           (id: string, amount: number) => Promise<void>
  logExpense:           (id: string, amount: number) => Promise<void>
  clearExpense:         (id: string) => Promise<void>
  addMiscExpense:       (name: string, amount: number) => Promise<void>
  deleteMiscExpense:    (id: string) => Promise<void>
  addMonthlyExpense:    (name: string) => Promise<void>
} {
  const [month,           setMonth]           = useState<Month | null>(null)
  const [income,          setIncome]          = useState<MonthlyIncome[]>([])
  const [bills,           setBills]           = useState<MonthlyBill[]>([])
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpense[]>([])
  const [miscExpenses,    setMiscExpenses]    = useState<MiscExpense[]>([])
  const [loading,         setLoading]         = useState(false)

  const fetch = useCallback(async () => {
    if (!monthId) return
    setLoading(true)
    const sb = getSupabase()
    const [mRes, iRes, bRes, eRes, mxRes] = await Promise.all([
      sb.from('months').select('*').eq('id', monthId).single(),
      sb.from('monthly_income').select('*').eq('month_id', monthId).order('sort_order'),
      sb.from('monthly_bills').select('*').eq('month_id', monthId).order('sort_order'),
      sb.from('monthly_expenses').select('*').eq('month_id', monthId).order('sort_order'),
      sb.from('misc_expenses').select('*').eq('month_id', monthId).order('created_at'),
    ])
    setMonth(mRes.data)
    setIncome(iRes.data ?? [])
    setBills(bRes.data ?? [])
    setMonthlyExpenses(eRes.data ?? [])
    setMiscExpenses(mxRes.data ?? [])
    setLoading(false)
  }, [monthId])

  // ── Mutations ───────────────────────────────────────────────

  async function updateIncome(id: string, amount: number) {
    await getSupabase().from('monthly_income').update({ amount }).eq('id', id)
    await fetch()
  }

  async function updateBill(id: string, amount: number) {
    // Flip is_updated to true — removes the "pending" warning badge
    await getSupabase().from('monthly_bills').update({ amount, is_updated: true }).eq('id', id)
    await fetch()
  }

  async function logExpense(id: string, amount: number) {
    await getSupabase()
      .from('monthly_expenses')
      .update({ amount, logged_at: new Date().toISOString() })
      .eq('id', id)
    await fetch()
  }

  async function clearExpense(id: string) {
    // Reset to null — marks as "not logged this month"
    await getSupabase()
      .from('monthly_expenses')
      .update({ amount: null, logged_at: null })
      .eq('id', id)
    await fetch()
  }

  async function addMiscExpense(name: string, amount: number) {
    if (!monthId) return
    await getSupabase().from('misc_expenses').insert({ month_id: monthId, name, amount })
    await fetch()
  }

  async function deleteMiscExpense(id: string) {
    await getSupabase().from('misc_expenses').delete().eq('id', id)
    await fetch()
  }

  // Add a one-off monthly expense row for this month only (not a template)
  async function addMonthlyExpense(name: string) {
    if (!monthId) return
    const maxOrder = monthlyExpenses.reduce((m, e) => Math.max(m, e.sort_order), 0)
    await getSupabase().from('monthly_expenses').insert({
      month_id:    monthId,
      template_id: null,   // no template — this month only
      name,
      amount:      null,
      logged_at:   null,
      sort_order:  maxOrder + 1,
    })
    await fetch()
  }

  useEffect(() => { fetch() }, [fetch])

  const summary = computeSummary(month, income, bills, monthlyExpenses, miscExpenses)

  return {
    month, income, bills, monthlyExpenses, miscExpenses, summary, loading,
    updateIncome, updateBill, logExpense, clearExpense,
    addMiscExpense, deleteMiscExpense, addMonthlyExpense,
  }
}