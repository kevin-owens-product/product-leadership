# Podcast App: V1 Preservation + V2 Consumer App Plan

## Executive Summary

Transform the existing personal podcast PWA (V1) into a consumer-grade mobile app (V2) where users describe a podcast concept and AI generates full multi-episode shows with professional TTS narration. V1 remains untouched as a personal tool. V2 is a new React Native app backed by Supabase, with AI script generation (Claude API), professional TTS (ElevenLabs), per-podcast credit billing (RevenueCat + Stripe), and distribution via App Store and Google Play.

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
                   │ Claude   │              │ElevenLabs│ │Stripe│
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
| **TTS** | ElevenLabs API | Professional multi-voice audio, already integrated in V1 tools |
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

### Actual Cost Per Episode (What We Pay)

Before setting prices, here are the real API costs per episode:

**ElevenLabs TTS** (~1,000 characters = ~1 minute of audio):
- Scale plan ($330/mo) includes 2M characters = ~2,000 minutes of audio
- In-plan effective rate: **$0.165 per minute** of audio
- Overage rate: **$0.18 per 1,000 characters** (~$0.18/min)
- Flash model (faster, lower quality) uses 0.5 credits/char = **half the cost**

**Claude API** (Sonnet 4.6 for script generation):
- Input: $3.00 per 1M tokens / Output: $15.00 per 1M tokens
- A 30-min episode script is ~7,000 output tokens + ~3,500 input tokens
- Cost per episode: ~$0.12

**Per-Episode Cost Breakdown:**

| Episode Length | ElevenLabs (Standard) | ElevenLabs (Flash) | Claude API | Total (Standard) | Total (Flash) |
|---------------|----------------------|-------------------|------------|-----------------|---------------|
| **~15 min** | $2.48 | $1.24 | $0.08 | **$2.56** | **$1.32** |
| **~30 min** | $4.95 | $2.48 | $0.12 | **$5.07** | **$2.60** |
| **~60 min** | $9.90 | $4.95 | $0.20 | **$10.10** | **$5.15** |

**Per-Show Cost (6 episodes x ~30 min):**

| TTS Model | ElevenLabs | Claude API | Total |
|-----------|-----------|------------|-------|
| Standard (highest quality) | $29.70 | $0.75 | **$30.45** |
| Flash (good quality, recommended) | $14.85 | $0.75 | **$15.60** |

> **Key insight:** ElevenLabs is ~95% of the variable cost. Claude API is negligible.
> **Recommendation:** Default to Flash model. Offer Standard as a "premium voices" upsell.

### Credit Model (Cost-Covering)

1 credit = 1 episode generation. Credits cost more for longer episodes.

| Action | Credits |
|--------|---------|
| Sign up (bonus) | 2 free credits |
| Beta user bonus | 3 bonus credits |
| Generate 1 episode (~15 min) | 1 credit |
| Generate 1 episode (~30 min) | 2 credits |
| Generate 1 episode (~60 min) | 4 credits |

### Credit Pack Pricing (In-App Purchase via RevenueCat)

Apple/Google take a **30% cut** of all IAP revenue (15% if under $1M/year via Small Business Program).
Pricing must cover: API costs + platform cut + margin.

**Using Flash TTS (recommended default). Cost per credit ≈ $1.32.**

| Pack | Credits | Price | After 30% cut | Revenue/credit | Our cost/credit | Gross margin |
|------|---------|-------|---------------|----------------|-----------------|-------------|
| **Try It** | 5 | $14.99 | $10.49 | $2.10 | $1.32 | **37%** |
| **Popular** | 12 | $29.99 | $20.99 | $1.75 | $1.32 | **25%** |
| **Pro** | 30 | $69.99 | $48.99 | $1.63 | $1.32 | **19%** |

**What users actually pay for common scenarios:**

