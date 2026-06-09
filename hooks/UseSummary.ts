'use client'

import { useMemo } from 'react'
import { Expense, MonthlyIncome, Summary } from '@/types'

export function useSummary(expenses: Expense[], income: MonthlyIncome[]): Summary {
  return useMemo(() => {
    const totalIncome = income.reduce((sum, i) => sum + i.amount, 0)
    const totalBills = expenses
      .filter((e) => e.category === 'bill')
      .reduce((sum, e) => sum + e.amount, 0)
    const totalGroceries = expenses
      .filter((e) => e.category === 'grocery')
      .reduce((sum, e) => sum + e.amount, 0)
    const totalPalengke = expenses
      .filter((e) => e.category === 'palengke')
      .reduce((sum, e) => sum + e.amount, 0)
    const totalExtras = expenses
      .filter((e) => e.category === 'extra')
      .reduce((sum, e) => sum + e.amount, 0)

    const totalExpenses = totalBills + totalGroceries + totalPalengke + totalExtras
    const savings = totalIncome - totalExpenses
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0

    return {
      totalIncome,
      totalBills,
      totalGroceries,
      totalPalengke,
      totalExtras,
      totalExpenses,
      savings,
      savingsRate,
    }
  }, [expenses, income])
}