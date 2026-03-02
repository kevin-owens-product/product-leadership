import { create } from 'zustand';
import type { PlaybackProgress, Show } from '@shared/types';
import * as showsService from '@/services/shows';
import * as playbackService from '@/services/playback';

// ============================================================
// Library Store
// Manages the user's show library and per-episode progress
// map used to render resume indicators in the UI.
// ============================================================

interface LibraryState {
  // --- State ---
  shows: Show[];
  progressMap: Record<string, PlaybackProgress>;
  isLoading: boolean;
  error: string | null;

  // --- Actions ---
  fetchShows: () => Promise<void>;
  fetchProgress: () => Promise<void>;
  refreshLibrary: () => Promise<void>;
  removeShow: (showId: string) => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  // --- Initial state -------------------------------------------------------
  shows: [],
  progressMap: {},
  isLoading: false,
  error: null,

  // --- Actions -------------------------------------------------------------

  fetchShows: async () => {
    set({ isLoading: true, error: null });
    try {
      const shows = await showsService.getShows();
      set({ shows });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load shows';
      set({ error: message });
      console.error('[LibraryStore] fetchShows failed:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProgress: async () => {
    try {
      const progressList = await playbackService.getAllProgress();
      const progressMap: Record<string, PlaybackProgress> = {};
      for (const p of progressList) {
        progressMap[p.episode_id] = p;
      }
      set({ progressMap });
    } catch (error) {
      console.error('[LibraryStore] fetchProgress failed:', error);
    }
  },

  /**
   * Convenience method: fetches both shows and progress in parallel.
   */
  refreshLibrary: async () => {
    set({ isLoading: true, error: null });
    try {
      await Promise.all([get().fetchShows(), get().fetchProgress()]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to refresh library';
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Archive and remove a show from the local list.
   * Performs an optimistic removal: the show is taken out of the
   * store immediately, then the server request is sent. If it
   * fails the show is added back.
   */
  removeShow: async (showId: string) => {
    const { shows } = get();
    const previousShows = [...shows];

    // Optimistic update
    set({ shows: shows.filter((s) => s.id !== showId) });

    try {
      await showsService.archiveShow(showId);
    } catch (error) {
      // Roll back on failure
      set({ shows: previousShows });
      console.error('[LibraryStore] removeShow failed:', error);
      throw error;
    }
  },
}));
