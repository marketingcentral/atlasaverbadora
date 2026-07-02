// Postgres repositories (Drizzle). Bridges the in-memory admin stores to real
// persistence: hydrate on isolate boot, write-through on mutations. First module
// wired: bancos (schema `bancos` has a `config` jsonb for the extra fields).

import { eq, sql } from "drizzle-orm";
import { getDb, type Db } from "./client.js";
import { bancos as bancosTable, prefeituras as prefeiturasTable, servidores as servidoresTable } from "./schema.js";
import type { Env } from "../env.js";
import type { BancoAdmin, PrefeituraAdmin } from "../modules/admin/index.js";
import { CONVENIOS_MOCK, type ServidorBuscaMock } from "../modules/portal-banco/fixtures.js";

// ============================================================
// Schema drift — colunas jsonb adicionadas em runtime (idempotente) enquanto
// não há migração dedicada. Roda uma vez por isolate.
// ============================================================
let _schemaEnsured: Promise<void> | null = null;
export function ensureSchema(env: Env): Promise<void> {
  if (_schemaEnsured) return _schemaEnsured;
  _schemaEnsured = (async () => {
    const db = getDb(env);
    await db.execute(sql`ALTER TABLE prefeituras ADD COLUMN IF NOT EXISTS config jsonb DEFAULT '{}'::jsonb`);
    await db.execute(sql`ALTER TABLE servidores ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}'::jsonb`);
  })().catch((e) => { _schemaEnsured = null; throw e; });
  return _schemaEnsured;
}

function rowToBanco(row: typeof bancosTable.$inferSelect): BancoAdmin {
  const cfg = (row.config ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    nome: row.nome,
    adapter: (row.adapter as BancoAdmin["adapter"]) ?? "sandbox",
    status: (row.status as BancoAdmin["status"]) ?? "ativo",
    contatoEmail: (cfg.contatoEmail as string) ?? "",
    loginEmail: cfg.loginEmail as string | undefined,
    passwordHash: cfg.passwordHash as string | undefined,
    scopes: (cfg.scopes as string[]) ?? [],
    mtlsHabilitado: Boolean(cfg.mtlsHabilitado),
    ultimoTeste: cfg.ultimoTeste as string | undefined,
    ultimoTesteOk: cfg.ultimoTesteOk as boolean | undefined,
  };
}

function bancoToRow(b: BancoAdmin) {
  return {
    id: b.id,
    nome: b.nome,
    adapter: b.adapter,
    status: b.status,
    dominiosEmail: b.loginEmail ? [b.loginEmail.split("@")[1] ?? ""] : [],
    config: {
      contatoEmail: b.contatoEmail,
      loginEmail: b.loginEmail,
      passwordHash: b.passwordHash,
      scopes: b.scopes,
      mtlsHabilitado: b.mtlsHabilitado,
      ultimoTeste: b.ultimoTeste,
      ultimoTesteOk: b.ultimoTesteOk,
    },
  };
}

export async function loadBancos(env: Env): Promise<BancoAdmin[]> {
  const db: Db = getDb(env);
  const rows = await db.select().from(bancosTable).orderBy(bancosTable.id);
  return rows.map(rowToBanco);
}

/** Seeds the table from the given fixtures if it is empty. Preserves ids. */
export async function seedBancosIfEmpty(env: Env, seed: BancoAdmin[]): Promise<boolean> {
  const db: Db = getDb(env);
  const countRows = (await db.execute(sql`SELECT count(*)::int AS n FROM bancos`)) as unknown as { n: number }[];
  const n = countRows[0]?.n ?? 0;
  if (n > 0) return false;
  if (seed.length === 0) return false;
  await db.insert(bancosTable).values(seed.map(bancoToRow));
  // Ajusta a sequence do serial para o maior id inserido.
  await db.execute(sql`SELECT setval(pg_get_serial_sequence('bancos','id'), (SELECT COALESCE(MAX(id),1) FROM bancos))`);
  return true;
}

export async function upsertBanco(env: Env, b: BancoAdmin): Promise<void> {
  const db: Db = getDb(env);
  const row = bancoToRow(b);
  await db
    .insert(bancosTable)
    .values(row)
    .onConflictDoUpdate({ target: bancosTable.id, set: { nome: row.nome, adapter: row.adapter, status: row.status, dominiosEmail: row.dominiosEmail, config: row.config } });
}

export async function deleteBancoRow(env: Env, id: number): Promise<void> {
  const db: Db = getDb(env);
  await db.delete(bancosTable).where(eq(bancosTable.id, id));
}

/** Remove bancos de teste pelo nome (limpeza pós-demonstração). Retorna quantos apagou. */
export async function deleteBancosByNameLike(env: Env, pattern: string): Promise<number> {
  const db: Db = getDb(env);
  const res = (await db.execute(sql`DELETE FROM bancos WHERE nome ILIKE ${pattern} RETURNING id`)) as unknown as unknown[];
  return res.length;
}

// ============================================================
// Prefeituras
// ============================================================

function rowToPrefeitura(row: typeof prefeiturasTable.$inferSelect): PrefeituraAdmin {
  const cfg = (row.config ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    nome: row.nome,
    uf: row.uf,
    municipioIbge: row.municipioIbge,
    modoIntegracao: (row.modoIntegracao as PrefeituraAdmin["modoIntegracao"]) ?? "REST",
    status: (row.status as PrefeituraAdmin["status"]) ?? "ativo",
    loginEmail: cfg.loginEmail as string | undefined,
    passwordHash: cfg.passwordHash as string | undefined,
    servidoresCount: (cfg.servidoresCount as number) ?? 0,
    ultimaSincronizacao: row.ultimaSincronizacao ? new Date(row.ultimaSincronizacao).toISOString() : undefined,
  };
}

