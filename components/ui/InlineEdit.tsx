'use client'
import { useState, useRef, useEffect } from 'react'
import { cn, formatPeso } from '@/lib/utils'

interface InlineEditProps {
  value:        number | null
  onSave:       (v: number) => Promise<void>
  className?:   string
  placeholder?: string
  pending?:     boolean
}

export function InlineEdit({ value, onSave, className, placeholder = '—', pending }: InlineEditProps) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(value != null ? String(value) : '')
      setTimeout(() => inputRef.current?.select(), 10)
    }
  }, [editing, value])

  async function commit() {
    const parsed = parseFloat(draft)
    if (!isNaN(parsed) && parsed >= 0) {
      setSaving(true)
      await onSave(parsed)
      setSaving(false)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[0.7rem] text-text-faint font-mono select-none">₱</span>
        <input
          ref={inputRef}
          type="number"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter')  commit()
            if (e.key === 'Escape') setEditing(false)
          }}
          onBlur={commit}
          className="
            w-28 h-7 bg-bg-raised border border-brand px-2.5 text-right
            text-sm font-mono text-text outline-none focus:ring-1 focus:ring-brand/20
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
            [&::-webkit-inner-spin-button]:appearance-none
          "
        />
        {saving && (
          <span className="w-3.5 h-3.5 border-2 border-brand/30 border-t-brand rounded-full animate-spin flex-shrink-0" />
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title={pending ? 'Click to update this bill' : 'Click to edit'}
      className={cn(
        'group flex items-center gap-1.5 px-2 py-1 transition-colors',
        'hover:bg-brand/8 hover:text-brand',
        pending ? 'text-pending' : 'text-text',
        className
      )}
    >
      <span className="text-sm font-mono tabular-nums">
        {value != null ? formatPeso(value) : (
          <span className="text-text-faint text-xs italic">{placeholder}</span>
        )}
      </span>
      {pending && (
        <span className="text-[0.6rem] bg-pending-dim text-pending border border-pending/25 px-1.5 py-0.5 font-bold tracking-widest uppercase">
          UPD
        </span>
      )}
    </button>
  )
}
