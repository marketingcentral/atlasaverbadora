// Cotacoes de telemedicina solicitadas pelos servidores no banner de Beneficios.
// O servidor clica "Solicitar Cotacao", confirma o termo, e o time da Atlas
// (averbadora) recebe os dados dele — principalmente o TELEFONE — pra formalizar
// o contrato. Persistido em admin_telemedicina_cotacoes (jsonb collection).

import type { Env } from "../../env.js";
import { loadCollection, upsertCollectionRow } from "../../db/repos.js";

export interface TelemedicinaCotacao {
  /** ID unico: TMC-<timestamp>-<random>. */
  id: string;
  servidorId: number;
  nome: string;
  cpfMasked: string;
  telefone: string;
  email: string;
  matricula: string;
  prefeituraId: number;
  prefeitura: string;
  /** Situacao: "nova" (recem-solicitada) | "contatado" | "fechado" (averbadora atualiza). */
  situacao: string;
  /** Timestamp ISO. */
  criadoEm: string;
}

const TABLE = "admin_telemedicina_cotacoes";
const CACHE: { list: TelemedicinaCotacao[]; loaded: boolean } = { list: [], loaded: false };

export async function loadCotacoes(env: Env): Promise<TelemedicinaCotacao[]> {
  if (CACHE.loaded) return CACHE.list;
  const rows = await loadCollection<TelemedicinaCotacao>(env, TABLE).catch(() => []);
  CACHE.list = rows;
  CACHE.loaded = true;
  return CACHE.list;
}

export async function refreshCotacoes(env: Env): Promise<TelemedicinaCotacao[]> {
  const rows = await loadCollection<TelemedicinaCotacao>(env, TABLE).catch(() => CACHE.list);
  CACHE.list = rows;
  CACHE.loaded = true;
  return CACHE.list;
}

export async function persistCotacao(env: Env, cot: TelemedicinaCotacao): Promise<void> {
  try { await upsertCollectionRow(env, TABLE, cot.id, cot); } catch { /* fail-safe */ }
  CACHE.list.push(cot);
}

/** ID: prefixo TMC + segundo + random (random cobre colisoes no mesmo segundo). */
export function nextCotacaoId(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const ts = Math.floor(Date.now() / 1000).toString(36).toUpperCase();
  return `TMC-${ts}-${rand}`;
}
