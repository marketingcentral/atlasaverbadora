import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { AtlasClient, type TokenStorage } from "@atlas/sdk";

const STORAGE_KEY = "atlas_tokens";

const secureStorage: TokenStorage = {
  async getAccess() {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    try { return (JSON.parse(raw) as { access_token: string }).access_token; } catch { return null; }
  },
  async getRefresh() {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    try { return (JSON.parse(raw) as { refresh_token: string }).refresh_token; } catch { return null; }
  },
  async set(t) {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(t));
  },
  async clear() {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  },
};

const baseUrl =
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "http://localhost:8787";

export const atlas = new AtlasClient({ baseUrl, storage: secureStorage });

export async function hasStoredSession(): Promise<boolean> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  return !!raw;
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}
