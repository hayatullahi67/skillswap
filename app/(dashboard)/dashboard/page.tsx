'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SummaryModal } from '@/components/ui/modal'
import { useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabaseClient'
import { formatDate, getInitials } from '@/lib/utils'
import { Video, BookOpen, UserPlus, ToggleLeft, ToggleRight, FileText } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const {
    profile,
    isOnline,
    recentSessions,
    fetchRecentSessions,
    updateOnlineStatus
  } = useAppStore()

  // Summary modal state
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [summaryModalOpen, setSummaryModalOpen] = useState(false)
  const [summaryData, setSummaryData] = useState<any>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    fetchRecentSessions()
  }, [fetchRecentSessions])

  const handleToggleOnline = async () => {
    await updateOnlineStatus(!isOnline)
  }

  const handleViewSessionSummary = async (session: any) => {
    setSelectedSession(session)
    setSummaryModalOpen(true)
    setSummaryLoading(true)
    setSummaryData(null)

    try {
      // Fetch session summary from session_resources
      const { data: resources, error } = await supabase
        .from('session_resources')
        .select('content')
        .eq('session_id', session.id)
        .eq('resource_type', 'summary')
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error fetching session summary:', error)
        return
      }

      if (resources && resources.length > 0) {
        const summaryContent = JSON.parse(resources[0].content)
        setSummaryData(summaryContent)
      }
    } catch (error) {
      console.error('Error parsing session summary:', error)
    } finally {
      setSummaryLoading(false)
    }
  }

  const closeSummaryModal = () => {
    setSummaryModalOpen(false)
    setSelectedSession(null)
    setSummaryData(null)
  }

  const quickActions = [
    {
      title: 'Live SkillSwap',
      description: 'Connect with peers for real-time learning',
      icon: Video,
      href: '/live',
      color: 'bg-blue-500'
    },
    {
      title: 'AI Tutorial',
      description: 'Learn with AI-powered personalized lessons',
      icon: BookOpen,
      href: '/ai-tutorial',
      color: 'bg-green-500'
    },
    {
      title: 'Onboarding',
      description: 'Get started with guided learning paths',
      icon: UserPlus,
      href: '/onboarding',
      color: 'bg-purple-500'
    }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back{profile ? `, ${profile.name}` : ''}!
          </h1>
          <p className="text-muted-foreground">
            Ready to learn something new today?
          </p>
        </div>

        {/* Profile Avatar */}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
            {profile ? getInitials(profile.name) : 'U'}
          </div>
        </div>
      </div>

      {/* Availability Toggle */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Availability Status</h3>
              <p className="text-sm text-muted-foreground">
                {isOnline ? 'You are available for live sessions' : 'You are currently offline'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleOnline}
              className="flex items-center space-x-2"
            >
              {isOnline ? (
                <ToggleRight className="h-6 w-6 text-green-500" />
              ) : (
                <ToggleLeft className="h-6 w-6 text-gray-400" />
              )}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickActions.map((action) => (
          <Card
            key={action.title}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push(action.href)}
          >
            <CardHeader>
              <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-4`}>
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-lg">{action.title}</CardTitle>
              <CardDescription>{action.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Get Started
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
          <CardDescription>Your latest learning activities</CardDescription>
        </CardHeader>
        <CardContent>
          {recentSessions.length > 0 ? (
            <div className="space-y-4">
              {recentSessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <h4 className="font-medium">{session.skill_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {session.mode === 'live' ? 'Live Session' : 'AI Tutorial'} • {session.started_at ? formatDate(session.started_at) : 'Session created'}
                    </p>
                    {session.ended_at && (
                      <p className="text-xs text-green-600 mt-1">
                        ✅ Completed on {formatDate(session.ended_at)}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewSessionSummary(session)}
                      className="flex items-center space-x-1"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Summary</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No sessions yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start your first learning session to see it here
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Modal */}
      {selectedSession && (
        <SummaryModal
          isOpen={summaryModalOpen}
          onClose={closeSummaryModal}
          session={selectedSession}
          summary={summaryData}
          loading={summaryLoading}
        />
      )}
    </div>
  )
}