function prefeituraToRow(p: PrefeituraAdmin) {
  return {
    id: p.id,
    nome: p.nome,
    uf: p.uf,
    municipioIbge: p.municipioIbge,
    modoIntegracao: p.modoIntegracao,
    status: p.status,
    ultimaSincronizacao: p.ultimaSincronizacao ? new Date(p.ultimaSincronizacao) : null,
    config: { loginEmail: p.loginEmail, passwordHash: p.passwordHash, servidoresCount: p.servidoresCount },
  };
}

export async function loadPrefeituras(env: Env): Promise<PrefeituraAdmin[]> {
  const db: Db = getDb(env);
  const rows = await db.select().from(prefeiturasTable).orderBy(prefeiturasTable.id);
  return rows.map(rowToPrefeitura);
}

export async function seedPrefeiturasIfEmpty(env: Env, seed: PrefeituraAdmin[]): Promise<boolean> {
  const db: Db = getDb(env);
  const countRows = (await db.execute(sql`SELECT count(*)::int AS n FROM prefeituras`)) as unknown as { n: number }[];
  if ((countRows[0]?.n ?? 0) > 0 || seed.length === 0) return false;
  await db.insert(prefeiturasTable).values(seed.map(prefeituraToRow));
  await db.execute(sql`SELECT setval(pg_get_serial_sequence('prefeituras','id'), (SELECT COALESCE(MAX(id),1) FROM prefeituras))`);
  return true;
}

export async function upsertPrefeitura(env: Env, p: PrefeituraAdmin): Promise<void> {
  const db: Db = getDb(env);
  const row = prefeituraToRow(p);
  await db
    .insert(prefeiturasTable)
    .values(row)
    .onConflictDoUpdate({ target: prefeiturasTable.id, set: { nome: row.nome, uf: row.uf, municipioIbge: row.municipioIbge, modoIntegracao: row.modoIntegracao, status: row.status, ultimaSincronizacao: row.ultimaSincronizacao, config: row.config } });
}

// ============================================================
// Servidores (snapshot completo no jsonb `data`)
// ============================================================

const VINCULO_ENUM = ["CLT", "ESTATUTARIO", "COMISSIONADO"] as const;
const SITU_ENUM = ["ATIVO", "FERIAS", "AFASTADO", "LICENCA", "LICENCA_REMUNERADA", "APOSENTADO"] as const;

function mapVinculo(v: string): (typeof VINCULO_ENUM)[number] {
  return (VINCULO_ENUM as readonly string[]).includes(v) ? (v as (typeof VINCULO_ENUM)[number]) : "ESTATUTARIO";
}
function mapSituacao(s: string): (typeof SITU_ENUM)[number] {
  const up = (s || "").toUpperCase();
  if ((SITU_ENUM as readonly string[]).includes(up)) return up as (typeof SITU_ENUM)[number];
  if (up === "TRABALHANDO") return "ATIVO";
  if (up === "DESLIGADO") return "AFASTADO";
  return "ATIVO";
}
function prefeituraIdOf(s: ServidorBuscaMock): number {
  return CONVENIOS_MOCK.find((cv) => cv.id === s.idConvenio)?.prefeituraId ?? 1;
}

function servidorToRow(s: ServidorBuscaMock) {
  return {
    prefeituraId: prefeituraIdOf(s),
    nome: s.nome,
    cpf: s.cpf,
    matricula: s.matricula,
    vinculo: mapVinculo(s.vinculo),
    situacaoFuncional: mapSituacao(s.situacaoFuncional),
    status: "ativo" as const,
    dataNascimento: s.dataNascimento || null,
    salarioBase: String(s.salarioLiquido),
    data: s as unknown as Record<string, unknown>,
  };
}

export async function loadServidores(env: Env): Promise<ServidorBuscaMock[]> {
  const db: Db = getDb(env);
  const rows = await db.select({ data: servidoresTable.data }).from(servidoresTable);
  return rows.map((r) => r.data as unknown as ServidorBuscaMock).filter((s) => s && s.cpf);
}

export async function seedServidoresIfEmpty(env: Env, seed: ServidorBuscaMock[]): Promise<boolean> {
  const db: Db = getDb(env);
  const countRows = (await db.execute(sql`SELECT count(*)::int AS n FROM servidores`)) as unknown as { n: number }[];
  if ((countRows[0]?.n ?? 0) > 0 || seed.length === 0) return false;
  await db.insert(servidoresTable).values(seed.map(servidorToRow));
  return true;
}

export async function upsertServidor(env: Env, s: ServidorBuscaMock): Promise<void> {
  const db: Db = getDb(env);
  const row = servidorToRow(s);
  await db
    .insert(servidoresTable)
    .values(row)
    .onConflictDoUpdate({ target: [servidoresTable.cpf, servidoresTable.matricula], set: { prefeituraId: row.prefeituraId, nome: row.nome, vinculo: row.vinculo, situacaoFuncional: row.situacaoFuncional, status: row.status, dataNascimento: row.dataNascimento, salarioBase: row.salarioBase, data: row.data } });
}
