import { router } from 'expo-router';
import { create } from 'zustand';
import api from '../lib/api';
import { clearTokens, getAccessToken, getUserId, saveTokens } from '../lib/auth';
import type { User } from '../types';

function decodeJwtSub(token: string): string {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const payload = JSON.parse(atob(base64));
  return payload.sub as string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsOnboarding: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  needsOnboarding: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const token = await getAccessToken();
      if (!token) {
        set({ isAuthenticated: false, isLoading: false });
        return;
      }
      const userId = await getUserId();
      if (!userId) {
        set({ isAuthenticated: false, isLoading: false });
        return;
      }
      const { data: profile } = await api.get(`/api/v1/users/${userId}/profile`);
      const needsOnboarding = !profile.sports || profile.sports.length === 0;
      set({
        user: {
          id: userId,
          email: '',
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl ?? undefined,
        },
        isAuthenticated: true,
        needsOnboarding,
        isLoading: false,
      });
    } catch {
      await clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/api/v1/auth/login', { email, password });
      const userId = decodeJwtSub(data.accessToken);
      await saveTokens(data.accessToken, data.refreshToken, userId);

      const { data: profile } = await api.get(`/api/v1/users/${userId}/profile`);
      const needsOnboarding = !profile.sports || profile.sports.length === 0;

      set({
        user: {
          id: userId,
          email,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl ?? undefined,
        },
        isAuthenticated: true,
        needsOnboarding,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (firstName: string, lastName: string, email: string, password: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/api/v1/auth/register', {
        firstName,
        lastName,
        email,
        password,
      });
      const userId = decodeJwtSub(data.accessToken);
      await saveTokens(data.accessToken, data.refreshToken, userId);
      set({
        user: {
          id: userId,
          email,
          displayName: `${firstName} ${lastName}`,
        },
        isAuthenticated: true,
        needsOnboarding: true,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await clearTokens();
    set({ user: null, isAuthenticated: false, needsOnboarding: false });
    router.replace('/(auth)/login');
  },
}));
