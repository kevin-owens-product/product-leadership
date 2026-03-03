import { useCallback, useRef } from 'react';
import TrackPlayer, {
  State,
  usePlaybackState,
  useProgress,
} from 'react-native-track-player';

// ============================================================
// useAudioPlayer Hook
// Convenience hook that wraps react-native-track-player with a
// simple load/play/pause/seek interface. For most screens the
// playerStore (Zustand) is the primary API – this hook is
// useful when you need component-scoped audio state.
// ============================================================

export interface AudioPlayerState {
  isLoaded: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  positionMs: number;
  durationMs: number;
}

export interface AudioPlayerActions {
  loadAudio: (uri: string) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  toggle: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  skipForward: (seconds: number) => Promise<void>;
  skipBack: (seconds: number) => Promise<void>;
  setRate: (rate: number) => Promise<void>;
  unload: () => Promise<void>;
}

export type UseAudioPlayerReturn = AudioPlayerState & AudioPlayerActions;

/** Clamp a rate value to the 0.5–2.0 range. */
function clampRate(rate: number): number {
  return Math.max(0.5, Math.min(2.0, rate));
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const { state: playbackState } = usePlaybackState();
  const { position, duration } = useProgress(500);
  const currentUriRef = useRef<string | null>(null);

  const isLoaded =
    playbackState != null &&
    playbackState !== State.None;
  const isPlaying = playbackState === State.Playing;
  const isBuffering =
    playbackState === State.Buffering || playbackState === State.Loading;

  // -----------------------------------------------------------------
  // Load audio from URI
  // -----------------------------------------------------------------
  const loadAudio = useCallback(async (uri: string) => {
    if (currentUriRef.current === uri) return;
    currentUriRef.current = uri;

    await TrackPlayer.reset();
    await TrackPlayer.add({ id: uri, url: uri, title: 'Audio' });
  }, []);

  // -----------------------------------------------------------------
  // Transport controls
  // -----------------------------------------------------------------
  const play = useCallback(async () => {
    await TrackPlayer.play();
  }, []);

  const pause = useCallback(async () => {
    await TrackPlayer.pause();
  }, []);

  const toggle = useCallback(async () => {
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  }, [isPlaying]);

  const seekTo = useCallback(async (seconds: number) => {
    await TrackPlayer.seekTo(Math.max(0, seconds));
  }, []);

  const skipForward = useCallback(async (seconds: number) => {
    const { position: pos } = await TrackPlayer.getProgress();
    await TrackPlayer.seekTo(pos + seconds);
  }, []);

  const skipBack = useCallback(async (seconds: number) => {
    const { position: pos } = await TrackPlayer.getProgress();
    await TrackPlayer.seekTo(Math.max(0, pos - seconds));
  }, []);

  const setRate = useCallback(async (rate: number) => {
    await TrackPlayer.setRate(clampRate(rate));
  }, []);

  const unload = useCallback(async () => {
    currentUriRef.current = null;
    await TrackPlayer.reset();
  }, []);

  return {
    isLoaded,
    isPlaying,
    isBuffering,
    positionMs: position * 1_000,
    durationMs: duration * 1_000,
    loadAudio,
    play,
    pause,
    toggle,
    seekTo,
    skipForward,
    skipBack,
    setRate,
    unload,
  };
}
