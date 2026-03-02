import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';

import { usePlayerStore } from '@/stores/playerStore';
import { getBookmarks, addBookmark, deleteBookmark } from '@/services/playback';
import { getShow } from '@/services/shows';
import { parseDialogue, parseChapters } from '@/lib/parseDialogue';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

import PlayerControls from '@/components/player/PlayerControls';
import ProgressSlider from '@/components/player/ProgressSlider';
import ChapterList from '@/components/player/ChapterList';
import TranscriptView from '@/components/player/TranscriptView';
import SpeedControl from '@/components/player/SpeedControl';

import type { Bookmark, DialogueLine, Chapter } from '@shared/types';

// ============================================================
// Full-Screen Player
// Immersive episode player with artwork, transport controls,
// progress slider, speed control, bookmarks, sleep timer, and
// tabbed chapters/transcript/bookmarks section.
//
// Audio playback is managed entirely by the playerStore which
// owns the expo-av Sound instance. This screen reads state from
// the store and dispatches actions to it.
// ============================================================

type TabName = 'chapters' | 'transcript' | 'bookmarks';

const SKIP_BACK_SECONDS = 15;
const SKIP_FORWARD_SECONDS = 30;
const SLEEP_TIMER_OPTIONS = [5, 10, 15, 30, 45, 60]; // minutes

