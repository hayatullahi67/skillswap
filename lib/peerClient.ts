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
//       // Mobile-friendly constraints - start with lower resolution
//       const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
//       const videoConstraints = isMobile ? {
//         width: { ideal: 640, max: 1280 },
//         height: { ideal: 480, max: 720 },
//         frameRate: { ideal: 15, max: 30 },
//         facingMode: 'user' // Front camera for mobile
//       } : {
//         width: { ideal: 1280 },
//         height: { ideal: 720 },
//         frameRate: { ideal: 30 }
//       };

//       this.localStream = await navigator.mediaDevices.getUserMedia({
//         video: videoConstraints,
//         audio: {
//           echoCancellation: true,
//           noiseSuppression: true,
//           autoGainControl: true,
//           sampleRate: isMobile ? 16000 : 44100 // Lower sample rate for mobile
//         }
//       });
      
//       console.log('✅ Got video + audio stream');
//       return this.localStream;
      
//     } catch (error) {
//       console.error('❌ Video failed, trying audio only:', error);
//       try {
//         // Fallback to audio only
//         this.localStream = await navigator.mediaDevices.getUserMedia({
//           video: false,
//           audio: {
//             echoCancellation: true,
//             noiseSuppression: true,
//             autoGainControl: true,
//             sampleRate: 16000
//           }
//         });
        
//         console.log('✅ Got audio-only stream');
//         return this.localStream;
        
//       } catch (audioError) {
//   let errorMessage: string;
//   if (audioError instanceof Error) {
//     errorMessage = audioError.message;
//   } else if (typeof audioError === 'string') {
//     errorMessage = audioError;
//   } else {
//     errorMessage = 'Unknown error occurred';
//   }
//   throw new Error(`Unable to access camera or microphone: ${errorMessage}`);
// }
//     }
//   }

//   onIncomingCall(callback: (remoteStream: MediaStream) => void) {
//     if (!this.peer) return

//     if (this.incomingCallHandlerSet) return;
//     this.incomingCallHandlerSet = true;

//     this.peer.on('call', async (call) => {
//       console.log('📞 Incoming call received');
      
//       if (!this.localStream) {
//         try {
//           console.log('🎥 Getting local stream for incoming call...');
//           this.localStream = await this.getLocalStream();
//         } catch (err) {
//           console.error('❌ Could not get local stream for incoming call:', err);
//           return;
//         }
//       }
      
//       console.log('📱 Answering call...');
//       call.answer(this.localStream);
      
//       call.on('stream', (remoteStream) => {
//         console.log('✅ Received remote stream');
//         callback(remoteStream);
//       });
      
//       call.on('error', (error) => {
//         console.error('❌ Call error:', error);
//       });
      
//       call.on('close', () => {
//         console.log('📞 Call closed');
//       });
//     });
//   }

//   async initiateCallToPeer(remotePeerId: string): Promise<MediaStream> {
//     if (!this.peer || !this.localStream) {
//       throw new Error('Peer not initialized or no local stream')
//     }
    
//     console.log(`📞 Initiating call to ${remotePeerId}...`);
    
//     return new Promise((resolve, reject) => {
//       const call = this.peer!.call(remotePeerId, this.localStream!);
      
//       call.on('stream', (remoteStream) => {
//         console.log('✅ Received remote stream from outgoing call');
//         resolve(remoteStream);
//       });
      
//       call.on('error', (error) => {
//         console.error('❌ Outgoing call error:', error);
//         reject(error);
//       });
      
//       call.on('close', () => {
//         console.log('📞 Outgoing call closed');
//       });
      
//       setTimeout(() => {
//         console.error('⏰ Call connection timeout');
//         reject(new Error('Call connection timeout'));
//       }, 20000); // Increased timeout for mobile
//     });
//   }

//   // Add method to check if user has granted permissions
//   async checkPermissions(): Promise<{video: boolean, audio: boolean}> {
//     try {
//       const permissions = await Promise.all([
//         navigator.permissions.query({name: 'camera' as PermissionName}),
//         navigator.permissions.query({name: 'microphone' as PermissionName})
//       ]);
      
//       return {
//         video: permissions[0].state === 'granted',
//         audio: permissions[1].state === 'granted'
//       };
//     } catch (error) {
//       console.warn('Could not check permissions:', error);
//       return {video: false, audio: false};
//     }
//   }

//   // Add method to request permissions explicitly
//   async requestPermissions(): Promise<boolean> {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: true
//       });
      
