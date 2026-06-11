'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Settings, LogOut, BarChart2, LayoutDashboard, Sun, Moon, AlertTriangle } from 'lucide-react'
import gsap from 'gsap'
import { useAuth } from '@/hooks/UserAuth'
import { useMonths } from '@/hooks/UseMonths'
import { useMonthData } from '@/hooks/useMonthData'
import { useTheme } from '@/components/ThemeProvider'
import { getCurrentYearMonth } from '@/lib/utils'

import { SummaryBar }              from '@/components/dashboard/SummaryBar'
import { MonthNav }                from '@/components/dashboard/MonthNav'
import { IncomeSection }           from '@/components/dashboard/IncomeSection'
import { BillsSection }            from '@/components/dashboard/BillsSection'
import { MonthlyExpensesSection }  from '@/components/dashboard/MonthlyExpensesSection'
import { MiscExpensesSection }     from '@/components/dashboard/MiscExpensesSection'
import { CreateMonthModal }        from '@/components/dashboard/CreateMonthModal'
import { SettingsPanel }           from '@/components/dashboard/SettingsPanel'
import { SummaryTab }              from '@/components/dashboard/SummaryTab'
import type { IncomeOverride }     from '@/hooks/UseMonths'

type Tab = 'overview' | 'summary' | 'setup'
const TAB_ORDER: Tab[] = ['overview', 'summary', 'setup']

