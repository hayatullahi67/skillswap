'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { LoadingSpinner } from '@/components/ui/loading'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAppStore()
  const router = useRouter()
  const pathname = usePathname()

  const authPages = ['/auth/login', '/auth/signup']
  const isAuthPage = authPages.includes(pathname)

  useEffect(() => {
    if (!loading) {
      if (!user && !isAuthPage) {
        router.push('/auth/login')
      } else if (user && isAuthPage) {
        router.push('/dashboard')
      }
    }
  }, [user, loading, isAuthPage, router])

  if (loading) {
    return <LoadingSpinner />
  }

  // Show auth pages even if not logged in
  if (isAuthPage) {
    return <>{children}</>
  }

  // Show protected pages only if logged in
  if (user) {
    return <>{children}</>
  }

  // Redirect to login if not authenticated
  return <LoadingSpinner />
}