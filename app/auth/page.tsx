'use client'
import { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import gsap from 'gsap'
import { useAuth } from '@/hooks/UserAuth'

type AuthPhase = 'idle' | 'authenticating' | 'success' | 'error'

const SCAN_LINES = [
  'Establishing secure channel...',
  'Verifying credentials...',
  'Loading household data...',
  'Access granted.',
]

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export default function AuthPage() {
  const { signIn } = useAuth()

  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [emailError,  setEmailError]  = useState('')
  const [serverError, setServerError] = useState('')
  const [phase,       setPhase]       = useState<AuthPhase>('idle')
  const [scanIdx,     setScanIdx]     = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const logoRef      = useRef<HTMLDivElement>(null)
  const cardRef      = useRef<HTMLDivElement>(null)
  const fieldsRef    = useRef<HTMLFormElement>(null)
  const scanRef      = useRef<HTMLDivElement>(null)
  const btnRef       = useRef<HTMLButtonElement>(null)

  /* ── Mount animation ──────────────────────────── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline()
      tl.from(logoRef.current,   { y: -20, opacity: 0, duration: 0.5, ease: 'power3.out' })
        .from(cardRef.current,   { y: 24,  opacity: 0, duration: 0.5, ease: 'power3.out' }, '-=0.2')
        .from(fieldsRef.current?.children ?? [], {
          y: 12, opacity: 0, duration: 0.35, stagger: 0.08, ease: 'power2.out',
        }, '-=0.25')
    }, containerRef)
    return () => ctx.revert()
  }, [])

  /* ── Scan line ticker during auth ─────────────── */
  useEffect(() => {
    if (phase !== 'authenticating') return
    const id = setInterval(() => {
      setScanIdx(i => (i < SCAN_LINES.length - 1 ? i + 1 : i))
    }, 600)
    return () => clearInterval(id)
  }, [phase])

  /* ── Real-time email validation ───────────────── */
  function handleEmailChange(v: string) {
    setEmail(v)
    if (v && !isValidEmail(v)) {
      setEmailError('Enter a valid email address')
    } else {
      setEmailError('')
    }
  }

  /* ── Submit ───────────────────────────────────── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValidEmail(email)) { setEmailError('Enter a valid email address'); return }
    if (!password)            { return }

    setServerError('')
    setPhase('authenticating')
    setScanIdx(0)

    /* Button compress */
    gsap.to(btnRef.current, { scaleX: 0.97, scaleY: 0.96, duration: 0.1 })

    const err = await signIn(email.trim(), password)

    if (err) {
      setPhase('error')
      setServerError(err)
      gsap.to(btnRef.current, { scaleX: 1, scaleY: 1, duration: 0.2 })
      gsap.fromTo(cardRef.current,
        { x: -6 },
        { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' }
      )
    } else {
      setPhase('success')
    }
  }

  const isLoading = phase === 'authenticating'

  return (
    <div ref={containerRef} className="min-h-screen bg-bg flex items-center justify-center px-4 overflow-hidden">

      {/* Grid texture */}
      <div className="fixed inset-0 pointer-events-none auth-grid opacity-40" />

      {/* Brand glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 55% 45% at 50% 40%, oklch(from var(--brand) l c h / 0.07), transparent 70%)' }}
      />

      <div className="relative w-full max-w-[400px] space-y-6">

        {/* ── Logo ────────────────────────────────── */}
        <div ref={logoRef} className="flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 border border-brand/30 flex items-center justify-center relative"
            style={{ background: 'oklch(from var(--brand) l c h / 0.08)' }}
          >
            <span className="text-3xl select-none">🏠</span>
            {/* Corner accents */}
            <span className="absolute top-0    left-0  w-2 h-2 border-t border-l border-brand/60" />
            <span className="absolute top-0    right-0 w-2 h-2 border-t border-r border-brand/60" />
            <span className="absolute bottom-0 left-0  w-2 h-2 border-b border-l border-brand/60" />
            <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-brand/60" />
          </div>
          <div className="text-center">
            <h1 className="text-[1.3rem] font-bold text-text tracking-[0.06em] uppercase">Mikay Pay Later</h1>
            <p className="text-[0.7rem] text-text-faint mt-1 tracking-[0.2em] uppercase">
              Family Finance Tracker
            </p>
          </div>
        </div>

        {/* ── Card ────────────────────────────────── */}
        <div ref={cardRef} className="bg-bg-raised border border-border shadow-modal overflow-hidden">

          {/* Header bar */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <p className="text-[0.62rem] font-semibold text-text-faint uppercase tracking-[0.18em]">
                Auth Terminal
              </p>
              <p className="text-[0.82rem] font-semibold text-text mt-0.5">
                {phase === 'success' ? 'Access Granted' : 'Awaiting Credentials'}
              </p>
            </div>
            {/* Status dot */}
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${
                phase === 'error' ? 'bg-expense' :
                phase === 'success' ? 'bg-income' :
                isLoading ? 'bg-pending animate-pulse' : 'bg-brand animate-pulse'
              }`} />
              <span className="text-[0.65rem] text-text-faint uppercase tracking-widest">
                {phase === 'error' ? 'Failed' :
                 phase === 'success' ? 'OK' :
                 isLoading ? 'Auth...' : 'Ready'}
              </span>
            </div>
          </div>

          {/* Scan overlay while authenticating */}
          {isLoading && (
            <div ref={scanRef} className="relative overflow-hidden px-6 py-5 border-b border-border bg-bg-overlay/60">
              <div className="scan-line" />
              <p className="text-[0.7rem] text-text-faint uppercase tracking-[0.15em] mb-2">
                System Output
              </p>
              {SCAN_LINES.slice(0, scanIdx + 1).map((line, i) => (
                <p
                  key={i}
                  className={`text-xs font-mono flex items-center gap-2 ${
                    i === scanIdx ? 'text-brand' : 'text-text-faint'
                  }`}
                >
                  <span className="text-text-faint">{String(i + 1).padStart(2, '0')}</span>
                  {line}
                  {i === scanIdx && (
                    <span style={{ animation: 'blink 0.8s step-end infinite' }} className="inline-block w-[6px] h-[13px] bg-brand ml-0.5" />
                  )}
                </p>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} ref={fieldsRef} className="px-6 py-5 flex flex-col gap-5">

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.65rem] font-semibold text-text-faint uppercase tracking-[0.15em]">
                Email Address
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="family@example.com"
                value={email}
                onChange={e => handleEmailChange(e.target.value)}
                disabled={isLoading}
                className={`
                  h-10 bg-bg-overlay border px-3.5 text-sm text-text
                  placeholder:text-text-faint outline-none transition-all duration-150
                  focus:border-brand focus:ring-1 focus:ring-brand/20
                  disabled:opacity-40
                  ${emailError ? 'border-expense/60 focus:border-expense' : 'border-border-light'}
                `}
              />
              {emailError && (
                <p className="text-[0.72rem] text-expense flex items-center gap-1.5">
                  <span className="w-3 h-3 inline-flex items-center justify-center border border-expense/40 text-[8px]">!</span>
                  {emailError}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.65rem] font-semibold text-text-faint uppercase tracking-[0.15em]">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="
                    w-full h-10 bg-bg-overlay border border-border-light px-3.5 pr-10
                    text-sm text-text placeholder:text-text-faint
                    outline-none transition-all duration-150
                    focus:border-brand focus:ring-1 focus:ring-brand/20
                    disabled:opacity-40
                  "
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-muted transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Server error */}
            {phase === 'error' && serverError && (
              <div className="border border-expense/25 bg-expense-dim px-3.5 py-3 flex items-start gap-2.5">
                <span className="text-expense text-xs mt-0.5 font-mono">[ERR]</span>
                <p className="text-[0.78rem] text-expense leading-relaxed">{serverError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              ref={btnRef}
              type="submit"
              disabled={isLoading || !!emailError || !email || !password}
              className="
                mt-1 h-11 w-full bg-brand text-white text-[0.8rem] font-bold
                tracking-[0.12em] uppercase transition-all duration-150
                hover:opacity-90 active:scale-[0.98]
                disabled:opacity-40 disabled:cursor-not-allowed
                flex items-center justify-center gap-2.5 relative overflow-hidden
              "
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="font-mono tracking-wider">Authenticating</span>
                  <span style={{ animation: 'blink 0.8s step-end infinite' }} className="w-[6px] h-[14px] bg-white/80 inline-block" />
                </>
              ) : (
                '[ Sign In ]'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[0.68rem] text-text-faint tracking-[0.1em] uppercase">
          Family access only — contact the admin for an account
        </p>
      </div>
    </div>
  )
}