export default function DashboardPage() {
  const { session, signOut }                            = useAuth()
  const { theme, toggle: toggleTheme }                  = useTheme()
  const { months, loading: monthsLoading, createMonth, resolveActiveMonth } = useMonths()

  const [activeMonthId, setActiveMonthId] = useState<string | null>(null)
  const [createOpen,    setCreateOpen]    = useState(false)
  const [tab,           setTab]           = useState<Tab>('overview')
  const [prevTab,       setPrevTab]       = useState<Tab>('overview')

  const contentRef = useRef<HTMLDivElement>(null)

  const {
    month, income, bills, monthlyExpenses, miscExpenses, summary, loading: dataLoading,
    updateIncome, updateBill, logExpense, clearExpense,
    addMiscExpense, deleteMiscExpense, addMonthlyExpense,
  } = useMonthData(activeMonthId)

  /* ── Resolve active month on load ─────────────── */
  useEffect(() => {
    if (months.length > 0 && !activeMonthId) {
      setActiveMonthId(resolveActiveMonth(months))
    }
  }, [months, activeMonthId, resolveActiveMonth])

  /* ── GSAP: stagger cards on mount ─────────────── */
  useEffect(() => {
    if (monthsLoading) return
    const ctx = gsap.context(() => {
      gsap.from('.dash-card', {
        y: 18, opacity: 0, duration: 0.4,
        stagger: 0.07, ease: 'power2.out', delay: 0.05,
      })
    })
    return () => ctx.revert()
  }, [monthsLoading])

  /* ── GSAP: tab slide transition ───────────────── */
  const switchTab = useCallback((next: Tab) => {
    if (next === tab) return
    const fromIdx = TAB_ORDER.indexOf(tab)
    const toIdx   = TAB_ORDER.indexOf(next)
    const dir     = toIdx > fromIdx ? 1 : -1   // 1 = slide left, -1 = slide right

    setPrevTab(tab)

    if (!contentRef.current) { setTab(next); return }

    gsap.to(contentRef.current, {
      x: dir * -28,
      opacity: 0,
      duration: 0.16,
      ease: 'power2.in',
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

  /* ── Create month handler ─────────────────────── */
  async function handleCreateMonth(year: number, month: number, overrides: IncomeOverride[]) {
    const newMonth = await createMonth(year, month, overrides)
    if (newMonth) setActiveMonthId(newMonth.id)
  }

  if (!session) return null

  const { year: cy, month: cm } = getCurrentYearMonth()
  const currentMonthMissing = !monthsLoading && months.length > 0
    && !months.some(m => m.year === cy && m.month === cm)

  const isLoading = monthsLoading || dataLoading

  const tabConfig = [
    { id: 'overview' as Tab, label: 'Overview',  Icon: LayoutDashboard },
    { id: 'summary'  as Tab, label: 'Summary',   Icon: BarChart2        },
    { id: 'setup'    as Tab, label: 'Setup',      Icon: Settings         },
  ]

  return (
    <div className="min-h-screen bg-bg">
      {/* Subtle grid */}
      <div className="fixed inset-0 pointer-events-none auth-grid opacity-20" />

      {/* ── Topbar ──────────────────────────────────────────────── */}
      <header className="relative z-40 border-b border-border bg-bg-raised/90 backdrop-blur-md sticky top-0">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Left: logo + month nav */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div
                className="w-7 h-7 border border-brand/30 flex items-center justify-center text-sm relative"
                style={{ background: 'oklch(from var(--brand) l c h / 0.1)' }}
              >
                🏠
                <span className="absolute -top-px -left-px w-1.5 h-1.5 border-t border-l border-brand/50" />
                <span className="absolute -top-px -right-px w-1.5 h-1.5 border-t border-r border-brand/50" />
                <span className="absolute -bottom-px -left-px w-1.5 h-1.5 border-b border-l border-brand/50" />
                <span className="absolute -bottom-px -right-px w-1.5 h-1.5 border-b border-r border-brand/50" />
              </div>
              <span className="text-[0.75rem] font-bold text-text tracking-[0.1em] uppercase hidden sm:block">
                Mikay Pay Later
              </span>
            </div>

            {/* Month nav — only on overview tab */}
            {tab === 'overview' && months.length > 0 && (
              <MonthNav
                months={months}
                activeMonthId={activeMonthId}
                onSelect={setActiveMonthId}
                onCreateMonth={() => setCreateOpen(true)}
              />
            )}
          </div>

          {/* Right: tabs + theme toggle + sign out */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Tab switcher */}
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

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 flex items-center justify-center text-text-faint hover:text-text hover:bg-bg-overlay transition-colors border border-transparent hover:border-border"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark'
                ? <Sun  className="w-3.5 h-3.5" />
                : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* Sign out */}
            <button
              onClick={signOut}
              className="w-8 h-8 flex items-center justify-center text-text-faint hover:text-expense hover:bg-expense-dim transition-colors border border-transparent hover:border-expense/25"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────────────── */}
      <main className="relative max-w-5xl mx-auto px-4 py-6 overflow-hidden">
        <div ref={contentRef}>

          {/* ══════════════════════════════════════════
              OVERVIEW TAB
              ══════════════════════════════════════════ */}
          {tab === 'overview' && (
            <>
              {/* No months state */}
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
                      Start by going to{' '}
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

              {/* Current month missing banner */}
              {currentMonthMissing && (
                <div className="dash-card mb-4 flex items-center justify-between gap-3 bg-[oklch(from_var(--brand)_l_c_h_/_0.06)] border border-brand/20 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-brand flex-shrink-0" />
                    <p className="text-sm text-text">
                      No budget created for this month yet.
                    </p>
                  </div>
                  <button
                    onClick={() => setCreateOpen(true)}
                    className="flex-shrink-0 h-8 px-4 bg-brand text-white text-[0.72rem] font-bold uppercase tracking-widest hover:opacity-90 transition-all"
                  >
                    Start
                  </button>
                </div>
              )}

              {/* Dashboard content */}
              {months.length > 0 && activeMonthId && (
                <div className="space-y-4">

                  {/* Summary bar */}
                  <div className="dash-card">
                    <SummaryBar summary={summary} loading={isLoading} />
                  </div>

                  {/* Pending variable bills banner */}
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

                  {/* 2-column grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div className="dash-card">
                        <IncomeSection month={month} income={income} onUpdate={updateIncome} />
                      </div>
                      <div className="dash-card">
                        <BillsSection bills={bills} onUpdate={updateBill} />
                      </div>
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

          {/* ══════════════════════════════════════════
              SUMMARY TAB
              ══════════════════════════════════════════ */}
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

          {/* ══════════════════════════════════════════
              SETUP TAB
              ══════════════════════════════════════════ */}
          {tab === 'setup' && (
            <div>
              <div className="mb-5">
                <h2 className="text-[0.75rem] font-bold text-text uppercase tracking-[0.15em]">Setup</h2>
                <p className="text-[0.78rem] text-text-muted mt-1">
                  Manage income sources, bill templates, and expense templates.
                  Changes apply to new months only — past months are never affected.
                </p>
              </div>
              <SettingsPanel />
            </div>
          )}

        </div>
      </main>

      <CreateMonthModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreateMonth}
        existing={months.map(m => ({ year: m.year, month: m.month }))}
      />
    </div>
  )
}
