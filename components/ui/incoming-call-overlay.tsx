'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Phone, PhoneOff } from 'lucide-react'

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
  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 animate-pulse">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">📞 Incoming Call</CardTitle>
          <CardDescription>
            {learnerName} wants to learn {skillName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-3">
            <Button 
              onClick={onAccept} 
              className="flex-1 bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <Phone className="h-4 w-4 mr-2" />
              Accept
            </Button>
            <Button 
              onClick={onReject} 
              variant="destructive" 
              className="flex-1"
              size="lg"
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}