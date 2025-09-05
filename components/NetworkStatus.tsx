'use client'

import { useState, useEffect } from 'react'
import { isOnline } from '@/lib/networkUtils'
import { checkSupabaseConnection } from '@/lib/supabaseClient'

export default function NetworkStatus() {
  const [isNetworkOnline, setIsNetworkOnline] = useState(true)
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(true)
  const [showStatus, setShowStatus] = useState(false)

  useEffect(() => {
    const checkConnectivity = async () => {
      const networkStatus = isOnline()
      setIsNetworkOnline(networkStatus)

      if (networkStatus) {
        try {
          const supabaseStatus = await checkSupabaseConnection()
          setIsSupabaseConnected(supabaseStatus)
        } catch (error) {
          setIsSupabaseConnected(false)
        }
      } else {
        setIsSupabaseConnected(false)
      }

      // Show status if there are issues
      setShowStatus(!networkStatus || !isSupabaseConnected)
    }

    // Initial check
    checkConnectivity()

    // Listen for network changes
    const handleOnline = () => {
      setIsNetworkOnline(true)
      checkConnectivity()
    }

    const handleOffline = () => {
      setIsNetworkOnline(false)
      setIsSupabaseConnected(false)
      setShowStatus(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Periodic connectivity check
    const interval = setInterval(checkConnectivity, 30000) // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  if (!showStatus) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white px-4 py-2 text-center text-sm">
      {!isNetworkOnline && (
        <span>🔴 No internet connection. Please check your network.</span>
      )}
      {isNetworkOnline && !isSupabaseConnected && (
        <span>🟡 Database connection issues. Retrying...</span>
      )}
    </div>
  )
}