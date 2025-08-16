import Peer from 'peerjs'

export class PeerClient {
  private peer: Peer | null = null
  private localStream: MediaStream | null = null

  async initialize(userId: string) {
    try {
      // Use default PeerJS cloud server with better error handling
      this.peer = new Peer(userId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        }
      })

      return new Promise<void>((resolve, reject) => {
        this.peer!.on('open', (id) => {
          console.log('Peer connection opened with ID:', id)
          resolve()
        })

        this.peer!.on('error', (error) => {
          console.error('Peer error:', error)
          // Try to provide more helpful error messages
          if (error.type === 'network') {
            console.error('Network error - check internet connection')
          } else if (error.type === 'peer-unavailable') {
            console.error('Peer unavailable - they may have disconnected')
          } else if (error.type === 'server-error') {
            console.error('Server error - trying to reconnect...')
            // Don't reject immediately on server errors, let timeout handle it
            return
          }
          reject(error)
        })

        this.peer!.on('disconnected', () => {
          console.log('Peer disconnected, attempting to reconnect...')
          this.peer!.reconnect()
        })

        // Add timeout for connection
        setTimeout(() => {
          if (this.peer && !this.peer.open) {
            reject(new Error('Peer connection timeout'))
          }
        }, 10000) // 10 second timeout
      })
    } catch (error) {
      console.error('Failed to initialize peer:', error)
      throw error
    }
  }

  async getLocalStream() {
    try {
      // Try to get both video and audio
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      console.log('Got video and audio stream')
      return this.localStream
    } catch (error) {
      console.error('Failed to get video/audio stream:', error)
      
      try {
        // Fallback: try audio only
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true
        })
        console.log('Got audio-only stream')
        return this.localStream
      } catch (audioError) {
        console.error('Failed to get audio stream:', audioError)
        throw new Error('Unable to access camera or microphone. Please check permissions.')
      }
    }
  }

  async callPeer(peerId: string) {
    if (!this.peer || !this.localStream) {
      throw new Error('Peer not initialized or no local stream')
    }

    const call = this.peer.call(peerId, this.localStream)
    
    return new Promise<MediaStream>((resolve, reject) => {
      call.on('stream', (remoteStream) => {
        resolve(remoteStream)
      })

      call.on('error', (error) => {
        reject(error)
      })
    })
  }

  onIncomingCall(callback: (remoteStream: MediaStream) => void) {
    if (!this.peer) return

    this.peer.on('call', (call) => {
      if (this.localStream) {
        call.answer(this.localStream)
        
        call.on('stream', (remoteStream) => {
          callback(remoteStream)
        })

        call.on('error', (error) => {
          console.error('Call error:', error)
        })
      }
    })
  }

  async initiateCallToPeer(remotePeerId: string): Promise<MediaStream> {
    if (!this.peer || !this.localStream) {
      throw new Error('Peer not initialized or no local stream')
    }

    return new Promise((resolve, reject) => {
      const call = this.peer!.call(remotePeerId, this.localStream!)
      
      call.on('stream', (remoteStream) => {
        console.log('Received remote stream from peer')
        resolve(remoteStream)
      })

      call.on('error', (error) => {
        console.error('Call error:', error)
        reject(error)
      })

      // Add timeout for call connection
      setTimeout(() => {
        reject(new Error('Call connection timeout'))
      }, 15000) // 15 second timeout
    })
  }

  disconnect() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    if (this.peer) {
      this.peer.destroy()
      this.peer = null
    }
  }
}

export const peerClient = new PeerClient()