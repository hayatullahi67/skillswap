'use client'

import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabaseClient'
import { IncomingCallOverlay } from '@/components/ui/incoming-call-overlay'
import { useModal } from '@/hooks/useModal'
import { peerClient } from '@/lib/peerClient'
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff } from 'lucide-react'
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
  
  const { user } = useAppStore()
  const { showInfo, showWarning } = useModal()
  const ringAudioRef = useRef<HTMLAudioElement | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

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
          pause: () => {},
          currentTime: 0,
          loop: true,
          volume: 0.5
        } as any
      }
    }
    
    createRingSound()
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
          .order('created_at', { ascending: false })

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
      }, (payload) => {
        console.log('📱 Global session update:', payload.new)

        const session = payload.new

        if (session.status === 'ended' && callState === 'connected') {
          console.log('📞 Call ended by other party')
          
          // Clean up video/audio
          peerClient.disconnect()
          if (localStream) {
            localStream.getTracks().forEach(track => track.stop())
            setLocalStream(null)
          }
          if (remoteStream) {
            setRemoteStream(null)
          }
          
          setCallState('idle')
          setCurrentSession(null)
          setIncomingCall(null)
          
          showInfo('Call Ended', 'The other party ended the call.')
        }
      })
      .subscribe()

    return () => {
      console.log('🔌 Unsubscribing from global call channels')
      incomingCallsChannel.unsubscribe()
      sessionUpdatesChannel.unsubscribe()
      
      // Stop ring sound
      if (ringAudioRef.current) {
        ringAudioRef.current.pause()
        ringAudioRef.current.currentTime = 0
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
      
      // Start video call directly
      await startVideoCall(updatedSession.id.toString())
      
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

  const startVideoCall = async (sessionId: string) => {
    try {
      console.log('🎥 Starting global video call for session:', sessionId)

      // Generate consistent peer ID for this session
      const myPeerId = `${user?.id}-session-${sessionId}`
      
      // Initialize PeerJS connection
      await peerClient.initialize(myPeerId)
      console.log('✅ PeerJS initialized with ID:', myPeerId)

      // Get local media stream (video + audio)
      const stream = await peerClient.getLocalStream()
      setLocalStream(stream)
      console.log('✅ Got local media stream with tracks:', stream.getTracks().map(t => `${t.kind}: ${t.label}`))

      // Set local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.muted = true // Prevent echo
      }

      // Set up incoming call handler for remote stream
      peerClient.onIncomingCall((remoteStream) => {
        console.log('📹 Received remote video stream')
        setRemoteStream(remoteStream)
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream
          remoteVideoRef.current.muted = false // Allow remote audio

        }
      })

      // If this is the learner (caller), initiate call to teacher
      if (currentSession && currentSession.learner_id === user?.id) {
        // Wait for teacher to be ready, then call them
        setTimeout(async () => {
          try {
            const teacherPeerId = `${currentSession.host_id}-session-${sessionId}`
            console.log('📞 Calling teacher with ID:', teacherPeerId)

            const remoteStream = await peerClient.initiateCallToPeer(teacherPeerId)
            setRemoteStream(remoteStream)
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream
              remoteVideoRef.current.muted = false // Allow remote audio
            }
            console.log('✅ Connected to teacher!')

          } catch (callError) {
            console.error('Failed to connect to teacher:', callError)
            showWarning('Connection Issue', 'Could not establish video connection. Retrying...')
            
            // Retry connection after a delay
            setTimeout(async () => {
              try {
                const teacherPeerId = `${currentSession.host_id}-session-${sessionId}`
                const remoteStream = await peerClient.initiateCallToPeer(teacherPeerId)
                setRemoteStream(remoteStream)
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.srcObject = remoteStream
                  remoteVideoRef.current.muted = false
                }
                showInfo('Connected!', 'Video connection established')
              } catch (retryError) {
                console.error('Retry failed:', retryError)
                showWarning('Connection Failed', 'Unable to establish video connection. Audio may still work.')
              }
            }, 3000)
          }
        }, 3000) // Wait time for teacher to be ready
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
          console.log('✅ Call ended successfully')
        }
      }

      // Disconnect PeerJS and clean up streams
      peerClient.disconnect()
      
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop())
        setLocalStream(null)
      }
      
      if (remoteStream) {
        setRemoteStream(null)
      }

      // Reset all state
      setCallState('idle')
      setCurrentSession(null)
      setIncomingCall(null)
      
      showInfo('Call Ended', 'The session has ended.')

    } catch (error) {
      console.error('Error ending call:', error)
      
      // Reset state anyway
      setCallState('idle')
      setCurrentSession(null)
      setIncomingCall(null)
    }
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

  return (
    <CallContext.Provider value={{ incomingCall, callState, acceptCall, rejectCall, endCall }}>
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
            </div>
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