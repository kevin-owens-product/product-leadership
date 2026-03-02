import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/constants/theme';
import { useLibraryStore } from '@/stores/libraryStore';
import { useCreditStore } from '@/stores/creditStore';
import ShowCard from '@/components/library/ShowCard';
import type { Show } from '@shared/types';

// ---------------------------------------------------------------------------
// Home / Library screen — "My Podcasts"
// ---------------------------------------------------------------------------

/** Sentinel value used as the "Create New" card at the end of the grid. */
const CREATE_NEW_SENTINEL = '__CREATE_NEW__';
type GridItem = Show | typeof CREATE_NEW_SENTINEL;

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { shows, progressMap, isLoading, fetchShows, fetchProgress, refreshLibrary } =
    useLibraryStore();
  const { balance } = useCreditStore();

  // Refresh library data every time the tab comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchShows();
      fetchProgress();
    }, []),
  );

  // --- Pull-to-refresh ---
  const [refreshing, setRefreshing] = React.useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshLibrary();
    setRefreshing(false);
  }, []);

  // Build grid data: shows + trailing "Create New" card
  const gridData: GridItem[] = [...shows, CREATE_NEW_SENTINEL];

  // --- Renderers ---

  const renderItem = useCallback(
    ({ item, index }: { item: GridItem; index: number }) => {
      if (item === CREATE_NEW_SENTINEL) {
        return <CreateNewCard />;
      }

      const show = item as Show;
      const progress = progressMap[show.id];

      return (
        <View
          style={[
            styles.cardWrapper,
            index % 2 === 0 ? styles.cardLeft : styles.cardRight,
          ]}
        >
          <ShowCard show={show} progress={progress} />
        </View>
      );
    },
    [progressMap],
  );

  const keyExtractor = useCallback(
    (item: GridItem) => (item === CREATE_NEW_SENTINEL ? CREATE_NEW_SENTINEL : (item as Show).id),
    [],
  );

  // --- Empty state ---
  if (!isLoading && shows.length === 0) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Header balance={balance} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎙️</Text>
          <Text style={styles.emptyTitle}>No podcasts yet</Text>
          <Text style={styles.emptySubtitle}>Create your first one!</Text>
          <Pressable
            onPress={() => router.push('/(tabs)/create')}
            style={({ pressed }) => [styles.emptyButton, pressed && styles.emptyButtonPressed]}
          >
            <Ionicons name="add" size={20} color={Colors.text} />
            <Text style={styles.emptyButtonText}>Create Podcast</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // --- Loading state (initial) ---
  if (isLoading && shows.length === 0) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Header balance={balance} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      </View>
    );
  }

  // --- Main grid ---
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Header balance={balance} />
      <FlatList
        data={gridData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
            progressBackgroundColor={Colors.surface}
          />
        }
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Header – "My Podcasts" title + credit balance badge
// ---------------------------------------------------------------------------

function Header({ balance }: { balance: number }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>My Podcasts</Text>
      <Pressable
        onPress={() => router.push('/(tabs)/credits')}
        style={({ pressed }) => [styles.creditBadge, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.creditIcon}>🪙</Text>
        <Text style={styles.creditText}>{balance}</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// CreateNewCard – The trailing "+ Create New" card
// ---------------------------------------------------------------------------

function CreateNewCard() {
  return (
    <View style={[styles.cardWrapper, styles.cardRight]}>
      <Pressable
        onPress={() => router.push('/(tabs)/create')}
        style={({ pressed }) => [styles.createCard, pressed && styles.pressed]}
      >
        <View style={styles.createIconCircle}>
          <Ionicons name="add" size={32} color={Colors.accent} />
        </View>
        <Text style={styles.createText}>Create New</Text>
      </Pressable>
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

  // --- Header ---
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.text,
  },
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  creditIcon: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  creditText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.creditGold,
  },

  // --- Grid ---
  grid: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cardWrapper: {
    flex: 1,
  },
  cardLeft: {
    marginRight: Spacing.sm / 2,
  },
  cardRight: {
    marginLeft: Spacing.sm / 2,
  },

  // --- Create New card ---
  createCard: {
    flex: 1,
    minHeight: 200,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  createIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  createText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },

  // --- Loading ---
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // --- Empty state ---
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  emptyButtonPressed: {
    opacity: 0.8,
  },
  emptyButtonText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
});
