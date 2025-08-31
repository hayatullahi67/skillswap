// Simplified peer client with Socket.IO signaling
import SimplePeer from 'simple-peer'
import { SocketSignaling } from './socketSignaling'

export interface PeerConnection {
  id: string
  peer: SimplePeer.Instance
  isInitiator: boolean
  remoteStream?: MediaStream
}

export class SimplePeerClient {
  private connections: Map<string, PeerConnection> = new Map()
  private localStream: MediaStream | null = null
  private signaling: SocketSignaling | null = null
  private myPeerId: string
  private onIncomingCallCallback?: (peerId: string, remoteStream: MediaStream) => void
  private onIncomingOfferCallback?: (peerId: string, offer?: any) => void
  private isInitialized: boolean = false
  private pendingSignals: Map<string, any[]> = new Map() // Buffer signals until connection is ready
  private connectionStates: Map<string, 'creating' | 'ready' | 'connected' | 'failed'> = new Map()

  constructor(peerId: string) {
    this.myPeerId = peerId
    console.log('🚀 Creating SimplePeerClient with ID:', peerId)
  }

  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing SimplePeerClient...')
      
      // Initialize Socket.IO signaling with timeout
      this.signaling = new SocketSignaling(this.myPeerId)
      
      // Try to initialize with a timeout
      const initPromise = this.signaling.initialize()
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Socket.IO initialization timeout')), 10000)
      })
      
      await Promise.race([initPromise, timeoutPromise])
      
      // Set up signaling callbacks
      this.signaling.onSignal((from: string, data: any) => {
        console.log('📡 Received signal from signaling:', { from, type: data.type || 'unknown' })
        this.handleIncomingSignal(from, data)
      })

      this.signaling.onCallEnd((from: string) => {
        console.log('📞 Received call end from signaling:', from)
        this.disconnectFromPeer(from)
      })

      // Get local media stream
      await this.getLocalStream()
      
      this.isInitialized = true
      console.log('✅ SimplePeerClient initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize SimplePeerClient:', error)
      
      // If Socket.IO fails, we can still get the local stream for UI purposes
      try {
        await this.getLocalStream()
        console.log('⚠️ Voice client in limited mode - local audio only')
      } catch (streamError) {
        console.error('❌ Failed to get local stream:', streamError)
      }
      
      throw error
    }
  }

  async getLocalStream(): Promise<MediaStream> {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
        throw new Error('Not in browser environment or no media devices available')
      }

      console.log('🎤 Requesting microphone access...')

      // Simplified audio constraints
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      console.log('✅ Got media stream:', {
        audioTracks: this.localStream.getAudioTracks().length,
        streamId: this.localStream.id
      })
      
      return this.localStream
      
    } catch (error) {
      console.error('❌ Media access failed:', error)
      
      const errorMsg = error instanceof Error ? error.message : String(error)
      if (errorMsg.includes('Permission denied') || errorMsg.includes('NotAllowedError')) {
        throw new Error('Microphone access denied. Please allow microphone access and try again.')
      } else if (errorMsg.includes('NotFoundError') || errorMsg.includes('not found')) {
        throw new Error('No microphone found. Please check your audio devices.')
      } else {
        throw new Error('Unable to access microphone. Please check microphone permissions.')
      }
    }
  }

  // Create a new peer connection (initiator)
  async createConnection(peerId: string): Promise<SimplePeer.Instance> {
    if (!this.isInitialized || !this.localStream || !this.signaling) {
      throw new Error('SimplePeerClient not initialized')
    }

    console.log(`🔗 Creating connection to peer: ${peerId}`)
    
    // Set connection state to creating
    this.connectionStates.set(peerId, 'creating')
    
    const peer = new (SimplePeer as any)({
      initiator: true,
      trickle: true,
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
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ],
        iceCandidatePoolSize: 10,
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      },
      // Add connection timeout and retry settings
      offerOptions: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      },
      answerOptions: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      }
    })

    this.setupPeerEventHandlers(peer, peerId, true)
    this.connections.set(peerId, { id: peerId, peer, isInitiator: true })
    
    // Mark as ready after setup
    this.connectionStates.set(peerId, 'ready')
    
    // Process any buffered signals
    this.processBufferedSignals(peerId)
    
    return peer
  }

  // Accept an incoming connection (non-initiator)
  async acceptConnection(peerId: string): Promise<SimplePeer.Instance> {
    if (!this.isInitialized || !this.localStream || !this.signaling) {
      throw new Error('SimplePeerClient not initialized')
    }

    console.log(`📞 Accepting connection from peer: ${peerId}`)
    
    // Set connection state to creating
    this.connectionStates.set(peerId, 'creating')
    
    const peer = new (SimplePeer as any)({
      initiator: false,
      trickle: true,
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
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ],
        iceCandidatePoolSize: 10,
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      },
      // Add connection timeout and retry settings
      offerOptions: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      },
      answerOptions: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      }
    })

    this.setupPeerEventHandlers(peer, peerId, false)
    this.connections.set(peerId, { id: peerId, peer, isInitiator: false })
    
    // Mark as ready after setup
    this.connectionStates.set(peerId, 'ready')
    
    // Process any buffered signals
    this.processBufferedSignals(peerId)
    
    return peer
  }

  // Handle incoming signals with proper buffering and state management
  handleIncomingSignal(fromPeerId: string, signalData: any): void {
    console.log(`📡 Processing signal from: ${fromPeerId}`, { type: signalData.type || 'unknown' })
    
    const connection = this.connections.get(fromPeerId)
    const connectionState = this.connectionStates.get(fromPeerId)
    
    if (connection && connectionState === 'ready') {
      console.log(`📡 Signaling existing connection: ${fromPeerId}`)
      try {
        // Check peer connection state before signaling
        const peer = connection.peer as any
        if (peer._pc && peer._pc.signalingState) {
          console.log(`🔍 Peer connection state: ${peer._pc.signalingState}`)
          
          // Only signal if in appropriate state
          if (signalData.type === 'answer' && peer._pc.signalingState !== 'have-local-offer') {
            console.log(`⚠️ Ignoring answer in wrong state: ${peer._pc.signalingState}`)
            return
          }
          
          if (signalData.type === 'offer' && peer._pc.signalingState !== 'stable') {
            console.log(`⚠️ Ignoring offer in wrong state: ${peer._pc.signalingState}`)
            return
          }
        }
        
        connection.peer.signal(signalData)
      } catch (error) {
        console.error('❌ Error signaling peer:', error)
        // Reset connection on error
        this.connectionStates.set(fromPeerId, 'failed')
        this.connections.delete(fromPeerId)
      }
    } else {
      // Buffer signals for later processing
      if (!this.pendingSignals.has(fromPeerId)) {
        this.pendingSignals.set(fromPeerId, [])
      }
      this.pendingSignals.get(fromPeerId)!.push(signalData)
      console.log(`📦 Buffered signal for peer: ${fromPeerId}`, { type: signalData.type })
      
      // If it's an offer, notify the app about the incoming call
      if (signalData.type === 'offer' && this.onIncomingOfferCallback) {
        console.log(`📞 Notifying app about incoming offer from: ${fromPeerId}`)
        this.onIncomingOfferCallback(fromPeerId, signalData)
      }
    }
  }

  // Process buffered signals for a peer
  private processBufferedSignals(peerId: string): void {
    const bufferedSignals = this.pendingSignals.get(peerId)
    if (bufferedSignals && bufferedSignals.length > 0) {
      console.log(`📦 Processing ${bufferedSignals.length} buffered signals for peer: ${peerId}`)
      
      // Sort signals by type priority (offer first, then answer, then candidates)
      const sortedSignals = bufferedSignals.sort((a, b) => {
        const priority = { offer: 0, answer: 1, candidate: 2 }
        return (priority[a.type as keyof typeof priority] || 3) - (priority[b.type as keyof typeof priority] || 3)
      })
      
      sortedSignals.forEach((signal, index) => {
        setTimeout(() => {
          this.handleIncomingSignal(peerId, signal)
        }, index * 100) // Small delay between signals
      })
      
      this.pendingSignals.delete(peerId)
    }
  }

  private setupPeerEventHandlers(peer: SimplePeer.Instance, peerId: string, isInitiator: boolean) {
    peer.on('connect', () => {
      console.log(`🔗 Connected to peer: ${peerId}`)
      this.connectionStates.set(peerId, 'connected')
    })

    peer.on('stream', (remoteStream: MediaStream) => {
      console.log(`🎉 Received stream from peer: ${peerId}`, {
        audioTracks: remoteStream.getAudioTracks().length,
        streamId: remoteStream.id
      })
      
      // Verify it's not our own stream
      if (this.localStream && remoteStream.id === this.localStream.id) {
        console.error('❌ Received local stream instead of remote! Ignoring...')
        return
      }
      
      const connection = this.connections.get(peerId)
      if (connection) {
        connection.remoteStream = remoteStream
      }

      // Delay callback to ensure stream is ready
      setTimeout(() => {
        if (this.onIncomingCallCallback) {
          this.onIncomingCallCallback(peerId, remoteStream)
        }
      }, 200)
    })

    peer.on('signal', (signalData: any) => {
      console.log(`📡 Signal from peer: ${peerId}`, { type: signalData.type || 'unknown' })
      
      // Send signal via Socket.IO signaling
      if (this.signaling) {
        this.signaling.sendSignal(peerId, signalData)
      }
    })

    peer.on('close', () => {
      console.log(`🔌 Connection closed with peer: ${peerId}`)
      this.connections.delete(peerId)
      this.connectionStates.delete(peerId)
      this.pendingSignals.delete(peerId)
    })

    peer.on('error', (error: Error) => {
      console.error(`❌ Error with peer ${peerId}:`, error)
      
      // Don't immediately delete connection on certain recoverable errors
      const errorMessage = error.message.toLowerCase()
      if (errorMessage.includes('connection failed') && !errorMessage.includes('ice')) {
        console.log(`🔄 Connection error for peer ${peerId}, but keeping connection for potential recovery`)
        this.connectionStates.set(peerId, 'failed')
      } else {
        console.log(`💀 Fatal error for peer ${peerId}, removing connection`)
        this.connections.delete(peerId)
        this.connectionStates.set(peerId, 'failed')
        this.pendingSignals.delete(peerId)
      }
    })

    // Handle ICE connection state changes with better stability
    peer.on('iceStateChange', (state: string) => {
      console.log(`🧊 ICE state for peer ${peerId}:`, state)
      
      if (state === 'connected' || state === 'completed') {
        this.connectionStates.set(peerId, 'connected')
        console.log(`✅ ICE connection established for peer ${peerId}`)
      } else if (state === 'disconnected') {
        console.log(`⚠️ ICE disconnected for peer ${peerId}, but connection may recover`)
        // Don't immediately fail on disconnected - it might reconnect
      } else if (state === 'failed') {
        console.log(`❌ ICE connection failed for peer ${peerId}`)
        this.connectionStates.set(peerId, 'failed')
      } else if (state === 'closed') {
        console.log(`🔌 ICE connection closed for peer ${peerId}`)
        this.connectionStates.set(peerId, 'failed')
      }
    })
  }

  onIncomingCall(callback: (peerId: string, remoteStream: MediaStream) => void) {
    this.onIncomingCallCallback = callback
    console.log('🎯 Incoming call callback set')
  }

  onIncomingOffer(callback: (peerId: string, offer?: any) => void) {
    this.onIncomingOfferCallback = callback
    console.log('🎯 Incoming offer callback set')
  }

  getMyPeerId(): string {
    return this.myPeerId
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

  disconnectFromPeer(peerId: string): void {
    const connection = this.connections.get(peerId)
    if (connection) {
      connection.peer.destroy()
      this.connections.delete(peerId)
    }
  }

  checkConnectionHealth(): { [peerId: string]: any } {
    const health: { [peerId: string]: any } = {}
    
    this.connections.forEach((connection, peerId) => {
      const peer = connection.peer as any
      health[peerId] = {
        connected: peer.connected,
        destroyed: peer.destroyed,
        connectionState: this.connectionStates.get(peerId),
        hasRemoteStream: !!connection.remoteStream,
        iceConnectionState: peer._pc?.iceConnectionState,
        connectionState_rtc: peer._pc?.connectionState
      }
    })
    
    return health
  }

  disconnect(): void {
    console.log('🛑 Disconnecting all peers...')
    
    this.connections.forEach((connection) => {
      connection.peer.destroy()
    })
    
    this.connections.clear()
    this.connectionStates.clear()
    this.pendingSignals.clear()
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }
    
    if (this.signaling) {
      this.signaling.disconnect()
      this.signaling = null
    }
    
    this.isInitialized = false
    console.log('✅ All connections disconnected')
  }
}

// Global instance management
let globalPeerClient: SimplePeerClient | null = null

export function getPeerClient(peerId?: string): SimplePeerClient {
  if (!globalPeerClient || (peerId && globalPeerClient.getMyPeerId() !== peerId)) {
    if (globalPeerClient) {
      globalPeerClient.disconnect()
    }
    globalPeerClient = new SimplePeerClient(peerId || 'peer_' + Math.random().toString(36).substring(2, 15))
  }
  return globalPeerClient
}

export function resetPeerClient(): void {
  if (globalPeerClient) {
    globalPeerClient.disconnect()
    globalPeerClient = null
  }
}