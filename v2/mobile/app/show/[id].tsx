import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { usePlayerStore } from '@/stores/playerStore';
import EpisodeRow from '@/components/library/EpisodeRow';
import type { Show, Episode, PlaybackProgress } from '@shared/types';

// ---------------------------------------------------------------------------
// Show Detail Screen
// ---------------------------------------------------------------------------

// Lazy-imported to avoid a hard crash if the component doesn't exist yet.
// GenerationProgress is only rendered when the show is actively generating.
let GenerationProgress: React.ComponentType<{ showId: string }> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  GenerationProgress = require('@/components/create/GenerationProgress').default;
} catch {
  // Component not built yet – we'll handle the null case in the render path.
}

/** Human-readable total duration like "2 hr 15 min" */
function formatTotalDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}

const STATUS_BADGE_CONFIG: Record<string, { label: string; bg: string; fg: string }> = {
  generating: {
    label: 'Generating',
    bg: 'rgba(245, 158, 11, 0.15)',
    fg: Colors.warning,
  },
  ready: {
    label: 'Ready',
    bg: 'rgba(34, 197, 94, 0.15)',
    fg: Colors.success,
  },
  failed: {
    label: 'Failed',
    bg: 'rgba(239, 68, 68, 0.15)',
    fg: Colors.error,
  },
  archived: {
    label: 'Archived',
    bg: 'rgba(102, 102, 102, 0.15)',
    fg: Colors.textTertiary,
  },
};

export default function ShowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { loadEpisode } = usePlayerStore();

  const [show, setShow] = useState<Show | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, PlaybackProgress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Fetch show data ---
  const fetchShowData = useCallback(async () => {
    if (!id) return;

    try {
      setError(null);

      const [showResult, episodesResult, progressResult] = await Promise.all([
        supabase.from('shows').select('*').eq('id', id).single(),
        supabase
          .from('episodes')
          .select('*')
          .eq('show_id', id)
          .order('episode_number', { ascending: true }),
        supabase.from('playback_progress').select('*').eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? ''),
      ]);

      if (showResult.error) throw showResult.error;
      if (episodesResult.error) throw episodesResult.error;

      setShow(showResult.data as Show);
      setEpisodes(episodesResult.data as Episode[]);

      // Build a map of episode_id -> PlaybackProgress for quick lookup
      if (progressResult.data) {
        const episodeIds = new Set((episodesResult.data as Episode[]).map((e) => e.id));
        const map: Record<string, PlaybackProgress> = {};
        for (const p of progressResult.data as PlaybackProgress[]) {
          if (episodeIds.has(p.episode_id)) {
            map[p.episode_id] = p;
          }
        }
        setProgressMap(map);
      }
    } catch (err: any) {
      console.error('[ShowDetail] Failed to fetch show data:', err);
      setError(err.message ?? 'Failed to load show');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchShowData();
  }, [fetchShowData]);

  // --- Realtime subscription for generating shows ---
  useEffect(() => {
    if (!id || !show || show.status !== 'generating') return;

    // Subscribe to changes on this show's row
    const showChannel = supabase
      .channel(`show-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shows',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          if (payload.new) {
            setShow(payload.new as Show);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'episodes',
          filter: `show_id=eq.${id}`,
        },
        (payload) => {
          if (payload.new) {
            const updated = payload.new as Episode;
            setEpisodes((prev) =>
              prev.map((ep) => (ep.id === updated.id ? updated : ep)),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(showChannel);
    };
  }, [id, show?.status]);

  // --- Handlers ---
  const handleEpisodePress = useCallback(
    (episode: Episode) => {
      loadEpisode(episode);
      router.push(`/player/${episode.id}`);
    },
    [loadEpisode],
  );

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, []);

  // --- Loading state ---
  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <BackHeader onBack={handleBack} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      </View>
    );
  }

  // --- Error state ---
  if (error || !show) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <BackHeader onBack={handleBack} />
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>😕</Text>
          <Text style={styles.errorText}>{error ?? 'Show not found'}</Text>
          <Pressable
            onPress={fetchShowData}
            style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // --- Derived values ---
  const badge = STATUS_BADGE_CONFIG[show.status];

  // --- List header (show info) ---
  const ListHeader = (
    <View style={styles.showHeader}>
      {/* Icon + Title row */}
      <View style={styles.showTopRow}>
        <View style={[styles.showIconBox, { backgroundColor: show.color + '25' }]}>
          <Text style={styles.showIcon}>{show.icon}</Text>
        </View>
        <View style={styles.showTitleCol}>
          <Text style={styles.showTitle} numberOfLines={2}>
            {show.title}
          </Text>
          {show.subtitle ? (
            <Text style={styles.showSubtitle} numberOfLines={1}>
              {show.subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Status badge + stats row */}
      <View style={styles.metaRow}>
        {badge != null && (
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
          </View>
        )}
        <Text style={styles.metaText}>
          {show.episode_count} {show.episode_count === 1 ? 'episode' : 'episodes'}
        </Text>
        {show.total_duration_minutes > 0 && (
          <>
            <Text style={styles.metaDot}>{'\u00B7'}</Text>
            <Text style={styles.metaText}>
              {formatTotalDuration(show.total_duration_minutes)}
            </Text>
          </>
        )}
      </View>

      {/* Description */}
      {show.description ? (
        <Text style={styles.description}>{show.description}</Text>
      ) : null}

      {/* Generation progress (only while generating) */}
      {show.status === 'generating' && GenerationProgress != null && (
        <View style={styles.generationWrapper}>
          <GenerationProgress showId={show.id} />
        </View>
      )}

      {/* Section heading for episodes */}
      <Text style={styles.sectionTitle}>Episodes</Text>
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <BackHeader onBack={handleBack} title={show.title} />

      <FlatList
        data={episodes}
        keyExtractor={(ep) => ep.id}
        renderItem={({ item }) => (
          <EpisodeRow
            episode={item}
            episodeNumber={item.episode_number}
            progress={progressMap[item.id]}
            onPress={() => handleEpisodePress(item)}
          />
        )}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyEpisodes}>
            <Text style={styles.emptyEpisodesText}>
              {show.status === 'generating'
                ? 'Episodes are being generated...'
                : 'No episodes available.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// BackHeader – minimal header with back arrow and optional title
// ---------------------------------------------------------------------------

function BackHeader({ onBack, title }: { onBack: () => void; title?: string }) {
  return (
    <View style={styles.backHeader}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
      >
        <Ionicons name="chevron-back" size={24} color={Colors.text} />
      </Pressable>
      {title ? (
        <Text style={styles.backHeaderTitle} numberOfLines={1}>
          {title}
        </Text>
      ) : null}
      {/* Spacer so title is optically centered */}
      <View style={styles.backHeaderSpacer} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
  },

  // --- Back header ---
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backHeaderTitle: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  backHeaderSpacer: {
    width: 36,
  },

  // --- Show header ---
  showHeader: {
    paddingBottom: Spacing.lg,
  },
  showTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  showIconBox: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  showIcon: {
    fontSize: 36,
  },
  showTitleCol: {
    flex: 1,
  },
  showTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  showSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  // --- Meta row ---
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  metaText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  metaDot: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },

  // --- Description ---
  description: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },

  // --- Generation progress ---
  generationWrapper: {
    marginBottom: Spacing.lg,
  },

  // --- Episodes section ---
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  emptyEpisodes: {
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
  },
  emptyEpisodesText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
  },

  // --- Error state ---
  errorIcon: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  retryButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  retryText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
});
