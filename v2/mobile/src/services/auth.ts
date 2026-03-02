import {
  AuthChangeEvent,
  AuthSession,
  Session,
  User,
} from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  GoogleSignin,
} from '@react-native-google-signin/google-signin';
import { supabase } from '@/services/supabase';
import type { Profile } from '@shared/types';

// ============================================================
// Auth Service
// Thin wrappers around Supabase Auth – keeps UI layer clean.
// ============================================================

// --- Email / password ---------------------------------------------------

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ user: User; session: Session }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return { user: data.user, session: data.session };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  betaCode?: string,
): Promise<{ user: User; session: Session }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        ...(betaCode ? { beta_code: betaCode } : {}),
      },
    },
  });

  if (error) throw error;
  if (!data.user || !data.session) {
    throw new Error('Sign-up succeeded but no session was returned. Please check your email for confirmation.');
  }
  return { user: data.user, session: data.session };
}

// --- Apple Sign-In ------------------------------------------------------

export async function signInWithApple(): Promise<{ user: User; session: Session }> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple Sign-In did not return an identity token.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });

  if (error) throw error;
  return { user: data.user, session: data.session };
}

// --- Google Sign-In -----------------------------------------------------

export async function signInWithGoogle(): Promise<{ user: User; session: Session }> {
  await GoogleSignin.hasPlayServices();
  const signInResult = await GoogleSignin.signIn();

  const idToken = signInResult.data?.idToken;
  if (!idToken) {
    throw new Error('Google Sign-In did not return an ID token.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error) throw error;
  return { user: data.user, session: data.session };
}

// --- Session management -------------------------------------------------

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return data.subscription;
}

// --- Profile ------------------------------------------------------------

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'display_name' | 'avatar_url'>>,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}
