// Network utility functions for handling connectivity issues
export const isOnline = (): boolean => {
  if (typeof navigator !== 'undefined') {
    return navigator.onLine
  }
  return true // Assume online on server
}

export const waitForOnline = (): Promise<void> => {
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve()
      return
    }

    const handleOnline = () => {
      window.removeEventListener('online', handleOnline)
      resolve()
    }

    window.addEventListener('online', handleOnline)
  })
}

export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Wait for network to be online before attempting
      await waitForOnline()
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on certain errors
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase()
        if (errorMessage.includes('unauthorized') || 
            errorMessage.includes('forbidden') ||
            errorMessage.includes('not found')) {
          throw error
        }
      }

      if (i === maxRetries - 1) break

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000
      console.log(`Retry attempt ${i + 1}/${maxRetries} in ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

export const createNetworkAwareSupabaseCall = <T>(
  supabaseCall: () => Promise<T>
) => {
  return () => retryWithBackoff(supabaseCall, 3, 1000)
}