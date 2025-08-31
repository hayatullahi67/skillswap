'use client'

import React, { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabaseClient'
import { kiroClient } from '@/lib/kiroClient'
import { useAppStore } from '@/lib/store'
import { getPeerClient } from '@/lib/simplePeerClient'
import {
    Play, Bug, Lightbulb, MessageCircle, Code, User, Bot, Send,
    Mic, MicOff, Video, VideoOff, Phone, PhoneOff, Settings,
    Maximize2, Minimize2, Users, Volume2, VolumeX, Monitor,
    Smartphone, Tablet, X, Menu, ChevronDown, ChevronUp
} from 'lucide-react'


// Dynamically import Monaco Editor
const Editor = dynamic(
    () => import('@monaco-editor/react').then((mod) => ({ default: mod.Editor })),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg font-medium text-gray-700">Loading Code Editor...</p>
                    <p className="text-sm text-gray-500 mt-1">Preparing your collaborative workspace</p>
                </div>
            </div>
        )
    }
)

interface CollaborativeCodingProps {
    sessionId: number
    mentorId: string
    learnerId: string
    skillName: string
    onEndSession: () => void
}

interface CodeChange {
    content: string
    language: string
    timestamp: number
    userId: string
    userName: string
}

interface ChatMessage {
    id: string
    content: string
    sender: 'teacher' | 'learner' | 'ai'
    senderName: string
    timestamp: number
    type: 'message' | 'suggestion' | 'bug' | 'explanation'
    isPrivateAI?: boolean
    userId?: string
}

interface AISuggestion {
    type: 'improvement' | 'bug' | 'explanation'
    message: string
    line?: number
    severity?: 'high' | 'medium' | 'low'
}

interface VoiceCallState {
    isConnected: boolean
    isInitiating: boolean
    localStream: MediaStream | null
    remoteStream: MediaStream | null
    isAudioEnabled: boolean
    isVideoEnabled: boolean
    isMuted: boolean
    isDeafened: boolean
}

