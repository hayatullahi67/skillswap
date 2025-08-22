'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SummaryModal } from '@/components/ui/modal'
import { useAppStore } from '@/lib/store'
import { supabase, Session, SessionResource } from '@/lib/supabaseClient'
import { formatDate } from '@/lib/utils'
import { Download, Eye, FileText, HelpCircle, BookOpen, ScrollText } from 'lucide-react'

type SessionWithResources = Session & {
  resources: SessionResource[]
}

export default function ResourcesPage() {
  const [sessions, setSessions] = useState<SessionWithResources[]>([])
  const [selectedSession, setSelectedSession] = useState<SessionWithResources | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAppStore()

  // Summary modal state
  const [summaryModalOpen, setSummaryModalOpen] = useState(false)
  const [summaryData, setSummaryData] = useState<any>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summarySession, setSummarySession] = useState<any>(null)

  useEffect(() => {
    fetchSessions()
  }, [user])

  const fetchSessions = async () => {
    if (!user) return

    try {
      console.log('Fetching sessions for user:', user.id)

      // First, let's try to get sessions with basic columns to see what exists
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          skill_name,
          mode,
          status,
          started_at,
          ended_at,
          session_resources (*)
        `)
        .or(`host_id.eq.${user.id},learner_id.eq.${user.id}`)
        .order('id', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Fetched sessions:', data)

      // Map session_resources to resources to match TypeScript type
      const mappedSessions = (data || []).map(session => ({
        ...session,
        resources: session.session_resources || []
      }))

      setSessions(mappedSessions)
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadResource = (resource: SessionResource) => {
    const content = resource.content
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${resource.resource_type}-${resource.id}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'summary':
        return FileText
      case 'quiz':
        return HelpCircle
      case 'cheatsheet':
        return BookOpen
      default:
        return FileText
    }
  }

  const handleViewSummary = async (session: SessionWithResources, resource?: SessionResource) => {
    setSummarySession(session)
    setSummaryModalOpen(true)
    setSummaryLoading(true)
    setSummaryData(null)

    try {
      if (resource) {
        // If resource is provided, use it directly
        const summaryContent = JSON.parse(resource.content)
        setSummaryData(summaryContent)
      } else {
        // Otherwise, fetch from database like dashboard does
        const { data: resources, error } = await supabase
          .from('session_resources')
          .select('content')
          .eq('session_id', session.id)
          .eq('resource_type', 'summary')
          .order('id', { ascending: false })
          .limit(1)

        if (error) {
          console.error('Error fetching session summary:', error)
          return
        }

        if (resources && resources.length > 0) {
          const summaryContent = JSON.parse(resources[0].content)
          setSummaryData(summaryContent)
        }
      }
    } catch (error) {
      console.error('Error parsing session summary:', error)
    } finally {
      setSummaryLoading(false)
    }
  }

  const closeSummaryModal = () => {
    setSummaryModalOpen(false)
    setSummarySession(null)
    setSummaryData(null)
  }

  const handleSessionClick = async (session: SessionWithResources) => {
    setSelectedSession(session)

    // Always try to fetch and show summary like dashboard does
    handleViewSummary(session)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Learning Resources</h1>
        <p className="text-muted-foreground">
          Access summaries, notes, and materials from your learning sessions
        </p>

        {/* Debug Info - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-gray-100 rounded-lg text-sm">
            <strong>Debug Info:</strong> Found {sessions.length} sessions,
            Total resources: {sessions.reduce((acc, s) => acc + (s.resources?.length || 0), 0)}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Show info about sessions without resources */}
          {/* {sessions.length > 0 && sessions.every(s => !s.resources || s.resources.length === 0) && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-yellow-600">ℹ️</div>
                  <div>
                    <h4 className="font-medium text-yellow-800">Sessions found, but no resources yet</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      You have {sessions.length} learning session(s), but they haven't generated resources yet.
                      Complete an AI tutorial to generate summaries and learning materials.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )} */}
          {sessions.length > 0 ? (
            sessions.map((session) => {
              console.log('Rendering session:', session.id, 'Resources:', session.resources?.length || 0)
              return (
                <Card
                  key={session.id}
                  className={`cursor-pointer transition-colors hover:shadow-md ${selectedSession?.id === session.id ? 'ring-2 ring-primary' : ''
                    }`}
                  onClick={() => handleSessionClick(session)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{session.skill_name}</CardTitle>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${session.mode === 'live'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                        }`}>
                        {session.mode === 'live' ? 'Live Session' : 'AI Tutorial'}
                      </span>
                    </div>
                    <CardDescription>
                      {session.started_at ? formatDate(session.started_at) : 'Session created'}
                      {session.ended_at ? (
                        <span className="text-green-600 ml-2">✓ Completed {formatDate(session.ended_at)}</span>
                      ) : (
                        <span className="text-orange-600 ml-2">⏳ In Progress</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {/* {session.resources?.length || 0} resources available */}
                        {session.resources?.some(r => r.resource_type === 'summary') && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Has Summary
                          </span>
                        )}
                      </span>
                      <Button variant="ghost" size="sm" onClick={(e) => {
                        e.stopPropagation()
                        setSelectedSession(session)
                      }}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No learning sessions found</h3>
                <p className="text-muted-foreground mb-4">
                  Complete AI tutorials or live sessions to generate learning resources
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button
                    onClick={() => window.location.href = '/ai-tutorial'}
                    variant="outline"
                  >
                    Start AI Tutorial
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/onboarding'}
                    variant="outline"
                  >
                    Create Learning Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Session Details */}
        <div className="lg:col-span-1">
          {selectedSession ? (
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Session Details</CardTitle>
                <CardDescription>{selectedSession.skill_name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Session Info</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Type:</span> {selectedSession.mode === 'live' ? 'Live Session' : 'AI Tutorial'}</p>
                    <p><span className="font-medium">Session ID:</span> {selectedSession.id}</p>
                    {selectedSession.started_at && (
                      <p><span className="font-medium">Started:</span> {formatDate(selectedSession.started_at)}</p>
                    )}
                    {selectedSession.ended_at && (
                      <p><span className="font-medium">Ended:</span> {formatDate(selectedSession.ended_at)}</p>
                    )}
                  </div>

                  {/* Quick Summary Button - Always show for completed sessions */}
                  {selectedSession.ended_at && (
                    <div className="mt-3">
                      <Button
                        onClick={() => handleViewSummary(selectedSession)}
                        className="w-full"
                        size="sm"
                      >
                        <ScrollText className="h-4 w-4 mr-2" />
                        View Session Summary
                      </Button>
                    </div>
                  )}
                </div>

                {selectedSession.resources && selectedSession.resources.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Resources</h4>
                    <div className="space-y-2">
                      {selectedSession.resources.map((resource) => {
                        const Icon = getResourceIcon(resource.resource_type)
                        return (
                          <div
                            key={resource.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium capitalize">
                                  {resource.resource_type}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(resource.created_at)}
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              {resource.resource_type === 'summary' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewSummary(selectedSession, resource)}
                                >
                                  <ScrollText className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadResource(resource)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {(!selectedSession.resources || selectedSession.resources.length === 0) && (
                  <div className="text-center py-4">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-1">
                      {/* No resources available for this session */}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedSession.mode === 'tutorial'
                        ? 'Complete an AI tutorial to generate resources'
                        : 'Resources are created during learning sessions'
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="sticky top-6">
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Select a session to view its details and resources
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Summary Modal */}
      {summarySession && (
        <SummaryModal
          isOpen={summaryModalOpen}
          onClose={closeSummaryModal}
          session={summarySession}
          summary={summaryData}
          loading={summaryLoading}
        />
      )}
    </div>
  )
}