| What the user creates | Credits needed | Cheapest pack | User pays |
|-----------------------|---------------|---------------|-----------|
| 1 short podcast (3 eps x 15 min) | 3 credits | Try It (5) | $14.99 |
| 1 standard podcast (6 eps x 30 min) | 12 credits | Popular (12) | $29.99 |
| 2 standard podcasts | 24 credits | Pro (30) | $69.99 |
| 1 deep-dive podcast (6 eps x 60 min) | 24 credits | Pro (30) | $69.99 |

### Margin Sanity Check

**A user buys the "Popular" pack ($29.99) and creates a 6-episode, 30-min podcast:**

```
Revenue:                    $29.99
- Apple/Google cut (30%):   -$9.00
= Net revenue:              $20.99

Generation costs:
  ElevenLabs (Flash, 6 eps): -$14.85
  Claude API (6 eps):        -$0.75
= Total cost:               -$15.60

Gross profit:                $5.39  (18% margin)
```

**Same scenario with Small Business Program (15% cut):**
```
Revenue:                    $29.99
- Apple/Google cut (15%):   -$4.50
= Net revenue:              $25.49

Generation costs:           -$15.60

Gross profit:                $9.89  (33% margin)
```

> **Important:** The Small Business Program (15% cut) applies while annual revenue is under $1M. At launch, this will apply and margins are healthy at ~33%. If the app scales past $1M, the 30% cut kicks in and margins drop to ~18% — at which point volume pricing with ElevenLabs or switching to a cheaper TTS becomes critical.

### Free Credits: Cost of Acquisition

| Scenario | Free credits | Our cost (Flash) | Notes |
|----------|-------------|-------------------|-------|
| New signup | 2 credits | $2.64 | Enough for 2 short episodes or 1 x 30-min |
| Beta tester | 3 bonus credits | $3.96 | Total 5 credits with signup bonus |

At 1,000 signups, free credits cost us **~$2,640**. This is the user acquisition budget — acceptable if conversion rate is >15%.

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

### ElevenLabs Voice Selection

| Character | Voice | Voice ID | Style |
|-----------|-------|----------|-------|
| Alex (Expert) | Adam | `pNInz6obpgDQGcFmaJgB` | Confident, knowledgeable |
| Sam (Interviewer) | Bella | `EXAVITQu4vr4xnSDxMaL` | Warm, curious |

Users could pick from a curated set of voice pairs in a future update.

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

