'use client'
import { useState } from 'react'
import { RotateCcw, RefreshCw, AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/Primitives'
import { Button } from '@/components/ui/button'

interface ResetMonthModalProps {
  open:       boolean
  onClose:    () => void
  monthLabel: string
  onReset:    (withNewTemplate: boolean) => Promise<void>
}

type ResetMode = null | 'plain' | 'template'

export function ResetMonthModal({ open, onClose, monthLabel, onReset }: ResetMonthModalProps) {
  const [mode,    setMode]    = useState<ResetMode>(null)
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    if (!mode) return
    setLoading(true)
    await onReset(mode === 'template')
    setLoading(false)
    setMode(null)
    onClose()
  }

  function handleClose() {
    if (loading) return
    setMode(null)
    onClose()
  }

  const options: { id: ResetMode; Icon: React.ElementType; label: string; description: string }[] = [
    {
      id: 'plain',
      Icon: RotateCcw,
      label: 'Plain Reset',
      description:
        'Clears all logged expenses, misc entries, and variable bill amounts. Income and fixed bills stay untouched. Use this to re-log the month from scratch.',
    },
    {
      id: 'template',
      Icon: RefreshCw,
      label: 'Reset + Sync Templates',
      description:
        'Same as plain reset, but also syncs bills and expense rows with your current Setup — adds newly created templates and removes ones you\'ve since deleted or disabled.',
    },
  ]

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Reset Month"
      subtitle={monthLabel}
      size="md"
    >
      <div className="flex flex-col gap-4">

        {/* Warning */}
        <div className="flex items-start gap-2.5 bg-pending-dim border border-pending/25 px-3.5 py-3">
          <AlertTriangle className="w-3.5 h-3.5 text-pending flex-shrink-0 mt-0.5" />
          <p className="text-[0.75rem] text-text-muted leading-relaxed">
            This cannot be undone. All cleared data will be permanently lost.
          </p>
        </div>

        {/* Mode options */}
        <div className="flex flex-col gap-2">
          {options.map(({ id, Icon, label, description }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              disabled={loading}
              className={`
                w-full text-left px-4 py-3.5 border transition-all duration-150
                flex items-start gap-3.5 group
                ${mode === id
                  ? 'border-brand bg-[oklch(from_var(--brand)_l_c_h_/_0.07)] text-text'
                  : 'border-border bg-bg-overlay hover:border-brand/40 hover:bg-[oklch(from_var(--brand)_l_c_h_/_0.03)]'}
              `}
            >
              {/* Selection indicator */}
              <div className={`
                mt-0.5 w-4 h-4 flex-shrink-0 border-2 flex items-center justify-center transition-colors
                ${mode === id ? 'border-brand' : 'border-border-light group-hover:border-brand/40'}
              `}>
                {mode === id && (
                  <span className="w-2 h-2 bg-brand block" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${mode === id ? 'text-brand' : 'text-text-faint'}`} />
                  <span className={`text-[0.75rem] font-bold uppercase tracking-[0.1em] ${mode === id ? 'text-brand' : 'text-text'}`}>
                    {label}
                  </span>
                </div>
                <p className="text-[0.72rem] text-text-muted leading-relaxed">{description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={mode ? 'primary' : 'secondary'}
            className="flex-1"
            disabled={!mode}
            loading={loading}
            onClick={handleConfirm}
          >
            {mode === 'plain' ? 'Reset Month' : mode === 'template' ? 'Reset + Sync' : 'Select an option'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
