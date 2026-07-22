// Trilha de auditoria dedicada — append-only, nunca mutada.
// Captura: pre-reservas, aceites de termo, biometria, alteracoes de dados
// pessoais, movimentacoes de margem, tombamento, acessos.
//
// Persistencia (22/07/2026): antes era _entries: [] em memoria do isolate —
// qualquer cold start / redeploy zerava a trilha (cliente reclamou dia 22
// "so aparece 1 registro"). Agora hidrata do Postgres (admin_auditoria) no
// primeiro request e cada appendAudit persiste via ctx.waitUntil (fail-safe:
// se PG cair, cache in-memory continua funcionando pra sessao vigente).

import type { Env } from "../../env.js";
import { loadCollection, upsertCollectionRow } from "../../db/repos.js";

export type AuditCategoria =
  | "pre_reserva"
  | "termo_aceite"
  | "biometria"
  | "dados_pessoais"
  | "margem"
  | "tombamento"
  | "id_unico"
  | "convenio_config"
  | "acesso";

export interface AuditEntry {
  id: string;
  ts: string;
  trace_id: string;
  categoria: AuditCategoria;
  acao: string;
  cpf?: string; // masked
  matricula?: string;
  propostaId?: string;
  idUnico?: string;
  ip?: string;
  userAgent?: string;
  deviceId?: string;
  termoAceito?: string;
  userId?: string;
  userRole?: string;
  detalhes: string;
}

const TABLE = "admin_auditoria";
const MAX_CACHE = 2000;

// Cache em memoria (append-only, mais recentes primeiro). Hidratado do PG
// no primeiro request. appendAudit atualiza sincronamente + fila de persist.
const _entries: AuditEntry[] = [];
let _loaded = false;

// Holders setados pelo middleware — appendAudit e sincrono e nao recebe env,
// entao usa esses holders pra fazer waitUntil(persist) sem quebrar 25 callers.
let _env: Env | null = null;
let _waitUntil: ((p: Promise<unknown>) => void) | null = null;

/** Chamado por middleware a cada request pra propagar env + waitUntil. */
export function setAuditContext(env: Env, waitUntil: ((p: Promise<unknown>) => void) | null): void {
  _env = env;
  _waitUntil = waitUntil;
}

/** Hidrata o cache do PG (idempotente). Chamado pelo middleware antes das rotas. */
export async function ensureAuditLoaded(env: Env): Promise<void> {
  if (_loaded) return;
  const rows = await loadCollection<AuditEntry>(env, TABLE).catch(() => [] as AuditEntry[]);
  // loadCollection retorna ORDER BY id — aqui queremos por ts desc (recentes topo).
  rows.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
  _entries.length = 0;
  _entries.push(...rows.slice(0, MAX_CACHE));
  _loaded = true;
}

function uid(): string {
  const t = Date.now().toString(36);
  const r = Math.floor(Math.random() * 36 ** 6).toString(36).padStart(6, "0");
  return `AUD-${t.toUpperCase()}-${r.toUpperCase()}`;
}

function trace(): string {
  return Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

export function appendAudit(input: Omit<AuditEntry, "id" | "ts" | "trace_id"> & { ts?: string; trace_id?: string }): AuditEntry {
  const entry: AuditEntry = {
    id: uid(),
    ts: input.ts ?? new Date().toISOString(),
    trace_id: input.trace_id ?? trace(),
    categoria: input.categoria,
    acao: input.acao,
    cpf: input.cpf,
    matricula: input.matricula,
    propostaId: input.propostaId,
    idUnico: input.idUnico,
    ip: input.ip,
    userAgent: input.userAgent,
    deviceId: input.deviceId,
    termoAceito: input.termoAceito,
    userId: input.userId,
    userRole: input.userRole,
    detalhes: input.detalhes,
  };
  _entries.unshift(entry);
  if (_entries.length > MAX_CACHE) _entries.length = MAX_CACHE;
  // Persiste no PG via waitUntil (fail-safe — nunca quebra o request). Sem
  // env/ctx no isolate atual (ex.: chamado fora de handler), so fica no cache.
  const env = _env;
  const wu = _waitUntil;
  if (env) {
    const p = upsertCollectionRow(env, TABLE, entry.id, entry).catch(() => undefined);
    if (wu) wu(p); // deixa a Worker sobreviver ate o flush terminar
  }
  return entry;
}

export interface AuditFilter {
  categoria?: AuditCategoria;
  cpf?: string;
  matricula?: string;
  propostaId?: string;
  desde?: string;
  ate?: string;
}

export function listAudit(filter: AuditFilter = {}, limit = 200): AuditEntry[] {
  return _entries
    .filter((e) => !filter.categoria || e.categoria === filter.categoria)
    .filter((e) => !filter.cpf || e.cpf === filter.cpf)
    .filter((e) => !filter.matricula || e.matricula === filter.matricula)
    .filter((e) => !filter.propostaId || e.propostaId === filter.propostaId)
    .filter((e) => !filter.desde || e.ts >= filter.desde)
    .filter((e) => !filter.ate || e.ts <= filter.ate)
    .slice(0, limit);
}

export function auditCategorias(): { value: AuditCategoria; label: string }[] {
  return [
    { value: "pre_reserva", label: "Pre-reservas" },
    { value: "termo_aceite", label: "Aceite de termos" },
    { value: "biometria", label: "Biometria" },
    { value: "dados_pessoais", label: "Dados pessoais" },
    { value: "margem", label: "Movimentacao de margem" },
    { value: "tombamento", label: "Tombamento de contratos" },
    { value: "id_unico", label: "ID unico" },
    { value: "convenio_config", label: "Config de convenio" },
    { value: "acesso", label: "Acesso ao painel" },
  ];
}
