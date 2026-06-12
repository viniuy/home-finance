'use client'
import { useReducer, useEffect, useRef } from 'react'
import { Calculator as CalcIcon, X, Delete } from 'lucide-react'
import gsap from 'gsap'

// ── State ─────────────────────────────────────────────────────
interface CalcState {
  display:           string
  expression:        string
  prevValue:         number | null
  operator:          string | null
  justEvaluated:     boolean
  waitingForOperand: boolean   
}

type CalcAction =
  | { type: 'DIGIT';    digit: string }
  | { type: 'DECIMAL'                 }
  | { type: 'OPERATOR'; op: string   }
  | { type: 'EQUALS'                  }
  | { type: 'CLEAR'                   }
  | { type: 'TOGGLE_SIGN'             }
  | { type: 'PERCENT'                 }
  | { type: 'BACKSPACE'               }

function calculate(a: number, b: number, op: string): number {
  switch (op) {
    case '+': return a + b
    case '−': return a - b
    case '×': return a * b
    case '÷': return b !== 0 ? a / b : 0
    default:  return b
  }
}

function fmt(n: number): string {
  const s = parseFloat(n.toFixed(10))
  return isNaN(s) ? '0' : String(s)
}

const INIT: CalcState = {
  display: '0', expression: '', prevValue: null,
  operator: null, justEvaluated: false, waitingForOperand: false,
}

function reducer(state: CalcState, action: CalcAction): CalcState {
  const { display, prevValue, operator, justEvaluated } = state
  const current = parseFloat(display)

  switch (action.type) {

    case 'DIGIT': {
      if (state.waitingForOperand || justEvaluated) {
        return { ...state, display: action.digit, justEvaluated: false, waitingForOperand: false }
      }
      if (display === '0') return { ...state, display: action.digit }
      if (display.replace('-', '').length >= 12) return state
      return { ...state, display: display + action.digit }
    }

    case 'DECIMAL': {
      if (state.waitingForOperand || justEvaluated) {
        return { ...state, display: '0.', justEvaluated: false, waitingForOperand: false }
      }
      if (display.includes('.')) return state
      return { ...state, display: display + '.', justEvaluated: false }
    }

    case 'OPERATOR': {
      const { op } = action
      if (prevValue != null && !justEvaluated && !state.waitingForOperand) {
        const result = calculate(prevValue, current, operator!)
        return {
          ...state,
          display:           fmt(result),
          expression:        `${fmt(result)} ${op}`,
          prevValue:         result,
          operator:          op,
          justEvaluated:     false,
          waitingForOperand: true,   // ← key fix
        }
      }
      return {
        ...state,
        expression:        `${display} ${op}`,
        prevValue:         current,
        operator:          op,
        justEvaluated:     false,
        waitingForOperand: true,     // ← key fix
      }
    }

    case 'EQUALS': {
      if (!operator || prevValue == null) return state
      const result = calculate(prevValue, current, operator)
      return {
        display:       fmt(result),
        expression:    `${fmt(prevValue)} ${operator} ${display} =`,
        prevValue:     null,
        operator:      null,
        justEvaluated: true,
        waitingForOperand: false,
      }
    }

    case 'CLEAR':
      return INIT

    case 'TOGGLE_SIGN':
      return { ...state, display: fmt(current * -1), waitingForOperand: false }

    case 'PERCENT':
      return { ...state, display: fmt(current / 100), waitingForOperand: false }

    case 'BACKSPACE': {
      if (justEvaluated) return { ...state, display: '0', justEvaluated: false }
      if (display.length === 1 || (display.length === 2 && display.startsWith('-'))) {
        return { ...state, display: '0', waitingForOperand: false }
      }
      return { ...state, display: display.slice(0, -1), waitingForOperand: false }
    }

    default: return state
  }
}

// ── Button grid config ────────────────────────────────────────
type BtnCfg = { label: string; action: CalcAction; style?: string; wide?: boolean }

const BUTTONS: BtnCfg[][] = [
  [
    { label: 'C',  action: { type: 'CLEAR' },        style: 'fn' },
    { label: '±',  action: { type: 'TOGGLE_SIGN' },  style: 'fn' },
    { label: '%',  action: { type: 'PERCENT' },       style: 'fn' },
    { label: '÷',  action: { type: 'OPERATOR', op: '÷' }, style: 'op' },
  ],
  [
    { label: '7', action: { type: 'DIGIT', digit: '7' } },
    { label: '8', action: { type: 'DIGIT', digit: '8' } },
    { label: '9', action: { type: 'DIGIT', digit: '9' } },
    { label: '×', action: { type: 'OPERATOR', op: '×' }, style: 'op' },
  ],
  [
    { label: '4', action: { type: 'DIGIT', digit: '4' } },
    { label: '5', action: { type: 'DIGIT', digit: '5' } },
    { label: '6', action: { type: 'DIGIT', digit: '6' } },
    { label: '−', action: { type: 'OPERATOR', op: '−' }, style: 'op' },
  ],
  [
    { label: '1', action: { type: 'DIGIT', digit: '1' } },
    { label: '2', action: { type: 'DIGIT', digit: '2' } },
    { label: '3', action: { type: 'DIGIT', digit: '3' } },
    { label: '+', action: { type: 'OPERATOR', op: '+' }, style: 'op' },
  ],
  [
    { label: '⌫', action: { type: 'BACKSPACE' }, style: 'fn' },
    { label: '0', action: { type: 'DIGIT', digit: '0' } },
    { label: '.', action: { type: 'DECIMAL' } },
    { label: '=', action: { type: 'EQUALS' }, style: 'eq' },
  ],
]