**ElevenLabs** ([pricing page](https://elevenlabs.io/pricing/api)):
- ~1,000 characters = ~1 minute of generated audio
- Scale plan: $330/mo for 2M characters (2,000 min of audio)
- Overage: $0.18 per 1,000 characters
- Flash model uses 0.5 credits/character (effectively half price)

**Anthropic Claude API** ([pricing page](https://platform.claude.com/docs/en/about-claude/pricing)):
- Sonnet 4.6: $3/1M input tokens, $15/1M output tokens
- Haiku 4.5: $1/1M input tokens, $5/1M output tokens (viable for script gen if quality is sufficient)

### Per-Episode Variable Costs (Flash TTS + Sonnet)

| Component | 15-min episode | 30-min episode | 60-min episode |
|-----------|---------------|---------------|----------------|
| ElevenLabs Flash (~$0.083/min) | $1.24 | $2.48 | $4.95 |
| Claude Sonnet (script gen) | $0.08 | $0.12 | $0.20 |
| Supabase Storage (~15-60 MB) | ~$0.00 | ~$0.00 | ~$0.01 |
| **Total variable cost** | **$1.32** | **$2.60** | **$5.16** |

### Per-Podcast Variable Costs (6 episodes x 30 min = standard show)

| Item | Cost |
|------|------|
| ElevenLabs Flash (180 min audio) | $14.85 |
| Claude Sonnet (6 scripts + 1 planning call) | $0.75 |
| Supabase Storage (~180 MB) | ~$0.01 |
| **Total per standard show** | **$15.60** |

### Monthly Fixed Infrastructure Costs

| Service | Cost | Notes |
|---------|------|-------|
| Supabase Pro | $25/mo | 50K MAU, 8GB DB, 250GB bandwidth |
| ElevenLabs Scale (base) | $330/mo | 2M chars included (~133 episodes at Flash) |
| Anthropic Claude API | Pay-per-use | ~$0.12/episode, negligible |
| RevenueCat | $0 | Free under $2,500/mo tracked revenue |
| Expo EAS Build | $0 | 30 builds/mo free tier |
| Sentry | $0 | 5K events/mo free tier |
| Apple Developer Program | $8.25/mo | ($99/year) |
| Google Play Developer | one-time $25 | |
| **Total fixed** | **~$363/mo** | Before any overage |

### Break-Even Analysis

**How many podcasts does the $330/mo ElevenLabs Scale plan cover?**
- 2M characters / (30,000 chars × 6 episodes × 0.5 Flash multiplier) = **~22 standard shows/mo included**
- Beyond that: overage at $0.18/1,000 chars

**Monthly break-even at different scales (Flash TTS, Small Business 15% cut):**

| Metric | 50 users | 200 users | 1,000 users |
|--------|----------|-----------|-------------|
| Paying users (15% conversion) | 8 | 30 | 150 |
| Shows generated/mo | ~10 | ~35 | ~175 |
| Avg. revenue/show (Popular pack) | $29.99 | $29.99 | $29.99 |
| **Gross revenue** | **$300** | **$1,050** | **$5,250** |
| Apple/Google cut (15%) | -$45 | -$158 | -$788 |
| ElevenLabs (Scale + overage) | -$330 | -$522 | -$2,841 |
| Claude API | -$1 | -$4 | -$21 |
| Supabase | -$25 | -$25 | -$50 |
| Other fixed costs | -$8 | -$8 | -$8 |
| **Net profit/loss** | **-$109** | **$333** | **$1,542** |
| **Margin** | **-36%** | **32%** | **29%** |

> **Break-even point: ~120 paying users generating ~15 shows/month.**
> Below that, the $330/mo ElevenLabs base cost dominates. Above it, margins stabilize at ~30%.

### Revenue Scaling: When 30% App Store Cut Kicks In

If annual revenue exceeds $1M (~$83K/mo), Apple/Google take 30% instead of 15%.
At that scale (~2,800 shows/mo), you'd need to:

1. **Negotiate ElevenLabs enterprise pricing** (they offer custom pricing at volume)
2. **Evaluate alternative TTS**: PlayHT, LMNT, or self-hosted open-source (Bark, XTTS)
3. **Optimize scripts**: Tighter prompts → shorter scripts → fewer characters → lower TTS cost
4. **Consider a subscription tier**: Monthly subscription with included shows smooths revenue

### Key Economic Levers

| Lever | Impact | When to Pull |
|-------|--------|-------------|
| Switch to ElevenLabs Flash model | Cuts TTS cost ~50% | Day 1 (default) |
| Offer Standard voices as premium upsell | Extra $5-10/show revenue | Launch |
| Use Claude Haiku instead of Sonnet for scripts | Saves ~$0.08/ep (negligible) | Not worth the quality tradeoff |
| Negotiate ElevenLabs volume pricing | 20-40% TTS savings | At ~500+ shows/mo |
| Self-host TTS (XTTS/Bark on GPU) | 80-90% TTS savings | At ~1000+ shows/mo, if quality acceptable |
| Add subscription tier ($19.99/mo for 2 shows) | Predictable revenue, higher LTV | Post-launch, once retention data exists |

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
| High generation costs eat margins | Medium | High | Monitor unit economics, explore cheaper TTS, optimize prompts |
| ElevenLabs pricing changes | Low | High | Abstract TTS provider, evaluate alternatives |
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
| **Audio Pipeline** | ElevenLabs API | Professional TTS audio generation |
| **Payments** | RevenueCat + Stripe | Per-podcast credit purchases via IAP |
| **Distribution** | App Store + Play Store | Public consumer app |

**Timeline:** ~18 weeks from start to public launch, with closed beta at week 14.
