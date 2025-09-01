// API route to generate Zoom SDK join signatures
import type { NextApiRequest, NextApiResponse } from 'next'
import { zoomService } from '@/lib/zoomService'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { meetingNumber, role = 0 } = req.body

    if (!meetingNumber) {
      return res.status(400).json({ error: 'Missing required field: meetingNumber' })
    }

    console.log('🔐 API: Generating join signature for meeting:', meetingNumber)

    const signatureData = zoomService.generateJoinSignature(meetingNumber.toString(), role)

    console.log('✅ API: Join signature generated successfully')

    res.status(200).json({
      success: true,
      signature: signatureData.signature,
      sdkKey: process.env.NEXT_PUBLIC_ZOOM_SDK_KEY
    })
  } catch (error: any) {
    console.error('❌ API: Error generating join signature:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate join signature'
    })
  }
}