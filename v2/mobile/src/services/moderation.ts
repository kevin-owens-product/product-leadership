import { supabase } from '@/services/supabase';
import type {
  ReportContentRequest,
  ContentReport,
  ContentReportReason,
} from '@shared/types';

// ============================================================
// Moderation Service
// Content reporting, appeal submission, and moderation status.
// ============================================================

// --- Report Content ----------------------------------------------------------

export async function reportContent(
  request: ReportContentRequest,
): Promise<{ report_id: string }> {
  const { data, error } = await supabase.functions.invoke('report-content', {
    body: request,
  });

  if (error) throw error;
  return data as { report_id: string };
}

// --- Appeals -----------------------------------------------------------------

export interface AppealStatus {
  appeals: Array<{
    id: string;
    reason: string;
    status: 'pending' | 'reviewing' | 'approved' | 'denied';
    admin_response: string | null;
    created_at: string;
    reviewed_at: string | null;
  }>;
  suspended_until: string | null;
  moderation_flags: number;
}

export async function getAppealStatus(): Promise<AppealStatus> {
  const { data, error } = await supabase.functions.invoke('submit-appeal', {
    method: 'GET',
  });

  if (error) throw error;
  return data as AppealStatus;
}

export async function submitAppeal(reason: string): Promise<{ appeal_id: string }> {
  const { data, error } = await supabase.functions.invoke('submit-appeal', {
    body: { reason },
  });

  if (error) throw error;
  return data as { appeal_id: string };
}

// --- Moderation Status (for profile/create screens) --------------------------

export async function getModerationStatus(): Promise<{
  moderation_flags: number;
  suspended_until: string | null;
}> {
  const { data, error } = await supabase
    .from('profiles')
    .select('moderation_flags, suspended_until')
    .single();

  if (error) throw error;
  return data as { moderation_flags: number; suspended_until: string | null };
}
