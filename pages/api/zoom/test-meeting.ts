import { NextApiRequest, NextApiResponse } from 'next'
import { zoomService } from '../../../lib/zoomService'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🧪 Testing Zoom API integration...')

    // Create a test meeting
    const meeting = await zoomService.createMeeting(
      'test-session-123',
      'test-user',
      'SkillSwap Test Meeting'
    )

    console.log('✅ Test meeting created successfully!')

    res.status(200).json({
      success: true,
      meeting: {
        id: meeting.id,
        join_url: meeting.join_url,
        password: meeting.password,
        topic: meeting.topic
      },
      message: 'Zoom API is working! Users can click the join_url to join the meeting.'
    })

  } catch (error) {
    console.error('❌ Zoom API test failed:', error)
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Check your Zoom credentials and make sure the Server-to-Server OAuth app has the required scopes.'
    })
  }
}