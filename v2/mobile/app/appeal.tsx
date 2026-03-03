import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import {
  getAppealStatus,
  submitAppeal,
  type AppealStatus,
} from '@/services/moderation';

// ============================================================
// Appeal Screen
// Suspended users can view their status and submit an appeal.
// ============================================================

const STATUS_COLORS: Record<string, string> = {
  pending: Colors.warning,
  reviewing: Colors.accentLight,
  approved: Colors.success,
  denied: Colors.error,
};

export default function AppealScreen() {
  const [status, setStatus] = useState<AppealStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [appealText, setAppealText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const data = await getAppealStatus();
      setStatus(data);
    } catch {
      Alert.alert('Error', 'Could not load appeal status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleSubmit = useCallback(async () => {
    if (appealText.trim().length < 20) {
      Alert.alert('Too Short', 'Please provide at least 20 characters explaining your appeal.');
      return;
    }

    setSubmitting(true);
    try {
      await submitAppeal(appealText.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Appeal Submitted', 'Your appeal has been submitted. We will review it and get back to you.');
      setAppealText('');
      loadStatus();
    } catch (err: any) {
      const message = err?.message || err?.context?.message || 'Failed to submit appeal.';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  }, [appealText, loadStatus]);

  const hasPendingAppeal = status?.appeals?.some(
    (a) => a.status === 'pending' || a.status === 'reviewing',
  );

  const suspendedUntil = status?.suspended_until
    ? new Date(status.suspended_until)
    : null;

  const isSuspended = suspendedUntil && suspendedUntil > new Date();

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator color={Colors.accent} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Account Status</Text>
        </View>

        {/* Suspension Banner */}
        {isSuspended && (
          <View style={styles.suspensionBanner}>
            <Ionicons name="alert-circle" size={24} color={Colors.error} />
            <View style={styles.suspensionInfo}>
              <Text style={styles.suspensionTitle}>Account Suspended</Text>
              <Text style={styles.suspensionText}>
                Your account has been suspended due to content policy violations.
                Suspension ends{' '}
                {suspendedUntil.toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
                .
              </Text>
              <Text style={styles.suspensionFlags}>
                Content violations: {status?.moderation_flags ?? 0}
              </Text>
            </View>
          </View>
        )}

        {!isSuspended && (
          <View style={styles.goodStandingBanner}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            <View style={styles.suspensionInfo}>
              <Text style={[styles.suspensionTitle, { color: Colors.success }]}>
                Account in Good Standing
              </Text>
              <Text style={styles.suspensionText}>
                Your account is active with no current restrictions.
              </Text>
            </View>
          </View>
        )}

        {/* Submit Appeal Form */}
        {isSuspended && !hasPendingAppeal && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Submit an Appeal</Text>
            <Text style={styles.sectionSubtitle}>
              If you believe your suspension was a mistake, you can submit an appeal.
              Please explain why you think the moderation decision should be reconsidered.
            </Text>
            <TextInput
              style={styles.textInput}
              value={appealText}
              onChangeText={setAppealText}
              placeholder="Explain why your suspension should be reconsidered..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              maxLength={2000}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {appealText.length}/2000
            </Text>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (submitting || appealText.trim().length < 20) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting || appealText.trim().length < 20}
              activeOpacity={0.7}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.text} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Appeal</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {hasPendingAppeal && (
          <View style={styles.pendingBanner}>
            <Ionicons name="hourglass-outline" size={20} color={Colors.warning} />
            <Text style={styles.pendingText}>
              Your appeal is being reviewed. We will notify you of the outcome.
            </Text>
          </View>
        )}

        {/* Appeal History */}
        {status?.appeals && status.appeals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Appeal History</Text>
            {status.appeals.map((appeal) => (
              <View key={appeal.id} style={styles.appealCard}>
                <View style={styles.appealHeader}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${STATUS_COLORS[appeal.status] || Colors.textTertiary}20` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: STATUS_COLORS[appeal.status] || Colors.textTertiary },
                      ]}
                    >
                      {appeal.status.charAt(0).toUpperCase() + appeal.status.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.appealDate}>
                    {new Date(appeal.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <Text style={styles.appealReason} numberOfLines={3}>
                  {appeal.reason}
                </Text>
                {appeal.admin_response && (
                  <View style={styles.adminResponse}>
                    <Text style={styles.adminResponseLabel}>Admin Response:</Text>
                    <Text style={styles.adminResponseText}>
                      {appeal.admin_response}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
    paddingTop: Spacing.sm,
  },
  backButton: {
    marginRight: Spacing.md,
    padding: Spacing.xs,
  },
  screenTitle: {
    fontSize: FontSize.title,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },

  // Suspension banner
  suspensionBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  goodStandingBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  suspensionInfo: {
    flex: 1,
  },
  suspensionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.error,
    marginBottom: Spacing.xs,
  },
  suspensionText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  suspensionFlags: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },

  // Pending appeal
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  pendingText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.warning,
    lineHeight: 18,
  },

  // Section
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  sectionSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },

  // Text input
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    minHeight: 150,
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'right',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },

  // Submit button
  submitButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },

  // Appeal cards
  appealCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  appealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  appealDate: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  appealReason: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  adminResponse: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  adminResponseLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.accent,
    marginBottom: Spacing.xs,
  },
  adminResponseText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
