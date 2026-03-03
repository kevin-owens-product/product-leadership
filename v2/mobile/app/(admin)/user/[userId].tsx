import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import {
  getUserModerationProfile,
  actionUser,
  reviewAppeal,
  type UserModerationProfile,
  type UserAction,
} from '@/services/admin';

// ============================================================
// Admin User Detail Screen
// Full moderation profile for a single user: flags, actions,
// reports, auto-moderation log, and appeals.
// ============================================================

export default function AdminUserDetail() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [data, setData] = useState<UserModerationProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const profile = await getUserModerationProfile(userId);
      setData(profile);
    } catch {
      Alert.alert('Error', 'Failed to load user profile.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleAction = useCallback(
    (action: UserAction, label: string) => {
      Alert.alert(
        `Confirm: ${label}`,
        `Are you sure you want to ${label.toLowerCase()} this user?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: label,
            style: action === 'reset_flags' || action === 'unsuspend' ? 'default' : 'destructive',
            onPress: async () => {
              try {
                await actionUser(userId!, action, `Admin action: ${label}`);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                loadProfile();
              } catch {
                Alert.alert('Error', 'Failed to apply action.');
              }
            },
          },
        ],
      );
    },
    [userId, loadProfile],
  );

  const handleReviewAppeal = useCallback(
    (appealId: string, decision: 'approved' | 'denied') => {
      Alert.prompt(
        decision === 'approved' ? 'Approve Appeal' : 'Deny Appeal',
        'Add an optional message to the user:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: decision === 'approved' ? 'Approve' : 'Deny',
            onPress: async (response?: string) => {
              try {
                await reviewAppeal(appealId, decision, response || undefined);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                loadProfile();
              } catch {
                Alert.alert('Error', 'Failed to review appeal.');
              }
            },
          },
        ],
        'plain-text',
      );
    },
    [loadProfile],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator color={Colors.accent} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.emptyText}>User not found.</Text>
      </SafeAreaView>
    );
  }

  const { profile } = data;
  const isSuspended =
    profile.suspended_until && new Date(profile.suspended_until) > new Date();

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
          <Text style={styles.screenTitle}>User Profile</Text>
        </View>

        {/* User Info */}
        <View style={styles.card}>
          <Text style={styles.userName}>{profile.display_name || 'Anonymous'}</Text>
          <View style={styles.metaRow}>
            <MetaChip label={`${profile.moderation_flags} flags`} color={Colors.warning} />
            <MetaChip label={profile.tier} color={Colors.accent} />
            <MetaChip label={`${profile.credits_balance} credits`} color={Colors.success} />
            {isSuspended && <MetaChip label="Suspended" color={Colors.error} />}
          </View>
          <Text style={styles.userId}>ID: {profile.id}</Text>
          <Text style={styles.userDate}>
            Joined {new Date(profile.created_at).toLocaleDateString()}
          </Text>
        </View>

        {/* Admin Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionsGrid}>
            <AdminAction label="Warn" icon="warning-outline" color={Colors.warning}
              onPress={() => handleAction('warn', 'Warn')} />
            {isSuspended ? (
              <AdminAction label="Unsuspend" icon="checkmark-circle-outline" color={Colors.success}
                onPress={() => handleAction('unsuspend', 'Unsuspend')} />
            ) : (
              <AdminAction label="Suspend" icon="ban-outline" color={Colors.error}
                onPress={() => handleAction('suspend', 'Suspend')} />
            )}
            <AdminAction label="Ban" icon="close-circle-outline" color={Colors.error}
              onPress={() => handleAction('ban', 'Ban')} />
            <AdminAction label="Reset Flags" icon="refresh-outline" color={Colors.textSecondary}
              onPress={() => handleAction('reset_flags', 'Reset Flags')} />
          </View>
        </View>

        {/* Pending Appeals */}
        {data.appeals.filter((a) => a.status === 'pending').length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Appeals</Text>
            {data.appeals
              .filter((a) => a.status === 'pending')
              .map((appeal) => (
                <View key={appeal.id} style={styles.card}>
                  <Text style={styles.cardBody}>{appeal.reason}</Text>
                  <Text style={styles.cardDate}>
                    {new Date(appeal.created_at).toLocaleString()}
                  </Text>
                  <View style={styles.appealActions}>
                    <TouchableOpacity
                      style={[styles.appealButton, { backgroundColor: Colors.success }]}
                      onPress={() => handleReviewAppeal(appeal.id, 'approved')}
                    >
                      <Text style={styles.appealButtonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.appealButton, { backgroundColor: Colors.error }]}
                      onPress={() => handleReviewAppeal(appeal.id, 'denied')}
                    >
                      <Text style={styles.appealButtonText}>Deny</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
          </View>
        )}

        {/* Moderation Actions History */}
        {data.moderation_actions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Moderation History</Text>
            {data.moderation_actions.map((action) => (
              <View key={action.id} style={styles.historyRow}>
                <View style={[styles.historyDot, { backgroundColor: actionColor(action.action_type) }]} />
                <View style={styles.historyContent}>
                  <Text style={styles.historyType}>
                    {action.action_type.charAt(0).toUpperCase() + action.action_type.slice(1)}
                  </Text>
                  <Text style={styles.historyReason} numberOfLines={2}>
                    {action.reason}
                  </Text>
                  <Text style={styles.historyDate}>
                    {new Date(action.created_at).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Auto-Moderation Failures */}
        {data.auto_moderation_failures.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Auto-Moderation Failures ({data.auto_moderation_failures.length})
            </Text>
            {data.auto_moderation_failures.map((log) => (
              <View key={log.id} style={styles.card}>
                <View style={styles.logHeader}>
                  <Text style={styles.logCategory}>
                    {log.category?.replace(/_/g, ' ') || 'Unknown'}
                  </Text>
                  <Text style={styles.logType}>{log.check_type.replace(/_/g, ' ')}</Text>
                </View>
                <Text style={styles.logReason} numberOfLines={2}>
                  {log.reason}
                </Text>
                <Text style={styles.logInput} numberOfLines={3}>
                  Input: {log.input_text}
                </Text>
                <Text style={styles.cardDate}>{new Date(log.created_at).toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}

        {/* All Appeals */}
        {data.appeals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Appeals</Text>
            {data.appeals.map((appeal) => (
              <View key={appeal.id} style={styles.card}>
                <View style={styles.appealHeader}>
                  <Text
                    style={[
                      styles.appealStatus,
                      { color: appealStatusColor(appeal.status) },
                    ]}
                  >
                    {appeal.status.charAt(0).toUpperCase() + appeal.status.slice(1)}
                  </Text>
                  <Text style={styles.cardDate}>
                    {new Date(appeal.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.cardBody} numberOfLines={3}>
                  {appeal.reason}
                </Text>
                {appeal.admin_response && (
                  <Text style={styles.adminNote}>
                    Response: {appeal.admin_response}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function MetaChip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.metaChip, { backgroundColor: `${color}20` }]}>
      <Text style={[styles.metaChipText, { color }]}>{label}</Text>
    </View>
  );
}

function AdminAction({
  label,
  icon,
  color,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.adminActionButton} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.adminActionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function actionColor(type: string): string {
  const map: Record<string, string> = {
    warning: Colors.warning,
    content_removed: Colors.error,
    suspended: Colors.error,
    banned: Colors.error,
  };
  return map[type] || Colors.textTertiary;
}

function appealStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: Colors.warning,
    reviewing: Colors.accentLight,
    approved: Colors.success,
    denied: Colors.error,
  };
  return map[status] || Colors.textTertiary;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: Spacing.xxxl,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    marginBottom: Spacing.xxl,
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

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardBody: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  cardDate: {
    fontSize: 10,
    color: Colors.textTertiary,
  },

  // User info
  userName: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  metaChip: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  metaChipText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  userId: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
  },
  userDate: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  // Section
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },

  // Admin actions
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  adminActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  adminActionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },

  // Appeal actions
  appealActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  appealButton: {
    flex: 1,
    borderRadius: BorderRadius.md,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appealButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  appealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  appealStatus: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  adminNote: {
    fontSize: FontSize.xs,
    color: Colors.accent,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
  },

  // History timeline
  historyRow: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  historyContent: {
    flex: 1,
  },
  historyType: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  historyReason: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 10,
    color: Colors.textTertiary,
  },

  // Log entries
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  logCategory: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.error,
    textTransform: 'capitalize',
  },
  logType: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textTransform: 'capitalize',
  },
  logReason: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  logInput: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
    lineHeight: 14,
    marginBottom: Spacing.xs,
  },
});
