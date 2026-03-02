import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

const MIN_PASSWORD_LENGTH = 8;

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { signUpWithEmail, signInWithApple, signInWithGoogle, isLoading } =
    useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [betaCode, setBetaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMethod, setLoadingMethod] = useState<
    'email' | 'apple' | 'google' | null
  >(null);

  const validateForm = (): boolean => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return false;
    }

    if (!password) {
      setError('Please enter a password.');
      return false;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
      );
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }

    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setError(null);
    setLoadingMethod('email');
    try {
      await signUpWithEmail(email.trim(), password);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create account. Please try again.');
    } finally {
      setLoadingMethod(null);
    }
  };

  const handleAppleSignIn = async () => {
    setError(null);
    setLoadingMethod('apple');
    try {
      await signInWithApple();
    } catch (err: any) {
      setError(err?.message ?? 'Apple sign-in failed. Please try again.');
    } finally {
      setLoadingMethod(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoadingMethod('google');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message ?? 'Google sign-in failed. Please try again.');
    } finally {
      setLoadingMethod(null);
    }
  };

  const isDisabled = isLoading || loadingMethod !== null;

  const passwordStrength = (): { label: string; color: string } | null => {
    if (!password) return null;
    if (password.length < MIN_PASSWORD_LENGTH) {
      return { label: 'Too short', color: Colors.error };
    }
    if (password.length < 12) {
      return { label: 'Fair', color: Colors.warning };
    }
    return { label: 'Strong', color: Colors.success };
  };

  const strength = passwordStrength();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.xxxl, paddingBottom: insets.bottom + Spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo & Branding */}
        <View style={styles.brandingContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="mic" size={36} color={Colors.accent} />
          </View>
          <Text style={styles.appName}>Create Account</Text>
          <Text style={styles.tagline}>Start creating podcasts with AI</Text>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={18} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Ionicons
            name="mail-outline"
            size={20}
            color={Colors.textTertiary}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={Colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!isDisabled}
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color={Colors.textTertiary}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Password (min 8 characters)"
            placeholderTextColor={Colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            editable={!isDisabled}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.passwordToggle}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        {/* Password Strength Indicator */}
        {strength && (
          <View style={styles.strengthContainer}>
            <View style={styles.strengthBarTrack}>
              <View
                style={[
                  styles.strengthBarFill,
                  {
                    backgroundColor: strength.color,
                    width:
                      strength.label === 'Too short'
                        ? '33%'
                        : strength.label === 'Fair'
                          ? '66%'
                          : '100%',
                  },
                ]}
              />
            </View>
            <Text style={[styles.strengthLabel, { color: strength.color }]}>
              {strength.label}
            </Text>
          </View>
        )}

        {/* Confirm Password Input */}
        <View style={styles.inputContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color={Colors.textTertiary}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor={Colors.textTertiary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            editable={!isDisabled}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.passwordToggle}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        {/* Password Match Indicator */}
        {confirmPassword.length > 0 && (
          <View style={styles.matchContainer}>
            <Ionicons
              name={
                password === confirmPassword
                  ? 'checkmark-circle'
                  : 'close-circle'
              }
              size={16}
              color={
                password === confirmPassword ? Colors.success : Colors.error
              }
            />
            <Text
              style={[
                styles.matchText,
                {
                  color:
                    password === confirmPassword
                      ? Colors.success
                      : Colors.error,
                },
              ]}
            >
              {password === confirmPassword
                ? 'Passwords match'
                : 'Passwords do not match'}
            </Text>
          </View>
        )}

        {/* Beta Code Input */}
        <View style={[styles.inputContainer, styles.betaCodeInput]}>
          <Ionicons
            name="gift-outline"
            size={20}
            color={Colors.textTertiary}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Beta code (optional)"
            placeholderTextColor={Colors.textTertiary}
            value={betaCode}
            onChangeText={setBetaCode}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isDisabled}
          />
        </View>

        {/* Create Account Button */}
        <TouchableOpacity
          style={[styles.primaryButton, isDisabled && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={isDisabled}
          activeOpacity={0.8}
        >
          {loadingMethod === 'email' ? (
            <ActivityIndicator color={Colors.text} size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Apple Sign In */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.socialButton, isDisabled && styles.buttonDisabled]}
            onPress={handleAppleSignIn}
            disabled={isDisabled}
            activeOpacity={0.8}
          >
            {loadingMethod === 'apple' ? (
              <ActivityIndicator color={Colors.background} size="small" />
            ) : (
              <>
                <Ionicons
                  name="logo-apple"
                  size={20}
                  color={Colors.background}
                  style={styles.socialIcon}
                />
                <Text style={styles.socialButtonText}>
                  Sign up with Apple
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Google Sign In */}
        <TouchableOpacity
          style={[styles.socialButton, isDisabled && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={isDisabled}
          activeOpacity={0.8}
        >
          {loadingMethod === 'google' ? (
            <ActivityIndicator color={Colors.background} size="small" />
          ) : (
            <>
              <Ionicons
                name="logo-google"
                size={20}
                color={Colors.background}
                style={styles.socialIcon}
              />
              <Text style={styles.socialButtonText}>Sign up with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Sign In Link */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity disabled={isDisabled}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xxl,
  },
  brandingContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  appName: {
    fontSize: FontSize.title,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    height: 52,
  },
  betaCodeInput: {
    marginTop: Spacing.sm,
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    height: '100%',
  },
  passwordToggle: {
    paddingLeft: Spacing.sm,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: -Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  strengthBarTrack: {
    flex: 1,
    height: 3,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginRight: Spacing.sm,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    minWidth: 60,
    textAlign: 'right',
  },
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: -Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  matchText: {
    fontSize: FontSize.xs,
    marginLeft: Spacing.xs,
  },
  primaryButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  primaryButtonText: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xxl,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  dividerText: {
    color: Colors.textTertiary,
    fontSize: FontSize.sm,
    marginHorizontal: Spacing.lg,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.md,
    height: 52,
    marginBottom: Spacing.md,
  },
  socialIcon: {
    marginRight: Spacing.sm,
  },
  socialButtonText: {
    color: Colors.background,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xxl,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  footerLink: {
    color: Colors.accent,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
