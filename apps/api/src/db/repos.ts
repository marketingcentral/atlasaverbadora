// Postgres repositories. Bridges the in-memory admin stores to real persistence
// via Hyperdrive -> Postgres: hydrate on isolate boot, write-through on mutations.
//
// jsonb columns são escritos com SQL raw + `::jsonb` (uma única serialização).
// drizzle + postgres-js fazem JSON.stringify duas vezes e gravam o objeto como
// string escalar ("cannot set path in scalar"); o raw cast evita isso.

import { sql, type SQL } from "drizzle-orm";
import { getDb } from "./client.js";
import { bancos as bancosTable, prefeituras as prefeiturasTable, servidores as servidoresTable } from "./schema.js";
import type { Env } from "../env.js";
import type { BancoAdmin, PrefeituraAdmin } from "../modules/admin/index.js";
import { prefeituraIdDe, type ServidorBuscaMock } from "../modules/portal-banco/fixtures.js";

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
    // Contratos/reservas do portal do banco (adf PK + data jsonb). A proposta do
    // servidor grava aqui (write-through) pra chegar no banco entre isolates.
    await db.execute(sql`CREATE TABLE IF NOT EXISTS portal_banco_contratos (
      adf text PRIMARY KEY,
      data jsonb NOT NULL,
      updated_at timestamptz DEFAULT now()
    )`);
    // Tombamento: um registro por lote com o lote + suas linhas em jsonb.
    await db.execute(sql`CREATE TABLE IF NOT EXISTS tombamento_lotes (
      id text PRIMARY KEY,
      data jsonb NOT NULL,
      updated_at timestamptz DEFAULT now()
    )`);
    // Log operacional compartilhado entre isolates. O Worker roda em vários
    // isolates e cada um tem seu buffer em memória; persistir aqui garante que
    // TODA alteração (de qualquer perfil) apareça no log da averbadora
    // independente de qual isolate serviu a requisição.
    await db.execute(sql`CREATE TABLE IF NOT EXISTS app_logs (
      id bigserial PRIMARY KEY,
      ts timestamptz NOT NULL DEFAULT now(),
      level text NOT NULL,
      source text NOT NULL,
      perfil text NOT NULL,
      message text NOT NULL,
      trace_id text NOT NULL
    )`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS app_logs_ts_idx ON app_logs (ts DESC)`);
    // Contratos + reservas (propostas) do portal do banco. Chave = adf (id string).
    // Dado completo em jsonb pra evoluir sem migração. Compartilhado entre isolates:
    // é aqui que a proposta do servidor "chega" no banco e sobrevive ao refresh.
    await db.execute(sql`CREATE TABLE IF NOT EXISTS contratos (
      adf text PRIMARY KEY,
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
    baseUrl: cfg.baseUrl as string | undefined,
    ultimoTeste: cfg.ultimoTeste as string | undefined,
    ultimoTesteOk: cfg.ultimoTesteOk as boolean | undefined,
    // Campos do cadastro por CNPJ — hidratados do jsonb (mesma estrategia do PrefeituraAdmin).
    cnpj: cfg.cnpj as string | undefined,
    razaoSocial: cfg.razaoSocial as string | undefined,
    nomeFantasia: cfg.nomeFantasia as string | undefined,
    dataFundacao: cfg.dataFundacao as string | undefined,
    atividade: cfg.atividade as string | undefined,
    telefone: cfg.telefone as string | undefined,
    endereco: cfg.endereco as BancoAdmin["endereco"] | undefined,
  };
}

export async function loadBancos(env: Env): Promise<BancoAdmin[]> {
  const rows = await getDb(env).select().from(bancosTable).orderBy(bancosTable.id);
  return rows.map(rowToBanco);
}

