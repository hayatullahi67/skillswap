# SkillMentor AI

A Progressive Web App for peer-to-peer skill sharing with AI-powered learning assistance.

## Features

- **AI Tutorial**: Personalized learning paths powered by Gemini 1.5 Flash (via Kiro)
- **Onboarding**: Users enter what skill they want to learn; Gemini generates a personalized learning path with recommended subtopics, interactive breakdowns, and smooth hand-off to the AI Tutorial system
- **Resources**: Access to session summaries, quizzes, and learning materials
- **PWA Support**: Install on mobile devices for native app experience

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **UI**: TailwindCSS + shadcn/ui + Material UI
- **State Management**: Zustand
- **Backend/Database**: Supabase (PostgreSQL, Auth, Realtime)
- **AI**: Gemini 1.5 Flash (via Kiro)
- **Form Handling**: React Hook Form + Zod validation

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account


### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd SkillMentor AI
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Fill in your Supabase and Gemini API credentials in `.env.local`.

4. Set up the database:

Run the SQL commands from the database schema section in your Supabase SQL editor.

5. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The app uses the following Supabase tables:

- `profiles` - User profile information
- `user_skills` - Skills users want to teach/learn
- `sessions` - Learning session records
- `session_resources` - Generated content from sessions
- `availability` - User online status

## Project Structure

```
/app                    # Next.js App Router pages
  /auth                 # Authentication pages
  /dashboard           # Main dashboard
  /live                # Live video sessions
  /ai-tutorial         # AI-powered learning
  /onboarding          # User onboarding
  /resources           # Session history & materials
/components
  /ui                  # Reusable UI components
  /atoms               # Basic components
  /molecules           # Composite components
  /organisms           # Complex components
  /providers           # Context providers
/lib                   # Utility libraries
  supabaseClient.ts    # Supabase configuration
  kiroClient.ts        # AI tutorial client
  peerClient.ts        # WebRTC video calls
  store.ts             # Zustand state management
/styles                # Global styles
```

## Key Features Implementation

### Authentication
- Email/password and Google OAuth via Supabase Auth
- Automatic profile creation on signup
- Protected routes with auth state management

### Live Sessions
- Peer matching based on complementary skills
- WebRTC video calls using PeerJS
- Session recording in database
- Fallback to AI tutorial when no peers available

### AI Tutorial
- Real AI-powered content generation using OpenAI GPT-4
- Dynamic tutorial creation for any skill
- Interactive quizzes and code examples
- Personalized learning paths based on user level
- Fallback system for offline functionality

### PWA Features
- Offline-ready with service worker
- Install prompt for mobile devices
- Native app-like experience
- Push notifications (future enhancement)

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch
 you can also view the web ap from this deployed link skillswap-b6mp.vercel.app/
### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.