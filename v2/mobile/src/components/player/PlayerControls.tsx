import React, { useCallback } from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

// ============================================================
// PlayerControls
// Main transport controls: skip back, previous, play/pause,
// next, skip forward. Large central play button with haptic
// feedback on all press actions.
// ============================================================

interface PlayerControlsProps {
  isPlaying: boolean;
  onToggle: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  disabled?: boolean;
}

const PLAY_BUTTON_SIZE = 64;
const SECONDARY_BUTTON_SIZE = 44;
const TERTIARY_BUTTON_SIZE = 36;
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

function PlayerControls({
  isPlaying,
  onToggle,
  onSkipBack,
  onSkipForward,
  onPrevious,
  onNext,
  disabled = false,
}: PlayerControlsProps) {
  const handleToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggle();
  }, [onToggle]);

  const handleSkipBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkipBack();
  }, [onSkipBack]);

  const handleSkipForward = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkipForward();
  }, [onSkipForward]);

  const handlePrevious = useCallback(() => {
    if (!onPrevious) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPrevious();
  }, [onPrevious]);

  const handleNext = useCallback(() => {
    if (!onNext) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNext();
  }, [onNext]);

  return (
    <View style={styles.container}>
      {/* Skip Back 15s */}
      <View style={styles.skipButtonWrapper}>
        <Pressable
          onPress={handleSkipBack}
          disabled={disabled}
          hitSlop={HIT_SLOP}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.buttonPressed,
            disabled && styles.buttonDisabled,
          ]}
        >
          <Ionicons
            name="play-back"
            size={22}
            color={disabled ? Colors.textTertiary : Colors.text}
          />
        </Pressable>
        <Text style={[styles.skipLabel, disabled && styles.skipLabelDisabled]}>
          15
        </Text>
      </View>

      {/* Previous Track */}
      <Pressable
        onPress={handlePrevious}
        disabled={disabled || !onPrevious}
        hitSlop={HIT_SLOP}
        style={({ pressed }) => [
          styles.tertiaryButton,
          pressed && styles.buttonPressed,
          (disabled || !onPrevious) && styles.buttonDisabled,
        ]}
      >
        <Ionicons
          name="play-skip-back"
          size={20}
          color={disabled || !onPrevious ? Colors.textTertiary : Colors.text}
        />
      </Pressable>

      {/* Play / Pause — Primary */}
      <Pressable
        onPress={handleToggle}
        disabled={disabled}
        hitSlop={HIT_SLOP}
        style={({ pressed }) => [
          styles.playButton,
          pressed && styles.playButtonPressed,
          disabled && styles.playButtonDisabled,
        ]}
      >
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={28}
          color={Colors.background}
          style={!isPlaying ? styles.playIconOffset : undefined}
        />
      </Pressable>

      {/* Next Track */}
      <Pressable
        onPress={handleNext}
        disabled={disabled || !onNext}
        hitSlop={HIT_SLOP}
        style={({ pressed }) => [
          styles.tertiaryButton,
          pressed && styles.buttonPressed,
          (disabled || !onNext) && styles.buttonDisabled,
        ]}
      >
        <Ionicons
          name="play-skip-forward"
          size={20}
          color={disabled || !onNext ? Colors.textTertiary : Colors.text}
        />
      </Pressable>

      {/* Skip Forward 30s */}
      <View style={styles.skipButtonWrapper}>
        <Pressable
          onPress={handleSkipForward}
          disabled={disabled}
          hitSlop={HIT_SLOP}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.buttonPressed,
            disabled && styles.buttonDisabled,
          ]}
        >
          <Ionicons
            name="play-forward"
            size={22}
            color={disabled ? Colors.textTertiary : Colors.text}
          />
        </Pressable>
        <Text style={[styles.skipLabel, disabled && styles.skipLabelDisabled]}>
          30
        </Text>
      </View>
    </View>
  );
}

export default React.memo(PlayerControls);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing.lg,
  },

  // Primary play/pause button
  playButton: {
    width: PLAY_BUTTON_SIZE,
    height: PLAY_BUTTON_SIZE,
    borderRadius: PLAY_BUTTON_SIZE / 2,
    backgroundColor: Colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonPressed: {
    backgroundColor: Colors.textSecondary,
    transform: [{ scale: 0.95 }],
  },
  playButtonDisabled: {
    backgroundColor: Colors.textTertiary,
  },
  playIconOffset: {
    // Visually center the play triangle
    marginLeft: 3,
  },

  // Skip buttons with time labels
  skipButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    width: SECONDARY_BUTTON_SIZE,
    height: SECONDARY_BUTTON_SIZE,
    borderRadius: SECONDARY_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: -2,
  },
  skipLabelDisabled: {
    color: Colors.textTertiary,
  },

  // Previous / Next buttons
  tertiaryButton: {
    width: TERTIARY_BUTTON_SIZE,
    height: TERTIARY_BUTTON_SIZE,
    borderRadius: TERTIARY_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Shared press states
  buttonPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.92 }],
  },
  buttonDisabled: {
    opacity: 0.3,
  },
});
