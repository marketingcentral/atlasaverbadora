/// <reference types="vite/client" />
import { AtlasClient, type TokenStorage } from "@atlas/sdk";

const STORAGE_KEY = "atlas:tokens";

const localStorageStorage: TokenStorage = {
  getAccess() {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as { access_token: string }).access_token : null;
  },
  getRefresh() {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as { refresh_token: string }).refresh_token : null;
  },
  set(t) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  },
  clear() {
    window.localStorage.removeItem(STORAGE_KEY);
  },
};

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

export const atlas = new AtlasClient({
  baseUrl,
  storage: localStorageStorage,
  onAuthFailure: () => {
    window.localStorage.removeItem(STORAGE_KEY);
    window.location.assign("/login");
  },
});

export function readStoredRole(): "servidor" | "banco" | "averbadora" | "prefeitura" | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("atlas:role");
  return (raw as never) ?? null;
}

export function storeRole(role: "servidor" | "banco" | "averbadora" | "prefeitura"): void {
  window.localStorage.setItem("atlas:role", role);
}
