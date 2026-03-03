import { supabase } from '@/services/supabase';

// ============================================================
// Admin Service
// Admin-only operations for content moderation dashboard.
// ============================================================

// --- Types -------------------------------------------------------------------

export interface AdminReport {
  id: string;
  reporter_id: string;
  show_id: string | null;
  episode_id: string | null;
  reason: string;
  description: string | null;
  status: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  created_at: string;
  reporter?: { id: string; display_name: string };
  show?: { id: string; title: string; user_id: string; user_prompt: string; status: string };
  episode?: { id: string; title: string; episode_number: number; status: string };
}

export interface FlaggedUser {
  id: string;
  display_name: string;
  credits_balance: number;
  tier: string;
  moderation_flags: number;
  suspended_until: string | null;
  created_at: string;
}

export interface UserModerationProfile {
  profile: FlaggedUser & { is_admin: boolean };
  moderation_actions: Array<{
    id: string;
    action_type: string;
    reason: string;
    performed_by: string;
    expires_at: string | null;
    created_at: string;
  }>;
  reports_against: AdminReport[];
  auto_moderation_failures: Array<{
    id: string;
    check_type: string;
    input_text: string;
    result: string;
    category: string;
    reason: string;
    created_at: string;
  }>;
  appeals: Array<{
    id: string;
    reason: string;
    status: string;
    admin_response: string | null;
    reviewed_at: string | null;
    created_at: string;
  }>;
}

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

// --- Reports -----------------------------------------------------------------

export async function getReports(
  status?: string,
  limit = 50,
  offset = 0,
): Promise<{ reports: AdminReport[] }> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (status) params.set('status', status);

  const { data, error } = await supabase.functions.invoke(
    `admin-reports?${params.toString()}`,
    { method: 'GET' },
  );

  if (error) throw error;
  return data as { reports: AdminReport[] };
}

export type ReportAction = 'dismiss' | 'warn_user' | 'remove_content' | 'suspend_user' | 'ban_user';

export async function actionReport(
  reportId: string,
  action: ReportAction,
  reviewNotes?: string,
): Promise<void> {
  const { error } = await supabase.functions.invoke('admin-reports', {
    body: { report_id: reportId, action, review_notes: reviewNotes },
  });

  if (error) throw error;
}

// --- Users -------------------------------------------------------------------

export async function getFlaggedUsers(limit = 50, offset = 0): Promise<{ users: FlaggedUser[] }> {
  const params = new URLSearchParams({
    flagged: 'true',
    limit: String(limit),
    offset: String(offset),
  });

  const { data, error } = await supabase.functions.invoke(
    `admin-users?${params.toString()}`,
    { method: 'GET' },
  );

  if (error) throw error;
  return data as { users: FlaggedUser[] };
}

export async function getUserModerationProfile(
  userId: string,
): Promise<UserModerationProfile> {
  const params = new URLSearchParams({ user_id: userId });

  const { data, error } = await supabase.functions.invoke(
    `admin-users?${params.toString()}`,
    { method: 'GET' },
  );

  if (error) throw error;
  return data as UserModerationProfile;
}

export type UserAction = 'warn' | 'suspend' | 'unsuspend' | 'ban' | 'reset_flags';

export async function actionUser(
  userId: string,
  action: UserAction,
  reason?: string,
  durationDays?: number,
): Promise<void> {
  const { error } = await supabase.functions.invoke('admin-users', {
    body: { user_id: userId, action, reason, duration_days: durationDays },
  });

  if (error) throw error;
}

// --- Appeals -----------------------------------------------------------------

export async function reviewAppeal(
  appealId: string,
  decision: 'approved' | 'denied',
  adminResponse?: string,
): Promise<void> {
  const { error } = await supabase.functions.invoke('review-appeal', {
    body: { appeal_id: appealId, decision, admin_response: adminResponse },
  });

  if (error) throw error;
}

// --- Notifications -----------------------------------------------------------

export async function getAdminNotifications(
  limit = 50,
): Promise<AdminNotification[]> {
  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as AdminNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('admin_notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) throw error;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from('admin_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false);

  if (error) throw error;
  return count ?? 0;
}
