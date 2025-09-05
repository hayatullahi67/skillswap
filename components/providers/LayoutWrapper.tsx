'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/organisms/Sidebar'
import { AuthGuard } from '@/components/providers/AuthGuard'
// import { CallProvider } from '@/components/providers/CallProvider'
import NetworkStatus from '@/components/NetworkStatus'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Pages that don't need sidebar
  const authPages = ['/auth/login', '/auth/signup']
  const isAuthPage = pathname ? authPages.includes(pathname) : false

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-background">
        <NetworkStatus />
        <AuthGuard>
          {children}
        </AuthGuard>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <NetworkStatus />
      <AuthGuard>
        {/* <CallProvider> */}
          <Sidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        {/* </CallProvider> */}
      </AuthGuard>
    </div>
  )
}