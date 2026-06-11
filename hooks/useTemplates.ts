'use client'
import { useEffect, useState, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import type { IncomeSource, BillTemplate, MonthlyExpenseTemplate } from '@/types/types'

export function useTemplates() {
  const [incomeSources,  setIncomeSources]  = useState<IncomeSource[]>([])
  const [billTemplates,  setBillTemplates]  = useState<BillTemplate[]>([])
  const [expTemplates,   setExpTemplates]   = useState<MonthlyExpenseTemplate[]>([])
  const [loading,        setLoading]        = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const sb = getSupabase()
    const [iRes, bRes, eRes] = await Promise.all([
      sb.from('income_sources').select('*').order('sort_order'),
      sb.from('bill_templates').select('*').order('sort_order'),
      sb.from('monthly_expense_templates').select('*').order('sort_order'),
    ])
    setIncomeSources(iRes.data ?? [])
    setBillTemplates(bRes.data ?? [])
    setExpTemplates(eRes.data ?? [])
    setLoading(false)
  }, [])

  // ── Income Sources ──────────────────────────────────────────
  async function addIncomeSource(name: string, default_amount: number) {
    const maxOrder = incomeSources.reduce((m, s) => Math.max(m, s.sort_order), 0)
    await getSupabase().from('income_sources').insert({ name, default_amount, is_active: true, sort_order: maxOrder + 1 })
    await fetch()
  }
  async function updateIncomeSource(id: string, data: Partial<Pick<IncomeSource, 'name' | 'default_amount' | 'is_active'>>) {
    await getSupabase().from('income_sources').update(data).eq('id', id)
    await fetch()
  }
  async function deleteIncomeSource(id: string) {
    await getSupabase().from('income_sources').delete().eq('id', id)
    await fetch()
  }

  // ── Bill Templates ──────────────────────────────────────────
  async function addBillTemplate(name: string, default_amount: number, is_variable: boolean) {
    const maxOrder = billTemplates.reduce((m, b) => Math.max(m, b.sort_order), 0)
    await getSupabase().from('bill_templates').insert({ name, default_amount, is_variable, is_active: true, sort_order: maxOrder + 1 })
    await fetch()
  }
  async function updateBillTemplate(id: string, data: Partial<Pick<BillTemplate, 'name' | 'default_amount' | 'is_variable' | 'is_active'>>) {
    await getSupabase().from('bill_templates').update(data).eq('id', id)
    await fetch()
  }
  async function deleteBillTemplate(id: string) {
    await getSupabase().from('bill_templates').delete().eq('id', id)
    await fetch()
  }

  // ── Monthly Expense Templates ───────────────────────────────
  async function addExpTemplate(name: string) {
    const maxOrder = expTemplates.reduce((m, t) => Math.max(m, t.sort_order), 0)
    await getSupabase().from('monthly_expense_templates').insert({ name, is_active: true, sort_order: maxOrder + 1 })
    await fetch()
  }
  async function updateExpTemplate(id: string, data: Partial<Pick<MonthlyExpenseTemplate, 'name' | 'is_active'>>) {
    await getSupabase().from('monthly_expense_templates').update(data).eq('id', id)
    await fetch()
  }
  async function deleteExpTemplate(id: string) {
    await getSupabase().from('monthly_expense_templates').delete().eq('id', id)
    await fetch()
  }

  useEffect(() => { fetch() }, [fetch])

  return {
    incomeSources, billTemplates, expTemplates, loading,
    addIncomeSource, updateIncomeSource, deleteIncomeSource,
    addBillTemplate, updateBillTemplate, deleteBillTemplate,
    addExpTemplate, updateExpTemplate, deleteExpTemplate,
    refetch: fetch,
  }
}