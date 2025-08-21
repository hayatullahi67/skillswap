'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertModal } from '@/components/ui/modal'
import { useModal } from '@/hooks/useModal'
import { useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabaseClient'
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, PhoneIncoming, UserCheck, Search, Users } from 'lucide-react'
import { peerClient } from '@/lib/peerClient'

type MatchedPeer = {
  id: string
  name: string
  skill_name: string
  isOnline?: boolean
}

type IncomingCall = {
  sessionId: number
  learnerName: string
  skillName: string
  learnerId: string
}

type CallState = 'idle' | 'form' | 'searching' | 'matched' | 'calling' | 'incoming' | 'connected' | 'ended'

export default function LivePage() {
  const [callState, setCallState] = useState<CallState>('idle')
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const [matchedPeer, setMatchedPeer] = useState<MatchedPeer | null>(null)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [skillToLearn, setSkillToLearn] = useState('')
  const [availableSkills, setAvailableSkills] = useState<string[]>([])
  const [matchedPeers, setMatchedPeers] = useState<MatchedPeer[]>([])
  const [selectedPeer, setSelectedPeer] = useState<MatchedPeer | null>(null)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()
  const { user, userSkills } = useAppStore()
  const { modalState, showError, showWarning, showInfo, closeModal } = useModal()

  // Check for active accepted sessions when page loads (incoming calls handled globally)
  useEffect(() => {
    if (!user) return

    console.log('🔔 Checking for active sessions on live page load')

    const checkForActiveSession = async () => {
      try {
        // Check if there's an accepted session for this user
        const { data: activeSessions, error } = await supabase
          .from('sessions')
          .select('*')
          .or(`host_id.eq.${user.id},learner_id.eq.${user.id}`)
          .eq('status', 'accepted')
          .order('created_at', { ascending: false })
          .limit(1)

        if (error) {
          console.error('Error checking active sessions:', error)
          return
        }

        if (activeSessions && activeSessions.length > 0) {
          // const session = activeSessions[0]
          // console.log('📞 Found active session, starting video call:', session)

          // setCurrentSession(session)
          // setCallState('connected')

          // // Start video call immediately
          // await startVideoCall(session.id.toString())
          const session = activeSessions[0];
          console.log('📞 Found active session, starting video call:', session)

          setCurrentSession(session);
          setCallState('connected');
          await startVideoCall({
            session,
            role: session.learner_id === user?.id ? 'caller' : 'callee'
          });
        }
      } catch (error) {
        console.error('Error checking active sessions:', error)
      }
    }

    checkForActiveSession()

    // Set up real-time subscriptions for session updates only
    console.log('🔔 Setting up session update subscriptions for user:', user.id)

    // Manual check for existing pending sessions (in case real-time missed them)
    const checkForPendingSessions = async () => {
      try {
        console.log('🔍 Manually checking for pending sessions...')

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

        console.log('📋 Found pending sessions:', pendingSessions)

        if (pendingSessions && pendingSessions.length > 0) {
          const session = pendingSessions[0] // Get the most recent one
          console.log('📞 Found pending call, setting up incoming call...', session)

          // Get caller info
          const { data: caller } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', session.learner_id)
            .single()

          console.log('👤 Caller info:', caller)

          const incomingCallData = {
            sessionId: session.id,
            learnerName: caller?.name || 'Unknown',
            skillName: session.skill_name,
            learnerId: session.learner_id
          }

          console.log('📞 Setting up incoming call:', incomingCallData)

          setIncomingCall(incomingCallData)
          setCallState('incoming')
          console.log('🔔 INCOMING CALL STATE SET - Mobile check:', /Mobile|Android|iPhone|iPad/.test(navigator.userAgent))

          showInfo('Incoming Call Found!', `${caller?.name || 'Someone'} wants to learn ${session.skill_name}`)
        } else {
          console.log('✅ No pending sessions found')
        }
      } catch (error) {
        console.error('❌ Error in manual check:', error)
      }
    }

    // Run manual check immediately
    checkForPendingSessions()

    // Subscribe to incoming calls (when someone calls this user as teacher)
    const incomingCallsChannel = supabase
      .channel(`incoming-calls-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'sessions',
        filter: `host_id=eq.${user.id}`
      }, async (payload) => {
        console.log('📞 Incoming call received from:', payload.new.learner_id)

        // Get caller info
        const { data: caller, error: callerError } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', payload.new.learner_id)
          .single()

        if (callerError) {
          console.error('Error getting caller info:', callerError)
        }

        // Set up incoming call state
        const incomingCallData = {
          sessionId: payload.new.id,
          learnerName: caller?.name || 'Unknown',
          skillName: payload.new.skill_name,
          learnerId: payload.new.learner_id
        }



        setIncomingCall(incomingCallData)
        setCallState('incoming')
        console.log('🔔 REAL-TIME INCOMING CALL STATE SET - Mobile check:', /Mobile|Android|iPhone|iPad/.test(navigator.userAgent))

        showInfo('Incoming Call!', `${caller?.name || 'Someone'} wants to learn ${payload.new.skill_name}`)
      })
      .subscribe((status) => {
        console.log('📡 Incoming calls channel status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to incoming calls for user:', user.id)
          console.log('🔍 Listening for: INSERT on sessions where host_id =', user.id)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to incoming calls')
        } else if (status === 'CLOSED') {
          console.warn('⚠️ Real-time channel closed')
        }
      })

    // Subscribe to session status updates (for callers waiting for response)
    const sessionUpdatesChannel =  supabase
      .channel(`session-updates-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `learner_id=eq.${user.id}`
      }, (payload) => {
        console.log('📱 Session status update:', payload.new)

        const session = payload.new

        if (session.status === 'accepted') {
          // console.log('✅ Call accepted!')
          // setCallState('connected')
          // setCurrentSession(session)

          // // Start video call for learner
          // startVideoCall(session.id.toString())

          // showInfo('Call Accepted!', 'Starting video session...')
        
          setCallState('connected');
          setCurrentSession(session);
          // await 
          startVideoCall({
            session,
            role: session.learner_id === user?.id ? 'caller' : 'callee'
          });
        } else if (session.status === 'rejected') {
          console.log('❌ Call rejected')
          setCallState('ended')
          showWarning('Call Rejected', 'The teacher declined your call.')

          // Reset state after showing message
          setTimeout(() => {
            setCallState('idle')
            setCurrentSession(null)
            setMatchedPeer(null)
          }, 3000)

        } else if (session.status === 'ended') {
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

          setCallState('ended')
          setCurrentSession(null)
          setMatchedPeer(null)
          setIncomingCall(null)

          showInfo('Call Ended', 'The other party ended the call.')

          // Reset to idle after showing message
          setTimeout(() => {
            setCallState('idle')
          }, 2000)
        }
      })
      .subscribe()

    // Subscribe to session updates for teachers (when they're in a call)
    const teacherSessionChannel = supabase
      .channel(`teacher-session-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `host_id=eq.${user.id}`
      }, (payload) => {
        console.log('👨‍🏫 Teacher session update:', payload.new)

        const session = payload.new

        if (session.status === 'ended') {
          console.log('📞 Call ended by learner')

          // Clean up video/audio
          peerClient.disconnect()
          if (localStream) {
            localStream.getTracks().forEach(track => track.stop())
            setLocalStream(null)
          }
          if (remoteStream) {
            setRemoteStream(null)
          }

          setCallState('ended')
          setCurrentSession(null)
          setMatchedPeer(null)
          setIncomingCall(null)

          showInfo('Call Ended', 'The learner ended the call.')

          // Reset to idle after showing message
          setTimeout(() => {
            setCallState('idle')
          }, 2000)
        }
      })
      .subscribe()

    return () => {
      console.log('🔌 Unsubscribing from real-time channels')
      incomingCallsChannel.unsubscribe()
      sessionUpdatesChannel.unsubscribe()
      teacherSessionChannel.unsubscribe()
    }
  }, [user])

  // Load available skills when component mounts
  useEffect(() => {
    const loadAvailableSkills = async () => {
      if (!user) return

      try {
        const { data: skills, error } = await supabase
          .from('user_skills')
          .select('skill_name')
          .eq('skill_type', 'teach')
          .neq('user_id', user.id)

        if (error) throw error

        const uniqueSkills = Array.from(new Set(skills?.map(s => s.skill_name) || []))
        setAvailableSkills(uniqueSkills)
      } catch (error) {
        console.error('Error loading skills:', error)
      }
    }

    if (user) {
      loadAvailableSkills()
    }
  }, [user])

  // Placeholder functions - no real functionality yet
  const startLearningForm = () => {
    setCallState('form')
  }

  const findPeersForSkill = async () => {
    if (!skillToLearn.trim()) {
      showWarning('Skill Required', 'Please enter a skill you want to learn!')
      return
    }

    setCallState('searching')

    try {
      console.log('🔍 Searching for teachers who can teach:', skillToLearn)

      // Step 1: Find users who can teach the requested skill
      const { data: teachingSkills, error: skillsError } = await supabase
        .from('user_skills')
        .select(`
          user_id, 
          skill_name,
          profiles!user_skills_user_id_fkey(id, name)
        `)
        .ilike('skill_name', `%${skillToLearn}%`)
        .eq('skill_type', 'teach')
        .neq('user_id', user?.id) // Exclude current user

      if (skillsError) {
        console.error('Error finding teaching skills:', skillsError)
        throw skillsError
      }

      console.log('📚 Found teaching skills:', teachingSkills)

      if (!teachingSkills || teachingSkills.length === 0) {
        // No teachers found for this skill
        setCallState('idle')
        showInfo('No Teachers Available', `No teachers found for "${skillToLearn}". Try a different skill or check back later.`)
        return
      }

      // Step 2: Check which of these users are currently online
      const teacherIds = teachingSkills.map(skill => skill.user_id)
      const { data: onlineTeachers, error: availabilityError } = await supabase
        .from('availability')
        .select('user_id, is_online')
        .in('user_id', teacherIds)
        .eq('is_online', true)

      if (availabilityError) {
        console.error('Error checking availability:', availabilityError)
        // Continue without online check - show all teachers
      }

      const onlineTeacherIds = new Set(onlineTeachers?.map(t => t.user_id) || [])
      console.log('🟢 Online teachers:', Array.from(onlineTeacherIds))

      // Step 3: Create matched peers list
      const availablePeers = teachingSkills
        .map(skill => {
          // Handle both array and object cases for profiles
          const profile = skill.profiles as any
          const profileName = Array.isArray(profile) ? profile[0]?.name : profile?.name

          return {
            id: skill.user_id,
            name: profileName || 'Unknown Teacher',
            skill_name: skill.skill_name,
            isOnline: onlineTeacherIds.has(skill.user_id)
          }
        })
        .filter(peer => peer.name !== 'Unknown Teacher') // Filter out users without names

      console.log('👥 Available peers:', availablePeers)

      // Simulate search delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1500))

      if (availablePeers.length > 0) {
        // Sort by online status (online first)
        const sortedPeers = availablePeers.sort((a, b) => {
          if (a.isOnline && !b.isOnline) return -1
          if (!a.isOnline && b.isOnline) return 1
          return 0
        })

        setMatchedPeers(sortedPeers)
        setCallState('matched')
        showInfo('Teachers Found!', `Found ${availablePeers.length} teacher${availablePeers.length !== 1 ? 's' : ''} for "${skillToLearn}"`)
      } else {
        // Teachers exist but none have valid profiles
        setCallState('idle')
        showInfo('No Available Teachers', `Teachers for "${skillToLearn}" found but none are currently available. Try again later.`)
      }

    } catch (error) {
      console.error('Error finding peers:', error)
      setCallState('idle')
      showError('Search Error', 'Failed to find teachers. Please check your connection and try again.')
    }
  }

  const selectPeer = (peer: MatchedPeer) => {
    setSelectedPeer(peer)
  }

  const startSession = async () => {
    if (!selectedPeer) return

    setCallState('calling')
    setMatchedPeer(selectedPeer)

    try {
      console.log('📞 Initiating call to:', selectedPeer.name)

      // Step 1: Create session record in Supabase
      console.log('📝 Creating session with data:', {
        host_id: selectedPeer.id,
        learner_id: user?.id,
        skill_name: selectedPeer.skill_name,
        mode: 'live',
        status: 'pending'
      })

      const { data: session, error } = await supabase
        .from('sessions')
        .insert({
          host_id: selectedPeer.id,        // Teacher (receiver)
          learner_id: user?.id,            // Learner (caller)
          skill_name: selectedPeer.skill_name,
          mode: 'live',
          status: 'pending'
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating session:', error)
        showError('Database Error', `Failed to create session: ${error.message}`)
        throw error
      }

      console.log('✅ Session created successfully:', session)
      setCurrentSession(session)

      // Verify the session was created by querying it back
      const { data: verifySession, error: verifyError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', session.id)
        .single()

      if (verifyError) {
        console.error('❌ Error verifying session:', verifyError)
      } else {
        console.log('✅ Session verified in database:', verifySession)
      }

      // Show calling state
      showInfo('Calling...', `Calling ${selectedPeer.name} to teach ${selectedPeer.skill_name}`)

    } catch (error) {
      console.error('Error starting session:', error)
      showError('Call Failed', 'Failed to initiate call. Please try again.')
      setCallState('matched') // Go back to matched state
    }
  }


  // --- Accept Call: Make sure peer and local stream are ready before accepting ---
  const acceptCall = async () => {
    if (!incomingCall) return;

    try {
      const myPeerId = `${user?.id}-session-${incomingCall.sessionId}`;
      const stream = await peerClient.getLocalStream();
      await peerClient.initialize(myPeerId);

      // Set up incoming call handler
      peerClient.onIncomingCall((remoteStream: MediaStream) => {
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.muted = false;
        }
      });

      setLocalStream(stream);
      if (localVideoRef.current && stream) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
      }

      // Now update session status to accepted
      const { data: updatedSession, error } = await supabase
        .from('sessions')
        .update({
          status: 'accepted',
          started_at: new Date().toISOString()
        })
        .eq('id', incomingCall.sessionId)
        .eq('status', 'pending')
        .select()
        .single();

      if (error) throw error;
      if (!updatedSession) {
        setIncomingCall(null);
        setCallState('idle');
        return;
      }

   
      setIncomingCall(null);
      setCallState('connected');
      setCurrentSession(updatedSession);
      await startVideoCall({ session: updatedSession, role: 'callee' });
    } catch (error) {
      showError('Accept Failed', 'Failed to accept call. Please try again.');
    }
  };

  // --- Start Video Call: Always get local stream and initialize peer before calling ---
 

  type StartVideoArgs = {
    session: any;
    role: 'caller' | 'callee'; // caller = learner, callee = teacher
  };
  
  const startVideoCall = async ({ session, role }: StartVideoArgs) => {
    try {
      const myPeerId = `${user?.id}-session-${session.id}`;
      const remotePeerId =
        role === 'caller'
          ? `${session.host_id}-session-${session.id}`
          : `${session.learner_id}-session-${session.id}`;
  
      const stream = await peerClient.getLocalStream();
      if (!stream) {
        showError('Media Error', 'Could not access camera or microphone. Please enable permissions.');
        return;
      }
  
      await peerClient.initialize(myPeerId);
  
      // handle incoming stream (works for both roles)
      peerClient.onIncomingCall((remoteStream: MediaStream) => {
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.muted = false;
          // handle autoplay policies
          remoteVideoRef.current.play?.().catch(() => {});
        }
      });
  
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        localVideoRef.current.play?.().catch(() => {});
      }
  
      // only the caller dials out
      if (role === 'caller') {
        try {
          const rStream = await peerClient.initiateCallToPeer(remotePeerId);
          setRemoteStream(rStream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = rStream;
            remoteVideoRef.current.muted = false;
            remoteVideoRef.current.play?.().catch(() => {});
          }
        } catch {
          showWarning('Connection Issue', 'Could not establish video connection. Retrying...');
          setTimeout(async () => {
            try {
              const rStream = await peerClient.initiateCallToPeer(remotePeerId);
              setRemoteStream(rStream);
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = rStream;
                remoteVideoRef.current.muted = false;
                remoteVideoRef.current.play?.().catch(() => {});
              }
              showInfo('Connected!', 'Video connection established');
            } catch {
              showError('Connection Failed', 'Unable to establish video connection. Please try again.');
            }
          }, 3000);
        }
      }
    } catch {
      showError('Video Error', 'Failed to start video call. Please check camera/microphone permissions.');
    }
  };
  
  const cancelCall = async () => {
    if (!currentSession) return

    try {
      console.log('🚫 Cancelling call...')

      // Update session status to rejected (cancelled by caller)
      const { error } = await supabase
        .from('sessions')
        .update({
          status: 'rejected',
          ended_at: new Date().toISOString()
        })
        .eq('id', currentSession.id)
        .eq('status', 'pending')

      if (error) {
        console.error('Error cancelling call:', error)
      } else {
        console.log('✅ Call cancelled successfully')
      }

      // Reset state
      setCallState('idle')
      setCurrentSession(null)
      setMatchedPeer(null)

      showInfo('Call Cancelled', 'You cancelled the call.')

    } catch (error) {
      console.error('Error cancelling call:', error)

      // Reset state anyway
      setCallState('idle')
      setCurrentSession(null)
      setMatchedPeer(null)
    }
  }

  // Incoming calls are now handled globally by CallProvider

  // Toggle video stream on/off
  const toggleVideo = () => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach(track => {
      track.enabled = !videoEnabled;
    });
    setVideoEnabled(!videoEnabled);
  };

  // Toggle audio stream on/off
  const toggleAudio = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !audioEnabled;
    });
    setAudioEnabled(!audioEnabled);
  };

  // --- End Call handler ---
  // const endCall = async () => {
  //   if (!currentSession) return;

  //   try {
  //     // Disconnect peer connection
  //     peerClient.disconnect();
  //     if (localStream) {
  //       localStream.getTracks().forEach(track => track.stop());
  //       setLocalStream(null);
  //     }
  //     if (remoteStream) {
  //       setRemoteStream(null);
  //     }

  //     // Update session status to ended
  //     await supabase
  //       .from('sessions')
  //       .update({
  //         status: 'ended',
  //         ended_at: new Date().toISOString()
  //       })
  //       .eq('id', currentSession.id);

  //     setCallState('ended');
  //     setCurrentSession(null);
  //     setMatchedPeer(null);
  //     setIncomingCall(null);

  //     showInfo('Call Ended', 'You ended the call.');
  //   } catch (error) {
  //     showError('End Call Failed', 'Failed to end the call. Please try again.');
  //   }
  // };

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
  // --- Video call interface for CALLERS (learners who initiate calls) ---
  if (callState === 'connected') {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
        {/* Video containers */}
        <div className="flex-1 relative">
          {/* Remote video (main) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full "
          />

          {/* Local video (picture-in-picture) */}
          <div className="absolute top-4 right-4 w-24 h-18 sm:w-48 sm:h-36 bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>

          {/* Call info */}
          <div className="absolute top-4 left-4 bg-black/70 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-lg">
            <p className="text-xs sm:text-sm">
              Learning: {currentSession?.skill_name || 'Demo Skill'}
            </p>
            <p className="text-xs opacity-75">
              {matchedPeer ? `With ${matchedPeer.name}` : 'Connected'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-black/80 backdrop-blur-sm z-[9999]">
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
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Live SkillSwap</h1>
        <p className="text-muted-foreground">
          Connect with peers for real-time learning sessions
        </p>
      </div>



      {/* Idle state */}
      {callState === 'idle' && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Ready to Learn?</CardTitle>
            <CardDescription>
              We'll match you with someone who can teach the skills you want to learn
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Button onClick={startLearningForm} size="lg" className="w-full">
              Find a Learning Partner
            </Button>

            {/* Debug button for testing incoming calls */}
            {/* {process.env.NODE_ENV === 'development' && (
              <Button
                onClick={() => {
                  setIncomingCall({
                    sessionId: 999,
                    learnerName: 'Test User',
                    skillName: 'React Development',
                    learnerId: 'test-id'
                  })
                  setCallState('incoming')
                }}
                variant="outline"
                size="sm"
                className="w-full mt-2"
              >
                🧪 Test Incoming Call (Dev Only)
              </Button>
            )} */}
          </CardContent>
        </Card>
      )}

      {/* Learning form state */}
      {callState === 'form' && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>What do you want to learn?</CardTitle>
            <CardDescription>
              Enter a skill you'd like to learn and we'll find available teachers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="e.g. React, Python, Guitar, Spanish..."
                value={skillToLearn}
                onChange={(e) => setSkillToLearn(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && findPeersForSkill()}
              />
            </div>

            {availableSkills.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Popular skills:</p>
                <div className="flex flex-wrap gap-2">
                  {availableSkills.slice(0, 8).map((skill) => (
                    <button
                      key={skill}
                      onClick={() => setSkillToLearn(skill)}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <Button onClick={() => setCallState('idle')} variant="outline" className="flex-1">
                Back
              </Button>
              <Button onClick={findPeersForSkill} className="flex-1">
                <Search className="h-4 w-4 mr-2" />
                Find Learning Partner
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matched peers state */}
      {callState === 'matched' && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Available Teachers</CardTitle>
            <CardDescription>
              Found {matchedPeers.length} teacher{matchedPeers.length !== 1 ? 's' : ''} for "{skillToLearn}"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {matchedPeers.map((peer) => (
              <div
                key={peer.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedPeer?.id === peer.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
                onClick={() => selectPeer(peer)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{peer.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Can teach: {peer.skill_name}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${peer.isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                    <span className={`text-sm ${peer.isOnline ? 'text-green-600' : 'text-gray-500'
                      }`}>
                      {peer.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex space-x-3 pt-4">
              <Button onClick={() => setCallState('form')} variant="outline" className="flex-1">
                Back
              </Button>
              <Button
                onClick={startSession}
                disabled={!selectedPeer}
                className="flex-1"
              >
                <Users className="h-4 w-4 mr-2" />
                Start Session
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Searching state */}
      {callState === 'searching' && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="animate-pulse mb-4">
              <div className="w-16 h-16 bg-primary rounded-full mx-auto mb-4"></div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Searching for available teachers...</h3>
            <p className="text-muted-foreground">
              This may take a moment while we find the perfect match
            </p>
          </CardContent>
        </Card>
      )}

      {/* Calling state */}
      {callState === 'calling' && matchedPeer && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="text-center py-12">
            <div className="animate-pulse mb-4">
              <PhoneIncoming className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-blue-800">
              Calling {matchedPeer.name}...
            </h3>
            <p className="text-blue-600 mb-4">
              Requesting to learn: {matchedPeer.skill_name}
            </p>
            <p className="text-sm text-blue-500 mb-6">
              Waiting for them to accept your call
            </p>

            <Button
              onClick={cancelCall}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              Cancel Call
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Call ended state */}
      {callState === 'ended' && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Session Ended</CardTitle>
            <CardDescription>
              Your learning session has ended
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setCallState('idle')} size="lg">
              Start New Session
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <AlertModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        type={['success', 'error', 'warning', 'info'].includes(modalState.type as string) ? modalState.type as 'success' | 'error' | 'warning' | 'info' : undefined}
        onConfirm={modalState.onConfirm}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
      />
    </div>
  )
}
