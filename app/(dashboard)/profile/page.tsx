'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertModal } from '@/components/ui/modal'
import { useModal } from '@/hooks/useModal'
import { useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabaseClient'
import { getInitials } from '@/lib/utils'
import { 
  Edit, 
  Save, 
  Plus, 
  X, 
  BookOpen, 
  GraduationCap, 
  ToggleLeft, 
  ToggleRight,
  MapPin,
  Clock
} from 'lucide-react'

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  location: z.string().optional(),
  timezone: z.string().optional(),
})

type ProfileForm = z.infer<typeof profileSchema>

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [newSkill, setNewSkill] = useState('')
  const [skillType, setSkillType] = useState<'teach' | 'learn'>('teach')
  const [loading, setLoading] = useState(false)
  const [addingSkill, setAddingSkill] = useState(false)
  const { modalState, showSuccess, showError, closeModal } = useModal()
  
  const { 
    profile, 
    userSkills, 
    isOnline, 
    fetchProfile, 
    fetchUserSkills, 
    updateOnlineStatus,
    setProfile 
  } = useAppStore()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  })

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name,
        location: profile.location || '',
        timezone: profile.timezone || '',
      })
    }
  }, [profile, reset])

  const onSubmitProfile = async (data: ProfileForm) => {
    if (!profile) return
    
    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: data.name,
          location: data.location || null,
          timezone: data.timezone || null,
        })
        .eq('id', profile.id)

      if (error) throw error

      setProfile({
        ...profile,
        name: data.name,
        location: data.location || undefined,
        timezone: data.timezone || undefined,
      })
      
      setIsEditing(false)
      showSuccess('Success!', 'Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      showError('Error', 'Failed to update profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addSkill = async () => {
    if (!newSkill.trim() || !profile) return

    setAddingSkill(true)
    try {
      const { error } = await supabase
        .from('user_skills')
        .insert({
          user_id: profile.id,
          skill_name: newSkill.trim(),
          skill_type: skillType,
        })

      if (error) throw error

      await fetchUserSkills()
      setNewSkill('')
      setAddingSkill(false)
    } catch (error) {
      console.error('Error adding skill:', error)
      showError('Error', 'Failed to add skill. Please try again.')
      setAddingSkill(false)
    }
  }

  const removeSkill = async (skillId: number) => {
    try {
      const { error } = await supabase
        .from('user_skills')
        .delete()
        .eq('id', skillId)

      if (error) throw error

      await fetchUserSkills()
    } catch (error) {
      console.error('Error removing skill:', error)
      showError('Error', 'Failed to remove skill. Please try again.')
    }
  }

  const handleToggleOnline = async () => {
    await updateOnlineStatus(!isOnline)
  }

  const teachSkills = userSkills.filter(skill => skill.skill_type === 'teach')
  const learnSkills = userSkills.filter(skill => skill.skill_type === 'learn')

  if (!profile) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Profile</h1>
        <Button
          variant={isEditing ? "default" : "outline"}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? <Save className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </Button>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-xl">
              {getInitials(profile.name)}
            </div>
            <div>
              <CardTitle className="text-2xl">{profile.name}</CardTitle>
              <CardDescription className="flex items-center space-x-4 mt-2">
                {profile.location && (
                  <span className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {profile.location}
                  </span>
                )}
                {profile.timezone && (
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {profile.timezone}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        {isEditing && (
          <CardContent>
            <form onSubmit={handleSubmit(onSubmitProfile)} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Enter your full name"
                />
                {errors.name && (
                  <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  {...register('location')}
                  placeholder="City, Country"
                />
              </div>

              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  {...register('timezone')}
                  placeholder="e.g., UTC+1, EST, PST"
                />
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>

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

      {/* Skills Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skills I Can Teach */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <GraduationCap className="h-5 w-5 mr-2 text-green-600" />
              Skills I Can Teach
            </CardTitle>
            <CardDescription>
              Share your expertise with others
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {teachSkills.map((skill) => (
              <div key={skill.id} className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium">{skill.skill_name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSkill(skill.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {teachSkills.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No teaching skills added yet
              </p>
            )}

            <div className="flex space-x-2">
              <Input
                value={skillType === 'teach' ? newSkill : ''}
                onChange={(e) => {
                  setNewSkill(e.target.value)
                  setSkillType('teach')
                }}
                placeholder="Add a skill you can teach"
                onKeyPress={(e) => e.key === 'Enter' && skillType === 'teach' && addSkill()}
              />
              <Button
                onClick={() => {
                  setSkillType('teach')
                  addSkill()
                }}
                disabled={!newSkill.trim() || skillType !== 'teach' || addingSkill}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Skills I Want to Learn */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
              Skills I Want to Learn
            </CardTitle>
            <CardDescription>
              Skills you're interested in learning
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {learnSkills.map((skill) => (
              <div key={skill.id} className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium">{skill.skill_name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSkill(skill.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {learnSkills.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No learning skills added yet
              </p>
            )}

            <div className="flex space-x-2">
              <Input
                value={skillType === 'learn' ? newSkill : ''}
                onChange={(e) => {
                  setNewSkill(e.target.value)
                  setSkillType('learn')
                }}
                placeholder="Add a skill you want to learn"
                onKeyPress={(e) => e.key === 'Enter' && skillType === 'learn' && addSkill()}
              />
              <Button
                onClick={() => {
                  setSkillType('learn')
                  addSkill()
                }}
                disabled={!newSkill.trim() || skillType !== 'learn' || addingSkill}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{teachSkills.length}</div>
              <div className="text-sm text-muted-foreground">Skills I Can Teach</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{learnSkills.length}</div>
              <div className="text-sm text-muted-foreground">Skills I Want to Learn</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className={`text-2xl font-bold ${isOnline ? 'text-green-500' : 'text-gray-400'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </div>
              <div className="text-sm text-muted-foreground">Current Status</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <AlertModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onConfirm={modalState.onConfirm}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
      />
    </div>
  )
}