// ── Display formatter ─────────────────────────────────────────
function formatDisplay(s: string): string {
  const [int, dec] = s.split('.')
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return dec !== undefined ? `${intFmt}.${dec}` : intFmt
}

// ── Component ─────────────────────────────────────────────────
export function Calculator() {
  const [open,  setOpen]  = useReducer((v: boolean) => !v, false)
  const [state, dispatch] = useReducer(reducer, INIT)

  const panelRef = useRef<HTMLDivElement>(null)
  const fabRef   = useRef<HTMLButtonElement>(null)
  const isOpen   = open

  /* GSAP open/close */
  const prevOpen = useRef(false)
  useEffect(() => {
    if (!panelRef.current) return
    if (isOpen && !prevOpen.current) {
      gsap.fromTo(panelRef.current,
        { y: 16, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.22, ease: 'power2.out' }
      )
    }
    prevOpen.current = isOpen
  }, [isOpen])

  function handleClose() {
    if (!panelRef.current) { setOpen(); return }
    gsap.to(panelRef.current, {
      y: 10, opacity: 0, scale: 0.97, duration: 0.15,
      onComplete: setOpen,
    })
  }

  /* Keyboard support */
  useEffect(() => {
    if (!isOpen) return
    function handler(e: KeyboardEvent) {
      const key = e.key
      if (key >= '0' && key <= '9')   { dispatch({ type: 'DIGIT',    digit: key }) }
      else if (key === '.')            { dispatch({ type: 'DECIMAL' }) }
      else if (key === '+')            { dispatch({ type: 'OPERATOR', op: '+' }) }
      else if (key === '-')            { dispatch({ type: 'OPERATOR', op: '−' }) }
      else if (key === '*')            { dispatch({ type: 'OPERATOR', op: '×' }) }
      else if (key === '/')            { e.preventDefault(); dispatch({ type: 'OPERATOR', op: '÷' }) }
      else if (key === 'Enter' || key === '=') { dispatch({ type: 'EQUALS' }) }
      else if (key === 'Backspace')    { dispatch({ type: 'BACKSPACE' }) }
      else if (key === 'Escape')       { handleClose() }
      else if (key === 'c' || key === 'C') { dispatch({ type: 'CLEAR' }) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen])

  const btnBase = `
    flex items-center justify-center text-sm font-semibold
    transition-all duration-100 active:scale-95 select-none cursor-pointer
    h-12 rounded-[var(--radius)]
  `
  const btnStyles: Record<string, string> = {
    default: 'bg-bg-overlay text-text hover:bg-bg-overlay/70 border border-border/50',
    fn:      'bg-bg-overlay/60 text-text-muted hover:bg-bg-overlay border border-border/50',
    op:      'bg-brand/10 text-brand hover:bg-brand/20 border border-brand/20 font-bold',
    eq:      'bg-brand text-white hover:opacity-90 font-bold shadow-sm',
  }

  return (
    <>
      {/* ── Floating panel ──────────────────────── */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed bottom-20 right-5 z-50 w-72 bg-bg-raised border border-border shadow-modal overflow-hidden rounded-[var(--radius)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-overlay/50">
            <div className="flex items-center gap-2 text-text-faint">
              <CalcIcon className="w-3 h-3" />
              <span className="text-[0.62rem] font-bold uppercase tracking-[0.18em]">Calculator</span>
            </div>
            <button
              onClick={handleClose}
              className="w-6 h-6 flex items-center justify-center text-text-faint hover:text-text hover:bg-bg-overlay transition-colors rounded-[var(--radius)]"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Display */}
          <div className="px-4 pt-4 pb-3 text-right">
            {/* Expression */}
            <p className="text-[0.68rem] text-text-faint font-mono min-h-[1rem] truncate">
              {state.expression || '\u00A0'}
            </p>
            {/* Main display */}
            <p className="text-[2rem] font-mono font-bold text-text tabular-nums leading-tight mt-0.5 truncate">
              {formatDisplay(state.display)}
            </p>
          </div>

          {/* Buttons */}
          <div className="px-3 pb-3 grid grid-cols-4 gap-1.5">
            {BUTTONS.flat().map((btn, i) => (
              <button
                key={i}
                onClick={() => dispatch(btn.action)}
                className={`${btnBase} ${btnStyles[btn.style ?? 'default']}`}
              >
                {btn.label === '⌫'
                  ? <Delete className="w-4 h-4" />
                  : btn.label}
              </button>
            ))}
          </div>

          {/* Keyboard hint */}
          <p className="text-center text-[0.6rem] text-text-faint pb-2.5 tracking-wider">
            keyboard supported — esc to close
          </p>
        </div>
      )}

      {/* ── FAB ─────────────────────────────────── */}
      <button
        ref={fabRef}
        onClick={isOpen ? handleClose : setOpen}
        className={`
          fixed bottom-5 right-5 z-50 w-12 h-12 flex items-center justify-center
          border shadow-modal transition-all duration-200
          rounded-[var(--radius)]
          ${isOpen
            ? 'bg-brand text-white border-brand/40 scale-95'
            : 'bg-bg-raised text-text-muted border-border hover:text-brand hover:border-brand/40 hover:bg-[oklch(from_var(--brand)_l_c_h_/_0.07)]'}
        `}
        title="Calculator (or press C)"
      >
        {isOpen ? <X className="w-4 h-4" /> : <CalcIcon className="w-4 h-4" />}
      </button>
    </>
  )
}
