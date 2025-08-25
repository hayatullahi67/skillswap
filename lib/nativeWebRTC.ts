// Native WebRTC implementation - Simple and reliable
import { supabase } from './supabaseClient'

export class NativeWebRTC {
  private pc: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null
  private sessionId: number
  private myPeerId: string
  private remotePeerId: string
  private channel: any = null
  
  // Callbacks
  private onLocalStreamCallback?: (stream: MediaStream) => void
  private onRemoteStreamCallback?: (stream: MediaStream) => void
  private onConnectionStateCallback?: (state: string) => void

  constructor(sessionId: number, myPeerId: string, remotePeerId: string) {
    this.sessionId = sessionId
    this.myPeerId = myPeerId
    this.remotePeerId = remotePeerId
  }

  // Step 1: Initialize and get local media
  async initialize(): Promise<void> {
    console.log('🚀 Initializing native WebRTC...')
    
    // Get local media stream
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      console.log('✅ Got local media stream')
      if (this.onLocalStreamCallback) {
        this.onLocalStreamCallback(this.localStream)
      }
    } catch (error) {
      console.error('❌ Failed to get media:', error)
      throw error
    }

    // Step 2: Create peer connection
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:numb.viagenie.ca',
          username: 'webrtc@live.com',
          credential: 'muazkh'
        }
      ],
      iceCandidatePoolSize: 10
    })

    // Add local tracks to peer connection
    this.localStream.getTracks().forEach(track => {
      this.pc!.addTrack(track, this.localStream!)
    })

    // Step 3: Handle remote stream
    this.pc.ontrack = (event) => {
      console.log('🎉 Received remote stream!')
      this.remoteStream = event.streams[0]
      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(this.remoteStream)
      }
    }

    // Handle connection state changes
    this.pc.onconnectionstatechange = () => {
      const state = this.pc!.connectionState
      console.log('🔗 Connection state:', state)
      if (this.onConnectionStateCallback) {
        this.onConnectionStateCallback(state)
      }
    }

    // Step 6: Handle ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('📡 Sending ICE candidate')
        this.sendSignal({
          type: 'candidate',
          candidate: event.candidate
        })
      }
    }

    // Set up Supabase signaling
    await this.setupSignaling()
    
    console.log('✅ Native WebRTC initialized')
  }

  // Step 4: Supabase signaling setup
  private async setupSignaling(): Promise<void> {
    console.log('📡 Setting up Supabase signaling...')
    
    this.channel = supabase
      .channel(`webrtc_${this.sessionId}`)
      .on('broadcast', { event: 'webrtc_signal' }, (payload) => {
        this.handleSignal(payload.payload)
      })
      .subscribe((status) => {
        console.log('📡 Signaling channel status:', status)
      })
  }

  // Send signal via Supabase
  private async sendSignal(signal: any): Promise<void> {
    if (!this.channel) return
    
    await this.channel.send({
      type: 'broadcast',
      event: 'webrtc_signal',
      payload: {
        from: this.myPeerId,
        to: this.remotePeerId,
        signal: signal
      }
    })
  }

  // Handle incoming signals
  private async handleSignal(payload: any): Promise<void> {
    // Only process signals meant for us
    if (payload.to !== this.myPeerId || payload.from !== this.remotePeerId) {
      return
    }

    const signal = payload.signal
    console.log('📡 Received signal:', signal.type)

    try {
      if (signal.type === 'offer') {
        // Step 5: Handle offer (callee side)
        await this.pc!.setRemoteDescription(new RTCSessionDescription(signal.sdp))
        const answer = await this.pc!.createAnswer()
        await this.pc!.setLocalDescription(answer)
        
        console.log('📡 Sending answer')
        await this.sendSignal({
          type: 'answer',
          sdp: answer
        })
        
      } else if (signal.type === 'answer') {
        // Handle answer (caller side)
        await this.pc!.setRemoteDescription(new RTCSessionDescription(signal.sdp))
        console.log('✅ Answer received and set')
        
      } else if (signal.type === 'candidate') {
        // Step 6: Handle ICE candidates
        try {
          await this.pc!.addIceCandidate(new RTCIceCandidate(signal.candidate))
          console.log('✅ ICE candidate added')
        } catch (error) {
          console.error('❌ Error adding ICE candidate:', error)
        }
      }
    } catch (error) {
      console.error('❌ Error handling signal:', error)
    }
  }

  // Step 5: Create offer (caller side)
  async createOffer(): Promise<void> {
    if (!this.pc) throw new Error('Peer connection not initialized')
    
    console.log('📞 Creating offer...')
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    
    console.log('📡 Sending offer')
    await this.sendSignal({
      type: 'offer',
      sdp: offer
    })
  }

  // Set callbacks
  onLocalStream(callback: (stream: MediaStream) => void): void {
    this.onLocalStreamCallback = callback
  }

  onRemoteStream(callback: (stream: MediaStream) => void): void {
    this.onRemoteStreamCallback = callback
  }

  onConnectionState(callback: (state: string) => void): void {
    this.onConnectionStateCallback = callback
  }

  // Toggle media
  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = enabled
      }
    }
  }

  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = enabled
      }
    }
  }

  // Cleanup
  disconnect(): void {
    console.log('🔌 Disconnecting WebRTC...')
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
    }
    
    if (this.pc) {
      this.pc.close()
    }
    
    if (this.channel) {
      this.channel.unsubscribe()
    }
    
    console.log('✅ WebRTC disconnected')
  }

  // Get connection stats
  async getStats(): Promise<any> {
    if (!this.pc) return null
    return await this.pc.getStats()
  }
}