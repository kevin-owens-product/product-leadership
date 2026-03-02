import { create } from 'zustand';
import { Audio, AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';
import type { Episode, Show } from '@shared/types';
import * as playbackService from '@/services/playback';

// ============================================================
// Player Store
// Controls audio playback via expo-av and keeps track of
// position, rate, and an optional sleep timer.
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

let soundObject: Audio.Sound | null = null;
let progressSyncTimer: ReturnType<typeof setTimeout> | null = null;
let sleepTimerInterval: ReturnType<typeof setInterval> | null = null;

// Debounce interval for saving progress to Supabase (ms).
const SYNC_DEBOUNCE_MS = 5_000;

// ---------- Helpers ----------

function isPlaybackSuccess(status: AVPlaybackStatus): status is AVPlaybackStatusSuccess {
  return status.isLoaded;
}

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

      // Tear down previous sound instance.
      await _cleanup();

      if (!episode.audio_url) {
        throw new Error('Episode has no audio URL.');
      }

      // Configure audio mode for background playback.
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
      });

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

      const { sound, status } = await Audio.Sound.createAsync(
        { uri: episode.audio_url },
        {
          shouldPlay: true,
          positionMillis: initialPosition * 1_000,
          rate: get().playbackRate,
          shouldCorrectPitch: true,
        },
        onPlaybackStatusUpdate,
      );

      soundObject = sound;

      const duration =
        isPlaybackSuccess(status) && status.durationMillis
          ? status.durationMillis / 1_000
          : episode.audio_duration_seconds ?? 0;

      set({
        currentEpisode: episode,
        currentShow: show,
        isPlaying: true,
        positionSeconds: initialPosition,
        durationSeconds: duration,
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
    if (!soundObject) return;
    try {
      await soundObject.playAsync();
      set({ isPlaying: true });
      startProgressSync();
    } catch (error) {
      console.error('[PlayerStore] play failed:', error);
    }
  },

  pause: async () => {
    if (!soundObject) return;
    try {
      await soundObject.pauseAsync();
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
    if (!soundObject) return;
    try {
      await soundObject.setPositionAsync(seconds * 1_000);
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
    if (!soundObject) return;
    try {
      await soundObject.setRateAsync(rate, true /* shouldCorrectPitch */);
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
   * Release the expo-av Sound object and stop all timers.
   */
  _cleanup: async () => {
    stopProgressSync();

    if (soundObject) {
      try {
        await soundObject.unloadAsync();
      } catch {
        // Ignore – may already be unloaded.
      }
      soundObject = null;
    }
  },
}));

// ---------- Playback status callback ----------

function onPlaybackStatusUpdate(status: AVPlaybackStatus) {
  if (!isPlaybackSuccess(status)) return;

  const store = usePlayerStore.getState();

  const positionSeconds = status.positionMillis / 1_000;
  const durationSeconds = (status.durationMillis ?? 0) / 1_000;

  usePlayerStore.setState({
    positionSeconds,
    durationSeconds,
    isPlaying: status.isPlaying,
  });

  // Auto-stop at end of track.
  if (status.didJustFinish) {
    usePlayerStore.setState({ isPlaying: false });
    stopProgressSync();

    // Mark completed.
    store.syncProgress().catch(console.warn);
  }
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
