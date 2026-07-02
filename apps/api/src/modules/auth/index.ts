import { Hono } from "hono";
import { z } from "zod";
import { LoginRequestSchema, RefreshRequestSchema } from "@atlas/types";
import { Errors } from "../../_shared/errors.js";
import type { Env } from "../../env.js";
import { generateRefreshToken, signAccessToken } from "./jwt.js";
import { sha256Hex } from "../admin/api-tokens.js";
import { SERVIDORES_BUSCA_MOCK } from "../portal-banco/fixtures.js";
import { bancos as bancosStore, prefeituras as prefeiturasStore, ensureServidoresLoaded } from "../admin/index.js";

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
 * Auth-resolve a banco from the admin `bancos` store pelo loginEmail (validando SHA-256 da senha).
 * Mesma semantica do resolveServidor: claimedBy=true bloqueia fallback DEV_USERS quando o login
 * existe no cadastro mas a senha nao bate.
 */
async function resolveBancoByCredentials(
  identifier: string,
  password: string,
): Promise<{ match: ResolvedUser | null; claimedBy: boolean }> {
  const email = identifier.trim().toLowerCase();
  if (!email.includes("@")) return { match: null, claimedBy: false };
  const b = bancosStore.find((x) => x.loginEmail === email);
  if (!b || !b.passwordHash) return { match: null, claimedBy: false };
  if (b.status !== "ativo") return { match: null, claimedBy: true };
  const hash = await sha256Hex(password);
  if (hash !== b.passwordHash) return { match: null, claimedBy: true };
  return {
    match: { id: 1000 + b.id, nome: b.nome, role: "banco", banco_id: b.id },
    claimedBy: true,
  };
}

/**
 * Auth-resolve uma prefeitura do admin `prefeituras` store pelo loginEmail (sha256 da senha).
 */
async function resolvePrefeituraByCredentials(
  identifier: string,
  password: string,
): Promise<{ match: ResolvedUser | null; claimedBy: boolean }> {
  const email = identifier.trim().toLowerCase();
  if (!email.includes("@")) return { match: null, claimedBy: false };
  const p = prefeiturasStore.find((x) => x.loginEmail === email);
  if (!p || !p.passwordHash) return { match: null, claimedBy: false };
  if (p.status !== "ativo") return { match: null, claimedBy: true };
  const hash = await sha256Hex(password);
  if (hash !== p.passwordHash) return { match: null, claimedBy: true };
  return {
    match: { id: 2000 + p.id, nome: p.nome, role: "prefeitura", prefeitura_id: p.id },
    claimedBy: true,
  };
}

/**
 * Lightweight dev-only login: accepts any user from the seeded sandbox.
 * Replace with real DB-backed lookup + Argon2 comparison once `users` is populated.
 */
const DEV_USERS = [
  { id: 1, identifier: "00011122233", password: "teste123", role: "servidor", nome: "ADRIANA MARQUES DA SILVA", servidor_id: 1 },
  { id: 2, identifier: "00011122234", password: "teste123", role: "servidor", nome: "FERNANDA KELLI TOMAZONI", servidor_id: 2 },
  { id: 100, identifier: "banco@atlas.test", password: "teste123", role: "banco", nome: "Operador Banco SCred", banco_id: 1 },
  { id: 200, identifier: "admin@atlas.test", password: "teste123", role: "averbadora", nome: "Admin Atlas" },
  { id: 300, identifier: "prefeitura@atlas.test", password: "teste123", role: "prefeitura", nome: "Prefeitura de Palhoca", prefeitura_id: 1 },
] as const;

