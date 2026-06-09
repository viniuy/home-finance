'use client'

import { useState } from 'react'
import { useMonths } from '@/hooks/UseMonths'
import { useMonth } from '@/hooks/UseMonth'
import { useExpenses } from '@/hooks/UseExpenses'
import { useIncome } from '@/hooks/UseIncome'
import { useSummary } from '@/hooks/UseSummary'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { ExpenseTable } from '@/components/dashboard/ExpenseTable'
import { AddExpenseModal } from '@/components/dashboard/AddExpensesModal'
import { AddMonthModal } from '@/components/dashboard/AddMonthModal'
import { IncomeSection } from '@/components/dashboard/IncomeSection'
import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown'
import { Expense, Category } from '@/types'

export default function DashboardPage() {
  const { months, createMonth } = useMonths()
  const [selectedMonthId, setSelectedMonthId] = useState<string | null>(
    months[0]?.id ?? null
  )

  const { expenses, income, refetch } = useMonth(selectedMonthId)
  const { createExpense, updateExpense, deleteExpense } = useExpenses()
  const { monthlyIncome, updateMonthlyIncome } = useIncome(selectedMonthId)
  const summary = useSummary(expenses, income)

  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [monthModalOpen, setMonthModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  async function handleSaveExpense(data: {
    description: string
    amount: number
    category: Category
    date: string | null
  }) {
    if (!selectedMonthId) return
    if (editingExpense) {
      await updateExpense(editingExpense.id, data)
    } else {
      await createExpense({ ...data, month_id: selectedMonthId })
    }
    await refetch()
  }

  async function handleDeleteExpense(id: string) {
    await deleteExpense(id)
    await refetch()
  }

  function handleEditExpense(expense: Expense) {
    setEditingExpense(expense)
    setExpenseModalOpen(true)
  }

  function handleAddExpense() {
    setEditingExpense(null)
    setExpenseModalOpen(true)
  }

  async function handleCreateMonth(year: number, month: number) {
    const newMonth = await createMonth(year, month)
    setSelectedMonthId(newMonth.id)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Home Budget</h1>
            <p className="text-sm text-muted-foreground">Family finance tracker</p>
          </div>
          <MonthSelector
            months={months}
            selectedId={selectedMonthId}
            onSelect={setSelectedMonthId}
            onAddMonth={() => setMonthModalOpen(true)}
          />
        </div>

        {selectedMonthId ? (
          <>
            {/* Summary cards */}
            <SummaryCards summary={summary} />

            {/* Main content */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left: income + breakdown */}
              <div className="space-y-6 lg:col-span-1">
                <IncomeSection
                  monthlyIncome={monthlyIncome}
                  onUpdate={updateMonthlyIncome}
                />
                <CategoryBreakdown summary={summary} />
              </div>

              {/* Right: expense table */}
              <div className="lg:col-span-2">
                <ExpenseTable
                  expenses={expenses}
                  onAdd={handleAddExpense}
                  onEdit={handleEditExpense}
                  onDelete={handleDeleteExpense}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="py-24 text-center text-muted-foreground">
            <p className="text-lg font-medium">No months yet.</p>
            <p className="text-sm mt-1">Click the + button to create your first month.</p>
          </div>
        )}
      </div>

      <AddExpenseModal
        open={expenseModalOpen}
        onClose={() => {
          setExpenseModalOpen(false)
          setEditingExpense(null)
        }}
        onSave={handleSaveExpense}
        initialData={editingExpense}
      />

      <AddMonthModal
        open={monthModalOpen}
        onClose={() => setMonthModalOpen(false)}
        onSave={handleCreateMonth}
      />
    </div>
  )
}