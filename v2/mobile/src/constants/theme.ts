export const Colors = {
  // Core
  background: '#0f0f0f',
  surface: '#1a1a1a',
  surfaceElevated: '#252525',
  border: '#333333',

  // Text
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  textTertiary: '#666666',

  // Accent
  accent: '#6366f1',
  accentLight: '#818cf8',
  accentDark: '#4f46e5',

  // Speakers
  host1: '#3b82f6',
  host2: '#10b981',

  // Status
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Credits
  creditGold: '#fbbf24',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  title: 28,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;
