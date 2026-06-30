// Unique operation ID — prefix per prefeitura + sequential counter (with optional hash component).
// Used in ADF, bate-carteira, audit log to uniquely identify every margin movement / contract operation.

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

const _configs: IdUnicoConfig[] = [
  { prefeituraId: 1, prefixo: "PLH", formato: "SEQ", larguraSeq: 6, proximoSeq: 1, separador: "-", atualizadoEm: new Date("2026-06-01T00:00:00Z").toISOString() },
  { prefeituraId: 2, prefixo: "FLN", formato: "YYYYMM_SEQ", larguraSeq: 5, proximoSeq: 1, separador: "-", atualizadoEm: new Date("2026-06-01T00:00:00Z").toISOString() },
  { prefeituraId: 3, prefixo: "JNV", formato: "SEQ_HASH", larguraSeq: 5, proximoSeq: 1, separador: "-", atualizadoEm: new Date("2026-06-01T00:00:00Z").toISOString() },
];

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
  const c = getIdUnicoConfig(prefeituraId);
  if (!c) throw new Error(`id_unico_config_missing:${prefeituraId}`);
  const id = renderId(c, c.proximoSeq, now);
  c.proximoSeq += 1;
  c.atualizadoEm = now.toISOString();
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
