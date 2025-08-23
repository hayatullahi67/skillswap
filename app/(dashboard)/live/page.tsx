'use client'

import { useState, useEffect, useRef } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertModal } from '@/components/ui/modal'
import { useModal } from '@/hooks/useModal'
import { useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabaseClient'
import { PhoneIncoming, PhoneOff, Search, Users } from 'lucide-react'
import { useCall } from '@/components/providers/CallProvider'

type MatchedPeer = {
  id: string
  name: string
  skill_name: string
  isOnline?: boolean
}

type CallState = 'idle' | 'form' | 'searching' | 'matched' | 'calling' | 'connected'

export default function LivePage() {
  const [callState, setCallState] = useState<CallState>('idle')
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [matchedPeer, setMatchedPeer] = useState<MatchedPeer | null>(null)
  const [skillToLearn, setSkillToLearn] = useState('')
  const [availableSkills, setAvailableSkills] = useState<string[]>([])
  const [matchedPeers, setMatchedPeers] = useState<MatchedPeer[]>([])
  const [selectedPeer, setSelectedPeer] = useState<MatchedPeer | null>(null)


  const { user } = useAppStore()
  const { modalState, showError, showWarning, showInfo, closeModal } = useModal()
  const { callState: globalCallState, startOutgoingCall } = useCall()

  // Track if we were previously in a connected state
  const [wasGloballyConnected, setWasGloballyConnected] = useState(false)

  // Monitor global call state and reset local state when call ends
  useEffect(() => {
    if (globalCallState === 'connected') {
      // User is in a call, stay on this page to show the interface
      console.log('📞 User is in a call, staying on live page')
      setWasGloballyConnected(true)
    } else if (globalCallState === 'idle' && wasGloballyConnected) {
      // Call ended after being globally connected, reset local state
      console.log('📞 Call ended, resetting live page state')
      resetLivePageState()
      setWasGloballyConnected(false)
      showInfo('Session Completed', 'Your learning session has ended successfully. Hope you learned something new!')
    }
  }, [globalCallState, wasGloballyConnected])

  // Subscribe to session updates for call status (only for outgoing calls)
  useEffect(() => {
    if (!user || !currentSession) return

    console.log('🔔 Setting up session updates for outgoing call:', currentSession.id)

    const sessionUpdatesChannel = supabase
      .channel(`session-updates-${currentSession.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${currentSession.id}`
      }, async (payload) => {
        console.log('📱 Session status update:', payload.new)

        const session = payload.new

        if (session.status === 'accepted') {
          console.log('✅ Call accepted!')
          showInfo('Call Accepted!', 'Starting video session...')
          setCallState('connected')
          // Start video call for caller using CallProvider
          try {
            await startOutgoingCall(session.id.toString(), session)
          } catch (error) {
            console.error('Failed to start outgoing call:', error)
            showError('Video Error', 'Failed to start video call')
          }
        } else if (session.status === 'rejected') {
          console.log('❌ Call rejected')
          setCallState('idle')
          setCurrentSession(null)
          setMatchedPeer(null)
          showWarning('Call Rejected', 'The teacher declined your call.')
        }
      })
      .subscribe()

    return () => {
      sessionUpdatesChannel.unsubscribe();
    }
  }, [currentSession])

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

  // Helper function to reset all live page state
  const resetLivePageState = () => {
    setCallState('idle')
    setCurrentSession(null)
    setMatchedPeer(null)
    setMatchedPeers([])
    setSelectedPeer(null)
    setSkillToLearn('')
  }
  // Incoming calls are handled by CallProvider

  // Video effects removed - handled by CallProvider

  // Video call interface completely removed - handled by CallProvider

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
              Find a Learning Partne
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
