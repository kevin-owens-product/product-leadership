-- =============================================================================
-- 004_admin_appeals_ratelimits.sql
-- Admin roles, appeal flow, rate limiting, notification hooks
-- =============================================================================

-- =============================================================================
-- Add admin flag to profiles
-- =============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- =============================================================================
-- TABLE: appeals
-- Users can appeal moderation actions / suspensions
-- =============================================================================
CREATE TABLE public.appeals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_id       UUID REFERENCES public.moderation_actions(id) ON DELETE SET NULL,
  reason          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'reviewing', 'approved', 'denied')),
  admin_response  TEXT,
  reviewed_by     TEXT,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appeals_user ON public.appeals(user_id);
CREATE INDEX idx_appeals_status ON public.appeals(status);
CREATE INDEX idx_appeals_created ON public.appeals(created_at DESC);

COMMENT ON TABLE public.appeals IS 'User appeals against moderation actions or suspensions';

-- =============================================================================
-- TABLE: rate_limits
-- Tracks per-user action counts for rate limiting
-- =============================================================================
CREATE TABLE public.rate_limits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  count       INTEGER NOT NULL DEFAULT 1,

  UNIQUE (user_id, action, window_start)
);

CREATE INDEX idx_rate_limits_user_action ON public.rate_limits(user_id, action);
CREATE INDEX idx_rate_limits_window ON public.rate_limits(window_start);

COMMENT ON TABLE public.rate_limits IS 'Per-user rate limit counters with sliding windows';

-- =============================================================================
-- TABLE: admin_notifications
-- Queue of notifications for admin review
-- =============================================================================
CREATE TABLE public.admin_notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type          TEXT NOT NULL
                  CHECK (type IN ('new_report', 'new_appeal', 'auto_suspension', 'high_flag_count')),
  title         TEXT NOT NULL,
  body          TEXT,
  reference_id  UUID,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_notif_unread ON public.admin_notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_admin_notif_created ON public.admin_notifications(created_at DESC);

COMMENT ON TABLE public.admin_notifications IS 'Notification queue for admin dashboard';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Appeals: users can insert and read their own
CREATE POLICY "appeals_insert_own"
  ON public.appeals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "appeals_select_own"
  ON public.appeals FOR SELECT
  USING (auth.uid() = user_id);

-- Rate limits: no direct user access (service-role only)

-- Admin notifications: no direct user access (service-role only)

-- =============================================================================
-- ADMIN RLS POLICIES
-- Admins can read all content_reports, moderation_actions, moderation_log,
-- appeals, shows, episodes, and profiles for moderation purposes.
-- =============================================================================

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Admin can read all reports
CREATE POLICY "reports_admin_select"
  ON public.content_reports FOR SELECT
  USING (public.is_admin());

-- Admin can update reports (change status, add review notes)
CREATE POLICY "reports_admin_update"
  ON public.content_reports FOR UPDATE
  USING (public.is_admin());

-- Admin can read all moderation actions
CREATE POLICY "mod_actions_admin_select"
  ON public.moderation_actions FOR SELECT
  USING (public.is_admin());

-- Admin can insert moderation actions
CREATE POLICY "mod_actions_admin_insert"
  ON public.moderation_actions FOR INSERT
  WITH CHECK (public.is_admin());

-- Admin can read all moderation log
CREATE POLICY "mod_log_admin_select"
  ON public.moderation_log FOR SELECT
  USING (public.is_admin());

-- Admin can read all appeals
CREATE POLICY "appeals_admin_select"
  ON public.appeals FOR SELECT
  USING (public.is_admin());

-- Admin can update appeals
CREATE POLICY "appeals_admin_update"
  ON public.appeals FOR UPDATE
  USING (public.is_admin());

-- Admin can read all profiles (for user management)
CREATE POLICY "profiles_admin_select"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- Admin can update profiles (suspend, unsuspend, set flags)
CREATE POLICY "profiles_admin_update"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- Admin can read all shows (for content review)
CREATE POLICY "shows_admin_select"
  ON public.shows FOR SELECT
  USING (public.is_admin());

-- Admin can read all episodes (for content review)
CREATE POLICY "episodes_admin_select"
  ON public.episodes FOR SELECT
  USING (public.is_admin());

-- Admin can read/update notifications
CREATE POLICY "admin_notif_select"
  ON public.admin_notifications FOR SELECT
  USING (public.is_admin());

CREATE POLICY "admin_notif_update"
  ON public.admin_notifications FOR UPDATE
  USING (public.is_admin());

-- Admin can insert notifications (edge functions use service role, but just in case)
CREATE POLICY "admin_notif_insert"
  ON public.admin_notifications FOR INSERT
  WITH CHECK (public.is_admin());
