// Unique operation ID — prefix per prefeitura + sequential counter (with optional hash component).
// Used in ADF, bate-carteira, audit log to uniquely identify every margin movement / contract operation.
//
// Persistencia: espelhado no PG (collection `admin_id_unico_configs`) pra sobreviver
// a redeploys e sincronizar entre isolates. Averbadora e prefeitura leem e escrevem
// no mesmo storage — sem divergencia entre as duas visoes.

import { loadCollection, upsertCollectionRow } from "../../db/repos.js";
import type { Env } from "../../env.js";

const PG_TABLE = "admin_id_unico_configs";

export type IdUnicoFormat = "SEQ" | "SEQ_HASH" | "YYYYMM_SEQ";

export interface IdUnicoConfig {
  /** prefeituraId — config per prefeitura */
  prefeituraId: number;
  /** Short prefix shown in the panel (e.g. "PLH", "GRU"). Uppercase letters/digits only. */
  prefixo: string;
  /** Numeric format used to generate the next ID. */
  formato: IdUnicoFormat;
  /** Total digit width of the sequential block (zero-padded). */
  larguraSeq: number;
  /** Current counter value (incremented after each issue). */
  proximoSeq: number;
  /** Optional separator between prefix and sequence (e.g. "-"). */
  separador: string;
  /** Timestamp of last update (ISO). */
  atualizadoEm: string;
}

// Cliente pediu remocao dos 3 configs fixture (PLH/FLN/JNV para prefeituraId
// 1/2/3) em 16/07/2026 pra teste real do zero — as prefeituras seed ja foram
// removidas, entao essas configs eram orfas. Configs novas entram via
// /averbadora/id-unico > editar (POST /admin/id-unico).
const _configs: IdUnicoConfig[] = [];

export function listIdUnicoConfigs(): IdUnicoConfig[] {
  return _configs.slice();
}

export function getIdUnicoConfig(prefeituraId: number): IdUnicoConfig | undefined {
  return _configs.find((c) => c.prefeituraId === prefeituraId);
}

export function upsertIdUnicoConfig(input: Omit<IdUnicoConfig, "atualizadoEm">): IdUnicoConfig {
  const idx = _configs.findIndex((c) => c.prefeituraId === input.prefeituraId);
  const next: IdUnicoConfig = { ...input, atualizadoEm: new Date().toISOString() };
  if (idx >= 0) _configs[idx] = next;
  else _configs.push(next);
  return next;
}

/** Recarrega TODAS as configs do PG pra o array in-memory. Chamado por refresh
 *  antes das leituras — evita divergencia entre isolates. Best-effort: se PG
 *  falhar, mantem o cache que tinha. */
export async function refreshIdUnicoConfigs(env: Env): Promise<void> {
  try {
    const rows = await loadCollection<IdUnicoConfig>(env, PG_TABLE);
    _configs.length = 0;
    _configs.push(...rows);
  } catch { /* fail-safe */ }
}

/** Persiste uma config no PG (write-through). Chamado apos upsertIdUnicoConfig
 *  em endpoints que precisam sincronizar entre isolates (averbadora e prefeitura). */
export async function persistIdUnicoConfig(env: Env, cfg: IdUnicoConfig): Promise<void> {
  try {
    await upsertCollectionRow(env, PG_TABLE, String(cfg.prefeituraId), cfg);
  } catch { /* fail-safe: mantem in-memory */ }
}

// Set de prefeituraIds cujas configs foram mutadas por issueIdUnico e ainda
// nao foram persistidas em PG. issueIdUnico e sync (chamado profundo em
// ensureAdfs), entao nao pode fazer await; marca dirty aqui e o caller do
// batch persiste depois via persistDirtyIdUnicoConfigs(env).
const _dirtyConfigs = new Set<number>();

/** Persiste todas as configs modificadas desde a ultima chamada. Chamar apos
 *  qualquer batch que use issueIdUnico — sem isso, proximoSeq fica so em
 *  memoria e proximo isolate materializa ADF com ID que ja foi usado. */
export async function persistDirtyIdUnicoConfigs(env: Env): Promise<void> {
  if (_dirtyConfigs.size === 0) return;
  const ids = Array.from(_dirtyConfigs);
  _dirtyConfigs.clear();
  await Promise.all(ids.map((pid) => {
    const cfg = getIdUnicoConfig(pid);
    return cfg ? persistIdUnicoConfig(env, cfg) : Promise.resolve();
  }));
}

