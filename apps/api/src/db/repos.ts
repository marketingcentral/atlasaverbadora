// Postgres repositories. Bridges the in-memory admin stores to real persistence
// via Hyperdrive -> Postgres: hydrate on isolate boot, write-through on mutations.
//
// jsonb columns são escritos com SQL raw + `::jsonb` (uma única serialização).
// drizzle + postgres-js fazem JSON.stringify duas vezes e gravam o objeto como
// string escalar ("cannot set path in scalar"); o raw cast evita isso.

import { sql } from "drizzle-orm";
import { getDb } from "./client.js";
import { bancos as bancosTable, prefeituras as prefeiturasTable, servidores as servidoresTable } from "./schema.js";
import type { Env } from "../env.js";
import type { BancoAdmin, PrefeituraAdmin } from "../modules/admin/index.js";
import { CONVENIOS_MOCK, type ServidorBuscaMock } from "../modules/portal-banco/fixtures.js";

// postgres-js JSON-encoda objetos UMA vez sob `::jsonb`. NAO pre-stringificar
// (dupla serializacao -> string escalar). Arrays viram array-PG, entao para
// colunas jsonb-array usa-se `to_jsonb(${arr}::text[])`.

// ============================================================
// Schema drift — colunas jsonb adicionadas em runtime (idempotente).
// ============================================================
let _schemaEnsured: Promise<void> | null = null;
export function ensureSchema(env: Env): Promise<void> {
  if (_schemaEnsured) return _schemaEnsured;
  _schemaEnsured = (async () => {
    const db = getDb(env);
    await db.execute(sql`ALTER TABLE prefeituras ADD COLUMN IF NOT EXISTS config jsonb DEFAULT '{}'::jsonb`);
    await db.execute(sql`ALTER TABLE servidores ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}'::jsonb`);
    // Tabela dedicada pras tabelas de emprestimo do portal do banco. Chave e
    // o id string ("TBL-001" etc). Dados completos em jsonb pra facilitar
    // evolucao sem migracoes.
    await db.execute(sql`CREATE TABLE IF NOT EXISTS portal_banco_tabelas (
      id text PRIMARY KEY,
      data jsonb NOT NULL,
      updated_at timestamptz DEFAULT now()
    )`);
  })().catch((e) => { _schemaEnsured = null; throw e; });
  return _schemaEnsured;
}

// ============================================================
// Bancos
// ============================================================

