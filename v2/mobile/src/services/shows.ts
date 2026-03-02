import { supabase } from '@/services/supabase';
import type {
  CreateShowRequest,
  CreateShowResponse,
  Episode,
  GenerationJob,
  Show,
} from '@shared/types';
import { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================
// Shows Service
// CRUD operations and realtime subscriptions for shows &
// episodes.
// ============================================================

// --- Create -----------------------------------------------------------------

export async function createShow(
  request: CreateShowRequest,
): Promise<CreateShowResponse> {
  const { data, error } = await supabase.functions.invoke('create-show', {
    body: request,
  });

  if (error) throw error;
  return data as CreateShowResponse;
}

// --- Read -------------------------------------------------------------------

export async function getShows(): Promise<Show[]> {
  const { data, error } = await supabase
    .from('shows')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Show[];
}

export async function getShow(
  showId: string,
): Promise<{ show: Show; episodes: Episode[] }> {
  const [showResult, episodesResult] = await Promise.all([
    supabase.from('shows').select('*').eq('id', showId).single(),
    supabase
      .from('episodes')
      .select('*')
      .eq('show_id', showId)
      .order('episode_number', { ascending: true }),
  ]);

  if (showResult.error) throw showResult.error;
  if (episodesResult.error) throw episodesResult.error;

  return {
    show: showResult.data as Show,
    episodes: (episodesResult.data ?? []) as Episode[],
  };
}

export async function getEpisodes(showId: string): Promise<Episode[]> {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('show_id', showId)
    .order('episode_number', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Episode[];
}

// --- Update / Delete --------------------------------------------------------

export async function archiveShow(showId: string): Promise<void> {
  const { error } = await supabase
    .from('shows')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', showId);

  if (error) throw error;
}

export async function deleteShow(showId: string): Promise<void> {
  const { error } = await supabase.from('shows').delete().eq('id', showId);

  if (error) throw error;
}

// --- Realtime ---------------------------------------------------------------

/**
 * Subscribe to realtime changes on a show and its episodes.
 *
 * Returns a RealtimeChannel – the caller is responsible for calling
 * `channel.unsubscribe()` when done (e.g. in a useEffect cleanup).
 */
export function subscribeToShowUpdates(
  showId: string,
  callback: (payload: {
    type: 'show' | 'episode';
    record: Show | Episode;
  }) => void,
): RealtimeChannel {
  const channel = supabase
    .channel(`show-updates:${showId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'shows',
        filter: `id=eq.${showId}`,
      },
      (payload) => {
        callback({ type: 'show', record: payload.new as Show });
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'episodes',
        filter: `show_id=eq.${showId}`,
      },
      (payload) => {
        callback({ type: 'episode', record: payload.new as Episode });
      },
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to realtime changes on a generation job.
 *
 * Returns a RealtimeChannel – caller must unsubscribe when done.
 */
export function subscribeToGenerationJob(
  jobId: string,
  callback: (job: GenerationJob) => void,
): RealtimeChannel {
  const channel = supabase
    .channel(`generation-job:${jobId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'generation_jobs',
        filter: `id=eq.${jobId}`,
      },
      (payload) => {
        callback(payload.new as GenerationJob);
      },
    )
    .subscribe();

  return channel;
}
