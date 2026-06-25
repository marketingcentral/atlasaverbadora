import { Hono } from "hono";
import { z } from "zod";
import { LoginRequestSchema, RefreshRequestSchema } from "@atlas/types";
import { Errors } from "../../_shared/errors.js";
import type { Env } from "../../env.js";
import { generateRefreshToken, signAccessToken } from "./jwt.js";
import { sha256Hex } from "../admin/api-tokens.js";
import { SERVIDORES_BUSCA_MOCK } from "../portal-banco/fixtures.js";

interface ResolvedUser {
  id: number;
  nome: string;
  role: "servidor" | "banco" | "averbadora" | "prefeitura";
  servidor_id?: number;
  banco_id?: number;
  prefeitura_id?: number;
}

/**
 * Auth-resolve a servidor from SERVIDORES_BUSCA_MOCK pelo CPF (validando SHA-256 da senha).
 * Login do servidor = CPF. Estados:
 *  - { match: ResolvedUser } credenciais batem
 *  - { match: null, claimedBy: true } servidor existe e tem senha cadastrada — bloqueia fallback DEV_USERS
 *  - { match: null, claimedBy: false } nenhum servidor com senha bate o CPF
 */
async function resolveServidorByCredentials(
  rawIdentifier: string,
  password: string,
): Promise<{ match: ResolvedUser | null; claimedBy: boolean }> {
  const cpfDigits = rawIdentifier.replace(/\D/g, "");
  if (cpfDigits.length !== 11) return { match: null, claimedBy: false };
  const s = SERVIDORES_BUSCA_MOCK.find((x) => x.cpf === cpfDigits);
  if (!s || !s.passwordHash) return { match: null, claimedBy: false };
  const hash = await sha256Hex(password);
  if (hash !== s.passwordHash) return { match: null, claimedBy: true };
  const id = Number(s.idMatricula.replace(/\D/g, "").slice(-5)) || 1;
  return { match: { id, nome: s.nome, role: "servidor", servidor_id: id }, claimedBy: true };
}

/**
 * Lightweight dev-only login: accepts any user from the seeded sandbox.
 * Replace with real DB-backed lookup + Argon2 comparison once `users` is populated.
 */
const DEV_USERS = [
  { id: 1, identifier: "00011122233", password: "teste123", role: "servidor", nome: "Ana Carolina Silva", servidor_id: 1 },
  { id: 2, identifier: "00011122234", password: "teste123", role: "servidor", nome: "Joao da Silva Neves", servidor_id: 2 },
  { id: 100, identifier: "banco@atlas.test", password: "teste123", role: "banco", nome: "Operador Banco SCred", banco_id: 1 },
  { id: 200, identifier: "admin@atlas.test", password: "teste123", role: "averbadora", nome: "Admin Atlas" },
  { id: 300, identifier: "prefeitura@atlas.test", password: "teste123", role: "prefeitura", nome: "Prefeitura de Palhoca", prefeitura_id: 1 },
] as const;

export const authRoutes = new Hono<{ Bindings: Env }>()
  .post("/v1/auth/login", async (c) => {
    const body = LoginRequestSchema.parse(await c.req.json());
    const identifier = body.identifier.replace(/\D/g, "").length === 11 ? body.identifier.replace(/\D/g, "") : body.identifier;

    // 1) Servidor cadastrado via averbadora (login = CPF) com senha SHA-256.
    const servidorAuth = await resolveServidorByCredentials(body.identifier, body.password);
    let resolved: ResolvedUser | null = servidorAuth.match;

    // 2) Fallback DEV_USERS — só se o identifier NÃO foi reivindicado por um servidor com senha cadastrada
    //    (caso contrário a senha demo continuaria valendo mesmo após o admin trocar).
    if (!resolved && !servidorAuth.claimedBy) {
      const dev = DEV_USERS.find((u) => u.identifier === identifier);
      if (dev && dev.password === body.password) {
        resolved = {
          id: dev.id,
          nome: dev.nome,
          role: dev.role,
          servidor_id: "servidor_id" in dev ? dev.servidor_id : undefined,
          banco_id: "banco_id" in dev ? dev.banco_id : undefined,
          prefeitura_id: "prefeitura_id" in dev ? dev.prefeitura_id : undefined,
        };
      }
    }

    if (!resolved) throw Errors.unauthorized("Credenciais invalidas");

    const accessToken = await signAccessToken(c.env, {
      sub: String(resolved.id),
      role: resolved.role,
      servidor_id: resolved.servidor_id,
      banco_id: resolved.banco_id,
      prefeitura_id: resolved.prefeitura_id,
      device_id: body.device_id,
    });
    const refreshToken = generateRefreshToken();
    if (c.env.KV_SESSIONS) {
      await c.env.KV_SESSIONS.put(`rt:${refreshToken}`, JSON.stringify({ user_id: resolved.id, role: resolved.role, device_id: body.device_id }), { expirationTtl: 60 * 60 * 24 * 30 });
    }
    return c.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900,
      role: resolved.role,
      user: { id: resolved.id, nome: resolved.nome, role: resolved.role },
    });
  })
  .post("/v1/auth/refresh", async (c) => {
    const body = RefreshRequestSchema.parse(await c.req.json());
    if (!c.env.KV_SESSIONS) throw Errors.unauthorized("Refresh nao disponivel sem KV_SESSIONS");
    const data = await c.env.KV_SESSIONS.get(`rt:${body.refresh_token}`);
    if (!data) throw Errors.unauthorized("Refresh token invalido ou revogado");
    const parsed = z.object({ user_id: z.number(), device_id: z.string().optional() }).parse(JSON.parse(data));
    const user = DEV_USERS.find((u) => u.id === parsed.user_id);
    if (!user) throw Errors.unauthorized();
    // Rotate refresh token.
    await c.env.KV_SESSIONS.delete(`rt:${body.refresh_token}`);
    const accessToken = await signAccessToken(c.env, {
      sub: String(user.id),
      role: user.role,
      servidor_id: "servidor_id" in user ? user.servidor_id : undefined,
      banco_id: "banco_id" in user ? user.banco_id : undefined,
      prefeitura_id: "prefeitura_id" in user ? user.prefeitura_id : undefined,
      device_id: parsed.device_id,
    });
    const newRefresh = generateRefreshToken();
    await c.env.KV_SESSIONS.put(`rt:${newRefresh}`, JSON.stringify(parsed), { expirationTtl: 60 * 60 * 24 * 30 });
    return c.json({
      access_token: accessToken,
      refresh_token: newRefresh,
      expires_in: 900,
      role: user.role,
      user: { id: user.id, nome: user.nome, role: user.role },
    });
  })
  .post("/v1/auth/logout", async (c) => {
    const auth = c.req.header("authorization");
    if (auth?.startsWith("Bearer ") && c.env.KV_SESSIONS) {
      // Best-effort cleanup. Real impl would track jti for blacklisting.
    }
    return c.body(null, 204);
  });
