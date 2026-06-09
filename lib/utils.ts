import { Category } from '@/types'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPeso(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function getCategoryColor(category: Category): string {
  switch (category) {
    case 'bill':
      return 'bg-blue-500/10 text-blue-600 border-blue-200'
    case 'grocery':
      return 'bg-green-500/10 text-green-600 border-green-200'
    case 'palengke':
      return 'bg-orange-500/10 text-orange-600 border-orange-200'
    case 'extra':
      return 'bg-purple-500/10 text-purple-600 border-purple-200'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function getCategoryLabel(category: Category): string {
  switch (category) {
    case 'bill':
      return 'Bill'
    case 'grocery':
      return 'Grocery'
    case 'palengke':
      return 'Palengke'
    case 'extra':
      return 'Extra'
  }
}

export function getMonthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString('en-PH', { month: 'long' })
}