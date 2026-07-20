// Intencoes de contratacao de beneficio: quando o servidor clica "Contratar"
// (mensalidade -> ADF), o registro fica aqui aguardando a averbadora conferir
// com o parceiro externo e aprovar (F5 do plano de fluxos).
//
// Diferente de admin_beneficio_cliques (que so registra interesse), esta
// coleção representa uma intencao DE PAGAMENTO EM FOLHA — precisa conferir
// com o parceiro e virar ADF quando aprovada. Fluxo:
//   pendente -> aprovada (gera ADF) | recusada (fim)

import type { Env } from "../../env.js";
import { loadCollection, upsertCollectionRow } from "../../db/repos.js";

export type BeneficioIntencaoStatus = "pendente" | "aprovada" | "recusada";

export interface BeneficioIntencao {
  /** ID unico da intencao: INT-BEN-<ts>-<random>. */
  id: string;
  beneficioId: string;
  beneficioNome: string;
  /** Valor mensal em R$ (positivo). Vem do beneficio no momento da criacao. */
  valorMensal: number;
  servidorId: number;
  cpf: string;
  nome: string;
  cpfMasked: string;
  matricula: string;
  prefeituraId: number;
  status: BeneficioIntencaoStatus;
  /** Motivo se recusada (opcional). */
  motivo?: string;
  /** ADF gerada quando aprovada — link cross-fluxo. */
  adf?: string;
  /** Timestamp ISO de criacao (servidor clicou). */
  criadoEm: string;
  /** Timestamp da resolucao (aprovada/recusada). */
  resolvidoEm?: string;
  /** Sub do averbadora que resolveu. */
  resolvidoPor?: string;
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
  await upsertCollectionRow(env, TABLE, i.id, i);
  const idx = CACHE.list.findIndex((x) => x.id === i.id);
  if (idx >= 0) CACHE.list[idx] = i; else CACHE.list.push(i);
}

export function nextIntencaoId(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const ts = Math.floor(Date.now() / 1000).toString(36).toUpperCase();
  return `INT-BEN-${ts}-${rand}`;
}
