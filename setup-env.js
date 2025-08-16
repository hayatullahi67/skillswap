// Quick setup script to check environment variables
console.log('Environment Variables Check:')
console.log('=================================')
console.log('NEXT_PUBLIC_KIRO_API_URL:', process.env.NEXT_PUBLIC_KIRO_API_URL)
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set ✅' : 'Missing ❌')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('=================================')

if (!process.env.NEXT_PUBLIC_KIRO_API_URL) {
  console.log('⚠️  NEXT_PUBLIC_KIRO_API_URL is not set!')
  console.log('Add this to your .env.local file:')
  console.log('NEXT_PUBLIC_KIRO_API_URL=http://localhost:3000/api')
}

if (!process.env.OPENAI_API_KEY) {
  console.log('⚠️  OPENAI_API_KEY is not set!')
  console.log('Add this to your .env.local file:')
  console.log('OPENAI_API_KEY=sk-your-openai-key-here')
}