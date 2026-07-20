// Idempotencia de POSTs — segue o padrao Stripe (Idempotency-Key header).
//
// Cliente envia o mesmo header em retry (network flake, timeout, botao clicado
// 2x) e o backend devolve a resposta original em vez de executar de novo.
//
// Escopo: (userId + method + path) — assim keys nao colidem entre usuarios
// diferentes ou entre endpoints diferentes reutilizando a mesma string.
// TTL: 24h (KV_CACHE), tempo suficiente pra qualquer retry razoavel.

import type { Env } from "../env.js";

const TTL_SECONDS = 24 * 60 * 60;

export interface IdempotencyEnvelope<T> {
  status: number;
  body: T;
  createdAt: string;
}

/** Executa `handler` uma unica vez por (scope + key). Retornos subsequentes
 *  com a mesma tupla devolvem a resposta cacheada com status original.
 *  Se handler THROW, nao cacheia (permite retry corrigir). */
export async function withIdempotency<T>(
  env: Env,
  key: string | undefined | null,
  scope: string,
  handler: () => Promise<{ status?: number; body: T }>,
): Promise<{ result: T; status: number; replayed: boolean }> {
  const kv = env.KV_CACHE;
  const clean = (key ?? "").trim();
  // Sem key ou sem KV binding: executa sem cache (comportamento legado — nao quebra fluxos).
  if (!clean || !kv) {
    const r = await handler();
    return { result: r.body, status: r.status ?? 200, replayed: false };
  }
  const kvKey = `idem:${scope}:${clean}`;
  const cached = await kv.get(kvKey, "json");
  if (cached && typeof cached === "object" && "body" in cached) {
    const env2 = cached as IdempotencyEnvelope<T>;
    return { result: env2.body, status: env2.status, replayed: true };
  }
  const r = await handler();
  const envelope: IdempotencyEnvelope<T> = {
    status: r.status ?? 200,
    body: r.body,
    createdAt: new Date().toISOString(),
  };
  await kv.put(kvKey, JSON.stringify(envelope), { expirationTtl: TTL_SECONDS });
  return { result: r.body, status: envelope.status, replayed: false };
}
