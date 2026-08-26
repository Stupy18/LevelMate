import '../global.css';
import * as Notifications from 'expo-notifications';
import { useQuery, QueryClientProvider } from '@tanstack/react-query';
import { Slot, router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PendingResultSheet from '../components/modals/PendingResultSheet';
import api from '../lib/api';
import { registerForPushNotifications, savePushTokenToBackend } from '../lib/notifications';
import queryClient from '../lib/queryClient';
import { useAuthStore } from '../stores/authStore';
import { usePendingSheetStore } from '../stores/pendingSheetStore';
import type { PendingResult } from '../types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function AppContent() {
  const { isAuthenticated, isInitialized, needsOnboarding, initialize } = useAuthStore();
  const { isOpen: showPendingSheet, open: openPendingSheet, close: closePendingSheet } = usePendingSheetStore();
  const shownSessionIdsRef = useRef<Set<string>>(new Set());
  const lastDismissedRef = useRef(0);
  const tokenRegisteredRef = useRef(false);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (isAuthenticated) {
      router.replace(needsOnboarding ? '/onboarding/sports' : '/(tabs)/discover');
    } else {
      queryClient.clear(); // wipe stale data from the previous user's session
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isInitialized, needsOnboarding]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
        queryClient.invalidateQueries({ queryKey: ['my-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['pending-results'] });
      }
    });
    return () => subscription.remove();
  }, []);

  // Register push token once per login session
  useEffect(() => {
    if (!isAuthenticated) {
      tokenRegisteredRef.current = false;
      return;
    }
    if (tokenRegisteredRef.current) return;
    tokenRegisteredRef.current = true;
    registerForPushNotifications().then((token) => {
      if (token) savePushTokenToBackend(token);
    });
  }, [isAuthenticated]);

  // Keep token fresh if the device rotates it
  useEffect(() => {
    const sub = Notifications.addPushTokenListener(({ data: token }) => {
      if (token && isAuthenticated) savePushTokenToBackend(token);
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  // Deep link on notification tap
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string>;
      if (data.type === 'SESSION_UPDATE' || data.type === 'RESULT_ACTION') {
        router.push(`/session/${data.sessionId}`);
      } else if (data.type === 'ELO_UPDATE') {
        router.push('/(tabs)/profile');
      }
    });
    return () => sub.remove();
  }, []);

  const { data: pendingResults = [] } = useQuery<PendingResult[]>({
    queryKey: ['pending-results'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/users/me/pending-results');
      return Array.isArray(data) ? data : [];
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  // Keep app badge in sync with pending result count
  useEffect(() => {
    Notifications.setBadgeCountAsync(pendingResults.length);
  }, [pendingResults]);

  // If the user resolves the last pending item while the sheet is open
  // (e.g. from inside the session detail screen), close it immediately.
  useEffect(() => {
    if (showPendingSheet && pendingResults.length === 0) {
      closePendingSheet();
    }
  }, [pendingResults.length, showPendingSheet]);

  // Auto-popup: fires when new pending sessions appear, with a cooldown after dismiss/navigate
  useEffect(() => {
    if (!isAuthenticated || pendingResults.length === 0 || showPendingSheet) return;
    if (Date.now() - lastDismissedRef.current < 60_000) return;
    const hasNew = pendingResults.some(r => !shownSessionIdsRef.current.has(r.sessionId));
    if (!hasNew) return;
    const timer = setTimeout(() => openPendingSheet(), 800);
    return () => clearTimeout(timer);
  }, [pendingResults, isAuthenticated, showPendingSheet]);

  return (
    <>
      <Slot />
      <PendingResultSheet
        visible={showPendingSheet}
        sessions={pendingResults}
        onDismiss={() => {
          lastDismissedRef.current = Date.now();
          pendingResults.forEach(r => shownSessionIdsRef.current.add(r.sessionId));
          closePendingSheet();
        }}
        onNavigate={(sessionId) => {
          lastDismissedRef.current = Date.now();
          pendingResults.forEach(r => shownSessionIdsRef.current.add(r.sessionId));
          closePendingSheet();
          setTimeout(() => router.push(`/session/${sessionId}`), 350);
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
