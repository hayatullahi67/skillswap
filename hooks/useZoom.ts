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
  signature: string | null
  isLoading: boolean
  isJoined: boolean
  error: string | null
}

export function useZoom() {
  const [state, setState] = useState<ZoomState>({
    meeting: null,
    signature: null,
    isLoading: false,
    isJoined: false,
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

  // Generate join signature for a meeting
  const generateJoinSignature = useCallback(async (meetingId: string, role: number = 0) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      console.log('🔐 Generating join signature for meeting:', meetingId)

      const response = await fetch('/api/zoom/join-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          meetingNumber: meetingId,
          role
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate signature')
      }

      console.log('✅ Join signature generated')

      setState(prev => ({
        ...prev,
        signature: data.signature,
        isLoading: false
      }))

      return data.signature
    } catch (error: any) {
      console.error('❌ Error generating join signature:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to generate signature'
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
        meeting: null,
        signature: null,
        isJoined: false
      }))
    } catch (error: any) {
      console.error('❌ Error ending Zoom meeting:', error)
      // Don't throw error as this is cleanup
    }
  }, [])

  // Create meeting and generate signature in one call
  const startZoomSession = useCallback(async (sessionId: string, hostUserId: string, userName: string, topic?: string) => {
    try {
      // Step 1: Create meeting
      const meeting = await createMeeting(sessionId, hostUserId, topic)
      
      // Step 2: Generate signature
      const signature = await generateJoinSignature(meeting.id, 0) // 0 = participant
      
      return {
        meeting,
        signature
      }
    } catch (error) {
      console.error('❌ Error starting Zoom session:', error)
      throw error
    }
  }, [createMeeting, generateJoinSignature])

  // Handle join/leave events
  const handleJoin = useCallback(() => {
    setState(prev => ({ ...prev, isJoined: true }))
  }, [])

  const handleLeave = useCallback(() => {
    setState(prev => ({ ...prev, isJoined: false }))
  }, [])

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
    signature: state.signature,
    isLoading: state.isLoading,
    isJoined: state.isJoined,
    error: state.error,

    // Actions
    createMeeting,
    generateJoinSignature,
    endMeeting,
    startZoomSession,
    handleJoin,
    handleLeave,
    handleError,
    clearError
  }
}