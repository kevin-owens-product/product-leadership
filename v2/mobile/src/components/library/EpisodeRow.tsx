import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import type { Episode, PlaybackProgress } from '@shared/types';

// ---------------------------------------------------------------------------
// EpisodeRow – A single episode entry inside the show detail screen
// ---------------------------------------------------------------------------

interface EpisodeRowProps {
  episode: Episode;
  episodeNumber: number;
  progress?: PlaybackProgress;
  onPress: () => void;
}

/** Human-readable duration like "32 min" or "1 hr 5 min" */
function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}

/** Maps episode status to a user-facing label and color. */
function getStatusConfig(status: Episode['status']): { label: string; color: string } | null {
  switch (status) {
    case 'pending':
      return { label: 'Queued', color: Colors.textTertiary };
    case 'generating_script':
      return { label: 'Writing script...', color: Colors.warning };
    case 'generating_audio':
      return { label: 'Creating audio...', color: Colors.warning };
    case 'failed':
      return { label: 'Failed', color: Colors.error };
    default:
      return null; // "ready" — no badge needed
  }
}

export default function EpisodeRow({
  episode,
  episodeNumber,
  progress,
  onPress,
}: EpisodeRowProps) {
  // --- Pulsing animation for generation states ---
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isGenerating =
    episode.status === 'generating_script' || episode.status === 'generating_audio';
  const isPending = episode.status === 'pending';
  const isFailed = episode.status === 'failed';
  const isReady = episode.status === 'ready';
  const isCompleted = progress?.completed === true;

  useEffect(() => {
    if (!isGenerating) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
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
  }, [isGenerating]);

  // --- Progress fraction ---
  const progressFraction =
    progress && episode.audio_duration_seconds && episode.audio_duration_seconds > 0
      ? Math.min(progress.progress_seconds / episode.audio_duration_seconds, 1)
      : 0;

  const statusConfig = getStatusConfig(episode.status);
  const dimmed = isPending || isFailed;

  return (
    <Pressable
      onPress={onPress}
      disabled={!isReady}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
        dimmed && styles.dimmed,
      ]}
    >
      <View style={styles.row}>
        {/* Left: episode number circle */}
        <Animated.View
          style={[
            styles.numberCircle,
            isGenerating && { opacity: pulseAnim },
            isCompleted && styles.numberCircleCompleted,
          ]}
        >
          {isCompleted ? (
            <Ionicons name="checkmark" size={16} color={Colors.success} />
          ) : (
            <Text
              style={[
                styles.numberText,
                dimmed && { color: Colors.textTertiary },
              ]}
            >
              {episodeNumber}
            </Text>
          )}
        </Animated.View>

        {/* Center: title + subtitle */}
        <View style={styles.center}>
          <Text
            style={[styles.title, dimmed && styles.titleDimmed]}
            numberOfLines={1}
          >
            {episode.title}
          </Text>

          {episode.subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {episode.subtitle}
            </Text>
          ) : null}

          {/* Status badge for non-ready episodes */}
          {statusConfig != null && (
            <View style={styles.statusRow}>
              {isGenerating && (
                <Animated.View
                  style={[
                    styles.statusDot,
                    { backgroundColor: statusConfig.color, opacity: pulseAnim },
                  ]}
                />
              )}
              {isFailed && (
                <View style={[styles.statusDot, { backgroundColor: Colors.error }]} />
              )}
              <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          )}
        </View>

        {/* Right: duration or status icon */}
        <View style={styles.right}>
          {isReady && episode.audio_duration_seconds != null && (
            <Text style={styles.duration}>
              {formatDuration(episode.audio_duration_seconds)}
            </Text>
          )}
          {isReady && !isCompleted && (
            <Ionicons
              name="play-circle-outline"
              size={24}
              color={Colors.textSecondary}
              style={styles.playIcon}
            />
          )}
        </View>
      </View>

      {/* Bottom: progress bar (only when partially listened) */}
      {progressFraction > 0 && !isCompleted && (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressFraction * 100}%` },
            ]}
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pressed: {
    opacity: 0.7,
    backgroundColor: Colors.surfaceElevated,
  },
  dimmed: {
    opacity: 0.5,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // --- Number circle ---
  numberCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  numberCircleCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  numberText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },

  // --- Center ---
  center: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  titleDimmed: {
    color: Colors.textSecondary,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  statusLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },

  // --- Right ---
  right: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  duration: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  playIcon: {
    marginTop: 2,
  },

  // --- Progress bar ---
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
});