/**
 * Deriva um prefixo padrao a partir do nome da prefeitura + UF. Ex: "MUNICIPIO
 * DE CAPISTRANO" / CE -> "CAP". Se sobrar <3 chars, completa com a UF. So
 * letras/digitos maiusculos — o Regex do POST /admin/id-unico/configs exige.
 */
export function derivePrefixoFromPrefeitura(nome: string, uf?: string): string {
  const cleaned = (nome || "")
    .toUpperCase()
    .replace(/^(MUNICIPIO|MUNICÍPIO|PREFEITURA)\s+(DE|DO|DA|DOS|DAS)?\s+/u, "")
    .replace(/[^A-Z0-9\s]/g, "")
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  let prefixo = "";
  if (words.length === 1) prefixo = words[0]!.slice(0, 3);
  else prefixo = words.map((w) => w[0]!).join("").slice(0, 3);
  if (prefixo.length < 3 && uf) prefixo = (prefixo + uf.toUpperCase()).slice(0, 3);
  if (prefixo.length < 2) prefixo = (prefixo + "AAA").slice(0, 3);
  return prefixo;
}

/**
 * Retorna a config da prefeitura, criando uma default caso ainda nao exista.
 * Chamado pelo GET /admin/id-unico/configs e sempre que uma prefeitura eh
 * cadastrada — evita "Nenhum item encontrado" logo apos o cadastro.
 */
export function ensureIdUnicoConfig(prefeituraId: number, nome: string, uf?: string): IdUnicoConfig {
  const existing = getIdUnicoConfig(prefeituraId);
  if (existing) return existing;
  return upsertIdUnicoConfig({
    prefeituraId,
    prefixo: derivePrefixoFromPrefeitura(nome, uf),
    formato: "SEQ",
    larguraSeq: 6,
    proximoSeq: 1,
    separador: "-",
  });
}

function shortHash(seed: string): string {
  // FNV-1a 32-bit — deterministic 6-hex-char hash, enough as a public collision-free check digit.
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0").slice(0, 6).toUpperCase();
}

/**
 * Render an ID-Único for a given prefeitura using its config, without committing the counter.
 * Use `issueIdUnico` to actually increment.
 */
export function previewIdUnico(prefeituraId: number, now: Date = new Date()): string {
  const c = getIdUnicoConfig(prefeituraId);
  if (!c) return "—";
  return renderId(c, c.proximoSeq, now);
}

/**
 * Increment the counter and return the freshly-issued ID. Idempotent only via external locks;
 * caller must persist the resulting ID against the operation it refers to.
 */
export function issueIdUnico(prefeituraId: number, now: Date = new Date()): string {
  // Se a prefeitura foi cadastrada antes do commit que cria config default
  // automatica (50db4e9, 17/07/2026), o config nao existe e emitir ID quebrava
  // com "id_unico_config_missing". Cria default on-demand aqui pra nao travar
  // a materializacao de ADF. Admin pode editar prefixo depois em /averbadora/id-unico.
  let c = getIdUnicoConfig(prefeituraId);
  if (!c) {
    c = upsertIdUnicoConfig({
      prefeituraId, prefixo: "ADF", formato: "SEQ",
      larguraSeq: 6, proximoSeq: 1, separador: "-",
    });
  }
  const id = renderId(c, c.proximoSeq, now);
  c.proximoSeq += 1;
  c.atualizadoEm = now.toISOString();
  // Marca dirty pro caller do batch persistir em PG (persistDirtyIdUnicoConfigs).
  // Antes, proximoSeq so incrementava em memoria — o proximo isolate lia do PG
  // o valor stale e emitia ID ja usado (colisao). Cliente reportou 22/07/2026:
  // ADFs CAP-000001 e CAP-000002 em uso mas preview mostrava proximo=CAP-000001.
  _dirtyConfigs.add(prefeituraId);
  return id;
}

function renderId(c: IdUnicoConfig, seq: number, now: Date): string {
  const seqStr = String(seq).padStart(c.larguraSeq, "0");
  const yyyymm = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  switch (c.formato) {
    case "SEQ":
      return `${c.prefixo}${c.separador}${seqStr}`;
    case "YYYYMM_SEQ":
      return `${c.prefixo}${c.separador}${yyyymm}${c.separador}${seqStr}`;
    case "SEQ_HASH":
      return `${c.prefixo}${c.separador}${seqStr}${c.separador}${shortHash(`${c.prefixo}${seq}`)}`;
  }
}
