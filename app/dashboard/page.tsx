'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Settings, LogOut, BarChart2, LayoutDashboard, Sun, Moon, AlertTriangle, Menu, ChevronLeft, ChevronRight } from 'lucide-react'
import gsap from 'gsap'
import { useAuth }          from '@/hooks/UserAuth'
import { useMonths }        from '@/hooks/UseMonths'
import { useMonthData }     from '@/hooks/useMonthData'
import { ThemePicker }      from '@/components/ThemeProvider'
import { Calculator }       from '@/components/dashboard/Calculator'
import { RealtimeIndicator } from '@/components/dashboard/RealtimeIndicator'
import { MobileSidebar }    from '@/components/dashboard/MobileSidebar'
import { BottomNav }        from '@/components/dashboard/BottomNav'
import type { MobileSection } from '@/components/dashboard/BottomNav'
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

export type Tab = 'overview' | 'summary' | 'setup'
const TAB_ORDER: Tab[] = ['overview', 'summary', 'setup']

export default function DashboardPage() {
  const { session, signOut } = useAuth()

  const {
    months, loading: monthsLoading,
    createMonth, resetMonth, deleteMonth,
    resolveActiveMonth,
  } = useMonths()

  const [activeMonthId,  setActiveMonthId]  = useState<string | null>(null)
  const [createOpen,     setCreateOpen]     = useState(false)
  const [resetOpen,      setResetOpen]      = useState(false)
  const [deleteOpen,     setDeleteOpen]     = useState(false)
  const [tab,            setTab]            = useState<Tab>('overview')
  const [sidebarOpen,    setSidebarOpen]    = useState(false)
  const [mobileSection,  setMobileSection]  = useState<MobileSection>('income')

  const contentRef = useRef<HTMLDivElement>(null)

  const {
    month, income, bills, monthlyExpenses, miscExpenses, summary, loading: dataLoading,
    updateIncome, updateBill, togglePaid, logExpense, clearExpense,
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

  /* ── Month helpers ────────────────────────────── */
  async function handleCreateMonth(year: number, month: number, overrides: IncomeOverride[]) {
    const newMonth = await createMonth(year, month, overrides)
    if (newMonth) setActiveMonthId(newMonth.id)
  }

  async function handleResetMonth(withNewTemplate: boolean) {
    if (!activeMonthId) return
    await resetMonth(activeMonthId, withNewTemplate)
    setActiveMonthId(null)
    setTimeout(() => setActiveMonthId(activeMonthId), 0)
  }

  async function handleDeleteMonth() {
    if (!activeMonthId) return
    await deleteMonth(activeMonthId)
    const remaining = months.filter(m => m.id !== activeMonthId)
    setActiveMonthId(remaining.length > 0 ? remaining[0].id : null)
  }

  if (!session) return null

  const activeMonth = months.find(m => m.id === activeMonthId) ?? null
  const { year: cy, month: cm } = getCurrentYearMonth()
  const currentMonthMissing = !monthsLoading && months.length > 0
    && !months.some(m => m.year === cy && m.month === cm)
  const isLoading = monthsLoading || dataLoading

  const tabConfig = [
    { id: 'overview' as Tab, label: 'Overview',  Icon: LayoutDashboard },
    { id: 'summary'  as Tab, label: 'Summary',   Icon: BarChart2       },
    { id: 'setup'    as Tab, label: 'Setup',      Icon: Settings        },
  ]

  // Month index helpers for mobile stepper
  const idx = months.findIndex(m => m.id === activeMonthId)

  return (
    <div className="min-h-screen bg-bg">
      <div className="fixed inset-0 pointer-events-none auth-grid opacity-20" />

      {/* ── Mobile Sidebar ──────────────────────────────────────── */}
      <MobileSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        tab={tab}
        onTab={switchTab}
        onSignOut={signOut}
      />

      {/* ── Topbar ──────────────────────────────────────────────── */}
      <header className="relative z-40 border-b border-border bg-bg-raised/90 backdrop-blur-md sticky top-0">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* ── Mobile topbar ─────────────────────────────────── */}
          <div className="flex items-center gap-3 lg:hidden min-w-0">
            {/* Hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-8 h-8 flex items-center justify-center text-text-faint hover:text-text hover:bg-bg-overlay border border-transparent hover:border-border transition-colors flex-shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Logo + month label */}
            <div className="flex items-center gap-2 min-w-0">
              <img src="/icons/icon-192.png" alt="MPL" className="w-6 h-6 flex-shrink-0" />
              {activeMonth && (
                <span className="text-[0.72rem] font-mono font-semibold text-text truncate">
                  {activeMonth.label}
                </span>
              )}
            </div>
          </div>

          {/* Mobile: compact month stepper (right side) */}
          {tab === 'overview' && months.length > 0 && (
            <div className="flex items-center gap-1 lg:hidden flex-shrink-0">
              <button
                onClick={() => idx < months.length - 1 && setActiveMonthId(months[idx + 1].id)}
                disabled={idx >= months.length - 1}
                className="w-8 h-8 flex items-center justify-center border border-border text-text-faint hover:text-text hover:bg-bg-raised disabled:opacity-20 transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => idx > 0 && setActiveMonthId(months[idx - 1].id)}
                disabled={idx <= 0}
                className="w-8 h-8 flex items-center justify-center border border-border text-text-faint hover:text-text hover:bg-bg-raised disabled:opacity-20 transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCreateOpen(true)}
                className="w-8 h-8 flex items-center justify-center border border-border text-text-faint hover:text-text hover:bg-bg-overlay transition-colors text-xs font-bold"
                aria-label="Month actions"
              >
                ⋯
              </button>
            </div>
          )}

          {/* ── Desktop topbar ────────────────────────────────── */}
          {/* Left: logo + month nav */}
          <div className="hidden lg:flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <img src="/icons/icon-192.png" alt="MPL" className="w-7 h-7 flex-shrink-0" />
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

          {/* Right: tabs + realtime + theme + sign out (desktop only) */}
          <div className="hidden lg:flex items-center gap-0.5 flex-shrink-0">
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
                {label}
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

          {/* Mobile: realtime dot only (far right, overview only) */}
          <div className="flex lg:hidden items-center flex-shrink-0">
            <RealtimeIndicator mobileOnly />
          </div>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────── */}
      <main className={`relative max-w-5xl mx-auto px-4 py-6 overflow-hidden ${tab === 'overview' ? 'pb-bottom-nav lg:pb-6' : ''}`}>
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
                  {/* SummaryBar — always visible on both layouts */}
                  <div className="dash-card">
                    <SummaryBar summary={summary} loading={isLoading} activeSection={mobileSection} />
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

                  {/* ── Desktop: 2-col grid (unchanged) ──────────── */}
                  <div className="hidden lg:grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div className="dash-card"><IncomeSection month={month} income={income} onUpdate={updateIncome} /></div>
                      <div className="dash-card"><BillsSection bills={bills} onUpdate={updateBill} onTogglePaid={togglePaid} /></div>
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

                  {/* ── Mobile: single active section ─────────────── */}
                  <div className="lg:hidden">
                    {mobileSection === 'income' && (
                      <div className="dash-card">
                        <IncomeSection month={month} income={income} onUpdate={updateIncome} />
                      </div>
                    )}
                    {mobileSection === 'bills' && (
                      <div className="dash-card">
                        <BillsSection bills={bills} onUpdate={updateBill} onTogglePaid={togglePaid} />
                      </div>
                    )}
                    {mobileSection === 'expenses' && (
                      <div className="dash-card">
                        <MonthlyExpensesSection
                          expenses={monthlyExpenses}
                          onLog={logExpense}
                          onClear={clearExpense}
                          onAddOneOff={addMonthlyExpense}
                        />
                      </div>
                    )}
                    {mobileSection === 'misc' && (
                      <div className="dash-card">
                        <MiscExpensesSection
                          expenses={miscExpenses}
                          onAdd={addMiscExpense}
                          onDelete={deleteMiscExpense}
                        />
                      </div>
                    )}
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

      {/* ── Bottom nav (mobile, overview only) ──────────────────── */}
      {tab === 'overview' && months.length > 0 && activeMonthId && (
        <BottomNav active={mobileSection} onChange={setMobileSection} />
      )}

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
