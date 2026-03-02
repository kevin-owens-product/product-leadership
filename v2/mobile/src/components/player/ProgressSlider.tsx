import React, { useCallback, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  LayoutChangeEvent,
  PanResponder,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

// ============================================================
// ProgressSlider
// Custom View-based audio progress slider with drag-to-seek,
// time labels (elapsed / remaining), and smooth visual feedback.
// No external slider dependency required.
// ============================================================

interface ProgressSliderProps {
  /** Current position in seconds */
  position: number;
  /** Total duration in seconds */
  duration: number;
  /** Callback when the user seeks to a new position (in seconds) */
  onSeek: (seconds: number) => void;
}

const TRACK_HEIGHT = 4;
const TRACK_HEIGHT_ACTIVE = 6;
const THUMB_SIZE = 14;
const THUMB_SIZE_ACTIVE = 18;

/** Format seconds as MM:SS */
function formatTime(totalSeconds: number): string {
  if (!isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Format seconds as -MM:SS (remaining time) */
function formatRemaining(totalSeconds: number): string {
  if (!isFinite(totalSeconds) || totalSeconds < 0) return '-0:00';
  return `-${formatTime(totalSeconds)}`;
}

function ProgressSlider({ position, duration, onSeek }: ProgressSliderProps) {
  const trackWidthRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);

  // Effective values (use drag position while dragging, else actual)
  const effectivePosition = isDragging ? dragPosition : position;
  const progress = duration > 0 ? Math.min(effectivePosition / duration, 1) : 0;
  const remaining = Math.max(0, duration - effectivePosition);

  const onTrackLayout = useCallback((event: LayoutChangeEvent) => {
    trackWidthRef.current = event.nativeEvent.layout.width;
  }, []);

  /** Convert an x-offset on the track to seconds */
  const xToSeconds = useCallback(
    (x: number): number => {
      if (trackWidthRef.current <= 0 || duration <= 0) return 0;
      const fraction = Math.max(0, Math.min(1, x / trackWidthRef.current));
      return fraction * duration;
    },
    [duration],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          setIsDragging(true);
          const x = evt.nativeEvent.locationX;
          setDragPosition(xToSeconds(x));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
        onPanResponderMove: (evt, gestureState) => {
          // Calculate position from initial touch + movement delta
          const trackWidth = trackWidthRef.current;
          if (trackWidth <= 0) return;

          // Use the absolute x position from the original event
          const x = evt.nativeEvent.locationX;
          setDragPosition(xToSeconds(x));
        },
        onPanResponderRelease: (evt) => {
          const x = evt.nativeEvent.locationX;
          const seconds = xToSeconds(x);
          setIsDragging(false);
          onSeek(seconds);
        },
        onPanResponderTerminate: () => {
          setIsDragging(false);
        },
      }),
    [xToSeconds, onSeek],
  );

  const activeTrackHeight = isDragging ? TRACK_HEIGHT_ACTIVE : TRACK_HEIGHT;
  const activeThumbSize = isDragging ? THUMB_SIZE_ACTIVE : THUMB_SIZE;

  return (
    <View style={styles.container}>
      {/* Slider track area — enlarged hit target */}
      <View
        style={styles.trackTouchArea}
        onLayout={onTrackLayout}
        {...panResponder.panHandlers}
      >
        {/* Background track */}
        <View
          style={[
            styles.track,
            { height: activeTrackHeight, borderRadius: activeTrackHeight / 2 },
          ]}
        >
          {/* Filled portion */}
          <View
            style={[
              styles.trackFill,
              {
                width: `${progress * 100}%`,
                height: activeTrackHeight,
                borderRadius: activeTrackHeight / 2,
              },
            ]}
          />
        </View>

        {/* Thumb */}
        <View
          style={[
            styles.thumb,
            {
              width: activeThumbSize,
              height: activeThumbSize,
              borderRadius: activeThumbSize / 2,
              left: `${progress * 100}%`,
              marginLeft: -(activeThumbSize / 2),
              opacity: isDragging ? 1 : 0.9,
            },
          ]}
        />
      </View>

      {/* Time labels */}
      <View style={styles.timeRow}>
        <Text style={styles.timeLabel}>{formatTime(effectivePosition)}</Text>
        <Text style={styles.timeLabel}>{formatRemaining(remaining)}</Text>
      </View>
    </View>
  );
}

export default React.memo(ProgressSlider);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: Spacing.xxl,
  },

  trackTouchArea: {
    height: 32,
    justifyContent: 'center',
    position: 'relative',
  },

  track: {
    width: '100%',
    backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden',
  },

  trackFill: {
    backgroundColor: Colors.accent,
  },

  thumb: {
    position: 'absolute',
    backgroundColor: Colors.text,
    top: '50%',
    marginTop: -(THUMB_SIZE / 2),
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },

  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },

  timeLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
});
