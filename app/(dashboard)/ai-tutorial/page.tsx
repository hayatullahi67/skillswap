'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// Dynamically import markdown components with better error handling
const ReactMarkdown = dynamic(
  () => import('react-markdown').catch(() => {
    console.warn('ReactMarkdown failed to load, using fallback')
    return {
      default: ({ children }: any) => (
        <div className="whitespace-pre-wrap">{children}</div>
      )
    }
  }),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-100 h-20 rounded"></div>
  }
)

const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter')
    .then((mod) => mod.Prism)
    .catch(() => {
      console.warn('SyntaxHighlighter failed to load, using fallback')
      return {
        default: ({ children }: any) => (
          <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto">
            <code>{children}</code>
          </pre>
        )
      }
    }),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-900 h-32 rounded"></div>
  }
)
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { AlertModal } from '@/components/ui/modal'
import { useModal } from '@/hooks/useModal'
import { useAppStore } from '@/lib/store'
import { kiroClient } from '@/lib/kiroClient'
import { supabase } from '@/lib/supabaseClient'
import {
  ChevronRight,
  BookOpen,
  Clock,
  Play,
  RotateCcw,
  Send,
  Copy,
  Bot,
  MessageCircle
} from 'lucide-react'

type TutorialStep = {
  id: number
  title: string
  content: string
  codeExample?: {
    language: string
    code: string
  }
  quiz?: {
    question: string
    options: string[]
    correctAnswer: number
    explanation: string
  }
  completed: boolean
  estimatedTime?: string
}

type Tutorial = {
  title: string
  description: string
  estimatedTime: string
  difficulty: string
  steps: TutorialStep[]
  totalSteps: number
}

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
  timestamp: Date
  type?: 'intro' | 'step' | 'code' | 'quiz' | 'followup'
}

type TutorialPhase = 'intro' | 'learning' | 'quiz' | 'completed'

