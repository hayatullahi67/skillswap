// Supabase-based signaling for WebRTC
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

export class SupabaseSignaling {
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
    
    console.log('🚀 Initializing Supabase signaling for session:', sessionId)

    // Subscribe to realtime changes on webrtc_signals table
    this.channel = supabase
      .channel(`session_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('📡 Received signal via Supabase:', payload)
          this.handleIncomingSignal(payload.new as any)
        }
      )
      .subscribe((status) => {
        console.log('📡 Supabase channel status:', status)
      })

    console.log('✅ Supabase signaling initialized')
  }

  // Send a signal to another peer
  async sendSignal(to: string, signal: SignalData): Promise<void> {
    if (!this.sessionId) {
      throw new Error('Signaling not initialized')
    }

    console.log('📡 Sending signal via Supabase:', { to, type: signal.type })

    try {
      const { error } = await supabase
        .from('webrtc_signals')
        .insert({
          session_id: this.sessionId,
          from_peer_id: this.myPeerId,
          to_peer_id: to,
          signal_data: signal.data,
          signal_type: signal.type,
          processed: false
        })

      if (error) {
        console.error('❌ Error sending signal:', error)
        throw error
      }

      console.log('✅ Signal sent successfully')
    } catch (error) {
      console.error('❌ Failed to send signal:', error)
      throw error
    }
  }

  // Handle incoming signals from Supabase
  private handleIncomingSignal(signalRecord: any): void {
    // Only process signals meant for us
    if (signalRecord.to_peer_id !== this.myPeerId) {
      return
    }

    // Don't process our own signals
    if (signalRecord.from_peer_id === this.myPeerId) {
      return
    }

    console.log('📡 Processing incoming signal:', {
      from: signalRecord.from_peer_id,
      type: signalRecord.signal_type
    })

    const message: SignalMessage = {
      from: signalRecord.from_peer_id,
      to: signalRecord.to_peer_id,
      signal: {
        type: signalRecord.signal_type,
        data: signalRecord.signal_data
      },
      sessionId: signalRecord.session_id
    }

    if (this.onSignalCallback) {
      this.onSignalCallback(message)
    }

    // Mark signal as processed
    this.markSignalProcessed(signalRecord.id)
  }

  // Mark signal as processed (optional cleanup)
  private async markSignalProcessed(signalId: number): Promise<void> {
    try {
      await supabase
        .from('webrtc_signals')
        .update({ processed: true })
        .eq('id', signalId)
    } catch (error) {
      console.warn('⚠️ Failed to mark signal as processed:', error)
    }
  }

  // Set callback for incoming signals
  onSignal(callback: (message: SignalMessage) => void): void {
    this.onSignalCallback = callback
  }

  // Clean up old signals (call this periodically)
  async cleanupOldSignals(): Promise<void> {
    if (!this.sessionId) return

    try {
      // Delete processed signals older than 1 hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      
      await supabase
        .from('webrtc_signals')
        .delete()
        .eq('session_id', this.sessionId)
        .eq('processed', true)
        .lt('created_at', oneHourAgo)

      console.log('🧹 Cleaned up old signals')
    } catch (error) {
      console.warn('⚠️ Failed to cleanup old signals:', error)
    }
  }

  // Disconnect and cleanup
  disconnect(): void {
    console.log('🔌 Disconnecting Supabase signaling')
    
    if (this.channel) {
      this.channel.unsubscribe()
      this.channel = null
    }

    this.sessionId = null
    this.onSignalCallback = undefined
  }
}