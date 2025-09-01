'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Video, VideoOff, Phone, PhoneOff } from 'lucide-react'

interface ZoomMeetingProps {
  meetingId: string
  signature: string
  userName: string
  userEmail?: string
  onJoin?: () => void
  onLeave?: () => void
  onError?: (error: string) => void
}

export function ZoomMeeting({
  meetingId,
  signature,
  userName,
  userEmail = '',
  onJoin,
  onLeave,
  onError
}: ZoomMeetingProps) {
  const zoomRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isJoined, setIsJoined] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [zoomClient, setZoomClient] = useState<any>(null)

  useEffect(() => {
    let mounted = true

    const initializeZoom = async () => {
      try {
        console.log('🎯 Initializing Zoom Web SDK...')
        
        // Dynamically import Zoom SDK
        const { ZoomMtg } = await import('@zoomus/websdk')
        
        // Set Zoom Web SDK dependencies
        ZoomMtg.setZoomJSLib('https://source.zoom.us/2.18.0/lib', '/av')
        ZoomMtg.preLoadWasm()
        ZoomMtg.prepareWebSDK()

        if (!mounted) return

        // Initialize the client
        ZoomMtg.init({
          leaveUrl: window.location.origin,
          success: (success: any) => {
            console.log('✅ Zoom SDK initialized successfully')
            if (mounted) {
              setZoomClient(ZoomMtg)
              setIsLoading(false)
            }
          },
          error: (error: any) => {
            console.error('❌ Zoom SDK initialization failed:', error)
            if (mounted) {
              setIsLoading(false)
              onError?.('Failed to initialize Zoom SDK')
            }
          }
        })
      } catch (error) {
        console.error('❌ Error loading Zoom SDK:', error)
        if (mounted) {
          setIsLoading(false)
          onError?.('Failed to load Zoom SDK')
        }
      }
    }

    initializeZoom()

    return () => {
      mounted = false
    }
  }, [onError])

  const joinMeeting = async () => {
    if (!zoomClient) {
      console.error('❌ Zoom client not initialized')
      return
    }

    try {
      console.log('🚀 Joining Zoom meeting:', meetingId)
      setIsLoading(true)

      zoomClient.join({
        signature: signature,
        sdkKey: process.env.NEXT_PUBLIC_ZOOM_SDK_KEY,
        meetingNumber: meetingId,
        passWord: '', // Password if required
        userName: userName,
        userEmail: userEmail,
        success: (success: any) => {
          console.log('✅ Successfully joined Zoom meeting')
          setIsJoined(true)
          setIsLoading(false)
          onJoin?.()
        },
        error: (error: any) => {
          console.error('❌ Failed to join Zoom meeting:', error)
          setIsLoading(false)
          onError?.('Failed to join meeting')
        }
      })
    } catch (error) {
      console.error('❌ Error joining meeting:', error)
      setIsLoading(false)
      onError?.('Error joining meeting')
    }
  }

  const leaveMeeting = () => {
    if (!zoomClient) return

    try {
      console.log('👋 Leaving Zoom meeting')
      zoomClient.leave({
        success: () => {
          console.log('✅ Successfully left Zoom meeting')
          setIsJoined(false)
          onLeave?.()
        },
        error: (error: any) => {
          console.error('❌ Error leaving meeting:', error)
          setIsJoined(false)
          onLeave?.()
        }
      })
    } catch (error) {
      console.error('❌ Error leaving meeting:', error)
      setIsJoined(false)
      onLeave?.()
    }
  }

  const toggleMute = () => {
    if (!zoomClient || !isJoined) return

    try {
      if (isMuted) {
        zoomClient.unmute({
          success: () => {
            setIsMuted(false)
            console.log('🎤 Microphone unmuted')
          }
        })
      } else {
        zoomClient.mute({
          success: () => {
            setIsMuted(true)
            console.log('🔇 Microphone muted')
          }
        })
      }
    } catch (error) {
      console.error('❌ Error toggling mute:', error)
    }
  }

  const toggleVideo = () => {
    if (!zoomClient || !isJoined) return

    try {
      if (isVideoOn) {
        zoomClient.stopVideo({
          success: () => {
            setIsVideoOn(false)
            console.log('📹 Video stopped')
          }
        })
      } else {
        zoomClient.startVideo({
          success: () => {
            setIsVideoOn(true)
            console.log('📹 Video started')
          }
        })
      }
    } catch (error) {
      console.error('❌ Error toggling video:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Zoom...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Zoom Meeting Container */}
      <div 
        ref={zoomRef} 
        id="zmmtg-root"
        className="w-full h-64 bg-gray-900 relative"
      >
        {!isJoined && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center text-white">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Ready to Join</h3>
              <p className="text-gray-300 mb-4">Meeting ID: {meetingId}</p>
              <Button onClick={joinMeeting} className="bg-blue-600 hover:bg-blue-700">
                Join Meeting
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {isJoined && (
        <div className="p-4 bg-gray-50 border-t flex items-center justify-center space-x-4">
          <Button
            variant={isMuted ? "destructive" : "outline"}
            size="sm"
            onClick={toggleMute}
            className="flex items-center space-x-2"
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </Button>

          <Button
            variant={!isVideoOn ? "destructive" : "outline"}
            size="sm"
            onClick={toggleVideo}
            className="flex items-center space-x-2"
          >
            {!isVideoOn ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            <span>{!isVideoOn ? 'Start Video' : 'Stop Video'}</span>
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={leaveMeeting}
            className="flex items-center space-x-2"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Leave</span>
          </Button>
        </div>
      )}
    </div>
  )
}