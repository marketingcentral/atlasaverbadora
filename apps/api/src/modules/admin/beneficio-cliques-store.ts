// Cliques de servidores no botao "Acessar" de um beneficio.
// Persistidos em admin_beneficio_cliques (jsonb collection). Usado pela
// averbadora pra ver quem se interessou por cada parceria — especialmente
// util em telemedicina onde o clique = intencao de agendar consulta.

import type { Env } from "../../env.js";
import { loadCollection, upsertCollectionRow } from "../../db/repos.js";

export interface BeneficioClique {
  /** ID unico do clique: CLK-<timestamp>-<random>. */
  id: string;
  beneficioId: string;
  servidorId: number;
  nome: string;
  cpfMasked: string;
  matricula: string;
  prefeituraId: number;
  /** Timestamp ISO. */
  criadoEm: string;
  /** Referrer opcional — qual tela clicou (saude, beneficios, marketplace). */
  origemTela?: string;
}

const TABLE = "admin_beneficio_cliques";
const CACHE: { list: BeneficioClique[]; loaded: boolean } = { list: [], loaded: false };

export async function loadCliques(env: Env): Promise<BeneficioClique[]> {
  if (CACHE.loaded) return CACHE.list;
  const rows = await loadCollection<BeneficioClique>(env, TABLE).catch(() => []);
  CACHE.list = rows;
  CACHE.loaded = true;
  return CACHE.list;
}

export async function refreshCliques(env: Env): Promise<BeneficioClique[]> {
  const rows = await loadCollection<BeneficioClique>(env, TABLE).catch(() => CACHE.list);
  CACHE.list = rows;
  CACHE.loaded = true;
  return CACHE.list;
}

export async function persistClique(env: Env, c: BeneficioClique): Promise<void> {
  try { await upsertCollectionRow(env, TABLE, c.id, c); } catch { /* fail-safe */ }
  CACHE.list.push(c);
}

/** ID deterministico enough: prefixo CLK + segundo + random. Nao usa Date.now
 *  em cima pra evitar colisao — o random cobre. */
export function nextCliqueId(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const ts = Math.floor(Date.now() / 1000).toString(36).toUpperCase();
  return `CLK-${ts}-${rand}`;
}
