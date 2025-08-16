'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { useAppStore } from '@/lib/store'
import { kiroClient } from '@/lib/kiroClient'
import {
  BookOpen,
  Clock,
  Target,
  Sparkles,
  CheckCircle,
  Play
} from 'lucide-react'

type LearningTopic = {
  id: number
  title: string
  summary: string
  estimatedTime: string
  difficulty: string
  prerequisites?: string[]
  keyLearningOutcomes?: string[]
}

type LearningPlan = {
  title: string
  description: string
  estimatedTotalTime: string
  topics: LearningTopic[]
}

export default function OnboardingPage() {
  // Form state
  const [skill, setSkill] = useState('')
  const [level, setLevel] = useState('')
  const [learningGoal, setLearningGoal] = useState('')
  
  // Plan state
  const [learningPlan, setLearningPlan] = useState<LearningPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPlan, setShowPlan] = useState(false)

  const router = useRouter()
  const { user, userSkills } = useAppStore()
  // Error handling
  const showError = (title: string, message: string) => {
    console.error(`${title}: ${message}`)
    // You can implement a toast notification system here
    alert(`${title}: ${message}`)
  }

  const learnSkills = userSkills.filter(skill => skill.skill_type === 'learn')

  const generateLearningPlan = async () => {
    if (!skill.trim() || !level || !user) return

    setLoading(true)

    try {
      console.log('Generating learning plan for:', { skill, level, learningGoal })
      
      // Generate personalized learning plan using AI
      const plan = await kiroClient.generateLearningPlan(skill, level, learningGoal)
      setLearningPlan(plan)
      setShowPlan(true)
      
      console.log('Learning plan generated:', plan)
    } catch (error) {
      console.error('Error generating learning plan:', error)
      showError('Plan Generation Error', `Failed to generate your personalized learning plan for ${skill}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const startLearningTopic = (topic: LearningTopic) => {
    // Navigate to AI tutorial with the selected topic and level
    const params = new URLSearchParams({
      skill: `${skill} - ${topic.title}`,
      level: level,
      fallback: 'true'
    })
    
    router.push(`/ai-tutorial?${params.toString()}`)
  }

  const startFullCourse = () => {
    // Navigate to AI tutorial with the full skill
    const params = new URLSearchParams({
      skill: skill,
      level: level,
      fallback: 'true'
    })
    
    router.push(`/ai-tutorial?${params.toString()}`)
  }

  const resetForm = () => {
    setSkill('')
    setLevel('')
    setLearningGoal('')
    setLearningPlan(null)
    setShowPlan(false)
  }

  // Onboarding form screen
  if (!showPlan && !loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">AI Learning Planner</h1>
          <p className="text-muted-foreground">
            Get a personalized learning plan created by AI, tailored to your goals and skill level
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Create Your Learning Plan
            </CardTitle>
            <CardDescription>
              Tell us what you want to learn and we'll create a personalized roadmap
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Start from Learning Goals */}
            {learnSkills.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Quick Start from Your Learning Goals:</Label>
                <div className="grid grid-cols-1 gap-2">
                  {learnSkills.slice(0, 3).map((userSkill) => (
                    <Button
                      key={userSkill.id}
                      variant="outline"
                      className="justify-start h-auto p-3"
                      onClick={() => {
                        setSkill(userSkill.skill_name)
                        setLevel('beginner') // Default to beginner for quick start
                      }}
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      <span>{userSkill.skill_name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="skill">Skill / Topic you want to learn *</Label>
                <Input
                  id="skill"
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  placeholder="Enter any skill or topic you want to learn"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">Your current skill level *</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Just Starting - New to this topic</SelectItem>
                    <SelectItem value="intermediate">Some Experience - I know the basics</SelectItem>
                    <SelectItem value="advanced">Experienced - Want to go deeper</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal">Learning goal (optional)</Label>
                <Textarea
                  id="goal"
                  value={learningGoal}
                  onChange={(e) => setLearningGoal(e.target.value)}
                  placeholder="Describe what you want to achieve with this skill"
                  className="w-full h-20 resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Tell us what you want to achieve - this helps us create a more targeted plan
                </p>
              </div>

              <Button
                onClick={generateLearningPlan}
                disabled={!skill.trim() || !level || loading}
                className="w-full h-12"
                size="lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Your Plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Start My Plan
                  </>
                )}
              </Button>
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
          <h3 className="text-lg font-semibold mb-2">Creating your personalized learning plan...</h3>
          <p className="text-muted-foreground">
            Our AI is analyzing "{skill}" and crafting a {level}-level learning roadmap just for you
          </p>
        </div>
      </div>
    )
  }

  // Learning plan results screen
  if (showPlan && learningPlan) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Your Personalized Learning Plan</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            AI has created a customized roadmap for your {skill} journey at {level} level
          </p>
        </div>

        {/* Plan Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              {learningPlan.title}
            </CardTitle>
            <CardDescription>{learningPlan.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>{learningPlan.estimatedTotalTime}</span>
              </div>
              <div className="flex items-center">
                <BookOpen className="h-4 w-4 mr-1" />
                <span>{learningPlan.topics.length} topics</span>
              </div>
              <div className="flex items-center">
                <Target className="h-4 w-4 mr-1" />
                <span className="capitalize">{level} level</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Learning Topics */}
        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold">Learning Topics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {learningPlan.topics.map((topic, index) => (
              <Card key={topic.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-semibold text-primary">{index + 1}</span>
                        </div>
                        {topic.title}
                      </CardTitle>
                      <CardDescription className="mt-2">{topic.summary}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{topic.estimatedTime}</span>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        topic.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        topic.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {topic.difficulty}
                      </div>
                    </div>

                    {topic.keyLearningOutcomes && topic.keyLearningOutcomes.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1">You'll learn to:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {topic.keyLearningOutcomes.slice(0, 2).map((outcome, idx) => (
                            <li key={idx} className="flex items-start">
                              <CheckCircle className="h-3 w-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                              <span>{outcome}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Button
                      onClick={() => startLearningTopic(topic)}
                      className="w-full"
                      variant="outline"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start This Topic
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={startFullCourse}
            size="lg"
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Play className="h-5 w-5 mr-2" />
            Start Complete Course
          </Button>
          <Button
            onClick={resetForm}
            variant="outline"
            size="lg"
          >
            Create New Plan
          </Button>
        </div>
      </div>
    )
  }

  return null
}