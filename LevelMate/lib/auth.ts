import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'levelmate_access_token';
const REFRESH_TOKEN_KEY = 'levelmate_refresh_token';
const USER_ID_KEY = 'levelmate_user_id';

export async function saveTokens(
  accessToken: string,
  refreshToken: string,
  userId?: string,
): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
    userId ? SecureStore.setItemAsync(USER_ID_KEY, userId) : Promise.resolve(),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function getUserId(): Promise<string | null> {
  return SecureStore.getItemAsync(USER_ID_KEY);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_ID_KEY),
  ]);
}
