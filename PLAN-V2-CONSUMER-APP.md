# Podcast App: V1 Preservation + V2 Consumer App Plan

## Executive Summary

Transform the existing personal podcast PWA (V1) into a consumer-grade mobile app (V2) where users describe a podcast concept and AI generates full multi-episode shows with professional TTS narration. V1 remains untouched as a personal tool. V2 is a new React Native app backed by Supabase, with AI script generation (Claude API), tiered TTS (OpenAI tts-1 default at $0.45/episode, with OpenAI tts-1-hd premium upsell), per-podcast credit billing (RevenueCat), and distribution via App Store and Google Play.

---

## Table of Contents

1. [V1 Preservation Strategy](#1-v1-preservation-strategy)
2. [V2 Architecture Overview](#2-v2-architecture-overview)
3. [Backend Design (Supabase)](#3-backend-design-supabase)
4. [AI Content Generation Pipeline](#4-ai-content-generation-pipeline)
5. [React Native App Structure](#5-react-native-app-structure)
6. [Credit System & Payments](#6-credit-system--payments)
7. [Audio Generation Pipeline](#7-audio-generation-pipeline)
8. [Beta Launch Strategy](#8-beta-launch-strategy)
9. [App Store Submission](#9-app-store-submission)
10. [Phased Roadmap](#10-phased-roadmap)
11. [Cost Estimates](#11-cost-estimates)
12. [Risk Mitigation](#12-risk-mitigation)

---

## 1. V1 Preservation Strategy

**Goal:** V1 continues operating exactly as it does today - zero changes.

### What Stays the Same
- V1 lives at its current Netlify URL
- Static PWA with markdown content baked into `podcasts.js` at build time
- Browser-based Web Speech API for TTS
- All state in localStorage
- No auth, no backend dependency
- Your existing podcast series (The Forge, Claude Code Mastery, Tech Leadership, etc.)

### Repository Organization

```
product-leadership/
├── podcasts/                    # V1 - UNCHANGED
│   ├── pwa/                     # Existing PWA app
│   │   ├── dist/                # Build output (Netlify deploys this)
│   │   ├── src/                 # Current app source
│   │   ├── tests/               # Current tests
│   │   ├── index.html
│   │   ├── build-episodes.js
│   │   └── sw.js
│   ├── shows/                   # Your hand-authored content
│   └── tools/                   # ElevenLabs generator, etc.
│
├── v2/                          # V2 - NEW CONSUMER APP
│   ├── mobile/                  # React Native app
│   │   ├── src/
│   │   ├── ios/
│   │   ├── android/
│   │   ├── app.json
│   │   └── package.json
│   ├── supabase/                # Supabase config, migrations, edge functions
│   │   ├── migrations/
│   │   ├── functions/
│   │   └── config.toml
│   └── shared/                  # Shared types, constants
│       └── types.ts
│
├── PLAN-V2-CONSUMER-APP.md      # This document
└── ...existing files
```

### Deployment Separation
| Aspect | V1 | V2 |
|--------|----|----|
| **Hosting** | Netlify (existing) | Supabase + App Stores |
| **Domain** | Current URL | New domain (e.g., podcastai.app) |
| **Build** | `node build-episodes.js` | `npx expo build` / EAS Build |
| **Auth** | None | Supabase Auth |
| **Data** | localStorage | Supabase Postgres |

---

## 2. V2 Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Native App (Expo)                     │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Auth     │  │  Create  │  │  Player  │  │  My Library   │  │
│  │  Screens  │  │  Podcast │  │  Screen  │  │  Screen       │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  expo-av (audio)  │  RevenueCat (payments)  │  Zustand   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Supabase                                 │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Auth     │  │ Postgres │  │ Storage  │  │ Edge          │  │
│  │  (email,  │  │ (users,  │  │ (audio   │  │ Functions     │  │
│  │  Google,  │  │  shows,  │  │  files)  │  │ (generation   │  │
│  │  Apple)   │  │  credits)│  │          │  │  pipeline)    │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────┬───────┘  │
└─────────────────────────────────────────────────────┼───────────┘
                                                      │
                          ┌───────────────────────────┼──────┐
                          │                           │      │
                          ▼                           ▼      ▼
                   ┌──────────┐              ┌──────────┐ ┌──────┐
                   │ Claude   │              │ OpenAI   │ │Stripe│
                   │ API      │              │ TTS API  │ │      │
                   │ (scripts)│              │ (audio)  │ │      │
                   └──────────┘              └──────────┘ └──────┘
```

### Tech Stack Summary

| Layer | Technology | Why |
|-------|-----------|-----|
| **Mobile** | React Native + Expo | Cross-platform, JS-based (matches V1 skills), Expo simplifies builds |
| **Navigation** | Expo Router | File-based routing, deep linking support |
| **State** | Zustand | Lightweight, simple, good React Native support |
| **Audio** | expo-av | Native audio playback for pre-generated MP3s |
| **Backend** | Supabase | Auth + Postgres + Storage + Edge Functions in one |
| **AI Scripts** | Claude API (Anthropic) | Best quality for long-form dialogue generation |
| **TTS (default)** | OpenAI tts-1 API | 11x cheaper than ElevenLabs, good quality, no monthly minimum |
| **TTS (premium)** | OpenAI tts-1-hd | Higher fidelity upsell; ElevenLabs as future "Ultra" tier |
| **Payments** | RevenueCat + Stripe | RevenueCat handles App Store/Play Store IAP; Stripe for web |
| **Builds** | EAS Build (Expo) | Cloud builds for iOS/Android without local Xcode/Android Studio |
| **Analytics** | PostHog or Mixpanel | Product analytics, funnel tracking |

---

## 3. Backend Design (Supabase)

### Database Schema

```sql
-- Users (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  credits_balance INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'free', -- 'free', 'beta', 'paid'
  beta_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Podcast shows created by users
CREATE TABLE shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  icon TEXT DEFAULT '🎙️',
  color TEXT DEFAULT '#6366f1',
  user_prompt TEXT NOT NULL,           -- Original user description
  generation_config JSONB,             -- AI generation parameters
  status TEXT NOT NULL DEFAULT 'generating',
    -- 'generating', 'ready', 'failed', 'archived'
  episode_count INTEGER NOT NULL DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Episodes within a show
CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  script_markdown TEXT,                -- The generated dialogue script
  audio_url TEXT,                      -- Supabase Storage URL for MP3
  audio_duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
    -- 'pending', 'generating_script', 'generating_audio',
    -- 'ready', 'failed'
  generation_started_at TIMESTAMPTZ,
  generation_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(show_id, episode_number)
);

-- User playback progress
CREATE TABLE playback_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  progress_seconds INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, episode_id)
);

-- User bookmarks
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  position_seconds INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Credit transactions (audit trail)
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,             -- positive = added, negative = spent
  balance_after INTEGER NOT NULL,
  type TEXT NOT NULL,
    -- 'purchase', 'signup_bonus', 'beta_bonus', 'generation_spend',
    -- 'refund', 'promo'
  reference_id UUID,                   -- e.g., show_id for generation_spend
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generation jobs (async pipeline tracking)
CREATE TABLE generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,              -- 'script', 'audio', 'full_show'
  status TEXT NOT NULL DEFAULT 'queued',
    -- 'queued', 'processing', 'completed', 'failed'
  progress INTEGER DEFAULT 0,          -- 0-100
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE playback_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "users_own_profiles" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "users_own_shows" ON shows
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_episodes" ON episodes
  FOR ALL USING (
    show_id IN (SELECT id FROM shows WHERE user_id = auth.uid())
  );

CREATE POLICY "users_own_progress" ON playback_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_bookmarks" ON bookmarks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_shows_user_id ON shows(user_id);
CREATE INDEX idx_episodes_show_id ON episodes(show_id);
CREATE INDEX idx_playback_user_episode ON playback_progress(user_id, episode_id);
CREATE INDEX idx_bookmarks_user_episode ON bookmarks(user_id, episode_id);
CREATE INDEX idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX idx_generation_jobs_show ON generation_jobs(show_id);
CREATE INDEX idx_generation_jobs_status ON generation_jobs(status);
```

### Supabase Storage Buckets

```
audio/
  └── {show_id}/
      └── episode-{number}.mp3       # Generated MP3 files

avatars/
  └── {user_id}.jpg                  # Profile pictures
```

### Edge Functions

```
supabase/functions/
├── create-show/                     # Validates prompt, deducts credits, kicks off generation
│   └── index.ts
├── generate-script/                 # Calls Claude API to generate episode scripts
│   └── index.ts
├── generate-audio/                  # Calls ElevenLabs to convert scripts to audio
│   └── index.ts
├── webhook-stripe/                  # Handles Stripe payment webhooks
│   └── index.ts
├── webhook-revenucat/               # Handles RevenueCat subscription webhooks
│   └── index.ts
└── purchase-credits/                # Initiates credit purchase flow
    └── index.ts
```

---

## 4. AI Content Generation Pipeline

### User Flow: "Describe Your Podcast"

```
User opens app
    → Taps "Create Podcast"
    → Sees creation form:
        ┌──────────────────────────────────────┐
        │  What's your podcast about?          │
        │  ┌──────────────────────────────────┐│
        │  │ "A deep dive into the history    ││
        │  │  of space exploration, covering  ││
        │  │  key missions from Apollo to     ││
        │  │  Mars rovers. Conversational     ││
        │  │  style between two hosts who     ││
        │  │  are passionate about space."    ││
        │  └──────────────────────────────────┘│
        │                                      │
        │  Number of episodes: [6 ▾]           │
        │  Episode length:     [~30 min ▾]     │
        │                                      │
        │  ⚡ This will use 6 credits          │
        │                                      │
        │  [    Generate My Podcast    ]       │
        └──────────────────────────────────────┘
```

### Generation Pipeline (Server-Side)

```
Step 1: SHOW PLANNING (Claude API)
─────────────────────────────────────
Input: User prompt + episode count + length preference
Output: Show metadata + episode outline

Prompt to Claude:
  "You are a podcast producer. Given this concept: {user_prompt}
   Plan a {episode_count}-episode podcast series.
   Each episode should be ~{length} minutes of dialogue.

   Return JSON:
   {
     title: "Show Title",
     subtitle: "Tagline",
     description: "2-3 sentence description",
     episodes: [
       { number: 1, title: "...", subtitle: "...", outline: "..." }
     ]
   }"

Step 2: SCRIPT GENERATION (Claude API, per episode)
─────────────────────────────────────
Input: Show concept + episode outline + series context
Output: Full dialogue markdown (matching V1 format)

Prompt to Claude:
  "You are a podcast scriptwriter. Write Episode {n}: '{title}'
   for the podcast '{show_title}'.

   Concept: {user_prompt}
   Episode outline: {outline}
   Previous episode summaries: {summaries}

   Write a ~{length}-minute dialogue between two hosts:
   - Alex: The knowledgeable expert
   - Sam: The curious interviewer

   Format as markdown dialogue:
   **ALEX:** Opening line...
   **SAM:** Response...

   Include:
   - ### INTRO section
   - ### SEGMENT sections with (N minutes) durations
   - ### CLOSING section
   - Natural conversation flow with follow-up questions
   - Concrete examples and stories
   - Smooth transitions between segments"

Step 3: AUDIO GENERATION (ElevenLabs API, per episode)
─────────────────────────────────────
Input: Dialogue markdown
Output: MP3 file uploaded to Supabase Storage

Process:
  1. Parse markdown into dialogue lines (reuse V1's parsing logic)
  2. For each line:
     - Select voice based on speaker (Alex → male voice, Sam → female voice)
     - Call ElevenLabs text-to-speech API
     - Collect audio chunks
  3. Concatenate all chunks into single MP3 (using ffmpeg or audio concat)
  4. Upload MP3 to Supabase Storage
  5. Update episode record with audio_url and duration

Step 4: NOTIFICATION
─────────────────────────────────────
  - Update show status to 'ready'
  - Send push notification: "Your podcast '{title}' is ready to listen!"
  - Update generation_jobs table
```

### Generation Timing Estimates

| Step | Per Episode | 6 Episodes |
|------|------------|------------|
| Show Planning | 10-15 sec | 10-15 sec |
| Script Generation | 30-60 sec | 3-6 min |
| Audio Generation | 5-10 min | 30-60 min |
| **Total** | - | **~35-65 min** |

### UX During Generation

Since generation takes significant time, the app shows a progress screen:

```
┌──────────────────────────────────────┐
│  🎙️ Creating: Space Exploration     │
│  ━━━━━━━━━━━━━━━━░░░░  67%          │
│                                      │
│  ✅ Episode 1: The Apollo Era        │
│  ✅ Episode 2: Shuttle Years         │
│  ✅ Episode 3: Mars or Bust          │
│  🔄 Episode 4: The Private Race     │
│     Generating audio...              │
│  ⬜ Episode 5: Moon Base Alpha       │
│  ⬜ Episode 6: Journey to Mars       │
│                                      │
│  You can close the app - we'll       │
│  notify you when it's ready!         │
└──────────────────────────────────────┘
```

The app polls `generation_jobs` table via Supabase Realtime subscriptions for live progress updates.

---

## 5. React Native App Structure

### Project Setup

```bash
npx create-expo-app v2/mobile --template tabs
cd v2/mobile
npx expo install expo-av expo-notifications expo-secure-store
npm install @supabase/supabase-js zustand react-native-purchases
```

### Directory Structure

```
v2/mobile/
├── app/                          # Expo Router (file-based routing)
│   ├── (auth)/                   # Auth group (unauthenticated)
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── onboarding.tsx
│   ├── (tabs)/                   # Main tab navigator
│   │   ├── index.tsx             # Home / My Library
│   │   ├── create.tsx            # Create Podcast
│   │   ├── discover.tsx          # Browse featured / community (future)
│   │   └── profile.tsx           # Account, credits, settings
│   ├── show/[id].tsx             # Show detail / episode list
│   ├── player/[episodeId].tsx    # Full-screen player
│   ├── _layout.tsx               # Root layout
│   └── +not-found.tsx
│
├── src/
│   ├── components/
│   │   ├── ui/                   # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── CreditBadge.tsx
│   │   ├── player/
│   │   │   ├── MiniPlayer.tsx    # Bottom bar persistent player
│   │   │   ├── PlayerControls.tsx
│   │   │   ├── ProgressSlider.tsx
│   │   │   ├── ChapterList.tsx
│   │   │   ├── TranscriptView.tsx
│   │   │   └── SpeedControl.tsx
│   │   ├── create/
│   │   │   ├── PromptInput.tsx
│   │   │   ├── OptionsSelector.tsx
│   │   │   └── GenerationProgress.tsx
│   │   └── library/
│   │       ├── ShowCard.tsx
│   │       └── EpisodeRow.tsx
│   │
│   ├── stores/                   # Zustand stores
│   │   ├── authStore.ts
│   │   ├── playerStore.ts
│   │   ├── libraryStore.ts
│   │   └── creditStore.ts
│   │
│   ├── services/
│   │   ├── supabase.ts           # Supabase client init
│   │   ├── auth.ts               # Auth helpers
│   │   ├── shows.ts              # Show CRUD operations
│   │   ├── playback.ts           # Progress sync
│   │   ├── credits.ts            # Credit operations
│   │   └── notifications.ts     # Push notification setup
│   │
│   ├── hooks/
│   │   ├── useAudioPlayer.ts     # expo-av player hook
│   │   ├── useGenerationStatus.ts # Realtime generation updates
│   │   └── useCredits.ts         # Credit balance hook
│   │
│   ├── lib/
│   │   ├── parseDialogue.ts      # Port of V1's dialogue parser
│   │   ├── parseChapters.ts      # Port of V1's chapter parser
│   │   └── formatTime.ts         # Time formatting utilities
│   │
│   └── constants/
│       ├── theme.ts              # Colors, fonts, spacing
│       └── config.ts             # API URLs, feature flags
│
├── assets/
│   ├── icon.png
│   ├── splash.png
│   └── adaptive-icon.png
│
├── app.json                      # Expo config
├── eas.json                      # EAS Build config
├── package.json
└── tsconfig.json
```

### Key Screens

#### Home / My Library
```
┌──────────────────────────────────┐
│  My Podcasts            ⚡ 12    │  ← Credit balance
│                                  │
│  ┌────────┐  ┌────────┐        │
│  │ 🚀     │  │ 🏛️     │        │
│  │ Space   │  │ Roman  │        │
│  │ Explore │  │ Empire │        │
│  │ 4/6 ▶  │  │ Ready  │        │
│  └────────┘  └────────┘        │
│                                  │
│  ┌────────┐  ┌────────┐        │
│  │ 🔄     │  │ ➕     │        │
│  │ AI &   │  │        │        │
│  │ Ethics │  │ Create │        │
│  │ 67%... │  │ New    │        │
│  └────────┘  └────────┘        │
│                                  │
│──────────────────────────────────│
│  🏠 Home  ➕ Create  👤 Profile │
└──────────────────────────────────┘
```

#### Player
```
┌──────────────────────────────────┐
│  ←  Space Exploration            │
│      Episode 3: Mars or Bust     │
│                                  │
│          🚀                      │
│    Space Exploration             │
│    Episode 3 of 6               │
│                                  │
│  12:34 ━━━━━━━━░░░░░░░ 31:20   │
│                                  │
│     ⏪15   ▶️   ⏩30            │
│                                  │
│   1.0x    🔖    💤 Timer        │
│                                  │
│  ┌──────────────────────────────┐│
│  │ Chapters │ Transcript │ 🔖  ││
│  │──────────────────────────────││
│  │  ✅ Intro              0:00 ││
│  │  ▶  Early Mars missions 5:30 ││
│  │     Curiosity rover    12:00 ││
│  │     Perseverance       19:45 ││
│  │     Future missions    25:00 ││
│  └──────────────────────────────┘│
└──────────────────────────────────┘
```

### Audio Playback (V2 vs V1)

| Aspect | V1 (Web Speech API) | V2 (Pre-generated MP3) |
|--------|---------------------|------------------------|
| **Quality** | Robotic, platform-dependent | Professional ElevenLabs voices |
| **Offline** | Requires TTS engine | Standard audio file caching |
| **Seeking** | Line-by-line only | True audio seeking |
| **Background** | Stops when tab hidden | Native background audio |
| **Lock Screen** | No controls | Full media controls |
| **CarPlay/Auto** | Not supported | Supported via expo-av |

---

## 6. Credit System & Payments

### TTS Provider Comparison (March 2026 Pricing)

TTS is ~95% of the variable cost per episode, so the provider choice determines the entire business model.
All pricing below is per 1 million characters. ~1,000 characters = ~1 minute of audio.

| Provider | Model | Cost / 1M chars | Cost / 30-min episode | Quality | Voices | Voice Cloning |
|----------|-------|-----------------|----------------------|---------|--------|--------------|
| **OpenAI** | tts-1 (standard) | **$15** | **$0.45** | Good, natural | 13 built-in | No |
| **OpenAI** | tts-1-hd | $30 | $0.90 | Very good | 13 built-in | No |
| **Google Cloud** | Neural2 / WaveNet | $16 | $0.48 | Good | 100+ | No |
| **Google Cloud** | Chirp 3 HD | $30 | $0.90 | Very good | Fewer | No |
| **Google Cloud** | Standard | $4 | $0.12 | Basic/robotic | 100+ | No |
| **ElevenLabs** | Flash v2.5 | ~$83 (Scale plan) | $2.48 | Very good | 100+ library | Yes |
| **ElevenLabs** | Multilingual v2 | ~$165 (Scale plan) | $4.95 | Best-in-class | 100+ library | Yes |
| **PlayHT** | Unlimited plan | $49/mo flat* | ~$0.59* | Good | 120+ | Yes |
| **Fish Audio** | API | ~$50-70 est. | ~$1.50-2.10 | Good | 2M+ community | Yes |

*PlayHT Unlimited has a 2.5M char/mo fair use cap (~83 episodes). Overage is $0.40/1K chars — worse than ElevenLabs.

**The standout finding: OpenAI tts-1 is 5-11x cheaper than ElevenLabs** with decent quality.

### Cost Per Episode by Provider (What We Actually Pay)

Using the recommended provider for each tier. Claude API cost (~$0.12/ep) included in all.

| Episode Length | OpenAI tts-1 | OpenAI tts-1-hd | Google Neural2 | ElevenLabs Flash |
|---------------|-------------|-----------------|----------------|-----------------|
| **~15 min** | **$0.31** | **$0.53** | **$0.32** | **$1.32** |
| **~30 min** | **$0.57** | **$1.02** | **$0.60** | **$2.60** |
| **~60 min** | **$1.10** | **$2.00** | **$1.16** | **$5.15** |

### Cost Per Show (6 episodes x ~30 min)

| Provider | TTS Cost | Claude API | Total | vs. ElevenLabs Flash |
|----------|---------|------------|-------|---------------------|
| **OpenAI tts-1** | $2.70 | $0.75 | **$3.45** | **78% cheaper** |
| **OpenAI tts-1-hd** | $5.40 | $0.75 | **$6.15** | **61% cheaper** |
| **Google Neural2** | $2.88 | $0.75 | **$3.63** | **77% cheaper** |
| **ElevenLabs Flash** | $14.85 | $0.75 | **$15.60** | baseline |
| **ElevenLabs Standard** | $29.70 | $0.75 | **$30.45** | 95% more expensive |

### Recommended Strategy: Tiered TTS

Offer two voice quality tiers to maximize both accessibility and margin:

| Tier | TTS Provider | Cost/30-min ep | User experience |
|------|-------------|---------------|-----------------|
| **Standard Voices** (default) | OpenAI tts-1 | $0.45 | Good natural voices, 13 options, solid for most users |
| **Premium Voices** (upsell) | ElevenLabs Flash | $2.48 | Superior naturalness, voice cloning potential, 100+ voices |

This lets us price the default tier aggressively to drive adoption, while Premium Voices becomes a high-margin upsell.

### Credit Model (Cost-Covering)

1 credit = 1 episode generation.

| Action | Credits |
|--------|---------|
| Sign up (bonus) | 3 free credits |
| Beta user bonus | 5 bonus credits |
| Generate 1 episode (~15 min, standard voices) | 1 credit |
| Generate 1 episode (~30 min, standard voices) | 1 credit |
| Generate 1 episode (~60 min, standard voices) | 2 credits |
| **Premium voices add-on** | +1 credit per episode |

### Credit Pack Pricing (In-App Purchase via RevenueCat)

Apple/Google take a **30% cut** of IAP revenue (15% under $1M/year via Small Business Program).

**Using OpenAI tts-1 as default. Cost per credit ≈ $0.57 (30-min episode).**

| Pack | Credits | Price | After 30% cut | Revenue/credit | Our cost/credit | Gross margin |
|------|---------|-------|---------------|----------------|-----------------|-------------|
| **Starter** | 6 | $4.99 | $3.49 | $0.58 | $0.57 | **2%** |
| **Popular** | 15 | $9.99 | $6.99 | $0.47 | $0.57 | **-21%** |

Those margins are too thin/negative at 30% cut. But with the **Small Business Program (15% cut)**:

| Pack | Credits | Price | After 15% cut | Revenue/credit | Our cost/credit | Gross margin |
|------|---------|-------|---------------|----------------|-----------------|-------------|
| **Starter** | 6 | $4.99 | $4.24 | $0.71 | $0.57 | **20%** |
| **Popular** | 15 | $9.99 | $8.49 | $0.57 | $0.57 | **0%** |

Still tight. Let's price to guarantee margin at BOTH 30% and 15% cut:

| Pack | Credits | Price | After 30% cut | After 15% cut | Our cost | Margin (30%) | Margin (15%) |
|------|---------|-------|---------------|---------------|----------|-------------|-------------|
| **Starter** | 6 | $6.99 | $4.89 | $5.94 | $3.42 | **30%** | **42%** |
| **Popular** | 15 | $14.99 | $10.49 | $12.74 | $8.55 | **19%** | **33%** |
| **Pro** | 40 | $34.99 | $24.49 | $29.74 | $22.80 | **7%** | **23%** |

**What users actually pay for common scenarios (Standard Voices):**

| What the user creates | Credits needed | Cheapest pack | User pays |
|-----------------------|---------------|---------------|-----------|
| 1 short podcast (3 eps x 15 min) | 3 credits | Starter (6) | $6.99 |
| 1 standard podcast (6 eps x 30 min) | 6 credits | Starter (6) | $6.99 |
| 2 standard podcasts | 12 credits | Popular (15) | $14.99 |
| 1 deep-dive podcast (6 eps x 60 min) | 12 credits | Popular (15) | $14.99 |
| 5 standard podcasts | 30 credits | Pro (40) | $34.99 |

**With Premium Voices (ElevenLabs), same podcast costs +1 credit/episode:**

| What the user creates | Credits needed | Pack | User pays |
|-----------------------|---------------|------|-----------|
| 1 standard podcast (6 eps x 30 min) | 12 credits (6 base + 6 premium) | Popular (15) | $14.99 |

### Margin Sanity Check

**User buys "Starter" ($6.99) and creates a 6-episode, 30-min podcast with Standard Voices:**

```
Revenue:                    $6.99
- Apple/Google cut (15%):   -$1.05
= Net revenue:              $5.94

Generation costs:
  OpenAI tts-1 (6 eps):    -$2.70
  Claude API (6 eps):       -$0.75
= Total cost:              -$3.45

Gross profit:               $2.49  (36% margin)
```

**Same with 30% cut (post-$1M revenue):**
```
Revenue:                    $6.99
- Apple/Google cut (30%):   -$2.10
= Net revenue:              $4.89

Generation costs:           -$3.45

Gross profit:               $1.44  (21% margin)
```

**User buys "Popular" ($14.99) and creates a 6-ep podcast with Premium Voices (ElevenLabs):**

```
Revenue:                    $14.99
- Apple/Google cut (15%):   -$2.25
= Net revenue:              $12.74

Generation costs:
  ElevenLabs Flash (6 eps): -$14.85
  Claude API (6 eps):       -$0.75
= Total cost:              -$15.60

Gross profit:              -$2.86  (-22% margin) ❌ LOSS
```

> **Premium Voices with ElevenLabs at the Popular tier loses money.** Options:
> 1. Price premium voice add-on at +2 credits/episode instead of +1 (user pays $14.99-$34.99 for a premium show)
> 2. Only offer ElevenLabs at Pro tier pricing
> 3. Use OpenAI tts-1-hd as the "premium" tier instead ($0.90/ep vs $2.48/ep)

**Recommended: Use OpenAI tts-1-hd as "Premium Voices" instead of ElevenLabs.**

```
Revenue (Popular):          $14.99
- Apple/Google cut (15%):   -$2.25
= Net revenue:              $12.74

Generation costs:
  OpenAI tts-1-hd (6 eps): -$5.40
  Claude API (6 eps):       -$0.75
= Total cost:              -$6.15

Gross profit:               $6.59  (44% margin) ✅
```

This makes the premium tier highly profitable while standard stays accessible.

### Free Credits: Cost of Acquisition

| Scenario | Free credits | Our cost (OpenAI tts-1) | Notes |
|----------|-------------|-------------------------|-------|
| New signup | 3 credits | $1.71 | Enough for 3 short episodes or 1 standard podcast (if 15-min eps) |
| Beta tester | 5 bonus credits | $2.85 | Total 8 credits with signup bonus — generous |

At 1,000 signups, free credits cost us **~$1,710** (vs $2,640 with ElevenLabs). Much more affordable user acquisition.

### Payment Architecture

```
Mobile App (RevenueCat SDK)
    │
    ├── iOS → Apple IAP → RevenueCat webhook → Supabase Edge Function
    │                                              → credits added to profile
    │
    └── Android → Google Play IAP → RevenueCat webhook → Supabase Edge Function
                                                          → credits added to profile
```

**Why RevenueCat?**
- Handles App Store and Play Store billing complexity
- Manages receipts, refunds, and entitlements
- Single SDK for both platforms
- Webhook integration for server-side credit fulfillment
- Free up to $2,500/month in tracked revenue

### Credit Flow for Generation

```
1. User taps "Generate" (6 episodes × 30 min × 2 credits = 12 credits)
2. Edge function: create-show
   a. Check credits_balance >= 12
   b. BEGIN TRANSACTION
   c. Deduct 6 credits from profile
   d. Insert credit_transaction (type: 'generation_spend')
   e. Create show record (status: 'generating')
   f. Create 6 episode records (status: 'pending')
   g. Create generation_job record
   h. COMMIT
3. Trigger async generation pipeline
4. If generation fails:
   a. Refund credits
   b. Insert credit_transaction (type: 'refund')
   c. Notify user
```

---

## 7. Audio Generation Pipeline

### Architecture (Supabase Edge Functions + Background Jobs)

Since Supabase Edge Functions have a 150-second timeout, long-running audio generation needs a job queue approach:

```
Option A: Supabase Edge Function chain
─────────────────────────────────────────
create-show function
    → Inserts generation_jobs (status: 'queued')
    → Triggers pg_net HTTP call to generate-script function

generate-script function (per episode)
    → Calls Claude API (~30-60 sec)
    → Saves script to episodes table
    → Triggers generate-audio function via pg_net

generate-audio function (per episode)
    → Parses dialogue lines
    → Calls ElevenLabs per line (batched)
    → Concatenates audio
    → Uploads to Supabase Storage
    → Updates episode status to 'ready'
    → If last episode, updates show status to 'ready'

Option B: External worker (if Edge Functions too limiting)
─────────────────────────────────────────
Supabase triggers → webhook to worker service (Railway/Fly.io)
Worker picks up jobs from generation_jobs table
Processes scripts + audio with longer timeouts
Updates Supabase tables directly
```

**Recommendation:** Start with Option A (Edge Function chain with pg_net). Move to Option B only if Edge Function timeouts become a problem.

### Voice Selection by Tier

**Standard Voices (OpenAI tts-1) — default:**

| Character | Voice | Style |
|-----------|-------|-------|
| Alex (Expert) | `onyx` | Deep, authoritative |
| Sam (Interviewer) | `nova` | Warm, conversational |

OpenAI offers 13 voices: alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer, and verse. Pairs should be tested for best contrast in a two-host podcast format.

**Premium Voices (OpenAI tts-1-hd) — upsell:**

Same voice names as standard, but higher-fidelity audio generation. Twice the cost, noticeably better quality.

**Future: ElevenLabs integration (post-launch):**

| Character | Voice | Voice ID | Style |
|-----------|-------|----------|-------|
| Alex (Expert) | Adam | `pNInz6obpgDQGcFmaJgB` | Confident, knowledgeable |
| Sam (Interviewer) | Bella | `EXAVITQu4vr4xnSDxMaL` | Warm, curious |

ElevenLabs can be added as a third "Ultra" tier once unit economics support it, or if voice cloning becomes a key differentiator. The TTS provider is abstracted behind an interface so swapping providers requires no app changes.

### Audio Format

- **Format:** MP3, 128kbps
- **Storage:** Supabase Storage bucket `audio/`
- **Caching:** App downloads and caches locally for offline playback
- **Size estimate:** ~1 MB per minute → ~30 MB for a 30-min episode

---

## 8. Beta Launch Strategy

### Phase 1: Closed Beta (Invite Only)

**Duration:** 4-6 weeks

**Access:** Beta codes distributed manually (friends, early supporters)

**Beta Features:**
- Sign up with email + beta code
- 5 free credits on signup (2 signup bonus + 3 beta bonus)
- Create podcasts from descriptions
- Full player with chapters, bookmarks, transcript
- Basic profile and credit purchase

**Beta Goals:**
- Validate the core loop: describe → generate → listen
- Test generation quality and reliability
- Measure credit economics (cost per podcast vs. revenue)
- Gather feedback on UX and audio quality
- Identify bugs on real iOS/Android devices

**Beta Distribution:**
- iOS: TestFlight (up to 10,000 testers, no App Store review needed)
- Android: Google Play Internal Testing track

**Feedback Collection:**
- In-app feedback button (sends to a Supabase table or email)
- Beta Discord/Slack channel for community feedback
- Crash reporting via Sentry

### Phase 2: Open Beta

**Duration:** 4-6 weeks after closed beta

**Changes from Closed Beta:**
- Remove beta code requirement
- Reduce signup bonus to 2 credits (no beta bonus)
- Enable credit purchases (real money)
- Add onboarding flow
- Polish based on closed beta feedback

**Distribution:**
- iOS: TestFlight (open link)
- Android: Google Play Open Testing track

---

## 9. App Store Submission

### Pre-Submission Checklist

**Apple App Store (iOS):**
- [ ] Apple Developer Account ($99/year)
- [ ] App icons (1024x1024 + all required sizes)
- [ ] Screenshots for iPhone 6.7", 6.5", 5.5" + iPad
- [ ] Privacy policy URL (required)
- [ ] Terms of service URL
- [ ] App Store description and keywords
- [ ] Age rating questionnaire
- [ ] In-App Purchase configuration in App Store Connect
- [ ] Sign in with Apple implementation (required if offering social login)
- [ ] App Review guidelines compliance check
- [ ] IDFA/ATT declaration

**Google Play Store (Android):**
- [ ] Google Play Developer Account ($25 one-time)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots for phone + tablet
- [ ] Privacy policy URL
- [ ] Content rating questionnaire
- [ ] Data safety section
- [ ] In-App Purchase products in Play Console
- [ ] Target API level compliance

### App Store Review Considerations

**Potential Issues & Mitigations:**

1. **AI-Generated Content**: Apple/Google may scrutinize AI content apps
   - Mitigation: Content moderation on generated scripts (filter inappropriate content)
   - Clear disclosure that content is AI-generated

2. **In-App Purchases**: Must use platform IAP for digital goods
   - RevenueCat handles this correctly for both platforms

3. **Background Audio**: Need proper audio session configuration
   - expo-av handles this; declare background audio capability

4. **User Data**: GDPR/CCPA compliance
   - Account deletion capability (required by Apple)
   - Data export option
   - Clear privacy policy

---

## 10. Phased Roadmap

### Phase 0: Foundation (Weeks 1-3)
> Set up the development environment and core infrastructure

- [ ] Initialize Expo project with TypeScript
- [ ] Set up Supabase project (database, auth, storage)
- [ ] Run database migrations (create all tables)
- [ ] Configure Supabase Auth (email + Apple + Google sign-in)
- [ ] Set up EAS Build for iOS and Android
- [ ] Basic navigation structure (auth screens, tab navigator)
- [ ] Supabase client integration in app
- [ ] Set up CI (GitHub Actions: lint, type-check, test)

### Phase 1: Core Creation Flow (Weeks 3-6)
> Users can describe and generate podcasts

- [ ] "Create Podcast" screen with prompt input and options
- [ ] `create-show` Edge Function (validates, deducts credits, creates records)
- [ ] `generate-script` Edge Function (Claude API integration)
- [ ] `generate-audio` Edge Function (ElevenLabs integration)
- [ ] Generation progress tracking (Supabase Realtime)
- [ ] Generation progress UI in app
- [ ] Push notifications when generation completes
- [ ] Basic "My Library" showing created podcasts

### Phase 2: Player (Weeks 6-9)
> Full audio playback experience

- [ ] Audio player using expo-av
- [ ] Background audio playback + lock screen controls
- [ ] Player UI (progress bar, play/pause, skip, speed control)
- [ ] Chapter parsing and chapter list (port from V1)
- [ ] Transcript view with dialogue rendering (port from V1)
- [ ] Bookmarks (save position with notes)
- [ ] Playback progress sync to Supabase
- [ ] Offline audio caching (download episodes)
- [ ] Mini player (persistent bottom bar)
- [ ] Sleep timer

### Phase 3: Credits & Payments (Weeks 9-11)
> Monetization infrastructure

- [ ] RevenueCat SDK integration
- [ ] Credit pack IAP products (App Store Connect + Play Console)
- [ ] `purchase-credits` Edge Function
- [ ] RevenueCat webhook handler
- [ ] Credit balance display in app
- [ ] Purchase flow UI
- [ ] Receipt validation
- [ ] Refund handling for failed generations

### Phase 4: Polish & Beta (Weeks 11-14)
> Get ready for real users

- [ ] Onboarding flow (first-time user experience)
- [ ] Profile screen (account management, credit history)
- [ ] Account deletion flow (Apple requirement)
- [ ] Content moderation on generated scripts
- [ ] Error handling and retry flows
- [ ] Loading states and skeleton screens
- [ ] Haptic feedback on key interactions
- [ ] App icons, splash screen, screenshots
- [ ] TestFlight + Play Internal Testing setup
- [ ] Sentry crash reporting
- [ ] In-app feedback mechanism
- [ ] **Launch Closed Beta**

### Phase 5: Open Beta → Launch (Weeks 14-18)
> Iterate based on feedback and submit to stores

- [ ] Address closed beta feedback
- [ ] Performance optimization
- [ ] Analytics integration (PostHog/Mixpanel)
- [ ] App Store optimization (ASO: description, keywords, screenshots)
- [ ] Privacy policy and terms of service pages
- [ ] Submit to App Store and Play Store review
- [ ] Open beta while awaiting review
- [ ] **Public Launch**

### Future Enhancements (Post-Launch)
- [ ] Voice selection (pick from multiple host voice pairs)
- [ ] Podcast sharing (share links, public podcast pages)
- [ ] Discover/browse community-created podcasts
- [ ] Subscription tier (unlimited credits per month)
- [ ] Episode regeneration ("make this episode more technical")
- [ ] Custom host names and personas
- [ ] Podcast RSS feed generation (listen in Apple Podcasts, Spotify)
- [ ] Web app version of V2
- [ ] Multi-language support
- [ ] Podcast artwork generation (AI image generation)
- [ ] Social features (likes, follows, comments)

---

## 11. Cost Estimates

### Real API Pricing Sources (March 2026)

**OpenAI TTS** ([pricing page](https://openai.com/api/pricing/)):
- tts-1 (standard): **$15 per 1M characters** — $0.015/1K chars
- tts-1-hd: **$30 per 1M characters** — $0.030/1K chars
- Pay-as-you-go, no monthly commitment, 13 built-in voices
- ~1,000 characters = ~1 minute of audio

**ElevenLabs** ([pricing page](https://elevenlabs.io/pricing/api)):
- Scale plan: $330/mo for 2M characters = ~$165/1M chars (11x more expensive than OpenAI)
- Flash model: ~$83/1M chars (5.5x more expensive than OpenAI)
- Overage: $0.18/1K chars
- Best voice quality, voice cloning, 100+ voices

**Google Cloud TTS** ([pricing page](https://cloud.google.com/text-to-speech/pricing)):
- Neural2/WaveNet: **$16 per 1M characters** — comparable to OpenAI
- Chirp 3 HD: $30/1M chars
- Free tier: 1M Neural2 chars/mo + 4M Standard chars/mo

**Anthropic Claude API** ([pricing page](https://platform.claude.com/docs/en/about-claude/pricing)):
- Sonnet 4.6: $3/1M input tokens, $15/1M output tokens
- Per episode: ~$0.12 (negligible vs TTS costs)

### Per-Episode Variable Costs (OpenAI tts-1 default + Sonnet)

| Component | 15-min episode | 30-min episode | 60-min episode |
|-----------|---------------|---------------|----------------|
| OpenAI tts-1 (~$0.015/min) | $0.23 | $0.45 | $0.90 |
| Claude Sonnet (script gen) | $0.08 | $0.12 | $0.20 |
| Supabase Storage (~15-60 MB) | ~$0.00 | ~$0.00 | ~$0.01 |
| **Total variable cost** | **$0.31** | **$0.57** | **$1.11** |

### Per-Podcast Variable Costs (6 episodes x 30 min = standard show)

| TTS Provider | TTS Cost | Claude API | Total | Notes |
|-------------|---------|------------|-------|-------|
| **OpenAI tts-1** | $2.70 | $0.75 | **$3.45** | Default — best margins |
| OpenAI tts-1-hd | $5.40 | $0.75 | **$6.15** | Premium upsell |
| Google Neural2 | $2.88 | $0.75 | **$3.63** | Comparable to OpenAI |
| ElevenLabs Flash | $14.85 | $0.75 | **$15.60** | Future "Ultra" tier |

### Monthly Fixed Infrastructure Costs

| Service | Cost | Notes |
|---------|------|-------|
| Supabase Pro | $25/mo | 50K MAU, 8GB DB, 250GB bandwidth |
| OpenAI TTS API | Pay-per-use only | No base fee — $0.45 per 30-min episode |
| Anthropic Claude API | Pay-per-use | ~$0.12/episode, negligible |
| RevenueCat | $0 | Free under $2,500/mo tracked revenue |
| Expo EAS Build | $0 | 30 builds/mo free tier |
| Sentry | $0 | 5K events/mo free tier |
| Apple Developer Program | $8.25/mo | ($99/year) |
| Google Play Developer | one-time $25 | |
| **Total fixed** | **~$33/mo** | No $330/mo ElevenLabs subscription needed |

> **Switching from ElevenLabs to OpenAI eliminates the $330/mo fixed cost entirely.** OpenAI is pure pay-per-use with no monthly minimum. This drops the monthly floor from ~$363 to ~$33.

### Break-Even Analysis

**Monthly break-even at different scales (OpenAI tts-1, Small Business 15% cut):**

Assuming average purchase is "Starter" pack ($6.99) generating one 6-ep show:

| Metric | 50 users | 200 users | 1,000 users |
|--------|----------|-----------|-------------|
| Paying users (15% conversion) | 8 | 30 | 150 |
| Shows generated/mo | ~10 | ~35 | ~175 |
| Avg. revenue/show (Starter pack) | $6.99 | $6.99 | $6.99 |
| **Gross revenue** | **$70** | **$245** | **$1,049** |
| Apple/Google cut (15%) | -$10 | -$37 | -$157 |
| OpenAI TTS | -$35 | -$121 | -$604 |
| Claude API | -$1 | -$4 | -$21 |
| Supabase + fixed | -$33 | -$33 | -$50 |
| **Net profit/loss** | **-$9** | **$50** | **$217** |
| **Margin** | **-13%** | **20%** | **21%** |

> **Break-even point: ~40 paying users** generating ~5 shows/month.
> Dramatically better than the ~120 users needed with ElevenLabs, because there's no $330/mo base cost.

### Revenue Scaling: Optimistic Scenario

At 1,000 users with a mix of packs (some Popular/Pro, some premium voice upsells):

| Metric | Conservative ($6.99 avg) | Mixed ($10 avg) | With premium upsells ($14 avg) |
|--------|--------------------------|-----------------|-------------------------------|
| Gross revenue (150 buyers) | $1,049/mo | $1,500/mo | $2,100/mo |
| Variable costs | -$625 | -$700 | -$950 |
| Fixed costs | -$50 | -$50 | -$50 |
| Platform cut (15%) | -$157 | -$225 | -$315 |
| **Net** | **$217** | **$525** | **$785** |

### Key Economic Levers

| Lever | Impact | When to Pull |
|-------|--------|-------------|
| Use OpenAI tts-1 as default | 5-11x cheaper than ElevenLabs, no monthly min | Day 1 (default) |
| Offer tts-1-hd as "Premium Voices" | 2x TTS cost but high-margin upsell | Launch |
| Google Cloud free tier for prototyping | 1M Neural2 chars/mo free (~33 episodes) | Development/beta |
| Add ElevenLabs as "Ultra" tier | Best quality, highest price point | Post-launch if demand exists |
| Use Claude Haiku instead of Sonnet | Saves ~$0.08/ep (negligible) | Not worth the quality tradeoff |
| Abstract TTS provider behind interface | Swap providers without app changes | Day 1 (architecture) |
| Add subscription tier ($9.99/mo for 2 shows) | Predictable revenue, higher LTV | Post-launch, once retention data exists |

---

## 12. Risk Mitigation

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| ElevenLabs API rate limits | Medium | High | Queue system, retry logic, consider multiple API keys |
| Long generation times frustrate users | High | Medium | Push notifications, progress tracking, email when ready |
| Claude generates poor scripts | Low | High | Prompt engineering, quality checks, user regeneration option |
| App Store rejection | Medium | High | Follow guidelines strictly, content moderation, early TestFlight |
| Supabase Edge Function timeouts | Medium | Medium | Chain functions, move to external worker if needed |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Low conversion rate | Medium | High | Generous free credits, quality onboarding, iterate on pricing |
| High generation costs eat margins | Low | Medium | OpenAI tts-1 keeps costs at $0.57/ep; TTS provider is abstracted for easy swaps |
| OpenAI TTS pricing changes | Low | Medium | Abstract TTS provider; Google Neural2 at $16/1M is a direct swap |
| Competition from Notebook LM etc. | High | Medium | Focus on custom podcast creation as differentiator |
| App Store policy changes on AI content | Low | High | Stay compliant, diversify distribution (web app) |

### Content Safety

- **Input moderation:** Screen user prompts for prohibited content before generation
- **Output moderation:** Review generated scripts for harmful content before audio generation
- **Reporting:** In-app mechanism for users to report problematic content
- **Rate limiting:** Prevent abuse of generation pipeline

---

## Summary: What Gets Built

| Component | Technology | Key Deliverable |
|-----------|-----------|-----------------|
| **V1 (unchanged)** | Vanilla JS PWA | Continues working at current URL |
| **V2 Mobile App** | React Native + Expo | iOS + Android app |
| **V2 Backend** | Supabase | Auth, DB, Storage, Edge Functions |
| **AI Pipeline** | Claude API | Script generation from user descriptions |
| **Audio Pipeline** | OpenAI TTS API (default) | Standard + Premium voice tiers, ElevenLabs as future option |
| **Payments** | RevenueCat | Per-podcast credit purchases via IAP |
| **Distribution** | App Store + Play Store | Public consumer app |

**Timeline:** ~18 weeks from start to public launch, with closed beta at week 14.
