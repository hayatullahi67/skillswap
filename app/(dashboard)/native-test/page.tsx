'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeWebRTC } from '@/lib/nativeWebRTC'
import { useAppStore } from '@/lib/store'

export default function NativeTestPage() {
  const [sessionId, setSessionId] = useState('999')
  const [remotePeerId, setRemotePeerId] = useState('')
  const [status, setStatus] = useState('Not connected')
  const [logs, setLogs] = useState<string[]>([])
  const [webrtc, setWebrtc] = useState<NativeWebRTC | null>(null)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  
  const { user } = useAppStore()

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    console.log(logMessage)
    setLogs(prev => [...prev.slice(-15), logMessage])
  }

  const myPeerId = user ? `${user.id}-native` : 'unknown'

  const initialize = async () => {
    if (!user || !remotePeerId) {
      addLog('❌ Need user and remote peer ID')
      return
    }

    try {
      addLog('🚀 Initializing native WebRTC...')
      setStatus('Initializing...')
      
      const rtc = new NativeWebRTC(parseInt(sessionId), myPeerId, remotePeerId)
      setWebrtc(rtc)
      
      // Set up callbacks
      rtc.onLocalStream((stream) => {
        addLog('✅ Got local stream')
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
      })
      
      rtc.onRemoteStream((stream) => {
        addLog('🎉 Got remote stream!')
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream
        }
        setStatus('Connected!')
      })
      
      rtc.onConnectionState((state) => {
        addLog(`🔗 Connection: ${state}`)
        setStatus(state)
      })
      
      await rtc.initialize()
      addLog('✅ WebRTC initialized')
      setStatus('Ready')
      
    } catch (error) {
      addLog(`❌ Error: ${error}`)
      setStatus('Error')
    }
  }

  const makeCall = async () => {
    if (!webrtc) {
      addLog('❌ WebRTC not initialized')
      return
    }
    
    try {
      addLog('📞 Making call...')
      setStatus('Calling...')
      await webrtc.createOffer()
      addLog('✅ Offer sent')
    } catch (error) {
      addLog(`❌ Call error: ${error}`)
    }
  }

  const endCall = () => {
    if (webrtc) {
      webrtc.disconnect()
      setWebrtc(null)
    }
    
    // Clear video elements
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    
    setStatus('Disconnected')
    addLog('📞 Call ended')
  }

  const toggleVideo = () => {
    if (webrtc) {
      const newState = !videoEnabled
      webrtc.toggleVideo(newState)
      setVideoEnabled(newState)
      addLog(`📹 Video: ${newState ? 'ON' : 'OFF'}`)
    }
  }

  const toggleAudio = () => {
    if (webrtc) {
      const newState = !audioEnabled
      webrtc.toggleAudio(newState)
      setAudioEnabled(newState)
      addLog(`🎤 Audio: ${newState ? 'ON' : 'OFF'}`)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Native WebRTC Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">My Peer ID</label>
              <Input value={myPeerId} disabled />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Remote Peer ID</label>
              <Input 
                value={remotePeerId} 
                onChange={(e) => setRemotePeerId(e.target.value)}
                placeholder="Enter remote peer ID"
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
            <Button onClick={initialize} disabled={!remotePeerId}>
              Initialize
            </Button>
            <Button onClick={makeCall} disabled={status !== 'Ready'}>
              Make Call
            </Button>
            <Button onClick={endCall} variant="destructive">
              End Call
            </Button>
            <Button onClick={toggleVideo} variant="outline">
              📹 {videoEnabled ? 'ON' : 'OFF'}
            </Button>
            <Button onClick={toggleAudio} variant="outline">
              🎤 {audioEnabled ? 'ON' : 'OFF'}
            </Button>
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
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-48 overflow-y-auto">
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
          <p><strong>1.</strong> Open this page in two different browsers/devices</p>
          <p><strong>2.</strong> In tab 1: Set Remote Peer ID to the other person's ID</p>
          <p><strong>3.</strong> In tab 2: Set Remote Peer ID to the first person's ID</p>
          <p><strong>4.</strong> Both click "Initialize"</p>
          <p><strong>5.</strong> One person clicks "Make Call"</p>
          <p><strong>6.</strong> You should see both local and remote video!</p>
          <p><strong>Note:</strong> This uses native WebRTC (no SimplePeer) + Supabase Realtime signaling</p>
        </CardContent>
      </Card>
    </div>
  )
}