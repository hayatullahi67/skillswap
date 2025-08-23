// Example implementation using the new Simple-Peer client with working signaling
import { PeerClient } from '../lib/peerClient'
import { SimpleSignaling } from '../lib/simpleSignaling'

// Example video call implementation that actually works
export class VideoCallExample {
  private localVideo: HTMLVideoElement
  private remoteVideo: HTMLVideoElement
  private signaling: SimpleSignaling
  private myPeerId: string
  private peerClient: PeerClient

  constructor() {
    this.localVideo = document.getElementById('localVideo') as HTMLVideoElement
    this.remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement
    this.myPeerId = 'peer_' + Math.random().toString(36).substr(2, 9)
    
    // Create peer client instance
    this.peerClient = new PeerClient(this.myPeerId)
    
    // Initialize signaling
    this.signaling = new SimpleSignaling(this.peerClient)
  }

  async initialize() {
    try {
      console.log('🚀 Initializing video call...')
      console.log(`🆔 My Peer ID: ${this.myPeerId}`)
      
      // Initialize the peer client
      await this.peerClient.initialize()
      
      // Set up incoming call handler
      this.peerClient.onIncomingCall((peerId, remoteStream) => {
        console.log(`📞 Incoming call from: ${peerId}`)
        this.handleIncomingCall(peerId, remoteStream)
      })
      
      // Set up signaling
      this.signaling.onSignal(({ from, signal }) => {
        console.log(`📡 Received signal from: ${from}`)
        this.peerClient.handleIncomingSignal(from, signal)
      })
      
      // Initialize signaling
      this.signaling.initialize()
      
      // Display local video
      if (this.localVideo && this.peerClient['localStream']) {
        this.localVideo.srcObject = this.peerClient['localStream']
      }
      
      console.log('✅ Video call initialized successfully')
      
    } catch (error) {
      console.error('❌ Failed to initialize video call:', error)
    }
  }

  // Make a call to another peer
  async makeCall(remotePeerId: string) {
    try {
      console.log(`📞 Making call to: ${remotePeerId}`)
      
      // Create connection as initiator
      const peer = await this.peerClient.createConnection(remotePeerId)
      
      // Handle connection established
      peer.on('connect', () => {
        console.log(`🔗 Connected to peer: ${remotePeerId}`)
      })
      
      // Handle remote stream
      peer.on('stream', (remoteStream) => {
        console.log('🎉 Received remote stream')
        this.remoteVideo.srcObject = remoteStream
      })
      
      console.log(`✅ Call initiated to: ${remotePeerId}`)
      
    } catch (error) {
      console.error(`❌ Failed to make call to ${remotePeerId}:`, error)
    }
  }

  // Handle incoming call
  private handleIncomingCall(peerId: string, remoteStream: MediaStream) {
    console.log(`📱 Handling incoming call from: ${peerId}`)
    
    // Display remote stream
    this.remoteVideo.srcObject = remoteStream
    
    // Show incoming call UI
    this.showIncomingCallUI(peerId)
  }

  // Accept an incoming call
  async acceptCall(peerId: string, offerSignal: any) {
    try {
      console.log(`📞 Accepting call from: ${peerId}`)
      
      // Accept the connection
      const peer = await this.peerClient.acceptConnection(peerId, offerSignal)
      
      // Handle connection established
      peer.on('connect', () => {
        console.log(`🔗 Connected to peer: ${peerId}`)
        this.hideIncomingCallUI()
      })
      
      // Handle remote stream
      peer.on('stream', (remoteStream) => {
        console.log('🎉 Received remote stream from accepted call')
        this.remoteVideo.srcObject = remoteStream
      })
      
      console.log(`✅ Call accepted from: ${peerId}`)
      
    } catch (error) {
      console.error(`❌ Failed to accept call from ${peerId}:`, error)
    }
  }

  // Reject an incoming call
  rejectCall(peerId: string) {
    console.log(`❌ Rejecting call from: ${peerId}`)
    
    // Clean up any pending connections
    this.peerClient.disconnectFromPeer(peerId)
    
    // Hide incoming call UI
    this.hideIncomingCallUI()
  }

  // End current call
  endCall() {
    console.log('📞 Ending call...')
    
    // Clear video elements
    this.remoteVideo.srcObject = null
    
    // Disconnect all peers
    this.peerClient.disconnect()
    
    console.log('✅ Call ended')
  }

  // Toggle video/audio
  async toggleVideo(enabled: boolean) {
    await this.peerClient.updateMediaConstraints(enabled, true)
    console.log(`📹 Video ${enabled ? 'enabled' : 'disabled'}`)
  }

  async toggleAudio(enabled: boolean) {
    await this.peerClient.updateMediaConstraints(true, enabled)
    console.log(`🎤 Audio ${enabled ? 'enabled' : 'disabled'}`)
  }

  // Check connection health
  async checkHealth() {
    const health = await this.peerClient.checkConnectionHealth()
    console.log('🔍 Connection health:', health)
    return health
  }

  // Test mobile connection
  async testMobileConnection() {
    const result = await this.peerClient.testMobileConnection()
    console.log('🧪 Mobile test result:', result)
    return result
  }

  // Get active connections
  getActiveConnections() {
    const connections = this.peerClient.getActiveConnections()
    console.log('🔗 Active connections:', connections)
    return connections
  }

  // Get my peer ID
  getMyPeerId(): string {
    return this.myPeerId
  }

  // UI helper methods
  private showIncomingCallUI(peerId: string) {
    // Show incoming call notification
    const incomingCallDiv = document.getElementById('incomingCall')
    if (incomingCallDiv) {
      incomingCallDiv.style.display = 'block'
      incomingCallDiv.innerHTML = `
        <h3>📞 Incoming Call</h3>
        <p>From: ${peerId}</p>
        <p>Your ID: ${this.myPeerId}</p>
        <button onclick="videoCall.acceptCall('${peerId}', offerSignal)">Accept</button>
        <button onclick="videoCall.rejectCall('${peerId}')">Reject</button>
      `
    }
  }

  private hideIncomingCallUI() {
    const incomingCallDiv = document.getElementById('incomingCall')
    if (incomingCallDiv) {
      incomingCallDiv.style.display = 'none'
    }
  }
}

// Usage example
export function initializeVideoCall() {
  const videoCall = new VideoCallExample()
  
  // Initialize when page loads
  videoCall.initialize()
  
  // Make global for button clicks
  (window as any).videoCall = videoCall
  
  // Also make peer ID available
  (window as any).myPeerId = videoCall.getMyPeerId()
  
  return videoCall
}

// Example HTML structure needed:
/*
<div id="videoContainer">
  <video id="localVideo" autoplay muted playsinline></video>
  <video id="remoteVideo" autoplay playsinline></video>
</div>

<div id="peerInfo">
  <p>Your Peer ID: <span id="myPeerId"></span></p>
  <input type="text" id="remotePeerId" placeholder="Enter remote peer ID">
</div>

<div id="controls">
  <button onclick="videoCall.makeCall(document.getElementById('remotePeerId').value)">Call</button>
  <button onclick="videoCall.toggleVideo(false)">Toggle Video</button>
  <button onclick="videoCall.toggleAudio(false)">Toggle Audio</button>
  <button onclick="videoCall.endCall()">End Call</button>
  <button onclick="videoCall.checkHealth()">Check Health</button>
</div>

<div id="incomingCall" style="display: none;">
  <!-- Incoming call UI will be inserted here -->
</div>

<script>
// Set your peer ID in the UI
document.getElementById('myPeerId').textContent = myPeerId;
</script>
*/