export default function AITutorialPage() {
  const [tutorial, setTutorial] = useState<Tutorial | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedSkill, setSelectedSkill] = useState('')
  const [customSkill, setCustomSkill] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [startTime, setStartTime] = useState<Date | null>(null)

  // Chat-like interface state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [userInput, setUserInput] = useState('')
  const [phase, setPhase] = useState<TutorialPhase>('intro')
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showQuizResult, setShowQuizResult] = useState(false)
  const [quizCorrect, setQuizCorrect] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [showBreakDown, setShowBreakDown] = useState(false)
  const [simplifiedContent, setSimplifiedContent] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, userSkills } = useAppStore()
  const { modalState, showSuccess, showError, closeModal } = useModal()

  const skillFromUrl = searchParams?.get('skill')
  const fallback = searchParams?.get('fallback')
  const learnSkills = userSkills.filter(skill => skill.skill_type === 'learn')

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (skillFromUrl) {
      setSelectedSkill(skillFromUrl)
      startTutorial(skillFromUrl)
    }
  }, [skillFromUrl])

  // Helper function to add messages with typing effect
  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
  }

  // Simulate typing effect
  const simulateTyping = async (duration = 1000) => {
    setIsTyping(true)
    await new Promise(resolve => setTimeout(resolve, duration))
    setIsTyping(false)
  }

  // Copy code to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const startTutorial = async (skill: string) => {
    if (!skill.trim() || !user) return

    setLoading(true)
    setStartTime(new Date())
    setMessages([])
    setPhase('intro')

    try {
      // 1. Create session in Supabase
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          learner_id: user.id,
          skill_name: skill,
          mode: 'tutorial'
        })
        .select()
        .single()

      if (sessionError) throw sessionError
      setSessionId(session.id)

      // 2. Fetch tutorial content from Kiro API
      const tutorialData = await kiroClient.generateTutorial(skill)
      setTutorial(tutorialData)

      // 3. Save lesson summary to session_resources
      await supabase
        .from('session_resources')
        .insert({
          session_id: session.id,
          resource_type: 'summary',
          content: JSON.stringify(tutorialData)
        })

      // 4. Start the chat-like tutorial
      await simulateTyping(500)
      addMessage({
        role: 'assistant',
        content: `Hi! I'm your AI tutor, and I'm excited to help you learn **${skill}**! 🎓`,
        type: 'intro'
      })

      await simulateTyping(1000)
      addMessage({
        role: 'assistant',
        content: `Here's what we'll cover in this ${tutorialData.difficulty}-level tutorial:\n\n**${tutorialData.title}**\n\n${tutorialData.description}\n\n⏱️ **Estimated time:** ${tutorialData.estimatedTime}\n📚 **Total steps:** ${tutorialData.totalSteps}\n\nReady to start? Type "Begin Learning" when you're ready!`,
        type: 'intro'
      })

      setCurrentStep(0)
      setPhase('learning')
    } catch (error) {
      console.error('Error starting tutorial:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      showError('Tutorial Error', `Failed to start tutorial: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const startStep = async () => {
    if (!tutorial) return

    const step = tutorial.steps[currentStep]
    await simulateTyping(800)

    addMessage({
      role: 'assistant',
      content: `## ${step.title}\n\n${step.content}`,
      type: 'step'
    })

    // Add code example if present
    if (step.codeExample) {
      await simulateTyping(500)
      addMessage({
        role: 'assistant',
        content: `Here's a practical example:\n\n\`\`\`${step.codeExample.language}\n${step.codeExample.code}\n\`\`\``,
        type: 'code'
      })
    }

    await simulateTyping(800)
    addMessage({
      role: 'assistant',
      content: `Feel free to ask me any questions about this step, or click "Continue" when you're ready for the quiz! 🤔`,
      type: 'followup'
    })
  }

  const handleFollowUpQuestion = async (question: string) => {
    if (!question.trim() || !tutorial) return

    addMessage({
      role: 'user',
      content: question
    })

    setUserInput('')
    await simulateTyping(1500)

    try {
      // Use real AI API for follow-up questions
      const response = await kiroClient.askFollowUpQuestion(question, tutorial.steps[currentStep])

      addMessage({
        role: 'assistant',
        content: response + '\n\nDoes that help clarify things? Feel free to ask more questions or continue to the quiz!',
        type: 'followup'
      })
    } catch (error) {
      console.error('Error getting follow-up response:', error)
      // Fallback response
      addMessage({
        role: 'assistant',
        content: `I'm experiencing some technical difficulties right now, but your question about ${tutorial.steps[currentStep].title} is excellent! Please feel free to continue to the quiz or try asking your question again.`,
        type: 'followup'
      })
    }
  }

  const handleBreakDownTopic = async () => {
    if (!tutorial) return

    setShowBreakDown(true)
    await simulateTyping(2000)

    try {
      const simplifiedExplanation = await kiroClient.breakDownTopic(
        tutorial.steps[currentStep],
        selectedSkill,
        tutorial.difficulty
      )

      setSimplifiedContent(simplifiedExplanation)

      addMessage({
        role: 'assistant',
        content: `Let me break this down into simpler terms for you! 🧩\n\n${simplifiedExplanation}\n\nDoes this make more sense now? Feel free to ask questions or continue when you're ready!`,
        type: 'step'
      })
    } catch (error) {
      console.error('Error breaking down topic:', error)
      addMessage({
        role: 'assistant',
        content: `I'm experiencing some technical difficulties breaking down "${tutorial.steps[currentStep].title}" right now. Don't worry though! Try reviewing the content again, and feel free to ask me specific questions about any part of ${selectedSkill} that seems confusing.`,
        type: 'followup'
      })
    } finally {
      setShowBreakDown(false)
    }
  }

  const startQuiz = async () => {
    if (!tutorial) return

    const step = tutorial.steps[currentStep]
    setPhase('quiz')
    await simulateTyping(1000)

    addMessage({
      role: 'assistant',
      content: `Time for a quick quiz to test your understanding! 📝\n\nLet me generate a question based on what we've covered...`,
      type: 'quiz'
    })

    try {
      // Generate dynamic quiz based on the actual conversation and learning
      const conversationContext = messages
        .filter(msg => msg.role === 'assistant' || msg.role === 'user')
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n')

      const dynamicQuiz = await kiroClient.generateContextualQuiz(
        step,
        selectedSkill,
        tutorial.difficulty,
        conversationContext
      )

      // Update the step with the new quiz
      const updatedTutorial = { ...tutorial }
      updatedTutorial.steps[currentStep].quiz = dynamicQuiz
      setTutorial(updatedTutorial)

      await simulateTyping(500)
      addMessage({
        role: 'assistant',
        content: `**${dynamicQuiz.question}**`,
        type: 'quiz'
      })

    } catch (error) {
      console.error('Error generating dynamic quiz:', error)
      // Fallback to original quiz if available, or skip
      if (step.quiz) {
        addMessage({
          role: 'assistant',
          content: `**${step.quiz.question}**`,
          type: 'quiz'
        })
      } else {
        addMessage({
          role: 'assistant',
          content: `Excellent work on "${tutorial.steps[currentStep].title}"! You're making great progress with ${selectedSkill}. Let's continue to the next step.`,
          type: 'quiz'
        })
        completeStep()
      }
    }
  }

  const completeStep = async () => {
    if (!tutorial || !sessionId) return

    try {
      const updatedTutorial = { ...tutorial }
      updatedTutorial.steps[currentStep].completed = true
      setTutorial(updatedTutorial)

      // Save progress to database
      await supabase
        .from('session_resources')
        .insert({
          session_id: sessionId,
          resource_type: 'progress',
          content: JSON.stringify({
            stepId: tutorial.steps[currentStep].id,
            stepTitle: tutorial.steps[currentStep].title,
            completedAt: new Date().toISOString()
          })
        })

      // Move to next step or complete tutorial
      if (currentStep < tutorial.steps.length - 1) {
        setCurrentStep(currentStep + 1)
        setSelectedAnswer(null)
        setShowQuizResult(false)
        setPhase('learning')

        await simulateTyping(800)
        addMessage({
          role: 'assistant',
          content: `Fantastic work on "${tutorial.steps[currentStep].title}"! 🎉 You're really getting the hang of ${selectedSkill}. Let's move on to the next step.`,
          type: 'step'
        })

        // Start next step
        setTimeout(() => startStep(), 1000)
      } else {
        // Tutorial completed
        await completeTutorial()
      }
    } catch (error) {
      console.error('Error completing step:', error)
      // Continue anyway for better user experience
      if (currentStep < tutorial.steps.length - 1) {
        setCurrentStep(currentStep + 1)
        setSelectedAnswer(null)
        setShowQuizResult(false)
        setPhase('learning')
        setTimeout(() => startStep(), 1000)
      } else {
        setPhase('completed')
        addMessage({
          role: 'assistant',
          content: `🎉 **Congratulations!** You've successfully completed your ${selectedSkill} learning journey! You should be incredibly proud of mastering all ${tutorial.totalSteps} steps. This is a significant achievement in your learning path!`,
          type: 'step'
        })
      }
    }
  }

  const completeTutorial = async () => {
    if (!sessionId || !startTime || !tutorial) return

    setPhase('completed')
    const totalTime = Math.round((new Date().getTime() - startTime.getTime()) / 1000 / 60) // minutes

    // Update session end time
    await supabase
      .from('sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId)

    await simulateTyping(2000)

    try {
      // Generate personalized AI summary
      const aiSummary = await kiroClient.generateFinalSummary(
        selectedSkill,
        tutorial.difficulty,
        tutorial.totalSteps,
        totalTime
      )

      // Save the AI-generated summary to database
      await supabase
        .from('session_resources')
        .insert({
          session_id: sessionId,
          resource_type: 'summary',
          content: JSON.stringify({
            type: 'completion',
            skill: selectedSkill,
            completedAt: new Date().toISOString(),
            duration: totalTime,
            totalSteps: tutorial.totalSteps,
            aiSummary: aiSummary, // Store the AI-generated summary
            messages: messages // Save the entire conversation
          })
        })

      addMessage({
        role: 'assistant',
        content: aiSummary,
        type: 'step'
      })
    } catch (error) {
      console.error('Error generating final summary:', error)
      // Generate a simple fallback summary dynamically
      const fallbackSummary = `🎉 **Congratulations on completing your ${selectedSkill} learning journey!**\n\n🏆 **Your Achievement:**\n- Successfully completed ${tutorial.totalSteps} comprehensive learning steps\n- Demonstrated understanding through interactive quizzes\n- Invested ${totalTime} valuable minutes in your skill development\n\n🚀 **What's Next:**\nYour progress has been saved to your dashboard. Consider exploring advanced topics in ${selectedSkill} or try learning a complementary skill!\n\nKeep up the excellent work - every step forward is progress worth celebrating! 🌟`

      // Save fallback summary to database
      await supabase
        .from('session_resources')
        .insert({
          session_id: sessionId,
          resource_type: 'summary',
          content: JSON.stringify({
            type: 'completion',
            skill: selectedSkill,
            completedAt: new Date().toISOString(),
            duration: totalTime,
            totalSteps: tutorial.totalSteps,
            aiSummary: fallbackSummary,
            messages: messages
          })
        })

      addMessage({
        role: 'assistant',
        content: fallbackSummary,
        type: 'step'
      })
    }
  }

  const restartTutorial = () => {
    setMessages([])
    setCurrentStep(0)
    setSelectedAnswer(null)
    setShowQuizResult(false)
    setPhase('intro')
    if (tutorial) {
      // Reset completion status
      const resetTutorial = { ...tutorial }
      resetTutorial.steps.forEach(step => step.completed = false)
      setTutorial(resetTutorial)

      // Start over
      setTimeout(() => {
        addMessage({
          role: 'assistant',
          content: `Welcome back! Ready to dive into **${selectedSkill}** again? I'm here to help you master it! 🔄`,
          type: 'intro'
        })
      }, 500)
    }
  }

  const submitQuiz = async (answerIndex: number) => {
    if (!tutorial) return

    const currentQuiz = tutorial.steps[currentStep].quiz
    if (!currentQuiz) return

    const isCorrect = answerIndex === currentQuiz.correctAnswer
    setSelectedAnswer(answerIndex)
    setQuizCorrect(isCorrect)
    setShowQuizResult(true)

    // Add user's answer
    addMessage({
      role: 'user',
      content: `My answer: ${String.fromCharCode(65 + answerIndex)}. ${currentQuiz.options[answerIndex]}`
    })

    await simulateTyping(1000)

    // Add AI response
    if (isCorrect) {
      addMessage({
        role: 'assistant',
        content: `✅ **Correct!** Excellent understanding of ${tutorial.steps[currentStep].title}! 🎉\n\n${currentQuiz.explanation || `You clearly grasped the key concepts we covered about ${selectedSkill}!`}`,
        type: 'quiz'
      })
    } else {
      addMessage({
        role: 'assistant',
        content: `❌ **Not quite right.** The correct answer is **${String.fromCharCode(65 + currentQuiz.correctAnswer)}**.\n\n${currentQuiz.explanation || `Don't worry, learning ${selectedSkill} takes practice! This is all part of the journey.`}`,
        type: 'quiz'
      })
    }

    // Save quiz result
    if (sessionId) {
      supabase
        .from('session_resources')
        .insert({
          session_id: sessionId,
          resource_type: 'quiz',
          content: JSON.stringify({
            stepId: tutorial.steps[currentStep].id,
            question: currentQuiz.question,
            userAnswer: answerIndex,
            correctAnswer: currentQuiz.correctAnswer,
            isCorrect,
            answeredAt: new Date().toISOString()
          })
        })
    }

    await simulateTyping(500)
    addMessage({
      role: 'assistant',
      content: `Ready to continue your ${selectedSkill} learning journey? Click "Next Step" to move forward! 🚀`,
      type: 'quiz'
    })
  }

  const progress = tutorial ? ((currentStep + 1) / tutorial.totalSteps) * 100 : 0
  const completedSteps = tutorial && tutorial.steps ? tutorial.steps.filter(step => step.completed).length : 0

  // Skill selection screen
  if (!selectedSkill && !loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        {fallback && (
          <Card className="border-orange-200 bg-orange-50 mb-6">
            <CardHeader>
              <CardTitle className="text-orange-800">No Peers Available</CardTitle>
              <CardDescription className="text-orange-600">
                Don't worry! Our AI tutor is here to help you learn.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">AI Tutorial</h1>
          <p className="text-muted-foreground">
            Learn with personalized AI-powered lessons
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Choose a Skill to Learn</CardTitle>
            <CardDescription>
              Select from your learning goals or enter a custom skill
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {learnSkills.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium">Your Personal Learning Goals:</h3>
                {learnSkills.map((skill) => (
                  <Button
                    key={skill.id}
                    variant="outline"
                    className="w-full justify-between h-auto p-4"
                    onClick={() => {
                      setSelectedSkill(skill.skill_name)
                      startTutorial(skill.skill_name)
                    }}
                    disabled={loading}
                  >
                    <div className="flex items-center">
                      <BookOpen className="h-5 w-5 mr-3" />
                      <span className="font-medium">{skill.skill_name}</span>
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-medium">Or explore a new skill:</h3>
              <div className="flex space-x-2">
                <Input
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  placeholder="Enter any skill (e.g., React, Python, Design Patterns)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && customSkill.trim()) {
                      setSelectedSkill(customSkill)
                      startTutorial(customSkill)
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (customSkill.trim()) {
                      setSelectedSkill(customSkill)
                      startTutorial(customSkill)
                    }
                  }}
                  disabled={!customSkill.trim() || loading}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading screen
  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">Creating your {selectedSkill} tutorial...</h3>
          <p className="text-muted-foreground">
            Our AI is crafting a personalized learning experience tailored specifically for your {selectedSkill} journey
          </p>
        </div>
      </div>
    )
  }

  // Chat-like tutorial interface
  if (!tutorial) return null

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b bg-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-semibold">{tutorial.title}</h1>
            <p className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {tutorial.totalSteps} • {completedSteps} completed
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-muted-foreground flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            {tutorial.estimatedTime}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={restartTutorial}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restart
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-2 bg-gray-50 border-b">
        <Progress value={progress} className="w-full h-2" />
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-white border shadow-sm'
                }`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center mb-2">
                  <Bot className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="text-xs font-medium text-gray-500">AI Tutor</span>
                </div>
              )}

              <div className="prose prose-sm max-w-none">
                {ReactMarkdown ? (
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-medium mb-1">{children}</h3>,
                      p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                      li: ({ children }) => <li>{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      code: ({ children, className }) => {
                        const isCodeBlock = className?.includes('language-')
                        if (isCodeBlock) {
                          const language = className?.replace('language-', '') || 'javascript'
                          const codeContent = String(children).replace(/\n$/, '')
                          return (
                            <div className="relative my-3">
                              <div className="flex items-center justify-between bg-gray-800 text-gray-200 px-3 py-2 rounded-t-lg text-xs">
                                <span>{language}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-gray-400 hover:text-white"
                                  onClick={() => copyToClipboard(codeContent)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              {SyntaxHighlighter ? (
                                <SyntaxHighlighter
                                  language={language}
                                  customStyle={{
                                    margin: 0,
                                    backgroundColor: '#1f2937',
                                    color: '#f9fafb',
                                    padding: '1rem',
                                    borderRadius: '0 0 0.5rem 0.5rem',
                                    fontSize: '13px',
                                    lineHeight: '1.4'
                                  }}
                                  wrapLines={true}
                                  wrapLongLines={true}
                                >
                                  {codeContent}
                                </SyntaxHighlighter>
                              ) : (
                                <pre className="bg-gray-900 text-gray-100 p-4 rounded-b-lg overflow-x-auto">
                                  <code>{codeContent}</code>
                                </pre>
                              )}
                            </div>
                          )
                        }
                        return <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                      }
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  // Fallback when ReactMarkdown fails to load
                  <div
                    className="whitespace-pre-wrap leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: message.content
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
                        .replace(/\n/g, '<br/>')
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border shadow-sm rounded-2xl px-4 py-3 max-w-[80%]">
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4 text-blue-500" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quiz Options */}
        {phase === 'quiz' && tutorial.steps[currentStep].quiz && !showQuizResult && (
          <div className="flex justify-start">
            <div className="bg-white border shadow-sm rounded-2xl p-4 max-w-[90%]">
              <div className="space-y-3">
                {tutorial.steps[currentStep].quiz!.options.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start h-auto p-3 text-left"
                    onClick={() => submitQuiz(index)}
                  >
                    <span className="mr-3 font-semibold text-blue-500">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    {option}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-white p-4">
        <div className="flex items-center space-x-3">
          {/* Action Buttons */}
          <div className="flex space-x-2">
            {phase === 'learning' && messages.length > 0 && (
              <>
                <Button
                  onClick={handleBreakDownTopic}
                  variant="outline"
                  disabled={showBreakDown}
                  className="border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  {showBreakDown ? 'Breaking down...' : 'Break it down'}
                  <MessageCircle className="h-4 w-4 ml-1" />
                </Button>
                <Button
                  onClick={startQuiz}
                  className="bg-green-500 hover:bg-green-600"
                >
                  Continue
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}

            {phase === 'intro' && messages.length > 0 && (
              <Button
                onClick={startStep}
                className="bg-blue-500 hover:bg-blue-600"
              >
                Begin Learning
                <Play className="h-4 w-4 ml-1" />
              </Button>
            )}

            {showQuizResult && (
              <Button
                onClick={completeStep}
                className="bg-purple-500 hover:bg-purple-600"
              >
                {currentStep === tutorial.steps.length - 1 ? 'Complete Tutorial' : 'Next Step'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {phase === 'completed' && (
              <div className="flex space-x-2">
                <Button
                  onClick={restartTutorial}
                  variant="outline"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restart Tutorial
                </Button>
                <Button
                  onClick={() => router.push('/dashboard')}
                  className="bg-green-500 hover:bg-green-600"
                >
                  Back to Dashboard
                </Button>
              </div>
            )}
          </div>

          {/* Chat Input */}
          {(phase === 'learning' || phase === 'intro') && (
            <>
              <Input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask a question about this topic..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && userInput.trim()) {
                    handleFollowUpQuestion(userInput)
                  }
                }}
              />
              <Button
                onClick={() => handleFollowUpQuestion(userInput)}
                disabled={!userInput.trim()}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      <AlertModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        type={['success', 'error', 'warning', 'info'].includes(modalState.type as string) ? modalState.type as 'success' | 'error' | 'warning' | 'info' : undefined}
        // type={modalState.type}
        onConfirm={modalState.onConfirm}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
      />
    </div>
  )
}





