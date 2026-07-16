// Cotacoes de telemedicina solicitadas pelos servidores no banner de Beneficios.
// O servidor clica "Solicitar Cotacao", confirma o termo, e o time da Atlas
// (averbadora) recebe os dados dele — principalmente o TELEFONE — pra formalizar
// o contrato. Persistido em admin_telemedicina_cotacoes (jsonb collection).

import type { Env } from "../../env.js";
import { loadCollection, upsertCollectionRow, deleteCollectionRow } from "../../db/repos.js";

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
  /** Quando a averbadora ATIVOU o plano (situacao=fechado) — base da barra de progresso 12 meses. */
  ativadoEm?: string;
  /** Chave do contrato anexado no R2. A averbadora SO consegue ativar o plano depois
   *  de anexar o contrato — mesma regra do CCB no fluxo de emprestimo. */
  contratoKey?: string;
  contratoNome?: string;
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

/** Atualiza a situacao de uma cotacao (averbadora: "contatado" | "fechado" | "cancelado").
 *  Ao FECHAR (ativar plano), carimba ativadoEm — base da barra de progresso de 12 meses. */
export async function updateCotacaoSituacao(env: Env, id: string, situacao: string): Promise<TelemedicinaCotacao | null> {
  await refreshCotacoes(env);
  const cot = CACHE.list.find((x) => x.id === id);
  if (!cot) return null;
  cot.situacao = situacao;
  if (situacao === "fechado" && !cot.ativadoEm) cot.ativadoEm = new Date().toISOString();
  try { await upsertCollectionRow(env, TABLE, cot.id, cot); } catch { /* fail-safe */ }
  return cot;
}

/** Anexa o contrato (chave R2) na cotacao — pre-requisito pra ativar o plano. */
export async function setCotacaoContrato(env: Env, id: string, key: string, nome: string): Promise<TelemedicinaCotacao | null> {
  await refreshCotacoes(env);
  const cot = CACHE.list.find((x) => x.id === id);
  if (!cot) return null;
  cot.contratoKey = key;
  cot.contratoNome = nome;
  try { await upsertCollectionRow(env, TABLE, cot.id, cot); } catch { /* fail-safe */ }
  return cot;
}

/** Remove o contrato anexado (anexo errado) — volta a bloquear a ativacao do plano. */
export async function removeCotacaoContrato(env: Env, id: string): Promise<TelemedicinaCotacao | null> {
  await refreshCotacoes(env);
  const cot = CACHE.list.find((x) => x.id === id);
  if (!cot) return null;
  delete cot.contratoKey;
  delete cot.contratoNome;
  try { await upsertCollectionRow(env, TABLE, cot.id, cot); } catch { /* fail-safe */ }
  return cot;
}

/** Apaga TODAS as cotacoes (limpeza de testes — averbadora). */
export async function purgeCotacoes(env: Env): Promise<number> {
  await refreshCotacoes(env);
  const ids = CACHE.list.map((x) => x.id);
  for (const id of ids) { try { await deleteCollectionRow(env, TABLE, id); } catch { /* fail-safe */ } }
  CACHE.list = [];
  return ids.length;
}

const TTL_MS = 48 * 60 * 60 * 1000;
/** Cancela cotacoes "nova" com mais de 48h sem contato (libera a margem travada). */
export async function expireStaleCotacoes(env: Env): Promise<void> {
  await refreshCotacoes(env);
  const agora = Date.now();
  for (const cot of CACHE.list) {
    if (cot.situacao === "nova" && agora - new Date(cot.criadoEm).getTime() > TTL_MS) {
      cot.situacao = "cancelado";
      try { await upsertCollectionRow(env, TABLE, cot.id, cot); } catch { /* fail-safe */ }
    }
  }
}

/** ID: prefixo TMC + segundo + random (random cobre colisoes no mesmo segundo). */
export function nextCotacaoId(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const ts = Math.floor(Date.now() / 1000).toString(36).toUpperCase();
  return `TMC-${ts}-${rand}`;
}