export default function CollaborativeCoding({
    sessionId,
    mentorId,
    learnerId,
    skillName,
    onEndSession
}: CollaborativeCodingProps) {
    // Core state
    const [code, setCode] = useState('// Welcome to collaborative coding!\n// Start typing to begin your journey...\n\n')
    const [language, setLanguage] = useState('javascript')
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([])
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [isAIResponding, setIsAIResponding] = useState(false)

    // UI state
    const [isChatExpanded, setIsChatExpanded] = useState(true)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [activeTab, setActiveTab] = useState<'code' | 'chat'>('code') // Mobile tabs: code editor or chat
    const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')

    // Voice call state
    const [voiceCall, setVoiceCall] = useState<VoiceCallState>({
        isConnected: false,
        isInitiating: false,
        localStream: null,
        remoteStream: null,
        isAudioEnabled: true,
        isVideoEnabled: false,
        isMuted: false,
        isDeafened: false
    })
    
    // Track when both peers are ready for voice
    const [peerVoiceStatus, setPeerVoiceStatus] = useState<{
        teacherReady: boolean,
        learnerReady: boolean,
        remoteSocketConnected: boolean
    }>({
        teacherReady: false,
        learnerReady: false,
        remoteSocketConnected: false
    })

    const { user } = useAppStore()
    const editorRef = useRef<any>(null)
    const chatEndRef = useRef<HTMLDivElement>(null)
    const realtimeChannelRef = useRef<any>(null)
    const localAudioRef = useRef<HTMLAudioElement>(null)
    const remoteAudioRef = useRef<HTMLAudioElement>(null)
    const peerClientRef = useRef<any>(null)


    // Determine if current user is the mentor
    const isTeacher = user?.id === mentorId
    const peerName = isTeacher ? 'Learner' : 'Mentor'

    // Detect device type for responsive design
    useEffect(() => {
        const detectDevice = () => {
            const width = window.innerWidth
            if (width < 768) setDeviceType('mobile')
            else if (width < 1024) setDeviceType('tablet')
            else setDeviceType('desktop')
        }

        detectDevice()
        window.addEventListener('resize', detectDevice)
        return () => window.removeEventListener('resize', detectDevice)
    }, [])

    // Intelligent language detection
    const detectLanguage = (skillName: string, codeContent: string = '') => {
        const skill = skillName.toLowerCase()
        const code = codeContent.toLowerCase()

        // Skill-based detection
        if (skill.includes('react') || skill.includes('javascript') || skill.includes('js')) return 'javascript'
        if (skill.includes('typescript') || skill.includes('ts')) return 'typescript'
        if (skill.includes('python') || skill.includes('django') || skill.includes('flask')) return 'python'
        if (skill.includes('java') && !skill.includes('javascript')) return 'java'
        if (skill.includes('html')) return 'html'
        if (skill.includes('css')) return 'css'
        if (skill.includes('c++') || skill.includes('cpp')) return 'cpp'
        if (skill.includes('flutter') || skill.includes('dart')) return 'dart'
        if (skill.includes('swift') || skill.includes('ios')) return 'swift'
        if (skill.includes('kotlin') || skill.includes('android')) return 'kotlin'
        if (skill.includes('go') || skill.includes('golang')) return 'go'
        if (skill.includes('rust')) return 'rust'
        if (skill.includes('php')) return 'php'
        if (skill.includes('ruby')) return 'ruby'
        if (skill.includes('c#') || skill.includes('csharp')) return 'csharp'

        // Code-based detection
        if (code.includes('def ') || code.includes('import ') || code.includes('print(')) return 'python'
        if (code.includes('function') || code.includes('const ') || code.includes('let ')) return 'javascript'
        if (code.includes('interface ') || code.includes(': string') || code.includes(': number')) return 'typescript'
        if (code.includes('public class') || code.includes('System.out.println')) return 'java'
        if (code.includes('<html>') || code.includes('<div>')) return 'html'
        if (code.includes('body {') || code.includes('.class')) return 'css'
        if (code.includes('#include') || code.includes('std::')) return 'cpp'

        return 'javascript'
    }

    // Initialize voice call system only when needed (when user clicks mic button)
    const initializeVoiceCallWhenNeeded = async () => {
        try {
            console.log('🎤 Initializing voice call system when needed...')

            const myPeerId = `${user?.id}-voice-${sessionId}`
            const remotePeerId = isTeacher
                ? `${learnerId}-voice-${sessionId}`
                : `${mentorId}-voice-${sessionId}`

            console.log('🎤 Voice call peer IDs:', { myPeerId, remotePeerId })

            // Get simplified peer client
            peerClientRef.current = getPeerClient(myPeerId)

            // Handle incoming voice streams
            peerClientRef.current.onIncomingCall((peerId: string, remoteStream: MediaStream) => {
                console.log('🎤 Received voice stream from:', peerId, {
                    audioTracks: remoteStream.getAudioTracks().length,
                    streamId: remoteStream.id
                })

                setVoiceCall(prev => ({
                    ...prev,
                    remoteStream,
                    isConnected: true,
                    isInitiating: false
                }))

                // Play remote audio with better error handling
                if (remoteAudioRef.current) {
                    remoteAudioRef.current.srcObject = remoteStream
                    remoteAudioRef.current.muted = false // Make sure we can hear them
                    remoteAudioRef.current.volume = 1.0 // Ensure volume is at maximum
                    
                    // Try to play with user interaction handling
                    const playPromise = remoteAudioRef.current.play()
                    if (playPromise !== undefined) {
                        playPromise
                            .then(() => {
                                console.log('✅ Remote audio playing successfully')
                                
                                // Add volume monitoring for debugging
                                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
                                const source = audioContext.createMediaStreamSource(remoteStream)
                                const analyser = audioContext.createAnalyser()
                                source.connect(analyser)
                                
                                const dataArray = new Uint8Array(analyser.frequencyBinCount)
                                const checkVolume = () => {
                                    analyser.getByteFrequencyData(dataArray)
                                    const volume = dataArray.reduce((a, b) => a + b) / dataArray.length
                                    if (volume > 0) {
                                        console.log('🔊 Remote audio volume detected:', volume)
                                    }
                                }
                                
                                // Check volume every 2 seconds for debugging
                                const volumeInterval = setInterval(checkVolume, 2000)
                                setTimeout(() => clearInterval(volumeInterval), 10000) // Stop after 10 seconds
                            })
                            .catch(e => {
                                console.log('⚠️ Remote audio play failed (may need user interaction):', e)
                                // This is often due to browser autoplay policy
                            })
                    }
                }

                // Notify user that voice connection is established
                addChatMessage({
                    content: '🔊 Voice connection established! You can now hear your partner.',
                    sender: 'ai',
                    senderName: 'System',
                    type: 'message'
                })
            })

            // Handle incoming offers (for teachers receiving calls from learners)
            peerClientRef.current.onIncomingOffer(async (fromPeerId: string, offer: any) => {
                console.log('📞 Received incoming voice call from:', fromPeerId)

                if (fromPeerId === remotePeerId) {
                    try {
                        console.log('✅ Teacher accepting voice call from learner:', fromPeerId)
                        await peerClientRef.current.acceptConnection(fromPeerId)
                        
                        // Update voice call state for teacher
                        setVoiceCall(prev => ({ ...prev, isConnected: true }))

                        addChatMessage({
                            content: '📞 Voice call connected! Your partner can now hear you.',
                            sender: 'ai',
                            senderName: 'System',
                            type: 'message'
                        })
                    } catch (error) {
                        console.error('❌ Failed to accept voice call:', error)
                        
                        addChatMessage({
                            content: '❌ Failed to accept voice call. Please try again.',
                            sender: 'ai',
                            senderName: 'System',
                            type: 'message'
                        })
                    }
                }
            })

            console.log('✅ Voice call system ready (no permissions requested yet)')
            return { myPeerId, remotePeerId }
        } catch (error) {
            console.error('❌ Voice call initialization failed:', error)
            throw error
        }
    }

    // Clear any existing permissions and force fresh request
    const clearExistingPermissions = async () => {
        try {
            // Stop all existing media tracks
            if (voiceCall.localStream) {
                console.log('🛑 Stopping existing media tracks...')
                voiceCall.localStream.getTracks().forEach(track => {
                    track.stop()
                    console.log(`🛑 Stopped track: ${track.kind} - ${track.id}`)
                })
            }

            // Clear any cached streams in peer client
            if (peerClientRef.current) {
                peerClientRef.current.disconnect()
            }

            // Clear audio elements
            if (localAudioRef.current) localAudioRef.current.srcObject = null
            if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null

            console.log('✅ Cleared existing permissions and streams')
        } catch (error) {
            console.error('❌ Error clearing existing permissions:', error)
        }
    }

    // Force fresh microphone permission request
    const requestFreshMicrophoneAccess = async () => {
        try {
            console.log('🎤 Requesting fresh microphone access...')

            // Clear any existing permissions first
            await clearExistingPermissions()

            // Add a small delay to ensure cleanup is complete
            await new Promise(resolve => setTimeout(resolve, 100))

            // Request fresh permission with unique constraints to bypass cache
            const uniqueConstraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    // Add timestamp to make constraints unique each time
                    sampleRate: 44100,
                    channelCount: 1,
                    // This combination forces a fresh permission dialog
                    advanced: [{ echoCancellation: true }]
                },
                video: false
            }

            console.log('🎤 Making fresh getUserMedia request...')
            const freshStream = await navigator.mediaDevices.getUserMedia(uniqueConstraints)

            console.log('✅ Fresh microphone access granted:', {
                audioTracks: freshStream.getAudioTracks().length,
                trackIds: freshStream.getAudioTracks().map((t: MediaStreamTrack) => t.id),
                timestamp: Date.now()
            })

            return freshStream

        } catch (error) {
            console.error('❌ Fresh microphone access failed:', error)
            throw error
        }
    }

    // Start voice call with fresh permission request
    const startVoiceCall = async () => {
        try {
            console.log('🎤 Starting voice call with fresh permissions...')
            setVoiceCall(prev => ({ ...prev, isInitiating: true }))

            // Initialize voice call system if not already done
            if (!peerClientRef.current) {
                const { myPeerId, remotePeerId } = await initializeVoiceCallWhenNeeded()

                // Store peer IDs for connection
                peerClientRef.current.myPeerId = myPeerId
                peerClientRef.current.remotePeerId = remotePeerId
                
                // Now initialize peer client
                console.log('🎤 Initializing peer client...')
                await peerClientRef.current.initialize()
                console.log('✅ Peer client initialized')
            } else {
                console.log('🔄 Peer client already initialized, reusing...')
            }

            // Get the local stream
            const localStream = await peerClientRef.current.getLocalStream()
            console.log('✅ Fresh microphone access granted:', {
                audioTracks: localStream.getAudioTracks().length,
                trackIds: localStream.getAudioTracks().map((t: MediaStreamTrack) => t.id)
            })

            setVoiceCall(prev => ({
                ...prev,
                localStream: localStream,
                isAudioEnabled: true,
                isInitiating: false
            }))

            // Set local audio
            if (localAudioRef.current) {
                localAudioRef.current.srcObject = localStream
                localAudioRef.current.muted = true // Prevent echo
                console.log('✅ Local audio element configured')
            }

            // CRITICAL: Now establish peer-to-peer connection
            const remotePeerId = peerClientRef.current.remotePeerId
            console.log('🔗 Establishing peer connection to:', remotePeerId)

            // Broadcast that voice call is ready
            if (realtimeChannelRef.current) {
                realtimeChannelRef.current.send({
                    type: 'broadcast',
                    event: 'voice_ready',
                    payload: {
                        userId: user?.id,
                        userName: user?.name,
                        peerId: peerClientRef.current.myPeerId,
                        role: isTeacher ? 'teacher' : 'learner',
                        timestamp: Date.now()
                    }
                })
                
                console.log('📡 Broadcasted voice ready status:', {
                    role: isTeacher ? 'teacher' : 'learner',
                    peerId: peerClientRef.current.myPeerId
                })
            }

            // Simplified approach: Use user ID comparison to determine who initiates
            // The user with the smaller ID always initiates to avoid conflicts
            const shouldInitiate = user?.id && (user.id < (isTeacher ? learnerId : mentorId))
            
            if (shouldInitiate) {
                console.log('🔗 I will initiate the voice connection (smaller user ID)')
                console.log('⏳ Waiting for remote peer to be ready before connecting...')
                
                // Don't connect immediately - wait for remote peer to be ready
                // The connection will be triggered in handleRemoteVoiceReady when remote peer is ready
                
                // Add fallback mechanism in case remote peer ready signal is missed
                setTimeout(async () => {
                    // Get fresh state values to avoid stale closure
                    const currentStream = peerClientRef.current?.getLocalStream()
                    const hasCurrentStream = !!currentStream
                    
                    console.log('⏰ Fallback check:', {
                        isConnected: voiceCall.isConnected,
                        hasPeerClient: !!peerClientRef.current,
                        hasLocalStream: hasCurrentStream,
                        willAttempt: !voiceCall.isConnected && peerClientRef.current && hasCurrentStream
                    })
                    
                    // Only attempt fallback if still not connected and peer client is ready
                    if (!voiceCall.isConnected && peerClientRef.current && hasCurrentStream) {
                        console.log('⏰ Fallback: Attempting connection after 3 seconds...')
                        
                        try {
                            const remotePeerId = isTeacher 
                                ? `${learnerId}-voice-${sessionId}`
                                : `${mentorId}-voice-${sessionId}`
                            
                            await peerClientRef.current.createConnection(remotePeerId)
                            setVoiceCall(prev => ({ ...prev, isConnected: true }))
                            console.log('✅ Voice connection established via fallback')

                            addChatMessage({
                                content: '🎤 Voice chat connected! You can now talk to your partner.',
                                sender: 'ai',
                                senderName: 'System',
                                type: 'message'
                            })
                        } catch (error) {
                            console.error('❌ Fallback connection failed:', error)
                            
                            addChatMessage({
                                content: '⚠️ Voice connection failed. Please try refreshing the page.',
                                sender: 'ai',
                                senderName: 'System',
                                type: 'message'
                            })
                        }
                    }
                }, 3000) // 3 second fallback - more aggressive
                
                addChatMessage({
                    content: '🎤 Voice chat ready! Connection will happen automatically when your partner joins.',
                    sender: 'ai',
                    senderName: 'System',
                    type: 'message'
                })
            } else {
                console.log('👂 I will wait for incoming voice connection (larger user ID)')
                
                addChatMessage({
                    content: '🎤 Voice chat ready! Connection will happen automatically when your partner joins.',
                    sender: 'ai',
                    senderName: 'System',
                    type: 'message'
                })
            }

            console.log('✅ Voice call started successfully with fresh permissions')
            
            // Ensure isInitiating is cleared
            setVoiceCall(prev => ({ ...prev, isInitiating: false }))

        } catch (error) {
            console.error('❌ Failed to start voice call:', error)
            setVoiceCall(prev => ({
                ...prev,
                isInitiating: false,
                isConnected: false
            }))

            // Show more specific error message
            let errorMessage = '❌ Voice chat is currently unavailable. '
            const errorMsg = error instanceof Error ? error.message : String(error)

            if (errorMsg.includes('Permission denied') || errorMsg.includes('permissions')) {
                errorMessage += 'Microphone access was denied. Please allow microphone access and try again.'
            } else if (errorMsg.includes('not found') || errorMsg.includes('NotFoundError')) {
                errorMessage += 'No microphone found. Please check your audio devices.'
            } else if (errorMsg.includes('server error') || errorMsg.includes('Socket.IO')) {
                errorMessage += 'The voice chat server is temporarily unavailable. You can still use text chat to communicate with your coding partner.'
            } else {
                errorMessage += 'There was a technical issue. You can continue coding and use text chat to communicate.'
            }

            addChatMessage({
                content: errorMessage,
                sender: 'ai',
                senderName: 'System',
                type: 'message'
            })

            // If it's a server error, suggest using text chat
            if (errorMsg.includes('server error') || errorMsg.includes('Socket.IO')) {
                setTimeout(() => {
                    addChatMessage({
                        content: '💬 Don\'t worry! You can still collaborate effectively using this text chat. Type your questions, share ideas, and get help from your coding partner.',
                        sender: 'ai',
                        senderName: 'AI Mentor',
                        type: 'message'
                    })
                }, 2000)
            }
        }
    }

    // End voice call and clear permissions
    const endVoiceCall = () => {
        try {
            console.log('🔇 Ending voice call and clearing permissions...')

            // Stop local stream and clear permissions
            if (voiceCall.localStream) {
                voiceCall.localStream.getTracks().forEach(track => {
                    track.stop()
                    console.log(`🛑 Stopped and cleared track: ${track.kind} - ${track.id}`)
                })
            }

            // Disconnect peer
            if (peerClientRef.current) {
                peerClientRef.current.disconnect()
            }

            // Reset state
            setVoiceCall({
                isConnected: false,
                isInitiating: false,
                localStream: null,
                remoteStream: null,
                isAudioEnabled: true,
                isVideoEnabled: false,
                isMuted: false,
                isDeafened: false
            })

            // Clear audio elements
            if (localAudioRef.current) localAudioRef.current.srcObject = null
            if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null

            console.log('✅ Voice call ended and permissions cleared')

            addChatMessage({
                content: '📞 Voice call ended. Microphone permissions cleared for security.',
                sender: 'ai',
                senderName: 'System',
                type: 'message'
            })

        } catch (error) {
            console.error('❌ Error ending voice call:', error)
        }
    }

    // Toggle mute - start voice call if not already started
    const toggleMute = async () => {
        // Enable audio playback on user interaction (for browser autoplay policy)
        if (remoteAudioRef.current && remoteAudioRef.current.paused) {
            try {
                await remoteAudioRef.current.play()
                console.log('✅ Remote audio enabled via user interaction')
            } catch (e) {
                console.log('⚠️ Could not enable remote audio:', e)
            }
        }

        // Voice chat starts automatically, this button is only for mute/unmute
        if (!voiceCall.localStream) {
            addChatMessage({
                content: '🎤 Voice chat is starting automatically. Please wait a moment...',
                sender: 'ai',
                senderName: 'System',
                type: 'message'
            })
            return
        }

        // Toggle mute/unmute
        if (voiceCall.localStream) {
            const audioTrack = voiceCall.localStream.getAudioTracks()[0]
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled
                setVoiceCall(prev => ({
                    ...prev,
                    isMuted: !audioTrack.enabled
                }))

                // Add chat message about mute status
                addChatMessage({
                    content: `🎤 ${audioTrack.enabled ? 'Microphone unmuted - your partner can hear you' : 'Microphone muted - your partner cannot hear you'}`,
                    sender: 'ai',
                    senderName: 'System',
                    type: 'message'
                })
            }
        }
    }

    // Toggle deafen (mute remote audio)
    const toggleDeafen = () => {
        if (remoteAudioRef.current) {
            remoteAudioRef.current.muted = !remoteAudioRef.current.muted
            setVoiceCall(prev => ({
                ...prev,
                isDeafened: remoteAudioRef.current?.muted || false
            }))
        }
    }

    // Debug function to test voice connection
    const testVoiceConnection = () => {
        console.log('🧪 Testing voice connection...')

        const status = {
            peerClient: !!peerClientRef.current,
            localStream: !!voiceCall.localStream,
            remoteStream: !!voiceCall.remoteStream,
            isConnected: voiceCall.isConnected,
            localAudioTracks: voiceCall.localStream?.getAudioTracks().length || 0,
            remoteAudioTracks: voiceCall.remoteStream?.getAudioTracks().length || 0,
            myPeerId: peerClientRef.current?.getMyPeerId?.() || 'unknown',
            activeConnections: peerClientRef.current?.getActiveConnections?.() || []
        }

        console.log('🧪 Voice connection status:', status)

        addChatMessage({
            content: `🧪 Voice Debug: ${JSON.stringify(status, null, 2)}`,
            sender: 'ai',
            senderName: 'Debug',
            type: 'message'
        })

        return status
    }

    // End session gracefully for both users
    const endSessionGracefully = async (reason: string = 'Session ended') => {
        try {
            console.log('🔚 Ending session gracefully:', reason)

            // Update session status in database to 'ended'
            const { error } = await supabase
                .from('sessions')
                .update({
                    status: 'ended',
                    ended_at: new Date().toISOString()
                })
                .eq('id', sessionId)

            if (error) {
                console.error('❌ Error ending session in database:', error)
            } else {
                console.log('✅ Session ended in database')
            }

            // Broadcast session end to other user via realtime
            if (realtimeChannelRef.current) {
                realtimeChannelRef.current.send({
                    type: 'broadcast',
                    event: 'session_ended',
                    payload: {
                        reason: reason,
                        endedBy: user?.name || 'Unknown',
                        timestamp: Date.now()
                    }
                })
            }

            // Clean up voice call
            endVoiceCall()

            console.log('✅ Session ended gracefully')
        } catch (error) {
            console.error('❌ Error ending session gracefully:', error)
        }
    }

    // Enhanced onEndSession that ends for both users
    const handleEndSession = async () => {
        await endSessionGracefully('Session ended by user')
        onEndSession() // Call the parent callback
    }

    // Track component mount time to prevent premature session ending
    const mountTimeRef = useRef(Date.now())

    // Initialize real-time collaboration
    useEffect(() => {
        console.log('🚀 Initializing collaborative coding for session:', sessionId)

        // Set intelligent language based on skill
        const detectedLanguage = detectLanguage(skillName)
        setLanguage(detectedLanguage)
        console.log('🎯 Detected language:', detectedLanguage, 'for skill:', skillName)

        // Set up Supabase Realtime for code synchronization
        const channel = supabase
            .channel(`coding_session_${sessionId}`)
            .on('broadcast', { event: 'code_change' }, (payload) => {
                handleRemoteCodeChange(payload.payload)
            })
            .on('broadcast', { event: 'chat_message' }, (payload) => {
                handleRemoteChatMessage(payload.payload)
            })
            .on('broadcast', { event: 'ai_suggestion' }, (payload) => {
                handleRemoteAISuggestion(payload.payload)
            })
            .on('broadcast', { event: 'session_ended' }, (payload) => {
                handleRemoteSessionEnd(payload.payload)
            })
            .on('broadcast', { event: 'voice_ready' }, (payload) => {
                handleRemoteVoiceReady(payload.payload)
            })
            .on('broadcast', { event: 'user_refreshing' }, (payload) => {
                handleUserRefreshing(payload.payload)
            })
            .on('broadcast', { event: 'user_reconnected' }, (payload) => {
                handleUserReconnected(payload.payload)
            })
            .subscribe((status) => {
                console.log('📡 Coding channel status:', status)
            })

        realtimeChannelRef.current = channel

        // Broadcast that user has connected/reconnected
        if (realtimeChannelRef.current) {
            realtimeChannelRef.current.send({
                type: 'broadcast',
                event: 'user_reconnected',
                payload: {
                    userId: user?.id,
                    userName: user?.name,
                    timestamp: Date.now()
                }
            })
        }

        // Add welcome message
        addChatMessage({
            content: `🎉 Welcome to your ${skillName} coding session!\n\nI've detected you're working with ${detectedLanguage.charAt(0).toUpperCase() + detectedLanguage.slice(1)}. Let's start coding together!`,
            sender: 'ai',
            senderName: 'AI Mentor',
            type: 'message'
        })

        // Initial AI greeting and auto-start voice
        setTimeout(() => {
            addChatMessage({
                content: `Hi! I'm your AI coding mentor. I'll help both of you as you code together. 🤖\n\n🎤 Voice chat will start automatically - no need to click anything!`,
                sender: 'ai',
                senderName: 'AI Mentor',
                type: 'message'
            })

            // Show permission prompt message
            addChatMessage({
                content: `🔒 For your privacy and security, we request fresh microphone permission for each coding session. Voice chat will start automatically once you grant permission.`,
                sender: 'ai',
                senderName: 'System',
                type: 'message'
            })

            // Auto-start voice call after a short delay
            setTimeout(async () => {
                try {
                    console.log('🎤 Auto-starting voice chat...')
                    await startVoiceCall()
                } catch (error) {
                    console.error('❌ Failed to auto-start voice chat:', error)
                    addChatMessage({
                        content: '⚠️ Voice chat failed to start automatically. You can use the microphone button to try again.',
                        sender: 'ai',
                        senderName: 'System',
                        type: 'message'
                    })
                }
            }, 2000) // Reduced delay for faster startup

            // Set up periodic connection health check
            const healthCheckInterval = setInterval(() => {
                if (voiceCall.isConnected && peerClientRef.current) {
                    const health = peerClientRef.current.checkConnectionHealth?.()
                    if (health) {
                        console.log('🏥 Voice connection health:', health)
                        
                        // Check if connection is actually dead and try to recover
                        Object.entries(health).forEach(([peerId, status]: [string, any]) => {
                            if (status.connected === false && status.connectionState === 'failed') {
                                console.log(`🔄 Connection to ${peerId} appears dead, attempting recovery...`)
                                
                                addChatMessage({
                                    content: '🔄 Voice connection lost, attempting to reconnect...',
                                    sender: 'ai',
                                    senderName: 'System',
                                    type: 'message'
                                })
                            }
                        })
                    }
                }
            }, 15000) // Check every 15 seconds

            // Clear interval on cleanup
            return () => clearInterval(healthCheckInterval)
        }, 2000)

        // Handle page refresh/unload - maintain session continuity
        const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
            console.log('🔄 Page unloading, maintaining session continuity...')

            // Instead of ending session, broadcast that user is refreshing
            if (realtimeChannelRef.current) {
                realtimeChannelRef.current.send({
                    type: 'broadcast',
                    event: 'user_refreshing',
                    payload: {
                        userId: user?.id,
                        userName: user?.name,
                        timestamp: Date.now()
                    }
                })
            }

            // Clean up voice call but don't end session
            endVoiceCall()

            // Don't show confirmation dialog for refresh
            // event.preventDefault()
            // event.returnValue = 'Are you sure you want to leave the coding session?'ou are in a coding session. Are you sure you want to leave?'
            // return event.returnValue
        }

        // Handle visibility change (tab switch, minimize, etc.)
        const handleVisibilityChange = () => {
            if (document.hidden) {
                console.log('👁️ Page hidden, user might be leaving...')
                // Don't end session immediately on tab switch, just log it
            } else {
                console.log('👁️ Page visible again')
            }
        }

        // Handle browser/tab close detection
        const handlePageHide = async () => {
            console.log('🚪 Page hide event - user is likely closing tab/browser')
            await endSessionGracefully('User closed tab or browser')
        }

        // Add event listeners
        window.addEventListener('beforeunload', handleBeforeUnload)
        document.addEventListener('visibilitychange', handleVisibilityChange)
        document.addEventListener('pagehide', handlePageHide)

        return () => {
            // Remove event listeners
            window.removeEventListener('beforeunload', handleBeforeUnload)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            document.removeEventListener('pagehide', handlePageHide)

            if (realtimeChannelRef.current) {
                realtimeChannelRef.current.unsubscribe()
            }
            // Clean up voice call and clear permissions
            endVoiceCall()

            // Force disconnect and clear all connections in peer client
            if (peerClientRef.current) {
                peerClientRef.current.disconnect()
            }

            // Only end session on unmount if it's been mounted for more than 10 seconds
            // This prevents ending session during quick React re-renders or navigation
            const mountDuration = Date.now() - mountTimeRef.current
            const minimumMountTime = 10000 // 10 seconds - increased to prevent premature session ending

            if (mountDuration > minimumMountTime) {
                console.log(`🔚 Component unmounted after ${mountDuration}ms - ending session and clearing permissions`)
                endSessionGracefully('Component unmounted')
            } else {
                console.log(`🔄 Component unmounted after only ${mountDuration}ms - likely a re-render or navigation, preserving session`)
                // Just clean up voice call but preserve session
                endVoiceCall()
            }
        }
    }, [sessionId, skillName])

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [chatMessages])
    // Handle remote code changes
    const handleRemoteCodeChange = (payload: CodeChange) => {
        if (payload.userId !== user?.id) {
            console.log('📝 Received remote code change from:', payload.userName)
            setCode(payload.content)
            setLanguage(payload.language)
        }
    }

    // Handle remote chat messages
    const handleRemoteChatMessage = (payload: ChatMessage) => {
        if (payload.senderName !== user?.name && payload.sender !== 'ai') {
            setChatMessages(prev => [...prev, payload])
        }
    }

    // Handle remote AI suggestions
    const handleRemoteAISuggestion = (payload: AISuggestion) => {
        setAiSuggestions(prev => [...prev, payload])
        addChatMessage({
            content: payload.message,
            sender: 'ai',
            senderName: 'AI Mentor',
            type: payload.type === 'bug' ? 'bug' : 'suggestion'
        })
    }

    // Handle remote session end
    const handleRemoteSessionEnd = (payload: any) => {
        console.log('📞 Remote user ended the session:', payload)

        addChatMessage({
            content: `📞 ${payload.endedBy || 'Other user'} ended the session. Reason: ${payload.reason}`,
            sender: 'ai',
            senderName: 'System',
            type: 'message'
        })

        // Clean up voice call
        endVoiceCall()

        // Notify parent component to end session
        setTimeout(() => {
            onEndSession()
        }, 2000) // Give user time to see the message
    }

    // Handle remote voice ready notification
    const handleRemoteVoiceReady = (payload: any) => {
        console.log('🔍 Voice ready payload received:', {
            payloadUserId: payload.userId,
            currentUserId: user?.id,
            shouldProcess: payload.userId !== user?.id
        })
        
        // Ignore messages from self
        if (payload.userId === user?.id) {
            console.log('🔄 Ignoring voice ready message from self')
            return
        }
        
        if (payload.userId !== user?.id) {
            console.log('🎤 Remote user voice ready:', payload)

            const partnerRole = payload.role === 'teacher' ? 'mentor' : 'learner'
            addChatMessage({
                content: `🎤 ${payload.userName || 'Your partner'} (${partnerRole}) has voice chat ready!`,
                sender: 'ai',
                senderName: 'System',
                type: 'message'
            })

            // Mark remote peer as ready
            setPeerVoiceStatus(prev => ({
                ...prev,
                remoteSocketConnected: true,
                teacherReady: payload.role === 'teacher' ? true : prev.teacherReady,
                learnerReady: payload.role === 'learner' ? true : prev.learnerReady
            }))

            console.log('🔍 Updated peer voice status:', {
                remoteSocketConnected: true,
                remoteRole: payload.role,
                myRole: isTeacher ? 'teacher' : 'learner'
            })

            // Determine who should initiate based on user IDs (smaller ID initiates)
            const myId = user?.id || ''
            const partnerId = payload.userId
            const shouldInitiate = myId < partnerId
            
            console.log('🔍 Connection decision:', {
                shouldInitiate,
                myId,
                partnerId,
                comparison: `${myId} < ${partnerId} = ${shouldInitiate}`,
                hasLocalStream: !!voiceCall.localStream,
                isConnected: voiceCall.isConnected,
                hasPeerClient: !!peerClientRef.current
            })
            
            if (shouldInitiate && voiceCall.localStream && !voiceCall.isConnected && peerClientRef.current) {
                console.log('🔗 Remote peer ready, attempting connection now...')
                
                // Use a retry mechanism with exponential backoff
                const remotePeerId = `${payload.userId}-voice-${sessionId}`
                let retryCount = 0
                const maxRetries = 3
                
                const attemptConnection = async () => {
                    try {
                        console.log(`🔗 Connection attempt ${retryCount + 1}/${maxRetries} to peer:`, remotePeerId)
                        
                        await peerClientRef.current.createConnection(remotePeerId)
                        setVoiceCall(prev => ({ ...prev, isConnected: true }))
                        console.log('✅ Voice connection established after remote peer ready')

                        addChatMessage({
                            content: '🎤 Voice chat connected! You can now talk to your partner.',
                            sender: 'ai',
                            senderName: 'System',
                            type: 'message'
                        })
                    } catch (error) {
                        console.error(`❌ Connection attempt ${retryCount + 1} failed:`, error)
                        
                        retryCount++
                        if (retryCount < maxRetries) {
                            const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff: 2s, 4s, 8s
                            console.log(`⏳ Retrying connection in ${delay}ms...`)
                            setTimeout(attemptConnection, delay)
                        } else {
                            console.error('❌ All connection attempts failed')
                            addChatMessage({
                                content: '⚠️ Voice connection failed after multiple attempts. Please try refreshing the page.',
                                sender: 'ai',
                                senderName: 'System',
                                type: 'message'
                            })
                        }
                    }
                }
                
                // Start first attempt after a 2-second delay
                setTimeout(attemptConnection, 2000)
            }
        }
    }

    // Handle user refreshing
    const handleUserRefreshing = (payload: any) => {
        if (payload.userId !== user?.id) {
            console.log('🔄 Partner is refreshing their page:', payload.userName)

            addChatMessage({
                content: `🔄 ${payload.userName} is refreshing their page. They'll be back in a moment!`,
                sender: 'ai',
                senderName: 'System',
                type: 'message'
            })

            // Clean up their voice connection
            if (peerClientRef.current) {
                const remotePeerId = isTeacher
                    ? `${learnerId}-voice-${sessionId}`
                    : `${mentorId}-voice-${sessionId}`

                peerClientRef.current.disconnectFromPeer(remotePeerId)
            }
        }
    }

    // Handle user reconnected after refresh
    const handleUserReconnected = (payload: any) => {
        if (payload.userId !== user?.id) {
            console.log('✅ Partner reconnected after refresh:', payload.userName)

            addChatMessage({
                content: `✅ ${payload.userName} is back! Reconnecting voice chat...`,
                sender: 'ai',
                senderName: 'System',
                type: 'message'
            })

            // Auto-restart voice connection if it was active
            if (voiceCall.isConnected || voiceCall.localStream) {
                setTimeout(() => {
                    console.log('🔄 Auto-restarting voice connection after partner refresh...')
                    startVoiceCall()
                }, 2000)
            }
        }
    }

    // Send code changes to other user
    const broadcastCodeChange = (newCode: string, newLanguage: string = language) => {
        if (realtimeChannelRef.current) {
            const payload: CodeChange = {
                content: newCode,
                language: newLanguage,
                timestamp: Date.now(),
                userId: user?.id || '',
                userName: user?.name || 'Unknown'
            }

            realtimeChannelRef.current.send({
                type: 'broadcast',
                event: 'code_change',
                payload
            })
        }
    }

    // Handle code editor changes
    const handleCodeChange = (value: string | undefined) => {
        if (value !== undefined) {
            setCode(value)

            // Intelligent language detection based on code content
            const detectedLang = detectLanguage(skillName, value)
            if (detectedLang !== language && value.trim().length > 20) {
                setLanguage(detectedLang)
                console.log('🎯 Language auto-detected as:', detectedLang)
            }

            broadcastCodeChange(value, detectedLang)

            // Trigger AI analysis after user stops typing (debounced)
            clearTimeout((window as any).aiAnalysisTimeout)
                ; (window as any).aiAnalysisTimeout = setTimeout(() => {
                    if (value.trim().length > 50) {
                        analyzeCodeWithAI(value)
                    }
                }, 2000)
        }
    }

    // AI Code Analysis
    const analyzeCodeWithAI = async (codeToAnalyze: string) => {
        if (isAnalyzing) return

        setIsAnalyzing(true)
        try {
            console.log('🤖 Analyzing code with AI...')
            const analysis = await kiroClient.analyzeCode(codeToAnalyze, language, `Learning ${skillName}`)

            if (analysis.suggestions && analysis.suggestions.length > 0) {
                const newSuggestions = analysis.suggestions.map((suggestion: any) => ({
                    type: suggestion.type === 'bug' ? 'bug' : 'improvement',
                    message: suggestion.message,
                    line: suggestion.line,
                    severity: suggestion.severity
                }))

                newSuggestions.forEach((suggestion: AISuggestion) => {
                    if (realtimeChannelRef.current) {
                        realtimeChannelRef.current.send({
                            type: 'broadcast',
                            event: 'ai_suggestion',
                            payload: suggestion
                        })
                    }
                })
            }

            if (analysis.overall) {
                addChatMessage({
                    content: `📊 Code Analysis: ${analysis.overall}`,
                    sender: 'ai',
                    senderName: 'AI Mentor',
                    type: 'explanation'
                })
            }

        } catch (error) {
            console.error('❌ AI analysis failed:', error)
        } finally {
            setIsAnalyzing(false)
        }
    }

    // Add chat message with unique ID generation
    const addChatMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
        const timestamp = Date.now()
        const newMessage: ChatMessage = {
            ...message,
            id: `${timestamp}-${Math.random().toString(36).substring(2, 15)}`, // Unique ID
            timestamp,
            userId: message.sender === 'ai' ? user?.id : undefined
        }

        setChatMessages(prev => [...prev, newMessage])

        if (message.sender !== 'ai' && realtimeChannelRef.current) {
            realtimeChannelRef.current.send({
                type: 'broadcast',
                event: 'chat_message',
                payload: newMessage
            })
        }
    }

    // Send chat message
    const sendChatMessage = async () => {
        if (!newMessage.trim()) return

        const userMessage = newMessage

        addChatMessage({
            content: userMessage,
            sender: isTeacher ? 'teacher' : 'learner',
            senderName: user?.name || 'You',
            type: 'message'
        })

        setNewMessage('')

        // Check if the message is a question for AI
        const isAIQuestion = userMessage.toLowerCase().includes('ai') ||
            userMessage.includes('?') ||
            userMessage.toLowerCase().includes('help') ||
            userMessage.toLowerCase().includes('explain') ||
            userMessage.toLowerCase().includes('what') ||
            userMessage.toLowerCase().includes('how') ||
            userMessage.toLowerCase().includes('why')

        // Check if the message is a code generation request
        const isCodeGenerationRequest = userMessage.toLowerCase().includes('generate') ||
            userMessage.toLowerCase().includes('create') ||
            userMessage.toLowerCase().includes('write') ||
            userMessage.toLowerCase().includes('build') ||
            userMessage.toLowerCase().includes('make') ||
            userMessage.toLowerCase().includes('code for') ||
            userMessage.toLowerCase().includes('function for') ||
            userMessage.toLowerCase().includes('component for') ||
            userMessage.toLowerCase().includes('class for')

        if (isCodeGenerationRequest) {
            // Handle code generation request
            await generateCustomCode(userMessage)
        } else if (isAIQuestion) {
            setIsAIResponding(true)
            const loadingMessageId = Date.now().toString()

            const loadingMessage: ChatMessage = {
                id: loadingMessageId,
                content: '🤖 AI is thinking...',
                sender: 'ai',
                senderName: 'AI Mentor',
                type: 'message',
                timestamp: Date.now(),
                isPrivateAI: true,
                userId: user?.id
            }
            setChatMessages(prev => [...prev, loadingMessage])

            try {
                const response = await fetch('/api/ai-coding', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'chatResponse',
                        question: userMessage,
                        skill: skillName,
                        language: language,

                        context: 'collaborative_coding_session'
                    })
                })

                if (!response.ok) throw new Error(`API request failed: ${response.status}`)

                const data = await response.json()
                const aiResponse = data.response || data.explanation || 'I apologize, but I could not generate a response at this time.'

                setChatMessages(prev => prev.filter(msg => msg.id !== loadingMessageId))

                addChatMessage({
                    content: `🤖 ${aiResponse}`,
                    sender: 'ai',
                    senderName: 'AI Mentor',
                    type: 'explanation',
                    isPrivateAI: true
                })
            } catch (error) {
                console.error('❌ AI response failed:', error)
                setChatMessages(prev => prev.filter(msg => msg.id !== loadingMessageId))
                addChatMessage({
                    content: `🤖 Sorry, I'm having trouble responding right now. Please try asking again.`,
                    sender: 'ai',
                    senderName: 'AI Mentor',
                    type: 'message',
                    isPrivateAI: true
                })
            } finally {
                setIsAIResponding(false)
            }
        }
    }

    // AI helper functions
    const explainCode = async () => {
        if (!code.trim()) return
        setIsAIResponding(true)
        try {
            const explanation = await kiroClient.explainCode(code, language)
            addChatMessage({
                content: `🧠 Code Explanation:\n\n${explanation}`,
                sender: 'ai',
                senderName: 'AI Mentor',
                type: 'explanation',
                isPrivateAI: true
            })
        } catch (error) {
            console.error('❌ Code explanation failed:', error)
            addChatMessage({
                content: `🤖 Sorry, I couldn't explain the code right now. Please try again.`,
                sender: 'ai',
                senderName: 'AI Mentor',
                type: 'message',
                isPrivateAI: true
            })
        } finally {
            setIsAIResponding(false)
        }
    }

    const findBugs = async () => {
        if (!code.trim()) return
        setIsAIResponding(true)
        try {
            const bugAnalysis = await kiroClient.findBugs(code, language, `Learning ${skillName}`)
            if (bugAnalysis.bugs && bugAnalysis.bugs.length > 0) {
                bugAnalysis.bugs.forEach((bug: any) => {
                    addChatMessage({
                        content: `🐛 Bug Found (Line ${bug.line}): ${bug.description}\n\n💡 Fix: ${bug.fix}`,
                        sender: 'ai',
                        senderName: 'AI Mentor',
                        type: 'bug',
                        isPrivateAI: true
                    })
                })
            } else {
                addChatMessage({
                    content: `✅ No bugs found! Your code looks good. ${bugAnalysis.summary || ''}`,
                    sender: 'ai',
                    senderName: 'AI Mentor',
                    type: 'message',
                    isPrivateAI: true
                })
            }
        } catch (error) {
            console.error('❌ Bug finding failed:', error)
            addChatMessage({
                content: `🤖 Sorry, I couldn't analyze for bugs right now. Please try again.`,
                sender: 'ai',
                senderName: 'AI Mentor',
                type: 'message',
                isPrivateAI: true
            })
        } finally {
            setIsAIResponding(false)
        }
    }

    const generateExample = async () => {
        setIsAIResponding(true)
        try {
            const example = await kiroClient.generateCodeExample(
                `Example for learning ${skillName}`,
                language,
                'beginner',
                true
            )

            if (example.code) {
                // Add explanatory comments to the generated code
                const codeWithComments = addExplanatoryComments(example.code, example.explanation)
                setCode(codeWithComments)
                broadcastCodeChange(codeWithComments)

                addChatMessage({
                    content: `💡 Generated Example:\n\n${example.explanation}\n\nKey Features:\n${example.keyFeatures?.join('\n') || 'N/A'}`,
                    sender: 'ai',
                    senderName: 'AI Mentor',
                    type: 'suggestion',
                    isPrivateAI: true
                })
            }
        } catch (error) {
            console.error('❌ Example generation failed:', error)
            addChatMessage({
                content: `🤖 Sorry, I couldn't generate an example right now. Please try again.`,
                sender: 'ai',
                senderName: 'AI Mentor',
                type: 'message',
                isPrivateAI: true
            })
        } finally {
            setIsAIResponding(false)
        }
    }

    // Generate custom code based on user request
    const generateCustomCode = async (request: string) => {
        setIsAIResponding(true)
        try {
            console.log('🤖 Generating custom code for:', request)

            const response = await fetch('/api/ai-coding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'generateCode',
                    request: request,
                    language: language,
                    skill: skillName,
                    currentCode: code,
                    context: 'collaborative_coding_session'
                })
            })

            if (!response.ok) throw new Error(`API request failed: ${response.status}`)

            const data = await response.json()

            if (data.code) {
                // Add explanatory comments to the generated code
                const codeWithComments = addExplanatoryComments(data.code, data.explanation)

                // Decide whether to replace or append code
                const shouldReplace = code.trim().length < 50 ||
                    request.toLowerCase().includes('replace') ||
                    request.toLowerCase().includes('new')

                const finalCode = shouldReplace ? codeWithComments : `${code}\n\n${codeWithComments}`

                setCode(finalCode)
                broadcastCodeChange(finalCode)

                addChatMessage({
                    content: `✨ ${data.title || 'Generated Code!'}\n\n${data.explanation || 'Custom code generated'}\n\n${data.keyFeatures ? `Key Features:\n• ${data.keyFeatures.join('\n• ')}` : ''}\n\n${shouldReplace ? '🔄 Replaced existing code' : '➕ Added to existing code'}`,
                    sender: 'ai',
                    senderName: 'AI Mentor',
                    type: 'suggestion',
                    isPrivateAI: true
                })
            } else {
                throw new Error('No code generated')
            }
        } catch (error) {
            console.error('❌ Custom code generation failed:', error)
            addChatMessage({
                content: `🤖 Sorry, I couldn't generate the requested code. Please try rephrasing your request or be more specific.`,
                sender: 'ai',
                senderName: 'AI Mentor',
                type: 'message',
                isPrivateAI: true
            })
        } finally {
            setIsAIResponding(false)
        }
    }

    // Add explanatory comments to generated code
    const addExplanatoryComments = (generatedCode: string, explanation: string) => {
        const lines = generatedCode.split('\n')
        const commentPrefix = getCommentPrefix(language)

        // Add header comment with explanation
        const headerComment = `${commentPrefix} AI Generated Code: ${explanation.split('\n')[0]}\n${commentPrefix} Generated for: ${skillName}\n`

        // Add inline comments for complex sections
        const codeWithComments = lines.map((line, index) => {
            // Add comments for function declarations, loops, conditionals, etc.
            if (line.trim().startsWith('function') || line.trim().startsWith('def ') ||
                line.trim().startsWith('class ') || line.trim().startsWith('const ') ||
                line.trim().startsWith('let ') || line.trim().startsWith('var ')) {
                return `${commentPrefix} ${getLineExplanation(line, language)}\n${line}`
            }
            return line
        }).join('\n')

        return `${headerComment}\n${codeWithComments}`
    }

    // Get comment prefix for different languages
    const getCommentPrefix = (lang: string) => {
        switch (lang) {
            case 'python': return '#'
            case 'html': return '<!--'
            case 'css': return '/*'
            default: return '//'
        }
    }

    // Get explanation for specific code lines
    const getLineExplanation = (line: string, lang: string) => {
        const trimmed = line.trim()
        if (trimmed.startsWith('function') || trimmed.startsWith('def ')) return 'Function definition'
        if (trimmed.startsWith('class ')) return 'Class definition'
        if (trimmed.startsWith('const ') || trimmed.startsWith('let ') || trimmed.startsWith('var ')) return 'Variable declaration'
        if (trimmed.startsWith('if ')) return 'Conditional statement'
        if (trimmed.startsWith('for ') || trimmed.startsWith('while ')) return 'Loop statement'
        return 'Code logic'
    }

    // Responsive layout helpers
    const isMobile = deviceType === 'mobile'
    const isTablet = deviceType === 'tablet'
    const isDesktop = deviceType === 'desktop'

    // Get device icon
    const getDeviceIcon = () => {
        switch (deviceType) {
            case 'mobile': return <Smartphone className="h-4 w-4" />
            case 'tablet': return <Tablet className="h-4 w-4" />
            default: return <Monitor className="h-4 w-4" />
        }
    }

    return (
        <div className={` flex flex-col bg-gradient-to-br from-slate-50 to-blue-50 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
            {/* Hidden audio elements for voice chat */}
            <audio 
                ref={localAudioRef} 
                autoPlay 
                muted 
                playsInline
                controls={false}
            />
            <audio 
                ref={remoteAudioRef} 
                autoPlay 
                playsInline
                controls={false}
                onLoadedMetadata={() => {
                    console.log('🎵 Remote audio metadata loaded')
                }}
                onCanPlay={() => {
                    console.log('🎵 Remote audio can play')
                }}
                onPlay={() => {
                    console.log('🎵 Remote audio started playing')
                }}
                onError={(e) => {
                    console.error('🎵 Remote audio error:', e)
                }}
            />

            {/* Header - Responsive */}
            <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm">
                <div className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center justify-between">
                        {/* Left section */}
                        <div className="flex items-center space-x-2 sm:space-x-4">
                            <div className="flex items-center space-x-2">
                                <Code className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                                <h1 className="font-bold text-lg sm:text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    {isMobile ? 'Coding' : 'Collaborative Coding'}
                                </h1>
                            </div>

                            {!isMobile && (
                                <>
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                        {skillName}
                                    </Badge>
                                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        <Users className="h-4 w-4" />
                                        <span>With {peerName}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Right section */}
                        <div className="flex items-center space-x-1 sm:space-x-2">
                            {/* Voice call controls - Always show mute/unmute */}
                            <div className="flex items-center space-x-1">
                                <Button
                                    onClick={toggleMute}
                                    variant={voiceCall.isMuted ? "destructive" : "outline"}
                                    size="sm"
                                    disabled={voiceCall.isInitiating}
                                    className="h-8 px-2 sm:px-3"
                                    title={
                                        voiceCall.isInitiating ? "Voice chat starting automatically..." :
                                            !voiceCall.localStream ? "Voice chat starting automatically..." :
                                                voiceCall.isMuted ? "Unmute microphone" : "Mute microphone"
                                    }
                                >
                                    {voiceCall.isInitiating ? (
                                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                                    ) : voiceCall.isMuted ? (
                                        <MicOff className="h-4 w-4" />
                                    ) : (
                                        <Mic className="h-4 w-4" />
                                    )}
                                    {!isMobile && (
                                        <span className="ml-1">
                                            {voiceCall.isInitiating ? 'Starting...' :
                                                !voiceCall.localStream ? 'Starting...' :
                                                    voiceCall.isMuted ? 'Unmute' : 'Mute'}
                                        </span>
                                    )}
                                </Button>
                            </div>

                            {/* Debug voice connection button (development only) */}
                            {process.env.NODE_ENV === 'development' && (
                                <Button
                                    onClick={testVoiceConnection}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2"
                                    title="Debug voice connection"
                                >
                                    🧪
                                </Button>
                            )}

                            {/* Device indicator */}
                            <div className="hidden sm:flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                                {getDeviceIcon()}
                                <span className="capitalize">{language}</span>
                            </div>

                            {/* Fullscreen toggle */}
                            <Button
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                            >
                                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                            </Button>

                            {/* End session */}
                            <Button
                                onClick={onEndSession}
                                variant="destructive"
                                size="sm"
                                className="h-8 px-2 sm:px-3"
                            >
                                <X className="h-4 w-4" />
                                {!isMobile && <span className="ml-1">End</span>}
                            </Button>
                        </div>
                    </div>

                    {/* Mobile info row */}
                    {isMobile && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                {skillName}
                            </Badge>
                            <div className="flex items-center space-x-2 text-xs text-gray-600">
                                <Users className="h-3 w-3" />
                                <span>With {peerName}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-xs text-gray-600">
                                {getDeviceIcon()}
                                <span className="capitalize">{language}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Mobile Tab Navigation */}
            {isMobile && (
                <div className="bg-white border-b border-gray-200">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('code')}
                            className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'code'
                                ? 'text-blue-600 border-blue-600 bg-blue-50'
                                : 'text-gray-500 border-transparent hover:text-gray-700'
                                }`}
                        >
                            <Code className="h-4 w-4 mx-auto mb-1" />
                            Code Editor
                        </button>
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'chat'
                                ? 'text-blue-600 border-blue-600 bg-blue-50'
                                : 'text-gray-500 border-transparent hover:text-gray-700'
                                }`}
                        >
                            <MessageCircle className="h-4 w-4 mx-auto mb-1" />
                            AI Chat
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content - Responsive Layout */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Code Editor Section */}
                <div className={`flex-1 flex flex-col ${isMobile ? (activeTab === 'code' ? 'flex' : 'hidden') : 'flex'
                    }`}>
                    {/* Editor Header */}
                    <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-3 sm:px-4 py-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Code className="h-4 w-4 text-gray-600" />
                                <span className="text-sm font-medium text-gray-700">Code Editor</span>
                                {isAnalyzing && (
                                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                        <Bot className="h-3 w-3 mr-1" />
                                        AI Analyzing...
                                    </Badge>
                                )}
                                {voiceCall.isConnected && (
                                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                        <Mic className="h-3 w-3 mr-1" />
                                        Voice Active
                                    </Badge>
                                )}
                            </div>

                            <div className="flex items-center space-x-1 sm:space-x-2">
                                <Button onClick={explainCode} variant="outline" size="sm" className="h-7 px-2 text-xs">
                                    <Lightbulb className="h-3 w-3 mr-1" />
                                    {isMobile ? '' : 'Explain'}
                                </Button>
                                <Button onClick={findBugs} variant="outline" size="sm" className="h-7 px-2 text-xs">
                                    <Bug className="h-3 w-3 mr-1" />
                                    {isMobile ? '' : 'Debug'}
                                </Button>
                                <Button onClick={generateExample} variant="outline" size="sm" className="h-7 px-2 text-xs">
                                    <Play className="h-3 w-3 mr-1" />
                                    {isMobile ? '' : 'Example'}
                                </Button>


                            </div>
                        </div>
                    </div>

                    {/* Monaco Editor */}
                    <div className="flex-1 relative">
                        <Editor
                            height="100%"
                            language={language}
                            value={code}
                            onChange={handleCodeChange}
                            onMount={(editor) => {
                                editorRef.current = editor
                            }}
                            options={{
                                minimap: { enabled: !isMobile },
                                fontSize: isMobile ? 12 : 14,
                                lineNumbers: 'on',
                                roundedSelection: false,
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                tabSize: 2,
                                wordWrap: 'on',
                                folding: !isMobile,
                                lineDecorationsWidth: isMobile ? 10 : 20,
                                lineNumbersMinChars: isMobile ? 3 : 5,
                                glyphMargin: !isMobile,
                                contextmenu: !isMobile
                            }}
                            theme="vs-light"
                        />
                    </div>
                </div>

                {/* Chat Panel - Responsive */}
                <div className={`
                    ${isMobile ? (activeTab === 'chat' ? 'flex' : 'hidden') : 'flex'} 
                    ${isTablet ? 'w-96' : isMobile ? 'w-full' : 'w-[28rem]'} 
                    bg-white/90 backdrop-blur-sm ${isMobile ? '' : 'border-l'} border-gray-200 flex-col
                `}>
                    {/* Chat Header */}
                    <div className="px-3 sm:px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <MessageCircle className="h-4 w-4 text-blue-600" />
                                <h3 className="font-medium text-gray-800">Chat & AI Mentor</h3>
                            </div>

                            {/* Voice call status indicator for chat header */}
                            {voiceCall.isConnected && (
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                    <Mic className="h-3 w-3 mr-1" />
                                    Voice Active
                                </Badge>
                            )}
                        </div>
                    </div>
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-transparent to-blue-50/30">
                        {chatMessages.map((message) => (
                            <div key={message.id} className="space-y-1">
                                <div className="flex items-center space-x-2">
                                    {message.sender === 'ai' ? (
                                        <Bot className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                    ) : (
                                        <User className="h-4 w-4 text-gray-600 flex-shrink-0" />
                                    )}
                                    <span className="text-xs font-medium text-gray-600 truncate">
                                        {message.senderName}
                                        {message.isPrivateAI && <span className="text-xs text-blue-500 ml-1">(Private)</span>}
                                    </span>
                                    <span className="text-xs text-gray-400 flex-shrink-0">
                                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className={`text-sm p-3 rounded-lg transition-all duration-200 ${message.sender === 'ai'
                                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-200'
                                    : 'bg-gray-50 hover:bg-gray-100'
                                    } ${message.type === 'bug' ? 'bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-200' :
                                        message.type === 'suggestion' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-200' :
                                            message.type === 'explanation' ? 'bg-gradient-to-r from-purple-50 to-violet-50 border-l-4 border-purple-200' : ''
                                    }`}>
                                    {message.content.includes('AI is thinking') ? (
                                        <div className="flex items-center space-x-2">
                                            <span>AI is thinking</span>
                                            <div className="flex space-x-1">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="whitespace-pre-wrap break-words">{message.content}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="p-3 border-t border-gray-200 bg-white/80 backdrop-blur-sm">
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !isAIResponding && sendChatMessage()}
                                placeholder={isAIResponding ? "AI is responding..." : "Ask a question or chat..."}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                disabled={isAIResponding}
                            />
                            <Button
                                onClick={sendChatMessage}
                                size="sm"
                                disabled={isAIResponding || !newMessage.trim()}
                                className="px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                            >
                                {isAIResponding ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </Button>
                        </div>

                        {/* Quick AI actions - Mobile optimized */}
                        <div className="flex flex-wrap gap-1 mt-2">
                            <Button
                                onClick={() => setNewMessage("How does this code work?")}
                                variant="outline"
                                size="sm"
                                className="text-xs h-6 px-2"
                            >
                                How it works?
                            </Button>
                            <Button
                                onClick={() => setNewMessage("What can I improve?")}
                                variant="outline"
                                size="sm"
                                className="text-xs h-6 px-2"
                            >
                                Improve code
                            </Button>
                            <Button
                                onClick={() => setNewMessage("Are there any bugs?")}
                                variant="outline"
                                size="sm"
                                className="text-xs h-6 px-2"
                            >
                                Find bugs
                            </Button>
                            <Button
                                onClick={() => setNewMessage(`Generate a ${language} function for`)}
                                variant="outline"
                                size="sm"
                                className="text-xs h-6 px-2 bg-green-50 text-green-700 border-green-200"
                            >
                                Generate function
                            </Button>
                            <Button
                                onClick={() => setNewMessage(`Create a ${language} component for`)}
                                variant="outline"
                                size="sm"
                                className="text-xs h-6 px-2 bg-blue-50 text-blue-700 border-blue-200"
                            >
                                Create component
                            </Button>
                            <Button
                                onClick={() => setNewMessage(`Write code to`)}
                                variant="outline"
                                size="sm"
                                className="text-xs h-6 px-2 bg-purple-50 text-purple-700 border-purple-200"
                            >
                                Write code
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Voice call status indicator */}
            {(voiceCall.isConnected || voiceCall.isInitiating) && (
                <div className={`fixed bottom-4 right-4 px-3 py-2 rounded-full shadow-lg flex items-center space-x-2 z-40 ${voiceCall.isMuted ? 'bg-red-500' : 'bg-green-500'
                    } text-white`}>
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">
                        {voiceCall.isInitiating ? 'Starting...' : voiceCall.isMuted ? 'Muted' : 'Voice Active'}
                    </span>
                    {voiceCall.isMuted && <MicOff className="h-4 w-4" />}
                </div>
            )}

            {/* Loading overlay for voice call initialization */}
            {voiceCall.isInitiating && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 text-center">
                        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-lg font-medium">Starting Voice Chat Automatically...</p>
                        <p className="text-sm text-gray-500 mt-1">Please allow microphone access to talk with your partner</p>
                    </div>
                </div>
            )}
        </div>
    )
}