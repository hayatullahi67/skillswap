// Simplified Zoom API Service for creating meetings
export interface ZoomMeeting {
  id: string
  join_url: string
  password?: string
  host_id: string
  topic: string
  start_time: string
}

export class ZoomService {
  private static instance: ZoomService
  private accessToken: string | null = null
  private tokenExpiry: number = 0

  private constructor() {}

  static getInstance(): ZoomService {
    if (!ZoomService.instance) {
      ZoomService.instance = new ZoomService()
    }
    return ZoomService.instance
  }

  // Get OAuth access token for Zoom API
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    console.log('🔑 Getting new Zoom access token...')

    const accountId = process.env.ZOOM_ACCOUNT_ID
    const clientId = process.env.ZOOM_CLIENT_ID
    const clientSecret = process.env.ZOOM_CLIENT_SECRET

    if (!accountId || !clientId || !clientSecret) {
      throw new Error('Missing Zoom OAuth credentials')
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const response = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get Zoom access token: ${error}`)
    }

    const data = await response.json()
    this.accessToken = data.access_token
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000 // Refresh 1 minute early

    console.log('✅ Zoom access token obtained')
    
    if (!this.accessToken) {
      throw new Error('Failed to obtain access token from Zoom')
    }
    
    return this.accessToken
  }

  // Create a new Zoom meeting
  async createMeeting(sessionId: string, hostUserId: string, topic: string): Promise<ZoomMeeting> {
    try {
      console.log('🎯 Creating Zoom meeting for session:', sessionId)

      const accessToken = await this.getAccessToken()

      const meetingData = {
        topic: topic || `SkillSwap Coding Session ${sessionId}`,
        type: 1, // Instant meeting
        duration: 60, // 60 minutes
        timezone: 'UTC',
        settings: {
          host_video: true,
          participant_video: true,
          cn_meeting: false,
          in_meeting: false,
          join_before_host: true,
          mute_upon_entry: false,
          watermark: false,
          use_pmi: false,
          approval_type: 2, // No registration required
          audio: 'both', // Both telephony and VoIP
          auto_recording: 'none',
          enforce_login: false,
          registrants_email_notification: false,
          waiting_room: false,
          allow_multiple_devices: true
        }
      }

      const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingData)
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to create Zoom meeting: ${error}`)
      }

      const meeting = await response.json()
      console.log('✅ Zoom meeting created:', meeting.id)

      return {
        id: meeting.id.toString(),
        join_url: meeting.join_url,
        password: meeting.password,
        host_id: hostUserId,
        topic: meeting.topic,
        start_time: meeting.start_time
      }
    } catch (error) {
      console.error('❌ Error creating Zoom meeting:', error)
      throw error
    }
  }

  // Get meeting join URL (no SDK needed - users click link to join)
  getMeetingJoinUrl(meetingId: string, password?: string): string {
    const baseUrl = `https://zoom.us/j/${meetingId}`
    return password ? `${baseUrl}?pwd=${password}` : baseUrl
  }

  // End a Zoom meeting
  async endMeeting(meetingId: string): Promise<void> {
    try {
      console.log('🛑 Ending Zoom meeting:', meetingId)

      const accessToken = await this.getAccessToken()

      const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'end'
        })
      })

      if (!response.ok) {
        const error = await response.text()
        console.warn('⚠️ Failed to end Zoom meeting (may already be ended):', error)
        return // Don't throw error as meeting might already be ended
      }

      console.log('✅ Zoom meeting ended successfully')
    } catch (error) {
      console.error('❌ Error ending Zoom meeting:', error)
      // Don't throw error as this is cleanup
    }
  }

  // Get meeting details
  async getMeeting(meetingId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken()

      const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to get meeting details: ${error}`)
      }

      return await response.json()
    } catch (error) {
      console.error('❌ Error getting meeting details:', error)
      throw error
    }
  }
}

// Export singleton instance
export const zoomService = ZoomService.getInstance()