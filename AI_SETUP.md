# AI Tutorial System Setup

## Overview

The AI tutorial system now uses **real AI** powered by OpenAI GPT-4 to generate dynamic, personalized learning content for any skill.

## What Changed

### Before (Hardcoded)
- ❌ All tutorial content was pre-written and hardcoded
- ❌ Only supported ~15 predefined skills
- ❌ No real AI generation
- ❌ Static content that couldn't adapt to users

### After (Real AI)
- ✅ Dynamic content generation using OpenAI GPT-4
- ✅ Supports **any skill** a user wants to learn
- ✅ Personalized based on user level (beginner/intermediate/advanced)
- ✅ Real-time quiz and code example generation
- ✅ Fallback system for offline functionality

## Setup Instructions

### 1. Get OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-...`)

### 2. Configure Environment Variables
Add to your `.env.local` file:
```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# API Base URL (for local development)
NEXT_PUBLIC_KIRO_API_URL=http://localhost:3000/api
```

### 3. Install Dependencies
```bash
npm install openai
```

### 4. Test the System
1. Start your development server: `npm run dev`
2. Go to `/ai-tutorial`
3. Enter any skill (e.g., "Machine Learning", "Cooking", "Photography")
4. Watch as the AI generates a personalized tutorial in real-time!

## API Endpoints

The system now includes three AI-powered endpoints:

### `/api/generate-tutorial`
- Generates complete interactive tutorials
- Includes steps, quizzes, code examples
- Adapts to user skill level

### `/api/generate-quiz`
- Creates quiz questions based on content
- Tests understanding of key concepts
- Provides explanations for answers

### `/api/generate-onboarding`
- Creates progressive onboarding paths
- Includes hands-on challenges
- Builds skills step-by-step

## How It Works

1. **User Input**: User enters any skill they want to learn
2. **AI Generation**: System sends request to OpenAI GPT-4 with structured prompts
3. **Content Creation**: AI generates personalized tutorial with:
   - Step-by-step lessons
   - Code examples (when relevant)
   - Interactive quizzes
   - Practical exercises
4. **Fallback**: If AI fails, system provides basic tutorial structure
5. **Progress Tracking**: User progress saved to Supabase database

## Benefits

### For Users
- Learn **any skill**, not just predefined ones
- Get personalized content based on their level
- Interactive, engaging learning experience
- Works offline with fallback system

### For Developers
- No more maintaining hardcoded content
- Easy to extend and modify
- Real AI capabilities
- Scalable to unlimited skills

## Cost Considerations

- OpenAI API calls cost money (typically $0.01-0.03 per tutorial)
- Consider implementing caching for popular skills
- Monitor usage and set billing limits
- Fallback system ensures functionality even without API access

## Example Usage

```javascript
// Generate a tutorial for any skill
const tutorial = await kiroClient.generateTutorial("Blockchain Development", "intermediate")

// Generate quiz questions
const quiz = await kiroClient.generateQuiz("React", tutorialContent)

// Create onboarding path
const onboarding = await kiroClient.generateOnboardingPath("Data Science")
```

## Next Steps

1. **Caching**: Implement Redis/database caching for popular tutorials
2. **User Preferences**: Save user learning preferences and adapt content
3. **Advanced Prompts**: Improve AI prompts for better content quality
4. **Analytics**: Track which skills are most popular
5. **Feedback Loop**: Let users rate content to improve AI generation

The system is now truly AI-powered and can teach users virtually any skill they want to learn! 🚀