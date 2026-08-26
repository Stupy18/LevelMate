/**
 * Shared visual-depth tokens: tinted screen background, elevated card/input
 * surfaces. Introduced for the background-depth + elevated-inputs polish pass —
 * keep every screen pulling from here so the app reads as one consistent
 * "layered" surface language instead of ad hoc per-screen shadow values.
 */
import type { ViewStyle } from 'react-native';

export const screenGradient = {
  colors: ['#F4F5FA', '#EEF0F6'] as const,
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
};

export const textColors = {
  primary: '#0D0D14',
  secondary: '#6B7280',
  tertiary: '#9CA3AF',
};

export const cardStyle: ViewStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  borderWidth: 0.5,
  borderColor: '#F0F0F3',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

export const inputStyle: ViewStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  paddingHorizontal: 14,
  height: 50,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.04,
  shadowRadius: 3,
  elevation: 1,
};

export const inputFocusedStyle: ViewStyle = {
  borderColor: '#6C47FF',
  shadowOpacity: 0.1,
  shadowRadius: 6,
  elevation: 2,
};
