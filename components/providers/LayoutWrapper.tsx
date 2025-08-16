'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/organisms/Sidebar'
import { AuthGuard } from '@/components/providers/AuthGuard'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Pages that don't need sidebar
  const authPages = ['/auth/login', '/auth/signup']
  const isAuthPage = authPages.includes(pathname)

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-background">
        <AuthGuard>
          {children}
        </AuthGuard>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <AuthGuard>
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </AuthGuard>
    </div>
  )
}