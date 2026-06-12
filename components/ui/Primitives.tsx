import { cn } from '@/lib/utils'
import { forwardRef, useEffect } from 'react'
import { X, ChevronDown } from 'lucide-react'

// ── Shared radius class (0 on dark/light, 0.625rem on sakura) ─
const R = 'rounded-[var(--radius)]'

// ── Card ──────────────────────────────────────────────────────
export function Card({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(`bg-bg-raised border border-border shadow-card overflow-hidden ${R}`, className)}
      {...p}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-between px-5 py-3.5 border-b border-border', className)}
      {...p}
    >
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...p }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-[0.62rem] font-bold text-text-faint uppercase tracking-[0.15em]', className)}
      {...p}
    >
      {children}
    </p>
  )
}

// ── Input ─────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  prefix?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, prefix, hint, className, id, ...p }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[0.65rem] font-bold text-text-faint uppercase tracking-[0.14em]">
            {label}
          </label>
        )}
        <div className="relative">
          {prefix && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-text-faint select-none font-mono pointer-events-none">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              `w-full h-10 bg-bg-overlay border border-border-light text-sm text-text ${R}`,
              'placeholder:text-text-faint outline-none transition-all duration-150',
              'focus:border-brand focus:ring-1 focus:ring-brand/15 focus:bg-bg-raised',
              'hover:border-border',
              prefix ? 'pl-7 pr-3.5' : 'px-3.5',
              error ? 'border-expense/40 focus:border-expense focus:ring-expense/10' : '',
              className
            )}
            {...p}
          />
        </div>
        {error && (
          <p className="text-[0.72rem] text-expense flex items-center gap-1.5">
            <span className="w-3 h-3 inline-flex items-center justify-center border border-expense/40 text-[8px] flex-shrink-0 rounded-sm">!</span>
            {error}
          </p>
        )}
        {hint && !error && <p className="text-[0.72rem] text-text-faint">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

// ── Select ────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...p }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-[0.65rem] font-bold text-text-faint uppercase tracking-[0.14em]">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              `w-full h-10 bg-bg-overlay border border-border-light text-sm text-text ${R}`,
              'pl-3.5 pr-9 outline-none appearance-none transition-all duration-150 cursor-pointer',
              'focus:border-brand focus:ring-1 focus:ring-brand/15',
              'hover:border-border',
              error ? 'border-expense/40' : '',
              className
            )}
            {...p}
          >
            {options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-faint pointer-events-none" />
        </div>
        {error && <p className="text-[0.72rem] text-expense">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'

// ── Modal ─────────────────────────────────────────────────────
interface ModalProps {
  open:      boolean
  onClose:   () => void
  title:     string
  subtitle?: string
  children:  React.ReactNode
  size?:     'sm' | 'md' | 'lg'
}

export function Modal({ open, onClose, title, subtitle, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[3px]"
        style={{ animation: 'fadeIn 0.15s ease-out' }}
        onClick={onClose}
      />
      <div
        className={cn(
          `relative w-full bg-bg-raised border border-border shadow-modal ${R}`,
          size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-xl' : 'max-w-md'
        )}
        style={{ animation: 'modalIn 0.2s cubic-bezier(0.16,1,0.3,1)' }}
      >
        {/* Corner accents — visible only when radius is 0 (dark/light) */}
        <span className="absolute top-0    left-0  w-3 h-3 border-t-2 border-l-2 border-brand/40 rounded-tl-[var(--radius)]" />
        <span className="absolute top-0    right-0 w-3 h-3 border-t-2 border-r-2 border-brand/40 rounded-tr-[var(--radius)]" />
        <span className="absolute bottom-0 left-0  w-3 h-3 border-b-2 border-l-2 border-brand/40 rounded-bl-[var(--radius)]" />
        <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-brand/40 rounded-br-[var(--radius)]" />

        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-[0.75rem] font-bold text-text uppercase tracking-[0.1em]">{title}</h2>
            {subtitle && <p className="text-[0.7rem] text-text-faint mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className={`w-7 h-7 flex items-center justify-center text-text-faint hover:text-text hover:bg-bg-overlay transition-colors border border-transparent hover:border-border ${R}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }
      `}</style>
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────
interface ToggleProps {
  checked:      boolean
  onChange:     (v: boolean) => void
  label?:       string
  description?: string
}

export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      {(label || description) && (
        <div className="min-w-0">
          {label && <p className="text-sm text-text font-medium leading-snug">{label}</p>}
          {description && <p className="text-[0.72rem] text-text-faint mt-0.5 leading-relaxed">{description}</p>}
        </div>
      )}
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative flex-shrink-0 w-10 h-[1.375rem] rounded-full transition-colors duration-200',
          checked ? 'bg-brand' : 'bg-border-light'
        )}
      >
        <span className={cn(
          'absolute top-[3px] w-[1rem] h-[1rem] rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-[1.125rem]' : 'translate-x-[3px]'
        )} />
      </button>
    </div>
  )
}
