// import SimplePeer from 'simple-peer'

// export interface PeerConnection {
//   id: string
//   peer: SimplePeer.Instance
//   isInitiator: boolean
//   remoteStream?: MediaStream
// }

// export class PeerClient {
//   private connections: Map<string, PeerConnection> = new Map()
//   private localStream: MediaStream | null = null
//   private onIncomingCallCallback?: (peerId: string, remoteStream: MediaStream) => void
//   private isInitialized: boolean = false
//   private pendingSignals: Map<string, any[]> = new Map() // Store pending signals

//   async initialize(): Promise<void> {
//     try {
//       console.log('🚀 Initializing Simple-Peer client...')
//       await this.getLocalStream()
//       this.isInitialized = true
//       console.log('✅ Simple-Peer client initialized successfully')
//     } catch (error) {
//       console.error('❌ Failed to initialize Simple-Peer client:', error)
//       throw error
//     }
//   }

//   async getLocalStream(): Promise<MediaStream> {
//     try {
//       const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
//       const videoConstraints = isMobile ? {
//         width: { ideal: 320, max: 640 },
//         height: { ideal: 240, max: 480 },
//         frameRate: { ideal: 10, max: 15 },
//         facingMode: 'user'
//       } : {
//         width: { ideal: 1280 },
//         height: { ideal: 720 },
//         frameRate: { ideal: 30 }
//       }

//       const audioConstraints = isMobile ? {
//         echoCancellation: true,
//         noiseSuppression: true,
//         autoGainControl: true,
//         sampleRate: 8000,
//         channelCount: 1
//       } : {
//         echoCancellation: true,
//         noiseSuppression: true,
//         autoGainControl: true,
//         sampleRate: 44100
//       }

//       this.localStream = await navigator.mediaDevices.getUserMedia({
//         video: videoConstraints,
//         audio: audioConstraints
//       })
      
//       console.log('✅ Got media stream')
//       return this.localStream
      
//     } catch (error) {
//       console.error('❌ Media access failed:', error)
//       throw new Error('Unable to access camera or microphone. Please check permissions.')
//     }
//   }

//   // Create a new peer connection (initiator)
//   async createConnection(peerId: string): Promise<SimplePeer.Instance> {
//     if (!this.isInitialized || !this.localStream) {
//       throw new Error('Peer client not initialized or no local stream')
//     }

//     console.log(`🔗 Creating connection to peer: ${peerId}`)
    
//     const peer = new (SimplePeer as any)({
//       initiator: true,
//       trickle: false, // Disable trickling for better mobile support
//       stream: this.localStream,
//       config: {
//         iceServers: [
//           { urls: 'stun:stun.l.google.com:19302' },
//           { urls: 'stun:stun1.l.google.com:19302' },
//           {
//             urls: 'turn:openrelay.metered.ca:80',
//             username: 'openrelayproject',
//             credential: 'openrelayproject'
//           }
//         ]
//       }
//     })

//     this.setupPeerEventHandlers(peer, peerId, true)
//     this.connections.set(peerId, { id: peerId, peer, isInitiator: true })
    
//     // Check if we have pending signals for this peer
//     const pendingSignals = this.pendingSignals.get(peerId) || []
//     pendingSignals.forEach(signal => {
//       console.log(`📡 Applying pending signal to peer: ${peerId}`)
//       peer.signal(signal)
//     })
//     this.pendingSignals.delete(peerId)
    
//     return peer
//   }

//   // Accept an incoming connection (non-initiator)
//   async acceptConnection(peerId: string, offerSignal: any): Promise<SimplePeer.Instance> {
//     if (!this.isInitialized || !this.localStream) {
//       throw new Error('Peer client not initialized or no local stream')
//     }

//     console.log(`📞 Accepting connection from peer: ${peerId}`)
    
//     const peer = new (SimplePeer as any)({
//       initiator: false,
//       trickle: false, // Disable trickling for better mobile support
//       stream: this.localStream,
//       config: {
//         iceServers: [
//           { urls: 'stun:stun.l.google.com:19302' },
//           { urls: 'stun:stun1.l.google.com:19302' },
//           {
//             urls: 'turn:openrelay.metered.ca:80',
//             username: 'openrelayproject',
//             credential: 'openrelayproject'
//           }
//         ]
//       }
//     })

//     this.setupPeerEventHandlers(peer, peerId, false)
//     this.connections.set(peerId, { id: peerId, peer, isInitiator: false })
    
