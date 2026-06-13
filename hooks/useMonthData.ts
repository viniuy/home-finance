'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
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
  togglePaid:           (id: string, isPaid: boolean) => Promise<void>
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

  // Track active channel so we can clean it up on monthId change
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabase>['channel']> | null>(null)

  // ── Individual refetch helpers (called by realtime handlers) ──

  const fetchIncome = useCallback(async () => {
    if (!monthId) return
    const { data } = await getSupabase()
      .from('monthly_income').select('*').eq('month_id', monthId).order('sort_order')
    if (data) setIncome(data)
  }, [monthId])

  const fetchBills = useCallback(async () => {
    if (!monthId) return
    const { data } = await getSupabase()
      .from('monthly_bills').select('*').eq('month_id', monthId).order('sort_order')
    if (data) setBills(data)
  }, [monthId])

  const fetchMonthlyExpenses = useCallback(async () => {
    if (!monthId) return
    const { data } = await getSupabase()
      .from('monthly_expenses').select('*').eq('month_id', monthId).order('sort_order')
    if (data) setMonthlyExpenses(data)
  }, [monthId])

  const fetchMiscExpenses = useCallback(async () => {
    if (!monthId) return
    const { data } = await getSupabase()
      .from('misc_expenses').select('*').eq('month_id', monthId).order('created_at')
    if (data) setMiscExpenses(data)
  }, [monthId])

  const fetchMonth = useCallback(async () => {
    if (!monthId) return
    const { data } = await getSupabase()
      .from('months').select('*').eq('id', monthId).single()
    if (data) setMonth(data)
  }, [monthId])

  // ── Full fetch (initial load) ────────────────────────────────

  const fetchAll = useCallback(async () => {
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

  // ── Realtime subscription ────────────────────────────────────

  useEffect(() => {
    if (!monthId) return

    fetchAll()

    // Tear down previous channel before creating a new one
    if (channelRef.current) {
      getSupabase().removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = getSupabase()
      .channel(`month-data-${monthId}`)
      // monthly_income
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'monthly_income', filter: `month_id=eq.${monthId}` },
        () => fetchIncome(),
      )
      // monthly_bills
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'monthly_bills', filter: `month_id=eq.${monthId}` },
        () => fetchBills(),
      )
      // monthly_expenses
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'monthly_expenses', filter: `month_id=eq.${monthId}` },
        () => fetchMonthlyExpenses(),
      )
      // misc_expenses
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'misc_expenses', filter: `month_id=eq.${monthId}` },
        () => fetchMiscExpenses(),
      )
      // months (for rollover_amount changes)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'months', filter: `id=eq.${monthId}` },
        () => fetchMonth(),
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      getSupabase().removeChannel(channel)
      channelRef.current = null
    }
  }, [monthId, fetchAll, fetchIncome, fetchBills, fetchMonthlyExpenses, fetchMiscExpenses, fetchMonth])

  // ── Mutations ────────────────────────────────────────────────
  // No manual re-fetch needed — realtime events handle state updates

  async function updateIncome(id: string, amount: number) {
    await getSupabase().from('monthly_income').update({ amount }).eq('id', id)
  }

  async function updateBill(id: string, amount: number) {
    // Flip is_updated to true — removes the "pending" warning badge
    await getSupabase().from('monthly_bills').update({ amount, is_updated: true }).eq('id', id)
  }

  async function logExpense(id: string, amount: number) {
    await getSupabase()
      .from('monthly_expenses')
      .update({ amount, logged_at: new Date().toISOString() })
      .eq('id', id)
  }

  async function clearExpense(id: string) {
    // Reset to null — marks as "not logged this month"
    await getSupabase()
      .from('monthly_expenses')
      .update({ amount: null, logged_at: null })
      .eq('id', id)
  }

  async function addMiscExpense(name: string, amount: number) {
    if (!monthId) return
    await getSupabase().from('misc_expenses').insert({ month_id: monthId, name, amount })
  }

  async function deleteMiscExpense(id: string) {
    await getSupabase().from('misc_expenses').delete().eq('id', id)
  }

  // Add a one-off monthly expense row for this month only (not a template)
  async function togglePaid(id: string, isPaid: boolean) {
    // Guard: can't pay an unconfirmed variable bill — enforced at DB level too
    const bill = bills.find(b => b.id === id)
    if (!bill || (isPaid && !bill.is_updated)) return
    await getSupabase().from('monthly_bills').update({ is_paid: isPaid }).eq('id', id)
  }

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
  }

  const summary = computeSummary(month, income, bills, monthlyExpenses, miscExpenses)

  return {
    month, income, bills, monthlyExpenses, miscExpenses, summary, loading,
    updateIncome, updateBill, logExpense, clearExpense,
    addMiscExpense, deleteMiscExpense, addMonthlyExpense, togglePaid,
  }
}
