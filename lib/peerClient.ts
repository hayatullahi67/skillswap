// import Peer from 'peerjs'

// export class PeerClient {
//   private peer: Peer | null = null
//   private localStream: MediaStream | null = null
//   private incomingCallHandlerSet: boolean = false

//   async initialize(userId: string) {
//     try {
//       // Always get local stream before peer connection
//       if (!this.localStream) {
//         await this.getLocalStream();
//       }
//       this.peer = new Peer(userId, {
//         debug: 1,
//         config: {
//           // iceServers: [
//           //   // { urls: 'stun:stun.l.google.com:19302' },
//           //   // { urls: 'stun:stun1.l.google.com:19302' },
//           //   // { urls: 'stun:stun2.l.google.com:19302' }
//           //   {
//           //     urls: "stun:stun.l.google.com:19302"
//           //   },
//           //   {
//           //     urls: "turn:openrelay.metered.ca:80",
//           //     username: "openrelayproject",
//           //     credential: "openrelayproject"
//           //   },
//           //   {
//           //     urls: "turn:openrelay.metered.ca:443",
//           //     username: "openrelayproject",
//           //     credential: "openrelayproject"
//           //   },
//           //   {
//           //     urls: "turn:openrelay.metered.ca:443?transport=tcp",
//           //     username: "openrelayproject",
//           //     credential: "openrelayproject"
//           //   }
            
//           // ]
//           iceServers: [
//             { urls: "stun:stun.l.google.com:19302" },
//             {
//               urls: "turn:openrelay.metered.ca:3478",
//               username: "openrelayproject",
//               credential: "openrelayproject"
//             },
//             {
//               urls: "turns:openrelay.metered.ca:5349",
//               username: "openrelayproject",
//               credential: "openrelayproject"
//             }
//           ]
          
//         }
//       });

//       this.incomingCallHandlerSet = false; // Reset handler flag on new peer

//       return new Promise<void>((resolve, reject) => {
//         this.peer!.on('open', (id) => {
//           console.log('Peer connection opened with ID:', id)
//           resolve()
//         });

//         this.peer!.on('error', (error) => {
//           console.error('Peer error:', error)
//           reject(error)
//         });

//         this.peer!.on('disconnected', () => {
//           console.log('Peer disconnected, attempting to reconnect...')
//           this.peer!.reconnect()
//         });

//         setTimeout(() => {
//           if (this.peer && !this.peer.open) {
//             reject(new Error('Peer connection timeout'))
//           }
//         }, 10000)
//       })
//     } catch (error) {
//       console.error('Failed to initialize peer:', error)
//       throw error
//     }
//   }

//   async getLocalStream() {
//     try {
//       this.localStream = await navigator.mediaDevices.getUserMedia({
//         // video: {
//         //   width: { ideal: 1280 },
//         //   height: { ideal: 720 },
//         //   frameRate: { ideal: 30 }
//         // }
//         video: {
//           facingMode: "user", // front camera
//           width: { ideal: 640 },
//           height: { ideal: 480 }
//         },
//         audio: {
//           echoCancellation: true,
//           noiseSuppression: true,
//           autoGainControl: true,
//           sampleRate: 44100
//         }
//       })
//       return this.localStream
//     } catch (error) {
//       try {
//         this.localStream = await navigator.mediaDevices.getUserMedia({
//           video: false,
//           audio: {
//             echoCancellation: true,
//             noiseSuppression: true,
//             autoGainControl: true,
//             sampleRate: 44100
//           }
//         })
//         return this.localStream
//       } catch (audioError) {
//         throw new Error('Unable to access camera or microphone. Please check permissions.')
//       }
//     }
//   }

//   onIncomingCall(callback: (remoteStream: MediaStream) => void) {
//     if (!this.peer) return

//     // Prevent multiple handlers
//     if (this.incomingCallHandlerSet) return;
//     this.incomingCallHandlerSet = true;

//     this.peer.on('call', async (call) => {
//       if (!this.localStream) {
//         try {
//           this.localStream = await this.getLocalStream();
//         } catch (err) {
//           console.error('❌ Could not get local stream for incoming call:', err);
//           return;
//         }
//       }
//       call.answer(this.localStream)
//       call.on('stream', (remoteStream) => {
//         callback(remoteStream)
//       })
//       call.on('error', (error) => {
//         console.error('Call error:', error)
//       })
//     })
//   }

//   async initiateCallToPeer(remotePeerId: string): Promise<MediaStream> {
//     if (!this.peer || !this.localStream) {
//       throw new Error('Peer not initialized or no local stream')
//     }
//     return new Promise((resolve, reject) => {
//       const call = this.peer!.call(remotePeerId, this.localStream!)
//       call.on('stream', (remoteStream) => {
//         resolve(remoteStream)
//       })
//       call.on('error', (error) => {
//         reject(error)
//       })
//       setTimeout(() => {
//         reject(new Error('Call connection timeout'))
//       }, 15000)
//     })
//   }

