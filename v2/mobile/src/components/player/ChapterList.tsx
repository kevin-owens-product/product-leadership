import React, { useCallback } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { Chapter } from '@shared/types';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

// ============================================================
// ChapterList
// Displays a scrollable list of chapter markers. The currently
// playing chapter is highlighted. Tap a chapter to seek to its
// start time.
// ============================================================

interface ChapterListProps {
  chapters: Chapter[];
  /** Current playback position in seconds */
  currentSeconds: number;
  /** Callback to seek to a chapter's start position */
  onChapterPress: (seconds: number) => void;
}

/** Format seconds to M:SS */
function formatTimestamp(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Determine which chapter is currently active */
function getCurrentChapterIndex(
  chapters: Chapter[],
  currentSeconds: number,
): number {
  for (let i = chapters.length - 1; i >= 0; i--) {
    if (currentSeconds >= chapters[i].startSeconds) {
      return i;
    }
  }
  return 0;
}

interface ChapterRowProps {
  chapter: Chapter;
  index: number;
  isCurrent: boolean;
  onPress: (seconds: number) => void;
}

function ChapterRow({ chapter, index, isCurrent, onPress }: ChapterRowProps) {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(chapter.startSeconds);
  }, [chapter.startSeconds, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        isCurrent && styles.rowCurrent,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.rowLeft}>
        {isCurrent && (
          <Ionicons
            name="radio"
            size={14}
            color={Colors.accent}
            style={styles.currentIcon}
          />
        )}
        <View style={styles.rowTextContainer}>
          <Text
            style={[styles.chapterTitle, isCurrent && styles.chapterTitleCurrent]}
            numberOfLines={2}
          >
            {chapter.title}
          </Text>
        </View>
      </View>

      <Text style={[styles.timestamp, isCurrent && styles.timestampCurrent]}>
        {formatTimestamp(chapter.startSeconds)}
      </Text>
    </Pressable>
  );
}

const MemoizedChapterRow = React.memo(ChapterRow);

function ChapterList({
  chapters,
  currentSeconds,
  onChapterPress,
}: ChapterListProps) {
  const currentIndex = getCurrentChapterIndex(chapters, currentSeconds);

  const renderItem = useCallback(
    ({ item, index }: { item: Chapter; index: number }) => (
      <MemoizedChapterRow
        chapter={item}
        index={index}
        isCurrent={index === currentIndex}
        onPress={onChapterPress}
      />
    ),
    [currentIndex, onChapterPress],
  );

  const keyExtractor = useCallback(
    (_item: Chapter, index: number) => `chapter-${index}`,
    [],
  );

  if (chapters.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="list-outline" size={32} color={Colors.textTertiary} />
        <Text style={styles.emptyText}>No chapters available</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={chapters}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      bounces={true}
    />
  );
}

export default React.memo(ChapterList);

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: Spacing.sm,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.sm,
    marginVertical: 2,
  },
  rowCurrent: {
    backgroundColor: Colors.surfaceElevated,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  rowPressed: {
    opacity: 0.7,
    backgroundColor: Colors.surfaceElevated,
  },

  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.md,
  },
  currentIcon: {
    marginRight: Spacing.sm,
  },
  rowTextContainer: {
    flex: 1,
  },

  chapterTitle: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 20,
  },
  chapterTitleCurrent: {
    color: Colors.accent,
    fontWeight: '600',
  },

  timestamp: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  timestampCurrent: {
    color: Colors.accent,
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
