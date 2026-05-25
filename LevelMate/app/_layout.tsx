import '../global.css';
import { useQuery, QueryClientProvider } from '@tanstack/react-query';
import { Slot, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PendingResultSheet from '../components/modals/PendingResultSheet';
import api from '../lib/api';
import queryClient from '../lib/queryClient';
import { useAuthStore } from '../stores/authStore';
import { usePendingSheetStore } from '../stores/pendingSheetStore';
import type { PendingResult } from '../types';

function AppContent() {
  const { isAuthenticated, isInitialized, needsOnboarding, initialize } = useAuthStore();
  const { isOpen: showPendingSheet, open: openPendingSheet, close: closePendingSheet } = usePendingSheetStore();
  // Prevents auto-popup from firing more than once per app session
  const [hasShownReminder, setHasShownReminder] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (isAuthenticated) {
      router.replace(needsOnboarding ? '/onboarding/sports' : '/(tabs)/discover');
    } else {
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

  // Auto-popup: fires once per session when pending results first appear
  useEffect(() => {
    if (!isAuthenticated || pendingResults.length === 0 || hasShownReminder) return;
    openPendingSheet();
  }, [pendingResults, isAuthenticated, hasShownReminder]);

  return (
    <>
      <Slot />
      <PendingResultSheet
        visible={showPendingSheet}
        sessions={pendingResults}
        onDismiss={() => {
          closePendingSheet();
          setHasShownReminder(true);
        }}
        onNavigate={(sessionId) => {
          closePendingSheet();
          setTimeout(() => {
            router.push(`/session/${sessionId}`);
          }, 350);
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
