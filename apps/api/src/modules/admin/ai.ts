// Modulo IA — configuracao e uso da OpenAI para normalizacao de imports.
//
// A chave da API vive em KV_CACHE (namespace binding do wrangler.toml) sob a
// key `ai:openai:key`. Nunca e devolvida em plaintext — endpoints de listagem
// retornam so um flag + prefixo mascarado ("sk-***abc123"). Escrita e delete
// exigem role averbadora.
//
// O uso principal e /v1/admin/ai/normalize-csv: recebe um CSV possivelmente
// bagunçado (cabecalhos com nomes diferentes, ordem trocada, colunas extras)
// junto com o schema alvo, e devolve o CSV normalizado usando um modelo da
// OpenAI. Se a chave nao estiver configurada, retorna 400.

import type { Env } from "../../env.js";

const KV_KEY = "ai:openai:key";

function assertKv(env: Env): KVNamespace {
  const kv = env.KV_CACHE;
  if (!kv) throw new Error("KV_CACHE binding indisponivel — modulo IA precisa de KV");
  return kv;
}
// Modelo padrao — barato e rapido. Pode virar config futura.
const DEFAULT_MODEL = "gpt-4o-mini";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

export interface AiConfigStatus {
  hasKey: boolean;
  keyPrefix: string | null;
  keySuffix: string | null;
  updatedAt: string | null;
}

interface StoredConfig {
  key: string;
  updatedAt: string;
}

async function readStored(env: Env): Promise<StoredConfig | null> {
  try {
    const raw = await assertKv(env).get(KV_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredConfig;
  } catch {
    return null;
  }
}

function toStatus(cfg: StoredConfig | null): AiConfigStatus {
  if (!cfg) return { hasKey: false, keyPrefix: null, keySuffix: null, updatedAt: null };
  const k = cfg.key;
  return {
    hasKey: true,
    keyPrefix: k.slice(0, 3),
    keySuffix: k.slice(-4),
    updatedAt: cfg.updatedAt,
  };
}

export async function getAiStatus(env: Env): Promise<AiConfigStatus> {
  return toStatus(await readStored(env));
}

export async function setAiKey(env: Env, key: string): Promise<AiConfigStatus> {
  const trimmed = key.trim();
  if (!trimmed) throw new Error("chave vazia");
  if (!/^sk-/.test(trimmed)) throw new Error("formato invalido: chave OpenAI comeca com 'sk-'");
  const cfg: StoredConfig = { key: trimmed, updatedAt: new Date().toISOString() };
  await assertKv(env).put(KV_KEY, JSON.stringify(cfg));
  return toStatus(cfg);
}

export async function clearAiKey(env: Env): Promise<void> {
  await assertKv(env).delete(KV_KEY);
}

/** Simples ping: usa a chave para GET /v1/models. Retorna status ok/erro. */
export async function testAiKey(env: Env): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
  const cfg = await readStored(env);
  if (!cfg) return { ok: false, message: "chave nao configurada" };
  const started = Date.now();
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${cfg.key}` },
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, message: `HTTP ${res.status}: ${text.slice(0, 200)}`, latencyMs };
    }
    return { ok: true, message: "chave valida e ativa", latencyMs };
  } catch (err) {
    return { ok: false, message: `falha de rede: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ============================================================
// Normalizacao de CSV via chat completion
// ============================================================

export interface NormalizeCsvRequest {
  /** CSV bruto (com cabecalho na linha 1). */
  csv: string;
  /** Schema alvo — nomes de colunas na ordem esperada. */
  expectedHeaders: string[];
  /** Hint sobre o dominio ('servidores publicos', 'contratos', etc). */
  contextHint?: string;
  /** Modelo (default gpt-4o-mini). */
  model?: string;
}

export interface NormalizeCsvResponse {
  /** CSV ja normalizado com o cabecalho correto. */
  csv: string;
  /** Mapeamento inferido (original -> alvo). */
  mapping: Record<string, string>;
  /** Explicacao curta do que a IA fez. */
  summary: string;
  /** Tokens consumidos. */
  usage: { input: number; output: number };
}

export async function normalizeCsvWithAi(env: Env, req: NormalizeCsvRequest): Promise<NormalizeCsvResponse> {
  const cfg = await readStored(env);
  if (!cfg) throw new Error("chave OpenAI nao configurada — abra /averbadora/ia");

  const model = req.model ?? DEFAULT_MODEL;
  const context = req.contextHint ?? "servidores publicos municipais";
  const preview = req.csv.split(/\r?\n/).slice(0, 30).join("\n");

  const system = [
    "Voce e um agente que normaliza CSVs para importacao no sistema Atlas Averbadora.",
    "A saida DEVE ser exclusivamente um JSON valido com o formato:",
    `{"csv":"<CSV normalizado com cabecalho + linhas>","mapping":{"<colOriginal>":"<colAlvo>"},"summary":"<resumo curto do que foi feito>"}`,
    "Regras:",
    "- Primeira linha do CSV DEVE ser exatamente os cabecalhos alvo na ordem informada.",
    "- Preserve TODAS as linhas de dados; se uma coluna alvo nao existir no original, deixe vazio.",
    "- Colunas extras do original que nao mapeiem pra nenhuma alvo devem ser descartadas.",
    "- Datas: mantenha o formato original se ja for reconhecivel (DD/MM/YYYY ou YYYY-MM-DD). Nao invente.",
    "- CPF/matricula: preserve digitos como estao. Nao complete zeros a esquerda que nao existiam.",
    "- Nao invente dados. Se uma coluna alvo obrigatoria ficaria vazia em todas as linhas, ainda assim inclua o cabecalho.",
    "- Se o CSV original ja estiver correto, apenas devolva ele.",
  ].join("\n");

  const user = [
    `Contexto: ${context}`,
    `Cabecalhos alvo (na ordem exata): ${req.expectedHeaders.join(", ")}`,
    "CSV original (ate 30 linhas):",
    "```",
    preview,
    "```",
  ].join("\n");

  const res = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${cfg.key}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      temperature: 0,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
    usage?: { prompt_tokens: number; completion_tokens: number };
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  let parsed: { csv?: string; mapping?: Record<string, string>; summary?: string };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("resposta da IA nao e JSON valido");
  }
  if (!parsed.csv || typeof parsed.csv !== "string") {
    throw new Error("resposta da IA nao inclui campo 'csv'");
  }
  return {
    csv: parsed.csv,
    mapping: parsed.mapping ?? {},
    summary: parsed.summary ?? "",
    usage: {
      input: data.usage?.prompt_tokens ?? 0,
      output: data.usage?.completion_tokens ?? 0,
    },
  };
}
