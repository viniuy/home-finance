// ── Settings ────────────────────────────────────────────────
export interface Settings {
  id: string
  rollover_savings: boolean
  created_at: string
}

// ── Templates (permanent, defined in Settings) ───────────────
export interface IncomeSource {
  id: string
  name: string
  default_amount: number
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface BillTemplate {
  id: string
  name: string
  default_amount: number
  is_variable: boolean
  is_active: boolean
  sort_order: number
  due_day: number | null   // day of month (1–31), optional
  created_at: string
}

export interface MonthlyExpenseTemplate {
  id: string
  name: string
  is_active: boolean
  sort_order: number
  created_at: string
}

// ── Months ───────────────────────────────────────────────────
export interface Month {
  id: string
  label: string
  year: number
  month: number
  rollover_amount: number
  created_at: string
}

// ── Month-scoped rows (snapshots, independent of templates) ──
export interface MonthlyIncome {
  id: string
  month_id: string
  source_id: string | null
  name: string
  amount: number
  sort_order: number
}

export interface MonthlyBill {
  id: string
  month_id: string
  template_id: string | null
  name: string
  amount: number
  is_variable: boolean
  is_updated: boolean
  is_paid: boolean          // new — money left the account
  due_day: number | null    // new — day of month, nullable
  sort_order: number
}

export interface MonthlyExpense {
  id: string
  month_id: string
  template_id: string | null
  name: string
  amount: number | null
  logged_at: string | null
  sort_order: number
}

export interface MiscExpense {
  id: string
  month_id: string
  name: string
  amount: number
  created_at: string
}

// ── Computed summary ─────────────────────────────────────────
export interface MonthlySummary {
  totalIncome: number
  totalBills: number
  totalMonthlyExpenses: number
  totalMisc: number
  totalExpenses: number
  savings: number
  savingsRate: number
  pendingBills: number     // variable + not updated
}

// ── Insert / Update helpers ──────────────────────────────────
export type MonthlyBillUpdate  = Pick<MonthlyBill, 'id' | 'amount'> & { is_updated: true }
export type MonthlyExpenseLog  = Pick<MonthlyExpense, 'id'> & { amount: number; logged_at: string }
export type MiscExpenseInsert  = Omit<MiscExpense, 'id' | 'created_at'>
