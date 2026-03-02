import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/constants/theme';
import { Config } from '@/constants/config';
import { useCreditStore } from '@/stores/creditStore';
import { createShow } from '@/services/shows';
import { calculateCreditsNeeded } from '@shared/types';
import type { CreateShowRequest } from '@shared/types';
import PromptInput from '@/components/create/PromptInput';

// ---------------------------------------------------------------------------
// Create Podcast Screen
//
// The main creation flow: user describes a concept, picks options, and the
// app generates the podcast. Premium feel with haptic feedback, cost preview,
// and smooth error handling.
// ---------------------------------------------------------------------------

type EpisodeCount = 3 | 6 | 9 | 12;
type EpisodeLength = 15 | 30 | 60;
type VoiceTier = 'standard' | 'premium';

const EPISODE_COUNT_OPTIONS: EpisodeCount[] = [3, 6, 9, 12];
const EPISODE_LENGTH_OPTIONS: { value: EpisodeLength; label: string }[] = [
  { value: 15, label: '~15 min' },
  { value: 30, label: '~30 min' },
  { value: 60, label: '~60 min' },
];

export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const { balance, fetchBalance } = useCreditStore();

  // --- form state ---
  const [prompt, setPrompt] = useState('');
  const [episodeCount, setEpisodeCount] = useState<EpisodeCount>(
    Config.defaultEpisodeCount as EpisodeCount,
  );
  const [episodeLength, setEpisodeLength] = useState<EpisodeLength>(
    Config.defaultEpisodeLengthMinutes,
  );
  const [voiceTier, setVoiceTier] = useState<VoiceTier>(Config.defaultVoiceTier);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- derived values ---
  const creditsNeeded = useMemo(
    () => calculateCreditsNeeded(episodeCount, episodeLength, voiceTier),
    [episodeCount, episodeLength, voiceTier],
  );

  const hasEnoughCredits = balance >= creditsNeeded;
  const isPromptEmpty = prompt.trim().length === 0;
  const canSubmit = !isPromptEmpty && hasEnoughCredits && !isSubmitting;

  // --- handlers ---
  const handleSelectEpisodeCount = useCallback((count: EpisodeCount) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEpisodeCount(count);
  }, []);

  const handleSelectEpisodeLength = useCallback((length: EpisodeLength) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEpisodeLength(length);
  }, []);

  const handleToggleVoiceTier = useCallback((tier: VoiceTier) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVoiceTier(tier);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);

    try {
      const request: CreateShowRequest = {
        user_prompt: prompt.trim(),
        episode_count: episodeCount,
        episode_length_minutes: episodeLength,
        voice_tier: voiceTier,
      };

      const response = await createShow(request);

      // Refresh credit balance after deduction
      fetchBalance();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate to the show detail page
      router.push(`/show/${response.show.id}`);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Generation Failed',
        err?.message ?? 'Something went wrong. Please try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, prompt, episodeCount, episodeLength, voiceTier]);

  const handleBuyCredits = useCallback(() => {
    router.push('/(tabs)/profile');
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xxxl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.screenTitle}>Create a Podcast</Text>
        <Text style={styles.screenSubtitle}>
          Describe your idea and we'll generate a full podcast series for you.
        </Text>

        {/* Prompt Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>What's your podcast about?</Text>
          <PromptInput
            value={prompt}
            onChangeText={setPrompt}
            maxLength={Config.maxPromptLength}
            editable={!isSubmitting}
          />
        </View>

        {/* Episode Count */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Number of episodes</Text>
          <View style={styles.chipRow}>
            {EPISODE_COUNT_OPTIONS.map((count) => {
              const selected = count === episodeCount;
              return (
                <TouchableOpacity
                  key={count}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => handleSelectEpisodeCount(count)}
                  activeOpacity={0.7}
                  disabled={isSubmitting}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selected && styles.chipTextSelected,
                    ]}
                  >
                    {count}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Episode Length */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Episode length</Text>
          <View style={styles.chipRow}>
            {EPISODE_LENGTH_OPTIONS.map(({ value, label }) => {
              const selected = value === episodeLength;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.chip, styles.chipWide, selected && styles.chipSelected]}
                  onPress={() => handleSelectEpisodeLength(value)}
                  activeOpacity={0.7}
                  disabled={isSubmitting}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selected && styles.chipTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Voice Quality */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Voice quality</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleOption,
                styles.toggleOptionLeft,
                voiceTier === 'standard' && styles.toggleOptionSelected,
              ]}
              onPress={() => handleToggleVoiceTier('standard')}
              activeOpacity={0.7}
              disabled={isSubmitting}
            >
              <Text
                style={[
                  styles.toggleLabel,
                  voiceTier === 'standard' && styles.toggleLabelSelected,
                ]}
              >
                Standard
              </Text>
              <Text style={styles.toggleSublabel}>Free</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleOption,
                styles.toggleOptionRight,
                voiceTier === 'premium' && styles.toggleOptionSelected,
              ]}
              onPress={() => handleToggleVoiceTier('premium')}
              activeOpacity={0.7}
              disabled={isSubmitting}
            >
              <Text
                style={[
                  styles.toggleLabel,
                  voiceTier === 'premium' && styles.toggleLabelSelected,
                ]}
              >
                Premium
              </Text>
              <Text style={styles.toggleSublabel}>+1 credit/ep</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Credit Cost Summary */}
        <View style={styles.costContainer}>
          <View style={styles.costRow}>
            <View style={styles.costLeft}>
              <Ionicons
                name="sparkles"
                size={18}
                color={Colors.creditGold}
                style={styles.costIcon}
              />
              <Text style={styles.costLabel}>
                This will use{' '}
                <Text style={styles.costValue}>{creditsNeeded} credits</Text>
              </Text>
            </View>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Your balance:</Text>
            <Text
              style={[
                styles.balanceValue,
                !hasEnoughCredits && styles.balanceInsufficient,
              ]}
            >
              {balance} credits
            </Text>
          </View>

          {!hasEnoughCredits && (
            <TouchableOpacity
              style={styles.insufficientBanner}
              onPress={handleBuyCredits}
              activeOpacity={0.7}
            >
              <Ionicons
                name="alert-circle"
                size={16}
                color={Colors.warning}
                style={styles.insufficientIcon}
              />
              <Text style={styles.insufficientText}>
                Not enough credits.{' '}
                <Text style={styles.insufficientLink}>Buy more</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color={Colors.text} size="small" />
          ) : (
            <View style={styles.submitButtonContent}>
              <Ionicons
                name="rocket-outline"
                size={20}
                color={Colors.text}
                style={styles.submitIcon}
              />
              <Text style={styles.submitButtonText}>Generate My Podcast</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollContent: {
    paddingHorizontal: Spacing.xl,
  },

  // --- Header ---
  screenTitle: {
    fontSize: FontSize.title,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
  },
  screenSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.xxl,
  },

  // --- Sections ---
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },

  // --- Chip selectors ---
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipWide: {
    // slightly wider for text labels
  },
  chipSelected: {
    backgroundColor: Colors.accentDark,
    borderColor: Colors.accent,
  },
  chipText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.text,
  },

  // --- Voice toggle ---
  toggleRow: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  toggleOptionLeft: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: Colors.border,
  },
  toggleOptionRight: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: Colors.border,
  },
  toggleOptionSelected: {
    backgroundColor: Colors.accentDark,
  },
  toggleLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  toggleLabelSelected: {
    color: Colors.text,
  },
  toggleSublabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  // --- Cost summary ---
  costContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  costLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  costIcon: {
    marginRight: Spacing.sm,
  },
  costLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  costValue: {
    fontWeight: '700',
    color: Colors.creditGold,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  balanceValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  balanceInsufficient: {
    color: Colors.error,
  },
  insufficientBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
  },
  insufficientIcon: {
    marginRight: Spacing.sm,
  },
  insufficientText: {
    fontSize: FontSize.sm,
    color: Colors.warning,
    flex: 1,
  },
  insufficientLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // --- Submit button ---
  submitButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.elevated,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitIcon: {
    marginRight: Spacing.sm,
  },
  submitButtonText: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
