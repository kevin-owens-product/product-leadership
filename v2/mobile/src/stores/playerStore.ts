import { create } from 'zustand';
import TrackPlayer, { Event, State } from 'react-native-track-player';
import type { Episode, Show } from '@shared/types';
import * as playbackService from '@/services/playback';

// ============================================================
// Player Store
// Controls audio playback via react-native-track-player and
// keeps track of position, rate, and an optional sleep timer.
// ============================================================

interface PlayerState {
  // --- State ---
  currentEpisode: Episode | null;
  currentShow: Show | null;
  isPlaying: boolean;
  isLoading: boolean;
  positionSeconds: number;
  durationSeconds: number;
  playbackRate: number;
  sleepTimerEndTime: number | null;

  // --- Actions ---
  loadEpisode: (show: Show, episode: Episode) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  toggle: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  skipForward: (seconds?: number) => Promise<void>;
  skipBack: (seconds?: number) => Promise<void>;
  setPlaybackRate: (rate: number) => Promise<void>;
  setSleepTimer: (minutes: number) => void;
  clearSleepTimer: () => void;
  syncProgress: () => Promise<void>;

  // Internal – not part of the public API but exposed on the store
  // so that cleanup is straightforward.
  _cleanup: () => Promise<void>;
}

// ---------- Module-level refs (not serialisable) ----------

let progressSyncTimer: ReturnType<typeof setTimeout> | null = null;
let sleepTimerInterval: ReturnType<typeof setInterval> | null = null;

// Debounce interval for saving progress to Supabase (ms).
const SYNC_DEBOUNCE_MS = 5_000;

// ============================================================

