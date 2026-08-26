/**
 * Centralised haptic feedback helpers. Always call through these — never
 * import expo-haptics directly in a component — so haptic behavior stays
 * consistent and can be tuned or disabled globally in one place.
 *
 * No-op on simulators/emulators; iOS respects the user's system haptic
 * settings automatically.
 */
import * as Haptics from 'expo-haptics';

// Light tap — small, frequent UI selections (filter chips, toggles, pickers)
export const hapticLight = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Medium tap — significant taps that navigate or open important UI
export const hapticMedium = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// Success — completed actions (join, create, report, confirm, save)
export const hapticSuccess = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Warning — soft blocks that stop the user without being a hard error
export const hapticWarning = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

// Error — hard failures (failed mutation, invalid credentials, validation)
export const hapticError = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
