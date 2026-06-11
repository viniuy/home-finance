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

  /* ── Create ──────────────────────────────────── */
  async function createMonth(
    year:            number,
    month:           number,
    incomeOverrides: IncomeOverride[],
  ): Promise<Month | null> {
    const sb = getSupabase()

    const { data: newMonth, error } = await sb
      .from('months')
      .insert({ year, month, label: getMonthLabel(year, month), rollover_amount: 0 })
      .select()
      .single()
    if (error || !newMonth) return null

    const { data: settings } = await sb.from('settings').select('*').single() as { data: Settings | null }

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
        const prevIncome = (incRes.data ?? []).reduce((s : number, r : { amount: number }) => s + r.amount, 0) + prevMonth.rollover_amount
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

    const { data: bills } = await sb
      .from('bill_templates').select('*').eq('is_active', true).order('sort_order')
    if (bills && bills.length > 0) {
      await sb.from('monthly_bills').insert(
        bills.map((b : { id: string, name: string, default_amount: number, is_variable: boolean, sort_order: number }) => ({
          month_id:    newMonth.id,
          template_id: b.id,
          name:        b.name,
          amount:      b.default_amount,
          is_variable: b.is_variable,
          is_updated:  !b.is_variable,
          sort_order:  b.sort_order,
        }))
      )
    }

    const { data: expTemplates } = await sb
      .from('monthly_expense_templates').select('*').eq('is_active', true).order('sort_order')
    if (expTemplates && expTemplates.length > 0) {
      await sb.from('monthly_expenses').insert(
        expTemplates.map((t : { id: string, name: string, default_amount: number, is_variable: boolean, sort_order: number }) => ({
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

  /* ── Reset ───────────────────────────────────── */
  /**
   * plain reset    → clear all amounts but keep the same rows
   * withNewTemplate→ plain reset + re-sync rows from current active templates
   *                  (adds missing, removes rows whose template is now inactive)
   */
  async function resetMonth(monthId: string, withNewTemplate: boolean): Promise<void> {
    const sb = getSupabase()

    await Promise.all([
      // Clear misc entirely
      sb.from('misc_expenses').delete().eq('month_id', monthId),
      // Clear logged expense amounts
      sb.from('monthly_expenses')
        .update({ amount: null, logged_at: null })
        .eq('month_id', monthId),
      // Reset variable bills back to 0 and mark not-updated
      sb.from('monthly_bills')
        .update({ amount: 0, is_updated: false })
        .eq('month_id', monthId)
        .eq('is_variable', true),
    ])

    if (withNewTemplate) {
      // ── Re-sync bills ──────────────────────────────
      const [{ data: currentBills }, { data: activeTemplates }] = await Promise.all([
        sb.from('monthly_bills').select('*').eq('month_id', monthId),
        sb.from('bill_templates').select('*').eq('is_active', true).order('sort_order'),
      ])

      const existingTemplateIds = new Set((currentBills ?? []).map((b: any) => b.template_id))
      const activeTemplateIds   = new Set((activeTemplates ?? []).map((t: any) => t.id))

      // Add bills for newly active templates
      const toAddBills = (activeTemplates ?? []).filter((t: any) => !existingTemplateIds.has(t.id))
      if (toAddBills.length > 0) {
        await sb.from('monthly_bills').insert(
          toAddBills.map((t: any) => ({
            month_id:    monthId,
            template_id: t.id,
            name:        t.name,
            amount:      t.default_amount,
            is_variable: t.is_variable,
            is_updated:  !t.is_variable,
            sort_order:  t.sort_order,
          }))
        )
      }

      // Remove bills whose template is no longer active
      const toRemoveBills = (currentBills ?? []).filter((b: any) =>
        b.template_id && !activeTemplateIds.has(b.template_id)
      )
      for (const b of toRemoveBills) {
        await sb.from('monthly_bills').delete().eq('id', b.id)
      }

      // ── Re-sync expense templates ──────────────────
      const [{ data: currentExps }, { data: activeExpTemplates }] = await Promise.all([
        sb.from('monthly_expenses').select('*').eq('month_id', monthId),
        sb.from('monthly_expense_templates').select('*').eq('is_active', true).order('sort_order'),
      ])

      const existingExpTemplateIds = new Set((currentExps ?? []).map((e: any) => e.template_id))
      const activeExpTemplateIds   = new Set((activeExpTemplates ?? []).map((t: any) => t.id))

      const toAddExps = (activeExpTemplates ?? []).filter((t: any) => !existingExpTemplateIds.has(t.id))
      if (toAddExps.length > 0) {
        await sb.from('monthly_expenses').insert(
          toAddExps.map((t: any) => ({
            month_id:    monthId,
            template_id: t.id,
            name:        t.name,
            amount:      null,
            logged_at:   null,
            sort_order:  t.sort_order,
          }))
        )
      }

      // Remove expense rows whose template is now inactive (only template-linked ones)
      const toRemoveExps = (currentExps ?? []).filter((e: any) =>
        e.template_id && !activeExpTemplateIds.has(e.template_id)
      )
      for (const e of toRemoveExps) {
        await sb.from('monthly_expenses').delete().eq('id', e.id)
      }
    }
  }

  /* ── Delete ──────────────────────────────────── */
  async function deleteMonth(monthId: string): Promise<void> {
    const sb = getSupabase()

    // Delete child records first (no ON DELETE CASCADE in schema)
    await Promise.all([
      sb.from('monthly_income')  .delete().eq('month_id', monthId),
      sb.from('monthly_bills')   .delete().eq('month_id', monthId),
      sb.from('monthly_expenses').delete().eq('month_id', monthId),
      sb.from('misc_expenses')   .delete().eq('month_id', monthId),
    ])

    await sb.from('months').delete().eq('id', monthId)
    await fetchMonths()
  }

  useEffect(() => { fetchMonths() }, [fetchMonths])

  return {
    months, loading,
    createMonth, resetMonth, deleteMonth,
    resolveActiveMonth,
    refetch: fetchMonths,
  }
}
