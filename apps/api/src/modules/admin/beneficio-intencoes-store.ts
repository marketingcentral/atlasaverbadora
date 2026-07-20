// Intencoes de servidores em beneficios/telemedicina.
// Diferente de "clique" (que so registra interesse), a intencao representa uma
// acao formal — servidor clicou "Quero contratar" e o sistema precisa dar
// sequencia (cotacao, contratacao, etc). Persistido em admin_beneficio_intencoes.

import type { Env } from "../../env.js";
import { loadCollection, upsertCollectionRow } from "../../db/repos.js";

export interface BeneficioIntencao {
  /** ID unico: INT-<ts>-<rand>. */
  id: string;
  beneficioId: string;
  beneficioNome?: string;
  valorMensal?: number;
  servidorId: number;
  cpf?: string;
  nome: string;
  cpfMasked: string;
  matricula: string;
  prefeituraId: number;
  status: "pendente" | "aprovada" | "recusada" | "cancelada";
  criadoEm: string;
  atualizadoEm?: string;
  motivo?: string;
}

const TABLE = "admin_beneficio_intencoes";
const CACHE: { list: BeneficioIntencao[]; loaded: boolean } = { list: [], loaded: false };

export async function loadIntencoes(env: Env): Promise<BeneficioIntencao[]> {
  if (CACHE.loaded) return CACHE.list;
  const rows = await loadCollection<BeneficioIntencao>(env, TABLE).catch(() => []);
  CACHE.list = rows;
  CACHE.loaded = true;
  return CACHE.list;
}

export async function refreshIntencoes(env: Env): Promise<BeneficioIntencao[]> {
  const rows = await loadCollection<BeneficioIntencao>(env, TABLE).catch(() => CACHE.list);
  CACHE.list = rows;
  CACHE.loaded = true;
  return CACHE.list;
}

export async function persistIntencao(env: Env, i: BeneficioIntencao): Promise<void> {
  try { await upsertCollectionRow(env, TABLE, i.id, i); } catch { /* fail-safe */ }
  const idx = CACHE.list.findIndex((x) => x.id === i.id);
  if (idx >= 0) CACHE.list[idx] = i;
  else CACHE.list.push(i);
}

export function nextIntencaoId(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const ts = Math.floor(Date.now() / 1000).toString(36).toUpperCase();
  return `INT-${ts}-${rand}`;
}
