// API route to end Zoom meetings
import type { NextApiRequest, NextApiResponse } from 'next'
import { zoomService } from '@/lib/zoomService'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { meetingId } = req.body

    if (!meetingId) {
      return res.status(400).json({ error: 'Missing required field: meetingId' })
    }

    console.log('🛑 API: Ending Zoom meeting:', meetingId)

    await zoomService.endMeeting(meetingId)

    console.log('✅ API: Zoom meeting ended successfully')

    res.status(200).json({
      success: true,
      message: 'Meeting ended successfully'
    })
  } catch (error: any) {
    console.error('❌ API: Error ending Zoom meeting:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to end Zoom meeting'
    })
  }
}