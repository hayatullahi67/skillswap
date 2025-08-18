'use client'

import { Phone, PhoneOff, PhoneIncoming } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface IncomingCallOverlayProps {
  learnerName: string
  skillName: string
  onAccept: () => void
  onReject: () => void
}

export function IncomingCallOverlay({ 
  learnerName, 
  skillName, 
  onAccept, 
  onReject 
}: IncomingCallOverlayProps) {
  // Add console log to verify component is rendering
  console.log('🔔 IncomingCallOverlay rendering for:', learnerName, skillName)
  
  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4"
      style={{ 
        zIndex: 99999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      <Card className="border-blue-500 bg-white shadow-2xl animate-pulse w-full max-w-sm mx-auto">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-4 rounded-full">
              <PhoneIncoming className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-xl text-blue-800">Incoming Call</CardTitle>
          <CardDescription className="text-blue-600 text-base">
            <strong>{learnerName}</strong> wants to learn <strong>{skillName}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col space-y-3">
            <Button
              onClick={() => {
                console.log('🔔 Accept button clicked')
                onAccept()
              }}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white w-full py-3 text-lg"
            >
              <Phone className="h-5 w-5 mr-2" />
              Accept Call
            </Button>
            <Button
              onClick={() => {
                console.log('🔔 Reject button clicked')
                onReject()
              }}
              variant="destructive"
              size="lg"
              className="w-full py-3 text-lg"
            >
              <PhoneOff className="h-5 w-5 mr-2" />
              Decline Call
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}