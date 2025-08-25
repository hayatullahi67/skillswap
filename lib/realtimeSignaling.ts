// Simple Supabase Realtime signaling without database tables
import { supabase } from './supabaseClient'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface SignalData {
  type: 'offer' | 'answer' | 'ice-candidate'
  data: any
}

export interface SignalMessage {
  from: string
  to: string
  signal: SignalData
  sessionId: number
}

export class RealtimeSignaling {
  private channel: RealtimeChannel | null = null
  private sessionId: number | null = null
  private myPeerId: string
  private onSignalCallback?: (message: SignalMessage) => void

  constructor(myPeerId: string) {
    this.myPeerId = myPeerId
  }

  // Initialize signaling for a session
  async initialize(sessionId: number): Promise<void> {
    this.sessionId = sessionId
    
    console.log('🚀 Initializing Realtime signaling for session:', sessionId)

    // Subscribe to a session-specific channel
    this.channel = supabase
      .channel(`webrtc_session_${sessionId}`)
      .on('broadcast', { event: 'webrtc_signal' }, (payload) => {
        console.log('📡 Received signal via Realtime:', payload)
        this.handleIncomingSignal(payload.payload)
      })
      .subscribe((status) => {
        console.log('📡 Realtime channel status:', status)
      })

    console.log('✅ Realtime signaling initialized')
  }

  // Send a signal to another peer
  async sendSignal(to: string, signal: SignalData): Promise<void> {
    if (!this.sessionId || !this.channel) {
      throw new Error('Signaling not initialized')
    }

    console.log('📡 Sending signal via Realtime:', { to, type: signal.type })

    try {
      await this.channel.send({
        type: 'broadcast',
        event: 'webrtc_signal',
        payload: {
          from: this.myPeerId,
          to: to,
          signal: signal,
          sessionId: this.sessionId
        }
      })

      console.log('✅ Signal sent successfully')
    } catch (error) {
      console.error('❌ Failed to send signal:', error)
      throw error
    }
  }

  // Handle incoming signals from Realtime
  private handleIncomingSignal(payload: any): void {
    // Only process signals meant for us
    if (payload.to !== this.myPeerId) {
      return
    }

    // Don't process our own signals
    if (payload.from === this.myPeerId) {
      return
    }

    console.log('📡 Processing incoming signal:', {
      from: payload.from,
      type: payload.signal.type
    })

    const message: SignalMessage = {
      from: payload.from,
      to: payload.to,
      signal: payload.signal,
      sessionId: payload.sessionId
    }

    if (this.onSignalCallback) {
      this.onSignalCallback(message)
    }
  }

  // Set callback for incoming signals
  onSignal(callback: (message: SignalMessage) => void): void {
    this.onSignalCallback = callback
  }

  // Disconnect and cleanup
  disconnect(): void {
    console.log('🔌 Disconnecting Realtime signaling')
    
    if (this.channel) {
      this.channel.unsubscribe()
      this.channel = null
    }

    this.sessionId = null
    this.onSignalCallback = undefined
  }
}