//   disconnect() {
//     if (this.localStream) {
//       this.localStream.getTracks().forEach(track => track.stop())
//       this.localStream = null
//     }
//     if (this.peer) {
//       this.peer.destroy()
//       this.peer = null
//     }
//   }
// }

// export const peerClient = new PeerClient()



// import Peer from 'peerjs'

// export class PeerClient {
//   private peer: Peer | null = null
//   private localStream: MediaStream | null = null
//   private incomingCallHandlerSet: boolean = false

//   // Check if WebRTC is supported
//   private isWebRTCSupported(): boolean {
//     // Check for basic WebRTC support
//     if (!window.RTCPeerConnection || !window.RTCSessionDescription || !window.RTCIceCandidate) {
//       return false;
//     }
    
//     // Check for getUserMedia support
//     if (!navigator.mediaDevices) {
//       return false;
//     }
    
//     // Modern browsers should have getUserMedia
//     return typeof navigator.mediaDevices.getUserMedia === 'function';
//   }

//   async initialize(userId: string) {
//     try {
//       // Check WebRTC support first
//       if (!this.isWebRTCSupported()) {
//         throw new Error('WebRTC is not supported in this browser')
//       }

//       // Always get local stream before peer connection
//       if (!this.localStream) {
//         await this.getLocalStream();
//       }
      
//       this.peer = new Peer(userId, {
//         debug: 1,
//         config: {
//           iceServers: [
//             { urls: "stun:stun.l.google.com:19302" },
//             { urls: "stun:stun1.l.google.com:19302" },
//             // Add more STUN servers for mobile reliability
//             { urls: "stun:stun.stunprotocol.org:3478" },
//             {
//               urls: "turn:openrelay.metered.ca:3478",
//               username: "openrelayproject",
//               credential: "openrelayproject"
//             },
//             {
//               urls: "turns:openrelay.metered.ca:5349",
//               username: "openrelayproject",
//               credential: "openrelayproject"
//             }
//           ],
//           // Mobile-specific configurations
//           iceCandidatePoolSize: 10,
//           bundlePolicy: 'balanced',
//           rtcpMuxPolicy: 'require'
//         }
//       });

//       this.incomingCallHandlerSet = false;

//       return new Promise<void>((resolve, reject) => {
//         this.peer!.on('open', (id) => {
//           console.log('Peer connection opened with ID:', id)
//           resolve()
//         });

//         this.peer!.on('error', (error) => {
//           console.error('Peer error:', error)
//           reject(error)
//         });

//         this.peer!.on('disconnected', () => {
//           console.log('Peer disconnected, attempting to reconnect...')
//           // Longer timeout for mobile networks
//           setTimeout(() => {
//             if (this.peer && !this.peer.destroyed) {
//               this.peer.reconnect()
//             }
//           }, 3000)
//         });

//         // Longer timeout for mobile connections
//         setTimeout(() => {
//           if (this.peer && !this.peer.open) {
//             reject(new Error('Peer connection timeout'))
//           }
//         }, 20000) // Increased from 10s to 20s
//       })
//     } catch (error) {
//       console.error('Failed to initialize peer:', error)
//       throw error
//     }
//   }

//   async getLocalStream() {
//     try {
//       // Check if we're on mobile
//       const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
//       // More conservative mobile settings
//       const videoConstraints = isMobile ? {
//         facingMode: "user",
//         width: { ideal: 480, max: 640 },
//         height: { ideal: 360, max: 480 },
//         frameRate: { ideal: 15, max: 30 } // Lower framerate for mobile
//       } : {
//         facingMode: "user",
//         width: { ideal: 640 },
//         height: { ideal: 480 }
//       }

//       this.localStream = await navigator.mediaDevices.getUserMedia({
//         video: videoConstraints,
//         audio: {
//           echoCancellation: true,
//           noiseSuppression: true,
//           autoGainControl: true,
//           // More conservative audio settings for mobile
//           sampleRate: isMobile ? 22050 : 44100,
//           channelCount: 1 // Mono for better mobile performance
//         }
//       })
//       return this.localStream
//     } catch (error) {
//       console.warn('Video access failed, trying audio only:', error)
//       try {
//         this.localStream = await navigator.mediaDevices.getUserMedia({
//           video: false,
//           audio: {
//             echoCancellation: true,
//             noiseSuppression: true,
//             autoGainControl: true,
//             sampleRate: 22050,
//             channelCount: 1
//           }
//         })
//         return this.localStream
//       } catch (audioError) {
//         console.error('Both video and audio access failed:', audioError)
//         throw new Error('Unable to access camera or microphone. Please check permissions and ensure you are using HTTPS.')
//       }
//     }
//   }

