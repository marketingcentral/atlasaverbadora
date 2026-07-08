// Beneficios/descontos comerciais e de saude — averbadora cadastra por prefeitura.
// Servidor ve na aba /servidor/saude (categoria "saude") ou /servidor/beneficios
// (as demais categorias — comercial). Persistidos em admin_beneficios (jsonb).
//
// Origem indica QUEM disponibiliza: "banco" (via cartao consignado) ou "averbadora"
// (negocia com comercio local). Nao existe hard-delete: pausar/reativar via ativo.

import type { Env } from "../../env.js";
import { loadCollection, upsertCollectionRow } from "../../db/repos.js";

export type CategoriaBeneficio = "saude" | "alimentacao" | "educacao" | "lazer";
export type OrigemBeneficio = "banco" | "averbadora";

export interface Beneficio {
  id: string;
  /** ID da prefeitura a que o beneficio pertence (isolamento por cidade). */
  prefeituraId: number;
  nome: string;
  categorias: CategoriaBeneficio[];
  /** "Castro Centro", "Palhoca", etc. */
  local: string;
  /** Emoji do card. Ex.: "💊", "🛒", "💪". */
  icone: string;
  /** Cor de destaque do avatar (hex). */
  cor: string;
  /** "10% desconto". */
  descontoLabel: string;
  /** "em medicamentos". */
  descontoComplemento: string;
  /** Quem disponibiliza: banco (via cartao consignado) ou averbadora (comercio local). */
  origem: OrigemBeneficio;
  ativo: boolean;
  criadoEm: string;
  criadoPor: string;
}

const TABLE = "admin_beneficios";
const CACHE: { list: Beneficio[]; loaded: boolean } = { list: [], loaded: false };

export async function loadBeneficios(env: Env): Promise<Beneficio[]> {
  if (CACHE.loaded) return CACHE.list;
  const rows = await loadCollection<Beneficio>(env, TABLE).catch(() => []);
  CACHE.list = rows;
  CACHE.loaded = true;
  return CACHE.list;
}

export async function refreshBeneficios(env: Env): Promise<Beneficio[]> {
  const rows = await loadCollection<Beneficio>(env, TABLE).catch(() => CACHE.list);
  CACHE.list = rows;
  CACHE.loaded = true;
  return CACHE.list;
}

export async function persistBeneficio(env: Env, b: Beneficio): Promise<void> {
  try { await upsertCollectionRow(env, TABLE, b.id, b); } catch { /* fail-safe */ }
  const i = CACHE.list.findIndex((x) => x.id === b.id);
  if (i >= 0) CACHE.list[i] = b; else CACHE.list.push(b);
}

/** Proximo id sequencial: BEN-N. */
export function nextBeneficioId(): string {
  const maxN = CACHE.list.reduce((m, b) => {
    const n = Number(b.id.split("-").pop());
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `BEN-${maxN + 1}`;
}
