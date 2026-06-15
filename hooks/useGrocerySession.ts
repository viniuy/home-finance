'use client'
import { useState, useEffect, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────
export type GroceryCategory =
  | 'Frozen Food' | 'Vegetables' | 'Meat' | 'Snacks'
  | 'Laundry' | 'Kitchen Essential' | 'Dogs' | 'Home Cleaning'
  | 'Vincent' | 'Aiden' | 'Karen' | 'Lola' | 'Ailene' | 'Mikay'

export interface GroceryItem {
  id:       string
  amount:   number
  category: GroceryCategory
  name:     string   // optional, blank by default
  addedAt:  number
}

export interface GrocerySession {
  budget:    number
  items:     GroceryItem[]
  startedAt: number
}

const STORAGE_KEY = 'mpl-grocery-session'

function loadSession(): GrocerySession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveSession(s: GrocerySession | null) {
  if (typeof window === 'undefined') return
  if (s === null) { localStorage.removeItem(STORAGE_KEY); return }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

export function useGrocerySession() {
  const [session, setSession] = useState<GrocerySession | null>(null)
  const [loaded,  setLoaded]  = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    setSession(loadSession())
    setLoaded(true)
  }, [])

  // Persist every change
  useEffect(() => {
    if (!loaded) return
    saveSession(session)
  }, [session, loaded])

  const startSession = useCallback((budget: number) => {
    const s: GrocerySession = { budget, items: [], startedAt: Date.now() }
    setSession(s)
  }, [])

  const addItem = useCallback((amount: number, category: GroceryCategory, name = '') => {
    const item: GroceryItem = {
      id:      `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      amount, category, name,
      addedAt: Date.now(),
    }
    setSession(prev => prev ? { ...prev, items: [...prev.items, item] } : prev)
  }, [])

  const removeItem = useCallback((id: string) => {
    setSession(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== id) } : prev)
  }, [])

  const updateItem = useCallback((id: string, patch: Partial<Pick<GroceryItem, 'name' | 'category'>>) => {
    setSession(prev => prev
      ? { ...prev, items: prev.items.map(i => i.id === id ? { ...i, ...patch } : i) }
      : prev
    )
  }, [])

  const voidSession = useCallback(() => {
    setSession(null)
  }, [])

  const total     = session?.items.reduce((s, i) => s + i.amount, 0) ?? 0
  const remaining = (session?.budget ?? 0) - total
  const isOver    = remaining < 0

  return {
    session, loaded,
    startSession, addItem, removeItem, updateItem, voidSession,
    total, remaining, isOver,
  }
}
