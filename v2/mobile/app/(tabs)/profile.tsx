import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useCreditStore } from '@/stores/creditStore';
import { CREDIT_PACKS } from '@shared/types';
import type { CreditPack, CreditTransaction } from '@shared/types';
import { supabase } from '@/services/supabase';

// ---------------------------------------------------------------------------
// Profile Screen
//
// User info, credit balance, credit packs for purchase, transaction history,
// settings, and sign-out.
// ---------------------------------------------------------------------------

const APP_VERSION = Constants.expoConfig?.version ?? '0.1.0';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, user, signOut } = useAuthStore();
  const { balance, fetchBalance } = useCreditStore();

  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [purchasingPackId, setPurchasingPackId] = useState<string | null>(null);

  // Fetch credit balance on mount
  useEffect(() => {
    fetchBalance();
  }, []);

  // Fetch recent transactions
  useEffect(() => {
    async function loadTransactions() {
      try {
        const { data, error } = await supabase
          .from('credit_transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setTransactions((data ?? []) as CreditTransaction[]);
      } catch {
        // Silently fail - transactions are supplemental
      } finally {
        setLoadingTransactions(false);
      }
    }

    loadTransactions();
  }, [balance]); // Refetch when balance changes (e.g. after purchase)

  // --- handlers ---
  const handlePurchase = useCallback(async (pack: CreditPack) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPurchasingPackId(pack.id);

    try {
      // In production, this would invoke RevenueCat / StoreKit.
      // For now, show a placeholder alert.
      Alert.alert(
        'Purchase Credits',
        `Purchase ${pack.credits} credits for $${pack.price_usd.toFixed(2)}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Buy',
            onPress: async () => {
              // TODO: Integrate RevenueCat purchase flow
              // await Purchases.purchasePackage(package);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              fetchBalance();
            },
          },
        ],
      );
    } catch (err: any) {
      Alert.alert('Purchase Failed', err?.message ?? 'Please try again.');
    } finally {
      setPurchasingPackId(null);
    }
  }, []);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch {
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          }
        },
      },
    ]);
  }, [signOut]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'All podcasts, credits, and data will be lost forever.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      // Invoke edge function for account deletion
                      const { error } = await supabase.functions.invoke('delete-account');
                      if (error) throw error;
                      await signOut();
                    } catch {
                      Alert.alert('Error', 'Failed to delete account. Please contact support.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, [signOut]);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';
  const email = user?.email ?? '';
  const avatarUrl = profile?.avatar_url;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xxxl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={styles.screenTitle}>Profile</Text>

      {/* User Info Card */}
      <View style={styles.userCard}>
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.displayName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {email}
          </Text>
        </View>
      </View>

      {/* Credits Section */}
      <View style={styles.creditsCard}>
        <View style={styles.creditsHeader}>
          <View style={styles.creditsLeft}>
            <Ionicons
              name="sparkles"
              size={20}
              color={Colors.creditGold}
              style={styles.creditsIcon}
            />
            <Text style={styles.creditsTitle}>Credits</Text>
          </View>
          <View style={styles.creditsBalanceBadge}>
            <Text style={styles.creditsBalanceText}>{balance}</Text>
          </View>
        </View>
        <Text style={styles.creditsSubtext}>
          Credits are used to generate podcast episodes. Different lengths and
          voice qualities cost different amounts.
        </Text>
      </View>

      {/* Credit Packs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Buy Credits</Text>
        <View style={styles.packList}>
          {CREDIT_PACKS.map((pack) => {
            const isPopular = pack.id === 'popular';
            const isPurchasing = purchasingPackId === pack.id;

            return (
              <View
                key={pack.id}
                style={[
                  styles.packCard,
                  isPopular && styles.packCardPopular,
                ]}
              >
                {isPopular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>Most Popular</Text>
                  </View>
                )}
                <View style={styles.packInfo}>
                  <Text style={styles.packName}>{pack.name}</Text>
                  <Text style={styles.packCredits}>
                    {pack.credits} credits
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.packButton,
                    isPopular && styles.packButtonPopular,
                    isPurchasing && styles.packButtonDisabled,
                  ]}
                  onPress={() => handlePurchase(pack)}
                  disabled={isPurchasing}
                  activeOpacity={0.7}
                >
                  {isPurchasing ? (
                    <ActivityIndicator
                      color={isPopular ? Colors.text : Colors.accent}
                      size="small"
                    />
                  ) : (
                    <Text
                      style={[
                        styles.packButtonText,
                        isPopular && styles.packButtonTextPopular,
                      ]}
                    >
                      ${pack.price_usd.toFixed(2)}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>

      {/* Transaction History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {loadingTransactions ? (
          <ActivityIndicator
            color={Colors.textTertiary}
            style={styles.transactionLoader}
          />
        ) : transactions.length === 0 ? (
          <Text style={styles.emptyText}>No transactions yet.</Text>
        ) : (
          <View style={styles.transactionList}>
            {transactions.map((txn) => (
              <TransactionRow key={txn.id} transaction={txn} />
            ))}
          </View>
        )}
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsList}>
          <SettingsRow
            icon="information-circle-outline"
            label="About"
            onPress={() => Linking.openURL('https://podcastai.app/about')}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://podcastai.app/privacy')}
          />
          <SettingsRow
            icon="document-text-outline"
            label="Terms of Service"
            onPress={() => Linking.openURL('https://podcastai.app/terms')}
          />
          <SettingsRow
            icon="trash-outline"
            label="Delete Account"
            destructive
            onPress={handleDeleteAccount}
            showChevron={false}
          />
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
        activeOpacity={0.7}
      >
        <Ionicons
          name="log-out-outline"
          size={20}
          color={Colors.error}
          style={styles.signOutIcon}
        />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.versionText}>
        Podcast AI v{APP_VERSION}
      </Text>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// TransactionRow
// ---------------------------------------------------------------------------

interface TransactionRowProps {
  transaction: CreditTransaction;
}

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  purchase: 'Credit Purchase',
  signup_bonus: 'Signup Bonus',
  beta_bonus: 'Beta Bonus',
  generation_spend: 'Podcast Generation',
  refund: 'Refund',
  promo: 'Promotional Credits',
};

function TransactionRow({ transaction }: TransactionRowProps) {
  const isPositive = transaction.amount > 0;
  const label =
    transaction.description ||
    TRANSACTION_TYPE_LABELS[transaction.type] ||
    transaction.type;

  const formattedDate = new Date(transaction.created_at).toLocaleDateString(
    undefined,
    { month: 'short', day: 'numeric', year: 'numeric' },
  );

  return (
    <View style={txnStyles.row}>
      <View style={txnStyles.left}>
        <Text style={txnStyles.label} numberOfLines={1}>
          {label}
        </Text>
        <Text style={txnStyles.date}>{formattedDate}</Text>
      </View>
      <Text
        style={[
          txnStyles.amount,
          isPositive ? txnStyles.amountPositive : txnStyles.amountNegative,
        ]}
      >
        {isPositive ? '+' : ''}
        {transaction.amount}
      </Text>
    </View>
  );
}

const txnStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  left: {
    flex: 1,
    marginRight: Spacing.lg,
  },
  label: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  date: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  amount: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  amountPositive: {
    color: Colors.success,
  },
  amountNegative: {
    color: Colors.textSecondary,
  },
});

// ---------------------------------------------------------------------------
// SettingsRow
// ---------------------------------------------------------------------------

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}

function SettingsRow({
  icon,
  label,
  onPress,
  destructive = false,
  showChevron = true,
}: SettingsRowProps) {
  const color = destructive ? Colors.error : Colors.text;

  return (
    <TouchableOpacity
      style={settingsStyles.row}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Ionicons
        name={icon}
        size={20}
        color={color}
        style={settingsStyles.icon}
      />
      <Text style={[settingsStyles.label, { color }]}>{label}</Text>
      {showChevron && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={Colors.textTertiary}
        />
      )}
    </TouchableOpacity>
  );
}

const settingsStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  icon: {
    marginRight: Spacing.md,
  },
  label: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '500',
  },
});

// ---------------------------------------------------------------------------
// Main Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
  },
  screenTitle: {
    fontSize: FontSize.title,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: Spacing.xxl,
  },

  // --- User card ---
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  avatarContainer: {
    marginRight: Spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  email: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },

  // --- Credits card ---
  creditsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  creditsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  creditsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creditsIcon: {
    marginRight: Spacing.sm,
  },
  creditsTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  creditsBalanceBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  creditsBalanceText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.creditGold,
  },
  creditsSubtext: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    lineHeight: 18,
  },

  // --- Sections ---
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },

  // --- Credit packs ---
  packList: {
    gap: Spacing.md,
  },
  packCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  packCardPopular: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: Spacing.lg,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  popularBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text,
  },
  packInfo: {
    flex: 1,
  },
  packName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  packCredits: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  packButton: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  packButtonPopular: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  packButtonDisabled: {
    opacity: 0.6,
  },
  packButtonText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.accent,
  },
  packButtonTextPopular: {
    color: Colors.text,
  },

  // --- Transactions ---
  transactionLoader: {
    marginVertical: Spacing.xl,
  },
  transactionList: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },

  // --- Settings ---
  settingsList: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
  },

  // --- Sign out ---
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 52,
    marginBottom: Spacing.xxl,
  },
  signOutIcon: {
    marginRight: Spacing.sm,
  },
  signOutText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.error,
  },

  // --- Version ---
  versionText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
});
