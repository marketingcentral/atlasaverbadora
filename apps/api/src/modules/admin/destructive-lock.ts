// Kill switch cross-isolate/cross-session pra endpoints destrutivos.
//
// Problema real (20/07/2026): sessoes paralelas do Claude Code (varias janelas
// abertas com contextos diferentes) rodam purge-contratos/delete-* em loop e
// apagam trabalho da outra sessao. Deploys, isolates frios e memoria in-memory
// nao ajudam porque cada sessao pensa que "acabou de criar o endpoint, pode
// testar". Resultado: tombamento, anuencias, ADFs e propostas somindo 3-4
// vezes por dia sem pedido explicito do cliente.
//
// Solucao: flag persistente em KV que TODOS os isolates leem. Default =
// TRAVADO. Pra rodar qualquer purge/delete destrutivo, o USUARIO precisa
// destravar manualmente via POST /v1/admin/destructive-lock/unlock com senha e
// duracao (max 5min). Depois disso, o KV auto-expira e volta a travar.
//
// Assim, mesmo que uma sessao paralela tente rodar purge sem autorizacao, ela
// recebe 423 Locked e o dado do cliente esta seguro.

import type { Env } from "../../env.js";
import { Errors } from "../../_shared/errors.js";

const KV_KEY = "admin:destructive_lock";
// Duracao maxima que o usuario pode manter destravado numa unica sessao.
// 5min e' folgado pra rodar 1-2 purges e trava sozinho depois.
const MAX_UNLOCK_SEC = 300;

export interface LockState {
  locked: boolean;
  unlockedUntil?: number; // epoch seconds
  unlockedBy?: string;
  reason?: string;
}

export async function getLockState(env: Env): Promise<LockState> {
  if (!env.KV_CACHE) return { locked: false }; // dev local sem KV: nao trava
  const raw = await env.KV_CACHE.get(KV_KEY);
  if (!raw) return { locked: true };
  try {
    const parsed = JSON.parse(raw) as { unlockedUntil: number; unlockedBy: string; reason?: string };
    const now = Math.floor(Date.now() / 1000);
    if (parsed.unlockedUntil > now) {
      return {
        locked: false,
        unlockedUntil: parsed.unlockedUntil,
        unlockedBy: parsed.unlockedBy,
        reason: parsed.reason,
      };
    }
    return { locked: true };
  } catch {
    return { locked: true };
  }
}

/** Chamado no topo de todo endpoint destrutivo. Se estiver travado, lanca 423. */
export async function requireUnlocked(env: Env, endpoint: string): Promise<LockState> {
  const state = await getLockState(env);
  if (state.locked) {
    throw Errors.forbidden(
      `Endpoint destrutivo travado (${endpoint}). Sessoes paralelas nao podem rodar operacoes destrutivas sem que o usuario destrave manualmente. Peca ao usuario destravar via POST /v1/admin/destructive-lock/unlock com senha + duracao (max ${MAX_UNLOCK_SEC}s).`,
    );
  }
  return state;
}

export interface UnlockInput {
  durationSec: number;
  unlockedBy: string;
  reason?: string;
}

export async function unlock(env: Env, input: UnlockInput): Promise<LockState> {
  if (!env.KV_CACHE) return { locked: false };
  const duration = Math.min(Math.max(Math.floor(input.durationSec), 30), MAX_UNLOCK_SEC);
  const now = Math.floor(Date.now() / 1000);
  const unlockedUntil = now + duration;
  await env.KV_CACHE.put(
    KV_KEY,
    JSON.stringify({ unlockedUntil, unlockedBy: input.unlockedBy, reason: input.reason ?? null }),
    { expirationTtl: duration + 5 },
  );
  return { locked: false, unlockedUntil, unlockedBy: input.unlockedBy, reason: input.reason };
}

export async function lock(env: Env): Promise<LockState> {
  if (env.KV_CACHE) await env.KV_CACHE.delete(KV_KEY);
  return { locked: true };
}

export { MAX_UNLOCK_SEC };
