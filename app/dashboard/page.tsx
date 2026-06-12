'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Settings, LogOut, BarChart2, LayoutDashboard, Sun, Moon, AlertTriangle } from 'lucide-react'
import gsap from 'gsap'
import { useAuth } from '@/hooks/UserAuth'
import { useMonths } from '@/hooks/UseMonths'
import { useMonthData } from '@/hooks/useMonthData'
import { ThemePicker } from '@/components/ThemeProvider'
import { Calculator }          from '@/components/dashboard/Calculator'
import { RealtimeIndicator }  from '@/components/dashboard/RealtimeIndicator'
import { getCurrentYearMonth } from '@/lib/utils'
import { SummaryBar }             from '@/components/dashboard/SummaryBar'
import { MonthNav }               from '@/components/dashboard/MonthNav'
import { IncomeSection }          from '@/components/dashboard/IncomeSection'
import { BillsSection }           from '@/components/dashboard/BillsSection'
import { MonthlyExpensesSection } from '@/components/dashboard/MonthlyExpensesSection'
import { MiscExpensesSection }    from '@/components/dashboard/MiscExpensesSection'
import { CreateMonthModal }       from '@/components/dashboard/CreateMonthModal'
import { ResetMonthModal }        from '@/components/dashboard/ResetMonthModal'
import { DeleteMonthModal }       from '@/components/dashboard/DeleteMonthModal'
import { SettingsPanel }          from '@/components/dashboard/SettingsPanel'
import { SummaryTab }             from '@/components/dashboard/SummaryTab'
import type { IncomeOverride }    from '@/hooks/UseMonths'

type Tab = 'overview' | 'summary' | 'setup'
const TAB_ORDER: Tab[] = ['overview', 'summary', 'setup']

