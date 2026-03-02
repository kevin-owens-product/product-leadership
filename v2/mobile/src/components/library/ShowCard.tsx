import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/constants/theme';
import type { Show } from '@shared/types';

// ---------------------------------------------------------------------------
// ShowCard – A visually rich card for a single podcast show in the library grid
// ---------------------------------------------------------------------------

interface ShowCardProps {
  show: Show;
  /** Overall playback progress across episodes, 0-1 */
  progress?: number;
}

/**
 * Parses a hex color string into its RGB components.
 * Falls back to white when the input is invalid.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    return {
      r: parseInt(cleaned[0] + cleaned[0], 16),
      g: parseInt(cleaned[1] + cleaned[1], 16),
      b: parseInt(cleaned[2] + cleaned[2], 16),
    };
  }
  if (cleaned.length === 6) {
    return {
      r: parseInt(cleaned.slice(0, 2), 16),
      g: parseInt(cleaned.slice(2, 4), 16),
      b: parseInt(cleaned.slice(4, 6), 16),
    };
  }
  return { r: 255, g: 255, b: 255 };
}

const STATUS_LABELS: Record<string, string> = {
  generating: 'Generating...',
  failed: 'Failed',
  archived: 'Archived',
};

export default function ShowCard({ show, progress = 0 }: ShowCardProps) {
  // --- pulsing animation for "generating" state ---
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (show.status !== 'generating') return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [show.status]);

  // --- derived values ---
  const { r, g, b } = hexToRgb(show.color);
  const bgColor = `rgba(${r}, ${g}, ${b}, 0.18)`;
  const accentColor = show.color;
  const isGenerating = show.status === 'generating';
  const statusLabel = STATUS_LABELS[show.status];

  const handlePress = () => {
    router.push(`/show/${show.id}`);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: bgColor, borderColor: `rgba(${r}, ${g}, ${b}, 0.3)` },
        pressed && styles.pressed,
      ]}
    >
      {/* Status badge (non-ready states) */}
      {statusLabel != null && (
        <View style={styles.statusRow}>
          {isGenerating && (
            <Animated.View
              style={[styles.statusDot, { backgroundColor: Colors.warning, opacity: pulseAnim }]}
            />
          )}
          {show.status === 'failed' && (
            <View style={[styles.statusDot, { backgroundColor: Colors.error }]} />
          )}
          <Text
            style={[
              styles.statusText,
              show.status === 'failed' && { color: Colors.error },
              isGenerating && { color: Colors.warning },
            ]}
            numberOfLines={1}
          >
            {statusLabel}
          </Text>
        </View>
      )}

      {/* Large icon emoji */}
      <Text style={styles.icon}>{show.icon}</Text>

      {/* Title & subtitle */}
      <Text style={styles.title} numberOfLines={2}>
        {show.title}
      </Text>

      {show.subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {show.subtitle}
        </Text>
      ) : null}

      {/* Episode count */}
      <Text style={styles.episodeCount}>
        {show.episode_count} {show.episode_count === 1 ? 'episode' : 'episodes'}
      </Text>

      {/* Progress bar */}
      {progress > 0 && (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: accentColor },
            ]}
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    minHeight: 200,
    justifyContent: 'flex-end',
    ...Shadows.card,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },

  // --- Status ---
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // --- Content ---
  icon: {
    fontSize: 44,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  episodeCount: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },

  // --- Progress bar ---
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
