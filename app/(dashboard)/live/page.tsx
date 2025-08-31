'use client'

import { useState, useEffect, useCallback } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertModal } from '@/components/ui/modal'
import { useModal } from '@/hooks/useModal'
import { useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabaseClient'
import { Search, Code, Monitor } from 'lucide-react'
import CollaborativeCoding from '@/components/coding/CollaborativeCoding'

type MatchedPeer = {
  id: string
  name: string
  skill_name: string
  isOnline?: boolean
}

type CodingState = 'idle' | 'form' | 'searching' | 'matched' | 'connecting' | 'coding'

export default function LivePage() {
  const [codingState, setCodingState] = useState<CodingState>('idle')
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [matchedPeer, setMatchedPeer] = useState<MatchedPeer | null>(null)
  const [skillToLearn, setSkillToLearn] = useState('')
  const [availableSkills, setAvailableSkills] = useState<string[]>([])
  const [matchedPeers, setMatchedPeers] = useState<MatchedPeer[]>([])
  const [selectedPeer, setSelectedPeer] = useState<MatchedPeer | null>(null)
  const [hasShownResumeModal, setHasShownResumeModal] = useState(false)

  const { user } = useAppStore()
  const { modalState, showError, showWarning, showInfo, closeModal } = useModal()

  // Subscribe to session updates for coding session status
  useEffect(() => {
    if (!user) return

    console.log('🔔 Setting up global session updates for user:', user.id)

    // Listen for custom event when session is accepted while already on live page
    const handleCodingSessionAccepted = async (event: any) => {
      const session = event.detail.session
      console.log('🎯 Received coding session accepted event:', session)

      if (session.status === 'accepted' && session.mode === 'coding') {
        console.log('✅ Processing accepted coding session from custom event')

        // Set up the session data
        setCurrentSession(session)

        // Determine the peer info
        const isHost = session.host_id === user.id
        const peerId = isHost ? session.learner_id : session.host_id

        // Get peer info
        const { data: peerProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', peerId)
          .single()

        const peerInfo = {
          id: peerId,
          name: peerProfile?.name || 'Unknown',
          skill_name: session.skill_name,
          isOnline: true
        }

        setMatchedPeer(peerInfo)
        setCodingState('coding')

        showInfo('Session Started!', 'Collaborative coding session is now active!')
      }
    }

    // Add event listener for custom coding session accepted event
    window.addEventListener('codingSessionAccepted', handleCodingSessionAccepted)

    // Add event listener for manual session check trigger
    const handleCheckForActiveSession = () => {
      console.log('🔄 Manual session check triggered')
      checkForActiveSession()
    }
    window.addEventListener('checkForActiveSession', handleCheckForActiveSession)

    // Listen for any session updates where this user is involved
    const globalSessionUpdatesChannel = supabase
      .channel(`global-session-updates-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `or(host_id.eq.${user.id},learner_id.eq.${user.id})`
      }, async (payload) => {
        console.log('💻 Global session status update:', payload.new)

        const session = payload.new

        if (session.status === 'accepted' && session.mode === 'coding') {
          console.log('✅ Coding session accepted!')

          // Set up the session data
          setCurrentSession(session)

          // Determine the peer info
          const isHost = session.host_id === user.id
          const peerId = isHost ? session.learner_id : session.host_id

          // Get peer info
          const { data: peerProfile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', peerId)
            .single()

          const peerInfo = {
            id: peerId,
            name: peerProfile?.name || 'Unknown',
            skill_name: session.skill_name,
            isOnline: true
          }

          setMatchedPeer(peerInfo)
          setCodingState('coding')

          showInfo('Session Accepted!', 'Starting collaborative coding session...')
          
          // Log for debugging
          console.log('🎯 LIVE PAGE: Session accepted and UI updated', {
            sessionId: session.id,
            isHost: session.host_id === user.id,
            currentUser: user.id,
            codingState: 'coding'
          })

        } else if (session.status === 'rejected' && (session.host_id === user.id || session.learner_id === user.id)) {
          console.log('❌ Session rejected')
          setCodingState('idle')
          setCurrentSession(null)
          setMatchedPeer(null)
          showWarning('Session Rejected', 'The coding session was declined.')
        } else if (session.status === 'ended' && (session.host_id === user.id || session.learner_id === user.id)) {
          console.log('📞 Session ended')
          setCodingState('idle')
          setCurrentSession(null)
          setMatchedPeer(null)
          showInfo('Session Ended', 'The coding session has ended.')
        }
      })
      .subscribe()

    return () => {
      globalSessionUpdatesChannel.unsubscribe()
      // Remove custom event listeners
      window.removeEventListener('codingSessionAccepted', handleCodingSessionAccepted)
      window.removeEventListener('checkForActiveSession', handleCheckForActiveSession)
    }
  }, [user])

  // Function to check for active sessions - memoized to prevent infinite loops
  const checkForActiveSession = useCallback(async (retryCount = 0) => {
      if (!user) return
      
      // Don't check if we're already in a coding session
      if (codingState === 'coding') {
        console.log('🔄 Already in coding session, skipping check')
        return
      }

      try {
        console.log('🔍 Checking for active coding sessions...', retryCount > 0 ? `(retry ${retryCount})` : '')

        // Check for any accepted coding sessions where this user is involved
        const { data: activeSessions, error } = await supabase
          .from('sessions')
          .select('*')
          .or(`host_id.eq.${user.id},learner_id.eq.${user.id}`)
          .eq('status', 'accepted')
          .eq('mode', 'coding')

        if (error) {
          console.error('Error checking active sessions:', error)
          return
        }

        if (activeSessions && activeSessions.length > 0) {
          const session = activeSessions[0]
          console.log('📱 Found active coding session:', session)

          // Set up the session data
          setCurrentSession(session)

          // Determine the peer info
          const isHost = session.host_id === user.id
          const peerId = isHost ? session.learner_id : session.host_id

          // Get peer info
          const { data: peerProfile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', peerId)
            .single()

          const peerInfo = {
            id: peerId,
            name: peerProfile?.name || 'Unknown',
            skill_name: session.skill_name,
            isOnline: true
          }

          setMatchedPeer(peerInfo)
          setCodingState('coding')

          // Only show modal once per session
          if (!hasShownResumeModal) {
            showInfo('Session Resumed', 'Resuming your active coding session...')
            setHasShownResumeModal(true)
          }
          
          // Log for debugging
          console.log('🎯 LIVE PAGE: Active session resumed', {
            sessionId: session.id,
            isHost: session.host_id === user.id,
            currentUser: user.id,
            codingState: 'coding',
            peerInfo
          })
        } else if (retryCount < 2) {
          // Reduced retry count to prevent infinite loops
          console.log('🔄 No active session found, retrying in 2 seconds...')
          setTimeout(() => {
            checkForActiveSession(retryCount + 1)
          }, 2000)
        }
      } catch (error) {
        console.error('Error checking for active session:', error)
      }
    }, [user, showInfo, codingState])

  // Load available skills and check for active sessions when component mounts
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
      
      // Check if user was redirected here after call acceptance
      const urlParams = new URLSearchParams(window.location.search)
      const fromCallAccepted = urlParams.get('from') === 'call-accepted'
      
      if (fromCallAccepted) {
        console.log('🔄 User redirected from call acceptance, checking for session...')
        // Add a small delay to ensure database is updated
        setTimeout(() => {
          checkForActiveSession()
        }, 500)
      } else {
        // Only check once on mount, not on every render
        const timeoutId = setTimeout(() => {
          checkForActiveSession()
        }, 100)
        
        return () => clearTimeout(timeoutId)
      }
    }
  }, [user]) // Removed checkForActiveSession from dependencies to prevent infinite loop

  const startLearningForm = () => {
    setCodingState('form')
  }

  const findPeersForSkill = async () => {
    if (!skillToLearn.trim()) {
      showWarning('Skill Required', 'Please enter a skill you want to learn!')
      return
    }

    setCodingState('searching')

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
        // No mentors found for this skill
        setCodingState('idle')
        showInfo('No Mentors Available', `No coding mentors found for "${skillToLearn}". Try a different skill or check back later.`)
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
        setCodingState('matched')
        showInfo('Mentors Found!', `Found ${availablePeers.length} coding mentor${availablePeers.length !== 1 ? 's' : ''} for "${skillToLearn}"`)
      } else {
        // Mentors exist but none have valid profiles
        setCodingState('idle')
        showInfo('No Available Mentors', `Coding mentors for "${skillToLearn}" found but none are currently available. Try again later.`)
      }

    } catch (error) {
      console.error('Error finding peers:', error)
      setCodingState('idle')
      showError('Search Error', 'Failed to find coding mentors. Please check your connection and try again.')
    }
  }

  const selectPeer = (peer: MatchedPeer) => {
    setSelectedPeer(peer)
  }

  const startSession = async () => {
    if (!selectedPeer) return

    setCodingState('connecting')
    setMatchedPeer(selectedPeer)

    try {
      console.log('💻 Initiating coding session with:', selectedPeer.name)

      // Step 1: Create session record in Supabase
      console.log('📝 Creating coding session with data:', {
        host_id: selectedPeer.id,
        learner_id: user?.id,
        skill_name: selectedPeer.skill_name,
        mode: 'coding',
        status: 'pending'
      })

      const { data: session, error } = await supabase
        .from('sessions')
        .insert({
          host_id: selectedPeer.id,        // Mentor (receiver)
          learner_id: user?.id,            // Learner (requester)
          skill_name: selectedPeer.skill_name,
          mode: 'coding',
          status: 'pending'
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating session:', error)
        showError('Database Error', `Failed to create coding session: ${error.message}`)
        throw error
      }

      console.log('✅ Coding session created successfully:', session)
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

      // Show connecting state
      showInfo('Connecting...', `Requesting coding session with ${selectedPeer.name} for ${selectedPeer.skill_name}`)

    } catch (error) {
      console.error('Error starting session:', error)
      showError('Session Failed', 'Failed to initiate coding session. Please try again.')
      setCodingState('matched') // Go back to matched state
    }
  }






  const cancelSession = async () => {
    if (!currentSession) return

    try {
      console.log('🚫 Cancelling coding session...')

      // Update session status to rejected (cancelled by requester)
      const { error } = await supabase
        .from('sessions')
        .update({
          status: 'rejected',
          ended_at: new Date().toISOString()
        })
        .eq('id', currentSession.id)
        .eq('status', 'pending')

      if (error) {
        console.error('Error cancelling session:', error)
      } else {
        console.log('✅ Session cancelled successfully')
      }

      // Reset state
      setCodingState('idle')
      setCurrentSession(null)
      setMatchedPeer(null)

      showInfo('Session Cancelled', 'You cancelled the coding session.')

    } catch (error) {
      console.error('Error cancelling session:', error)

      // Reset state anyway
      setCodingState('idle')
      setCurrentSession(null)
      setMatchedPeer(null)
    }
  }

  // Helper function to reset all live page state
  const resetLivePageState = () => {
    setCodingState('idle')
    setCurrentSession(null)
    setMatchedPeer(null)
    setMatchedPeers([])
    setSelectedPeer(null)
    setSkillToLearn('')
    setHasShownResumeModal(false) // Reset modal flag
  }

  const endCodingSession = () => {
    resetLivePageState()
    showInfo('Session Ended', 'Coding session has been ended.')
  }

  return (
    <div className={`${codingState === 'coding' ? 'p-0 max-w-none' : 'p-6 max-w-2xl mx-auto'}`}>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Live Coding Sessions</h1>
        <p className="text-muted-foreground">
          Connect with coding mentors for real-time collaborative programming
        </p>
      </div>



      {/* Idle state */}
      {codingState === 'idle' && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Ready to Code?</CardTitle>
            <CardDescription>
              We'll match you with a coding mentor for real-time collaborative programming
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Button onClick={startLearningForm} size="lg" className="w-full">
              <Code className="h-5 w-5 mr-2" />
              Find a Coding Mentor
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Learning form state */}
      {codingState === 'form' && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>What coding skill do you want to learn?</CardTitle>
            <CardDescription>
              Enter a programming skill and we'll find available coding mentors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="e.g. React, Python, JavaScript, Node.js, TypeScript..."
                value={skillToLearn}
                onChange={(e) => setSkillToLearn(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && findPeersForSkill()}
              />
            </div>

            {availableSkills.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Popular coding skills:</p>
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
              <Button onClick={() => setCodingState('idle')} variant="outline" className="flex-1">
                Back
              </Button>
              <Button onClick={findPeersForSkill} className="flex-1">
                <Search className="h-4 w-4 mr-2" />
                Find Coding Mentor
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matched peers state */}
      {codingState === 'matched' && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Available Coding Mentors</CardTitle>
            <CardDescription>
              Found {matchedPeers.length} coding mentor{matchedPeers.length !== 1 ? 's' : ''} for "{skillToLearn}"
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
                      Can mentor: {peer.skill_name}
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
              <Button onClick={() => setCodingState('form')} variant="outline" className="flex-1">
                Back
              </Button>
              <Button
                onClick={startSession}
                disabled={!selectedPeer}
                className="flex-1"
              >
                <Monitor className="h-4 w-4 mr-2" />
                Start Coding Session
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Searching state */}
      {codingState === 'searching' && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="animate-pulse mb-4">
              <Code className="w-16 h-16 text-primary mx-auto mb-4" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Searching for available coding mentors...</h3>
            <p className="text-muted-foreground">
              This may take a moment while we find the perfect coding mentor
            </p>
          </CardContent>
        </Card>
      )}

      {/* Connecting state */}
      {codingState === 'connecting' && matchedPeer && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="text-center py-12">
            <div className="animate-pulse mb-4">
              <Monitor className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-blue-800">
              Connecting to {matchedPeer.name}...
            </h3>
            <p className="text-blue-600 mb-4">
              Requesting coding session for: {matchedPeer.skill_name}
            </p>
            <p className="text-sm text-blue-500 mb-6">
              Waiting for them to accept your coding session
            </p>

            <Button
              onClick={cancelSession}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              Cancel Session
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Coding session state */}
      {codingState === 'coding' && currentSession && matchedPeer && (
        <div className="h-screen flex flex-col">
          <Card className="border-green-200 bg-green-50 rounded-none">
            <CardContent className="text-center py-3">
              <h3 className="text-lg font-semibold text-green-800 mb-1">
                Coding Session Active with {matchedPeer.name}
              </h3>
              <p className="text-green-600 text-sm">
                Learning: {matchedPeer.skill_name}
              </p>
            </CardContent>
          </Card>

          <div className="flex-1">
            <CollaborativeCoding
              sessionId={currentSession.id}
              mentorId={matchedPeer.id}
              learnerId={user?.id || ''}
              skillName={matchedPeer.skill_name}
              onEndSession={endCodingSession}
            />
          </div>
        </div>
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
