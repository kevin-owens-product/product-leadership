import React, { useCallback } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

// ============================================================
// SpeedControl
// Compact row of playback speed presets. The active speed is
// highlighted with the accent color. Provides haptic feedback
// on selection.
// ============================================================

interface SpeedControlProps {
  /** Current playback rate */
  rate: number;
  /** Callback when a new rate is selected */
  onRateChange: (rate: number) => void;
}

const SPEED_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

/** Format rate for display: show one decimal unless it's a whole number */
function formatRate(rate: number): string {
  if (rate === Math.floor(rate)) return `${rate}x`;
  return `${rate}x`;
}

interface SpeedButtonProps {
  rate: number;
  isActive: boolean;
  onPress: (rate: number) => void;
}

function SpeedButton({ rate, isActive, onPress }: SpeedButtonProps) {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(rate);
  }, [rate, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        isActive && styles.buttonActive,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.buttonText, isActive && styles.buttonTextActive]}>
        {formatRate(rate)}
      </Text>
    </Pressable>
  );
}

const MemoizedSpeedButton = React.memo(SpeedButton);

function SpeedControl({ rate, onRateChange }: SpeedControlProps) {
  // Find the closest preset to the current rate for highlighting
  const activeRate = SPEED_PRESETS.reduce((closest, preset) =>
    Math.abs(preset - rate) < Math.abs(closest - rate) ? preset : closest,
  );

  return (
    <View style={styles.container}>
      {SPEED_PRESETS.map((preset) => (
        <MemoizedSpeedButton
          key={preset}
          rate={preset}
          isActive={preset === activeRate}
          onPress={onRateChange}
        />
      ))}
    </View>
  );
}

export default React.memo(SpeedControl);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },

  button: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    minWidth: 48,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: Colors.accent,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },

  buttonText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  buttonTextActive: {
    color: Colors.text,
  },
});