export async function upsertBanco(env: Env, b: BancoAdmin): Promise<void> {
  const dom = b.loginEmail ? [b.loginEmail.split("@")[1] ?? ""] : [];
  // Persiste TODOS os campos extras (CNPJ, telefone, endereco, razao social).
  // Antes so persistia contato/login/scopes — dados oficiais do CNPJ sumiam
  // no cold-start.
  const cfg = {
    contatoEmail: b.contatoEmail,
    loginEmail: b.loginEmail,
    passwordHash: b.passwordHash,
    scopes: b.scopes,
    mtlsHabilitado: b.mtlsHabilitado,
    baseUrl: b.baseUrl, // health check URL (opcional)
    ultimoTeste: b.ultimoTeste,
    ultimoTesteOk: b.ultimoTesteOk,
    cnpj: b.cnpj,
    razaoSocial: b.razaoSocial,
    nomeFantasia: b.nomeFantasia,
    dataFundacao: b.dataFundacao,
    atividade: b.atividade,
    telefone: b.telefone,
    endereco: b.endereco,
  };
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
    contatoEmail: cfg.contatoEmail as string | undefined,
    passwordHash: cfg.passwordHash as string | undefined,
    servidoresCount: (cfg.servidoresCount as number) ?? 0,
    ultimaSincronizacao: row.ultimaSincronizacao ? new Date(row.ultimaSincronizacao).toISOString() : undefined,
    exigeCcb: Boolean(cfg.exigeCcb),
    exigeBanco2FA: Boolean(cfg.exigeBanco2FA),
    // Campos extras do fluxo de cadastro por CNPJ — hidratados do jsonb.
    // Antes ficavam so em memoria do POST e sumiam no cold-start do isolate.
    cnpj: cfg.cnpj as string | undefined,
    razaoSocial: cfg.razaoSocial as string | undefined,
    nomeFantasia: cfg.nomeFantasia as string | undefined,
    dataFundacao: cfg.dataFundacao as string | undefined,
    atividade: cfg.atividade as string | undefined,
    telefone: cfg.telefone as string | undefined,
    endereco: cfg.endereco as PrefeituraAdmin["endereco"] | undefined,
    permiteServidorEditarContato: cfg.permiteServidorEditarContato as boolean | undefined,
    exclusividadesCartaoConsig: cfg.exclusividadesCartaoConsig as string | undefined,
  };
}

export async function loadPrefeituras(env: Env): Promise<PrefeituraAdmin[]> {
  const rows = await getDb(env).select().from(prefeiturasTable).orderBy(prefeiturasTable.id);
  return rows.map(rowToPrefeitura);
}

export async function upsertPrefeitura(env: Env, p: PrefeituraAdmin): Promise<void> {
  // Persiste TODOS os campos extras no config jsonb (CNPJ, telefone, endereco,
  // razao social etc). Antes so persistia loginEmail/passwordHash/etc — os
  // dados oficiais preenchidos pela consulta CNPJ sumiam no cold-start.
  const cfg = {
    loginEmail: p.loginEmail,
    contatoEmail: p.contatoEmail,
    passwordHash: p.passwordHash,
    servidoresCount: p.servidoresCount,
    exigeCcb: p.exigeCcb ?? false,
    exigeBanco2FA: p.exigeBanco2FA ?? false,
    cnpj: p.cnpj,
    razaoSocial: p.razaoSocial,
    nomeFantasia: p.nomeFantasia,
    dataFundacao: p.dataFundacao,
    atividade: p.atividade,
    telefone: p.telefone,
    endereco: p.endereco,
    permiteServidorEditarContato: p.permiteServidorEditarContato,
    exclusividadesCartaoConsig: p.exclusividadesCartaoConsig,
  };
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
const prefeituraIdOf = (s: ServidorBuscaMock) => prefeituraIdDe(s);

export async function loadServidores(env: Env): Promise<ServidorBuscaMock[]> {
  // Traz tambem o id serial e anexa como _dbId: reflete a ordem REAL de
  // insercao, usada como fallback de ordenacao pras rows sem criadoEmIso
  // (base antiga) — assim elas seguem a ordem em que foram cadastradas sem
  // precisar reimportar. Cliente pediu 23/07/2026.
  const rows = await getDb(env).select({ id: servidoresTable.id, data: servidoresTable.data }).from(servidoresTable);
  return rows
    .map((r) => {
      const s = r.data as unknown as ServidorBuscaMock;
      if (s) s._dbId = r.id;
      return s;
    })
    .filter((s) => s && s.cpf);
}

/** Normaliza data pra ISO YYYY-MM-DD ou null. Aceita:
 *   "1976-06-22" (ja ISO) | "22/06/1976" (BR) | "" | undefined
 *  Qualquer outra coisa vira null (evita "date/time field value out of range").
 *  Salvamos o valor bruto tambem em `data` jsonb pra nao perder informacao. */
function toIsoDateOrNull(raw: string | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) return s;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
}

