// Extended convenio configuration — locking deadlines, special rules, import formats.
// CONVENIOS_MOCK keeps the static relation banco × prefeitura; this layer adds parametric config.

import { loadCollection, upsertCollectionRow } from "../../db/repos.js";
import type { Env } from "../../env.js";

export type FormatoImportacao = "CSV" | "EXCEL" | "API";

export interface ConvenioConfig {
  /** convenio id (matches CONVENIOS_MOCK.id) */
  id: string;
  /** Lock duration for regular margin reservation, in hours (default 48). */
  prazoTravaHoras: number;
  /** Lock duration for portability operations, in business days (default 7). */
  prazoPortabilidadeDU: number;
  /** Maximum number of installments allowed (defaults to convenio default). */
  maxParcelas: number;
  /** Maximum monthly interest rate (a.m.) allowed in the convenio. */
  taxaMaxAm: number;
  /** Min/Max age range (years) accepted for new contracts. */
  idadeMin: number;
  idadeMax: number;
  /** Maximum share of net salary that can be committed to consignado (default 0.35). */
  maxComprometimentoPct?: number;
  /** Accepted bind types. */
  vinculosAceitos: ("CLT" | "ESTATUTARIO" | "COMISSIONADO" | "APOSENTADO" | "PENSIONISTA")[];
  /** Import format used by the prefeitura for this convenio. */
  formatoImportacao: FormatoImportacao;
  /** Free-form notes (special rules: grace period, refinanciamento, portability fees etc). */
  regrasEspeciais: string;
  /** Convenio vigency interval. */
  vigenciaInicio: string;
  vigenciaFim?: string;
  ativo: boolean;
  atualizadoEm: string;
}

const _configs: ConvenioConfig[] = [
  {
    id: "CONV-001",
    prazoTravaHoras: 48,
    prazoPortabilidadeDU: 7,
    maxParcelas: 96,
    taxaMaxAm: 1.8,
    idadeMin: 18,
    idadeMax: 80,
    vinculosAceitos: ["ESTATUTARIO", "CLT", "APOSENTADO"],
    formatoImportacao: "API",
    regrasEspeciais: "Refin permitido apos 12 parcelas pagas. Portabilidade exige aceite via biometria.",
    vigenciaInicio: "2026-01-01",
    vigenciaFim: "2026-12-31",
    ativo: true,
    atualizadoEm: new Date("2026-06-01T00:00:00Z").toISOString(),
  },
  {
    id: "CONV-002",
    prazoTravaHoras: 72,
    prazoPortabilidadeDU: 7,
    maxParcelas: 84,
    taxaMaxAm: 1.95,
    idadeMin: 18,
    idadeMax: 75,
    vinculosAceitos: ["ESTATUTARIO", "COMISSIONADO"],
    formatoImportacao: "CSV",
    regrasEspeciais: "Carencia maxima de 60 dias. Sem refin de portabilidade.",
    vigenciaInicio: "2026-01-01",
    ativo: true,
    atualizadoEm: new Date("2026-06-01T00:00:00Z").toISOString(),
  },
  {
    id: "CONV-003",
    prazoTravaHoras: 48,
    prazoPortabilidadeDU: 7,
    maxParcelas: 72,
    taxaMaxAm: 1.85,
    idadeMin: 18,
    idadeMax: 79,
    vinculosAceitos: ["ESTATUTARIO", "CLT"],
    formatoImportacao: "EXCEL",
    regrasEspeciais: "Repasse no dia 10. Conciliacao mensal por bate-de-carteira.",
    vigenciaInicio: "2026-01-01",
    ativo: true,
    atualizadoEm: new Date("2026-06-01T00:00:00Z").toISOString(),
  },
];

export function listConvenioConfigs(): ConvenioConfig[] {
  return _configs.slice();
}

export function getConvenioConfig(id: string): ConvenioConfig | undefined {
  return _configs.find((c) => c.id === id);
}

export function upsertConvenioConfig(input: Omit<ConvenioConfig, "atualizadoEm">): ConvenioConfig {
  const idx = _configs.findIndex((c) => c.id === input.id);
  const next: ConvenioConfig = { ...input, atualizadoEm: new Date().toISOString() };
  if (idx >= 0) _configs[idx] = next;
  else _configs.push(next);
  return next;
}

// Persistencia (PG collection) — cliente 21/07/2026: a config que a averbadora
// edita/salva tem que aparecer na prefeitura (outro isolate) e sobreviver a
// deploy. Antes vivia so em memoria; a prefeitura via os defaults do seed.
const PG_TABLE = "admin_convenio_configs";
/** Recarrega do PG e SOBREPÕE o seed in-memory (config editada vence o default). */
export async function refreshConvenioConfigs(env: Env): Promise<void> {
  try {
    const rows = await loadCollection<ConvenioConfig>(env, PG_TABLE);
    for (const r of rows) {
      const idx = _configs.findIndex((c) => c.id === r.id);
      if (idx >= 0) _configs[idx] = r;
      else _configs.push(r);
    }
  } catch { /* fail-safe: usa in-memory */ }
}
/** Write-through: persiste no PG apos editar. Best-effort. */
export async function persistConvenioConfig(env: Env, cfg: ConvenioConfig): Promise<void> {
  try { await upsertCollectionRow(env, PG_TABLE, cfg.id, cfg); } catch { /* fail-safe */ }
}

/** Removes the config entry. Returns true if existed. */
export function deleteConvenioConfig(id: string): boolean {
  const idx = _configs.findIndex((c) => c.id === id);
  if (idx < 0) return false;
  _configs.splice(idx, 1);
  return true;
}

/**
 * Resolve the lock duration to apply to a new operation.
 * Defaults: 48h for regular, 7 business days for portability.
 */
export function resolveLockHours(convenioId: string, isPortabilidade: boolean): number {
  const cfg = getConvenioConfig(convenioId);
  if (!cfg) return isPortabilidade ? 7 * 24 : 48;
  if (isPortabilidade) {
    // 7 dias úteis convertidos para horas, ignorando feriados (cálculo conservador).
    return cfg.prazoPortabilidadeDU * 24;
  }
  return cfg.prazoTravaHoras;
}
