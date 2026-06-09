export type Category = 'bill' | 'grocery' | 'palengke' | 'extra'

export type BillSubcategory =
  | 'Meralco'
  | 'Prime Water'
  | 'Internet'
  | 'HOA'
  | 'Netflix'
  | 'Gas'
  | 'Mineral'
  | 'Credit Card'
  | 'Amazon Prime'

export interface Month {
  id: string
  label: string
  year: number
  month: number
  created_at: string
}

export interface IncomeSource {
  id: string
  name: string
  amount: number
  is_active: boolean
  sort_order: number
}

export interface MonthlyIncome {
  id: string
  month_id: string
  source_id: string
  amount: number
  income_sources?: IncomeSource
}

export interface Expense {
  id: string
  month_id: string
  description: string
  amount: number
  category: Category
  date: string | null
  created_at: string
}

export interface Summary {
  totalIncome: number
  totalBills: number
  totalGroceries: number
  totalPalengke: number
  totalExtras: number
  totalExpenses: number
  savings: number
  savingsRate: number
}