export async function upsertServidor(env: Env, s: ServidorBuscaMock): Promise<void> {
  // MERGE shallow no jsonb (servidores.data || EXCLUDED.data): chaves antigas
  // que NÃO estão no novo objeto sobrevivem — passwordHash, email/telefone
  // definidos no primeiro-acesso não são apagados por re-import de CSV
  // que venha sem essas colunas.
  const nascimento = toIsoDateOrNull(s.dataNascimento);
  // _dbId e' runtime-only (id serial anexado no load) — nunca vai pro jsonb,
  // senao gravariamos um id defasado que confunde a ordenacao no proximo load.
  const { _dbId: _omit, ...persistivel } = s;
  await getDb(env).execute(sql`
    INSERT INTO servidores (prefeitura_id, nome, cpf, matricula, vinculo, situacao_funcional, status, data_nascimento, salario_base, data)
    VALUES (${prefeituraIdOf(s)}, ${s.nome}, ${s.cpf}, ${s.matricula}, ${mapVinculo(s.vinculo)}::vinculo, ${mapSituacao(s.situacaoFuncional)}::situacao_funcional, 'ativo'::servidor_status, ${nascimento}, ${String(s.salarioLiquido)}, ${persistivel as unknown as Record<string, unknown>}::jsonb)
    ON CONFLICT (cpf, matricula) DO UPDATE SET
      -- prefeitura_id: PRESERVA a existente quando o import vem de OUTRA
      -- prefeitura. Sem isso, importar (cpf, matricula) numa Pref B "sequestra"
      -- silenciosamente o servidor da Pref A (mesma dupla vira row unico
      -- porque o unique e' so em cpf+matricula). Cliente reportou 24/07/2026
      -- ghosts de servidor pulando de prefeitura apos reimport.
      -- Se admin quiser realocar servidor de prefeitura, faz via PATCH direto.
      prefeitura_id = CASE
        WHEN servidores.prefeitura_id = 0 OR servidores.prefeitura_id IS NULL
          THEN EXCLUDED.prefeitura_id
        WHEN servidores.prefeitura_id = EXCLUDED.prefeitura_id
          THEN EXCLUDED.prefeitura_id
        ELSE servidores.prefeitura_id
      END,
      nome = EXCLUDED.nome,
      vinculo = EXCLUDED.vinculo,
      situacao_funcional = EXCLUDED.situacao_funcional,
      status = EXCLUDED.status,
      data_nascimento = EXCLUDED.data_nascimento,
      salario_base = EXCLUDED.salario_base,
      data = COALESCE(servidores.data, '{}'::jsonb) || EXCLUDED.data`);
}

/** Define/atualiza o passwordHash (SHA-256) no jsonb `data` de todas as matrículas do CPF.
 *  Usado no fluxo de primeiro acesso. Retorna o número de linhas afetadas. */
export async function setServidorPassword(env: Env, cpf: string, passwordHash: string): Promise<number> {
  const rows = (await getDb(env).execute(sql`
    UPDATE servidores
    SET data = jsonb_set(COALESCE(data, '{}'::jsonb), '{passwordHash}', to_jsonb(${passwordHash}::text), true)
    WHERE cpf = ${cpf}
    RETURNING id`)) as unknown as { id: number }[];
  return rows.length;
}

/** Atualiza email e/ou telefone no jsonb `data` de todas as matrículas do CPF. */
export async function setServidorContato(
  env: Env,
  cpf: string,
  contato: { email?: string; telefone?: string },
): Promise<number> {
  if (contato.email === undefined && contato.telefone === undefined) return 0;
  let expr = sql`COALESCE(data, '{}'::jsonb)`;
  if (contato.email !== undefined) {
    expr = sql`jsonb_set(${expr}, '{email}', to_jsonb(${contato.email}::text), true)`;
  }
  if (contato.telefone !== undefined) {
    expr = sql`jsonb_set(${expr}, '{telefone}', to_jsonb(${contato.telefone}::text), true)`;
  }
  const rows = (await getDb(env).execute(
    sql`UPDATE servidores SET data = ${expr} WHERE cpf = ${cpf} RETURNING id`,
  )) as unknown as { id: number }[];
  return rows.length;
}

/** Autoritativo (consulta o Postgres): o e-mail já está vinculado a OUTRO CPF?
 *  Independe do estado em memória do isolate — é a fonte da verdade da unicidade. */
