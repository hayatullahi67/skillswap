// API route to create Zoom meetings
import type { NextApiRequest, NextApiResponse } from 'next'
import { zoomService } from '@/lib/zoomService'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { sessionId, hostUserId, topic } = req.body

    if (!sessionId || !hostUserId) {
      return res.status(400).json({ error: 'Missing required fields: sessionId, hostUserId' })
    }

    console.log('📞 API: Creating Zoom meeting for session:', sessionId)

    const meeting = await zoomService.createMeeting(
      sessionId,
      hostUserId,
      topic || `SkillSwap Coding Session ${sessionId}`
    )

    console.log('✅ API: Zoom meeting created successfully:', meeting.id)

    res.status(200).json({
      success: true,
      meeting: {
        id: meeting.id,
        joinUrl: meeting.join_url,
        password: meeting.password,
        topic: meeting.topic
      }
    })
  } catch (error: any) {
    console.error('❌ API: Error creating Zoom meeting:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create Zoom meeting'
    })
  }
}