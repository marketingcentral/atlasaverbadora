// Persistência dos convênios no Postgres (tabela genérica `admin_convenios`, jsonb).
// Antes, CONVENIOS_MOCK era só um array em memória — convênios criados pela
// averbadora sumiam no reciclo do isolate e não apareciam entre isolates.
// Agora: seed-once + read-through (re-hidrata CONVENIOS_MOCK a cada chamada) e
// write-through (persistConvenio na criação/edição/desativação). Mesmo padrão do
// refreshContratos. Módulo separado para evitar ciclo de imports admin↔portal-banco.

import type { Env } from "../../env.js";
import { loadCollection, seedCollectionIfEmpty, upsertCollectionRow } from "../../db/repos.js";
import { CONVENIOS_MOCK, type ConvenioMock } from "./fixtures.js";

const TABLE = "admin_convenios";
// Snapshot dos convênios-semente (os 3 do fixtures) capturado no load do módulo.
const CONVENIOS_SEED: ConvenioMock[] = CONVENIOS_MOCK.map((c) => ({ ...c }));

let _seeded: Promise<void> | null = null;

/**
 * Read-through: garante o seed inicial (uma vez por isolate) e RE-HIDRATA
 * CONVENIOS_MOCK do Postgres em cada chamada — assim um convênio criado em
 * outro isolate aparece aqui. Best-effort: falha de DB mantém os fixtures.
 */
export async function refreshConvenios(env: Env): Promise<void> {
  try {
    if (!_seeded) {
      _seeded = seedCollectionIfEmpty(env, TABLE, CONVENIOS_SEED.map((c) => ({ id: c.id, data: c }))).then(() => undefined);
    }
    await _seeded;
    const rows = await loadCollection<ConvenioMock>(env, TABLE);
    if (rows.length) {
      CONVENIOS_MOCK.length = 0;
      CONVENIOS_MOCK.push(...rows);
    }
  } catch {
    _seeded = null; // permite re-tentar o seed na próxima chamada
    /* fail-safe: segue com os fixtures em memória */
  }
}

/** Write-through: persiste um convênio (criação/edição/desativação) no Postgres. */
export async function persistConvenio(env: Env, c: ConvenioMock): Promise<void> {
  try {
    await upsertCollectionRow(env, TABLE, c.id, c);
  } catch {
    /* fail-safe: segue com memória; será re-persistido na próxima escrita */
  }
}

/** Hard-delete: remove convênio do PG + in-memory. Só usar em convênios
 *  INATIVOS sem contratos vinculados (o handler valida isso). */
export async function deleteConvenioHard(env: Env, id: string): Promise<void> {
  const idx = CONVENIOS_MOCK.findIndex((c) => c.id === id);
  if (idx >= 0) CONVENIOS_MOCK.splice(idx, 1);
  try {
    const { deleteCollectionRow } = await import("../../db/repos.js");
    await deleteCollectionRow(env, TABLE, id);
  } catch { /* fail-safe */ }
}

/** Próximo id de convênio livre POR PREFEITURA. Cliente relatou 22/07/2026:
 *  antes o seq era global — Prefeitura A tinha CONV-001..004, ao criar o
 *  primeiro convenio da B saia CONV-005. Agora cada prefeitura tem seus 001+.
 *  Formato: CONV-{prefeituraId}-{seq3}. IDs velhos (CONV-NNN sem prefId) sao
 *  tratados como "prefeitura 0" pra nao colidir e continuam validos. */
export function nextConvenioId(prefeituraId: number): string {
  let max = 0;
  const prefixNovo = `CONV-${prefeituraId}-`;
  for (const c of CONVENIOS_MOCK) {
    if (c.prefeituraId !== prefeituraId) continue;
    const m1 = new RegExp(`^CONV-${prefeituraId}-(\\d+)$`).exec(c.id);
    if (m1) { max = Math.max(max, Number(m1[1])); continue; }
    // Legacy: se ainda tem CONV-NNN puro desta prefeitura, considera pra seq
    const m2 = /^CONV-(\d+)$/.exec(c.id);
    if (m2) max = Math.max(max, Number(m2[1]));
  }
  return `${prefixNovo}${String(max + 1).padStart(3, "0")}`;
}
