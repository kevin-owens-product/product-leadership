import { useEffect, useRef, useCallback, useState } from 'react';
import { Audio, AVPlaybackStatus, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

// ============================================================
// useAudioPlayer Hook
// Core audio playback engine using expo-av. Manages a single
// Audio.Sound instance with background playback, position
// tracking, and playback speed control.
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

/** Clamp a rate value to the 0.5–2.0 range supported by expo-av. */
function clampRate(rate: number): number {
  return Math.max(0.5, Math.min(2.0, rate));
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const soundRef = useRef<Audio.Sound | null>(null);
  const isMountedRef = useRef(true);
  const currentUriRef = useRef<string | null>(null);

  const [state, setState] = useState<AudioPlayerState>({
    isLoaded: false,
    isPlaying: false,
    isBuffering: false,
    positionMs: 0,
    durationMs: 0,
  });

  // -----------------------------------------------------------------
  // Configure audio mode for background playback on mount
  // -----------------------------------------------------------------
  useEffect(() => {
    isMountedRef.current = true;

    async function configureAudio() {
      try {
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          playsInSilentModeOnIOS: true,
          interruptionModeIOS: InterruptionModeIOS.DuckOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.warn('[useAudioPlayer] Failed to configure audio mode:', error);
      }
    }

    configureAudio();

    return () => {
      isMountedRef.current = false;
      // Unload sound on unmount
      const sound = soundRef.current;
      if (sound) {
        sound.setOnPlaybackStatusUpdate(null);
        sound.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  // -----------------------------------------------------------------
  // Playback status callback
  // -----------------------------------------------------------------
  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!isMountedRef.current) return;

    if (!status.isLoaded) {
      // Handle unloaded / error state
      if (status.error) {
        console.warn('[useAudioPlayer] Playback error:', status.error);
      }
      setState((prev) => ({
        ...prev,
        isLoaded: false,
        isPlaying: false,
        isBuffering: false,
      }));
      return;
    }

    setState({
      isLoaded: true,
      isPlaying: status.isPlaying,
      isBuffering: status.isBuffering,
      positionMs: status.positionMillis ?? 0,
      durationMs: status.durationMillis ?? 0,
    });

    // Handle playback finished (did just finish)
    if (status.didJustFinish && !status.isLooping) {
      // Seek back to start but stay paused
      soundRef.current
        ?.setPositionAsync(0)
        .catch(() => {});
    }
  }, []);

  // -----------------------------------------------------------------
  // Load audio from URI
  // -----------------------------------------------------------------
  const loadAudio = useCallback(
    async (uri: string) => {
      // If same URI is already loaded, skip
      if (currentUriRef.current === uri && soundRef.current) {
        return;
      }

      // Unload existing sound
      if (soundRef.current) {
        soundRef.current.setOnPlaybackStatusUpdate(null);
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      currentUriRef.current = uri;

      setState({
        isLoaded: false,
        isPlaying: false,
        isBuffering: true,
        positionMs: 0,
        durationMs: 0,
      });

      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          {
            shouldPlay: false,
            progressUpdateIntervalMillis: 500,
            positionMillis: 0,
          },
          onPlaybackStatusUpdate,
        );

        if (!isMountedRef.current) {
          // Component unmounted during async load
          await sound.unloadAsync().catch(() => {});
          return;
        }

        soundRef.current = sound;
      } catch (error) {
        console.warn('[useAudioPlayer] Failed to load audio:', error);
        if (isMountedRef.current) {
          setState({
            isLoaded: false,
            isPlaying: false,
            isBuffering: false,
            positionMs: 0,
            durationMs: 0,
          });
        }
      }
    },
    [onPlaybackStatusUpdate],
  );

  // -----------------------------------------------------------------
  // Transport controls
  // -----------------------------------------------------------------
  const play = useCallback(async () => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.playAsync();
    } catch (error) {
      console.warn('[useAudioPlayer] play() failed:', error);
    }
  }, []);

  const pause = useCallback(async () => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.pauseAsync();
    } catch (error) {
      console.warn('[useAudioPlayer] pause() failed:', error);
    }
  }, []);

  const toggle = useCallback(async () => {
    if (!soundRef.current) return;
    try {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await soundRef.current.pauseAsync();
        } else {
          await soundRef.current.playAsync();
        }
      }
    } catch (error) {
      console.warn('[useAudioPlayer] toggle() failed:', error);
    }
  }, []);

  const seekTo = useCallback(async (seconds: number) => {
    if (!soundRef.current) return;
    try {
      const ms = Math.max(0, Math.round(seconds * 1000));
      await soundRef.current.setPositionAsync(ms);
    } catch (error) {
      console.warn('[useAudioPlayer] seekTo() failed:', error);
    }
  }, []);

  const skipForward = useCallback(
    async (seconds: number) => {
      if (!soundRef.current) return;
      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          const newPos = Math.min(
            (status.positionMillis ?? 0) + seconds * 1000,
            status.durationMillis ?? 0,
          );
          await soundRef.current.setPositionAsync(newPos);
        }
      } catch (error) {
        console.warn('[useAudioPlayer] skipForward() failed:', error);
      }
    },
    [],
  );

  const skipBack = useCallback(
    async (seconds: number) => {
      if (!soundRef.current) return;
      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          const newPos = Math.max(
            (status.positionMillis ?? 0) - seconds * 1000,
            0,
          );
          await soundRef.current.setPositionAsync(newPos);
        }
      } catch (error) {
        console.warn('[useAudioPlayer] skipBack() failed:', error);
      }
    },
    [],
  );

  const setRate = useCallback(async (rate: number) => {
    if (!soundRef.current) return;
    try {
      const clamped = clampRate(rate);
      await soundRef.current.setRateAsync(clamped, true);
    } catch (error) {
      console.warn('[useAudioPlayer] setRate() failed:', error);
    }
  }, []);

  const unload = useCallback(async () => {
    if (!soundRef.current) return;
    try {
      soundRef.current.setOnPlaybackStatusUpdate(null);
      await soundRef.current.unloadAsync();
      soundRef.current = null;
      currentUriRef.current = null;

      if (isMountedRef.current) {
        setState({
          isLoaded: false,
          isPlaying: false,
          isBuffering: false,
          positionMs: 0,
          durationMs: 0,
        });
      }
    } catch (error) {
      console.warn('[useAudioPlayer] unload() failed:', error);
    }
  }, []);

  return {
    ...state,
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
