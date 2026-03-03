// ============================================================
// Shared admin utilities
// Auth guard, notification helpers, rate-limit checks
// ============================================================

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Verify the calling user is an admin. Returns userId or throws.
// ---------------------------------------------------------------------------

export async function requireAdmin(
  supabaseUser: SupabaseClient,
  supabaseAdmin: SupabaseClient,
  authHeader: string,
): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabaseUser.auth.getUser(authHeader.replace('Bearer ', ''))

  if (error || !user) {
    throw { status: 401, message: 'Invalid or expired token' }
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    throw { status: 403, message: 'Admin access required' }
  }

  return user.id
}

// ---------------------------------------------------------------------------
// Verify the calling user is authenticated. Returns userId or throws.
// ---------------------------------------------------------------------------

export async function requireAuth(
  supabaseUser: SupabaseClient,
  authHeader: string,
): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabaseUser.auth.getUser(authHeader.replace('Bearer ', ''))

  if (error || !user) {
    throw { status: 401, message: 'Invalid or expired token' }
  }

  return user.id
}

// ---------------------------------------------------------------------------
// Create an admin notification
// ---------------------------------------------------------------------------

export async function createAdminNotification(
  supabaseAdmin: SupabaseClient,
  opts: {
    type: 'new_report' | 'new_appeal' | 'auto_suspension' | 'high_flag_count'
    title: string
    body?: string
    referenceId?: string
  },
) {
  try {
    await supabaseAdmin.from('admin_notifications').insert({
      type: opts.type,
      title: opts.title,
      body: opts.body || null,
      reference_id: opts.referenceId || null,
    })
  } catch (err) {
    console.error('Failed to create admin notification:', err)
  }
}

// ---------------------------------------------------------------------------
// Check rate limit — returns true if the action is allowed
// ---------------------------------------------------------------------------

export async function checkRateLimit(
  supabaseAdmin: SupabaseClient,
  userId: string,
  action: string,
  maxPerWindow: number,
  windowMinutes: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const windowStart = new Date()
  windowStart.setMinutes(windowStart.getMinutes() - windowMinutes)

  // Count actions in the current window
  const { count } = await supabaseAdmin
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', action)
    .gte('window_start', windowStart.toISOString())

  const currentCount = count ?? 0
  const allowed = currentCount < maxPerWindow
  const resetAt = new Date()
  resetAt.setMinutes(resetAt.getMinutes() + windowMinutes)

  if (allowed) {
    // Record this action
    await supabaseAdmin.from('rate_limits').insert({
      user_id: userId,
      action,
      window_start: new Date().toISOString(),
    })
  }

  return {
    allowed,
    remaining: Math.max(0, maxPerWindow - currentCount - (allowed ? 1 : 0)),
    resetAt,
  }
}