export const authRoutes = new Hono<{ Bindings: Env }>()
  .post("/v1/auth/login", async (c) => {
    const body = LoginRequestSchema.parse(await c.req.json());
    const identifier = body.identifier.replace(/\D/g, "").length === 11 ? body.identifier.replace(/\D/g, "") : body.identifier;

    // Hidrata os servidores do Postgres (SERVIDORES_BUSCA_MOCK <- linhas reais, com
    // passwordHash) antes de resolver as credenciais — login costuma ser a primeira
    // request do isolate, então sem isso o servidor cadastrado só no banco fica invisível.
    await ensureServidoresLoaded(c.env);

    // 1) Servidor cadastrado via averbadora (login = CPF) com senha SHA-256.
    const servidorAuth = await resolveServidorByCredentials(body.identifier, body.password);
    let resolved: ResolvedUser | null = servidorAuth.match;
    let claimed = servidorAuth.claimedBy;

    // 2) Banco cadastrado via averbadora (login = email + senha SHA-256).
    if (!resolved && !claimed) {
      const bancoAuth = await resolveBancoByCredentials(body.identifier, body.password);
      resolved = bancoAuth.match;
      claimed = claimed || bancoAuth.claimedBy;
    }

    // 3) Prefeitura cadastrada via averbadora (login = email + senha SHA-256).
    if (!resolved && !claimed) {
      const prefAuth = await resolvePrefeituraByCredentials(body.identifier, body.password);
      resolved = prefAuth.match;
      claimed = claimed || prefAuth.claimedBy;
    }

    // 4) Fallback DEV_USERS — só se o identifier NÃO foi reivindicado por servidor/banco/prefeitura
    //    cadastrado (caso contrário a senha demo continuaria valendo mesmo após o admin trocar).
    if (!resolved && !claimed) {
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
      await c.env.KV_SESSIONS.put(
        `rt:${refreshToken}`,
        JSON.stringify({
          user_id: resolved.id,
          role: resolved.role,
          servidor_id: resolved.servidor_id,
          banco_id: resolved.banco_id,
          prefeitura_id: resolved.prefeitura_id,
          nome: resolved.nome,
          device_id: body.device_id,
        }),
        { expirationTtl: 60 * 60 * 24 * 30 },
      );
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
    const parsed = z
      .object({
        user_id: z.number(),
        role: z.enum(["servidor", "banco", "averbadora", "prefeitura"]).optional(),
        servidor_id: z.number().optional(),
        banco_id: z.number().optional(),
        prefeitura_id: z.number().optional(),
        nome: z.string().optional(),
        device_id: z.string().optional(),
      })
      .parse(JSON.parse(data));
    // Sessoes antigas (sem role no payload) caem no DEV_USERS; novas (banco/servidor cadastrados) ja trazem tudo.
    const dev = DEV_USERS.find((u) => u.id === parsed.user_id);
    const user = parsed.role
      ? {
          id: parsed.user_id,
          role: parsed.role,
          nome: parsed.nome ?? dev?.nome ?? "Usuario",
          servidor_id: parsed.servidor_id,
          banco_id: parsed.banco_id,
          prefeitura_id: parsed.prefeitura_id,
        }
      : dev
        ? {
            id: dev.id,
            role: dev.role as "servidor" | "banco" | "averbadora" | "prefeitura",
            nome: dev.nome,
            servidor_id: "servidor_id" in dev ? dev.servidor_id : undefined,
            banco_id: "banco_id" in dev ? dev.banco_id : undefined,
            prefeitura_id: "prefeitura_id" in dev ? dev.prefeitura_id : undefined,
          }
        : null;
    if (!user) throw Errors.unauthorized();
    // Rotate refresh token.
    await c.env.KV_SESSIONS.delete(`rt:${body.refresh_token}`);
    const accessToken = await signAccessToken(c.env, {
      sub: String(user.id),
      role: user.role,
      servidor_id: user.servidor_id,
      banco_id: user.banco_id,
      prefeitura_id: user.prefeitura_id,
      device_id: parsed.device_id,
    });
    const newRefresh = generateRefreshToken();
    await c.env.KV_SESSIONS.put(
      `rt:${newRefresh}`,
      JSON.stringify({
        user_id: user.id,
        role: user.role,
        servidor_id: user.servidor_id,
        banco_id: user.banco_id,
        prefeitura_id: user.prefeitura_id,
        nome: user.nome,
        device_id: parsed.device_id,
      }),
      { expirationTtl: 60 * 60 * 24 * 30 },
    );
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
