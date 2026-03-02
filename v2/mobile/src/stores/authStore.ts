import { create } from 'zustand';
import { Session, User, Subscription } from '@supabase/supabase-js';
import type { Profile } from '@shared/types';
import * as authService from '@/services/auth';

// ============================================================
// Auth Store
// Manages authentication state, session lifecycle, and the
// current user's profile.
// ============================================================

interface AuthState {
  // --- State ---
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // --- Actions ---
  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, betaCode?: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

// Keep a reference to the auth listener so we can clean it up
// if `initialize` is called more than once.
let authSubscription: Subscription | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  // --- Initial state -------------------------------------------------------
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,

  // --- Actions -------------------------------------------------------------

  /**
   * Called once at app launch.
   * 1. Restores any persisted session.
   * 2. Registers an auth-state listener that keeps the store in sync
   *    whenever the session changes (login, logout, token refresh, etc.).
   */
  initialize: async () => {
    try {
      set({ isLoading: true });

      // Clean up previous listener if any
      if (authSubscription) {
        authSubscription.unsubscribe();
        authSubscription = null;
      }

      // Restore existing session
      const session = await authService.getSession();

      if (session?.user) {
        set({
          user: session.user,
          session,
          isAuthenticated: true,
        });

        // Fetch profile in background – don't block initialization
        get().fetchProfile().catch(console.warn);
      }

      // Listen for future auth changes
      authSubscription = authService.onAuthStateChange(
        async (event, newSession) => {
          set({
            user: newSession?.user ?? null,
            session: newSession,
            isAuthenticated: !!newSession?.user,
          });

          if (newSession?.user) {
            get().fetchProfile().catch(console.warn);
          } else {
            set({ profile: null });
          }
        },
      );
    } catch (error) {
      console.error('[AuthStore] initialize failed:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithEmail: async (email, password) => {
    set({ isLoading: true });
    try {
      const { user, session } = await authService.signInWithEmail(email, password);
      set({ user, session, isAuthenticated: true });
      await get().fetchProfile();
    } catch (error) {
      set({ user: null, session: null, isAuthenticated: false, profile: null });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signUpWithEmail: async (email, password, betaCode?) => {
    set({ isLoading: true });
    try {
      const { user, session } = await authService.signUpWithEmail(
        email,
        password,
        betaCode,
      );
      set({ user, session, isAuthenticated: true });
      await get().fetchProfile();
    } catch (error) {
      set({ user: null, session: null, isAuthenticated: false, profile: null });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithApple: async () => {
    set({ isLoading: true });
    try {
      const { user, session } = await authService.signInWithApple();
      set({ user, session, isAuthenticated: true });
      await get().fetchProfile();
    } catch (error) {
      set({ user: null, session: null, isAuthenticated: false, profile: null });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true });
    try {
      const { user, session } = await authService.signInWithGoogle();
      set({ user, session, isAuthenticated: true });
      await get().fetchProfile();
    } catch (error) {
      set({ user: null, session: null, isAuthenticated: false, profile: null });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await authService.signOut();
    } finally {
      set({
        user: null,
        session: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const profile = await authService.getProfile(user.id);
      set({ profile });
    } catch (error) {
      console.error('[AuthStore] fetchProfile failed:', error);
    }
  },
}));
