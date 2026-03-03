import TrackPlayer, {
  Event,
  Capability,
  AppKilledPlaybackBehavior,
} from 'react-native-track-player';

// ============================================================
// Track Player Service
// Registered with react-native-track-player to handle remote
// control events (lock screen, notification bar, headset buttons)
// and audio interruptions.
// ============================================================

let wasPausedByDuck = false;

export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.reset());

  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => {
    TrackPlayer.seekTo(position);
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, async ({ interval }) => {
    const { position } = await TrackPlayer.getProgress();
    await TrackPlayer.seekTo(position + (interval ?? 30));
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async ({ interval }) => {
    const { position } = await TrackPlayer.getProgress();
    await TrackPlayer.seekTo(Math.max(0, position - (interval ?? 15)));
  });

  TrackPlayer.addEventListener(Event.RemoteDuck, async ({ paused, permanent }) => {
    if (permanent) {
      await TrackPlayer.pause();
      wasPausedByDuck = false;
    } else if (paused) {
      await TrackPlayer.pause();
      wasPausedByDuck = true;
    } else if (wasPausedByDuck) {
      await TrackPlayer.play();
      wasPausedByDuck = false;
    }
  });
}

/**
 * One-time setup of the TrackPlayer instance.
 * Call once from the root layout after the app mounts.
 */
export async function setupTrackPlayer() {
  await TrackPlayer.setupPlayer({
    autoHandleInterruptions: true,
  });

  await TrackPlayer.updateOptions({
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SeekTo,
      Capability.JumpForward,
      Capability.JumpBackward,
    ],
    compactCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.JumpForward,
    ],
    forwardJumpInterval: 30,
    backwardJumpInterval: 15,
    progressUpdateEventInterval: 1,
    android: {
      appKilledPlaybackBehavior:
        AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
    },
  });
}
