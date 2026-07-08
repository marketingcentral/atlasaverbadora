// Persistencia de COMUNICADOS_MOCK no Postgres.
// Antes era array em memoria — comunicados criados pela averbadora sumiam
// no reciclo do isolate (ex.: cada wrangler deploy). Etapa final: nao pode
// mais perder dados.
//
// Estrategia: armazena a lista inteira como UMA unica linha (id="list") na
// tabela `admin_comunicados`. Preserva a ordem exata (mesmo apos mover para
// cima/baixo) sem precisar de coluna auxiliar. Overhead irrisorio — a lista
// tem dezenas de itens no maximo.

import type { Env } from "../../env.js";
import { loadCollection, upsertCollectionRow, deleteCollectionRow } from "../../db/repos.js";
import { COMUNICADOS_MOCK, type ComunicadoMock } from "./fixtures.js";

// Uma linha por comunicado — mesmo padrao de convenios-store. Antes tentei
// gravar a lista inteira em uma unica linha "list" mas o driver do Postgres
// serializa Array de forma diferente de objeto (interpreta como PG array e
// falha o cast pra jsonb). Ordem preservada via campo `ord: number`.
interface ComunicadoRow extends ComunicadoMock {
  ord: number;
}

const TABLE = "admin_comunicados";
const COMUNICADOS_SEED: ComunicadoMock[] = COMUNICADOS_MOCK.map((c) => ({ ...c }));

let _seeded: Promise<void> | null = null;

/**
 * Read-through: garante o seed inicial (uma vez por isolate) e RE-HIDRATA
 * COMUNICADOS_MOCK do Postgres em cada chamada. Assim um comunicado criado em
 * outro isolate aparece aqui. Best-effort: falha de DB mantem os fixtures.
 */
export async function refreshComunicados(env: Env): Promise<void> {
  try {
    if (!_seeded) {
      _seeded = seedComunicadosIfEmpty(env).then(() => undefined);
    }
    await _seeded;
    const rows = await loadCollection<ComunicadoRow>(env, TABLE);
    if (rows.length > 0) {
      const ordered = [...rows].sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0));
      COMUNICADOS_MOCK.length = 0;
      for (const r of ordered) {
        const { ord: _ord, ...com } = r;
        void _ord;
        COMUNICADOS_MOCK.push(com);
      }
    }
  } catch {
    _seeded = null;
    /* fail-safe: segue com os fixtures em memoria */
  }
}

/**
 * Write-through: persiste a lista completa (todas as linhas) preservando a ordem
 * atual do COMUNICADOS_MOCK via campo `ord`. Chamar apos qualquer mutacao.
 * Nao apaga linhas orfas — apagar e responsabilidade do endpoint DELETE via
 * removerComunicado.
 */
export async function persistComunicados(env: Env): Promise<void> {
  try {
    // Sequencial (nao Promise.all) — evita race no CREATE TABLE IF NOT EXISTS
    // do ensureCollection e mantem ordem previsivel nas escritas paralelas.
    for (let i = 0; i < COMUNICADOS_MOCK.length; i++) {
      const c = COMUNICADOS_MOCK[i]!;
      await upsertCollectionRow(env, TABLE, c.id, { ...c, ord: i });
    }
  } catch {
    /* fail-safe: segue com memoria; sera re-persistido na proxima escrita */
  }
}

/**
 * Apaga uma linha do Postgres alem de atualizar a ordem das restantes.
 * O endpoint DELETE do admin ja tirou o item do COMUNICADOS_MOCK antes de
 * chamar isto — aqui so precisa refletir a remocao no DB.
 */
export async function removerComunicadoPersistido(env: Env, id: string): Promise<void> {
  try {
    await deleteCollectionRow(env, TABLE, id);
    // Reordena as linhas restantes.
    await persistComunicados(env);
  } catch {
    /* fail-safe */
  }
}

async function seedComunicadosIfEmpty(env: Env): Promise<void> {
  const rows = await loadCollection<ComunicadoRow>(env, TABLE);
  if (rows.length > 0) return;
  await Promise.all(
    COMUNICADOS_SEED.map((c, i) => upsertCollectionRow(env, TABLE, c.id, { ...c, ord: i })),
  );
}
