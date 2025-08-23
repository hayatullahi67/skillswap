'use client'

import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabaseClient'
import { IncomingCallOverlay } from '@/components/ui/incoming-call-overlay'
import { useModal } from '@/hooks/useModal'
import { getPeerClient } from '@/lib/peerClient'
import { SocketSignaling } from '@/lib/socketSignaling'
import { Video, VideoOff, Mic, MicOff, PhoneOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

type IncomingCall = {
  sessionId: number
  learnerName: string
  skillName: string
  learnerId: string
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
  const ringAudioRef = useRef<HTMLAudioElement | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  // Initialize peer client and signaling
  const peerClient = getPeerClient()
  const [globalSignaling] = useState(() => new SocketSignaling(peerClient))

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

  // Initialize peer client and signaling ONCE globally
  useEffect(() => {
    const initializePeerSystem = async () => {
      try {
        console.log('🚀 Initializing GLOBAL peer system...')

        // Initialize peer client
        await peerClient.initialize()
        console.log('✅ Peer client initialized globally')

        // Set up incoming call handler ONCE
        peerClient.onIncomingCall((peerId, remoteStream) => {
          console.log('📹 GLOBAL: Received remote video stream from:', peerId)
          console.log('📹 Remote stream tracks:', {
            video: remoteStream.getVideoTracks().length,
            audio: remoteStream.getAudioTracks().length
          })

          setRemoteStream(remoteStream)

          // Display remote stream immediately
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream
            remoteVideoRef.current.muted = false
            remoteVideoRef.current.play().catch(e => console.log('Remote video play failed:', e))
          }
        })

        // Set up signaling ONCE
        peerClient.onSignal((peerId, signalData) => {
          console.log('📡 GLOBAL: Outgoing signal to peer:', peerId, signalData.type)
          // Socket signaling handles this automatically
        })

        // Initialize signaling
        globalSignaling.initialize()
        console.log('✅ Socket signaling initialized globally')

        // Set up global call-ended listener
        globalSignaling.socket.on("call-ended", async ({ from, sessionId }) => {
          console.log('📞 Received call-ended signal from:', from, 'for session:', sessionId)
          
          if (currentSession && currentSession.id === sessionId) {
            console.log('📞 Call ended by other party via Socket.IO')
            await cleanupCall('The other party ended the call')
          }
        })

        // Force Socket.IO server initialization by making a request
        fetch('/api/socket').then(() => {
          console.log('✅ Socket.IO server endpoint accessed')
        }).catch(err => {
          console.error('❌ Failed to access Socket.IO server:', err)
        })

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

        window.addEventListener('peerDisconnected', handlePeerDisconnected)
        window.addEventListener('peerError', handlePeerError)

        // Test Socket.IO connection
        setTimeout(() => {
          globalSignaling.testConnection()
        }, 3000)

        // Cleanup function for peer event listeners
        return () => {
          window.removeEventListener('peerDisconnected', handlePeerDisconnected)
          window.removeEventListener('peerError', handlePeerError)
        }

      } catch (error) {
        console.error('❌ Failed to initialize global peer system:', error)
      }
    }

    initializePeerSystem()
  }, [])

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
            learnerId: session.learner_id
          }

          setIncomingCall(incomingCallData)
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
          learnerId: payload.new.learner_id
        }

        setIncomingCall(incomingCallData)
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
          // LivePage will handle the video call for caller side
          console.log('✅ CALLER: My call was accepted! LivePage will handle video...')

        } else if (session.status === 'ended' && (callState === 'connected' || callState === 'incoming')) {
          console.log('📞 Call ended by other party via database update')
          await cleanupCall('The other party ended the call')
        }
      })
      .subscribe()

    // Handle page unload/refresh - end call gracefully
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      if (callState === 'connected' && currentSession) {
        // End the call in the database
        await supabase
          .from('sessions')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString()
          })
          .eq('id', currentSession.id)

        // Send end call signal
        if (sessionPeerClient && globalSignaling) {
          const otherPeerId = currentSession.learner_id === user?.id 
            ? `${currentSession.host_id}-session-${currentSession.id}`
            : `${currentSession.learner_id}-session-${currentSession.id}`
          
          globalSignaling.socket.emit("call-ended", {
            to: otherPeerId,
            from: sessionPeerClient.getMyPeerId(),
            sessionId: currentSession.id
          })
        }

        event.preventDefault()
        event.returnValue = 'You are currently in a video call. Are you sure you want to leave?'
        return event.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      console.log('🔌 Unsubscribing from global call channels')
      incomingCallsChannel.unsubscribe()
      sessionUpdatesChannel.unsubscribe()

      // Remove beforeunload listener
      window.removeEventListener('beforeunload', handleBeforeUnload)

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

      // Start video call directly with session data
      await startVideoCall(updatedSession.id.toString(), updatedSession)

      showInfo('Call Accepted!', 'Video session started!')

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

      // Get local media stream (video + audio)
      const stream = await peerClient.getLocalStream()
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

      // Disconnect existing peer client
      peerClient.disconnect()

      // Create new peer client with correct ID
      const { resetPeerClient, getPeerClient } = await import('@/lib/peerClient')
      resetPeerClient()
      const newSessionPeerClient = getPeerClient(myPeerId)
      setSessionPeerClient(newSessionPeerClient)

      // Initialize the new peer client
      await newSessionPeerClient.initialize()
      console.log('✅ Session peer client initialized with ID:', newSessionPeerClient.getMyPeerId())

      // Set up signaling for the new peer client
      const { SocketSignaling } = await import('@/lib/socketSignaling')
      const sessionSignaling = new SocketSignaling(newSessionPeerClient)
      sessionSignaling.initialize()

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

      // Set up signaling for the new peer client - CRITICAL FIX
      newSessionPeerClient.onSignal((peerId, signalData) => {
        console.log('📡 SESSION: Outgoing signal to peer:', peerId, 'type:', signalData.type)
        // Manually send signal through session signaling
        sessionSignaling.socket.emit("signal", {
          to: peerId,
          from: newSessionPeerClient.getMyPeerId(),
          data: signalData,
        })
        console.log('📡 SESSION: Signal sent via Socket.IO')
      })

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
            await sessionSignaling.callPeer(remotePeerId)
            console.log('✅ Connected to teacher!')
          } catch (callError) {
            console.error('Failed to connect to teacher:', callError)
            showWarning('Connection Issue', 'Could not establish video connection. Retrying...')

            // Retry connection after a delay
            setTimeout(async () => {
              try {
                await sessionSignaling.callPeer(remotePeerId)
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

        // Send end call signal to other peer via Socket.IO
        if (sessionPeerClient && globalSignaling) {
          const otherPeerId = currentSession.learner_id === user?.id 
            ? `${currentSession.host_id}-session-${currentSession.id}`
            : `${currentSession.learner_id}-session-${currentSession.id}`
          
          console.log('📡 Sending call end signal to:', otherPeerId)
          globalSignaling.socket.emit("call-ended", {
            to: otherPeerId,
            from: sessionPeerClient.getMyPeerId(),
            sessionId: currentSession.id
          })
        }
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
    peerClient.disconnect()

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
        if (sessionPeerClient) {
          console.log('Socket signaling debug - check browser network tab for WebSocket connections')
        } else {
          console.log('No session peer client available')
        }
      }
    }
  }, [localStream, remoteStream, sessionPeerClient])

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
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {/* Global video call interface */}
      {callState === 'connected' && (
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
