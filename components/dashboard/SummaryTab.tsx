'use client'
import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { useSummaryData } from '@/hooks/useSummaryData'
import { formatPeso } from '@/lib/utils'
import { Card, CardHeader, CardTitle } from '@/components/ui/Primitives'

/* ── Tooltip ─────────────────────────────────────────────────── */
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

/* ── Summary Tab ─────────────────────────────────────────────── */
export function SummaryTab() {
  const { rows, loading } = useSummaryData()
  const tableRef  = useRef<HTMLDivElement>(null)
  const chartsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (loading || rows.length === 0) return
    const ctx = gsap.context(() => {
      gsap.from('.summary-stat-card', {
        y: 16, opacity: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out',
      })
      gsap.from(chartsRef.current, {
        y: 20, opacity: 0, duration: 0.5, delay: 0.25, ease: 'power2.out',
      })
      gsap.from(tableRef.current, {
        y: 20, opacity: 0, duration: 0.5, delay: 0.4, ease: 'power2.out',
      })
    })
    return () => ctx.revert()
  }, [loading, rows.length])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24" />)}
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

  /* ── Aggregate stats ──────────────────────────── */
  const totalSavings  = rows.reduce((s, r) => s + r.totals.savings, 0)
  const avgSavings    = totalSavings / rows.length
  const bestMonth     = rows.reduce((best, r) => r.totals.savings > best.totals.savings ? r : best, rows[0])
  const avgSavingsRate = rows.reduce((s, r) => s + r.totals.savingsRate, 0) / rows.length

  const statCards = [
    { label: 'Total Saved',     value: formatPeso(totalSavings),                         color: 'text-income'  },
    { label: 'Avg Monthly Save',value: formatPeso(avgSavings),                           color: 'text-brand'   },
    { label: 'Best Month',      value: bestMonth.month.label,                            color: 'text-brand'   },
    { label: 'Avg Savings Rate',value: `${(avgSavingsRate * 100).toFixed(1)}%`,           color: 'text-income'  },
  ]

  /* ── Chart data (oldest → newest) ─────────────── */
  const chartData = [...rows].reverse().map(r => ({
    name:     r.month.label.replace(/(\w{3})\w+ (\d{4})/, '$1 $2'), // "Jan 2026"
    Income:   r.totals.totalIncome,
    Bills:    r.totals.totalBills,
    Expenses: r.totals.totalExpenses + r.totals.totalMisc,
    Savings:  r.totals.savings,
  }))

  /* ── All unique income/expense item names for table ── */
  const allIncomeNames  = [...new Set(rows.flatMap(r => r.income.map(i => i.name)))]
  const allBillNames    = [...new Set(rows.flatMap(r => r.bills.map(b => b.name)))]
  const allExpNames     = [...new Set(rows.flatMap(r => r.expenses.map(e => e.name)))]
  const allMiscNames    = [...new Set(rows.flatMap(r => r.misc.map(m => m.name)))]

  /* ── Lookup helpers ─────────────────────────────── */
  function getIncome(row: typeof rows[0], name: string) {
    return row.income.find(i => i.name === name)?.amount ?? null
  }
  function getBill(row: typeof rows[0], name: string) {
    const b = row.bills.find(b => b.name === name)
    if (!b) return null
    return b.amount
  }
  function getExp(row: typeof rows[0], name: string) {
    return row.expenses.find(e => e.name === name)?.amount ?? null
  }

  function Cell({ value, dimmed }: { value: number | null; dimmed?: boolean }) {
    if (value === null) return <td className="px-3 py-2 text-right text-text-faint font-mono text-xs opacity-40">—</td>
    return (
      <td className={`px-3 py-2 text-right font-mono text-xs tabular-nums ${dimmed ? 'text-text-muted' : 'text-text'}`}>
        {formatPeso(value)}
      </td>
    )
  }

  function SectionRow({ label, accent }: { label: string; accent: string }) {
    return (
      <tr>
        <td colSpan={rows.length + 1} className={`px-4 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.18em] ${accent} bg-bg-overlay/50`}>
          {label}
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Aggregate stat cards ───────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-border overflow-hidden shadow-card">
        {statCards.map((s, i) => (
          <div key={s.label} className={`summary-stat-card relative px-5 py-4 bg-bg-raised ${i < 3 ? 'border-r border-border' : ''}`}>
            <div className={`absolute top-0 left-0 right-0 h-[2px] ${s.color === 'text-income' ? 'bg-income' : 'bg-brand'}`} />
            <p className="text-[0.6rem] font-bold text-text-faint uppercase tracking-[0.18em] mb-1.5">{s.label}</p>
            <p className={`text-lg font-mono font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Charts ─────────────────────────────────── */}
      <div ref={chartsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Savings trend */}
        <Card>
          <CardHeader><CardTitle>Savings Trend</CardTitle></CardHeader>
          <div className="px-3 py-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" strokeOpacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-faint)', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-faint)', fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="Savings" stroke="var(--brand)" strokeWidth={2} dot={{ r: 3, fill: 'var(--brand)', strokeWidth: 0 }} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="Income"  stroke="var(--income)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Month comparison */}
        <Card>
          <CardHeader><CardTitle>Income vs Expenses</CardTitle></CardHeader>
          <div className="px-3 py-4 h-56">
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

      {/* ── Monthly Table ──────────────────────────── */}
      <div ref={tableRef}>
        <Card>
          <CardHeader>
            <CardTitle>Monthly Breakdown</CardTitle>
            <span className="text-[0.65rem] text-text-faint">{rows.length} months</span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2.5 text-left text-[0.6rem] font-bold uppercase tracking-[0.15em] text-text-faint bg-bg-overlay/40 sticky left-0 min-w-[140px]">
                    Description
                  </th>
                  {rows.map(r => (
                    <th key={r.month.id} className="px-3 py-2.5 text-right text-[0.6rem] font-bold uppercase tracking-[0.1em] text-text-faint bg-bg-overlay/40 min-w-[110px] whitespace-nowrap">
                      {r.month.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">

                {/* ── Income ──────────────────────── */}
                <SectionRow label="Allocation — Income" accent="text-income" />
                {allIncomeNames.map(name => (
                  <tr key={name} className="hover:bg-bg-overlay/40 transition-colors">
                    <td className="px-4 py-2 text-text-muted sticky left-0 bg-bg-raised font-medium">{name}</td>
                    {rows.map(r => <Cell key={r.month.id} value={getIncome(r, name)} />)}
                  </tr>
                ))}

                {/* ── Bills ───────────────────────── */}
                <SectionRow label="Allocation — Bills" accent="text-expense" />
                {allBillNames.map(name => (
                  <tr key={name} className="hover:bg-bg-overlay/40 transition-colors">
                    <td className="px-4 py-2 text-text-muted sticky left-0 bg-bg-raised">{name}</td>
                    {rows.map(r => <Cell key={r.month.id} value={getBill(r, name)} />)}
                  </tr>
                ))}

                {/* ── Monthly Expenses ────────────── */}
                {allExpNames.length > 0 && (
                  <>
                    <SectionRow label="Expenses" accent="text-pending" />
                    {allExpNames.map(name => (
                      <tr key={name} className="hover:bg-bg-overlay/40 transition-colors">
                        <td className="px-4 py-2 text-text-muted sticky left-0 bg-bg-raised">{name}</td>
                        {rows.map(r => <Cell key={r.month.id} value={getExp(r, name)} />)}
                      </tr>
                    ))}
                  </>
                )}

                {/* ── Misc ────────────────────────── */}
                {allMiscNames.length > 0 && (
                  <>
                    <SectionRow label="Misc / Extras" accent="text-text-muted" />
                    {allMiscNames.map(name => (
                      <tr key={name} className="hover:bg-bg-overlay/40 transition-colors">
                        <td className="px-4 py-2 text-text-muted sticky left-0 bg-bg-raised">{name}</td>
                        {rows.map(r => {
                          const total = r.misc.filter(m => m.name === name).reduce((s, m) => s + m.amount, 0)
                          return <Cell key={r.month.id} value={total || null} />
                        })}
                      </tr>
                    ))}
                  </>
                )}

                {/* ── Totals ──────────────────────── */}
                <tr className="border-t-2 border-border bg-bg-overlay/40">
                  <td className="px-4 py-3 text-[0.62rem] font-bold uppercase tracking-[0.15em] text-text-faint sticky left-0 bg-bg-overlay/80">
                    Total Out
                  </td>
                  {rows.map(r => (
                    <td key={r.month.id} className="px-3 py-3 text-right font-mono font-bold text-expense tabular-nums">
                      {formatPeso(r.totals.totalBills + r.totals.totalExpenses + r.totals.totalMisc)}
                    </td>
                  ))}
                </tr>

                <tr className="bg-bg-overlay/60">
                  <td className="px-4 py-3 text-[0.62rem] font-bold uppercase tracking-[0.15em] text-text-faint sticky left-0 bg-bg-overlay/80">
                    You Saved
                  </td>
                  {rows.map(r => (
                    <td
                      key={r.month.id}
                      className={`px-3 py-3 text-right font-mono font-bold tabular-nums text-[0.82rem] ${r.totals.savings >= 0 ? 'text-income' : 'text-expense'}`}
                    >
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
