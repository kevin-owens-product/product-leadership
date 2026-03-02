import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DialogueLine } from '@shared/types';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

// ============================================================
// TranscriptView
// Scrollable dialogue transcript with auto-scroll to the
// approximate current position. Speaker labels are color-coded
// (host1 = blue, host2 = green).
// ============================================================

interface TranscriptViewProps {
  lines: DialogueLine[];
  /** Current playback position in seconds */
  currentSeconds: number;
  /** Total episode duration in seconds */
  duration: number;
}

const SPEAKER_COLORS: Record<string, string> = {
  host1: Colors.host1,
  host2: Colors.host2,
};

/**
 * Estimate which dialogue line index corresponds to the current
 * playback position. Uses linear interpolation based on the line
 * index within the total count.
 */
function estimateCurrentLineIndex(
  totalLines: number,
  currentSeconds: number,
  durationSeconds: number,
): number {
  if (totalLines === 0 || durationSeconds <= 0) return 0;
  const fraction = Math.max(0, Math.min(1, currentSeconds / durationSeconds));
  return Math.floor(fraction * (totalLines - 1));
}

interface LineRowProps {
  line: DialogueLine;
  isApproxCurrent: boolean;
}

function LineRow({ line, isApproxCurrent }: LineRowProps) {
  const speakerColor = SPEAKER_COLORS[line.type] ?? Colors.textSecondary;

  return (
    <View
      style={[styles.lineContainer, isApproxCurrent && styles.lineHighlighted]}
    >
      <Text style={[styles.speaker, { color: speakerColor }]}>
        {line.speaker}
      </Text>
      <Text style={styles.lineText}>{line.text}</Text>
    </View>
  );
}

const MemoizedLineRow = React.memo(LineRow);

function TranscriptView({
  lines,
  currentSeconds,
  duration,
}: TranscriptViewProps) {
  const flatListRef = useRef<FlatList>(null);
  const lastScrollIndex = useRef(-1);

  const currentLineIndex = useMemo(
    () => estimateCurrentLineIndex(lines.length, currentSeconds, duration),
    [lines.length, currentSeconds, duration],
  );

  // Auto-scroll to approximate position (debounced — only scroll
  // when the line index actually changes to avoid jitter)
  useEffect(() => {
    if (
      lines.length === 0 ||
      currentLineIndex === lastScrollIndex.current
    ) {
      return;
    }

    lastScrollIndex.current = currentLineIndex;

    // Small delay to let the list settle
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: currentLineIndex,
        animated: true,
        viewOffset: 80, // Keep some padding above the current line
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [currentLineIndex, lines.length]);

  const renderItem = useCallback(
    ({ item, index }: { item: DialogueLine; index: number }) => (
      <MemoizedLineRow
        line={item}
        isApproxCurrent={index === currentLineIndex}
      />
    ),
    [currentLineIndex],
  );

  const keyExtractor = useCallback(
    (_item: DialogueLine, index: number) => `line-${index}`,
    [],
  );

  const onScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      // Fallback: scroll to estimated offset
      flatListRef.current?.scrollToOffset({
        offset: info.index * info.averageItemLength,
        animated: true,
      });
    },
    [],
  );

  if (lines.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="document-text-outline"
          size={32}
          color={Colors.textTertiary}
        />
        <Text style={styles.emptyText}>No transcript available</Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      data={lines}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      onScrollToIndexFailed={onScrollToIndexFailed}
      initialNumToRender={20}
      maxToRenderPerBatch={20}
      windowSize={11}
      bounces={true}
    />
  );
}

export default React.memo(TranscriptView);

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },

  lineContainer: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginVertical: 2,
  },
  lineHighlighted: {
    backgroundColor: Colors.surfaceElevated,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },

  speaker: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  lineText: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl * 2,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
  },
});
