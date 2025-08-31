'use client'

import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabaseClient'
import { IncomingCallOverlay } from '@/components/ui/incoming-call-overlay'
import { useModal } from '@/hooks/useModal'
import { getPeerClient } from '@/lib/peerClient'
import { initSupabaseSignaling } from '@/lib/simpleSignaling'
import { SupabaseSignaling } from '@/lib/supabaseSignaling'
import { Video, VideoOff, Mic, MicOff, PhoneOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

type IncomingCall = {
  sessionId: number
  learnerName: string
  skillName: string
  learnerId: string
  sessionMode?: string
}

type CallState = 'idle' | 'incoming' | 'connected' | 'ended'

interface CallContextType {
  incomingCall: IncomingCall | null
  callState: CallState
  acceptCall: () => void
  rejectCall: () => void
  endCall: () => void
  startOutgoingCall: (sessionId: string, sessionData: any) => Promise<void>
}

const CallContext = createContext<CallContextType | null>(null)

export function useCall() {
  const context = useContext(CallContext)
  if (!context) {
    throw new Error('useCall must be used within CallProvider')
  }
  return context
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const [callState, setCallState] = useState<CallState>('idle')
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [sessionPeerClient, setSessionPeerClient] = useState<any>(null)

  const { user } = useAppStore()
  const { showInfo, showWarning } = useModal()
  const router = useRouter()
  const ringAudioRef = useRef<HTMLAudioElement | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  // Lazy initialize peer client and signaling only when needed
  const [peerClient, setPeerClient] = useState<any>(null)
  const [globalSignaling, setGlobalSignaling] = useState<any>(null)

  // Function to initialize peer client only when needed
  const initializePeerClientWhenNeeded = async () => {
    if (peerClient) {
      return peerClient // Already initialized
    }

    console.log('🎤 Initializing peer client for call...')
    const newPeerClient = getPeerClient()
    
    // Initialize peer client with media access
    await newPeerClient.initialize()
    console.log('✅ Peer client initialized for call')

    // Set up incoming call handler
    newPeerClient.onIncomingCall((peerId: string, remoteStream: MediaStream) => {
      console.log('📹 GLOBAL: Received remote video stream from:', peerId)
      console.log('📹 Remote stream tracks:', {
        video: remoteStream.getVideoTracks().length,
        audio: remoteStream.getAudioTracks().length,
        streamId: remoteStream.id
      })

      setRemoteStream(remoteStream)
      setCallState('connected')
    })

    // Set up signaling
    newPeerClient.onSignal((peerId: string, signalData: any) => {
      console.log('📡 GLOBAL: Outgoing signal to peer:', peerId, signalData.type)
      // Socket signaling handles this automatically
    })

    setPeerClient(newPeerClient)
    return newPeerClient
  }

  // Initialize ring sound using Web Audio API
  useEffect(() => {
    const createRingSound = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

        const createBeep = () => {
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()

          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)

          oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.5)
        }

        // Create a ring pattern (beep every second)
        let ringInterval: NodeJS.Timeout

        ringAudioRef.current = {
          play: () => {
            createBeep()
            ringInterval = setInterval(createBeep, 1000)
            return Promise.resolve()
          },
          pause: () => {
            if (ringInterval) clearInterval(ringInterval)
          },
          currentTime: 0,
          loop: true,
          volume: 0.5
        } as any

      } catch (error) {
        console.log('Web Audio API not supported, using fallback')
        // Fallback to silent audio
        ringAudioRef.current = {
          play: () => Promise.resolve(),
          pause: () => { },
          currentTime: 0,
          loop: true,
          volume: 0.5
        } as any
      }
    }

    createRingSound()
  }, [])

  // Set up event listeners for peer connections
  useEffect(() => {
    console.log('🚀 Setting up CallProvider event listeners...')

    // Set up peer disconnection listeners
    const handlePeerDisconnected = async (event: any) => {
      const { peerId, reason } = event.detail
      console.log('🔌 Peer disconnected:', peerId, 'reason:', reason)
      
      if (callState === 'connected' && currentSession) {
        const expectedPeerId = currentSession.learner_id === user?.id 
          ? `${currentSession.host_id}-session-${currentSession.id}`
          : `${currentSession.learner_id}-session-${currentSession.id}`
        
        if (peerId === expectedPeerId) {
          console.log('📞 Other party disconnected unexpectedly')
          await cleanupCall('Connection lost - other party disconnected')
        }
      }
    }

    const handlePeerError = async (event: any) => {
      const { peerId, error } = event.detail
      console.log('❌ Peer error:', peerId, 'error:', error)
      
      if (callState === 'connected' && error.includes('Connection failed')) {
        await cleanupCall('Connection failed - please try again')
      }
    }

    const handleCallEndedByPeer = async (event: any) => {
      const { peerId, reason } = event.detail
      console.log('📞 Call ended by peer:', peerId, 'reason:', reason)
      
      if (callState === 'connected' && currentSession) {
        const expectedPeerId = currentSession.learner_id === user?.id 
          ? `${currentSession.host_id}-session-${currentSession.id}`
          : `${currentSession.learner_id}-session-${currentSession.id}`
        
        if (peerId === expectedPeerId) {
          console.log('📞 Other party ended the call via signaling')
          await cleanupCall('Other party ended the call')
        }
      }
    }

    window.addEventListener('peerDisconnected', handlePeerDisconnected)
    window.addEventListener('peerError', handlePeerError)
    window.addEventListener('callEndedByPeer', handleCallEndedByPeer)

    console.log('✅ CallProvider event listeners set up')

    // Cleanup function for peer event listeners
    return () => {
      window.removeEventListener('peerDisconnected', handlePeerDisconnected)
      window.removeEventListener('peerError', handlePeerError)
      window.removeEventListener('callEndedByPeer', handleCallEndedByPeer)
      console.log('🧹 CallProvider event listeners cleaned up')
    }
  }, [callState, currentSession, user?.id])

  // Set up real-time subscriptions for incoming calls
  useEffect(() => {
    if (!user) return

    console.log('🔔 Setting up global call system for user:', user.id)

    // Manual check for existing pending sessions
    const checkForPendingSessions = async () => {
      try {
        console.log('🔍 Checking for pending sessions globally...')

        const { data: pendingSessions, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('host_id', user.id)
          .eq('status', 'pending')

        if (error) {
          console.error('❌ Error checking pending sessions:', error)
          return
        }

        if (pendingSessions && pendingSessions.length > 0) {
          const session = pendingSessions[0]
          console.log('📞 Found pending call globally:', session)

          // Get caller info
          const { data: caller } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', session.learner_id)
            .single()

          const incomingCallData = {
            sessionId: session.id,
            learnerName: caller?.name || 'Unknown',
            skillName: session.skill_name,
            learnerId: session.learner_id,
            sessionMode: session.mode
          }

          setIncomingCall(incomingCallData)
          setCurrentSession(session)
          setCallState('incoming')

          // Start ring sound
          if (ringAudioRef.current) {
            ringAudioRef.current.play().catch(e => console.log('Ring sound failed:', e))
          }

          showInfo('Incoming Call!', `${caller?.name || 'Someone'} wants to learn ${session.skill_name}`)
        }
      } catch (error) {
        console.error('❌ Error in global call check:', error)
      }
    }

    // Run manual check immediately
    checkForPendingSessions()

    // Subscribe to incoming calls
    const incomingCallsChannel = supabase
      .channel(`global-incoming-calls-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'sessions',
        filter: `host_id=eq.${user.id}`
      }, async (payload) => {
        console.log('📞 Global incoming call received:', payload.new)

        // Get caller info
        const { data: caller } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', payload.new.learner_id)
          .single()

        const incomingCallData = {
          sessionId: payload.new.id,
          learnerName: caller?.name || 'Unknown',
          skillName: payload.new.skill_name,
          learnerId: payload.new.learner_id,
          sessionMode: payload.new.mode
        }

        setIncomingCall(incomingCallData)
        setCurrentSession(payload.new)
        setCallState('incoming')

        // Start ring sound
        if (ringAudioRef.current) {
          ringAudioRef.current.play().catch(e => console.log('Ring sound failed:', e))
        }

        showInfo('Incoming Call!', `${caller?.name || 'Someone'} wants to learn ${payload.new.skill_name}`)
      })
      .subscribe((status) => {
        console.log('📡 Global incoming calls channel status:', status)
      })

    // Subscribe to session updates (for when calls are ended by other party)
    const sessionUpdatesChannel = supabase
      .channel(`global-session-updates-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `or(host_id.eq.${user.id},learner_id.eq.${user.id})`
      }, async (payload) => {
        console.log('📱 Global session update:', payload.new)

        const session = payload.new

        if (session.status === 'accepted' && session.learner_id === user?.id) {
          // I'm the learner and my call was accepted!
          console.log('✅ CALLER: My call was accepted!')

          // Handle different session modes for caller
          if (session.mode === 'live') {
            // Start video call for live sessions
            setCurrentSession(session)
            setCallState('connected')
            await startVideoCall(session.id.toString(), session)
            showInfo('Call Accepted!', 'Video session started!')
          } else if (session.mode === 'coding') {
            // For coding sessions, redirect to live page
            showInfo('Coding Session Accepted!', 'Redirecting to collaborative coding session...')
            console.log('✅ CALLER: Coding session accepted - redirecting to live page')
            
            // Check if we're already on the live page
            const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
            if (currentPath !== '/live') {
              // Redirect to live page where collaborative coding interface will be rendered
              setTimeout(() => {
                router.push('/live?from=call-accepted')
              }, 1000) // Small delay to show the success message
            } else {
              console.log('✅ CALLER: Already on live page, triggering session check...')
              // If already on live page, trigger a session check
              setTimeout(() => {
                const event = new CustomEvent('checkForActiveSession')
                window.dispatchEvent(event)
              }, 500)
            }
          }

        } else if (session.status === 'ended' && (callState === 'connected' || callState === 'incoming')) {
          console.log('📞 Call ended by other party via database update')
          await cleanupCall('The other party ended the call')
        }
      })
      .subscribe()

    // Handle page unload/refresh - end call gracefully
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      if (callState === 'connected' && currentSession) {
        console.log('🔄 Page unloading during active call - ending gracefully...')
        
        // End the call in the database immediately
        await supabase
          .from('sessions')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString()
          })
          .eq('id', currentSession.id)

        // Send end call signal via Supabase to notify other party
        if (sessionPeerClient && globalSignaling) {
          const otherPeerId = currentSession.learner_id === user?.id 
            ? `${currentSession.host_id}-session-${currentSession.id}`
            : `${currentSession.learner_id}-session-${currentSession.id}`
          
          console.log('📡 Sending call end signal due to page unload to:', otherPeerId)
          await globalSignaling.sendCallEnded(otherPeerId)
        }

        // Broadcast session end via realtime channel
        const sessionChannel = supabase.channel(`session-${currentSession.id}`)
        await sessionChannel.send({
          type: 'broadcast',
          event: 'call_ended_by_refresh',
          payload: {
            endedBy: user?.id,
            reason: 'Page refreshed or closed',
            timestamp: Date.now()
          }
        })

        // Clean up immediately
        await cleanupCall('Page unloaded')

        event.preventDefault()
        event.returnValue = 'You are currently in a video call. Are you sure you want to leave?'
        return event.returnValue
      }
    }

    // Handle page visibility change (tab switch, minimize, etc.)
    const handleVisibilityChange = async () => {
      if (document.hidden && callState === 'connected' && currentSession) {
        console.log('👁️ Page hidden during call - user might be leaving...')
        // Don't end call immediately on visibility change, just log it
      } else if (!document.hidden && callState === 'connected') {
        console.log('👁️ Page visible again during call')
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Subscribe to call end broadcasts from other users
    const callEndChannel = supabase
      .channel(`call-end-listener-${user.id}`)
      .on('broadcast', { event: 'call_ended_by_refresh' }, async (payload) => {
        console.log('📞 Received call end broadcast:', payload.payload)
        
        if (payload.payload.endedBy !== user?.id && callState === 'connected') {
          console.log('📞 Other party ended call by refresh/close')
          await cleanupCall('Other party left the session')
        }
      })
      .on('broadcast', { event: 'call_ended_by_user' }, async (payload) => {
        console.log('📞 Received user call end broadcast:', payload.payload)
        
        if (payload.payload.endedBy !== user?.id && callState === 'connected') {
          console.log('📞 Other party ended call manually')
          await cleanupCall('Other party ended the call')
        }
      })
      .subscribe()

    return () => {
      console.log('🔌 Unsubscribing from global call channels')
      incomingCallsChannel.unsubscribe()
      sessionUpdatesChannel.unsubscribe()
      callEndChannel.unsubscribe()

      // Remove event listeners
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)

      // Stop ring sound
      if (ringAudioRef.current) {
        ringAudioRef.current.pause()
        ringAudioRef.current.currentTime = 0
      }

      // Clean up call if still active
      if (callState === 'connected') {
        cleanupCall('Page unloaded')
      }
    }
  }, [user])

  const acceptCall = async () => {
    if (!incomingCall) return

    // Stop ring sound
    if (ringAudioRef.current) {
      ringAudioRef.current.pause()
      ringAudioRef.current.currentTime = 0
    }

    try {
      console.log('✅ Accepting call globally:', incomingCall.learnerName)

      const { data: updatedSession, error } = await supabase
        .from('sessions')
        .update({
          status: 'accepted',
          started_at: new Date().toISOString()
        })
        .eq('id', incomingCall.sessionId)
        .eq('status', 'pending')
        .select()
        .single()

      if (error) {
        console.error('Error accepting call:', error)
        throw error
      }

      if (!updatedSession) {
        showWarning('Call Expired', 'This call has already been handled.')
        setIncomingCall(null)
        return
      }

      console.log('✅ Call accepted globally')
      setIncomingCall(null)
      setCurrentSession(updatedSession)
      setCallState('connected')

      // Handle different session modes
      if (updatedSession.mode === 'live') {
        // Start video call for live sessions
        await startVideoCall(updatedSession.id.toString(), updatedSession)
        showInfo('Call Accepted!', 'Video session started!')
      } else if (updatedSession.mode === 'coding') {
        // For coding sessions, redirect to live page to show collaborative coding interface
        showInfo('Coding Session Accepted!', 'Redirecting to collaborative coding session...')
        console.log('✅ Coding session accepted - redirecting to live page')
        
        // Check if we're already on the live page to prevent unnecessary redirects
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
        if (currentPath !== '/live') {
          // Redirect to live page where collaborative coding interface is rendered
          setTimeout(() => {
            router.push('/live')
          }, 1000) // Small delay to show the success message
        } else {
          console.log('✅ Already on live page, triggering session update')
          
          // Emit custom event to notify live page about the accepted session
          if (typeof window !== 'undefined') {
            const event = new CustomEvent('codingSessionAccepted', {
              detail: { session: updatedSession }
            })
            window.dispatchEvent(event)
          }
        }
      }

    } catch (error) {
      console.error('Error accepting call:', error)
      showWarning('Accept Failed', 'Failed to accept call. Please try again.')
    }
  }

  const rejectCall = async () => {
    if (!incomingCall) return

    // Stop ring sound
    if (ringAudioRef.current) {
      ringAudioRef.current.pause()
      ringAudioRef.current.currentTime = 0
    }

    try {
      console.log('❌ Rejecting call globally:', incomingCall.learnerName)

      const { error } = await supabase
        .from('sessions')
        .update({
          status: 'rejected',
          ended_at: new Date().toISOString()
        })
        .eq('id', incomingCall.sessionId)
        .eq('status', 'pending')

      if (error) {
        console.error('Error rejecting call:', error)
        throw error
      }

      console.log('✅ Call rejected globally')
      setIncomingCall(null)
      setCallState('idle')

      showInfo('Call Rejected', 'You declined the call.')

    } catch (error) {
      console.error('Error rejecting call:', error)
      setIncomingCall(null)
    }
  }

  const startVideoCall = async (sessionId: string, sessionData: any) => {
    try {
      console.log('🎥 Starting global video call for session:', sessionId, {
        sessionData: sessionData,
        userId: user?.id,
        callState: callState
      })

      // Validate session data
      if (!sessionData || !sessionData.learner_id) {
        throw new Error('Invalid session data: missing learner_id')
      }

      // Initialize peer client and get local media stream (video + audio)
      const initializedPeerClient = await initializePeerClientWhenNeeded()
      const stream = await initializedPeerClient.getLocalStream()
      setLocalStream(stream)
      console.log('✅ Got local media stream with tracks:', stream.getTracks().map(t => `${t.kind}: ${t.label}`))

      // Set local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.muted = true // Prevent echo
        console.log('✅ Local video element updated')
      } else {
        console.warn('⚠️ Local video ref not available')
      }

      // Determine peer IDs based on session
      const myPeerId = `${user?.id}-session-${sessionId}`
      const remotePeerId = sessionData.learner_id === user?.id
        ? `${sessionData.host_id}-session-${sessionId}`  // I'm learner, calling teacher
        : `${sessionData.learner_id}-session-${sessionId}` // I'm teacher, accepting from learner

      console.log('🆔 Video call peer IDs:', { 
        myPeerId, 
        remotePeerId, 
        role: sessionData.learner_id === user?.id ? 'caller' : 'callee',
        sessionData: {
          learner_id: sessionData.learner_id,
          host_id: sessionData.host_id,
          current_user: user?.id
        }
      })

      // CRITICAL FIX: Reset and create new peer client with session-specific ID
      console.log('🔄 Resetting peer client for session-specific ID')

      // Disconnect existing peer client if it exists
      if (peerClient) {
        peerClient.disconnect()
      }

      // Create new peer client with correct ID
      const { resetPeerClient, getPeerClient } = await import('@/lib/peerClient')
      resetPeerClient()
      const newSessionPeerClient = getPeerClient(myPeerId)
      setSessionPeerClient(newSessionPeerClient)

      // Initialize the new peer client
      await newSessionPeerClient.initialize()
      console.log('✅ Session peer client initialized with ID:', newSessionPeerClient.getMyPeerId())

      // Set up Supabase signaling for the new peer client
      const sessionSignaling = initSupabaseSignaling(parseInt(sessionId), myPeerId)
      setGlobalSignaling(sessionSignaling)

      // Set up incoming call handler for the new peer client
      newSessionPeerClient.onIncomingCall((peerId, remoteStream) => {
        console.log('📹 SESSION: Received remote video stream from:', peerId, {
          streamId: remoteStream.id,
          videoTracks: remoteStream.getVideoTracks().length,
          audioTracks: remoteStream.getAudioTracks().length,
          videoTrackIds: remoteStream.getVideoTracks().map(t => t.id),
          audioTrackIds: remoteStream.getAudioTracks().map(t => t.id)
        })
        
        setRemoteStream(remoteStream)
        
        if (remoteVideoRef.current) {
          console.log('📺 Setting remote video element srcObject')
          remoteVideoRef.current.srcObject = remoteStream
          remoteVideoRef.current.muted = false
          
          // Force play with better error handling
          remoteVideoRef.current.play().then(() => {
            console.log('✅ Remote video playing successfully')
          }).catch(error => {
            console.error('❌ Error playing remote video:', error)
            
            // Try to force play after a delay
            setTimeout(() => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.play().catch(e => {
                  console.error('❌ Retry play failed:', e)
                })
              }
            }, 1000)
          })
        } else {
          console.error('❌ Remote video ref not available!')
        }
      })

      // Set up incoming offer handler for the new peer client
      newSessionPeerClient.onIncomingOffer(async (fromPeerId, offer) => {
        console.log('📞 SESSION: Received incoming offer from:', fromPeerId)
        try {
          await newSessionPeerClient.acceptConnection(fromPeerId) // will consume pending offer
          console.log('✅ SESSION: Accepted connection from:', fromPeerId)
        } catch (error) {
          console.error('❌ SESSION: Failed to accept connection:', error)
        }
      })

      // Supabase signaling handles outgoing signals automatically
      console.log('✅ Supabase signaling connected to peer client')

      // Get fresh local stream for the new peer client
      const sessionStream = await newSessionPeerClient.getLocalStream()
      setLocalStream(sessionStream)
      console.log('✅ Got session media stream with tracks:', sessionStream.getTracks().map(t => `${t.kind}: ${t.label}`))

      // Set local video with new stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = sessionStream
        localVideoRef.current.muted = true
        console.log('✅ Local video element updated with session stream')
      }

      // Handle both caller and receiver sides
      if (sessionData && sessionData.learner_id === user?.id) {
        // I'm the learner (caller) - initiate connection to teacher
        console.log('👨‍🎓 I am the learner, will call teacher')
        setTimeout(async () => {
          try {
            console.log('📞 Calling teacher with ID:', remotePeerId)
            await newSessionPeerClient.createConnection(remotePeerId)
            console.log('✅ Connected to teacher!')
          } catch (callError) {
            console.error('Failed to connect to teacher:', callError)
            showWarning('Connection Issue', 'Could not establish video connection. Retrying...')

            // Retry connection after a delay
            setTimeout(async () => {
              try {
                await newSessionPeerClient.createConnection(remotePeerId)
                showInfo('Connected!', 'Video connection established')
              } catch (retryError) {
                console.error('Retry failed:', retryError)
                showWarning('Connection Failed', 'Unable to establish video connection.')
              }
            }, 3000)
          }
        }, 2000)
      } else {
        // I'm the teacher (receiver) - wait for learner to connect
        console.log('👨‍🏫 I am the teacher, waiting for learner to connect')
        console.log('🎯 Ready to receive connection from learner ID:', remotePeerId)

        // The session peer client is already set up to handle incoming connections
        // The onIncomingCall callback will trigger when learner connects
        showInfo('Ready!', 'Waiting for learner to connect...')
      }

    } catch (error) {
      console.error('Error starting video call:', error)
      showWarning('Video Error', 'Failed to start video call. Please check camera/microphone permissions.')
    }
  }

  const endCall = async () => {
    try {
      console.log('📞 Ending global call...')

      // Update session status to ended
      if (currentSession) {
        const { error } = await supabase
          .from('sessions')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString()
          })
          .eq('id', currentSession.id)

        if (error) {
          console.error('Error ending call:', error)
        } else {
          console.log('✅ Call ended successfully in database')
        }

        // Send end call signal to other peer via Supabase
        if (sessionPeerClient && globalSignaling) {
          const otherPeerId = currentSession.learner_id === user?.id 
            ? `${currentSession.host_id}-session-${currentSession.id}`
            : `${currentSession.learner_id}-session-${currentSession.id}`
          
          console.log('📡 Sending call end signal to:', otherPeerId)
          await globalSignaling.sendCallEnded(otherPeerId)
        }

        // Broadcast call end to other party via realtime channel
        const sessionChannel = supabase.channel(`session-${currentSession.id}`)
        await sessionChannel.send({
          type: 'broadcast',
          event: 'call_ended_by_user',
          payload: {
            endedBy: user?.id,
            reason: 'User ended the call',
            timestamp: Date.now()
          }
        })
        
        // Unsubscribe from the session channel
        await sessionChannel.unsubscribe()
      }

      // Clean up everything
      await cleanupCall('Call ended by you')

    } catch (error) {
      console.error('Error ending call:', error)
      // Clean up anyway
      await cleanupCall('Call ended (with errors)')
    }
  }

  // Centralized cleanup function
  const cleanupCall = async (reason: string = 'Call ended') => {
    console.log('🧹 Cleaning up call:', reason)

    // Stop ring sound if playing
    if (ringAudioRef.current) {
      ringAudioRef.current.pause()
      ringAudioRef.current.currentTime = 0
    }

    // Disconnect peer clients
    if (sessionPeerClient) {
      sessionPeerClient.disconnect()
      setSessionPeerClient(null)
    }
    
    // Also disconnect global peer client to be safe
    if (peerClient) {
      peerClient.disconnect()
      setPeerClient(null) // Reset to null so it can be re-initialized later
    }

    // Stop all media tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop()
        console.log('🛑 Stopped track:', track.kind, track.label)
      })
      setLocalStream(null)
    }

    if (remoteStream) {
      setRemoteStream(null)
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }

    // Reset all state
    setCallState('idle')
    setCurrentSession(null)
    setIncomingCall(null)
    setVideoEnabled(true)
    setAudioEnabled(true)

    // Show notification
    showInfo('Call Ended', reason)
    
    console.log('✅ Call cleanup completed')
  }

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setVideoEnabled(videoTrack.enabled)
      }
    }
  }

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setAudioEnabled(audioTrack.enabled)
      }
    }
  }

  // Debug function to check stream states
  const debugStreams = () => {
    console.log('🔍 CallProvider Stream Debug:')
    console.log('- Local stream:', localStream ? {
      id: localStream.id,
      videoTracks: localStream.getVideoTracks().length,
      audioTracks: localStream.getAudioTracks().length
    } : 'None')
    console.log('- Remote stream:', remoteStream ? {
      id: remoteStream.id,
      videoTracks: remoteStream.getVideoTracks().length,
      audioTracks: remoteStream.getAudioTracks().length
    } : 'None')
    console.log('- Session peer client:', sessionPeerClient ? 'Available' : 'None')
    console.log('- Video refs:', {
      local: !!localVideoRef.current,
      remote: !!remoteVideoRef.current
    })
    
    if (sessionPeerClient) {
      sessionPeerClient.debugStreams()
    }
  }

  // Add debug to window for easy access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as any
      win.debugCallProvider = debugStreams
      win.debugSignaling = async () => {
        if (globalSignaling) {
          console.log('Supabase signaling status:', globalSignaling.isConnected())
          console.log('Session info:', globalSignaling.getSessionInfo())
        } else {
          console.log('No Supabase signaling available')
        }
      }
    }
  }, [localStream, remoteStream, sessionPeerClient, globalSignaling])

  const startOutgoingCall = async (sessionId: string, sessionData: any) => {
    try {
      console.log('🚀 Starting outgoing call from CallProvider:', { sessionId, sessionData })

      // Set the session and call state
      setCurrentSession(sessionData)
      setCallState('connected')

      // Start the video call with the session data
      await startVideoCall(sessionId, sessionData)

    } catch (error) {
      console.error('❌ Error starting outgoing call:', error)
      throw error
    }
  }

  return (
    <CallContext.Provider value={{ incomingCall, callState, acceptCall, rejectCall, endCall, startOutgoingCall }}>
      {children}

      {/* Global incoming call overlay */}
      {callState === 'incoming' && incomingCall && (
        <IncomingCallOverlay
          learnerName={incomingCall.learnerName}
          skillName={incomingCall.skillName}
          sessionMode={incomingCall.sessionMode || 'coding'}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {/* Video call interface only for live sessions */}
      {callState === 'connected' && currentSession?.mode === 'live' && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
          {/* Video containers */}
          <div className="flex-1 relative">
            {/* Remote video (main) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover pointer-events-none z-0"
            />

            {/* Local video (picture-in-picture) - Responsive sizing */}
            <div className="absolute top-4 right-4 w-24 h-18 sm:w-48 sm:h-36 bg-gray-800 rounded-lg overflow-hidden z-10">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover pointer-events-none"
              />
            </div>

            {/* Call info - Mobile responsive */}
            <div className="absolute top-4 left-4 bg-black/70 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-lg z-20">
              <p className="text-xs sm:text-sm">
                Learning: {currentSession?.skill_name || 'Demo Skill'}
              </p>
              <p className="text-xs opacity-75">
                {incomingCall ? `With ${incomingCall.learnerName}` : 'Connected'}
              </p>
              {/* <p className="text-xs opacity-50">
                Remote: {remoteStream ? '✅' : '❌'} | Local: {localStream ? '✅' : '❌'}
              </p> */}
            </div>

            {/* Debug button - only in development */}
            {/* {process.env.NODE_ENV === 'development' && (
              <button
                onClick={debugStreams}
                className="absolute top-4 right-4 left-auto w-auto bg-red-600/70 text-white px-2 py-1 text-xs rounded z-30"
              >
                Debug
              </button>
            )} */}
          </div>

          {/* Controls - Mobile optimized */}
          <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-black/80 backdrop-blur-sm z-[10000]">
            <div className="flex justify-center space-x-3 sm:space-x-4">
              <Button
                variant={audioEnabled ? "default" : "destructive"}
                size="icon"
                onClick={toggleAudio}
                className="rounded-full w-10 h-10 sm:w-12 sm:h-12"
              >
                {audioEnabled ? <Mic className="h-4 w-4 sm:h-6 sm:w-6" /> : <MicOff className="h-4 w-4 sm:h-6 sm:w-6" />}
              </Button>

              <Button
                variant={videoEnabled ? "default" : "destructive"}
                size="icon"
                onClick={toggleVideo}
                className="rounded-full w-10 h-10 sm:w-12 sm:h-12"
              >
                {videoEnabled ? <Video className="h-4 w-4 sm:h-6 sm:w-6" /> : <VideoOff className="h-4 w-4 sm:h-6 sm:w-6" />}
              </Button>

              <Button
                variant="destructive"
                size="icon"
                onClick={endCall}
                className="rounded-full w-10 h-10 sm:w-12 sm:h-12"
              >
                <PhoneOff className="h-4 w-4 sm:h-6 sm:w-6" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </CallContext.Provider>
  )
}

// showError function is handled by useModal hook
