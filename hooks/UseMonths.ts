'use client'
import { useEffect, useState, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { getMonthLabel, getCurrentYearMonth } from '@/lib/utils'
import type { Month, Settings } from '@/types/types'

export interface IncomeOverride {
  source_id:  string
  name:       string
  amount:     number
  sort_order: number
}

export function useMonths() {
  const [months,  setMonths]  = useState<Month[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMonths = useCallback(async () => {
    const { data } = await getSupabase()
      .from('months')
      .select('*')
      .order('year',  { ascending: false })
      .order('month', { ascending: false })
    setMonths(data ?? [])
    setLoading(false)
  }, [])

  function resolveActiveMonth(list: Month[]): string | null {
    if (list.length === 0) return null
    const { year, month } = getCurrentYearMonth()
    const current = list.find(m => m.year === year && m.month === month)
    return current ? current.id : list[0].id
  }

  async function createMonth(
    year:    number,
    month:   number,
    incomeOverrides: IncomeOverride[],   // user-confirmed amounts for each source
  ): Promise<Month | null> {
    const sb = getSupabase()

    // 1. Create the month row
    const { data: newMonth, error } = await sb
      .from('months')
      .insert({ year, month, label: getMonthLabel(year, month), rollover_amount: 0 })
      .select()
      .single()
    if (error || !newMonth) return null

    // 2. Fetch settings (for rollover)
    const { data: settings } = await sb.from('settings').select('*').single() as { data: Settings | null }

    // 3. Rollover: if enabled, carry forward previous month savings
    if (settings?.rollover_savings) {
      const prevMonth = months.find(m =>
        m.year < year || (m.year === year && m.month < month)
      )
      if (prevMonth) {
        const [incRes, billRes, expRes, miscRes] = await Promise.all([
          sb.from('monthly_income')  .select('amount').eq('month_id', prevMonth.id),
          sb.from('monthly_bills')   .select('amount').eq('month_id', prevMonth.id),
          sb.from('monthly_expenses').select('amount').eq('month_id', prevMonth.id).not('amount', 'is', null),
          sb.from('misc_expenses')   .select('amount').eq('month_id', prevMonth.id),
        ])
        const prevIncome = (incRes.data ?? []).reduce((s, r) => s + r.amount, 0) + prevMonth.rollover_amount
        const prevSpend  = [
          ...(billRes.data ?? []),
          ...(expRes.data  ?? []),
          ...(miscRes.data ?? []),
        ].reduce((s, r) => s + (r.amount ?? 0), 0)
        const prevSavings = prevIncome - prevSpend
        if (prevSavings > 0) {
          await sb.from('months').update({ rollover_amount: prevSavings }).eq('id', newMonth.id)
          newMonth.rollover_amount = prevSavings
        }
      }
    }

    // 4. Seed monthly_income using the user-confirmed overrides
    if (incomeOverrides.length > 0) {
      await sb.from('monthly_income').insert(
        incomeOverrides.map(o => ({
          month_id:   newMonth.id,
          source_id:  o.source_id,
          name:       o.name,
          amount:     o.amount,
          sort_order: o.sort_order,
        }))
      )
    }

    // 5. Seed monthly_bills from bill_templates
    const { data: bills } = await sb
      .from('bill_templates').select('*').eq('is_active', true).order('sort_order')
    if (bills && bills.length > 0) {
      await sb.from('monthly_bills').insert(
        bills.map(b => ({
          month_id:    newMonth.id,
          template_id: b.id,
          name:        b.name,
          amount:      b.default_amount,  // 0 for variable bills
          is_variable: b.is_variable,
          is_updated:  !b.is_variable,    // fixed bills start as "updated"
          sort_order:  b.sort_order,
        }))
      )
    }

    // 6. Seed monthly_expenses from templates (amount = null until logged)
    const { data: expTemplates } = await sb
      .from('monthly_expense_templates').select('*').eq('is_active', true).order('sort_order')
    if (expTemplates && expTemplates.length > 0) {
      await sb.from('monthly_expenses').insert(
        expTemplates.map(t => ({
          month_id:    newMonth.id,
          template_id: t.id,
          name:        t.name,
          amount:      null,
          logged_at:   null,
          sort_order:  t.sort_order,
        }))
      )
    }

    await fetchMonths()
    return newMonth
  }

  useEffect(() => { fetchMonths() }, [fetchMonths])

  return { months, loading, createMonth, resolveActiveMonth, refetch: fetchMonths }
}
