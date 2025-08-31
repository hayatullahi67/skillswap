'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getPeerClient } from '@/lib/simplePeerClient'

export default function TestVoicePage() {
  const [status, setStatus] = useState('idle')
  const [logs, setLogs] = useState<string[]>([])
  const [myPeerId, setMyPeerId] = useState('')
  const [targetPeerId, setTargetPeerId] = useState('')
  const peerClientRef = useRef<any>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    console.log(message)
  }

  const initializePeer = async () => {
    try {
      setStatus('initializing')
      addLog('🚀 Initializing peer client...')
      
      const peerId = 'test-' + Math.random().toString(36).substring(2, 8)
      setMyPeerId(peerId)
      
      peerClientRef.current = getPeerClient(peerId)
      
      // Set up callbacks
      peerClientRef.current.onIncomingCall((fromPeerId: string, remoteStream: MediaStream) => {
        addLog(`🎉 Received audio stream from: ${fromPeerId}`)
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream
          remoteAudioRef.current.play().catch(e => addLog(`❌ Audio play failed: ${e}`))
        }
      })

      peerClientRef.current.onIncomingOffer(async (fromPeerId: string) => {
        addLog(`📞 Received offer from: ${fromPeerId}`)
        try {
          await peerClientRef.current.acceptConnection(fromPeerId)
          addLog(`✅ Accepted connection from: ${fromPeerId}`)
        } catch (error) {
          addLog(`❌ Failed to accept connection: ${error}`)
        }
      })
      
      await peerClientRef.current.initialize()
      addLog(`✅ Peer client initialized with ID: ${peerId}`)
      setStatus('ready')
      
    } catch (error) {
      addLog(`❌ Initialization failed: ${error}`)
      setStatus('error')
    }
  }

  const callPeer = async () => {
    if (!peerClientRef.current || !targetPeerId) {
      addLog('❌ No peer client or target peer ID')
      return
    }

    try {
      setStatus('calling')
      addLog(`📞 Calling peer: ${targetPeerId}`)
      
      await peerClientRef.current.createConnection(targetPeerId)
      addLog(`✅ Connection created to: ${targetPeerId}`)
      setStatus('connected')
      
    } catch (error) {
      addLog(`❌ Call failed: ${error}`)
      setStatus('ready')
    }
  }

  const disconnect = () => {
    if (peerClientRef.current) {
      peerClientRef.current.disconnect()
      addLog('🔌 Disconnected')
    }
    setStatus('idle')
    setMyPeerId('')
  }

  const clearLogs = () => {
    setLogs([])
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Voice Connection Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">My Peer ID:</label>
              <input 
                type="text" 
                value={myPeerId} 
                readOnly 
                className="w-full px-3 py-2 border rounded bg-gray-50"
                placeholder="Will be generated when initialized"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Target Peer ID:</label>
              <input 
                type="text" 
                value={targetPeerId} 
                onChange={(e) => setTargetPeerId(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                placeholder="Enter peer ID to call"
              />
            </div>
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={initializePeer} 
              disabled={status !== 'idle'}
              variant={status === 'ready' ? 'default' : 'outline'}
            >
              {status === 'initializing' ? 'Initializing...' : 'Initialize Peer'}
            </Button>
            
            <Button 
              onClick={callPeer} 
              disabled={status !== 'ready' || !targetPeerId}
              variant="default"
            >
              {status === 'calling' ? 'Calling...' : 'Call Peer'}
            </Button>
            
            <Button 
              onClick={disconnect} 
              disabled={status === 'idle'}
              variant="destructive"
            >
              Disconnect
            </Button>
            
            <Button onClick={clearLogs} variant="outline">
              Clear Logs
            </Button>
          </div>

          <div className="text-sm">
            Status: <span className={`font-medium ${
              status === 'ready' ? 'text-green-600' : 
              status === 'error' ? 'text-red-600' : 
              status === 'connected' ? 'text-blue-600' : 'text-gray-600'
            }`}>{status}</span>
          </div>

          <div className="border rounded p-4 bg-gray-50 max-h-96 overflow-y-auto">
            <h3 className="font-medium mb-2">Logs:</h3>
            {logs.length === 0 ? (
              <p className="text-gray-500 text-sm">No logs yet...</p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-sm text-gray-600">
            <h3 className="font-medium mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1">
              <li>Click "Initialize Peer" to start (will request microphone access)</li>
              <li>Share your Peer ID with another user</li>
              <li>Enter their Peer ID in the "Target Peer ID" field</li>
              <li>Click "Call Peer" to establish voice connection</li>
              <li>Check logs for connection status</li>
            </ol>
          </div>

          {/* Hidden audio element for remote stream */}
          <audio ref={remoteAudioRef} autoPlay />
        </CardContent>
      </Card>
    </div>
  )
}