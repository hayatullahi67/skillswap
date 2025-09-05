// Diagnostic utilities for debugging Supabase connection issues

export const runSupabaseDiagnostics = async () => {
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
      online: typeof navigator !== 'undefined' ? navigator.onLine : true
    },
    tests: {} as Record<string, any>
  }

  // Test 1: Basic URL validation
  try {
    if (results.environment.supabaseUrl) {
      new URL(results.environment.supabaseUrl)
      results.tests.urlValidation = { success: true }
    } else {
      results.tests.urlValidation = { success: false, error: 'Missing SUPABASE_URL' }
    }
  } catch (error) {
    results.tests.urlValidation = { success: false, error: 'Invalid URL format' }
  }

  // Test 2: DNS Resolution (basic fetch test)
  try {
    if (results.environment.supabaseUrl) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(`${results.environment.supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
        }
      })
      
      clearTimeout(timeoutId)
      results.tests.dnsResolution = { 
        success: true, 
        status: response.status,
        statusText: response.statusText 
      }
    }
  } catch (error: any) {
    results.tests.dnsResolution = { 
      success: false, 
      error: error.message,
      name: error.name 
    }
  }

  // Test 3: WebSocket connectivity test
  try {
    if (results.environment.supabaseUrl) {
      const wsUrl = results.environment.supabaseUrl.replace('https://', 'wss://') + '/realtime/v1/websocket'
      const ws = new WebSocket(`${wsUrl}?apikey=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}&vsn=1.0.0`)
      
      const wsTest = await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          ws.close()
          resolve({ success: false, error: 'WebSocket connection timeout' })
        }, 5000)

        ws.onopen = () => {
          clearTimeout(timeout)
          ws.close()
          resolve({ success: true })
        }

        ws.onerror = (error) => {
          clearTimeout(timeout)
          resolve({ success: false, error: 'WebSocket connection failed' })
        }
      })

      results.tests.websocketConnectivity = wsTest
    }
  } catch (error: any) {
    results.tests.websocketConnectivity = { 
      success: false, 
      error: error.message 
    }
  }

  return results
}

export const logDiagnostics = async () => {
  console.group('🔍 Supabase Connection Diagnostics')
  const results = await runSupabaseDiagnostics()
  console.table(results.environment)
  console.table(results.tests)
  console.groupEnd()
  return results
}