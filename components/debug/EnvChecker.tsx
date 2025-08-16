'use client'

export function EnvChecker() {
  const envVars = {
    NEXT_PUBLIC_KIRO_API_URL: process.env.NEXT_PUBLIC_KIRO_API_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NODE_ENV: process.env.NODE_ENV
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-sm">
      <h3 className="font-bold mb-2">Environment Variables</h3>
      {Object.entries(envVars).map(([key, value]) => (
        <div key={key} className="mb-1">
          <span className="text-gray-300">{key}:</span>{' '}
          <span className={value ? 'text-green-400' : 'text-red-400'}>
            {value || 'undefined'}
          </span>
        </div>
      ))}
    </div>
  )
}