export const usePlayerStore = create<PlayerState>((set, get) => ({
  // --- Initial state -------------------------------------------------------
  currentEpisode: null,
  currentShow: null,
  isPlaying: false,
  isLoading: false,
  positionSeconds: 0,
  durationSeconds: 0,
  playbackRate: 1.0,
  sleepTimerEndTime: null,

  // --- Actions -------------------------------------------------------------

  loadEpisode: async (show, episode) => {
    const { currentEpisode, _cleanup } = get();

    // If the same episode is already loaded, do nothing.
    if (currentEpisode?.id === episode.id) return;

    set({ isLoading: true });

    try {
      // Persist progress for the *previous* episode before switching.
      if (currentEpisode) {
        await get().syncProgress();
      }

      // Tear down previous track.
      await _cleanup();

      if (!episode.audio_url) {
        throw new Error('Episode has no audio URL.');
      }

      // Try to resume from stored progress.
      let initialPosition = 0;
      try {
        const progress = await playbackService.getProgress(episode.id);
        if (progress && !progress.completed) {
          initialPosition = progress.progress_seconds;
        }
      } catch {
        // Non-critical – just start from the beginning.
      }

      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: episode.id,
        url: episode.audio_url,
        title: episode.title,
        artist: show.title ?? 'Podcast AI',
        duration: episode.audio_duration_seconds ?? undefined,
      });

      if (initialPosition > 0) {
        await TrackPlayer.seekTo(initialPosition);
      }

      await TrackPlayer.setRate(get().playbackRate);
      await TrackPlayer.play();

      set({
        currentEpisode: episode,
        currentShow: show,
        isPlaying: true,
        positionSeconds: initialPosition,
        durationSeconds: episode.audio_duration_seconds ?? 0,
      });

      // Start periodic progress sync.
      startProgressSync();
    } catch (error) {
      console.error('[PlayerStore] loadEpisode failed:', error);
      set({ currentEpisode: null, currentShow: null, isPlaying: false });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  play: async () => {
    try {
      await TrackPlayer.play();
      set({ isPlaying: true });
      startProgressSync();
    } catch (error) {
      console.error('[PlayerStore] play failed:', error);
    }
  },

  pause: async () => {
    try {
      await TrackPlayer.pause();
      set({ isPlaying: false });
      stopProgressSync();
      // Save progress immediately on pause.
      get().syncProgress().catch(console.warn);
    } catch (error) {
      console.error('[PlayerStore] pause failed:', error);
    }
  },

  toggle: async () => {
    const { isPlaying } = get();
    if (isPlaying) {
      await get().pause();
    } else {
      await get().play();
    }
  },

  seekTo: async (seconds) => {
    try {
      await TrackPlayer.seekTo(seconds);
      set({ positionSeconds: seconds });
    } catch (error) {
      console.error('[PlayerStore] seekTo failed:', error);
    }
  },

  skipForward: async (seconds = 30) => {
    const { positionSeconds, durationSeconds } = get();
    const target = Math.min(positionSeconds + seconds, durationSeconds);
    await get().seekTo(target);
  },

  skipBack: async (seconds = 15) => {
    const { positionSeconds } = get();
    const target = Math.max(positionSeconds - seconds, 0);
    await get().seekTo(target);
  },

  setPlaybackRate: async (rate) => {
    set({ playbackRate: rate });
    try {
      await TrackPlayer.setRate(rate);
    } catch (error) {
      console.error('[PlayerStore] setPlaybackRate failed:', error);
    }
  },

  setSleepTimer: (minutes) => {
    // Clear any existing timer first.
    get().clearSleepTimer();

    const endTime = Date.now() + minutes * 60_000;
    set({ sleepTimerEndTime: endTime });

    sleepTimerInterval = setInterval(() => {
      if (Date.now() >= endTime) {
        get().pause();
        get().clearSleepTimer();
      }
    }, 1_000);
  },

  clearSleepTimer: () => {
    if (sleepTimerInterval) {
      clearInterval(sleepTimerInterval);
      sleepTimerInterval = null;
    }
    set({ sleepTimerEndTime: null });
  },

  /**
   * Save the current playback position to Supabase.
   * This is called on a debounced interval while playing and
   * immediately when the user pauses or switches episodes.
   */
  syncProgress: async () => {
    const { currentEpisode, positionSeconds, durationSeconds } = get();
    if (!currentEpisode) return;

    const completed =
      durationSeconds > 0 && positionSeconds >= durationSeconds - 5;

    try {
      await playbackService.updateProgress(
        currentEpisode.id,
        positionSeconds,
        completed,
      );
    } catch (error) {
      console.error('[PlayerStore] syncProgress failed:', error);
    }
  },

  /**
   * Reset the TrackPlayer queue and stop all timers.
   */
  _cleanup: async () => {
    stopProgressSync();

    try {
      await TrackPlayer.reset();
    } catch {
      // Ignore – player may not be initialised yet.
    }
  },
}));

// ---------- TrackPlayer event listeners ----------

let listenersInitialised = false;

/**
 * Register TrackPlayer event listeners that keep the Zustand
 * store in sync with the native player state.
 * Call once after `setupTrackPlayer()` completes.
 */
export function initPlayerStoreListeners() {
  if (listenersInitialised) return;
  listenersInitialised = true;

  TrackPlayer.addEventListener(Event.PlaybackState, ({ state }) => {
    usePlayerStore.setState({ isPlaying: state === State.Playing });

    if (state === State.Ended) {
      stopProgressSync();
      usePlayerStore.getState().syncProgress().catch(console.warn);
    }
  });

  TrackPlayer.addEventListener(
    Event.PlaybackProgressUpdated,
    ({ position, duration }) => {
      const store = usePlayerStore.getState();
      usePlayerStore.setState({
        positionSeconds: position,
        durationSeconds: duration > 0 ? duration : store.durationSeconds,
      });
    },
  );
}

// ---------- Progress sync helpers ----------

function startProgressSync() {
  stopProgressSync();
  progressSyncTimer = setInterval(() => {
    usePlayerStore.getState().syncProgress().catch(console.warn);
  }, SYNC_DEBOUNCE_MS);
}

function stopProgressSync() {
  if (progressSyncTimer) {
    clearInterval(progressSyncTimer);
    progressSyncTimer = null;
  }
}