//     // Signal the peer with the offer immediately
//     console.log(`📡 Signaling peer with offer: ${peerId}`)
//     peer.signal(offerSignal)
    
//     return peer
//   }

//   // Handle incoming signals (this is the key to making it work!)
//   handleIncomingSignal(fromPeerId: string, signalData: any): void {
//     console.log(`📡 Received signal from: ${fromPeerId}`, signalData.type)
    
//     const connection = this.connections.get(fromPeerId)
//     if (connection) {
//       // We have an active connection, signal it directly
//       console.log(`📡 Signaling existing connection: ${fromPeerId}`)
//       connection.peer.signal(signalData)
//     } else {
//       // Store the signal for when connection is created
//       console.log(`📡 Storing signal for future connection: ${fromPeerId}`)
//       if (!this.pendingSignals.has(fromPeerId)) {
//         this.pendingSignals.set(fromPeerId, [])
//       }
//       this.pendingSignals.get(fromPeerId)!.push(signalData)
//     }
//   }

//   private setupPeerEventHandlers(peer: SimplePeer.Instance, peerId: string, isInitiator: boolean) {
//     peer.on('connect', () => {
//       console.log(`🔗 Connected to peer: ${peerId}`)
//     })

//     peer.on('stream', (remoteStream: MediaStream) => {
//       console.log(`🎉 Received stream from peer: ${peerId}`)
      
//       const connection = this.connections.get(peerId)
//       if (connection) {
//         connection.remoteStream = remoteStream
//       }

//       if (this.onIncomingCallCallback) {
//         this.onIncomingCallCallback(peerId, remoteStream)
//       }
//     })

//     peer.on('signal', (signalData: any) => {
//       console.log(`📡 Signal from peer: ${peerId}`, signalData.type)
//       // This signal should be sent to the other peer via your signaling mechanism
//       this.handleOutgoingSignal(peerId, signalData)
//     })

//     peer.on('iceStateChange', (state: string) => {
//       console.log(`🧊 ICE state for peer ${peerId}:`, state)
//     })

//     peer.on('close', () => {
//       console.log(`🔌 Connection closed with peer: ${peerId}`)
//       this.connections.delete(peerId)
//     })

//     peer.on('error', (error: Error) => {
//       console.error(`❌ Error with peer ${peerId}:`, error)
//     })
//   }

//   // Handle outgoing signals - you need to implement this in your app
//   private handleOutgoingSignal(peerId: string, signalData: any) {
//     console.log(`📡 Outgoing signal to peer: ${peerId}`, signalData.type)
    
//     // This is where you'd send the signal to the other peer
//     // You need to implement this based on your signaling mechanism
    
//     // For now, let's emit a custom event that your app can listen to
//     const event = new CustomEvent('peerSignal', {
//       detail: { to: peerId, signal: signalData }
//     })
//     window.dispatchEvent(event)
//   }

//   onIncomingCall(callback: (peerId: string, remoteStream: MediaStream) => void) {
//     this.onIncomingCallCallback = callback
//     console.log('🎯 Incoming call callback set')
//   }

//   getConnectionStatus(peerId: string): { connected: boolean, hasStream: boolean } {
//     const connection = this.connections.get(peerId)
//     if (!connection) {
//       return { connected: false, hasStream: false }
//     }

//     return {
//       connected: connection.peer.connected,
//       hasStream: !!connection.remoteStream
//     }
//   }

//   getActiveConnections(): string[] {
//     return Array.from(this.connections.keys()).filter(peerId => {
//       const connection = this.connections.get(peerId)
//       return connection && connection.peer.connected
//     })
//   }

//   async updateMediaConstraints(isVideoEnabled: boolean, isAudioEnabled: boolean): Promise<void> {
//     try {
//       if (this.localStream) {
//         const videoTrack = this.localStream.getVideoTracks()[0]
//         if (videoTrack) videoTrack.enabled = isVideoEnabled
        
//         const audioTrack = this.localStream.getAudioTracks()[0]
//         if (audioTrack) audioTrack.enabled = isAudioEnabled
        
//         console.log(`📹 Video: ${isVideoEnabled}, 🎤 Audio: ${isAudioEnabled}`)
//       }
//     } catch (error) {
//       console.error('❌ Error updating media constraints:', error)
//     }
//   }

//   async checkConnectionHealth(): Promise<{ status: string, details: any }> {
//     try {
//       const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
//       if (!this.isInitialized) {
//         return { status: 'not_initialized', details: 'Peer client not initialized' }
//       }

