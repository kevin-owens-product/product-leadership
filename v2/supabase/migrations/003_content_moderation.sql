-- =============================================================================
-- 003_content_moderation.sql
-- Content moderation tables, user reporting, and admin action tracking
-- =============================================================================

-- =============================================================================
-- TABLE: content_reports
-- User-submitted reports of inappropriate content
-- =============================================================================
CREATE TABLE public.content_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  show_id         UUID REFERENCES public.shows(id) ON DELETE SET NULL,
  episode_id      UUID REFERENCES public.episodes(id) ON DELETE SET NULL,
  reason          TEXT NOT NULL
                    CHECK (reason IN (
                      'illegal_content',
                      'hate_speech',
                      'harassment',
                      'sexual_content',
                      'violence',
                      'dangerous_content',
                      'misinformation',
                      'other'
                    )),
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'reviewing', 'actioned', 'dismissed')),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     TEXT,             -- admin identifier
  review_notes    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_reports_status ON public.content_reports(status);
CREATE INDEX idx_content_reports_show ON public.content_reports(show_id);
CREATE INDEX idx_content_reports_reporter ON public.content_reports(reporter_id);
CREATE INDEX idx_content_reports_created ON public.content_reports(created_at DESC);

COMMENT ON TABLE public.content_reports IS 'User-submitted reports of inappropriate podcast content';

-- =============================================================================
-- TABLE: moderation_actions
-- Admin actions taken against users or content
-- =============================================================================
CREATE TABLE public.moderation_actions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type     TEXT NOT NULL
                    CHECK (action_type IN ('warning', 'content_removed', 'suspended', 'banned')),
  reason          TEXT NOT NULL,
  show_id         UUID REFERENCES public.shows(id) ON DELETE SET NULL,
  report_id       UUID REFERENCES public.content_reports(id) ON DELETE SET NULL,
  performed_by    TEXT NOT NULL,    -- admin identifier
  expires_at      TIMESTAMPTZ,     -- for temporary suspensions
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mod_actions_user ON public.moderation_actions(user_id);
CREATE INDEX idx_mod_actions_type ON public.moderation_actions(action_type);
CREATE INDEX idx_mod_actions_created ON public.moderation_actions(created_at DESC);

COMMENT ON TABLE public.moderation_actions IS 'Admin moderation actions against users or content';

-- =============================================================================
-- TABLE: moderation_log
-- Automated moderation decisions (prompt screening, script checks)
-- =============================================================================
CREATE TABLE public.moderation_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  show_id         UUID REFERENCES public.shows(id) ON DELETE SET NULL,
  episode_id      UUID REFERENCES public.episodes(id) ON DELETE SET NULL,
  check_type      TEXT NOT NULL
                    CHECK (check_type IN ('prompt_screen', 'script_review', 'plan_review')),
  input_text      TEXT NOT NULL,    -- the content that was checked (truncated)
  result          TEXT NOT NULL
                    CHECK (result IN ('pass', 'fail', 'error')),
  category        TEXT,             -- violation category if failed
  reason          TEXT,             -- human-readable explanation
  model_used      TEXT,             -- which model performed the check
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mod_log_user ON public.moderation_log(user_id);
CREATE INDEX idx_mod_log_result ON public.moderation_log(result);
CREATE INDEX idx_mod_log_created ON public.moderation_log(created_at DESC);

COMMENT ON TABLE public.moderation_log IS 'Automated content moderation decisions';

-- =============================================================================
-- Add moderation_flags counter to profiles
-- =============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS moderation_flags INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_log ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reports and read them
CREATE POLICY "reports_insert_own"
  ON public.content_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports_select_own"
  ON public.content_reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- Moderation actions: users can see actions against themselves
CREATE POLICY "mod_actions_select_own"
  ON public.moderation_actions FOR SELECT
  USING (auth.uid() = user_id);

-- Moderation log: users can see their own log entries
CREATE POLICY "mod_log_select_own"
  ON public.moderation_log FOR SELECT
  USING (auth.uid() = user_id);