//   // Add method to check permissions before calling
//   async checkMediaPermissions(): Promise<{camera: boolean, microphone: boolean}> {
//     const result = { camera: false, microphone: false }
    
//     try {
//       if (navigator.permissions) {
//         const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName })
//         const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        
//         result.camera = cameraPermission.state === 'granted'
//         result.microphone = micPermission.state === 'granted'
//       }
//     } catch (error) {
//       console.warn('Could not check permissions:', error)
//     }
    
//     return result
//   }

//   onIncomingCall(callback: (remoteStream: MediaStream) => void) {
//     if (!this.peer) return

//     if (this.incomingCallHandlerSet) return;
//     this.incomingCallHandlerSet = true;

//     this.peer.on('call', async (call) => {
//       console.log('Incoming call received')
      
//       if (!this.localStream) {
//         try {
//           this.localStream = await this.getLocalStream();
//         } catch (err) {
//           console.error('❌ Could not get local stream for incoming call:', err);
//           return;
//         }
//       }
      
//       call.answer(this.localStream)
      
//       call.on('stream', (remoteStream) => {
//         console.log('Remote stream received')
//         callback(remoteStream)
//       })
      
//       call.on('error', (error) => {
//         console.error('Call error:', error)
//       })

//       call.on('close', () => {
//         console.log('Call closed')
//       })
//     })
//   }

//   async initiateCallToPeer(remotePeerId: string): Promise<MediaStream> {
//     if (!this.peer || !this.localStream) {
//       throw new Error('Peer not initialized or no local stream')
//     }
    
//     return new Promise((resolve, reject) => {
//       console.log('Initiating call to:', remotePeerId)
//       const call = this.peer!.call(remotePeerId, this.localStream!)
      
//       call.on('stream', (remoteStream) => {
//         console.log('Remote stream received in outgoing call')
//         resolve(remoteStream)
//       })
      
//       call.on('error', (error) => {
//         console.error('Outgoing call error:', error)
//         reject(error)
//       })

//       call.on('close', () => {
//         console.log('Outgoing call closed')
//       })
      
//       // Longer timeout for mobile
//       setTimeout(() => {
//         reject(new Error('Call connection timeout'))
//       }, 30000) // Increased from 15s to 30s
//     })
//   }

//   // Add method to handle mobile app lifecycle
//   handleVisibilityChange() {
//     if (document.hidden && this.localStream) {
//       // Pause video tracks when app goes to background
//       this.localStream.getVideoTracks().forEach(track => {
//         track.enabled = false
//       })
//     } else if (!document.hidden && this.localStream) {
//       // Resume video tracks when app comes to foreground
//       this.localStream.getVideoTracks().forEach(track => {
//         track.enabled = true
//       })
//     }
//   }

//   disconnect() {
//     if (this.localStream) {
//       this.localStream.getTracks().forEach(track => track.stop())
//       this.localStream = null
//     }
//     if (this.peer && !this.peer.destroyed) {
//       this.peer.destroy()
//       this.peer = null
//     }
//     this.incomingCallHandlerSet = false
//   }
// }

// export const peerClient = new PeerClient()





import Peer from 'peerjs'

export class PeerClient {
  private peer: Peer | null = null
  private localStream: MediaStream | null = null
  private incomingCallHandlerSet: boolean = false

  // Check if device is mobile
  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  // Check WebRTC support
  private isWebRTCSupported(): boolean {
    if (!window.RTCPeerConnection || !window.RTCSessionDescription || !window.RTCIceCandidate) {
      return false
    }
    
    if (!navigator.mediaDevices) {
      return false
    }
    
    return typeof navigator.mediaDevices.getUserMedia === 'function'
  }

  async initialize(userId: string) {
    try {
      if (!this.isWebRTCSupported()) {
        throw new Error('WebRTC is not supported in this browser')
      }

      // Check HTTPS requirement for mobile
      if (this.isMobile() && !window.isSecureContext) {
        throw new Error('HTTPS is required for mobile camera/microphone access')
      }

      // Get local stream before creating peer
      if (!this.localStream) {
        await this.getLocalStream()
      }
      
      this.peer = new Peer(userId, {
        debug: 0, // No debug logs for production
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun.stunprotocol.org:3478" },
            // Multiple TURN servers for mobile reliability
            {
              urls: "turn:openrelay.metered.ca:3478",
              username: "openrelayproject",
              credential: "openrelayproject"
            },
            {
              urls: "turns:openrelay.metered.ca:5349",
              username: "openrelayproject",
              credential: "openrelayproject"
            }
          ],
          // Mobile-optimized settings
          iceCandidatePoolSize: 10,
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require',
          iceTransportPolicy: 'all'
        }
      })

