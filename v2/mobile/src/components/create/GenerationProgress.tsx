import React, { useEffect, useRef, useMemo } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { subscribeToShowUpdates } from '@/services/shows';
import type { Episode, EpisodeStatus, Show } from '@shared/types';

// ---------------------------------------------------------------------------
// GenerationProgress
//
// Renders overall progress bar + per-episode status list while a show is being
// generated. Subscribes to Supabase realtime so it live-updates.
// ---------------------------------------------------------------------------

interface GenerationProgressProps {
  showId: string;
  episodes: Episode[];
  /** Called when a realtime update is received so parent can refresh state. */
  onEpisodeUpdate?: (episode: Episode) => void;
  /** Called when the show itself updates (e.g., transitions to "ready"). */
  onShowUpdate?: (show: Show) => void;
}

// Map episode status to a user-friendly label.
const STATUS_LABELS: Partial<Record<EpisodeStatus, string>> = {
  generating_script: 'Generating script...',
  generating_audio: 'Generating audio...',
};

export default function GenerationProgress({
  showId,
  episodes,
  onEpisodeUpdate,
  onShowUpdate,
}: GenerationProgressProps) {
  // --- realtime subscription ---
  useEffect(() => {
    const channel = subscribeToShowUpdates(showId, (payload) => {
      if (payload.type === 'episode' && onEpisodeUpdate) {
        onEpisodeUpdate(payload.record as Episode);
      }
      if (payload.type === 'show' && onShowUpdate) {
        onShowUpdate(payload.record as Show);
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [showId]);

  // --- progress calculation ---
  const { completedCount, totalCount, percentage } = useMemo(() => {
    const total = episodes.length;
    const completed = episodes.filter((ep) => ep.status === 'ready').length;

    // Give partial credit for in-progress episodes:
    // generating_script = 0.33, generating_audio = 0.66
    let partialProgress = 0;
    for (const ep of episodes) {
      if (ep.status === 'ready') {
        partialProgress += 1;
      } else if (ep.status === 'generating_audio') {
        partialProgress += 0.66;
      } else if (ep.status === 'generating_script') {
        partialProgress += 0.33;
      }
    }

    const pct = total > 0 ? Math.round((partialProgress / total) * 100) : 0;
    return { completedCount: completed, totalCount: total, percentage: pct };
  }, [episodes]);

  // --- animated progress bar ---
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: percentage,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  // --- pulsing dot for active episodes ---
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.container}>
      {/* Overall progress */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Generating your podcast</Text>
        <Text style={styles.headerPercentage}>{percentage}%</Text>
      </View>

      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            { width: progressWidth },
          ]}
        />
      </View>

      <Text style={styles.progressSubtext}>
        {completedCount} of {totalCount} episodes complete
      </Text>

      {/* Per-episode status list */}
      <View style={styles.episodeList}>
        {episodes.map((episode) => (
          <EpisodeStatusRow
            key={episode.id}
            episode={episode}
            pulseAnim={pulseAnim}
          />
        ))}
      </View>

      {/* Reassurance message */}
      <View style={styles.reassuranceContainer}>
        <Ionicons
          name="notifications-outline"
          size={16}
          color={Colors.textSecondary}
          style={styles.reassuranceIcon}
        />
        <Text style={styles.reassuranceText}>
          You can close the app - we'll notify you when it's ready!
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Per-episode row
// ---------------------------------------------------------------------------

interface EpisodeStatusRowProps {
  episode: Episode;
  pulseAnim: Animated.Value;
}

function EpisodeStatusRow({ episode, pulseAnim }: EpisodeStatusRowProps) {
  const isActive =
    episode.status === 'generating_script' ||
    episode.status === 'generating_audio';
  const isComplete = episode.status === 'ready';
  const isFailed = episode.status === 'failed';

  const statusLabel = STATUS_LABELS[episode.status] ?? null;

  return (
    <View style={styles.episodeRow}>
      {/* Status indicator */}
      <View style={styles.statusIndicator}>
        {isComplete && (
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={12} color={Colors.background} />
          </View>
        )}
        {isActive && (
          <Animated.View style={{ opacity: pulseAnim }}>
            <ActivityIndicator size="small" color={Colors.accent} />
          </Animated.View>
        )}
        {isFailed && (
          <View style={[styles.checkCircle, { backgroundColor: Colors.error }]}>
            <Ionicons name="close" size={12} color={Colors.text} />
          </View>
        )}
        {!isComplete && !isActive && !isFailed && (
          <View style={styles.pendingCircle} />
        )}
      </View>

      {/* Episode info */}
      <View style={styles.episodeInfo}>
        <Text
          style={[
            styles.episodeTitle,
            isComplete && styles.episodeTitleComplete,
            isFailed && styles.episodeTitleFailed,
          ]}
          numberOfLines={1}
        >
          {episode.title || `Episode ${episode.episode_number}`}
        </Text>
        {isActive && statusLabel && (
          <Text style={styles.episodeStatusLabel}>{statusLabel}</Text>
        )}
        {isFailed && (
          <Text style={styles.episodeFailedLabel}>Generation failed</Text>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
  },

  // --- Header ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  headerPercentage: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.accent,
  },

  // --- Progress bar ---
  progressTrack: {
    height: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  progressSubtext: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },

  // --- Episode list ---
  episodeList: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  episodeTitleComplete: {
    color: Colors.textSecondary,
  },
  episodeTitleFailed: {
    color: Colors.error,
  },
  episodeStatusLabel: {
    fontSize: FontSize.xs,
    color: Colors.accentLight,
    marginTop: 2,
  },
  episodeFailedLabel: {
    fontSize: FontSize.xs,
    color: Colors.error,
    marginTop: 2,
  },

  // --- Reassurance ---
  reassuranceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  reassuranceIcon: {
    marginRight: Spacing.sm,
  },
  reassuranceText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
});