//       if (!this.localStream) {
//         return { status: 'no_stream', details: 'No local media stream' }
//       }

//       const activeConnections = this.getActiveConnections()
//       const videoTrack = this.localStream.getVideoTracks()[0]
//       const audioTrack = this.localStream.getAudioTracks()[0]

//       const health = {
//         initialized: this.isInitialized,
//         hasLocalStream: !!this.localStream,
//         hasVideo: !!videoTrack,
//         hasAudio: !!audioTrack,
//         videoEnabled: videoTrack?.enabled || false,
//         audioEnabled: audioTrack?.enabled || false,
//         activeConnections: activeConnections.length,
//         deviceType: isMobile ? 'mobile' : 'desktop'
//       }

//       if (health.hasLocalStream && health.activeConnections > 0) {
//         return { status: 'healthy', details: health }
//       } else if (health.hasLocalStream) {
//         return { status: 'partial', details: health }
//       } else {
//         return { status: 'unhealthy', details: health }
//       }
//     } catch (error) {
//       return { status: 'error', details: error }
//     }
//   }

//   async testMobileConnection(): Promise<string> {
//     try {
//       const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
//       const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      
//       console.log('🧪 Testing Simple-Peer mobile connection...')
//       console.log(`📱 Device: ${isMobile ? 'Mobile' : 'Desktop'}`)
//       console.log(`🍎 iOS: ${isIOS}`)
      
//       if (!this.isInitialized) {
//         return 'Test failed: Peer client not initialized'
//       }
      
//       if (this.localStream) {
//         const videoTracks = this.localStream.getVideoTracks()
//         const audioTracks = this.localStream.getAudioTracks()
//         console.log('📊 Local stream:', {
//           videoTracks: videoTracks.length,
//           audioTracks: audioTracks.length
//         })
//       }
      
//       const activeConnections = this.getActiveConnections()
//       console.log('🔗 Active connections:', activeConnections.length)
      
//       return `Simple-Peer test completed. Device: ${isMobile ? 'Mobile' : 'Desktop'}, iOS: ${isIOS}, Connections: ${activeConnections.length}`
      
//     } catch (error) {
//       console.error('❌ Simple-Peer test failed:', error)
//       return `Test failed: ${error}`
//     }
//   }

//   disconnectFromPeer(peerId: string): void {
//     const connection = this.connections.get(peerId)
//     if (connection) {
//       connection.peer.destroy()
//       this.connections.delete(peerId)
//     }
//   }

//   disconnect(): void {
//     console.log('🛑 Disconnecting all peers...')
    
//     this.connections.forEach((connection) => {
//       connection.peer.destroy()
//     })
    
//     this.connections.clear()
//     this.pendingSignals.clear()
    
//     if (this.localStream) {
//       this.localStream.getTracks().forEach(track => track.stop())
//       this.localStream = null
//     }
    
//     this.isInitialized = false
//     console.log('✅ All connections disconnected')
//   }
// }

// export const peerClient = new PeerClient()




// lib/peerClient.ts - Updated for Next.js
import SimplePeer from 'simple-peer'

export interface PeerConnection {
  id: string
  peer: SimplePeer.Instance
  isInitiator: boolean
  remoteStream?: MediaStream
}

export class PeerClient {
  private connections: Map<string, PeerConnection> = new Map()
  private localStream: MediaStream | null = null
  private onIncomingCallCallback?: (peerId: string, remoteStream: MediaStream) => void
  private onSignalCallback?: (peerId: string, signalData: any) => void
  private isInitialized: boolean = false
  private pendingSignals: Map<string, any[]> = new Map()
  private myPeerId: string = ''

  constructor(customPeerId?: string) {
    // Use custom peer ID if provided, otherwise generate one
    this.myPeerId = customPeerId || 'peer_' + Math.random().toString(36).substring(2, 15)
    
    // Only set up browser-specific listeners if we're in the browser
    if (typeof window !== 'undefined') {
      this.setupBrowserListeners()
    }
  }

  // Method to set a custom peer ID (must be called before initialization)
  setPeerId(peerId: string): void {
    if (this.isInitialized) {
      console.warn('⚠️ Cannot change peer ID after initialization')
      return
    }
    this.myPeerId = peerId
    console.log('🆔 Peer ID set to:', peerId)
  }

  private setupBrowserListeners() {
    // Listen for custom events from signaling
    window.addEventListener('peerSignal', (event: any) => {
      const { to, signal } = event.detail
      if (this.onSignalCallback) {
        this.onSignalCallback(to, signal)
      }
    })
  }

