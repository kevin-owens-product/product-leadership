import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import TrackPlayer from 'react-native-track-player';
import { useAuthStore } from '@/stores/authStore';
import { initPlayerStoreListeners } from '@/stores/playerStore';
import { PlaybackService, setupTrackPlayer } from '@/services/trackPlayerService';
import { Colors } from '@/constants/theme';

// Keep splash screen visible while we check auth state
SplashScreen.preventAutoHideAsync();

// Register the playback service at module level (must run before setupPlayer)
TrackPlayer.registerPlaybackService(() => PlaybackService);

function useProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated and not already in auth group
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to home if authenticated but still on auth screens
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);
}

export default function RootLayout() {
  const { isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // Initialise react-native-track-player once on mount.
  useEffect(() => {
    async function init() {
      try {
        await setupTrackPlayer();
        initPlayerStoreListeners();
      } catch (error) {
        // setupPlayer throws if already initialised (e.g. hot reload)
        console.warn('[TrackPlayer] setup error (may be expected on reload):', error);
      }
    }

    init();
  }, []);

  useProtectedRoute();

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={Colors.background} />
        <Slot />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
