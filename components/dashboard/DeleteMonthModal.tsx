'use client'
import { useState, useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Primitives'
import { Button } from '@/components/ui/button'
import gsap from 'gsap'

interface DeleteMonthModalProps {
  open:       boolean
  onClose:    () => void
  monthLabel: string
  onDelete:   () => Promise<void>
}

export function DeleteMonthModal({ open, onClose, monthLabel, onDelete }: DeleteMonthModalProps) {
  const [typed,   setTyped]   = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  const btnRef    = useRef<HTMLButtonElement>(null)

  const confirmed = typed.trim().toLowerCase() === monthLabel.trim().toLowerCase()

  useEffect(() => {
    if (open) {
      setTyped('')
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [open])

  async function handleDelete() {
    if (!confirmed || loading) return
    setLoading(true)
    await onDelete()
    setLoading(false)
    onClose()
  }

  function handleClose() {
    if (loading) return
    setTyped('')
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && confirmed) handleDelete()
    // Shake on Enter if not confirmed yet
    if (e.key === 'Enter' && !confirmed && btnRef.current) {
      gsap.fromTo(btnRef.current,
        { x: -5 },
        { x: 0, duration: 0.3, ease: 'elastic.out(1, 0.3)' }
      )
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Delete Month"
      subtitle="This action is permanent and cannot be undone"
      size="sm"
    >
      <div className="flex flex-col gap-5">

        {/* Danger block */}
        <div className="border border-expense/25 bg-expense-dim px-4 py-3.5 space-y-1.5">
          <div className="flex items-center gap-2">
            <Trash2 className="w-3.5 h-3.5 text-expense flex-shrink-0" />
            <p className="text-[0.75rem] font-bold text-expense uppercase tracking-[0.1em]">
              Permanent Deletion
            </p>
          </div>
          <p className="text-[0.72rem] text-expense/80 leading-relaxed">
            All income, bills, expenses, and misc entries for{' '}
            <span className="font-bold text-expense">{monthLabel}</span> will be
            permanently deleted. This cannot be recovered.
          </p>
        </div>

        {/* Type-to-confirm */}
        <div className="flex flex-col gap-2">
          <label className="text-[0.65rem] font-bold text-text-faint uppercase tracking-[0.15em]">
            Type <span className="text-text font-mono">{monthLabel}</span> to confirm
          </label>
          <input
            ref={inputRef}
            value={typed}
            onChange={e => setTyped(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={monthLabel}
            className={`
              h-10 bg-bg-overlay border px-3.5 text-sm font-mono
              text-text placeholder:text-text-faint outline-none transition-all duration-150
              focus:ring-1
              ${confirmed
                ? 'border-expense/60 focus:border-expense focus:ring-expense/15'
                : 'border-border-light focus:border-brand focus:ring-brand/15'}
            `}
          />
          {typed.length > 0 && !confirmed && (
            <p className="text-[0.7rem] text-text-faint font-mono">
              {monthLabel.length - typed.length} character{monthLabel.length - typed.length !== 1 ? 's' : ''} remaining
            </p>
          )}
          {confirmed && (
            <p className="text-[0.7rem] text-expense flex items-center gap-1.5">
              <span className="w-3 h-3 inline-flex items-center justify-center border border-expense/40 text-[8px]">!</span>
              Press Enter or click Delete to confirm
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <button
            ref={btnRef}
            onClick={handleDelete}
            disabled={!confirmed || loading}
            className={`
              flex-1 h-10 flex items-center justify-center gap-2
              text-[0.75rem] font-bold uppercase tracking-[0.1em] transition-all duration-150
              ${confirmed
                ? 'bg-expense text-white hover:opacity-90 active:scale-[0.97]'
                : 'bg-expense-dim text-expense/40 border border-expense/15 cursor-not-allowed'}
            `}
          >
            {loading
              ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Trash2 className="w-3.5 h-3.5" /> Delete</>}
          </button>
        </div>
      </div>
    </Modal>
  )
}