export async function emailEmUsoPorOutroCpf(env: Env, email: string, cpf: string): Promise<boolean> {
  const emailLower = email.trim().toLowerCase();
  if (!emailLower) return false;
  const rows = (await getDb(env).execute(sql`
    SELECT 1 FROM servidores
    WHERE lower(data->>'email') = ${emailLower} AND cpf <> ${cpf}
    LIMIT 1`)) as unknown as unknown[];
  return rows.length > 0;
}

/** Zera a conta de um CPF: remove passwordHash, email e telefone do jsonb `data`
 *  de TODAS as matrículas — deixa o servidor pronto para um novo primeiro-acesso.
 *  Retorna o número de linhas afetadas. */
export async function clearServidorConta(env: Env, cpf: string): Promise<number> {
  const rows = (await getDb(env).execute(sql`
    UPDATE servidores
    SET data = (COALESCE(data, '{}'::jsonb) - 'passwordHash' - 'email' - 'telefone')
    WHERE cpf = ${cpf}
    RETURNING id`)) as unknown as { id: number }[];
  return rows.length;
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

// ============================================================
// Tombamento — lotes + linhas (um registro jsonb por lote)
// ============================================================
// Tipos genéricos pra evitar import circular repos <-> modules/admin/tombamento.
interface LoteLike { id: string; [k: string]: unknown }

export async function loadTombamento(env: Env): Promise<{ lotes: LoteLike[]; linhas: LoteLike[] }> {
  const rows = (await getDb(env).execute(sql`SELECT data FROM tombamento_lotes ORDER BY id`)) as unknown as { data: { lote: LoteLike; linhas: LoteLike[] } }[];
  const lotes: LoteLike[] = [];
  const linhas: LoteLike[] = [];
  for (const r of rows) { if (r.data?.lote) { lotes.push(r.data.lote); linhas.push(...(r.data.linhas ?? [])); } }
  return { lotes, linhas };
}

export async function upsertTombamentoLote(env: Env, lote: LoteLike, linhas: LoteLike[]): Promise<void> {
  const payload = { lote, linhas } as unknown as Record<string, unknown>;
  await getDb(env).execute(sql`
    INSERT INTO tombamento_lotes (id, data, updated_at)
    VALUES (${lote.id}, ${payload}::jsonb, now())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`);
}

/** Apaga um lote de tombamento especifico por id. Retorna true se apagou algo. */
export async function deleteTombamentoLote(env: Env, id: string): Promise<boolean> {
  const rows = (await getDb(env).execute(sql`DELETE FROM tombamento_lotes WHERE id = ${id} RETURNING id`)) as unknown as { id: string }[];
  return rows.length > 0;
}

export async function seedTombamentoIfEmpty(env: Env, seed: { lote: LoteLike; linhas: LoteLike[] }[]): Promise<boolean> {
  const db = getDb(env);
  const c = (await db.execute(sql`SELECT count(*)::int AS n FROM tombamento_lotes`)) as unknown as { n: number }[];
  if ((c[0]?.n ?? 0) > 0 || seed.length === 0) return false;
  for (const s of seed) await upsertTombamentoLote(env, s.lote, s.linhas);
  return true;
}

// ============================================================
// Coleções jsonb genéricas (vitrine, comunicados, perfis/usuários da averbadora…)
// Uma tabela por coleção: id text PK + data jsonb. Nomes de tabela são fixos no
// código (não vêm de input), então sql.raw é seguro aqui.
// ============================================================
export async function ensureCollection(env: Env, table: string): Promise<void> {
  await getDb(env).execute(sql.raw(`CREATE TABLE IF NOT EXISTS ${table} (id text PRIMARY KEY, data jsonb NOT NULL, updated_at timestamptz DEFAULT now())`));
}
export async function loadCollection<T = Record<string, unknown>>(env: Env, table: string): Promise<T[]> {
  await ensureCollection(env, table);
  const rows = (await getDb(env).execute(sql.raw(`SELECT data FROM ${table} ORDER BY id`))) as unknown as { data: T }[];
  return rows.map((r) => r.data).filter((d): d is T => !!d);
}
export async function upsertCollectionRow(env: Env, table: string, id: string, data: unknown): Promise<void> {
  await ensureCollection(env, table);
  await getDb(env).execute(sql`
    INSERT INTO ${sql.raw(table)} (id, data, updated_at)
    VALUES (${id}, ${data as Record<string, unknown>}::jsonb, now())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`);
}
export async function seedCollectionIfEmpty(env: Env, table: string, rows: { id: string; data: unknown }[]): Promise<boolean> {
  await ensureCollection(env, table);
  const c = (await getDb(env).execute(sql.raw(`SELECT count(*)::int AS n FROM ${table}`))) as unknown as { n: number }[];
  if ((c[0]?.n ?? 0) > 0 || rows.length === 0) return false;
  for (const r of rows) await upsertCollectionRow(env, table, r.id, r.data);
  return true;
}
export async function deleteCollectionRow(env: Env, table: string, id: string): Promise<void> {
  await ensureCollection(env, table);
  await getDb(env).execute(sql`DELETE FROM ${sql.raw(table)} WHERE id = ${id}`);
}

/** Query direta na trilha de auditoria (admin_auditoria) com filtros server-side.
 *  Necessario porque listAudit in-memory tem teto de 2000 entries por isolate —
 *  quando o cliente filtra por janela historica (desde/ate antigos), o cache nao
 *  cobre e retornaria falso zero. Ordena por (data->>'ts') DESC pra recentes
 *  primeiro. Todos os filtros sao opcionais e combinaveis. */
export interface AuditDbFilter {
  categoria?: string;
  cpf?: string;
  matricula?: string;
  propostaId?: string;
  desde?: string;
  ate?: string;
}
/** Backfill de categorias de eventos ja gravados. Idempotente — so afeta rows
 *  onde acao=acaoAlvo E categoria=categoriaAntiga. Retorna quantos updates. */
export async function backfillAuditCategoria(env: Env, acaoAlvo: string, categoriaAntiga: string, categoriaNova: string): Promise<number> {
  await ensureCollection(env, "admin_auditoria");
  const rows = (await getDb(env).execute(sql`
    UPDATE admin_auditoria
       SET data = jsonb_set(data, '{categoria}', to_jsonb(${categoriaNova}::text))
     WHERE data->>'acao' = ${acaoAlvo}
       AND data->>'categoria' = ${categoriaAntiga}
    RETURNING id
  `)) as unknown as { id: string }[];
  return rows.length;
}

export async function queryAuditFromDb<T = Record<string, unknown>>(env: Env, filter: AuditDbFilter, limit = 500): Promise<T[]> {
  await ensureCollection(env, "admin_auditoria");
  // Monta WHERE incrementalmente. Todos os campos vivem em data->> — indice
  // GIN em data pode ser adicionado depois pra escalar; a volume atual (< 100k)
  // a query full scan+filter serve.
  const conds: SQL[] = [sql`TRUE`];
  if (filter.categoria) conds.push(sql`data->>'categoria' = ${filter.categoria}`);
  if (filter.cpf) conds.push(sql`data->>'cpf' = ${filter.cpf}`);
  if (filter.matricula) conds.push(sql`data->>'matricula' = ${filter.matricula}`);
  if (filter.propostaId) conds.push(sql`data->>'propostaId' = ${filter.propostaId}`);
  if (filter.desde) conds.push(sql`(data->>'ts') >= ${filter.desde}`);
  if (filter.ate) conds.push(sql`(data->>'ts') <= ${filter.ate}`);
  const where = sql.join(conds, sql` AND `);
  const rows = (await getDb(env).execute(sql`
    SELECT data FROM admin_auditoria
    WHERE ${where}
    ORDER BY (data->>'ts') DESC
    LIMIT ${limit}
  `)) as unknown as { data: T }[];
  return rows.map((r) => r.data).filter((d): d is T => !!d);
}

// ============================================================
// Contratos + reservas (portal do banco) — compartilhado entre isolates
// ============================================================
interface ContratoLike { adf: string; [k: string]: unknown }

// Persistência dos contratos/reservas do portal do banco num tabela jsonb DEDICADA
// (adf PK + data jsonb) — mesma pauta de portal_banco_tabelas. A tabela `contratos`
// do schema Drizzle é estruturada (sem coluna `data`), então gravar lá falhava em
// silêncio e a proposta ficava só em memória (o banco em outro isolate não via).
export async function loadContratos(env: Env): Promise<ContratoLike[]> {
  const rows = (await getDb(env).execute(sql`SELECT data FROM portal_banco_contratos ORDER BY updated_at`)) as unknown as { data: ContratoLike }[];
  return rows.map((r) => r.data).filter((d): d is ContratoLike => !!d && typeof d.adf === "string");
}

export async function upsertContrato(env: Env, c: ContratoLike): Promise<void> {
  await getDb(env).execute(sql`
    INSERT INTO portal_banco_contratos (adf, data, updated_at)
    VALUES (${c.adf}, ${c as unknown as Record<string, unknown>}::jsonb, now())
    ON CONFLICT (adf) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`);
}

/** Apaga servidores cujas matrículas estão na lista dada. Não cascateia — chame
 *  deleteContratosByMatriculas antes se houver dependências. Retorna quantas
 *  linhas foram removidas. Usado para expurgar contas de teste (Diego/Mariana). */
export async function deleteServidoresByMatriculas(env: Env, matriculas: string[]): Promise<number> {
  if (matriculas.length === 0) return 0;
  const lista = sql.join(matriculas.map((m) => sql`${m}`), sql`, `);
  const rows = (await getDb(env).execute(sql`
    DELETE FROM servidores WHERE matricula IN (${lista}) RETURNING matricula`)) as unknown as { matricula: string }[];
  return rows.length;
}

/** Apaga contratos/reservas cujas matrículas estão na lista dada. Usado para
 *  zerar os empréstimos de contas de teste. Retorna quantas linhas foram removidas. */
export async function deleteContratosByMatriculas(env: Env, matriculas: string[]): Promise<number> {
  if (matriculas.length === 0) return 0;
  // Placeholders individuais ($1,$2,...) — postgres-js expande um array JS como
  // record, o que quebra `= ANY($1)`. `sql.join` gera uma lista IN segura.
  const lista = sql.join(matriculas.map((m) => sql`${m}`), sql`, `);
  const rows = (await getDb(env).execute(sql`
    DELETE FROM portal_banco_contratos
    WHERE data->>'matricula' IN (${lista})
    RETURNING adf`)) as unknown as { adf: string }[];
  return rows.length;
}

/** Apaga contratos/reservas pelos seus ADFs. Retorna quantas linhas saíram. */
export async function deleteContratosByAdfs(env: Env, adfs: string[]): Promise<number> {
  if (adfs.length === 0) return 0;
  const lista = sql.join(adfs.map((a) => sql`${a}`), sql`, `);
  const rows = (await getDb(env).execute(sql`
    DELETE FROM portal_banco_contratos WHERE adf IN (${lista}) RETURNING adf`)) as unknown as { adf: string }[];
  return rows.length;
}

export async function seedContratosIfEmpty(env: Env, seed: ContratoLike[]): Promise<boolean> {
  const db = getDb(env);
  const c = (await db.execute(sql`SELECT count(*)::int AS n FROM portal_banco_contratos`)) as unknown as { n: number }[];
  if ((c[0]?.n ?? 0) > 0 || seed.length === 0) return false;
  for (const row of seed) await upsertContrato(env, row);
  return true;
}

// ============================================================
// App logs (compartilhado entre isolates)
// ============================================================
export interface AppLogRow { ts: string; level: string; source: string; perfil: string; message: string; trace_id: string }

/** Anexa uma linha ao log compartilhado. Best-effort — nunca lança pro chamador. */
export async function appendLog(env: Env, e: AppLogRow): Promise<void> {
  await getDb(env).execute(sql`
    INSERT INTO app_logs (ts, level, source, perfil, message, trace_id)
    VALUES (${e.ts}, ${e.level}, ${e.source}, ${e.perfil}, ${e.message}, ${e.trace_id})`);
}

/** Carrega os logs compartilhados mais recentes (ts desc). */
export async function loadLogs(env: Env, limit = 300): Promise<AppLogRow[]> {
  const rows = (await getDb(env).execute(sql`
    SELECT to_char(ts, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS ts, level, source, perfil, message, trace_id
    FROM app_logs ORDER BY ts DESC, id DESC LIMIT ${limit}`)) as unknown as AppLogRow[];
  return rows;
}

/** Poda o log compartilhado, mantendo as N linhas mais recentes. */
export async function pruneLogs(env: Env, keep = 2000): Promise<void> {
  await getDb(env).execute(sql`
    DELETE FROM app_logs WHERE id NOT IN (SELECT id FROM app_logs ORDER BY id DESC LIMIT ${keep})`);
}

/** Zera SO a base de servidores + tudo que depende deles (contratos, ADFs,
 *  propostas, eventos, consentimentos). NAO toca em bancos/prefeituras/convenios.
 *  Pedido do cliente 16/07/2026: recomecar essa parte do zero, base 100% vazia.
 *  RESTART IDENTITY volta sequences de proposta_eventos/contrato_eventos ao 1. */
export async function purgeServidores(env: Env): Promise<void> {
  const db = getDb(env);
  await ensureSchema(env);
  // Uma unica instrucao com CASCADE: PG resolve dependencias FK sozinho.
  await db.execute(sql`TRUNCATE servidores, contratos, portal_banco_contratos, propostas, proposta_eventos, contrato_eventos, consentimentos RESTART IDENTITY CASCADE`);
}

/** Purge cirurgico: SO contratos + propostas + ADFs + eventos. Preserva
 *  servidores, bancos, prefeituras, convenios, folhas. Usado quando cliente
 *  quer "testar do zero a parte de contratos" sem perder base de servidores
 *  cadastrados. Idempotente. */
export async function purgeContratosApenas(env: Env): Promise<void> {
  const db = getDb(env);
  await ensureSchema(env);
  // TOMBAMENTO_LOTES REMOVIDO do TRUNCATE (20/07/2026 tarde) — o cliente perdeu
  // o tombamento 3x em uma tarde por causa de sessoes paralelas rodando
  // purge-contratos. Tombamento eh declaracao INDEPENDENTE da prefeitura
  // (contratos externos de outros bancos), nao deve ser afetado por purge de
  // contratos internos Atlas. Se precisar zerar tombamento, use o endpoint
  // dedicado /v1/admin/tombamento/lotes/delete que exige senha + lista de ids.
  await db.execute(sql`TRUNCATE contratos, portal_banco_contratos, propostas, proposta_eventos, contrato_eventos RESTART IDENTITY CASCADE`);
}

/** Zera prefeituras + tudo que gira em torno delas: convenios (Drizzle + collection),
 *  folhas (Drizzle + collection), ofertas (collection), tabelas de emprestimo.
 *  Bancos ficam intocados (mas sem convenio pra operar).
 *  Pedido do cliente 16/07/2026: "prefeituras + convenios + folhas + ofertas + anuencias".
 *  Anuencias vivem so em memoria — sem persistencia pra apagar. */
export async function purgePrefeituras(env: Env): Promise<void> {
  const db = getDb(env);
  await ensureSchema(env);
  await db.execute(sql`TRUNCATE prefeituras, convenios, convenio_tabelas_emprestimo, folhas RESTART IDENTITY CASCADE`);
  // Collections genericas (tabelas jsonb chave-valor) — TRUNCATE separado.
  await db.execute(sql.raw(`TRUNCATE admin_convenios, admin_ofertas, admin_folhas`)).catch(() => {
    // Se alguma nao existir ainda (nunca foi seedada), ignora.
  });
}

/** Zera todos os comunicados (banco + servidor). Cliente pediu (16/07/2026). */
export async function purgeComunicados(env: Env): Promise<void> {
  const db = getDb(env);
  await ensureSchema(env);
  await db.execute(sql.raw(`TRUNCATE admin_comunicados`)).catch(() => { /* collection pode nao existir */ });
  // Tabela Drizzle `comunicados` (legacy) tambem — CASCADE limpa dependencias.
  await db.execute(sql`TRUNCATE comunicados RESTART IDENTITY CASCADE`).catch(() => { /* pode nao existir */ });
}

/** Zera usuarios do sistema: averbadora (admin_perfis collection), banco
 *  (users + banco_usuarios tables). Dev-users hardcoded em auth/index.ts
 *  (admin@atlas.test, banco@atlas.test) continuam funcionando pra nao trancar
 *  o login. Perfis da prefeitura vivem so em memoria, sem persistencia.
 *  Cliente pediu (16/07/2026): recomecar cadastro de usuarios do zero. */
export async function purgeUsuarios(env: Env): Promise<void> {
  const db = getDb(env);
  await ensureSchema(env);
  await db.execute(sql`TRUNCATE users, banco_usuarios RESTART IDENTITY CASCADE`);
  await db.execute(sql.raw(`TRUNCATE admin_perfis`)).catch(() => { /* collection pode nao existir */ });
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
