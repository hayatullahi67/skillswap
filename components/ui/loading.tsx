'use client'

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="text-muted-foreground">Loading...</span>
      </div>
    </div>
  )
}