/** Format seconds as M:SS */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlayerScreen() {
  const { episodeId } = useLocalSearchParams<{ episodeId: string }>();

  // --- Store state ---
  const currentEpisode = usePlayerStore((s) => s.currentEpisode);
  const currentShow = usePlayerStore((s) => s.currentShow);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLoading = usePlayerStore((s) => s.isLoading);
  const positionSeconds = usePlayerStore((s) => s.positionSeconds);
  const durationSeconds = usePlayerStore((s) => s.durationSeconds);
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const sleepTimerEndTime = usePlayerStore((s) => s.sleepTimerEndTime);

  // --- Store actions ---
  const storeLoadEpisode = usePlayerStore((s) => s.loadEpisode);
  const storeToggle = usePlayerStore((s) => s.toggle);
  const storeSeekTo = usePlayerStore((s) => s.seekTo);
  const storeSkipForward = usePlayerStore((s) => s.skipForward);
  const storeSkipBack = usePlayerStore((s) => s.skipBack);
  const storeSetPlaybackRate = usePlayerStore((s) => s.setPlaybackRate);
  const storeSleepTimer = usePlayerStore((s) => s.setSleepTimer);
  const storeClearSleepTimer = usePlayerStore((s) => s.clearSleepTimer);

  // --- Local state ---
  const [activeTab, setActiveTab] = useState<TabName>('chapters');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // --- Derived data ---
  const episode = currentEpisode;
  const show = currentShow;

  const dialogueLines = useMemo<DialogueLine[]>(() => {
    if (!episode?.script_markdown) return [];
    return parseDialogue(episode.script_markdown);
  }, [episode?.script_markdown]);

  const chapters = useMemo<Chapter[]>(() => {
    if (!episode?.script_markdown || durationSeconds <= 0) return [];
    return parseChapters(episode.script_markdown, durationSeconds);
  }, [episode?.script_markdown, durationSeconds]);

  // --- Sleep timer display ---
  const sleepTimerRemaining = useMemo(() => {
    if (!sleepTimerEndTime) return null;
    const remaining = Math.max(0, (sleepTimerEndTime - Date.now()) / 1000 / 60);
    return Math.ceil(remaining);
  }, [sleepTimerEndTime]);

  // -----------------------------------------------------------------
  // Load episode into the store if navigating directly (e.g. deep link)
  // -----------------------------------------------------------------
  useEffect(() => {
    if (!episodeId) return;
    // Episode already loaded in the store — nothing to do.
    if (episode && episode.id === episodeId) return;

    let cancelled = false;

    async function fetchAndLoad() {
      try {
        setLoadError(null);

        // We need the show to find the episode. The episodeId belongs to a show,
        // so we need to find the show first. Use the Supabase client to query
        // the episode's show_id, then load both.
        const { supabase } = await import('@/services/supabase');
        const { data: episodeRow, error: epError } = await supabase
          .from('episodes')
          .select('*')
          .eq('id', episodeId)
          .single();

        if (epError || !episodeRow) {
          throw new Error('Episode not found');
        }

        if (cancelled) return;

        const { show: showData } = await getShow(episodeRow.show_id);

        if (cancelled) return;

        await storeLoadEpisode(showData, episodeRow);
      } catch (err) {
        if (!cancelled) {
          console.error('[PlayerScreen] Failed to load episode:', err);
          setLoadError('Could not load episode. Please try again.');
        }
      }
    }

    fetchAndLoad();
    return () => {
      cancelled = true;
    };
  }, [episodeId, episode, storeLoadEpisode]);

  // --- Load bookmarks ---
  useEffect(() => {
    if (!episodeId) return;
    let cancelled = false;

    async function loadBookmarks() {
      try {
        const data = await getBookmarks(episodeId!);
        if (!cancelled) setBookmarks(data);
      } catch {
        // Silently fail -- bookmarks are non-critical
      }
    }

    loadBookmarks();
    return () => {
      cancelled = true;
    };
  }, [episodeId]);

  // -----------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------

  const handleDismiss = useCallback(() => {
    router.back();
  }, []);

  const handleToggle = useCallback(() => {
    storeToggle();
  }, [storeToggle]);

  const handleSkipBack = useCallback(() => {
    storeSkipBack(SKIP_BACK_SECONDS);
  }, [storeSkipBack]);

  const handleSkipForward = useCallback(() => {
    storeSkipForward(SKIP_FORWARD_SECONDS);
  }, [storeSkipForward]);

  const handleSeek = useCallback(
    (seconds: number) => {
      storeSeekTo(seconds);
    },
    [storeSeekTo],
  );

  const handleRateChange = useCallback(
    (rate: number) => {
      storeSetPlaybackRate(rate);
    },
    [storeSetPlaybackRate],
  );

  const handleChapterPress = useCallback(
    (seconds: number) => {
      storeSeekTo(seconds);
    },
    [storeSeekTo],
  );

  const handleAddBookmark = useCallback(async () => {
    if (!episodeId || isBookmarking) return;
    setIsBookmarking(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const bookmark = await addBookmark(episodeId, Math.floor(positionSeconds));
      setBookmarks((prev) =>
        [...prev, bookmark].sort(
          (a, b) => a.position_seconds - b.position_seconds,
        ),
      );
    } catch {
      Alert.alert('Error', 'Could not save bookmark. Please try again.');
    } finally {
      setIsBookmarking(false);
    }
  }, [episodeId, positionSeconds, isBookmarking]);

  const handleDeleteBookmark = useCallback(
    async (bookmarkId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        await deleteBookmark(bookmarkId);
        setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
      } catch {
        Alert.alert('Error', 'Could not delete bookmark.');
      }
    },
    [],
  );

  const handleBookmarkSeek = useCallback(
    (seconds: number) => {
      storeSeekTo(seconds);
    },
    [storeSeekTo],
  );

  const handleSleepTimer = useCallback(() => {
    if (sleepTimerEndTime) {
      // Timer is active -- offer to cancel
      Alert.alert(
        'Sleep Timer',
        `Timer set for ~${sleepTimerRemaining} min. Cancel it?`,
        [
          { text: 'Keep', style: 'cancel' },
          {
            text: 'Cancel Timer',
            style: 'destructive',
            onPress: () => storeClearSleepTimer(),
          },
        ],
      );
      return;
    }

    // Show timer options
    Alert.alert(
      'Sleep Timer',
      'Stop playback after:',
      [
        ...SLEEP_TIMER_OPTIONS.map((minutes) => ({
          text: `${minutes} minutes`,
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            storeSleepTimer(minutes);
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, [sleepTimerEndTime, sleepTimerRemaining, storeSleepTimer, storeClearSleepTimer]);

  // -----------------------------------------------------------------
  // Loading / error states
  // -----------------------------------------------------------------
  if (loadError) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{loadError}</Text>
          <Pressable
            onPress={handleDismiss}
            style={({ pressed }) => [
              styles.errorBackButton,
              pressed && styles.errorBackButtonPressed,
            ]}
          >
            <Text style={styles.errorBackButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!episode || isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading episode...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const showColor = show?.color ?? Colors.accent;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* --- Header --- */}
        <View style={styles.header}>
          <Pressable
            onPress={handleDismiss}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={({ pressed }) => [
              styles.dismissButton,
              pressed && styles.dismissButtonPressed,
            ]}
          >
            <Ionicons name="chevron-down" size={28} color={Colors.text} />
          </Pressable>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerShowTitle} numberOfLines={1}>
              {show?.title ?? 'Now Playing'}
            </Text>
          </View>

          {/* Spacer to balance the dismiss button */}
          <View style={styles.headerSpacer} />
        </View>

        {/* --- Artwork --- */}
        <View style={styles.artworkContainer}>
          <View style={[styles.artwork, { backgroundColor: showColor }]}>
            <Text style={styles.artworkEmoji}>{show?.icon ?? '🎙️'}</Text>
          </View>
        </View>

        {/* --- Episode Info --- */}
        <View style={styles.episodeInfo}>
          <Text style={styles.episodeTitle} numberOfLines={2}>
            {episode.title}
          </Text>
          {episode.subtitle && (
            <Text style={styles.episodeSubtitle} numberOfLines={1}>
              {episode.subtitle}
            </Text>
          )}
        </View>

        {/* --- Progress Slider --- */}
        <ProgressSlider
          position={positionSeconds}
          duration={durationSeconds}
          onSeek={handleSeek}
        />

        {/* --- Transport Controls --- */}
        <PlayerControls
          isPlaying={isPlaying}
          onToggle={handleToggle}
          onSkipBack={handleSkipBack}
          onSkipForward={handleSkipForward}
          disabled={!episode.audio_url}
        />

        {/* --- Speed Control --- */}
        <SpeedControl rate={playbackRate} onRateChange={handleRateChange} />

        {/* --- Action Row: Bookmark + Sleep Timer --- */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={handleAddBookmark}
            disabled={isBookmarking}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <Ionicons name="bookmark-outline" size={20} color={Colors.text} />
            <Text style={styles.actionButtonText}>Bookmark</Text>
          </Pressable>

          <Pressable
            onPress={handleSleepTimer}
            style={({ pressed }) => [
              styles.actionButton,
              sleepTimerEndTime ? styles.actionButtonActive : undefined,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <Ionicons
              name="moon-outline"
              size={20}
              color={sleepTimerEndTime ? Colors.accent : Colors.text}
            />
            <Text
              style={[
                styles.actionButtonText,
                sleepTimerEndTime && styles.actionButtonTextActive,
              ]}
            >
              {sleepTimerEndTime ? `${sleepTimerRemaining}m` : 'Sleep'}
            </Text>
          </Pressable>
        </View>

        {/* --- Tabbed Section --- */}
        <View style={styles.tabContainer}>
          <View style={styles.tabBar}>
            <TabButton
              label="Chapters"
              isActive={activeTab === 'chapters'}
              onPress={() => setActiveTab('chapters')}
            />
            <TabButton
              label="Transcript"
              isActive={activeTab === 'transcript'}
              onPress={() => setActiveTab('transcript')}
            />
            <TabButton
              label="Bookmarks"
              isActive={activeTab === 'bookmarks'}
              onPress={() => setActiveTab('bookmarks')}
              badge={bookmarks.length > 0 ? bookmarks.length : undefined}
            />
          </View>

          <View style={styles.tabContent}>
            {activeTab === 'chapters' && (
              <ChapterList
                chapters={chapters}
                currentSeconds={positionSeconds}
                onChapterPress={handleChapterPress}
              />
            )}

            {activeTab === 'transcript' && (
              <TranscriptView
                lines={dialogueLines}
                currentSeconds={positionSeconds}
                duration={durationSeconds}
              />
            )}

            {activeTab === 'bookmarks' && (
              <BookmarksList
                bookmarks={bookmarks}
                onSeek={handleBookmarkSeek}
                onDelete={handleDeleteBookmark}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// TabButton -- tab bar button with optional badge
// ============================================================

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  badge?: number;
}

function TabButton({ label, isActive, onPress, badge }: TabButtonProps) {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.tabButton,
        isActive && styles.tabButtonActive,
        pressed && styles.tabButtonPressed,
      ]}
    >
      <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
        {label}
      </Text>
      {badge !== undefined && badge > 0 && (
        <View style={styles.tabBadge}>
          <Text style={styles.tabBadgeText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ============================================================
// BookmarksList -- list of user bookmarks with seek + delete
// ============================================================

interface BookmarksListProps {
  bookmarks: Bookmark[];
  onSeek: (seconds: number) => void;
  onDelete: (id: string) => void;
}

function BookmarksList({ bookmarks, onSeek, onDelete }: BookmarksListProps) {
  if (bookmarks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="bookmark-outline" size={32} color={Colors.textTertiary} />
        <Text style={styles.emptyText}>No bookmarks yet</Text>
        <Text style={styles.emptySubtext}>
          Tap the bookmark button to save your place
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.bookmarksList}>
      {bookmarks.map((bookmark) => (
        <View key={bookmark.id} style={styles.bookmarkRow}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSeek(bookmark.position_seconds);
            }}
            style={({ pressed }) => [
              styles.bookmarkContent,
              pressed && styles.bookmarkContentPressed,
            ]}
          >
            <Ionicons name="bookmark" size={16} color={Colors.accent} />
            <View style={styles.bookmarkInfo}>
              <Text style={styles.bookmarkTime}>
                {formatTime(bookmark.position_seconds)}
              </Text>
              {bookmark.note && (
                <Text style={styles.bookmarkNote} numberOfLines={1}>
                  {bookmark.note}
                </Text>
              )}
            </View>
          </Pressable>

          <Pressable
            onPress={() => onDelete(bookmark.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => [
              styles.bookmarkDeleteButton,
              pressed && styles.bookmarkDeletePressed,
            ]}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl * 2,
  },

  // Loading / Error
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.error,
    textAlign: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
  errorBackButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
  },
  errorBackButtonPressed: {
    opacity: 0.7,
  },
  errorBackButtonText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  dismissButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButtonPressed: {
    backgroundColor: Colors.surfaceElevated,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerShowTitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  headerSpacer: {
    width: 40,
  },

  // Artwork
  artworkContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  artwork: {
    width: 260,
    height: 260,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  artworkEmoji: {
    fontSize: 80,
  },

  // Episode info
  episodeInfo: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
  },
  episodeTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 30,
  },
  episodeSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xxxl,
    paddingVertical: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
  },
  actionButtonActive: {
    backgroundColor: Colors.accentDark,
  },
  actionButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  actionButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.text,
  },
  actionButtonTextActive: {
    color: Colors.accentLight,
  },

  // Tab bar
  tabContainer: {
    marginTop: Spacing.xxl,
    minHeight: 300,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: Spacing.xs,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: Colors.accent,
  },
  tabButtonPressed: {
    opacity: 0.7,
  },
  tabButtonText: {
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  tabButtonTextActive: {
    color: Colors.text,
  },
  tabBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.text,
  },

  tabContent: {
    minHeight: 200,
  },

  // Empty states (shared)
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl * 2,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },

  // Bookmarks list
  bookmarksList: {
    paddingVertical: Spacing.sm,
  },
  bookmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  bookmarkContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  bookmarkContentPressed: {
    backgroundColor: Colors.surfaceElevated,
  },
  bookmarkInfo: {
    flex: 1,
  },
  bookmarkTime: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  bookmarkNote: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bookmarkDeleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkDeletePressed: {
    backgroundColor: Colors.surfaceElevated,
  },
});