function rowToBanco(row: typeof bancosTable.$inferSelect): BancoAdmin {
  const cfg = (row.config ?? {}) as Record<string, unknown>;
  return {
    id: row.id, nome: row.nome,
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

export async function loadBancos(env: Env): Promise<BancoAdmin[]> {
  const rows = await getDb(env).select().from(bancosTable).orderBy(bancosTable.id);
  return rows.map(rowToBanco);
}

export async function upsertBanco(env: Env, b: BancoAdmin): Promise<void> {
  const dom = b.loginEmail ? [b.loginEmail.split("@")[1] ?? ""] : [];
  const cfg = { contatoEmail: b.contatoEmail, loginEmail: b.loginEmail, passwordHash: b.passwordHash, scopes: b.scopes, mtlsHabilitado: b.mtlsHabilitado, ultimoTeste: b.ultimoTeste, ultimoTesteOk: b.ultimoTesteOk };
  // Array jsonb: postgres-js encoda arrays como array-PG (nao JSON). Envolve num
  // objeto (que ele JSON-encoda corretamente, inclusive arrays aninhados) e extrai.
  const domWrap = { v: dom } as unknown as Record<string, unknown>;
  await getDb(env).execute(sql`
    INSERT INTO bancos (id, nome, adapter, status, dominios_email, config)
    VALUES (${b.id}, ${b.nome}, ${b.adapter}, ${b.status}, (${domWrap}::jsonb -> 'v'), ${cfg}::jsonb)
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, adapter = EXCLUDED.adapter, status = EXCLUDED.status, dominios_email = EXCLUDED.dominios_email, config = EXCLUDED.config`);
}

export async function seedBancosIfEmpty(env: Env, seed: BancoAdmin[]): Promise<boolean> {
  const db = getDb(env);
  const c = (await db.execute(sql`SELECT count(*)::int AS n FROM bancos`)) as unknown as { n: number }[];
  if ((c[0]?.n ?? 0) > 0 || seed.length === 0) return false;
  for (const b of seed) await upsertBanco(env, b);
  await db.execute(sql`SELECT setval(pg_get_serial_sequence('bancos','id'), (SELECT COALESCE(MAX(id),1) FROM bancos))`);
  return true;
}

export async function deleteBancoRow(env: Env, id: number): Promise<void> {
  await getDb(env).execute(sql`DELETE FROM bancos WHERE id = ${id}`);
}

// ============================================================
// Prefeituras
// ============================================================

function rowToPrefeitura(row: typeof prefeiturasTable.$inferSelect): PrefeituraAdmin {
  const cfg = (row.config ?? {}) as Record<string, unknown>;
  return {
    id: row.id, nome: row.nome, uf: row.uf, municipioIbge: row.municipioIbge,
    modoIntegracao: (row.modoIntegracao as PrefeituraAdmin["modoIntegracao"]) ?? "REST",
    status: (row.status as PrefeituraAdmin["status"]) ?? "ativo",
    loginEmail: cfg.loginEmail as string | undefined,
    passwordHash: cfg.passwordHash as string | undefined,
    servidoresCount: (cfg.servidoresCount as number) ?? 0,
    ultimaSincronizacao: row.ultimaSincronizacao ? new Date(row.ultimaSincronizacao).toISOString() : undefined,
  };
}

export async function loadPrefeituras(env: Env): Promise<PrefeituraAdmin[]> {
  const rows = await getDb(env).select().from(prefeiturasTable).orderBy(prefeiturasTable.id);
  return rows.map(rowToPrefeitura);
}

export async function upsertPrefeitura(env: Env, p: PrefeituraAdmin): Promise<void> {
  const cfg = { loginEmail: p.loginEmail, passwordHash: p.passwordHash, servidoresCount: p.servidoresCount };
  const sync = p.ultimaSincronizacao ? new Date(p.ultimaSincronizacao).toISOString() : null;
  await getDb(env).execute(sql`
    INSERT INTO prefeituras (id, nome, uf, municipio_ibge, modo_integracao, status, ultima_sincronizacao, config)
    VALUES (${p.id}, ${p.nome}, ${p.uf}, ${p.municipioIbge}, ${p.modoIntegracao}, ${p.status}, ${sync}, ${cfg}::jsonb)
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, uf = EXCLUDED.uf, municipio_ibge = EXCLUDED.municipio_ibge, modo_integracao = EXCLUDED.modo_integracao, status = EXCLUDED.status, ultima_sincronizacao = EXCLUDED.ultima_sincronizacao, config = EXCLUDED.config`);
}

export async function deletePrefeituraRow(env: Env, id: number): Promise<void> {
  await getDb(env).execute(sql`DELETE FROM prefeituras WHERE id = ${id}`);
}

export async function seedPrefeiturasIfEmpty(env: Env, seed: PrefeituraAdmin[]): Promise<boolean> {
  const db = getDb(env);
  const c = (await db.execute(sql`SELECT count(*)::int AS n FROM prefeituras`)) as unknown as { n: number }[];
  if ((c[0]?.n ?? 0) > 0 || seed.length === 0) return false;
  for (const p of seed) await upsertPrefeitura(env, p);
  await db.execute(sql`SELECT setval(pg_get_serial_sequence('prefeituras','id'), (SELECT COALESCE(MAX(id),1) FROM prefeituras))`);
  return true;
}

// ============================================================
// Servidores (snapshot completo no jsonb `data`)
// ============================================================

const VINCULO_ENUM = ["CLT", "ESTATUTARIO", "COMISSIONADO"] as const;
const SITU_ENUM = ["ATIVO", "FERIAS", "AFASTADO", "LICENCA", "LICENCA_REMUNERADA", "APOSENTADO"] as const;
const mapVinculo = (v: string) => (VINCULO_ENUM as readonly string[]).includes(v) ? v : "ESTATUTARIO";
function mapSituacao(s: string): string {
  const up = (s || "").toUpperCase();
  if ((SITU_ENUM as readonly string[]).includes(up)) return up;
  if (up === "TRABALHANDO") return "ATIVO";
  if (up === "DESLIGADO") return "AFASTADO";
  return "ATIVO";
}
const prefeituraIdOf = (s: ServidorBuscaMock) => CONVENIOS_MOCK.find((cv) => cv.id === s.idConvenio)?.prefeituraId ?? 1;

export async function loadServidores(env: Env): Promise<ServidorBuscaMock[]> {
  const rows = await getDb(env).select({ data: servidoresTable.data }).from(servidoresTable);
  return rows.map((r) => r.data as unknown as ServidorBuscaMock).filter((s) => s && s.cpf);
}

export async function upsertServidor(env: Env, s: ServidorBuscaMock): Promise<void> {
  await getDb(env).execute(sql`
    INSERT INTO servidores (prefeitura_id, nome, cpf, matricula, vinculo, situacao_funcional, status, data_nascimento, salario_base, data)
    VALUES (${prefeituraIdOf(s)}, ${s.nome}, ${s.cpf}, ${s.matricula}, ${mapVinculo(s.vinculo)}::vinculo, ${mapSituacao(s.situacaoFuncional)}::situacao_funcional, 'ativo'::servidor_status, ${s.dataNascimento || null}, ${String(s.salarioLiquido)}, ${s as unknown as Record<string, unknown>}::jsonb)
    ON CONFLICT (cpf, matricula) DO UPDATE SET prefeitura_id = EXCLUDED.prefeitura_id, nome = EXCLUDED.nome, vinculo = EXCLUDED.vinculo, situacao_funcional = EXCLUDED.situacao_funcional, status = EXCLUDED.status, data_nascimento = EXCLUDED.data_nascimento, salario_base = EXCLUDED.salario_base, data = EXCLUDED.data`);
}

export async function seedServidoresIfEmpty(env: Env, seed: ServidorBuscaMock[]): Promise<boolean> {
  const db = getDb(env);
  const c = (await db.execute(sql`SELECT count(*)::int AS n FROM servidores`)) as unknown as { n: number }[];
  if ((c[0]?.n ?? 0) > 0 || seed.length === 0) return false;
  for (const s of seed) await upsertServidor(env, s);
  return true;
}

// ============================================================
// Portal Banco — Tabelas de Emprestimo
// ============================================================
// Storage jsonb generico. O TabelaEmprestimo do modulo portal-banco define
// o formato — importado por 'any' pra evitar dependencia circular repos ->
// modules -> repos.

interface TabelaLike { id: string; [k: string]: unknown }

export async function loadTabelas(env: Env): Promise<TabelaLike[]> {
  const rows = (await getDb(env).execute(sql`SELECT data FROM portal_banco_tabelas ORDER BY id`)) as unknown as { data: TabelaLike }[];
  return rows.map((r) => r.data);
}

export async function upsertTabelaRow(env: Env, t: TabelaLike): Promise<void> {
  await getDb(env).execute(sql`
    INSERT INTO portal_banco_tabelas (id, data, updated_at)
    VALUES (${t.id}, ${t as unknown as Record<string, unknown>}::jsonb, now())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`);
}

export async function deleteTabelaRow(env: Env, id: string): Promise<void> {
  await getDb(env).execute(sql`DELETE FROM portal_banco_tabelas WHERE id = ${id}`);
}

export async function seedTabelasIfEmpty(env: Env, seed: TabelaLike[]): Promise<boolean> {
  const db = getDb(env);
  const c = (await db.execute(sql`SELECT count(*)::int AS n FROM portal_banco_tabelas`)) as unknown as { n: number }[];
  if ((c[0]?.n ?? 0) > 0 || seed.length === 0) return false;
  for (const t of seed) await upsertTabelaRow(env, t);
  return true;
}

/** Repara linhas com jsonb corrompido (escalar): TRUNCATE + re-seed com o raw cast correto. */
export async function reseedAll(env: Env, bancosSeed: BancoAdmin[], prefeiturasSeed: PrefeituraAdmin[], servidoresSeed: ServidorBuscaMock[]): Promise<void> {
  const db = getDb(env);
  await ensureSchema(env);
  await db.execute(sql`TRUNCATE servidores, bancos, prefeituras RESTART IDENTITY CASCADE`);
  for (const p of prefeiturasSeed) await upsertPrefeitura(env, p);
  await db.execute(sql`SELECT setval(pg_get_serial_sequence('prefeituras','id'), (SELECT COALESCE(MAX(id),1) FROM prefeituras))`);
  for (const b of bancosSeed) await upsertBanco(env, b);
  await db.execute(sql`SELECT setval(pg_get_serial_sequence('bancos','id'), (SELECT COALESCE(MAX(id),1) FROM bancos))`);
  for (const s of servidoresSeed) await upsertServidor(env, s);
}
