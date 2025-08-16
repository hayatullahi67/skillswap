# Fix AI Tutorial Error

## The Problem
The error `api.kiro.ai/generate-tutorial:1 Failed to load resource: net::ERR_NAME_NOT_RESOLVED` happens because:

1. The app is trying to call the old fake API URL
2. Your `.env.local` file is missing or incorrect
3. Environment variables aren't loaded properly

## Quick Fix

### 1. Create `.env.local` file in your project root:
```bash
# Supabase Configuration (fill in your actual values)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration (get from https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-your-openai-api-key-here

# API Configuration - THIS FIXES THE ERROR!
NEXT_PUBLIC_KIRO_API_URL=http://localhost:3000/api

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Restart your development server:
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### 3. Test the API endpoints:
Visit these URLs in your browser to verify:
- http://localhost:3000/api/test (should show "API is working!")

### 4. Test the AI tutorial:
- Go to http://localhost:3000/ai-tutorial
- Enter any skill (e.g., "JavaScript")
- Check the browser console for debug logs

## What Should Happen

With the correct setup:
1. **With OpenAI API key**: Real AI-generated tutorials
2. **Without OpenAI API key**: Fallback to basic tutorials (still works!)

## Debug Information

Check the browser console for these logs:
```
KiroClient initialized with: { baseUrl: "http://localhost:3000/api", hasApiKey: true }
🔍 Generating AI tutorial for "JavaScript"...
📡 API URL: http://localhost:3000/api/generate-tutorial
```

If you see `api.kiro.ai` in the logs, your environment variables aren't loaded properly.

## Still Having Issues?

1. **Clear browser cache** (hard refresh: Ctrl+Shift+R)
2. **Check .env.local exists** in project root (same level as package.json)
3. **Restart development server** after any .env changes
4. **Check console logs** for detailed error information

The system will work with fallback tutorials even without OpenAI API key!