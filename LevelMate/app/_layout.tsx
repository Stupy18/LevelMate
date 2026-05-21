import '../global.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot, router } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import queryClient from '../lib/queryClient';
import { useAuthStore } from '../stores/authStore';

export default function RootLayout() {
  const { isAuthenticated, isLoading, needsOnboarding, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      router.replace(needsOnboarding ? '/onboarding/sports' : '/(tabs)/discover');
    } else {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading, needsOnboarding]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Slot />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
