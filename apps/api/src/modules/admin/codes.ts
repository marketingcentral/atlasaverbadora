// Geração de códigos de confirmação de 6 dígitos com trava anti-reuso de 30 dias.
// Cada código gerado fica "reservado" em KV por 30 dias; um novo sorteio evita
// códigos ainda reservados. Assim, o MESMO número de 6 dígitos só pode voltar a
// ser gerado depois de 30 dias.

import type { Env } from "../../env.js";

const TTL_30D = 30 * 24 * 60 * 60; // 2.592.000 segundos

/** 6 dígitos aleatórios (100000–999999) via CSPRNG. */
function random6(): string {
  const b = new Uint8Array(4);
  crypto.getRandomValues(b);
  const n = ((b[0]! << 24) | (b[1]! << 16) | (b[2]! << 8) | b[3]!) >>> 0;
  return String(100000 + (n % 900000));
}

/**
 * Gera um código de 6 dígitos que NÃO foi gerado nos últimos 30 dias.
 * Reserva o código escolhido em KV por 30 dias. Sem KV, gera sem checar
 * (fail-safe: não trava o fluxo).
 */
export async function gerarCodigoUnico(env: Env): Promise<string> {
  const kv = env.KV_SESSIONS ?? env.KV_CACHE;
  if (!kv) return random6();
  for (let i = 0; i < 12; i++) {
    const code = random6();
    const jaUsado = await kv.get(`codigo_usado:${code}`);
    if (!jaUsado) {
      await kv.put(`codigo_usado:${code}`, new Date().toISOString(), { expirationTtl: TTL_30D });
      return code;
    }
  }
  // Espaço de códigos muito cheio (improvável em uso normal): usa o último sorteio.
  const code = random6();
  await kv.put(`codigo_usado:${code}`, new Date().toISOString(), { expirationTtl: TTL_30D });
  return code;
}
