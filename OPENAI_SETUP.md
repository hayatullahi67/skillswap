# 🤖 OpenAI API Setup Guide

## Step 1: Get OpenAI API Key

### 1. Go to OpenAI Platform
Visit: [https://platform.openai.com/](https://platform.openai.com/)

### 2. Create Account / Sign In
- Sign up for a new account or log in
- You may need to verify your phone number

### 3. Add Payment Method
- Go to **Billing** section
- Add a credit card (required for API access)
- Set spending limits to control costs

### 4. Create API Key
- Go to **API Keys**: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Click **"Create new secret key"**
- Give it a name: "SkillSwap App"
- Copy the key (starts with `sk-...`)
- **IMPORTANT**: Save it immediately - you can't see it again!

## Step 2: Configure Your App

### 1. Create `.env.local` file
Create a file named `.env.local` in your project root:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-actual-api-key-here

# API Configuration
NEXT_PUBLIC_KIRO_API_URL=http://localhost:3000/api

# Supabase Configuration (your existing values)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Restart Development Server
```bash
# Stop server (Ctrl+C)
npm run dev
```

## Step 3: Test AI Tutorials

1. Go to `/ai-tutorial`
2. Enter any skill (e.g., "Machine Learning", "Cooking", "Photography")
3. Watch AI generate a personalized tutorial in real-time!

## 💰 Cost Information

### Pricing:
- **Tutorial Generation**: ~$0.01-0.03 per tutorial
- **Quiz Generation**: ~$0.005-0.01 per quiz
- **Onboarding**: ~$0.01-0.02 per onboarding path

### Free Credits:
- New accounts get $5 free credit
- Enough for ~200-500 tutorials

### Cost Control:
- Set monthly spending limits in OpenAI dashboard
- Monitor usage in the **Usage** section
- Start with a $10/month limit

## 🔧 What Happens Now

### With OpenAI API Key:
- ✅ Real AI-generated tutorials for ANY skill
- ✅ Personalized content based on user level
- ✅ Interactive quizzes and code examples
- ✅ Dynamic content that adapts to the skill

### Without API Key:
- ❌ Error message asking you to set up OpenAI
- ❌ No hardcoded fallbacks (as requested)
- ❌ System requires proper AI setup to work

## 🚀 Example AI-Generated Content

With OpenAI configured, you'll get tutorials like:

**For "Machine Learning":**
- Mathematical foundations and algorithms
- Python code examples with scikit-learn
- Interactive quizzes about supervised vs unsupervised learning
- Real-world project ideas

**For "Cooking":**
- Knife skills and food safety
- Recipe examples with techniques
- Quizzes about flavor pairing
- Progressive skill building

**For "Photography":**
- Camera settings and exposure triangle
- Composition techniques with examples
- Quizzes about aperture and shutter speed
- Portfolio building advice

## 🛠️ Troubleshooting

### Common Issues:

1. **"Invalid API key"**
   - Check your API key is correct in `.env.local`
   - Make sure it starts with `sk-`
   - Restart dev server after changes

2. **"Insufficient quota"**
   - Add payment method to OpenAI account
   - Check billing limits

3. **"Rate limit exceeded"**
   - You're making too many requests
   - Wait a few minutes and try again

### Debug Steps:
1. Check console logs for detailed errors
2. Visit `/api/test` to verify API is working
3. Check OpenAI dashboard for usage and errors

Now you have a **pure AI-powered tutorial system** with no hardcoded content! 🎉