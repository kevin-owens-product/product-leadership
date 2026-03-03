// ============================================================
// Shared types for V2 Podcast App
// Used by both mobile app and Supabase edge functions
// ============================================================

// --- Database row types (match Supabase schema) ---

export interface Profile {
  id: string; // UUID, references auth.users
  display_name: string | null;
  avatar_url: string | null;
  credits_balance: number;
  tier: 'free' | 'beta' | 'paid';
  beta_code: string | null;
  is_admin: boolean;
  moderation_flags: number;
  suspended_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface Show {
  id: string;
  user_id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  icon: string;
  color: string;
  user_prompt: string;
  generation_config: GenerationConfig | null;
  status: ShowStatus;
  episode_count: number;
  total_duration_minutes: number;
  created_at: string;
  updated_at: string;
}

export type ShowStatus = 'generating' | 'ready' | 'failed' | 'archived';

export interface Episode {
  id: string;
  show_id: string;
  episode_number: number;
  title: string;
  subtitle: string | null;
  script_markdown: string | null;
  audio_url: string | null;
  audio_duration_seconds: number | null;
  status: EpisodeStatus;
  generation_started_at: string | null;
  generation_completed_at: string | null;
  created_at: string;
}

export type EpisodeStatus =
  | 'pending'
  | 'generating_script'
  | 'generating_audio'
  | 'ready'
  | 'failed';

export interface PlaybackProgress {
  id: string;
  user_id: string;
  episode_id: string;
  progress_seconds: number;
  completed: boolean;
  updated_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  episode_id: string;
  position_seconds: number;
  note: string | null;
  created_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  balance_after: number;
  type: CreditTransactionType;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

export type CreditTransactionType =
  | 'purchase'
  | 'signup_bonus'
  | 'beta_bonus'
  | 'generation_spend'
  | 'refund'
  | 'promo';

export interface GenerationJob {
  id: string;
  show_id: string;
  episode_id: string | null;
  job_type: 'script' | 'audio' | 'full_show';
  status: GenerationJobStatus;
  progress: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export type GenerationJobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed';

// --- Generation config ---

export interface GenerationConfig {
  episode_count: number;
  episode_length_minutes: 15 | 30 | 60;
  voice_tier: 'standard' | 'premium';
  host_1_name: string;
  host_2_name: string;
}

// --- API request/response types ---

export interface CreateShowRequest {
  user_prompt: string;
  episode_count: number;
  episode_length_minutes: 15 | 30 | 60;
  voice_tier: 'standard' | 'premium';
}

export interface CreateShowResponse {
  show: Show;
  episodes: Episode[];
  job: GenerationJob;
  credits_deducted: number;
  credits_remaining: number;
}

export interface ShowPlanResponse {
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  episodes: Array<{
    number: number;
    title: string;
    subtitle: string;
    outline: string;
  }>;
}

export interface GenerateScriptRequest {
  show_id: string;
  episode_id: string;
}

export interface GenerateAudioRequest {
  show_id: string;
  episode_id: string;
}

export interface PurchaseCreditsRequest {
  pack_id: string;
  receipt: string;
  platform: 'ios' | 'android';
}

// --- Credit packs ---

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price_usd: number;
  apple_product_id: string;
  google_product_id: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 6,
    price_usd: 6.99,
    apple_product_id: 'com.podcastai.credits.starter',
    google_product_id: 'credits_starter',
  },
  {
    id: 'popular',
    name: 'Popular',
    credits: 15,
    price_usd: 14.99,
    apple_product_id: 'com.podcastai.credits.popular',
    google_product_id: 'credits_popular',
  },
  {
    id: 'pro',
    name: 'Pro',
    credits: 40,
    price_usd: 34.99,
    apple_product_id: 'com.podcastai.credits.pro',
    google_product_id: 'credits_pro',
  },
];

// --- Credit costs ---

export function calculateCreditsNeeded(
  episodeCount: number,
  lengthMinutes: 15 | 30 | 60,
  voiceTier: 'standard' | 'premium'
): number {
  let creditsPerEpisode: number;
  switch (lengthMinutes) {
    case 15:
      creditsPerEpisode = 1;
      break;
    case 30:
      creditsPerEpisode = 1;
      break;
    case 60:
      creditsPerEpisode = 2;
      break;
  }
  const premiumAddon = voiceTier === 'premium' ? 1 : 0;
  return episodeCount * (creditsPerEpisode + premiumAddon);
}

// --- Content reporting ---

export interface ContentReport {
  id: string;
  reporter_id: string;
  show_id: string | null;
  episode_id: string | null;
  reason: ContentReportReason;
  description: string | null;
  status: 'pending' | 'reviewing' | 'actioned' | 'dismissed';
  reviewed_at: string | null;
  created_at: string;
}

export type ContentReportReason =
  | 'illegal_content'
  | 'hate_speech'
  | 'harassment'
  | 'sexual_content'
  | 'violence'
  | 'dangerous_content'
  | 'misinformation'
  | 'other';

export interface ReportContentRequest {
  show_id?: string;
  episode_id?: string;
  reason: ContentReportReason;
  description?: string;
}

// --- Appeals ---

export interface Appeal {
  id: string;
  user_id: string;
  action_id: string | null;
  reason: string;
  status: 'pending' | 'reviewing' | 'approved' | 'denied';
  admin_response: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// --- Moderation actions ---

export interface ModerationAction {
  id: string;
  user_id: string;
  action_type: 'warning' | 'content_removed' | 'suspended' | 'banned';
  reason: string;
  show_id: string | null;
  report_id: string | null;
  performed_by: string;
  expires_at: string | null;
  created_at: string;
}

// --- Dialogue parsing (ported from V1) ---

export interface DialogueLine {
  speaker: string;
  text: string;
  type: 'host1' | 'host2';
  rawLineIndex: number;
}

export interface Chapter {
  title: string;
  startSeconds: number;
  endSeconds: number;
  duration: number;
  lineIndex: number;
}

// --- TTS types ---

export type TTSProvider = 'openai' | 'openai-hd' | 'elevenlabs';

export interface TTSConfig {
  provider: TTSProvider;
  voice1: string; // Voice ID for host 1
  voice2: string; // Voice ID for host 2
}

export const TTS_CONFIGS: Record<'standard' | 'premium', TTSConfig> = {
  standard: {
    provider: 'openai',
    voice1: 'onyx',
    voice2: 'nova',
  },
  premium: {
    provider: 'openai-hd',
    voice1: 'onyx',
    voice2: 'nova',
  },
};
