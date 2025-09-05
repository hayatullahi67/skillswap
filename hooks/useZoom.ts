// Custom hook for managing Zoom meetings
import { useState, useCallback } from 'react'

interface ZoomMeetingData {
  id: string
  joinUrl: string
  password?: string
  topic: string
}

interface ZoomState {
  meeting: ZoomMeetingData | null
  isLoading: boolean
  error: string | null
}

export function useZoom() {
  const [state, setState] = useState<ZoomState>({
    meeting: null,
    isLoading: false,
    error: null
  })

  // Create a new Zoom meeting
  const createMeeting = useCallback(async (sessionId: string, hostUserId: string, topic?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      console.log('🎯 Creating Zoom meeting for session:', sessionId)

      const response = await fetch('/api/zoom/create-meeting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          hostUserId,
          topic
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to create meeting')
      }

      console.log('✅ Zoom meeting created:', data.meeting.id)

      setState(prev => ({
        ...prev,
        meeting: data.meeting,
        isLoading: false
      }))

      return data.meeting
    } catch (error: any) {
      console.error('❌ Error creating Zoom meeting:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to create meeting'
      }))
      throw error
    }
  }, [])



  // End a Zoom meeting
  const endMeeting = useCallback(async (meetingId: string) => {
    try {
      console.log('🛑 Ending Zoom meeting:', meetingId)

      const response = await fetch('/api/zoom/end-meeting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          meetingId
        })
      })

      const data = await response.json()

      if (!data.success) {
        console.warn('⚠️ Failed to end meeting:', data.error)
        // Don't throw error as meeting might already be ended
      } else {
        console.log('✅ Zoom meeting ended successfully')
      }

      setState(prev => ({
        ...prev,
        meeting: null
      }))
    } catch (error: any) {
      console.error('❌ Error ending Zoom meeting:', error)
      // Don't throw error as this is cleanup
    }
  }, [])

  // Create meeting (simplified - just returns meeting data)
  const startZoomSession = useCallback(async (sessionId: string, hostUserId: string, userName: string, topic?: string) => {
    try {
      const meeting = await createMeeting(sessionId, hostUserId, topic)
      return { meeting }
    } catch (error) {
      console.error('❌ Error starting Zoom session:', error)
      throw error
    }
  }, [createMeeting])

  const handleError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error }))
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    // State
    meeting: state.meeting,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    createMeeting,
    endMeeting,
    startZoomSession,
    handleError,
    clearError
  }
}