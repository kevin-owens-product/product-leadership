import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { usePlayerStore } from '@/stores/playerStore';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

// ============================================================
// MiniPlayer
// Persistent compact player bar shown above the tab bar when
// an episode is loaded. Displays episode info, a thin progress
// bar, and a play/pause button. Tap to expand to full player.
// ============================================================

const MINI_PLAYER_HEIGHT = 64;
const PROGRESS_BAR_HEIGHT = 3;

function MiniPlayer() {
  const {
    currentEpisode,
    currentShow,
    isPlaying,
    isLoading,
    positionSeconds,
    durationSeconds,
    toggle,
  } = usePlayerStore();

  const translateY = useRef(new Animated.Value(MINI_PLAYER_HEIGHT + 20)).current;
  const isVisible = useRef(false);

  // Animate in/out based on whether an episode is loaded
  useEffect(() => {
    const shouldShow = currentEpisode !== null;

    if (shouldShow && !isVisible.current) {
      isVisible.current = true;
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else if (!shouldShow && isVisible.current) {
      isVisible.current = false;
      Animated.timing(translateY, {
        toValue: MINI_PLAYER_HEIGHT + 20,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [currentEpisode, translateY]);

  const handlePress = useCallback(() => {
    if (!currentEpisode) return;
    router.push(`/player/${currentEpisode.id}`);
  }, [currentEpisode]);

  const handleToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggle();
  }, [toggle]);

  // Don't render at all if never had an episode
  if (!currentEpisode) return null;

  const progress =
    durationSeconds > 0
      ? Math.min(positionSeconds / durationSeconds, 1)
      : 0;

  const showColor = currentShow?.color ?? Colors.accent;

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }] }]}
    >
      {/* Thin progress bar at the top */}
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${progress * 100}%`,
              backgroundColor: Colors.accent,
            },
          ]}
        />
      </View>

      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.content,
          pressed && styles.contentPressed,
        ]}
      >
        {/* Show icon */}
        <View style={[styles.showIcon, { backgroundColor: showColor }]}>
          <Text style={styles.showIconEmoji}>
            {currentShow?.icon ?? '🎙️'}
          </Text>
        </View>

        {/* Episode info */}
        <View style={styles.infoContainer}>
          <Text style={styles.episodeTitle} numberOfLines={1}>
            {currentEpisode.title}
          </Text>
          <Text style={styles.showName} numberOfLines={1}>
            {currentShow?.title ?? 'Unknown Show'}
          </Text>
        </View>

        {/* Play/Pause button */}
        <Pressable
          onPress={handleToggle}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => [
            styles.playButton,
            pressed && styles.playButtonPressed,
          ]}
        >
          {isLoading ? (
            <Ionicons name="hourglass" size={22} color={Colors.text} />
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={22}
              color={Colors.text}
            />
          )}
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

export default React.memo(MiniPlayer);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: MINI_PLAYER_HEIGHT,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    overflow: 'hidden',
  },

  progressBarContainer: {
    height: PROGRESS_BAR_HEIGHT,
    width: '100%',
    backgroundColor: Colors.surfaceElevated,
  },
  progressBarFill: {
    height: PROGRESS_BAR_HEIGHT,
  },

  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  contentPressed: {
    backgroundColor: Colors.surfaceElevated,
  },

  showIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showIconEmoji: {
    fontSize: 20,
  },

  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  episodeTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  showName: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },

  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonPressed: {
    opacity: 0.6,
  },
});
