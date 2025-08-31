// Simple Realtime signaling for WebRTC (no database tables needed)
import { RealtimeSignaling } from './realtimeSignaling'
import { getPeerClient } from './peerClient'

export const initSupabaseSignaling = (sessionId: number, myPeerId: string) => {
  console.log('🚀 Initializing Realtime signaling...', { sessionId, myPeerId })
  
  const peerClient = getPeerClient(myPeerId)
  const signaling = new RealtimeSignaling(myPeerId)

  // Initialize signaling
  signaling.initialize(sessionId)

  // Handle incoming signals from Realtime
  signaling.onSignal((message) => {
    console.log('📡 Received signal from Realtime:', message)
    peerClient.handleIncomingSignal(message.from, message.signal.data)
  })

  // Handle incoming call end signals
  signaling.onCallEnd((fromPeerId) => {
    console.log('📞 Received call end signal from:', fromPeerId)
    
    // Emit custom event for call provider to handle
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('callEndedByPeer', {
        detail: { peerId: fromPeerId, reason: 'remote_call_end' }
      })
      window.dispatchEvent(event)
    }
  })

  // Handle outgoing signals from peer client
  peerClient.onSignal((to, signalData) => {
    console.log('📡 Sending signal via Realtime:', { to, type: signalData.type })
    signaling.sendSignal(to, {
      type: signalData.type as any,
      data: signalData
    }).catch(error => {
      console.error('❌ Failed to send signal:', error)
    })
  })

  return signaling
}

// Legacy function for backward compatibility
export const initSignaling = (_serverUrl: string, _roomId: string, myPeerId: string) => {
  console.warn('⚠️ initSignaling is deprecated, use initSupabaseSignaling instead')
  // For now, use session ID 1 as fallback
  return initSupabaseSignaling(1, myPeerId)
}
