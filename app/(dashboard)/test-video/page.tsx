'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getPeerClient, resetPeerClient } from '@/lib/peerClient'
import { initSupabaseSignaling } from '@/lib/simpleSignaling'
import { useAppStore } from '@/lib/store'

export default function TestVideoPage() {
  const [myPeerId, setMyPeerId] = useState('')
  const [remotePeerId, setRemotePeerId] = useState('')
  const [sessionId, setSessionId] = useState('1')
  const [status, setStatus] = useState('Not connected')
  const [logs, setLogs] = useState<string[]>([])
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  
  const { user } = useAppStore()
  const [peerClient, setPeerClient] = useState<any>(null)
  const [signaling, setSignaling] = useState<any>(null)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    console.log(logMessage)
    setLogs(prev => [...prev.slice(-20), logMessage]) // Keep last 20 logs
  }

  useEffect(() => {
    if (user) {
      const defaultPeerId = `${user.id}-test`
      setMyPeerId(defaultPeerId)
    }
  }, [user])

  const initializePeer = async () => {
    try {
      addLog('🚀 Initializing peer client...')
      
      // Reset any existing peer client
      resetPeerClient()
      
      // Create new peer client with specific ID
      const client = getPeerClient(myPeerId)
      setPeerClient(client)
      
      // Initialize peer client
      await client.initialize()
      addLog(`✅ Peer client initialized with ID: ${client.getMyPeerId()}`)
      
      // Set up local video
      const localStream = await client.getLocalStream()
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream
        addLog('✅ Local video stream set')
      }
      
      // Set up incoming call handler
      client.onIncomingCall((peerId: string, remoteStream: MediaStream) => {
        addLog(`📹 Received remote stream from: ${peerId}`)
        addLog(`📹 Remote stream tracks: video=${remoteStream.getVideoTracks().length}, audio=${remoteStream.getAudioTracks().length}`)
        
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream
          remoteVideoRef.current.play().catch(e => addLog(`❌ Remote video play error: ${e.message}`))
          addLog('✅ Remote video stream set')
        }
      })
      
      // Initialize Supabase signaling
      const signalingClient = initSupabaseSignaling(parseInt(sessionId), myPeerId)
      setSignaling(signalingClient)
      addLog('✅ Supabase signaling initialized')
      
      setStatus('Ready')
      
    } catch (error) {
      addLog(`❌ Initialization error: ${error}`)
      setStatus('Error')
    }
  }

  const makeCall = async () => {
    if (!peerClient || !remotePeerId) {
      addLog('❌ Peer client not initialized or no remote peer ID')
      return
    }
    
    try {
      addLog(`📞 Making call to: ${remotePeerId}`)
      setStatus('Calling...')
      
      await peerClient.createConnection(remotePeerId)
      addLog('✅ Call initiated')
      setStatus('Connected')
      
    } catch (error) {
      addLog(`❌ Call error: ${error}`)
      setStatus('Call failed')
    }
  }

  const acceptCall = async () => {
    if (!peerClient || !remotePeerId) {
      addLog('❌ Peer client not initialized or no remote peer ID')
      return
    }
    
    try {
      addLog(`📞 Accepting call from: ${remotePeerId}`)
      setStatus('Accepting...')
      
      await peerClient.acceptConnection(remotePeerId)
      addLog('✅ Call accepted')
      setStatus('Connected')
      
    } catch (error) {
      addLog(`❌ Accept error: ${error}`)
      setStatus('Accept failed')
    }
  }

  const endCall = () => {
    if (peerClient) {
      peerClient.disconnect()
      addLog('📞 Call ended')
    }
    if (signaling) {
      signaling.disconnect()
      addLog('📡 Signaling disconnected')
    }
    setStatus('Disconnected')
    
    // Clear video elements
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
  }

  const debugStreams = () => {
    if (peerClient) {
      peerClient.debugStreams()
      addLog('🔍 Debug info logged to console')
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Video Call Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">My Peer ID</label>
              <Input 
                value={myPeerId} 
                onChange={(e) => setMyPeerId(e.target.value)}
                placeholder="Your peer ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Remote Peer ID</label>
              <Input 
                value={remotePeerId} 
                onChange={(e) => setRemotePeerId(e.target.value)}
                placeholder="Remote peer ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Session ID</label>
              <Input 
                value={sessionId} 
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Session ID"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button onClick={initializePeer}>Initialize</Button>
            <Button onClick={makeCall} disabled={status !== 'Ready'}>Make Call</Button>
            <Button onClick={acceptCall} disabled={status !== 'Ready'}>Accept Call</Button>
            <Button onClick={endCall} variant="destructive">End Call</Button>
            <Button onClick={debugStreams} variant="outline">Debug</Button>
          </div>
          
          <div className="text-sm">
            <strong>Status:</strong> {status}
          </div>
        </CardContent>
      </Card>

      {/* Video Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Local Video (You)</CardTitle>
          </CardHeader>
          <CardContent>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 bg-gray-900 rounded"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Remote Video (Other Person)</CardTitle>
          </CardHeader>
          <CardContent>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-64 bg-gray-900 rounded"
            />
          </CardContent>
        </Card>
      </div>

      {/* Logs Section */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-64 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>1.</strong> Open this page in two different browser tabs/windows</p>
          <p><strong>2.</strong> Set different Peer IDs (e.g., "user1-test" and "user2-test")</p>
          <p><strong>3.</strong> Click "Initialize" in both tabs</p>
          <p><strong>4.</strong> In tab 1: Set Remote Peer ID to "user2-test" and click "Make Call"</p>
          <p><strong>5.</strong> In tab 2: Set Remote Peer ID to "user1-test" and click "Accept Call"</p>
          <p><strong>6.</strong> You should see both local and remote video streams</p>
        </CardContent>
      </Card>
    </div>
  )
}