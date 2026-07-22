// Trilha de auditoria dedicada — append-only, nunca mutada.
// Categorias: pre-reservas, aceites de termo, biometria, alteracoes de dados
// pessoais, movimentacoes de margem, tombamento, id_unico, convenio_config, acesso.
//
// Historico:
// - 22/07/2026 (v1): array in-memory zero-persistencia; cold start apagava tudo.
// - 22/07/2026 (v2): hidrata do PG em cold start via ensureAuditLoaded, appendAudit
//   sincrono usando holders globais _env/_waitUntil setados por middleware.
// - 22/07/2026 (v3, este arquivo): corrige 4 defeitos da v2:
//   #1 listAudit so olhava RAM (teto 2000). Agora tem queryAuditFromDb com
//      fallback pro PG quando filtro tem desde/ate ou o cache nao cobre.
//   #2 Cold-start race: 2 requests concorrentes zeravam entries recem-inseridos
//      entre o load de um e o load de outro. Cache da Promise em _loadingPromise
//      previne double-init.
//   #3 Holders globais _env/_waitUntil sobrescritos entre requests concorrentes
//      no mesmo isolate. Agora appendAudit recebe ctx explicito (env + waitUntil)
//      via novo helper auditFromContext(c, entry). Sem ctx, cai em cache-only.
//   #4 _loaded=true mesmo se PG falhou. Agora so seta true no path feliz.

import type { Env } from "../../env.js";
import { loadCollection, upsertCollectionRow, queryAuditFromDb, type AuditDbFilter } from "../../db/repos.js";
import type { Context } from "hono";

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
  cpf?: string;
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

const _entries: AuditEntry[] = [];
let _loaded = false;
// Cache da Promise de hidratacao — sem isso, requests concorrentes num isolate
// frio disparam loadCollection em paralelo e o segundo faz _entries.length=0
// APOS o primeiro ter inserido appendAudit novos, apagando-os do cache.
let _loadingPromise: Promise<void> | null = null;

/** Contador monotonico por-isolate — tiebreaker quando dois appendAudit no mesmo
 *  ms compartilham `ts`. Sem isso, ordem no PG (ORDER BY id) sai caotica porque
 *  o sufixo random do id nao correlaciona com o timestamp real. */
let _seq = 0;

/** Hidrata cache do PG. Idempotente e safe pra chamadas concorrentes. */
export async function ensureAuditLoaded(env: Env): Promise<void> {
  if (_loaded) return;
  if (_loadingPromise) return _loadingPromise;
  _loadingPromise = (async () => {
    try {
      const rows = await loadCollection<AuditEntry>(env, TABLE);
      rows.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
      _entries.length = 0;
      _entries.push(...rows.slice(0, MAX_CACHE));
      _loaded = true; // so marca loaded se PG respondeu — blip do PG tenta de novo
    } catch {
      // Deixa _loaded=false pra proximo request tentar hidratar novamente.
      // Nao propaga o erro — appendAudit continua funcionando (cache local).
    } finally {
      _loadingPromise = null;
    }
  })();
  return _loadingPromise;
}

function uid(): string {
  const t = Date.now().toString(36);
  const seq = (_seq++).toString(36).padStart(4, "0");
  const r = Math.floor(Math.random() * 36 ** 6).toString(36).padStart(6, "0");
  // Formato: AUD-<ts36>-<seq4>-<rand6> — ordenavel por prefixo, com tiebreaker.
  return `AUD-${t.toUpperCase()}-${seq.toUpperCase()}-${r.toUpperCase()}`;
}

function trace(): string {
  return Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

/** Contexto de persistencia — env + waitUntil pra flush em background. Passado
 *  explicitamente a cada appendAudit (nao mais holders globais no modulo). */
export interface AuditPersistCtx {
  env: Env;
  waitUntil?: (p: Promise<unknown>) => void;
}

/** Extrai o ctx de audit de um Hono Context. Uso conveniente em handlers:
 *    appendAudit(auditCtx(c), { ... }); */
export function auditCtx(c: { env: Env; executionCtx?: { waitUntil?: (p: Promise<unknown>) => void } }): AuditPersistCtx {
  return {
    env: c.env,
    waitUntil: c.executionCtx?.waitUntil ? c.executionCtx.waitUntil.bind(c.executionCtx) : undefined,
  };
}

export function appendAudit(
  ctx: AuditPersistCtx | null,
  input: Omit<AuditEntry, "id" | "ts" | "trace_id"> & { ts?: string; trace_id?: string },
): AuditEntry {
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
  if (ctx) {
    const p = upsertCollectionRow(ctx.env, TABLE, entry.id, entry).catch(() => undefined);
    if (ctx.waitUntil) ctx.waitUntil(p);
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

/** Lista do CACHE somente — bounded MAX_CACHE=2000 mais recentes. Nao cobre
 *  janela historica. Use listAuditAsync pra queries que precisem de escala. */
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

/** Query completa: cache pra tempo real + PG pra qualquer janela historica.
 *  Quando qualquer filtro esta setado (desde/ate/categoria/cpf/matricula/proposta),
 *  vai direto ao PG (que tem TODOS os eventos). Sem filtro, retorna cache.
 *  Merge com deduplicacao pra cobrir corrida entre insert e query. */
export async function listAuditAsync(env: Env, filter: AuditFilter = {}, limit = 300): Promise<AuditEntry[]> {
  const anyFilter = !!(filter.categoria || filter.cpf || filter.matricula || filter.propostaId || filter.desde || filter.ate);
  if (!anyFilter) {
    return listAudit(filter, limit);
  }
  const dbFilter: AuditDbFilter = {
    categoria: filter.categoria,
    cpf: filter.cpf,
    matricula: filter.matricula,
    propostaId: filter.propostaId,
    desde: filter.desde,
    ate: filter.ate,
  };
  // Busca no PG (ordenado desc por ts) + merge com cache local (que pode ter
  // entries ainda nao flushados pelo waitUntil). Dedup por id.
  const [dbRows, cached] = await Promise.all([
    queryAuditFromDb<AuditEntry>(env, dbFilter, limit).catch(() => [] as AuditEntry[]),
    Promise.resolve(listAudit(filter, limit)),
  ]);
  const seen = new Set<string>();
  const out: AuditEntry[] = [];
  for (const e of [...cached, ...dbRows]) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(e);
  }
  out.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : (a.id < b.id ? 1 : -1)));
  return out.slice(0, limit);
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
