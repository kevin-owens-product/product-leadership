import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const Config = {
  supabaseUrl: extra.supabaseUrl ?? 'YOUR_SUPABASE_URL',
  supabaseAnonKey: extra.supabaseAnonKey ?? 'YOUR_SUPABASE_ANON_KEY',
  revenueCatApiKeyIos: extra.revenueCatApiKeyIos ?? '',
  revenueCatApiKeyAndroid: extra.revenueCatApiKeyAndroid ?? '',

  // Limits
  maxPromptLength: 2000,
  maxEpisodes: 12,
  minEpisodes: 3,

  // Defaults
  defaultEpisodeCount: 6,
  defaultEpisodeLengthMinutes: 30 as 15 | 30 | 60,
  defaultVoiceTier: 'standard' as 'standard' | 'premium',

  // Signup bonuses
  signupBonusCredits: 3,
  betaBonusCredits: 5,
} as const;
