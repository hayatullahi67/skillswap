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

      // Connect to Socket.IO server with better error handling
      this.socket = io({
        path: '/api/socket',
        transports: ['polling', 'websocket'],
        upgrade: true,
        rememberUpgrade: true,
        timeout: 20000,
        forceNew: true,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: 5,
        randomizationFactor: 0.5
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
        
        // Don't reject immediately, allow retries
        if (error.message.includes('server error')) {
          console.log('🔄 Server error detected, will retry connection...')
          // Let the reconnection logic handle this
        } else {
          reject(new Error(`Socket.IO connection failed: ${error.message}`))
        }
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

      // Add reconnection handlers
      this.socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts')
        this.isConnected = true
        if (!this.socket?.id) {
          // If we don't have a resolved promise yet, resolve now
          resolve()
        }
      })

      this.socket.on('reconnect_error', (error) => {
        console.error('❌ Socket.IO reconnection error:', error)
      })

      this.socket.on('reconnect_failed', () => {
        console.error('❌ Socket.IO reconnection failed after all attempts')
        this.isConnected = false
        reject(new Error('Socket.IO connection failed after all reconnection attempts'))
      })

      // Set connection timeout with more lenient timing
      setTimeout(() => {
        if (!this.isConnected && this.socket && !this.socket.connected) {
          console.error('❌ Socket.IO connection timeout after 15 seconds')
          reject(new Error('Socket.IO connection timeout - server may be unavailable'))
        }
      }, 15000)
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