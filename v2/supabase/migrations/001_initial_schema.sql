-- =============================================================================
-- 001_initial_schema.sql
-- Podcast App V2 - Complete database schema
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- HELPER: updated_at trigger function
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TABLE: profiles
-- Extends auth.users with app-specific fields
-- =============================================================================
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  avatar_url    TEXT,
  credits_balance INTEGER NOT NULL DEFAULT 0,
  tier          TEXT NOT NULL DEFAULT 'free'
                  CHECK (tier IN ('free', 'beta', 'paid')),
  beta_code     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.profiles IS 'User profiles extending auth.users';

-- =============================================================================
-- TABLE: shows
-- User-created podcast shows
-- =============================================================================
CREATE TABLE public.shows (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title                 TEXT,
  subtitle              TEXT,
  description           TEXT,
  icon                  TEXT NOT NULL DEFAULT '🎙️',
  color                 TEXT NOT NULL DEFAULT '#6366f1',
  user_prompt           TEXT NOT NULL,
  generation_config     JSONB,
  status                TEXT NOT NULL DEFAULT 'generating'
                          CHECK (status IN ('generating', 'ready', 'failed', 'archived')),
  episode_count         INTEGER,
  total_duration_minutes INTEGER,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shows_user_id ON public.shows(user_id);
CREATE INDEX idx_shows_status ON public.shows(status);
CREATE INDEX idx_shows_created_at ON public.shows(created_at DESC);

CREATE TRIGGER shows_updated_at
  BEFORE UPDATE ON public.shows
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.shows IS 'User-created podcast shows';

-- =============================================================================
-- TABLE: episodes
-- Individual episodes within a show
-- =============================================================================
CREATE TABLE public.episodes (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id                   UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  episode_number            INTEGER NOT NULL,
  title                     TEXT,
  subtitle                  TEXT,
  script_markdown           TEXT,
  audio_url                 TEXT,
  audio_duration_seconds    INTEGER,
  status                    TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'generating_script', 'generating_audio', 'ready', 'failed')),
  generation_started_at     TIMESTAMPTZ,
  generation_completed_at   TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (show_id, episode_number)
);

CREATE INDEX idx_episodes_show_id ON public.episodes(show_id);
CREATE INDEX idx_episodes_status ON public.episodes(status);

COMMENT ON TABLE public.episodes IS 'Individual episodes within a podcast show';

-- =============================================================================
-- TABLE: playback_progress
-- Tracks user listening progress per episode
-- =============================================================================
CREATE TABLE public.playback_progress (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  episode_id        UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  progress_seconds  INTEGER NOT NULL DEFAULT 0,
  completed         BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, episode_id)
);

CREATE INDEX idx_playback_user_id ON public.playback_progress(user_id);
CREATE INDEX idx_playback_episode_id ON public.playback_progress(episode_id);

CREATE TRIGGER playback_progress_updated_at
  BEFORE UPDATE ON public.playback_progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.playback_progress IS 'Tracks user listening progress per episode';

-- =============================================================================
-- TABLE: bookmarks
-- User bookmarks within episodes
-- =============================================================================
CREATE TABLE public.bookmarks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  episode_id        UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  position_seconds  INTEGER,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX idx_bookmarks_episode_id ON public.bookmarks(episode_id);

COMMENT ON TABLE public.bookmarks IS 'User bookmarks within episodes';

-- =============================================================================
-- TABLE: credit_transactions
-- Ledger of all credit changes
-- =============================================================================
CREATE TABLE public.credit_transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount        INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  type          TEXT NOT NULL
                  CHECK (type IN ('purchase', 'signup_bonus', 'beta_bonus', 'generation_spend', 'refund', 'promo')),
  reference_id  UUID,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_tx_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_tx_type ON public.credit_transactions(type);
CREATE INDEX idx_credit_tx_created_at ON public.credit_transactions(created_at DESC);

COMMENT ON TABLE public.credit_transactions IS 'Immutable ledger of all credit balance changes';

-- =============================================================================
-- TABLE: generation_jobs
-- Tracks async generation work (scripts, audio)
-- =============================================================================
CREATE TABLE public.generation_jobs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id         UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  episode_id      UUID REFERENCES public.episodes(id) ON DELETE SET NULL,
  job_type        TEXT NOT NULL
                    CHECK (job_type IN ('script', 'audio', 'full_show')),
  status          TEXT NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  progress        INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gen_jobs_show_id ON public.generation_jobs(show_id);
CREATE INDEX idx_gen_jobs_status ON public.generation_jobs(status);
CREATE INDEX idx_gen_jobs_episode_id ON public.generation_jobs(episode_id);

COMMENT ON TABLE public.generation_jobs IS 'Tracks async generation jobs for scripts and audio';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on ALL tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playback_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- profiles: users can read and update only their own profile
-- ---------------------------------------------------------------------------
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- shows: users can CRUD only their own shows
-- ---------------------------------------------------------------------------
CREATE POLICY "shows_select_own"
  ON public.shows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "shows_insert_own"
  ON public.shows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shows_update_own"
  ON public.shows FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shows_delete_own"
  ON public.shows FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- episodes: users can access episodes belonging to their own shows
-- ---------------------------------------------------------------------------
CREATE POLICY "episodes_select_own"
  ON public.episodes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shows
      WHERE shows.id = episodes.show_id
        AND shows.user_id = auth.uid()
    )
  );

CREATE POLICY "episodes_insert_own"
  ON public.episodes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shows
      WHERE shows.id = episodes.show_id
        AND shows.user_id = auth.uid()
    )
  );

CREATE POLICY "episodes_update_own"
  ON public.episodes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.shows
      WHERE shows.id = episodes.show_id
        AND shows.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shows
      WHERE shows.id = episodes.show_id
        AND shows.user_id = auth.uid()
    )
  );

CREATE POLICY "episodes_delete_own"
  ON public.episodes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.shows
      WHERE shows.id = episodes.show_id
        AND shows.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- playback_progress: users can CRUD only their own progress
-- ---------------------------------------------------------------------------
CREATE POLICY "playback_select_own"
  ON public.playback_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "playback_insert_own"
  ON public.playback_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "playback_update_own"
  ON public.playback_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "playback_delete_own"
  ON public.playback_progress FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- bookmarks: users can CRUD only their own bookmarks
-- ---------------------------------------------------------------------------
CREATE POLICY "bookmarks_select_own"
  ON public.bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "bookmarks_insert_own"
  ON public.bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bookmarks_update_own"
  ON public.bookmarks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bookmarks_delete_own"
  ON public.bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- credit_transactions: users can only SELECT their own (immutable ledger)
-- ---------------------------------------------------------------------------
CREATE POLICY "credit_tx_select_own"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- generation_jobs: users can read jobs for their own shows
-- ---------------------------------------------------------------------------
CREATE POLICY "gen_jobs_select_own"
  ON public.generation_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shows
      WHERE shows.id = generation_jobs.show_id
        AND shows.user_id = auth.uid()
    )
  );

-- =============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- Creates a profile row with 3 signup bonus credits when a new auth user appears
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create the profile with signup bonus credits
  INSERT INTO public.profiles (id, display_name, credits_balance, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', ''),
    3,
    NOW(),
    NOW()
  );

  -- Record the signup bonus in the credit ledger
  INSERT INTO public.credit_transactions (user_id, amount, balance_after, type, description)
  VALUES (
    NEW.id,
    3,
    3,
    'signup_bonus',
    'Welcome bonus: 3 credits on signup'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger fires after a new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
