// Socket.IO signaling for WebRTC
import { io, Socket } from 'socket.io-client'

export class SocketSignaling {
  private socket: Socket | null = null
  private myPeerId: string
  private onSignalCallback?: (from: string, data: any) => void
  private onCallEndCallback?: (from: string) => void
  private isConnected: boolean = false

  constructor(myPeerId: string) {
    this.myPeerId = myPeerId
  }

  // Initialize Socket.IO connection
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🚀 Initializing Socket.IO signaling for peer:', this.myPeerId)

      // Connect to Socket.IO server
      this.socket = io({
        path: '/api/socket',
        transports: ['polling', 'websocket'],
        upgrade: true,
        rememberUpgrade: true,
        timeout: 20000,
        forceNew: true
      })

      this.socket.on('connect', () => {
        console.log('✅ Socket.IO connected:', this.socket?.id)
        this.isConnected = true

        // Register this peer with the server
        this.socket?.emit('register', this.myPeerId)
      })

      this.socket.on('registered', ({ peerId, socketId }) => {
        console.log('✅ Peer registered successfully:', { peerId, socketId })
        resolve()
      })

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket.IO connection error:', error)
        this.isConnected = false
        reject(error)
      })

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Socket.IO disconnected:', reason)
        this.isConnected = false
      })

      this.socket.on('error', (error) => {
        console.error('❌ Socket.IO error:', error)
      })

      // Handle incoming signals
      this.socket.on('signal', ({ from, data }) => {
        console.log('📡 Received signal via Socket.IO:', { from, type: data.type || 'unknown' })
        
        if (this.onSignalCallback) {
          this.onSignalCallback(from, data)
        }
      })

      // Handle call end signals
      this.socket.on('call-ended', ({ from }) => {
        console.log('📞 Received call-ended via Socket.IO from:', from)
        
        if (this.onCallEndCallback) {
          this.onCallEndCallback(from)
        }
      })

      // Set connection timeout
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('Socket.IO connection timeout'))
        }
      }, 10000)
    })
  }

  // Send signal to another peer
  sendSignal(to: string, data: any): void {
    if (!this.socket || !this.isConnected) {
      console.error('❌ Cannot send signal: Socket.IO not connected')
      return
    }

    console.log('📡 Sending signal via Socket.IO:', { 
      from: this.myPeerId, 
      to, 
      type: data.type || 'unknown' 
    })

    this.socket.emit('signal', {
      from: this.myPeerId,
      to: to,
      data: data
    })
  }

  // Send call end signal
  sendCallEnded(to: string, sessionId?: string): void {
    if (!this.socket || !this.isConnected) {
      console.error('❌ Cannot send call-ended: Socket.IO not connected')
      return
    }

    console.log('📞 Sending call-ended via Socket.IO:', { from: this.myPeerId, to, sessionId })

    this.socket.emit('call-ended', {
      from: this.myPeerId,
      to: to,
      sessionId: sessionId
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
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true
  }

  // Get connection info
  getConnectionInfo(): { peerId: string, socketId?: string, connected: boolean } {
    return {
      peerId: this.myPeerId,
      socketId: this.socket?.id,
      connected: this.isConnected
    }
  }

  // Disconnect
  disconnect(): void {
    console.log('🔌 Disconnecting Socket.IO signaling')
    
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    
    this.isConnected = false
    this.onSignalCallback = undefined
    this.onCallEndCallback = undefined
  }
}