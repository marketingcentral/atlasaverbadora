import type { Context, MiddlewareHandler } from "hono";
import { resolveByPlaintext, type ApiAudience, type ApiScope, type ApiToken } from "../modules/admin/api-tokens.js";
import { Errors } from "../_shared/errors.js";

declare module "hono" {
  interface ContextVariableMap {
    apiToken: ApiToken;
  }
}

/**
 * Authenticates an external API token (Bearer atl_*).
 * @param requiredScopes scopes that must ALL be present.
 * @param audience if set, the token must belong to this camada/layer.
 */
export function apiTokenAuth(requiredScopes: ApiScope[] = [], audience?: ApiAudience): MiddlewareHandler {
  return async (c: Context, next) => {
    const header = c.req.header("authorization") ?? "";
    const m = /^Bearer\s+(atl_[a-z0-9_]+)$/i.exec(header);
    if (!m) throw Errors.unauthorized("API token ausente. Use header Authorization: Bearer atl_…");
    const plaintext = m[1] as string;
    const kv = c.env.KV_CACHE as KVNamespace | undefined;
    if (!kv) throw Errors.unauthorized("Store de tokens indisponível (KV não configurado)");
    const token = await resolveByPlaintext(kv, plaintext);
    if (!token) throw Errors.unauthorized("API token invalido ou revogado");
    if (audience && token.audience !== audience) {
      throw Errors.forbidden(`Este token é da camada "${token.audience}" e não pode acessar a API de "${audience}".`);
    }
    if (requiredScopes.length) {
      const missing = requiredScopes.filter((s) => !token.scopes.includes(s));
      if (missing.length) throw Errors.forbidden(`Escopo insuficiente: faltam ${missing.join(", ")}`);
    }
    c.set("apiToken", token);
    await next();
  };
}
