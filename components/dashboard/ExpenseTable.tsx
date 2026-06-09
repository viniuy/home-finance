'use client'

import { useState } from 'react'
import { Expense, Category } from '@/types'
import { formatPeso, getCategoryColor, getCategoryLabel } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PencilIcon, Trash2Icon, MoreHorizontalIcon, PlusIcon } from 'lucide-react'

const CATEGORY_ORDER: Category[] = ['bill', 'grocery', 'palengke', 'extra']

interface ExpenseTableProps {
  expenses: Expense[]
  onAdd: () => void
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
}

export function ExpenseTable({ expenses, onAdd, onEdit, onDelete }: ExpenseTableProps) {
  const grouped = CATEGORY_ORDER.reduce<Record<string, Expense[]>>((acc, cat) => {
    const items = expenses.filter((e) => e.category === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {})

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-medium">Expenses</CardTitle>
        <Button size="sm" onClick={onAdd}>
          <PlusIcon className="h-4 w-4 mr-1" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {expenses.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No expenses yet. Add your first one.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {CATEGORY_ORDER.flatMap((cat) => {
                const items = grouped[cat]
                if (!items) return []

                const subtotal = items.reduce((s, e) => s + e.amount, 0)

                return [
                  ...items.map((expense) => (
                    <TableRow key={expense.id} className="group">
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getCategoryColor(expense.category)}
                        >
                          {getCategoryLabel(expense.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {expense.date
                          ? new Date(expense.date).toLocaleDateString('en-PH', {
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatPeso(expense.amount)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100"
                            >
                              <MoreHorizontalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(expense)}>
                              <PencilIcon className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onDelete(expense.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2Icon className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )),
                  <TableRow key={`${cat}-subtotal`} className="bg-muted/30">
                    <TableCell colSpan={3} className="text-xs text-muted-foreground py-2">
                      {getCategoryLabel(cat)} subtotal
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold tabular-nums py-2">
                      {formatPeso(subtotal)}
                    </TableCell>
                    <TableCell />
                  </TableRow>,
                ]
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}