export default function DashboardPage() {
  const { session, signOut }                            = useAuth()

  const {
    months, loading: monthsLoading,
    createMonth, resetMonth, deleteMonth,
    resolveActiveMonth,
  } = useMonths()

  const [activeMonthId, setActiveMonthId] = useState<string | null>(null)
  const [createOpen,    setCreateOpen]    = useState(false)
  const [resetOpen,     setResetOpen]     = useState(false)
  const [deleteOpen,    setDeleteOpen]    = useState(false)
  const [tab,           setTab]           = useState<Tab>('overview')

  const contentRef = useRef<HTMLDivElement>(null)

  const {
    month, income, bills, monthlyExpenses, miscExpenses, summary, loading: dataLoading,
    updateIncome, updateBill, logExpense, clearExpense,
    addMiscExpense, deleteMiscExpense, addMonthlyExpense,
  } = useMonthData(activeMonthId)

  /* ── Resolve active month ─────────────────────── */
  useEffect(() => {
    if (months.length > 0 && !activeMonthId) {
      setActiveMonthId(resolveActiveMonth(months))
    }
  }, [months, activeMonthId, resolveActiveMonth])

  /* ── GSAP: stagger on mount ───────────────────── */
  useEffect(() => {
    if (monthsLoading || !activeMonthId) return
    const cards = document.querySelectorAll('.dash-card')
    if (!cards.length) return
    const ctx = gsap.context(() => {
      gsap.from('.dash-card', {
        y: 18, opacity: 0, duration: 0.4,
        stagger: 0.07, ease: 'power2.out', delay: 0.05,
      })
    })
    return () => ctx.revert()
  }, [monthsLoading, activeMonthId])

  /* ── GSAP: tab slide transition ───────────────── */
  const switchTab = useCallback((next: Tab) => {
    if (next === tab) return
    const dir = TAB_ORDER.indexOf(next) > TAB_ORDER.indexOf(tab) ? 1 : -1

    if (!contentRef.current) { setTab(next); return }

    gsap.to(contentRef.current, {
      x: dir * -28, opacity: 0, duration: 0.16, ease: 'power2.in',
      onComplete: () => {
        setTab(next)
        gsap.fromTo(
          contentRef.current,
          { x: dir * 28, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.22, ease: 'power2.out' }
        )
      },
    })
  }, [tab])

  /* ── Create month ─────────────────────────────── */
  async function handleCreateMonth(year: number, month: number, overrides: IncomeOverride[]) {
    const newMonth = await createMonth(year, month, overrides)
    if (newMonth) setActiveMonthId(newMonth.id)
  }

  /* ── Reset month ──────────────────────────────── */
  async function handleResetMonth(withNewTemplate: boolean) {
    if (!activeMonthId) return
    await resetMonth(activeMonthId, withNewTemplate)
    setActiveMonthId(null)
    setTimeout(() => setActiveMonthId(activeMonthId), 0)
  }

  /* ── Delete month ─────────────────────────────── */
  async function handleDeleteMonth() {
    if (!activeMonthId) return
    await deleteMonth(activeMonthId)
    // Resolve to next available month after deletion
    const remaining = months.filter(m => m.id !== activeMonthId)
    setActiveMonthId(remaining.length > 0 ? remaining[0].id : null)
  }

  if (!session) return null

  const activeMonth   = months.find(m => m.id === activeMonthId) ?? null
  const { year: cy, month: cm } = getCurrentYearMonth()
  const currentMonthMissing = !monthsLoading && months.length > 0
    && !months.some(m => m.year === cy && m.month === cm)
  const isLoading = monthsLoading || dataLoading

  const tabConfig = [
    { id: 'overview' as Tab, label: 'Overview',  Icon: LayoutDashboard },
    { id: 'summary'  as Tab, label: 'Summary',   Icon: BarChart2       },
    { id: 'setup'    as Tab, label: 'Setup',      Icon: Settings        },
  ]

  return (
    <div className="min-h-screen bg-bg">
      <div className="fixed inset-0 pointer-events-none auth-grid opacity-20" />

      {/* ── Topbar ──────────────────────────────────────────────── */}
      <header className="relative z-40 border-b border-border bg-bg-raised/90 backdrop-blur-md sticky top-0">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Left: logo + month nav */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <img
                src="/icons/icon-192.png"
                alt="Mikay Pay Later"
                className="w-7 h-7 flex-shrink-0"
              />
            </div>
 
            {tab === 'overview' && months.length > 0 && (
              <MonthNav
                months={months}
                activeMonthId={activeMonthId}
                onSelect={setActiveMonthId}
                onCreateMonth={() => setCreateOpen(true)}
                onResetMonth={() => setResetOpen(true)}
                onDeleteMonth={() => setDeleteOpen(true)}
              />
            )}
          </div>

          {/* Right: tabs + theme + sign out */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {tabConfig.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => switchTab(id)}
                className={`
                  px-3 py-1.5 flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-[0.08em] transition-colors
                  ${tab === id
                    ? 'bg-bg-overlay text-text border border-border'
                    : 'text-text-faint hover:text-text hover:bg-bg-overlay/60 border border-transparent'}
                `}
              >
                <Icon className="w-3 h-3" />
                <span className="hidden sm:block">{label}</span>
              </button>
            ))}

            <div className="w-px h-4 bg-border mx-1.5" />

            <RealtimeIndicator />

            <div className="w-px h-4 bg-border mx-1.5" />

            <ThemePicker />

            <button
              onClick={signOut}
              title="Sign out"
              className="w-8 h-8 flex items-center justify-center text-text-faint hover:text-expense hover:bg-expense-dim border border-transparent hover:border-expense/25 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────── */}
      <main className="relative max-w-5xl mx-auto px-4 py-6 overflow-hidden">
        <div ref={contentRef}>

          {/* ── Overview ────────────────────────────────────────── */}
          {tab === 'overview' && (
            <>
              {!monthsLoading && months.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 gap-6">
                  <div
                    className="w-16 h-16 border border-brand/30 flex items-center justify-center text-2xl relative"
                    style={{ background: 'oklch(from var(--brand) l c h / 0.08)' }}
                  >
                    🗓️
                    <span className="absolute -top-px -left-px  w-2 h-2 border-t border-l border-brand/50" />
                    <span className="absolute -top-px -right-px w-2 h-2 border-t border-r border-brand/50" />
                    <span className="absolute -bottom-px -left-px  w-2 h-2 border-b border-l border-brand/50" />
                    <span className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-brand/50" />
                  </div>
                  <div className="text-center max-w-xs">
                    <p className="text-base font-bold text-text uppercase tracking-widest">No months yet</p>
                    <p className="text-sm text-text-muted mt-2 leading-relaxed">
                      Go to{' '}
                      <button onClick={() => switchTab('setup')} className="text-brand underline underline-offset-2">
                        Setup
                      </button>{' '}
                      to configure income and bills, then create your first month.
                    </p>
                  </div>
                  <button
                    onClick={() => setCreateOpen(true)}
                    className="h-10 px-6 bg-brand text-white text-[0.75rem] font-bold uppercase tracking-[0.12em] hover:opacity-90 transition-all"
                  >
                    [ Create First Month ]
                  </button>
                </div>
              )}

              {currentMonthMissing && (
                <div className="dash-card mb-4 flex items-center justify-between gap-3 bg-[oklch(from_var(--brand)_l_c_h_/_0.06)] border border-brand/20 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-brand flex-shrink-0" />
                    <p className="text-sm text-text">No budget created for this month yet.</p>
                  </div>
                  <button
                    onClick={() => setCreateOpen(true)}
                    className="flex-shrink-0 h-8 px-4 bg-brand text-white text-[0.72rem] font-bold uppercase tracking-widest hover:opacity-90 transition-all"
                  >
                    Start
                  </button>
                </div>
              )}

              {months.length > 0 && activeMonthId && (
                <div className="space-y-4">
                  <div className="dash-card">
                    <SummaryBar summary={summary} loading={isLoading} />
                  </div>

                  {summary.pendingBills > 0 && !isLoading && (
                    <div className="dash-card flex items-center gap-2.5 bg-pending-dim border border-pending/25 px-4 py-3">
                      <AlertTriangle className="w-4 h-4 text-pending flex-shrink-0" />
                      <p className="text-sm text-text">
                        <span className="text-pending font-bold">
                          {summary.pendingBills} variable {summary.pendingBills === 1 ? 'bill' : 'bills'}
                        </span>
                        {' '}still need{summary.pendingBills === 1 ? 's' : ''} to be updated this month.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div className="dash-card"><IncomeSection month={month} income={income} onUpdate={updateIncome} /></div>
                      <div className="dash-card"><BillsSection bills={bills} onUpdate={updateBill} /></div>
                    </div>
                    <div className="space-y-4">
                      <div className="dash-card">
                        <MonthlyExpensesSection
                          expenses={monthlyExpenses}
                          onLog={logExpense}
                          onClear={clearExpense}
                          onAddOneOff={addMonthlyExpense}
                        />
                      </div>
                      <div className="dash-card">
                        <MiscExpensesSection
                          expenses={miscExpenses}
                          onAdd={addMiscExpense}
                          onDelete={deleteMiscExpense}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Summary ─────────────────────────────────────────── */}
          {tab === 'summary' && (
            <div>
              <div className="mb-5">
                <h2 className="text-[0.75rem] font-bold text-text uppercase tracking-[0.15em]">Summary</h2>
                <p className="text-[0.78rem] text-text-muted mt-1">
                  All months — savings trend, comparisons, and full breakdown.
                </p>
              </div>
              <SummaryTab />
            </div>
          )}

          {/* ── Setup ───────────────────────────────────────────── */}
          {tab === 'setup' && (
            <div>
              <div className="mb-5">
                <h2 className="text-[0.75rem] font-bold text-text uppercase tracking-[0.15em]">Setup</h2>
                <p className="text-[0.78rem] text-text-muted mt-1">
                  Manage income sources, bill templates, and expense templates.
                  Changes apply to new months only.
                </p>
              </div>
              <SettingsPanel />
            </div>
          )}

        </div>
      </main>

      {/* ── Modals ──────────────────────────────────────────────── */}
      <CreateMonthModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreateMonth}
        existing={months.map(m => ({ year: m.year, month: m.month }))}
      />

      <ResetMonthModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        monthLabel={activeMonth?.label ?? ''}
        onReset={handleResetMonth}
      />

      <DeleteMonthModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        monthLabel={activeMonth?.label ?? ''}
        onDelete={handleDeleteMonth}
      />
      <Calculator />
    </div>
  )
}
