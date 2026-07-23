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

// ============================================================
// Impersonate — averbadora entra no perfil do servidor. Guarda os tokens da
// averbadora sob `atlas:tokens:parent` e substitui `atlas:tokens` pelo JWT
// servidor. `atlas:impersonate:meta` carrega nome+matricula pra a barra fixa
// renderizar. Restaurar reverte tudo. Se o admin fizer logout no meio,
// tudo eh limpo (`clearImpersonateState`).
// ============================================================
const PARENT_KEY = "atlas:tokens:parent";
const PARENT_ROLE_KEY = "atlas:role:parent";
const META_KEY = "atlas:impersonate:meta";

export interface ImpersonateMeta {
  nome: string;
  matricula: string;
  cpfMasked: string;
  parentRole: "averbadora";
}

export function readImpersonateMeta(): ImpersonateMeta | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(META_KEY);
  return raw ? (JSON.parse(raw) as ImpersonateMeta) : null;
}

/** Ativa impersonate: guarda tokens+role atuais e escreve os novos. Chamado
 *  pelo botao "Entrar como" da /averbadora/servidores/visualizar. */
export function enterImpersonate(input: {
  parentRole: "averbadora";
  novoAccessToken: string;
  novoRefreshToken: string;
  servidor: { nome: string; matricula: string; cpfMasked: string };
}): void {
  const parentRaw = window.localStorage.getItem(STORAGE_KEY);
  if (parentRaw) window.localStorage.setItem(PARENT_KEY, parentRaw);
  const parentRole = window.localStorage.getItem("atlas:role");
  if (parentRole) window.localStorage.setItem(PARENT_ROLE_KEY, parentRole);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
    access_token: input.novoAccessToken,
    refresh_token: input.novoRefreshToken,
  }));
  window.localStorage.setItem("atlas:role", "servidor");
  window.localStorage.setItem(META_KEY, JSON.stringify({
    nome: input.servidor.nome,
    matricula: input.servidor.matricula,
    cpfMasked: input.servidor.cpfMasked,
    parentRole: input.parentRole,
  }));
}

/** Sai do impersonate: restaura tokens do admin e apaga meta. Retorna a
 *  role original (pra o caller navegar de volta pro painel certo). */
export function exitImpersonate(): "servidor" | "banco" | "averbadora" | "prefeitura" | null {
  const parent = window.localStorage.getItem(PARENT_KEY);
  const parentRole = window.localStorage.getItem(PARENT_ROLE_KEY);
  if (parent) window.localStorage.setItem(STORAGE_KEY, parent);
  else window.localStorage.removeItem(STORAGE_KEY);
  if (parentRole) window.localStorage.setItem("atlas:role", parentRole);
  else window.localStorage.removeItem("atlas:role");
  window.localStorage.removeItem(PARENT_KEY);
  window.localStorage.removeItem(PARENT_ROLE_KEY);
  window.localStorage.removeItem(META_KEY);
  return (parentRole as never) ?? null;
}

/** Limpa TUDO ligado a impersonate — chamado no logout completo pra
 *  parent stale nao ficar preso no localStorage. */
export function clearImpersonateState(): void {
  window.localStorage.removeItem(PARENT_KEY);
  window.localStorage.removeItem(PARENT_ROLE_KEY);
  window.localStorage.removeItem(META_KEY);
}
