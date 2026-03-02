import { supabase } from '@/services/supabase';
import type { Bookmark, PlaybackProgress } from '@shared/types';

// ============================================================
// Playback Service
// Manages playback progress and bookmarks for episodes.
// ============================================================

// --- Progress ---------------------------------------------------------------

/**
 * Get playback progress for a single episode.
 * Returns `null` if the user has never started this episode.
 */
export async function getProgress(
  episodeId: string,
): Promise<PlaybackProgress | null> {
  const { data, error } = await supabase
    .from('playback_progress')
    .select('*')
    .eq('episode_id', episodeId)
    .maybeSingle();

  if (error) throw error;
  return data as PlaybackProgress | null;
}

/**
 * Upsert playback progress for an episode.
 *
 * Uses `episode_id` + current user's id (enforced by RLS) as the
 * conflict target so we never create duplicate rows.
 */
export async function updateProgress(
  episodeId: string,
  seconds: number,
  completed?: boolean,
): Promise<PlaybackProgress> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('playback_progress')
    .upsert(
      {
        user_id: user.id,
        episode_id: episodeId,
        progress_seconds: seconds,
        completed: completed ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,episode_id' },
    )
    .select()
    .single();

  if (error) throw error;
  return data as PlaybackProgress;
}

/**
 * Fetch all playback progress rows for the current user.
 * Useful for the library screen to show resume indicators.
 */
export async function getAllProgress(): Promise<PlaybackProgress[]> {
  const { data, error } = await supabase
    .from('playback_progress')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as PlaybackProgress[];
}

// --- Bookmarks --------------------------------------------------------------

export async function getBookmarks(episodeId: string): Promise<Bookmark[]> {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('episode_id', episodeId)
    .order('position_seconds', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Bookmark[];
}

export async function addBookmark(
  episodeId: string,
  positionSeconds: number,
  note?: string,
): Promise<Bookmark> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('bookmarks')
    .insert({
      user_id: user.id,
      episode_id: episodeId,
      position_seconds: positionSeconds,
      note: note ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Bookmark;
}

export async function deleteBookmark(bookmarkId: string): Promise<void> {
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('id', bookmarkId);

  if (error) throw error;
}
