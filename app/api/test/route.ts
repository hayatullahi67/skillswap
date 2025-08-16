import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      openAIKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 7) + '...' || 'Not set'
    }
  })
}

export async function POST() {
  return NextResponse.json({
    message: 'POST endpoint working!',
    received: 'OK'
  })
}