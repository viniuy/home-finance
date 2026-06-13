'use client'
import { Card, CardHeader, CardTitle } from '@/components/ui/Primitives'
import { InlineEdit } from '@/components/ui/InlineEdit'
import { formatPeso } from '@/lib/utils'
import type { MonthlyBill } from '@/types/types'

interface BillsSectionProps {
  bills:      MonthlyBill[]
  onUpdate:   (id: string, amount: number) => Promise<void>
  onTogglePaid: (id: string, isPaid: boolean) => Promise<void>
}

// ── Urgency helpers ───────────────────────────────────────────

type Urgency = 'overdue' | 'urgent' | 'upcoming' | null

function getUrgency(dueDay: number | null, isPaid: boolean): Urgency {
  if (isPaid || dueDay === null) return null
  const today = new Date().getDate()
  const diff   = dueDay - today        // negative = overdue
  if (diff < 0)  return 'overdue'
  if (diff <= 3) return 'urgent'
  return 'upcoming'
}

function getDaysLabel(dueDay: number | null, isPaid: boolean): string | null {
  if (isPaid || dueDay === null) return null
  const today = new Date().getDate()
  const diff   = dueDay - today
  if (diff < 0)  return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'due today'
  return `due in ${diff}d`
}

// ── Sort: overdue → urgent → upcoming (by due_day asc) → no date → paid ──
function sortBills(bills: MonthlyBill[]): MonthlyBill[] {
  const urgencyRank = (b: MonthlyBill): number => {
    if (b.is_paid) return 4
    const u = getUrgency(b.due_day, b.is_paid)
    if (u === 'overdue')  return 0
    if (u === 'urgent')   return 1
    if (u === 'upcoming') return 2
    return 3   // no due date, unpaid
  }

  return [...bills].sort((a, b) => {
    const ra = urgencyRank(a)
    const rb = urgencyRank(b)
    if (ra !== rb) return ra - rb
    // Within same urgency tier, sort by due_day ascending
    if (a.due_day !== null && b.due_day !== null) return a.due_day - b.due_day
    if (a.due_day !== null) return -1
    if (b.due_day !== null) return  1
    return a.sort_order - b.sort_order
  })
}

// ── Urgency styles ────────────────────────────────────────────
const URGENCY_STYLES: Record<NonNullable<Urgency>, {
  dot: string; badge: string; badgeBg: string; row: string
}> = {
  overdue:  {
    dot:     'bg-expense',
    badge:   'text-expense',
    badgeBg: 'bg-expense-dim border-expense/25',
    row:     'bg-expense-dim/30',
  },
  urgent: {
    dot:     'bg-pending',
    badge:   'text-pending',
    badgeBg: 'bg-pending-dim border-pending/25',
    row:     'bg-pending-dim/30',
  },
  upcoming: {
    dot:     'bg-border',
    badge:   'text-text-faint',
    badgeBg: 'bg-bg-overlay border-border',
    row:     '',
  },
}

// ── Checkbox ──────────────────────────────────────────────────
function PaidCheckbox({
  isPaid, isUpdated, isVariable, onChange,
}: {
  isPaid: boolean; isUpdated: boolean; isVariable: boolean
  onChange: (v: boolean) => void
}) {
  const locked = isVariable && !isUpdated
  return (
    <button
      onClick={() => !locked && onChange(!isPaid)}
      disabled={locked}
      title={locked ? 'Confirm amount first before marking paid' : isPaid ? 'Mark as unpaid' : 'Mark as paid'}
      className={`
        w-5 h-5 flex-shrink-0 flex items-center justify-center border transition-all duration-150
        ${locked
          ? 'border-border/30 opacity-30 cursor-not-allowed'
          : isPaid
            ? 'border-income bg-income/10 hover:bg-income/20'
            : 'border-border hover:border-income/60 hover:bg-income/5 cursor-pointer'}
      `}
    >
      {isPaid && (
        <svg viewBox="0 0 10 8" className="w-2.5 h-2 text-income" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 4l3 3 5-6" />
        </svg>
      )}
    </button>
  )
}

