// API Tokens — KV-backed store (funciona cross-isolate no Cloudflare Workers).
// Tokens são emitidos como atl_<env>_<48-hex>. Apenas o SHA-256 hash é persistido.
//
// Cada token pertence a UMA audience (camada), que decide qual namespace
// /v1/external/<audience>/* ele pode chamar. Escopos são namespaced por audience.
//
// Chaves KV:
//   apitok:i:<id>    → JSON(ApiToken)   (fonte de verdade; usado em list/delete)
//   apitok:h:<hash>  → <id>             (índice para resolveByPlaintext)
//   apitok:seeded    → "1"              (flag de seed idempotente)

export type ApiEnvironment = "production" | "sandbox";
export type ApiAudience = "banco" | "servidor" | "averbadora";

export type ApiScope =
  | "banco:read" | "banco:write" | "banco:webhooks"
  | "servidor:read" | "servidor:write"
  | "averbadora:read" | "averbadora:write" | "averbadora:webhooks";

export const SCOPES_BY_AUDIENCE: Record<ApiAudience, ApiScope[]> = {
  banco: ["banco:read", "banco:write", "banco:webhooks"],
  servidor: ["servidor:read", "servidor:write"],
  averbadora: ["averbadora:read", "averbadora:write", "averbadora:webhooks"],
};

export interface ApiToken {
  id: string;
  name: string;
  prefix: string;
  hash: string;
  environment: ApiEnvironment;
  audience: ApiAudience;
  partnerId: number;
  scopes: ApiScope[];
  createdAt: string;
  createdBy: string;
  lastUsedAt?: string;
  revokedAt?: string;
}

const K_ID = (id: string) => `apitok:i:${id}`;
const K_HASH = (hash: string) => `apitok:h:${hash}`;
const K_SEEDED = "apitok:seeded";

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface CreateApiTokenInput {
  name: string;
  environment: ApiEnvironment;
  audience: ApiAudience;
  partnerId: number;
  scopes: ApiScope[];
  createdBy: string;
}

async function nextId(kv: KVNamespace): Promise<string> {
  // Sequência simples baseada em contagem de chaves; suficiente para o volume atual.
  const list = await kv.list({ prefix: "apitok:i:" });
  return `tok_${(list.keys.length + 1).toString().padStart(6, "0")}_${randomHex(2)}`;
}

/** Generates a new token; returns the plaintext ONCE plus the stored metadata. */
export async function createToken(kv: KVNamespace, input: CreateApiTokenInput): Promise<{ token: ApiToken; plaintext: string }> {
  const envPart = input.environment === "production" ? "live" : "test";
  const allowed = new Set(SCOPES_BY_AUDIENCE[input.audience]);
  const scopes = input.scopes.filter((s) => allowed.has(s));
  const plaintext = `atl_${envPart}_${randomHex(24)}`;
  const hash = await sha256Hex(plaintext);
  const token: ApiToken = {
    id: await nextId(kv),
    name: input.name,
    prefix: plaintext.slice(0, 16) + "…",
    hash,
    environment: input.environment,
    audience: input.audience,
    partnerId: input.partnerId,
    scopes: scopes.length > 0 ? scopes : [SCOPES_BY_AUDIENCE[input.audience][0]!],
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
  };
  await kv.put(K_ID(token.id), JSON.stringify(token));
  await kv.put(K_HASH(hash), token.id);
  return { token, plaintext };
}

export async function listTokens(kv: KVNamespace, filter?: { environment?: ApiEnvironment; audience?: ApiAudience }): Promise<ApiToken[]> {
  await ensureSeeded(kv);
  const list = await kv.list({ prefix: "apitok:i:" });
  const tokens = await Promise.all(list.keys.map((k) => kv.get<ApiToken>(k.name, "json")));
  let all = tokens.filter((t): t is ApiToken => !!t).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (filter?.environment) all = all.filter((t) => t.environment === filter.environment);
  if (filter?.audience) all = all.filter((t) => t.audience === filter.audience);
  return all;
}

/** Hard delete: remove id key + hash index. Irreversível. */
export async function deleteToken(kv: KVNamespace, id: string): Promise<boolean> {
  const t = await kv.get<ApiToken>(K_ID(id), "json");
  if (!t) return false;
  await kv.delete(K_HASH(t.hash));
  await kv.delete(K_ID(id));
  return true;
}

/** Lookup by plaintext bearer header value. */
export async function resolveByPlaintext(kv: KVNamespace, plaintext: string): Promise<ApiToken | null> {
  if (!plaintext.startsWith("atl_")) return null;
  await ensureSeeded(kv);
  const hash = await sha256Hex(plaintext);
  const id = await kv.get(K_HASH(hash));
  if (!id) return null;
  const t = await kv.get<ApiToken>(K_ID(id), "json");
  if (!t || t.revokedAt) return null;
  return t;
}

// Seed idempotente: cria um token por camada na primeira chamada. Os plaintexts
// dos seeds NÃO são recuperáveis (somente para popular a lista de exemplo).
let _seedingPromise: Promise<void> | null = null;
async function ensureSeeded(kv: KVNamespace): Promise<void> {
  if (_seedingPromise) return _seedingPromise;
  _seedingPromise = (async () => {
    const flag = await kv.get(K_SEEDED);
    if (flag) return;
    await kv.put(K_SEEDED, "1");
    await createToken(kv, { name: "Banco SCred — produção", environment: "production", audience: "banco", partnerId: 1, scopes: ["banco:read", "banco:write", "banco:webhooks"], createdBy: "seed" });
    await createToken(kv, { name: "Banco SCred — sandbox", environment: "sandbox", audience: "banco", partnerId: 1, scopes: ["banco:read", "banco:write", "banco:webhooks"], createdBy: "seed" });
    await createToken(kv, { name: "App Servidor — sandbox", environment: "sandbox", audience: "servidor", partnerId: 1, scopes: ["servidor:read", "servidor:write"], createdBy: "seed" });
    await createToken(kv, { name: "Integração Averbadora — sandbox", environment: "sandbox", audience: "averbadora", partnerId: 0, scopes: ["averbadora:read", "averbadora:write", "averbadora:webhooks"], createdBy: "seed" });
  })().catch(() => undefined);
  return _seedingPromise;
}
