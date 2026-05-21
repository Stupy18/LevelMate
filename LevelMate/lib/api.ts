import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { router } from 'expo-router';
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from './auth';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// --- Refresh loop guard ---
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function flushQueue(token: string) {
  pendingQueue.forEach(({ resolve }) => resolve(token));
  pendingQueue = [];
}

function rejectQueue(err: unknown) {
  pendingQueue.forEach(({ reject }) => reject(err));
  pendingQueue = [];
}

// --- Request interceptor: attach access token ---
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Response interceptor: silent refresh on 401 ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until the in-flight refresh resolves
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
            }
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token');

      const { data } = await axios.post(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/auth/refresh`,
        { refreshToken },
        { headers: { 'Content-Type': 'application/json' } },
      );

      await saveTokens(data.accessToken, data.refreshToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
      flushQueue(data.accessToken);

      if (originalRequest.headers) {
        originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;
      }
      return api(originalRequest);
    } catch (refreshError) {
      rejectQueue(refreshError);
      await clearTokens();
      router.replace('/(auth)/login');
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
