'use client'
import { useRef, useEffect, useState, useId } from 'react'
import gsap from 'gsap'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { ChevronDown, Check } from 'lucide-react'
import { useSummaryData } from '@/hooks/useSummaryData'
import { formatPeso } from '@/lib/utils'
import { Card, CardHeader, CardTitle } from '@/components/ui/Primitives'

/* ── Tooltip ──────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-raised border border-border px-3 py-2.5 shadow-modal text-[0.72rem]">
      <p className="text-text-faint mb-1.5 uppercase tracking-widest text-[0.62rem]">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-mono tabular-nums">
          {p.name}: {formatPeso(p.value)}
        </p>
      ))}
    </div>
  )
}

/* ── Month filter hook (detects mobile via matchMedia) ────────── */
function useBreakpoint(query: string) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(query)
    setMatches(mq.matches)
    const h = (e: MediaQueryListEvent) => setMatches(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [query])
  return matches
}

/* ── Breakdown month selector ─────────────────────────────────── */
interface BreakdownSelectorProps {
  allIds:     string[]
  labelById:  Record<string, string>
  selected:   Set<string>       // desktop: multi
  singleSel:  string            // mobile: single
  onToggle:   (id: string) => void
  onSingle:   (id: string) => void
  isMobile:   boolean
}

