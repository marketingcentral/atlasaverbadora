import type { MiddlewareHandler } from "hono";
import { jwtVerify, importSPKI } from "jose";
import { Errors } from "../_shared/errors.js";
import type { Env } from "../env.js";

export interface JwtClaims {
  sub: string;        // user id
  role: "servidor" | "banco" | "averbadora" | "prefeitura";
  servidor_id?: number;
  banco_id?: number;
  prefeitura_id?: number;
  /** Rotulo do preset (opcional, apenas display). */
  averbadora_perfil?: "operador" | "supervisor" | "comercial" | "financeiro" | "auditoria" | "personalizado";
  /** Fonte de verdade da autorizacao granular por recurso. Ex.: ["bancos","adf","dashboard"].
   *  "*" = wildcard (supervisor). Se ausente (dev-user ou JWT antigo), cai como supervisor. */
  averbadora_permissoes?: string[];
  device_id?: string;
  /** Presente quando um admin da averbadora esta impersonando este perfil.
   *  Usado pra enriquecer o "ator" na auditoria de mutacoes: alem de logar
   *  "servidor:X" mostra "via averbadora:Y". Emitido por
   *  POST /v1/admin/impersonate/servidor/:matricula. */
  impersonated_by?: { sub: string; role: "averbadora"; nome?: string };
  iat: number;
  exp: number;
}

let cachedKey: CryptoKey | null = null;
async function getPublicKey(env: Env): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  cachedKey = (await importSPKI(env.JWT_PUBLIC_KEY, "RS256")) as CryptoKey;
  return cachedKey;
}

export const authRequired: MiddlewareHandler<{ Bindings: Env; Variables: { jwt: JwtClaims } }> = async (c, next) => {
  const h = c.req.header("authorization");
  if (!h || !h.startsWith("Bearer ")) throw Errors.unauthorized("Header Authorization ausente");
  const token = h.slice(7);
  try {
    const key = await getPublicKey(c.env);
    const { payload } = await jwtVerify(token, key, { algorithms: ["RS256"] });
    c.set("jwt", payload as unknown as JwtClaims);
  } catch {
    throw Errors.unauthorized();
  }
  await next();
};

export function requireRole(...roles: JwtClaims["role"][]): MiddlewareHandler<{ Variables: { jwt: JwtClaims } }> {
  return async (c, next) => {
    const j = c.get("jwt");
    if (!roles.includes(j.role)) throw Errors.forbidden(`Requer um dos perfis: ${roles.join(", ")}`);
    await next();
  };
}
