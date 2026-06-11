'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) router.push('/auth')
    })
    return () => subscription.unsubscribe()
  }, [router])

  async function signIn(email: string, password: string): Promise<string | null> {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password })
    if (error) return error.message
    router.push('/dashboard')
    return null
  }

  async function signOut() {
    await getSupabase().auth.signOut()
    router.push('/auth')
  }

  return { session, loading, signIn, signOut }
}