function BreakdownSelector({
  allIds, labelById, selected, singleSel,
  onToggle, onSingle, isMobile,
}: BreakdownSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const uid = useId()

  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const label = isMobile
    ? labelById[singleSel]
    : selected.size === allIds.length
      ? 'All months'
      : `${selected.size} month${selected.size !== 1 ? 's' : ''}`

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`
          flex items-center gap-1.5 h-7 px-2.5 border text-[0.65rem] font-bold uppercase tracking-[0.08em] transition-colors
          ${open
            ? 'border-brand/40 bg-[oklch(from_var(--brand)_l_c_h_/_0.07)] text-brand'
            : 'border-border text-text-faint hover:text-text hover:bg-bg-overlay'}
        `}
      >
        {label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-50 bg-bg-raised border border-border shadow-modal min-w-[160px] overflow-hidden">
          {allIds.map(id => {
            const active = isMobile ? singleSel === id : selected.has(id)
            return (
              <button
                key={id}
                onClick={() => {
                  if (isMobile) { onSingle(id); setOpen(false) }
                  else onToggle(id)
                }}
                className={`
                  w-full flex items-center gap-2.5 px-3.5 py-2 text-[0.72rem] transition-colors
                  ${active ? 'text-brand bg-[oklch(from_var(--brand)_l_c_h_/_0.06)]' : 'text-text-muted hover:text-text hover:bg-bg-overlay'}
                `}
              >
                {!isMobile && (
                  <span className={`
                    w-3.5 h-3.5 border flex items-center justify-center flex-shrink-0 transition-colors
                    ${active ? 'border-brand bg-brand' : 'border-border'}
                  `}>
                    {active && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                  </span>
                )}
                <span className="font-semibold">{labelById[id]}</span>
              </button>
            )
          })}

          {/* Desktop: Select all / clear */}
          {!isMobile && (
            <div className="border-t border-border flex">
              <button
                onClick={() => allIds.forEach(id => !selected.has(id) && onToggle(id))}
                className="flex-1 py-1.5 text-[0.62rem] font-bold uppercase tracking-widest text-text-faint hover:text-brand transition-colors"
              >
                All
              </button>
              <div className="w-px bg-border" />
              <button
                onClick={() => {
                  // Keep at least one selected — deselect all but first
                  allIds.slice(1).forEach(id => selected.has(id) && onToggle(id))
                }}
                className="flex-1 py-1.5 text-[0.62rem] font-bold uppercase tracking-widest text-text-faint hover:text-expense transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Summary Tab ──────────────────────────────────────────────── */
export function SummaryTab() {
  const { rows, loading } = useSummaryData()
  const tableRef  = useRef<HTMLDivElement>(null)
  const chartsRef = useRef<HTMLDivElement>(null)
  const isMobile  = !useBreakpoint('(min-width: 1024px)')

  // Desktop: set of selected month IDs (default: all)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  // Mobile: single selected month ID (default: latest)
  const [singleId, setSingleId] = useState<string>('')

  // Initialise selections once rows load
  useEffect(() => {
    if (rows.length === 0) return
    const allIds = rows.map(r => r.month.id)
    setSelectedIds(new Set(allIds))
    setSingleId(allIds[0]) // rows[0] is latest (desc order)
  }, [rows.length])

  function toggleId(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size === 1) return prev // keep at least one
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  useEffect(() => {
    if (loading || rows.length === 0) return
    const ctx = gsap.context(() => {
      gsap.from('.summary-stat-card', { y: 16, opacity: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out' })
      gsap.from(chartsRef.current, { y: 20, opacity: 0, duration: 0.5, delay: 0.25, ease: 'power2.out' })
      gsap.from(tableRef.current,  { y: 20, opacity: 0, duration: 0.5, delay: 0.4,  ease: 'power2.out' })
    })
    return () => ctx.revert()
  }, [loading, rows.length])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-24" />)}
        </div>
        <div className="skeleton h-64" />
        <div className="skeleton h-96" />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-text-faint text-sm">No monthly data yet.</p>
      </div>
    )
  }

  /* ── Aggregate stats (all rows) ───────────────── */
  const totalSavings    = rows.reduce((s, r) => s + r.totals.savings, 0)
  const avgSavings      = totalSavings / rows.length
  const bestMonth       = rows.reduce((best, r) => r.totals.savings > best.totals.savings ? r : best, rows[0])
  const avgSavingsRate  = rows.reduce((s, r) => s + r.totals.savingsRate, 0) / rows.length

  const statCards = [
    { label: 'Total Saved',      value: formatPeso(totalSavings),              color: 'text-income' },
    { label: 'Avg Monthly Save', value: formatPeso(avgSavings),                color: 'text-brand'  },
    { label: 'Best Month',       value: bestMonth.month.label,                 color: 'text-brand'  },
    { label: 'Avg Savings Rate', value: `${(avgSavingsRate * 100).toFixed(1)}%`, color: 'text-income'},
  ]

  /* ── Chart data (oldest → newest) ──────────────── */
  const chartData = [...rows].reverse().map(r => ({
    name:     r.month.label.replace(/(\w{3})\w+ (\d{4})/, '$1 $2'),
    Income:   r.totals.totalIncome,
    Bills:    r.totals.totalBills,
    Expenses: r.totals.totalExpenses + r.totals.totalMisc,
    Savings:  r.totals.savings,
  }))

  /* ── Table rows filtered by selection ──────────── */
  const visibleRows = isMobile
    ? rows.filter(r => r.month.id === singleId)
    : rows.filter(r => selectedIds.has(r.month.id))

  const allIds    = rows.map(r => r.month.id)
  const labelById = Object.fromEntries(rows.map(r => [r.month.id, r.month.label]))

  /* ── Table helper data ──────────────────────────── */
  // Use all rows for names (so table rows are stable regardless of filter)
  const allIncomeNames = [...new Set(rows.flatMap(r => r.income.map(i => i.name)))]
  const allBillNames   = [...new Set(rows.flatMap(r => r.bills.map(b => b.name)))]
  const allExpNames    = [...new Set(rows.flatMap(r => r.expenses.map(e => e.name)))]
  const allMiscNames   = [...new Set(rows.flatMap(r => r.misc.map(m => m.name)))]

  function getIncome(row: typeof rows[0], name: string) { return row.income.find(i => i.name === name)?.amount ?? null }
  function getBill(row: typeof rows[0], name: string)   { return row.bills.find(b => b.name === name)?.amount ?? null }
  function getExp(row: typeof rows[0], name: string)    { return row.expenses.find(e => e.name === name)?.amount ?? null }

  function Cell({ value }: { value: number | null }) {
    if (value === null) return <td className="px-3 py-2 text-right text-text-faint font-mono text-xs opacity-40">—</td>
    return <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-text">{formatPeso(value)}</td>
  }

  function SectionRow({ label, accent }: { label: string; accent: string }) {
    return (
      <tr>
        <td colSpan={visibleRows.length + 1} className={`px-4 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.18em] ${accent} bg-bg-overlay/50`}>
          {label}
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Stat cards ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-border overflow-hidden shadow-card">
        {statCards.map((s, i) => (
          <div key={s.label} className={`summary-stat-card relative px-4 sm:px-5 py-4 bg-bg-raised ${i < 3 ? 'border-r border-border' : ''} ${i < 2 ? 'border-b lg:border-b-0 border-border' : ''}`}>
            <div className={`absolute top-0 left-0 right-0 h-[2px] ${s.color === 'text-income' ? 'bg-income' : 'bg-brand'}`} />
            <p className="text-[0.6rem] font-bold text-text-faint uppercase tracking-[0.18em] mb-1.5">{s.label}</p>
            <p className={`text-base sm:text-lg font-mono font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Charts ──────────────────────────────────── */}
      <div ref={chartsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Savings Trend</CardTitle></CardHeader>
          <div className="px-3 py-4 h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" strokeOpacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-faint)', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-faint)', fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="Savings" stroke="var(--brand)"  strokeWidth={2} dot={{ r: 3, fill: 'var(--brand)', strokeWidth: 0 }} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="Income"  stroke="var(--income)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle>Income vs Expenses</CardTitle></CardHeader>
          <div className="px-3 py-4 h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-faint)', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-faint)', fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                <Bar dataKey="Income"   fill="var(--income)"  radius={0} maxBarSize={28} />
                <Bar dataKey="Bills"    fill="var(--expense)" radius={0} maxBarSize={28} opacity={0.7} />
                <Bar dataKey="Expenses" fill="var(--pending)" radius={0} maxBarSize={28} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ── Monthly Breakdown Table ──────────────────── */}
      <div ref={tableRef}>
        <Card>
          <CardHeader>
            <CardTitle>Monthly Breakdown</CardTitle>
            <BreakdownSelector
              allIds={allIds}
              labelById={labelById}
              selected={selectedIds}
              singleSel={singleId}
              onToggle={toggleId}
              onSingle={setSingleId}
              isMobile={isMobile}
            />
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2.5 text-left text-[0.6rem] font-bold uppercase tracking-[0.15em] text-text-faint bg-bg-overlay/40 sticky left-0 min-w-[130px] sm:min-w-[140px]">
                    Description
                  </th>
                  {visibleRows.map(r => (
                    <th key={r.month.id} className="px-3 py-2.5 text-right text-[0.6rem] font-bold uppercase tracking-[0.1em] text-text-faint bg-bg-overlay/40 min-w-[100px] sm:min-w-[110px] whitespace-nowrap">
                      {r.month.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">

                <SectionRow label="Allocation — Income" accent="text-income" />
                {allIncomeNames.map(name => (
                  <tr key={name} className="hover:bg-bg-overlay/40 transition-colors">
                    <td className="px-4 py-2 text-text-muted sticky left-0 bg-bg-raised font-medium text-xs">{name}</td>
                    {visibleRows.map(r => <Cell key={r.month.id} value={getIncome(r, name)} />)}
                  </tr>
                ))}

                <SectionRow label="Allocation — Bills" accent="text-expense" />
                {allBillNames.map(name => (
                  <tr key={name} className="hover:bg-bg-overlay/40 transition-colors">
                    <td className="px-4 py-2 text-text-muted sticky left-0 bg-bg-raised text-xs">{name}</td>
                    {visibleRows.map(r => <Cell key={r.month.id} value={getBill(r, name)} />)}
                  </tr>
                ))}

                {allExpNames.length > 0 && (
                  <>
                    <SectionRow label="Expenses" accent="text-pending" />
                    {allExpNames.map(name => (
                      <tr key={name} className="hover:bg-bg-overlay/40 transition-colors">
                        <td className="px-4 py-2 text-text-muted sticky left-0 bg-bg-raised text-xs">{name}</td>
                        {visibleRows.map(r => <Cell key={r.month.id} value={getExp(r, name)} />)}
                      </tr>
                    ))}
                  </>
                )}

                {allMiscNames.length > 0 && (
                  <>
                    <SectionRow label="Misc / Extras" accent="text-text-muted" />
                    {allMiscNames.map(name => (
                      <tr key={name} className="hover:bg-bg-overlay/40 transition-colors">
                        <td className="px-4 py-2 text-text-muted sticky left-0 bg-bg-raised text-xs">{name}</td>
                        {visibleRows.map(r => {
                          const total = r.misc.filter(m => m.name === name).reduce((s, m) => s + m.amount, 0)
                          return <Cell key={r.month.id} value={total || null} />
                        })}
                      </tr>
                    ))}
                  </>
                )}

                <tr className="border-t-2 border-border bg-bg-overlay/40">
                  <td className="px-4 py-3 text-[0.62rem] font-bold uppercase tracking-[0.15em] text-text-faint sticky left-0 bg-bg-overlay/80">Total Out</td>
                  {visibleRows.map(r => (
                    <td key={r.month.id} className="px-3 py-3 text-right font-mono font-bold text-expense tabular-nums">
                      {formatPeso(r.totals.totalBills + r.totals.totalExpenses + r.totals.totalMisc)}
                    </td>
                  ))}
                </tr>

                <tr className="bg-bg-overlay/60">
                  <td className="px-4 py-3 text-[0.62rem] font-bold uppercase tracking-[0.15em] text-text-faint sticky left-0 bg-bg-overlay/80">You Saved</td>
                  {visibleRows.map(r => (
                    <td key={r.month.id} className={`px-3 py-3 text-right font-mono font-bold tabular-nums text-[0.82rem] ${r.totals.savings >= 0 ? 'text-income' : 'text-expense'}`}>
                      {formatPeso(r.totals.savings)}
                    </td>
                  ))}
                </tr>

              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
