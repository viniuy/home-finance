'use client'
import { TrendingUp, Receipt, ShoppingBag, Sparkles } from 'lucide-react'

export type MobileSection = 'income' | 'bills' | 'expenses' | 'misc'

interface BottomNavProps {
  active:   MobileSection
  onChange: (s: MobileSection) => void
}

const TABS: { id: MobileSection; label: string; Icon: React.ElementType }[] = [
  { id: 'income',   label: 'Income',   Icon: TrendingUp   },
  { id: 'bills',    label: 'Bills',    Icon: Receipt      },
  { id: 'expenses', label: 'Expenses', Icon: ShoppingBag  },
  { id: 'misc',     label: 'Misc',     Icon: Sparkles     },
]

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-bg-raised border-t border-border">
      <div className="flex h-16 safe-bottom">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors"
            >
              <div className={`
                flex items-center justify-center w-8 h-6 rounded-full transition-all duration-150
                ${isActive ? 'bg-bg-overlay' : ''}
              `}>
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-brand' : 'text-text-faint'}`} />
              </div>
              <span className={`
                text-[0.6rem] font-bold uppercase tracking-[0.08em] transition-colors
                ${isActive ? 'text-brand' : 'text-text-faint'}
              `}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