  getMyPeerId(): string {
    return this.myPeerId
  }

  // Set callback for outgoing signals
  onSignal(callback: (peerId: string, signalData: any) => void) {
    this.onSignalCallback = callback
  }

  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing Simple-Peer client...')
      await this.getLocalStream()
      this.isInitialized = true
      console.log('✅ Simple-Peer client initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize Simple-Peer client:', error)
      throw error
    }
  }

  async getLocalStream(): Promise<MediaStream> {
    try {
      // Check if we're in a browser environment
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
        throw new Error('Not in browser environment or no media devices available')
      }

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      const videoConstraints = isMobile ? {
        width: { ideal: 320, max: 640 },
        height: { ideal: 240, max: 480 },
        frameRate: { ideal: 10, max: 15 },
        facingMode: 'user'
      } : {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      }

      const audioConstraints = isMobile ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 8000,
        channelCount: 1
      } : {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100
      }

      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints
      })
      
      console.log('✅ Got media stream', {
        videoTracks: this.localStream.getVideoTracks().length,
        audioTracks: this.localStream.getAudioTracks().length
      })
      
      return this.localStream
      
    } catch (error) {
      console.error('❌ Media access failed:', error)
      throw new Error('Unable to access camera or microphone. Please check permissions.')
    }
  }

  // Create a new peer connection (initiator)
  async createConnection(peerId: string): Promise<SimplePeer.Instance> {
    if (!this.isInitialized || !this.localStream) {
      throw new Error('Peer client not initialized or no local stream')
    }

    console.log(`🔗 Creating connection to peer: ${peerId}`)
    
    const peer = new (SimplePeer as any)({
      initiator: true,
      trickle: true, // Enable trickling for better connectivity
      stream: this.localStream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ]
      }
    })

    this.setupPeerEventHandlers(peer, peerId, true)
    this.connections.set(peerId, { id: peerId, peer, isInitiator: true })
    
    // Apply any pending signals
    const pendingSignals = this.pendingSignals.get(peerId) || []
    pendingSignals.forEach(signal => {
      console.log(`📡 Applying pending signal to peer: ${peerId}`)
      peer.signal(signal)
    })
    this.pendingSignals.delete(peerId)
    
    return peer
  }

  // Accept an incoming connection (non-initiator)
  async acceptConnection(peerId: string, offerSignal?: any): Promise<SimplePeer.Instance> {
    if (!this.isInitialized || !this.localStream) {
      throw new Error('Peer client not initialized or no local stream')
    }

    console.log(`📞 Accepting connection from peer: ${peerId}`)
    
    const peer = new (SimplePeer as any)({
      initiator: false,
      trickle: true, // Enable trickling
      stream: this.localStream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ]
      }
    })

    this.setupPeerEventHandlers(peer, peerId, false)
    this.connections.set(peerId, { id: peerId, peer, isInitiator: false })
    
    // If caller passed the offer, signal immediately
    if (offerSignal) {
      peer.signal(offerSignal)
    }
    
    // Also apply any pending signals we buffered earlier (including the offer)
    const pending = this.pendingSignals.get(peerId) || []
    pending.forEach(sig => peer.signal(sig))
    this.pendingSignals.delete(peerId)
    
    return peer
  }

  // Handle incoming signals
  handleIncomingSignal(fromPeerId: string, signalData: any): void {
    console.log(`📡 Received signal from: ${fromPeerId}`, signalData.type)
    
    const connection = this.connections.get(fromPeerId)
    if (connection) {
      console.log(`📡 Signaling existing connection: ${fromPeerId}`)
      try {
        connection.peer.signal(signalData)
      } catch (error) {
        console.error('❌ Error signaling peer:', error)
      }
    } else {
      // Store all signals for when connection is created
      console.log(`📡 Storing signal for future connection: ${fromPeerId}`)
      if (!this.pendingSignals.has(fromPeerId)) {
        this.pendingSignals.set(fromPeerId, [])
      }
      this.pendingSignals.get(fromPeerId)!.push(signalData)
      
      // If it's an offer, notify the app about the incoming call attempt
      if (signalData.type === 'offer' && this.onIncomingOfferCallback) {
        console.log(`📞 Notifying app about incoming offer from: ${fromPeerId}`)
        this.onIncomingOfferCallback(fromPeerId, signalData)
      }
    }
  }

  private setupPeerEventHandlers(peer: SimplePeer.Instance, peerId: string, isInitiator: boolean) {
    peer.on('connect', () => {
      console.log(`🔗 Connected to peer: ${peerId}`)
      
      // Check if we already have a remote stream for this connection
      const connection = this.connections.get(peerId)
      if (connection && connection.remoteStream) {
        console.log(`📹 Connection established, remote stream already available for: ${peerId}`)
        
        // Re-trigger the callback to ensure UI is updated
        if (this.onIncomingCallCallback) {
          this.onIncomingCallCallback(peerId, connection.remoteStream)
        }
      }
    })

    peer.on('stream', (remoteStream: MediaStream) => {
      console.log(`🎉 Received stream from peer: ${peerId}`, {
        videoTracks: remoteStream.getVideoTracks().length,
        audioTracks: remoteStream.getAudioTracks().length,
        streamId: remoteStream.id
      })
      
      // CRITICAL: Verify it's not our own local stream
      if (this.localStream && remoteStream.id === this.localStream.id) {
        console.error('❌ Received local stream instead of remote! Ignoring...', {
          localStreamId: this.localStream.id,
          remoteStreamId: remoteStream.id
        })
        return
      }
      
      // Additional check: compare track IDs to be extra sure
      const localVideoTrackIds = this.localStream?.getVideoTracks().map(t => t.id) || []
      const remoteVideoTrackIds = remoteStream.getVideoTracks().map(t => t.id)
      const hasMatchingTracks = localVideoTrackIds.some(id => remoteVideoTrackIds.includes(id))
      
      if (hasMatchingTracks) {
        console.error('❌ Remote stream has matching track IDs with local stream! Ignoring...', {
          localVideoTrackIds,
          remoteVideoTrackIds
        })
        return
      }
      
      // Log and fix track states
      remoteStream.getVideoTracks().forEach((track, index) => {
        console.log(`📹 Video track ${index}:`, {
          id: track.id,
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted
        })
        
        // Force enable tracks if they're disabled
        if (!track.enabled) {
          console.log(`🔧 Enabling disabled video track ${index}`)
          track.enabled = true
        }
      })
      
      remoteStream.getAudioTracks().forEach((track, index) => {
        console.log(`🎤 Audio track ${index}:`, {
          id: track.id,
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted
        })
        
        // Force enable tracks if they're disabled
        if (!track.enabled) {
          console.log(`🔧 Enabling disabled audio track ${index}`)
          track.enabled = true
        }
      })
      
      const connection = this.connections.get(peerId)
      if (connection) {
        connection.remoteStream = remoteStream
      }

      // Wait a bit for stream to be fully ready, then trigger callback
      setTimeout(() => {
        if (this.onIncomingCallCallback) {
          console.log(`📞 Triggering incoming call callback for peer: ${peerId} (delayed)`)
          this.onIncomingCallCallback(peerId, remoteStream)
        } else {
          console.warn(`⚠️ No incoming call callback set for peer: ${peerId}`)
        }
      }, 200) // 200ms delay to ensure stream is ready
    })

    peer.on('signal', (signalData: any) => {
      console.log(`📡 Signal from peer: ${peerId}`, signalData.type)
      this.handleOutgoingSignal(peerId, signalData)
    })

    peer.on('iceStateChange', (state: string) => {
      console.log(`🧊 ICE state for peer ${peerId}:`, state)
    })

    peer.on('close', () => {
      console.log(`🔌 Connection closed with peer: ${peerId}`)
      this.connections.delete(peerId)
      
      // Emit custom event for call provider to handle
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('peerDisconnected', {
          detail: { peerId, reason: 'connection_closed' }
        })
        window.dispatchEvent(event)
      }
    })

    peer.on('error', (error: Error) => {
      console.error(`❌ Error with peer ${peerId}:`, error)
      
      // Emit custom event for serious errors
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('peerError', {
          detail: { peerId, error: error.message }
        })
        window.dispatchEvent(event)
      }
    })
  }

  // Updated signal handling
  private handleOutgoingSignal(peerId: string, signalData: any) {
    console.log(`📡 Outgoing signal to peer: ${peerId}`, signalData.type)
    
    if (this.onSignalCallback) {
      this.onSignalCallback(peerId, signalData)
    } else {
      // Fallback to custom event
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('peerSignal', {
          detail: { to: peerId, signal: signalData, from: this.myPeerId }
        })
        window.dispatchEvent(event)
      }
    }
  }

  onIncomingCall(callback: (peerId: string, remoteStream: MediaStream) => void) {
    this.onIncomingCallCallback = callback
    console.log('🎯 Incoming call callback set')
  }

  // New method to handle incoming call offers
  private onIncomingOfferCallback?: (peerId: string, offer?: any) => void

  onIncomingOffer(callback: (peerId: string, offer?: any) => void) {
    this.onIncomingOfferCallback = callback
    console.log('🎯 Incoming offer callback set')
  }

  // Check if there's a pending offer from a peer
  hasPendingOffer(peerId: string): boolean {
    const signals = this.pendingSignals.get(peerId) || []
    return signals.some(signal => signal.type === 'offer')
  }

  // Helper method to display remote stream
  displayRemoteStream(peerId: string, videoElement: HTMLVideoElement): boolean {
    const connection = this.connections.get(peerId)
    if (connection && connection.remoteStream) {
      console.log(`📺 Displaying remote stream for peer: ${peerId}`)
      videoElement.srcObject = connection.remoteStream
      videoElement.play().catch(error => {
        console.error('❌ Error playing video:', error)
      })
      return true
    }
    console.warn(`❌ No remote stream available for peer: ${peerId}`)
    return false
  }

  // Get remote stream directly
  getRemoteStream(peerId: string): MediaStream | null {
    const connection = this.connections.get(peerId)
    return connection?.remoteStream || null
  }

  // Debug method to check stream states
  debugStreams(): void {
    console.log('🔍 Stream Debug Info:')
    console.log('- Local stream:', this.localStream ? {
      id: this.localStream.id,
      videoTracks: this.localStream.getVideoTracks().length,
      audioTracks: this.localStream.getAudioTracks().length,
      videoEnabled: this.localStream.getVideoTracks().map(t => t.enabled),
      audioEnabled: this.localStream.getAudioTracks().map(t => t.enabled)
    } : 'None')
    
    console.log('- Connections:', this.connections.size)
    this.connections.forEach((connection, peerId) => {
      console.log(`  ${peerId}:`, {
        connected: connection.peer.connected,
        hasRemoteStream: !!connection.remoteStream,
        remoteStreamId: connection.remoteStream?.id,
        remoteVideoTracks: connection.remoteStream?.getVideoTracks().length || 0,
        remoteAudioTracks: connection.remoteStream?.getAudioTracks().length || 0
      })
    })
  }

  getConnectionStatus(peerId: string): { connected: boolean, hasStream: boolean } {
    const connection = this.connections.get(peerId)
    if (!connection) {
      return { connected: false, hasStream: false }
    }

    return {
      connected: connection.peer.connected,
      hasStream: !!connection.remoteStream
    }
  }

  getActiveConnections(): string[] {
    return Array.from(this.connections.keys()).filter(peerId => {
      const connection = this.connections.get(peerId)
      return connection && connection.peer.connected
    })
  }

  async updateMediaConstraints(isVideoEnabled: boolean, isAudioEnabled: boolean): Promise<void> {
    try {
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0]
        if (videoTrack) videoTrack.enabled = isVideoEnabled
        
        const audioTrack = this.localStream.getAudioTracks()[0]
        if (audioTrack) audioTrack.enabled = isAudioEnabled
        
        console.log(`📹 Video: ${isVideoEnabled}, 🎤 Audio: ${isAudioEnabled}`)
      }
    } catch (error) {
      console.error('❌ Error updating media constraints:', error)
    }
  }

  disconnectFromPeer(peerId: string): void {
    const connection = this.connections.get(peerId)
    if (connection) {
      connection.peer.destroy()
      this.connections.delete(peerId)
      console.log(`🔌 Disconnected from peer: ${peerId}`)
    }
  }

  disconnect(): void {
    console.log('🛑 Disconnecting all peers...')
    
    this.connections.forEach((connection) => {
      connection.peer.destroy()
    })
    
    this.connections.clear()
    this.pendingSignals.clear()
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }
    
    this.isInitialized = false
    console.log('✅ All connections disconnected')
  }
}

// Create singleton instance - but only in browser
let peerClientInstance: PeerClient | null = null

export const getPeerClient = (customPeerId?: string): PeerClient => {
  if (!peerClientInstance) {
    peerClientInstance = new PeerClient(customPeerId)
  }
  return peerClientInstance
}

// Reset the singleton (useful for testing or when user changes)
export const resetPeerClient = (): void => {
  if (peerClientInstance) {
    peerClientInstance.disconnect()
  }
  peerClientInstance = null
}