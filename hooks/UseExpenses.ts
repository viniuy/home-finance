'use client'

import { createClient } from '@/lib/supabase'
import { Category, Expense } from '@/types'

interface CreateExpenseInput {
  month_id: string
  description: string
  amount: number
  category: Category
  date?: string | null
}

interface UpdateExpenseInput {
  description?: string
  amount?: number
  category?: Category
  date?: string | null
}

export function useExpenses() {
  const supabase = createClient()

  async function createExpense(input: CreateExpenseInput): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .insert(input)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Expense
  }

  async function updateExpense(id: string, input: UpdateExpenseInput): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Expense
  }

  async function deleteExpense(id: string): Promise<void> {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  return { createExpense, updateExpense, deleteExpense }
}