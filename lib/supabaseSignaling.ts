// Supabase Realtime signaling for WebRTC (Vercel-compatible)
import { supabase } from './supabaseClient'
import { RealtimeChannel } from '@supabase/supabase-js'

export class SupabaseSignaling {
  private channel: RealtimeChannel | null = null
  private myPeerId: string
  private onSignalCallback?: (from: string, data: any) => void
  private onCallEndCallback?: (from: string) => void
  private isConnected: boolean = false

  constructor(myPeerId: string) {
    this.myPeerId = myPeerId
  }

  // Initialize Supabase Realtime connection
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🚀 Initializing Supabase signaling for peer:', this.myPeerId)

      // Create a unique channel for this peer
      const channelName = `webrtc-signaling-${this.myPeerId}`
      this.channel = supabase.channel(channelName)

      // Handle incoming signals
      this.channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
        const { from, to, data } = payload
        if (to === this.myPeerId && from !== this.myPeerId) {
          console.log('📡 Received signal via Supabase:', { from, type: data.type || 'unknown' })
          if (this.onSignalCallback) {
            this.onSignalCallback(from, data)
          }
        }
      })

      // Handle call end signals
      this.channel.on('broadcast', { event: 'call-ended' }, ({ payload }) => {
        const { from, to } = payload
        if (to === this.myPeerId && from !== this.myPeerId) {
          console.log('📞 Received call-ended via Supabase from:', from)
          if (this.onCallEndCallback) {
            this.onCallEndCallback(from)
          }
        }
      })

      // Subscribe to the channel
      this.channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Supabase signaling connected:', channelName)
          this.isConnected = true
          resolve()
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Supabase signaling error:', status)
          this.isConnected = false
          reject(new Error('Supabase signaling connection failed'))
        }
      })

      // Set connection timeout
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('Supabase signaling connection timeout'))
        }
      }, 10000)
    })
  }

  // Send signal to another peer
  sendSignal(to: string, data: any): void {
    if (!this.channel || !this.isConnected) {
      console.error('❌ Cannot send signal: Supabase signaling not connected')
      return
    }

    console.log('📡 Sending signal via Supabase:', {
      from: this.myPeerId,
      to,
      type: data.type || 'unknown'
    })

    // Broadcast to all peers, but they'll filter by 'to' field
    this.channel.send({
      type: 'broadcast',
      event: 'signal',
      payload: {
        from: this.myPeerId,
        to: to,
        data: data
      }
    })
  }

  // Send call end signal
  sendCallEnded(to: string, sessionId?: string): void {
    if (!this.channel || !this.isConnected) {
      console.error('❌ Cannot send call-ended: Supabase signaling not connected')
      return
    }

    console.log('📞 Sending call-ended via Supabase:', { from: this.myPeerId, to, sessionId })

    this.channel.send({
      type: 'broadcast',
      event: 'call-ended',
      payload: {
        from: this.myPeerId,
        to: to,
        sessionId: sessionId
      }
    })
  }

  // Set callback for incoming signals
  onSignal(callback: (from: string, data: any) => void): void {
    this.onSignalCallback = callback
  }

  // Set callback for call end signals
  onCallEnd(callback: (from: string) => void): void {
    this.onCallEndCallback = callback
  }

  // Check if connected
  isSignalingConnected(): boolean {
    return this.isConnected
  }

  // Get connection info
  getConnectionInfo(): { peerId: string, connected: boolean } {
    return {
      peerId: this.myPeerId,
      connected: this.isConnected
    }
  }

  // Disconnect
  disconnect(): void {
    console.log('🔌 Disconnecting Supabase signaling')

    if (this.channel) {
      this.channel.unsubscribe()
      this.channel = null
    }

    this.isConnected = false
    this.onSignalCallback = undefined
    this.onCallEndCallback = undefined
  }
}