      this.incomingCallHandlerSet = false

      return new Promise<void>((resolve, reject) => {
        this.peer!.on('open', (id) => {
          resolve()
        })

        this.peer!.on('error', (error) => {
          reject(error)
        })

        this.peer!.on('disconnected', () => {
          // Auto-reconnect with delay for mobile networks
          setTimeout(() => {
            if (this.peer && !this.peer.destroyed) {
              this.peer.reconnect()
            }
          }, 5000)
        })

        // Longer timeout for mobile connections
        const timeout = this.isMobile() ? 30000 : 20000
        setTimeout(() => {
          if (this.peer && !this.peer.open) {
            reject(new Error('Connection timeout - please check your internet connection'))
          }
        }, timeout)
      })
    } catch (error) {
      throw error
    }
  }

  async getLocalStream() {
    const mobile = this.isMobile()
    
    try {
      // Mobile-optimized constraints
      const constraints: MediaStreamConstraints = mobile ? {
        video: {
          facingMode: "user",
          width: { ideal: 480, max: 640 },
          height: { ideal: 360, max: 480 },
          frameRate: { ideal: 15, max: 20 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 22050,
          channelCount: 1
        }
      } : {
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      }

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
      return this.localStream

    } catch (error) {
      // Fallback to audio only
      try {
        const audioOnlyConstraints: MediaStreamConstraints = {
          video: false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: mobile ? 22050 : 44100,
            channelCount: 1
          }
        }
        
        this.localStream = await navigator.mediaDevices.getUserMedia(audioOnlyConstraints)
        return this.localStream
        
      } catch (audioError) {
        let errorMessage = 'Unable to access camera or microphone. '
        if (!window.isSecureContext) {
          errorMessage += 'Please use HTTPS. '
        }
        errorMessage += 'Please check your permissions.'
        
        throw new Error(errorMessage)
      }
    }
  }

  // Check if user has granted media permissions
  async checkPermissions(): Promise<{ camera: boolean, microphone: boolean }> {
    const result = { camera: false, microphone: false }
    
    try {
      if (navigator.permissions) {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName })
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        
        result.camera = cameraPermission.state === 'granted'
        result.microphone = micPermission.state === 'granted'
      }
    } catch (error) {
      // Permissions API not supported, assume we need to request
    }
    
    return result
  }

  onIncomingCall(callback: (remoteStream: MediaStream) => void) {
    if (!this.peer || this.incomingCallHandlerSet) return
    
    this.incomingCallHandlerSet = true

    this.peer.on('call', async (call) => {
      if (!this.localStream) {
        try {
          this.localStream = await this.getLocalStream()
        } catch (err) {
          return // Can't answer call without local stream
        }
      }
      
      call.answer(this.localStream)
      
      call.on('stream', (remoteStream) => {
        callback(remoteStream)
      })
      
      call.on('error', (error) => {
        console.error('Call error:', error)
      })
    })
  }

  async initiateCallToPeer(remotePeerId: string): Promise<MediaStream> {
    if (!this.peer || !this.localStream) {
      throw new Error('Not ready to make calls. Please initialize first.')
    }
    
    return new Promise((resolve, reject) => {
      const call = this.peer!.call(remotePeerId, this.localStream!)
      
      call.on('stream', (remoteStream) => {
        resolve(remoteStream)
      })
      
      call.on('error', (error) => {
        reject(error)
      })
      
      // Longer timeout for mobile
      const timeout = this.isMobile() ? 45000 : 30000
      setTimeout(() => {
        reject(new Error('Call timeout - the other person may be unavailable'))
      }, timeout)
    })
  }

  // Get the peer ID
  getPeerId(): string | null {
    return this.peer?.id || null
  }

  // Check if peer is connected
  isConnected(): boolean {
    return this.peer?.open || false
  }

  // Check if local stream is available
  hasLocalStream(): boolean {
    return !!this.localStream
  }

  // Get local stream for UI
  // getLocalStream(): MediaStream | null {
  //   return this.localStream
  // }

  // Mute/unmute audio
  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled
      })
    }
  }

  // Enable/disable video
  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled
      })
    }
  }

  // Handle mobile app lifecycle (optional)
  handleVisibilityChange() {
    if (document.hidden && this.localStream) {
      // Pause video when app goes to background
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = false
      })
    } else if (!document.hidden && this.localStream) {
      // Resume video when app comes back
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = true
      })
    }
  }

  disconnect() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }
    
    if (this.peer && !this.peer.destroyed) {
      this.peer.destroy()
      this.peer = null
    }
    
    this.incomingCallHandlerSet = false
  }
}

export const peerClient = new PeerClient()