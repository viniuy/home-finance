import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size    = 'xs' | 'sm' | 'md'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?:    Size
  loading?: boolean
}

const variants: Record<Variant, string> = {
  primary:   'bg-brand text-white font-bold hover:opacity-90 active:scale-[0.97] shadow-sm',
  secondary: 'bg-bg-overlay border border-border-light text-text-muted hover:text-text hover:border-border',
  ghost:     'text-text-muted hover:text-text hover:bg-bg-overlay',
  danger:    'bg-expense-dim text-expense border border-expense/20 hover:bg-expense/15',
}

const sizes: Record<Size, string> = {
  xs: 'h-7  px-2.5 text-[0.7rem]  gap-1',
  sm: 'h-8  px-3   text-[0.75rem] gap-1.5',
  md: 'h-10 px-4   text-[0.8rem]  gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-sans tracking-[0.04em] uppercase',
        'transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed select-none',
        'rounded-[var(--radius)]',
        variants[variant], sizes[size], className
      )}
      {...props}
    >
      {loading
        ? <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        : children}
    </button>
  )
)
Button.displayName = 'Button'
