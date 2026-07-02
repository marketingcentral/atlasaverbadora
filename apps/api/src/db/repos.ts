// Postgres repositories (Drizzle). Bridges the in-memory admin stores to real
// persistence: hydrate on isolate boot, write-through on mutations. First module
// wired: bancos (schema `bancos` has a `config` jsonb for the extra fields).

import { eq, sql } from "drizzle-orm";
import { getDb, type Db } from "./client.js";
import { bancos as bancosTable } from "./schema.js";
import type { Env } from "../env.js";
import type { BancoAdmin } from "../modules/admin/index.js";

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