// ── Component ─────────────────────────────────────────────────
export function BillsSection({ bills, onUpdate, onTogglePaid }: BillsSectionProps) {
  const sorted       = sortBills(bills)
  const total        = bills.reduce((s, b) => s + b.amount, 0)
  const unpaidCount  = bills.filter(b => !b.is_paid).length
  const pendingCount = bills.filter(b => b.is_variable && !b.is_updated).length
  const overdueCount = bills.filter(b => getUrgency(b.due_day, b.is_paid) === 'overdue').length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle>Bills</CardTitle>
          {overdueCount > 0 && (
            <span className="text-[0.6rem] font-bold bg-expense-dim text-expense border border-expense/25 px-1.5 py-0.5 uppercase tracking-widest">
              {overdueCount} overdue
            </span>
          )}
          {pendingCount > 0 && (
            <span className="text-[0.6rem] font-bold bg-pending-dim text-pending border border-pending/25 px-1.5 py-0.5 uppercase tracking-widest">
              {pendingCount} pending
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[0.65rem] text-text-faint font-mono">
            {bills.length - unpaidCount}/{bills.length} paid
          </span>
          <span className="text-xs font-mono font-bold text-expense tabular-nums">
            {formatPeso(total)}
          </span>
        </div>
      </CardHeader>

      <div className="divide-y divide-border/40">
        {bills.length === 0 && (
          <p className="px-5 py-8 text-xs text-text-faint text-center">
            No bill templates configured.
          </p>
        )}

        {sorted.map(bill => {
          const isPending = bill.is_variable && !bill.is_updated
          const urgency   = getUrgency(bill.due_day, bill.is_paid)
          const daysLabel = getDaysLabel(bill.due_day, bill.is_paid)
          const styles    = urgency ? URGENCY_STYLES[urgency] : null

          return (
            <div
              key={bill.id}
              className={`
                flex items-center justify-between px-4 py-3 transition-colors group
                hover:bg-bg-overlay/50
                ${bill.is_paid ? 'opacity-45 hover:opacity-70' : ''}
                ${styles?.row ?? ''}
              `}
            >
              {/* Left: checkbox + accent bar + name + badges */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <PaidCheckbox
                  isPaid={bill.is_paid}
                  isUpdated={bill.is_updated}
                  isVariable={bill.is_variable}
                  onChange={v => onTogglePaid(bill.id, v)}
                />

                <span className={`
                  w-[3px] h-4 flex-shrink-0 transition-colors rounded-full
                  ${urgency === 'overdue'  ? 'bg-expense' :
                    urgency === 'urgent'   ? 'bg-pending' :
                    isPending              ? 'bg-pending/50' :
                    bill.is_paid           ? 'bg-income/40' :
                    'bg-border'}
                `} />

                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`text-sm truncate ${bill.is_paid ? 'line-through text-text-faint' : 'text-text'}`}>
                    {bill.name}
                  </span>

                  {/* Urgency badge — text on desktop, just color on mobile */}
                  {daysLabel && (
                    <span className={`
                      hidden sm:inline-block flex-shrink-0
                      text-[0.58rem] font-bold px-1.5 py-0.5 uppercase tracking-widest border
                      ${styles?.badge ?? ''} ${styles?.badgeBg ?? ''}
                    `}>
                      {daysLabel}
                    </span>
                  )}

                  {/* Mobile: just a colored dot for urgency */}
                  {urgency && urgency !== 'upcoming' && (
                    <span className={`
                      sm:hidden w-1.5 h-1.5 rounded-full flex-shrink-0
                      ${styles?.dot ?? ''}
                    `} title={daysLabel ?? ''} />
                  )}

                  {/* Variable / pending badge */}
                  {bill.is_variable && (
                    <span className={`
                      text-[0.58rem] font-bold px-1.5 py-0.5 uppercase tracking-widest
                      hidden group-hover:inline-block flex-shrink-0
                      ${isPending
                        ? 'text-pending bg-pending-dim border border-pending/20'
                        : 'text-text-faint bg-bg-overlay border border-border'}
                    `}>
                      {isPending ? 'upd' : 'var'}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: amount edit */}
              <InlineEdit
                value={bill.amount}
                onSave={v => onUpdate(bill.id, v)}
                pending={isPending}
              />
            </div>
          )
        })}
      </div>
    </Card>
  )
}
