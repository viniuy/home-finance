import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPeso(amount: number | null | undefined, opts?: { compact?: boolean }): string {
  if (amount == null) return '—'
  if (opts?.compact && Math.abs(amount) >= 1000) {
    return `₱${(amount / 1000).toFixed(1)}k`
  }
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function getMonthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString('en-PH', {
    month: 'long',
    year: 'numeric',
  })
}

export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export function isSameYearMonth(
  a: { year: number; month: number },
  b: { year: number; month: number }
): boolean {
  return a.year === b.year && a.month === b.month
}