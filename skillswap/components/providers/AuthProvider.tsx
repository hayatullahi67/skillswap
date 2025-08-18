'use client'

import { createContext, useContext, useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAppStore } from '@/lib/store'

const AuthContext = createContext({})

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, setUser, fetchProfile, fetchUserSkills, setLoading } = useAppStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        setLoading(true)

        // Get initial session
        const { data: { session } } = await supabase.auth.getSession()

        if (mounted) {
          if (session?.user) {
            setUser(session.user)
            // Fetch profile and skills in background, don't block UI
            fetchProfile().catch(console.error)
            fetchUserSkills().catch(console.error)
          } else {
            setUser(null)
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log('Auth state change:', event, session?.user?.email)

      if (session?.user) {
        setUser(session.user)

        // Fetch user data in background, don't block navigation
        fetchProfile().catch(console.error)
        fetchUserSkills().catch(console.error)


        // Redirect to dashboard if on auth page
        if (pathname === '/auth/login' || pathname === '/auth/signup' || pathname === '/') {
          console.log('Redirecting to dashboard after login from:', pathname)
          router.push('/dashboard')
        }
      } else {
        console.log('User signed out or no session')
        setUser(null)

        // Redirect to login if not on auth pages
        if (pathname !== '/auth/login' && pathname !== '/auth/signup') {
          console.log('Redirecting to login - no session')
          router.push('/auth/login')
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [setUser, fetchProfile, fetchUserSkills, setLoading, router, pathname])

  // Protect routes - redirect to login if not authenticated (removed duplicate logic)

  return (
    <AuthContext.Provider value={{}}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)