//       // Stop the stream immediately - we just wanted to trigger permission request
//       stream.getTracks().forEach(track => track.stop());
//       return true;
//     } catch (error) {
//       console.error('Permission request failed:', error);
//       return false;
//     }
//   }

//   disconnect() {
//     if (this.localStream) {
//       this.localStream.getTracks().forEach(track => {
//         track.stop();
//         console.log(`🛑 Stopped ${track.kind} track`);
//       });
//       this.localStream = null;
//     }
//     if (this.peer) {
//       this.peer.destroy();
//       this.peer = null;
//     }
//   }
// }

// export const peerClient = new PeerClient()


import Peer from 'peerjs'

// Define proper typing for PeerJS connections
interface PeerConnections {
  [peerId: string]: Array<{
    peerConnection?: RTCPeerConnection;
    [key: string]: any;
  }>;
}

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
            // Multiple STUN servers for redundancy
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            
            // Primary TURN servers with multiple transports
            {
              urls: [
                "turn:openrelay.metered.ca:80",
                "turn:openrelay.metered.ca:80?transport=udp",
                "turn:openrelay.metered.ca:80?transport=tcp"
              ],
              username: "openrelayproject",
              credential: "openrelayproject"
            },
            {
              urls: [
                "turn:openrelay.metered.ca:443",
                "turn:openrelay.metered.ca:443?transport=udp", 
                "turn:openrelay.metered.ca:443?transport=tcp"
              ],
              username: "openrelayproject",
              credential: "openrelayproject"
            },
            
            // Additional reliable TURN servers for mobile data
            {
              urls: [
                "turn:relay.metered.ca:80",
                "turn:relay.metered.ca:443",
                "turn:relay.metered.ca:443?transport=tcp"
              ],
              username: "openrelayproject", 
              credential: "openrelayproject"
            },
            
            // Twilio STUN (very reliable for mobile)
            { urls: "stun:global.stun.twilio.com:3478" }
          ],
          
          // Extended ICE gathering
          iceCandidatePoolSize: 10,
          
          // Bundle policy for better mobile performance  
          bundlePolicy: 'max-bundle',
          
          // RTP settings for mobile networks
          rtcpMuxPolicy: 'require'
        }
      });

      this.incomingCallHandlerSet = false;

      return this.setupPeerEvents();
    } catch (error) {
      console.error('Failed to initialize peer:', error)
      throw error
    }
  }

  // Add method to detect network type
  detectNetworkType(): string {
    // @ts-ignore - navigator.connection is not in standard types but exists on mobile
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      console.log(`📶 Network: ${connection.effectiveType || connection.type} - ${connection.downlink || 'unknown'} Mbps`);
      return connection.effectiveType || connection.type || 'unknown';
    }
    
    return 'unknown';
  }

  // Enhanced initialization with network detection
  async initializeWithNetworkDetection(userId: string) {
    try {
      // Always get local stream before peer connection
      if (!this.localStream) {
        await this.getLocalStream();
      }

      const networkType = this.detectNetworkType();
      console.log(`🌐 Detected network type: ${networkType}`);
      
      // Adjust configuration based on network
      const isMobileData = networkType === '3g' || networkType === '4g' || networkType === '5g' || networkType === 'slow-2g' || networkType === '2g';
      
      if (isMobileData) {
        console.log('📱 Mobile data detected - using optimized config with forced TURN');
        // Force TURN usage for mobile data
        this.peer = new Peer(userId, {
          debug: 1,
          config: {
            iceServers: [
              // Keep one STUN for fallback
              { urls: "stun:stun.l.google.com:19302" },
              
              // Multiple TURN servers for reliability
              {
                urls: [
                  "turn:openrelay.metered.ca:80",
                  "turn:openrelay.metered.ca:80?transport=tcp",
                  "turn:openrelay.metered.ca:443",
                  "turn:openrelay.metered.ca:443?transport=tcp"
                ],
                username: "openrelayproject",
                credential: "openrelayproject"
              },
              {
                urls: [
                  "turn:relay.metered.ca:80",
                  "turn:relay.metered.ca:443",
                  "turn:relay.metered.ca:443?transport=tcp"
                ],
                username: "openrelayproject",
                credential: "openrelayproject"
              }
            ],
            iceTransportPolicy: 'relay', // Force TURN for mobile data
            iceCandidatePoolSize: 15,
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
          }
        });
      } else {
        console.log('🏠 WiFi/Ethernet detected - using standard config');
        // Use standard configuration for WiFi/Ethernet
        this.peer = new Peer(userId, {
          debug: 1,
          config: {
            iceServers: [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun1.l.google.com:19302" },
              { urls: "stun:stun2.l.google.com:19302" },
              
              {
                urls: [
                  "turn:openrelay.metered.ca:80",
                  "turn:openrelay.metered.ca:443",
                  "turn:openrelay.metered.ca:443?transport=tcp"
                ],
                username: "openrelayproject",
                credential: "openrelayproject"
              },
              
              { urls: "stun:global.stun.twilio.com:3478" }
            ],
            iceCandidatePoolSize: 10,
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
          }
        });
      }
      
      this.incomingCallHandlerSet = false;
      return this.setupPeerEvents();

    } catch (error) {
      console.error('Failed to initialize peer with network detection:', error)
      throw error
    }
  }

  private setupPeerEvents(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.peer!.on('open', (id) => {
        console.log('✅ Peer connection opened with ID:', id)
        resolve()
      });

      this.peer!.on('error', (error) => {
        console.error('❌ Peer error:', error)
        reject(error)
      });

      this.peer!.on('disconnected', () => {
        console.log('🔄 Peer disconnected, attempting to reconnect...')
        this.peer!.reconnect()
      });

      // Longer timeout for mobile networks
      setTimeout(() => {
        if (this.peer && !this.peer.open) {
          reject(new Error('Peer connection timeout'))
        }
      }, 20000) // 20 seconds for mobile data
    });
  }

  async getLocalStream() {
    try {
      // Mobile-friendly constraints - start with lower resolution
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const networkType = this.detectNetworkType();
      const isSlowNetwork = networkType === '2g' || networkType === 'slow-2g' || networkType === '3g';
      
      const videoConstraints = isMobile || isSlowNetwork ? {
        width: { ideal: 480, max: 640 },
        height: { ideal: 360, max: 480 },
        frameRate: { ideal: 15, max: 24 },
        facingMode: 'user' // Front camera for mobile
      } : {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30 }
      };

      const audioConstraints = isSlowNetwork ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000, // Lower for slow networks
        channelCount: 1 // Mono for bandwidth saving
      } : {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: isMobile ? 22050 : 44100
      };

      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints
      });
      
      console.log('✅ Got video + audio stream');
      console.log(`📹 Video track settings:`, this.localStream.getVideoTracks()[0]?.getSettings());
      console.log(`🎵 Audio track settings:`, this.localStream.getAudioTracks()[0]?.getSettings());
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
            sampleRate: 16000,
            channelCount: 1
          }
        });
        
        console.log('✅ Got audio-only stream');
        return this.localStream;
        
      } catch (audioError) {
        console.error('❌ Both video and audio failed:', audioError);
        const errorMessage = audioError instanceof Error ? audioError.message : 'Unknown error';
        throw new Error(`Unable to access camera or microphone: ${errorMessage}`);
      }
    }
  }

  onIncomingCall(callback: (remoteStream: MediaStream) => void) {
    if (!this.peer) return

    if (this.incomingCallHandlerSet) return;
    this.incomingCallHandlerSet = true;

    this.peer.on('call', async (call) => {
      console.log('📞 Incoming call received from:', call.peer);
      
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

      // Monitor ICE connection for incoming calls
      if (call.peerConnection) {
        this.setupICEMonitoring(call.peerConnection, `Incoming call from ${call.peer}`);
      }
      
      call.on('stream', (remoteStream) => {
        console.log('✅ Received remote stream from incoming call');
        console.log(`📊 Remote stream tracks: ${remoteStream.getTracks().length}`);
        callback(remoteStream);
      });
      
      call.on('error', (error) => {
        console.error('❌ Incoming call error:', error);
      });
      
      call.on('close', () => {
        console.log('📞 Incoming call closed');
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
      
      // Monitor ICE connection state for debugging
      if (call.peerConnection) {
        this.setupICEMonitoring(call.peerConnection, `Outgoing call to ${remotePeerId}`);
      }
      
      call.on('stream', (remoteStream) => {
        console.log('✅ Received remote stream from outgoing call');
        console.log(`📊 Remote stream tracks: ${remoteStream.getTracks().length}`);
        resolve(remoteStream);
      });
      
      call.on('error', (error) => {
        console.error('❌ Outgoing call error:', error);
        reject(error);
      });
      
      call.on('close', () => {
        console.log('📞 Outgoing call closed');
      });
      
      // Longer timeout for mobile data connections
      const networkType = this.detectNetworkType();
      const isMobileData = networkType === '3g' || networkType === '4g' || networkType === '5g';
      const timeout = isMobileData ? 45000 : 30000; // 45s for mobile, 30s for others
      
      setTimeout(() => {
        console.error('⏰ Call connection timeout');
        reject(new Error('Call connection timeout - mobile data may need longer or check TURN servers'));
      }, timeout);
    });
  }

  // Setup comprehensive ICE monitoring
  private setupICEMonitoring(peerConnection: RTCPeerConnection, callIdentifier: string) {
    console.log(`🔧 Setting up ICE monitoring for: ${callIdentifier}`);
    
    peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection.iceConnectionState;
      console.log(`🧊 [${callIdentifier}] ICE Connection State: ${state}`);
      
      switch (state) {
        case 'checking':
          console.log('🔍 ICE candidates are being checked...');
          break;
        case 'connected':
          console.log('✅ ICE connection established!');
          break;
        case 'completed':
          console.log('✅ ICE connection completed!');
          break;
        case 'failed':
          console.error('❌ ICE connection failed - NAT traversal issue or TURN servers not working');
          break;
        case 'disconnected':
          console.warn('⚠️ ICE connection disconnected - may be temporary');
          break;
        case 'closed':
          console.log('🔒 ICE connection closed');
          break;
      }
    };
    
    peerConnection.onicegatheringstatechange = () => {
      console.log(`🔍 [${callIdentifier}] ICE Gathering State: ${peerConnection.iceGatheringState}`);
    };
    
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = event.candidate;
        console.log(`🎯 [${callIdentifier}] ICE Candidate: ${candidate.type} - ${candidate.address || 'N/A'}:${candidate.port || 'N/A'} (${candidate.protocol})`);
        
        // Log candidate types for debugging
        if (candidate.type === 'host') {
          console.log('  └── 🏠 Host candidate (local network)');
        } else if (candidate.type === 'srflx') {
          console.log('  └── 🌐 Server reflexive candidate (STUN)');
        } else if (candidate.type === 'relay') {
          console.log('  └── 🔄 Relay candidate (TURN) - Good for mobile data!');
        }
      } else {
        console.log(`✅ [${callIdentifier}] ICE gathering complete`);
      }
    };

    // Monitor connection quality
    peerConnection.onconnectionstatechange = () => {
      console.log(`📶 [${callIdentifier}] Connection State: ${peerConnection.connectionState}`);
    };
  }

  // Method to check if user has granted permissions
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

  // Method to request permissions explicitly
  async requestPermissions(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      // Stop the stream immediately - we just wanted to trigger permission request
      stream.getTracks().forEach(track => track.stop());
      console.log('✅ Permissions granted');
      return true;
    } catch (error) {
      console.error('❌ Permission request failed:', error);
      return false;
    }
  }

  // Method to get current connection stats
  async getConnectionStats(): Promise<void> {
    if (!this.peer || !this.peer.connections) {
      console.log('No active peer connections');
      return;
    }

    // Use the proper interface for type safety
    const connections = this.peer.connections as PeerConnections;
    
    Object.keys(connections).forEach(async (peerId: string) => {
      const peerConnections = connections[peerId];
      peerConnections.forEach(async (conn) => {
        if (conn.peerConnection) {
          try {
            const stats = await conn.peerConnection.getStats();
            stats.forEach((report: any) => {
              if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                console.log(`📊 Active connection to ${peerId}:`, {
                  localCandidateType: report.localCandidateType,
                  remoteCandidateType: report.remoteCandidateType,
                  bytesSent: report.bytesSent,
                  bytesReceived: report.bytesReceived,
                  currentRoundTripTime: report.currentRoundTripTime
                });
              }
            });
          } catch (error) {
            console.error('Failed to get connection stats:', error);
          }
        }
      });
    });
  }

  // Force reconnection with network-aware settings
  async forceReconnect(userId: string) {
    console.log('🔄 Force reconnecting with network detection...');
    this.disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a second
    return this.initializeWithNetworkDetection(userId);
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
    this.incomingCallHandlerSet = false;
  }

  // Utility method to check if currently on mobile data
  isMobileDataConnection(): boolean {
    const networkType = this.detectNetworkType();
    return ['2g', 'slow-2g', '3g', '4g', '5g'].includes(networkType);
  }

  // Get current peer ID
  getCurrentPeerId(): string | null {
    return this.peer?.id || null;
  }

  // Check if peer is connected
  isConnected(): boolean {
    return this.peer?.open || false;
  }
}

export const peerClient = new PeerClient()