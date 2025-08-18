# 🚨 URGENT FIX: AI Tutorial Error

## The Problem
Your app is calling `https://api.kiro.ai` instead of `http://localhost:3000/api` because the environment variable isn't loaded.

## ✅ IMMEDIATE FIX (Already Applied)
I've hardcoded the local API URL in `lib/kiroClient.ts`. This should work right now!

## 🔧 PERMANENT FIX

### Step 1: Create `.env.local` file
Create a file named `.env.local` in your project root (same level as `package.json`):

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

### Step 2: Restart Development Server
```bash
# Stop the server (Ctrl+C)
npm run dev
```

### Step 3: Test
- Go to `/ai-tutorial`
- Enter any skill
- Should work with fallback tutorials (even without OpenAI key)

## 🧪 What Should Happen Now

### With the hardcoded fix:
- ✅ Calls `http://localhost:3000/api/generate-tutorial`
- ✅ Falls back to basic tutorials (works without OpenAI)
- ✅ No more `api.kiro.ai` errors

### Console logs should show:
```
KiroClient initialized with: { baseUrl: "http://localhost:3000/api", ... }
📡 API URL: http://localhost:3000/api/generate-tutorial
🔄 Falling back to basic tutorial generation...
```

## 🎯 Expected Behavior

1. **Without OpenAI API key**: Basic fallback tutorials (still functional!)
2. **With OpenAI API key**: Real AI-generated tutorials

## 🐛 If Still Not Working

1. **Hard refresh**: Ctrl+Shift+R
2. **Check console**: Look for the debug logs
3. **Verify API endpoint**: Visit `http://localhost:3000/api/test`

The system should now work with basic tutorials even without any API keys!