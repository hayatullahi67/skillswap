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
//           iceServers: [
//             // { urls: 'stun:stun.l.google.com:19302' },
//             // { urls: 'stun:stun1.l.google.com:19302' },
//             // { urls: 'stun:stun2.l.google.com:19302' }
//             {
//               urls: "stun:stun.l.google.com:19302"
//             },
//             {
//               urls: "turn:openrelay.metered.ca:80",
//               username: "openrelayproject",
//               credential: "openrelayproject"
//             },
//             {
//               urls: "turn:openrelay.metered.ca:443",
//               username: "openrelayproject",
//               credential: "openrelayproject"
//             },
//             {
//               urls: "turn:openrelay.metered.ca:443?transport=tcp",
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
//         video: {
//           width: { ideal: 1280 },
//           height: { ideal: 720 },
//           frameRate: { ideal: 30 }
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



import Peer from 'peerjs'

export class PeerClient {
  private peer: Peer | null = null
  private localStream: MediaStream | null = null
  private incomingCallHandlerSet: boolean = false

  async initialize(userId: string) {
    try {
      // Always get local stream before peer connection
      if (!this.localStream) {
        await this.getLocalStream();
      }
      this.peer = new Peer(userId, {
        debug: 1,
        config: {
          iceServers: [
            {
              urls: "stun:stun.l.google.com:19302"
            },
            {
              urls: "turn:openrelay.metered.ca:80",
              username: "openrelayproject",
              credential: "openrelayproject"
            },
            {
              urls: "turn:openrelay.metered.ca:443",
              username: "openrelayproject",
              credential: "openrelayproject"
            },
            {
              urls: "turn:openrelay.metered.ca:443?transport=tcp",
              username: "openrelayproject",
              credential: "openrelayproject"
            }
          ]
        }
      });

      this.incomingCallHandlerSet = false;

      return new Promise<void>((resolve, reject) => {
        this.peer!.on('open', (id) => {
          console.log('Peer connection opened with ID:', id)
          resolve()
        });

        this.peer!.on('error', (error) => {
          console.error('Peer error:', error)
          reject(error)
        });

        this.peer!.on('disconnected', () => {
          console.log('Peer disconnected, attempting to reconnect...')
          this.peer!.reconnect()
        });

        setTimeout(() => {
          if (this.peer && !this.peer.open) {
            reject(new Error('Peer connection timeout'))
          }
        }, 10000)
      })
    } catch (error) {
      console.error('Failed to initialize peer:', error)
      throw error
    }
  }

  async getLocalStream() {
    try {
      // Mobile-friendly constraints - start with lower resolution
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      const videoConstraints = isMobile ? {
        width: { ideal: 640, max: 1280 },
        height: { ideal: 480, max: 720 },
        frameRate: { ideal: 15, max: 30 },
        facingMode: 'user' // Front camera for mobile
      } : {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      };

      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: isMobile ? 16000 : 44100 // Lower sample rate for mobile
        }
      });
      
      console.log('✅ Got video + audio stream');
      return this.localStream;
      
    } catch (error) {
      console.error('❌ Video failed, trying audio only:', error);
      try {
        // Fallback to audio only
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000
          }
        });
        
        console.log('✅ Got audio-only stream');
        return this.localStream;
        
      } catch (audioError) {
  let errorMessage: string;
  if (audioError instanceof Error) {
    errorMessage = audioError.message;
  } else if (typeof audioError === 'string') {
    errorMessage = audioError;
  } else {
    errorMessage = 'Unknown error occurred';
  }
  throw new Error(`Unable to access camera or microphone: ${errorMessage}`);
}
    }
  }

  onIncomingCall(callback: (remoteStream: MediaStream) => void) {
    if (!this.peer) return

    if (this.incomingCallHandlerSet) return;
    this.incomingCallHandlerSet = true;

    this.peer.on('call', async (call) => {
      console.log('📞 Incoming call received');
      
      if (!this.localStream) {
        try {
          console.log('🎥 Getting local stream for incoming call...');
          this.localStream = await this.getLocalStream();
        } catch (err) {
          console.error('❌ Could not get local stream for incoming call:', err);
          return;
        }
      }
      
      console.log('📱 Answering call...');
      call.answer(this.localStream);
      
      call.on('stream', (remoteStream) => {
        console.log('✅ Received remote stream');
        callback(remoteStream);
      });
      
      call.on('error', (error) => {
        console.error('❌ Call error:', error);
      });
      
      call.on('close', () => {
        console.log('📞 Call closed');
      });
    });
  }

  async initiateCallToPeer(remotePeerId: string): Promise<MediaStream> {
    if (!this.peer || !this.localStream) {
      throw new Error('Peer not initialized or no local stream')
    }
    
    console.log(`📞 Initiating call to ${remotePeerId}...`);
    
    return new Promise((resolve, reject) => {
      const call = this.peer!.call(remotePeerId, this.localStream!);
      
      call.on('stream', (remoteStream) => {
        console.log('✅ Received remote stream from outgoing call');
        resolve(remoteStream);
      });
      
      call.on('error', (error) => {
        console.error('❌ Outgoing call error:', error);
        reject(error);
      });
      
      call.on('close', () => {
        console.log('📞 Outgoing call closed');
      });
      
      setTimeout(() => {
        console.error('⏰ Call connection timeout');
        reject(new Error('Call connection timeout'));
      }, 20000); // Increased timeout for mobile
    });
  }

  // Add method to check if user has granted permissions
  async checkPermissions(): Promise<{video: boolean, audio: boolean}> {
    try {
      const permissions = await Promise.all([
        navigator.permissions.query({name: 'camera' as PermissionName}),
        navigator.permissions.query({name: 'microphone' as PermissionName})
      ]);
      
      return {
        video: permissions[0].state === 'granted',
        audio: permissions[1].state === 'granted'
      };
    } catch (error) {
      console.warn('Could not check permissions:', error);
      return {video: false, audio: false};
    }
  }

  // Add method to request permissions explicitly
  async requestPermissions(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      // Stop the stream immediately - we just wanted to trigger permission request
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  disconnect() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log(`🛑 Stopped ${track.kind} track`);
      });
      this.localStream = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}

export const peerClient = new PeerClient()