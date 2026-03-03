import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import {
  getReports,
  getFlaggedUsers,
  actionReport,
  getAdminNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  type AdminReport,
  type FlaggedUser,
  type ReportAction,
  type AdminNotification,
} from '@/services/admin';

// ============================================================
// Admin Dashboard
// Overview of content reports, flagged users, and notifications.
// ============================================================

type Tab = 'reports' | 'users' | 'notifications';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('reports');
  const [refreshing, setRefreshing] = useState(false);

  // Reports
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportFilter, setReportFilter] = useState<string>('pending');

  // Users
  const [users, setUsers] = useState<FlaggedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Notifications
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadReports = useCallback(async () => {
    try {
      const data = await getReports(reportFilter);
      setReports(data.reports || []);
    } catch {
      Alert.alert('Error', 'Failed to load reports.');
    } finally {
      setReportsLoading(false);
    }
  }, [reportFilter]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await getFlaggedUsers();
      setUsers(data.users || []);
    } catch {
      Alert.alert('Error', 'Failed to load flagged users.');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const [notifs, count] = await Promise.all([
        getAdminNotifications(),
        getUnreadNotificationCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch {
      // silent
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
    loadUsers();
    loadNotifications();
  }, [loadReports, loadUsers, loadNotifications]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadReports(), loadUsers(), loadNotifications()]);
    setRefreshing(false);
  }, [loadReports, loadUsers, loadNotifications]);

  const handleActionReport = useCallback(
    async (reportId: string, action: ReportAction) => {
      const labels: Record<ReportAction, string> = {
        dismiss: 'Dismiss',
        warn_user: 'Warn User',
        remove_content: 'Remove Content',
        suspend_user: 'Suspend User (30 days)',
        ban_user: 'Ban User (permanent)',
      };

      Alert.alert(
        `Confirm: ${labels[action]}`,
        `Are you sure you want to ${labels[action].toLowerCase()} for this report?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: labels[action],
            style: action === 'dismiss' ? 'default' : 'destructive',
            onPress: async () => {
              try {
                await actionReport(reportId, action);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                loadReports();
              } catch {
                Alert.alert('Error', 'Failed to action report.');
              }
            },
          },
        ],
      );
    },
    [loadReports],
  );

  const handleReadNotification = useCallback(
    async (id: string) => {
      try {
        await markNotificationRead(id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // silent
      }
    },
    [],
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Admin Dashboard</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TabButton
          label="Reports"
          isActive={activeTab === 'reports'}
          badge={reports.filter((r) => r.status === 'pending').length || undefined}
          onPress={() => setActiveTab('reports')}
        />
        <TabButton
          label="Users"
          isActive={activeTab === 'users'}
          badge={users.length || undefined}
          onPress={() => setActiveTab('users')}
        />
        <TabButton
          label="Alerts"
          isActive={activeTab === 'notifications'}
          badge={unreadCount || undefined}
          onPress={() => setActiveTab('notifications')}
        />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.accent}
          />
        }
      >
        {activeTab === 'reports' && (
          <ReportsTab
            reports={reports}
            loading={reportsLoading}
            filter={reportFilter}
            onFilterChange={(f) => {
              setReportFilter(f);
              setReportsLoading(true);
            }}
            onAction={handleActionReport}
            onNavigateUser={(userId) =>
              router.push(`/(admin)/user/${userId}`)
            }
          />
        )}

        {activeTab === 'users' && (
          <UsersTab
            users={users}
            loading={usersLoading}
            onNavigateUser={(userId) =>
              router.push(`/(admin)/user/${userId}`)
            }
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsTab
            notifications={notifications}
            loading={notificationsLoading}
            onRead={handleReadNotification}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Tab Button
// ---------------------------------------------------------------------------

function TabButton({
  label,
  isActive,
  badge,
  onPress,
}: {
  label: string;
  isActive: boolean;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
        {label}
      </Text>
      {badge != null && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Reports Tab
// ---------------------------------------------------------------------------

const REPORT_FILTERS = ['pending', 'reviewing', 'actioned', 'dismissed'];

function ReportsTab({
  reports,
  loading,
  filter,
  onFilterChange,
  onAction,
  onNavigateUser,
}: {
  reports: AdminReport[];
  loading: boolean;
  filter: string;
  onFilterChange: (f: string) => void;
  onAction: (id: string, action: ReportAction) => void;
  onNavigateUser: (userId: string) => void;
}) {
  if (loading) {
    return <ActivityIndicator color={Colors.accent} style={styles.loader} />;
  }

  return (
    <View>
      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {REPORT_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => onFilterChange(f)}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {reports.length === 0 ? (
        <Text style={styles.emptyText}>No {filter} reports.</Text>
      ) : (
        reports.map((report) => (
          <View key={report.id} style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <View style={[styles.reasonBadge, { backgroundColor: reasonColor(report.reason) }]}>
                <Text style={styles.reasonText}>{formatReason(report.reason)}</Text>
              </View>
              <Text style={styles.reportDate}>
                {new Date(report.created_at).toLocaleDateString()}
              </Text>
            </View>

            {report.show && (
              <Text style={styles.reportTarget} numberOfLines={1}>
                Show: "{report.show.title}"
              </Text>
            )}
            {report.episode && (
              <Text style={styles.reportTarget} numberOfLines={1}>
                Episode {report.episode.episode_number}: "{report.episode.title}"
              </Text>
            )}
            {report.description && (
              <Text style={styles.reportDescription} numberOfLines={2}>
                {report.description}
              </Text>
            )}

            {report.show?.user_id && (
              <TouchableOpacity
                style={styles.userLink}
                onPress={() => onNavigateUser(report.show!.user_id)}
              >
                <Ionicons name="person-outline" size={14} color={Colors.accent} />
                <Text style={styles.userLinkText}>View Creator</Text>
              </TouchableOpacity>
            )}

            {report.status === 'pending' && (
              <View style={styles.actionRow}>
                <ActionButton
                  label="Dismiss"
                  color={Colors.textTertiary}
                  onPress={() => onAction(report.id, 'dismiss')}
                />
                <ActionButton
                  label="Warn"
                  color={Colors.warning}
                  onPress={() => onAction(report.id, 'warn_user')}
                />
                <ActionButton
                  label="Remove"
                  color={Colors.error}
                  onPress={() => onAction(report.id, 'remove_content')}
                />
                <ActionButton
                  label="Suspend"
                  color={Colors.error}
                  onPress={() => onAction(report.id, 'suspend_user')}
                />
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Users Tab
// ---------------------------------------------------------------------------

function UsersTab({
  users,
  loading,
  onNavigateUser,
}: {
  users: FlaggedUser[];
  loading: boolean;
  onNavigateUser: (userId: string) => void;
}) {
  if (loading) {
    return <ActivityIndicator color={Colors.accent} style={styles.loader} />;
  }

  if (users.length === 0) {
    return <Text style={styles.emptyText}>No flagged users.</Text>;
  }

  return (
    <View>
      {users.map((user) => {
        const isSuspended =
          user.suspended_until && new Date(user.suspended_until) > new Date();

        return (
          <TouchableOpacity
            key={user.id}
            style={styles.userCard}
            onPress={() => onNavigateUser(user.id)}
            activeOpacity={0.7}
          >
            <View style={styles.userCardLeft}>
              <Text style={styles.userName} numberOfLines={1}>
                {user.display_name || 'Anonymous'}
              </Text>
              <Text style={styles.userMeta}>
                {user.moderation_flags} flag{user.moderation_flags !== 1 ? 's' : ''}
                {isSuspended ? ' • Suspended' : ''}
              </Text>
            </View>
            <View style={styles.userCardRight}>
              {isSuspended && (
                <View style={[styles.badge, { backgroundColor: Colors.error }]}>
                  <Text style={styles.badgeText}>Suspended</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Notifications Tab
// ---------------------------------------------------------------------------

const NOTIF_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  new_report: 'flag',
  new_appeal: 'hand-left',
  auto_suspension: 'ban',
  high_flag_count: 'warning',
};

function NotificationsTab({
  notifications,
  loading,
  onRead,
}: {
  notifications: AdminNotification[];
  loading: boolean;
  onRead: (id: string) => void;
}) {
  if (loading) {
    return <ActivityIndicator color={Colors.accent} style={styles.loader} />;
  }

  if (notifications.length === 0) {
    return <Text style={styles.emptyText}>No notifications.</Text>;
  }

  return (
    <View>
      {notifications.map((n) => (
        <TouchableOpacity
          key={n.id}
          style={[styles.notifCard, !n.is_read && styles.notifCardUnread]}
          onPress={() => !n.is_read && onRead(n.id)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={NOTIF_ICONS[n.type] || 'notifications'}
            size={20}
            color={n.is_read ? Colors.textTertiary : Colors.accent}
          />
          <View style={styles.notifContent}>
            <Text
              style={[styles.notifTitle, !n.is_read && styles.notifTitleUnread]}
              numberOfLines={1}
            >
              {n.title}
            </Text>
            {n.body && (
              <Text style={styles.notifBody} numberOfLines={2}>
                {n.body}
              </Text>
            )}
            <Text style={styles.notifDate}>
              {new Date(n.created_at).toLocaleString()}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Action Button
// ---------------------------------------------------------------------------

function ActionButton({
  label,
  color,
  onPress,
}: {
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionButton, { borderColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.actionButtonText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatReason(reason: string): string {
  return reason.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function reasonColor(reason: string): string {
  const colors: Record<string, string> = {
    hate_speech: 'rgba(239, 68, 68, 0.2)',
    harassment: 'rgba(239, 68, 68, 0.2)',
    illegal_content: 'rgba(239, 68, 68, 0.2)',
    sexual_content: 'rgba(249, 115, 22, 0.2)',
    violence: 'rgba(249, 115, 22, 0.2)',
    dangerous_content: 'rgba(245, 158, 11, 0.2)',
    misinformation: 'rgba(245, 158, 11, 0.2)',
    other: 'rgba(156, 163, 175, 0.2)',
  };
  return colors[reason] || colors.other;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
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

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  tabButtonActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  tabButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabButtonTextActive: {
    color: Colors.text,
  },

  // Badge
  badge: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.text,
  },

  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  loader: {
    marginVertical: Spacing.xxxl,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: Spacing.xxxl,
  },

  // Filter
  filterRow: {
    marginBottom: Spacing.lg,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.accentDark,
    borderColor: Colors.accent,
  },
  filterChipText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.text,
  },

  // Report card
  reportCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  reasonBadge: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  reasonText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text,
  },
  reportDate: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  reportTarget: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  reportDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  userLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  userLinkText: {
    fontSize: FontSize.xs,
    color: Colors.accent,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  actionButton: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  actionButtonText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },

  // User card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  userCardLeft: {
    flex: 1,
  },
  userName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  userMeta: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  userCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  // Notification card
  notifCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  notifCardUnread: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  notifTitleUnread: {
    fontWeight: '700',
    color: Colors.text,
  },
  notifBody: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    lineHeight: 16,
    marginBottom: Spacing.xs,
  },
  notifDate: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
});
