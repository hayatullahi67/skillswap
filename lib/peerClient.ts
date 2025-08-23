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
      // Check if we're on mobile and log device info
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      
      console.log(`🚀 Initializing peer client for device: ${isMobile ? 'Mobile' : 'Desktop'}`);
      console.log(`📱 iOS: ${isIOS}, Safari: ${isSafari}`);
      
      // Check permissions first on mobile
      if (isMobile) {
        const permissions = await this.checkPermissions();
        console.log('🔐 Current permissions:', permissions);
        
        if (!permissions.video && !permissions.audio) {
          console.log('⚠️ No permissions granted, requesting...');
          const granted = await this.requestPermissions();
          if (!granted) {
            throw new Error('Camera/microphone permissions are required for video calls');
          }
        }
      }
      
      // Always get local stream before peer connection
      if (!this.localStream) {
        console.log('🎥 Getting local media stream...');
        await this.getLocalStream();
      }
      
      // Mobile-specific peer configuration
      const peerConfig = isMobile ? this.getMobilePeerConfig() : this.getDesktopPeerConfig();
      
      this.peer = new Peer(userId, peerConfig);
      this.incomingCallHandlerSet = false;

      return new Promise<void>((resolve, reject) => {
        this.peer!.on('open', (id) => {
          console.log('✅ Peer connection opened with ID:', id);
          resolve();
        });

        this.peer!.on('error', (error) => {
          console.error('❌ Peer error:', error);
          
          // Handle mobile-specific errors
          if (isMobile) {
            console.error('📱 Mobile: Peer connection error detected');
            reject(new Error('Connection failed. Please check your internet connection and try again.'));
          } else {
            reject(error);
          }
        });

        this.peer!.on('disconnected', () => {
          console.log('⚠️ Peer disconnected, attempting to reconnect...');
          this.peer!.reconnect();
        });

        // Longer timeout for mobile devices
        const timeout = isMobile ? 15000 : 10000;
        setTimeout(() => {
          if (this.peer && !this.peer.open) {
            reject(new Error(`Peer connection timeout after ${timeout}ms`));
          }
        }, timeout);
      });
    } catch (error) {
      console.error('❌ Failed to initialize peer:', error);
      throw error;
    }
  }

  private getMobilePeerConfig() {
    return {
      debug: 1,
      config: {
        iceServers: [
          // Primary STUN servers
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
          { urls: "stun:stun3.l.google.com:19302" },
          { urls: "stun:stun4.l.google.com:19302" },
          
          // TURN servers for mobile NAT traversal
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
        ],
        iceCandidatePoolSize: 10,
        iceTransportPolicy: 'all'
      }
    };
  }

  private getDesktopPeerConfig() {
    return {
      debug: 1,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject"
          },
          {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject"
          }
        ]
      }
    };
  }

  async getLocalStream() {
    try {
      // Better mobile detection
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      
      console.log(`📱 Device: ${isMobile ? 'Mobile' : 'Desktop'}, iOS: ${isIOS}, Safari: ${isSafari}`);
      
      // Mobile-optimized constraints
      const videoConstraints = isMobile ? {
        width: { ideal: 320, max: 640 }, // Much lower for mobile
        height: { ideal: 240, max: 480 },
        frameRate: { ideal: 10, max: 15 }, // Lower frame rate for mobile
        facingMode: 'user',
        aspectRatio: { ideal: 4/3 }
      } : {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      };

      // Audio constraints optimized for mobile
      const audioConstraints = isMobile ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 8000, // Much lower for mobile compatibility
        channelCount: 1 // Mono for mobile
      } : {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100
      };

      console.log('🎥 Requesting media with constraints:', { video: videoConstraints, audio: audioConstraints });

      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints
      });
      
      console.log('✅ Got video + audio stream');
      return this.localStream;
      
    } catch (error) {
      console.error('❌ Video + audio failed, trying video only:', error);
      
      try {
        // Try video only
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const videoConstraints = isMobile ? {
          width: { ideal: 320, max: 640 },
          height: { ideal: 240, max: 480 },
          frameRate: { ideal: 10, max: 15 },
          facingMode: 'user'
        } : {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        };

        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false
        });
        
        console.log('✅ Got video-only stream');
        return this.localStream;
        
      } catch (videoError) {
        console.error('❌ Video only failed, trying audio only:', videoError);
        
        try {
          // Fallback to audio only with mobile-optimized settings
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
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
          };

          this.localStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: audioConstraints
          });
          
          console.log('✅ Got audio-only stream');
          return this.localStream;
          
        } catch (audioError) {
          console.error('❌ All media access failed:', audioError);
          
          // Provide specific error messages for mobile
          let errorMessage: string;
          if (audioError instanceof Error) {
            errorMessage = audioError.message;
          } else if (typeof audioError === 'string') {
            errorMessage = audioError;
          } else {
            errorMessage = 'Unknown error occurred';
          }
          
          // Check if it's a permission issue
          if (errorMessage.includes('Permission') || errorMessage.includes('denied')) {
            throw new Error('Camera/microphone permission denied. Please allow access in your browser settings.');
          } else if (errorMessage.includes('NotFound') || errorMessage.includes('not found')) {
            throw new Error('No camera or microphone found on this device.');
          } else if (errorMessage.includes('NotAllowedError')) {
            throw new Error('Camera/microphone access blocked. Please check your browser permissions.');
          } else {
            throw new Error(`Unable to access camera or microphone: ${errorMessage}`);
          }
        }
      }
    }
  }

  onIncomingCall(callback: (remoteStream: MediaStream) => void) {
    if (!this.peer) {
      console.error('❌ Cannot set incoming call handler: Peer not initialized');
      return;
    }

    // Prevent multiple handlers
    if (this.incomingCallHandlerSet) {
      console.log('⚠️ Incoming call handler already set, skipping...');
      return;
    }
    
    this.incomingCallHandlerSet = true;
    console.log('🎯 Setting up incoming call handler...');

    this.peer.on('call', async (call) => {
      console.log('📞 ===== INCOMING CALL RECEIVED =====');
      console.log('📱 Call object:', call);
      console.log('🔍 Call metadata:', call.metadata);
      console.log('📊 Call options:', call.options);
      
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      
      console.log(`📱 Device info - Mobile: ${isMobile}, iOS: ${isIOS}, Safari: ${isSafari}`);
      
      try {
        // Check if we have a local stream
        if (!this.localStream) {
          console.log('🎥 No local stream, getting one for incoming call...');
          try {
            this.localStream = await this.getLocalStream();
            console.log('✅ Successfully got local stream for incoming call');
          } catch (err) {
            console.error('❌ Could not get local stream for incoming call:', err);
            
            // For mobile, try to get at least audio
            if (isMobile) {
              console.log('🔄 Trying audio-only fallback for mobile...');
              try {
                this.localStream = await navigator.mediaDevices.getUserMedia({
                  video: false,
                  audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 8000,
                    channelCount: 1
                  }
                });
                console.log('✅ Got audio-only stream for mobile fallback');
              } catch (audioErr) {
                console.error('❌ Audio-only fallback also failed:', audioErr);
                return;
              }
            } else {
              return;
            }
          }
        }
        
        // Verify the local stream has tracks
        if (this.localStream) {
          const videoTracks = this.localStream.getVideoTracks();
          const audioTracks = this.localStream.getAudioTracks();
          console.log(`📊 Local stream tracks - Video: ${videoTracks.length}, Audio: ${audioTracks.length}`);
          
          if (videoTracks.length > 0) {
            console.log('📹 Video track info:', {
              enabled: videoTracks[0].enabled,
              readyState: videoTracks[0].readyState,
              id: videoTracks[0].id
            });
          }
          
          if (audioTracks.length > 0) {
            console.log('🎤 Audio track info:', {
              enabled: audioTracks[0].enabled,
              readyState: audioTracks[0].readyState,
              id: audioTracks[0].id
            });
          }
        }
        
        console.log('📱 Answering incoming call...');
        console.log('📤 Sending local stream to peer...');
        
        // Answer the call with our local stream
        call.answer(this.localStream);
        console.log('✅ Call answered successfully');
        
        // Set up call event handlers
        call.on('stream', (remoteStream) => {
          console.log('🎉 ===== REMOTE STREAM RECEIVED =====');
          console.log('📊 Remote stream info:', {
            id: remoteStream.id,
            active: remoteStream.active,
            videoTracks: remoteStream.getVideoTracks().length,
            audioTracks: remoteStream.getAudioTracks().length
          });
          
          // Log remote track details
          remoteStream.getVideoTracks().forEach((track, index) => {
            console.log(`📹 Remote video track ${index}:`, {
              enabled: track.enabled,
              readyState: track.readyState,
              id: track.id
            });
          });
          
          remoteStream.getAudioTracks().forEach((track, index) => {
            console.log(`🎤 Remote audio track ${index}:`, {
              enabled: track.enabled,
              readyState: track.readyState,
              id: track.id
            });
          });
          
          console.log('✅ Calling callback with remote stream');
          callback(remoteStream);
        });
        
        call.on('error', (error) => {
          console.error('❌ ===== CALL ERROR =====');
          console.error('🚨 Error details:', error);
          
          // Mobile-specific error handling
          if (isMobile) {
            console.error('📱 Mobile: Call error detected');
          }
        });
        
        call.on('close', () => {
          console.log('📞 ===== CALL CLOSED =====');
          console.log('🔄 Call connection ended');
        });
        
        // Use the correct PeerJS event names
        call.on('iceStateChanged', (state) => {
          console.log('🧊 ICE state changed:', state);
        });
        
        // Log peer connection details for debugging
        if (call.peerConnection) {
          console.log('🔗 Peer connection details:', {
            iceConnectionState: call.peerConnection.iceConnectionState,
            iceGatheringState: call.peerConnection.iceGatheringState,
            connectionState: call.peerConnection.connectionState,
            signalingState: call.peerConnection.signalingState
          });
        }
        
      } catch (error) {
        console.error('❌ ===== ERROR IN INCOMING CALL HANDLER =====');
        console.error('🚨 Error:', error);
        
        // Try to recover by restarting the connection
        if (isMobile) {
          console.log('🔄 Mobile device: Attempting to recover from error...');
          try {
            await this.restartConnection();
            console.log('✅ Mobile recovery completed');
          } catch (recoveryError) {
            console.error('❌ Mobile recovery failed:', recoveryError);
          }
        }
      }
    });
    
    console.log('✅ Incoming call handler set up successfully');
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

  // Add method to check connection health for mobile
  async checkConnectionHealth(): Promise<{status: string, details: any}> {
    try {
      if (!this.peer) {
        return { status: 'disconnected', details: 'Peer not initialized' };
      }

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Check if peer is connected
      if (!this.peer.open) {
        return { status: 'connecting', details: 'Peer connection in progress' };
      }

      // Check local stream health
      if (!this.localStream) {
        return { status: 'no_stream', details: 'No local media stream' };
      }

      const videoTrack = this.localStream.getVideoTracks()[0];
      const audioTrack = this.localStream.getAudioTracks()[0];

      const health = {
        peerConnected: this.peer.open,
        hasVideo: !!videoTrack,
        hasAudio: !!audioTrack,
        videoEnabled: videoTrack?.enabled || false,
        audioEnabled: audioTrack?.enabled || false,
        deviceType: isMobile ? 'mobile' : 'desktop'
      };

      if (health.peerConnected && (health.hasVideo || health.hasAudio)) {
        return { status: 'healthy', details: health };
      } else if (health.peerConnected) {
        return { status: 'partial', details: health };
      } else {
        return { status: 'unhealthy', details: health };
      }
    } catch (error) {
      return { status: 'error', details: error };
    }
  }

  // Add method to restart connection for mobile issues
  async restartConnection(): Promise<void> {
    console.log('🔄 Restarting peer connection...');
    
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    this.incomingCallHandlerSet = false;
    
    // Wait a bit before reconnecting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Add method to handle mobile-specific media constraints
  async updateMediaConstraints(isVideoEnabled: boolean, isAudioEnabled: boolean): Promise<void> {
    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (this.localStream) {
        // Update video track
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = isVideoEnabled;
          console.log(`📹 Video ${isVideoEnabled ? 'enabled' : 'disabled'}`);
        }
        
        // Update audio track
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = isAudioEnabled;
          console.log(`🎤 Audio ${isAudioEnabled ? 'enabled' : 'disabled'}`);
        }
        
        // For mobile, we might need to adjust quality dynamically
        if (isMobile && videoTrack && isVideoEnabled) {
          try {
            await videoTrack.applyConstraints({
              width: { ideal: 320, max: 640 },
              height: { ideal: 240, max: 480 },
              frameRate: { ideal: 10, max: 15 }
            });
            console.log('📱 Applied mobile-optimized video constraints');
          } catch (error) {
            console.warn('⚠️ Could not apply mobile constraints:', error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error updating media constraints:', error);
    }
  }

  // Add simple test method for debugging
  async testMobileConnection(): Promise<string> {
    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      
      console.log('🧪 Testing mobile connection...');
      console.log(`📱 Device: ${isMobile ? 'Mobile' : 'Desktop'}`);
      console.log(`🍎 iOS: ${isIOS}`);
      console.log(`🌐 Safari: ${isSafari}`);
      
      // Check permissions
      const permissions = await this.checkPermissions();
      console.log('🔐 Permissions:', permissions);
      
      // Check if peer is connected
      if (this.peer) {
        console.log('🔗 Peer status:', {
          open: this.peer.open,
          id: this.peer.id,
          destroyed: this.peer.destroyed
        });
      } else {
        console.log('❌ Peer not initialized');
      }
      
      // Check local stream
      if (this.localStream) {
        const videoTracks = this.localStream.getVideoTracks();
        const audioTracks = this.localStream.getAudioTracks();
        console.log('📊 Local stream:', {
          videoTracks: videoTracks.length,
          audioTracks: audioTracks.length,
          active: this.localStream.active
        });
      } else {
        console.log('❌ No local stream');
      }
      
      return `Mobile test completed. Device: ${isMobile ? 'Mobile' : 'Desktop'}, iOS: ${isIOS}, Safari: ${isSafari}`;
      
    } catch (error) {
      console.error('❌ Mobile connection test failed:', error);
      return `Test failed: ${error}`;
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