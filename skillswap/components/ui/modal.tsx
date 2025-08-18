import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={cn(
        "relative bg-background rounded-lg shadow-lg border max-h-[90vh] overflow-auto m-4 w-full",
        sizeClasses[size]
      )}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-lg font-semibold">{title}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        {/* Content */}
        <div className={cn("p-6", title && "pt-4")}>
          {children}
        </div>
      </div>
    </div>
  )
}

interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  onConfirm?: () => void
  confirmText?: string
  cancelText?: string
}

export function AlertModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'info',
  onConfirm,
  confirmText = 'OK',
  cancelText = 'Cancel'
}: AlertModalProps) {
  const typeStyles = {
    success: 'text-green-600 bg-green-50 border-green-200',
    error: 'text-red-600 bg-red-50 border-red-200',
    warning: 'text-orange-600 bg-orange-50 border-orange-200',
    info: 'text-blue-600 bg-blue-50 border-blue-200'
  }

  const typeIcons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className={cn("p-4 rounded-lg border", typeStyles[type])}>
        <div className="flex items-start space-x-3">
          <span className="text-2xl">{typeIcons[type]}</span>
          <div className="flex-1">
            <h3 className="font-semibold mb-2">{title}</h3>
            <p className="text-sm">{message}</p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 mt-6">
        {onConfirm ? (
          <>
            <Button variant="outline" onClick={onClose}>
              {cancelText}
            </Button>
            <Button onClick={() => { onConfirm(); onClose(); }}>
              {confirmText}
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>
            {confirmText}
          </Button>
        )}
      </div>
    </Modal>
  )
}

interface SummaryModalProps {
  isOpen: boolean
  onClose: () => void
  session: {
    id: number
    skill_name: string
    created_at: string
    ended_at?: string
    mode: string
  }
  summary: {
    skill: string
    completedAt: string
    duration: number
    totalSteps: number
    aiSummary: string
  } | null
  loading: boolean
}

export function SummaryModal({ 
  isOpen, 
  onClose, 
  session,
  summary,
  loading
}: SummaryModalProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title={`${session.skill_name} - Learning Summary`}>
      <div className="space-y-6">
        {/* Session Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-800">Started:</span>
              <p className="text-blue-600">{formatDate(session.created_at)}</p>
            </div>
            {session.ended_at && (
              <div>
                <span className="font-medium text-blue-800">Completed:</span>
                <p className="text-blue-600">{formatDate(session.ended_at)}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-blue-800">Mode:</span>
              <p className="text-blue-600 capitalize">{session.mode}</p>
            </div>
            {summary && (
              <div>
                <span className="font-medium text-blue-800">Duration:</span>
                <p className="text-blue-600">{formatDuration(summary.duration)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">Loading summary...</span>
          </div>
        )}

        {/* Summary Content */}
        {!loading && summary && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">🎉 Achievement Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-green-700">Steps Completed:</span>
                  <p className="text-green-600">{summary.totalSteps}</p>
                </div>
                <div>
                  <span className="font-medium text-green-700">Time Invested:</span>
                  <p className="text-green-600">{formatDuration(summary.duration)}</p>
                </div>
              </div>
            </div>

            <div className="prose prose-sm max-w-none">
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold mb-3">📝 AI-Generated Summary</h3>
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {summary.aiSummary}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Summary Available */}
        {!loading && !summary && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">📄</div>
            <p className="text-gray-600">No summary available for this session.</p>
            <p className="text-sm text-gray-500 mt-1">
              This might be an incomplete session or an older session without summary data.
            </p>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}