import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Config } from '@/constants/config';

// ------------------------------------------------------------
// Custom storage adapter backed by expo-secure-store.
// Supabase JS client uses this to persist / retrieve auth
// tokens so sessions survive app restarts.
// ------------------------------------------------------------

const AUTH_TOKEN_KEY = 'supabase-auth-token';

const secureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      // SecureStore can fail on certain devices / simulators.
      // Fall back silently – the user will simply need to re-authenticate.
      console.warn('[SecureStore] Failed to read key:', key);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      console.warn('[SecureStore] Failed to write key:', key);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      console.warn('[SecureStore] Failed to delete key:', key);
    }
  },
};

// ------------------------------------------------------------
// Supabase client singleton
// ------------------------------------------------------------

export const supabase = createClient(Config.supabaseUrl, Config.supabaseAnonKey, {
  auth: {
    storage: secureStoreAdapter,
    storageKey: AUTH_TOKEN_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // not applicable in React Native
  },
});
