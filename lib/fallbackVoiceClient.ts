// Fallback voice client using Supabase realtime when Socket.IO fails
import { supabase } from './supabaseClient'

export class FallbackVoiceClient {
  private myPeerId: string
  private localStream: MediaStream | null = null
  private onIncomingCallCallback?: (peerId: string, remoteStream: MediaStream) => void
  private realtimeChannel: any = null
  private isInitialized: boolean = false

  constructor(peerId: string) {
    this.myPeerId = peerId
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing fallback voice client (Supabase only)...')
      
      // Set up Supabase realtime channel for signaling
      this.realtimeChannel = supabase
        .channel(`voice_fallback_${this.myPeerId}`)
        .on('broadcast', { event: 'voice_signal' }, (payload) => {
          console.log('📡 Received voice signal via Supabase:', payload)
          // Handle signaling through Supabase
        })
        .subscribe()

      this.isInitialized = true
      console.log('✅ Fallback voice client initialized')
    } catch (error) {
      console.error('❌ Failed to initialize fallback voice client:', error)
      throw error
    }
  }

  async getLocalStream(): Promise<MediaStream> {
    try {
      if (this.localStream) {
        return this.localStream
      }

      console.log('🎤 Requesting microphone access (fallback mode)...')
      
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      console.log('✅ Got media stream (fallback):', {
        audioTracks: this.localStream.getAudioTracks().length,
        streamId: this.localStream.id
      })
      
      return this.localStream
      
    } catch (error) {
      console.error('❌ Media access failed (fallback):', error)
      throw error
    }
  }

  async createConnection(peerId: string): Promise<void> {
    console.log('⚠️ Fallback mode: Direct peer connection not available')
    console.log('💡 Voice chat requires Socket.IO server to be working')
    
    // Notify that connection failed
    throw new Error('Voice chat unavailable - Socket.IO server connection failed')
  }

  async acceptConnection(peerId: string): Promise<void> {
    console.log('⚠️ Fallback mode: Direct peer connection not available')
    throw new Error('Voice chat unavailable - Socket.IO server connection failed')
  }

  onIncomingCall(callback: (peerId: string, remoteStream: MediaStream) => void) {
    this.onIncomingCallCallback = callback
  }

  onIncomingOffer(callback: (peerId: string, offer?: any) => void) {
    // Not implemented in fallback mode
  }

  getMyPeerId(): string {
    return this.myPeerId
  }

  disconnect(): void {
    console.log('🛑 Disconnecting fallback voice client...')
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }
    
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe()
      this.realtimeChannel = null
    }
    
    this.isInitialized = false
    console.log('✅ Fallback voice client disconnected')
  }
}