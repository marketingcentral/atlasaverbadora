// Self-service do usuario autenticado — endpoints /v1/me/*.
//
// Hoje cobre 2FA (setup/confirm/disable). Em breve pode receber:
// - PATCH /v1/me/password  (trocar senha propria)
// - PATCH /v1/me/contato   (email/telefone — respeitando flag da prefeitura)
//
// Fluxo 2FA:
//  1) POST /me/2fa/setup -> gera secret novo (NAO persiste ainda) + otpauth
//     url pra escanear no autenticador. Guarda em KV vinculado ao user (TTL 10min).
//  2) POST /me/2fa/confirm { code } -> valida o secret temp com o codigo TOTP;
//     se OK, persiste no user (twoFactorEnabled=true) e limpa o KV.
//  3) POST /me/2fa/disable { code } -> exige codigo TOTP atual + zera flags.

import { Hono } from "hono";
import { z } from "zod";
import { authRequired, type JwtClaims } from "../../middleware/auth.js";
import { Errors } from "../../_shared/errors.js";
import type { Env } from "../../env.js";
import { buildOtpauthUrl, generateTotpSecret, verifyTotp } from "../../_shared/totp.js";
import {
  bancos,
  prefeituras,
  ensureServidoresLoaded,
  ensurePerfisLoaded,
} from "../admin/index.js";
import { SERVIDORES_BUSCA_MOCK } from "../portal-banco/fixtures.js";
import { exportUsersRaw as exportAverbadoraUsers } from "../admin/perfis-admin.js";
import { appendAudit, auditCtx } from "../admin/auditoria.js";

/** Descreve UMA conta 2FA-capable — usada pelo setup pra mostrar account no QR
 *  e pelo confirm/disable pra ler/gravar as flags. Cada perfil resolve isso do
 *  seu proprio store. */
interface Conta2FA {
  account: string; // Aparece no autenticador (ex: "carla@atlas.io")
  isEnabled: boolean;
  currentSecret?: string;
  /** Escreve o par (secret, enabled) no store. Retorna void; write-through fica
   *  a cargo do chamador via helpers persistentes (aqui memoria basta). */
  set(secret: string | null, enabled: boolean): void;
}

async function resolveConta(env: Env, j: JwtClaims): Promise<Conta2FA | null> {
  if (j.role === "averbadora") {
    await ensurePerfisLoaded(env);
    const u = exportAverbadoraUsers().find((x) => x.id === Number(j.sub));
    if (!u) return null;
    return {
      account: u.email,
      isEnabled: !!u.twoFactorEnabled,
      currentSecret: u.twoFactorSecret,
      set(secret, enabled) {
        u.twoFactorSecret = secret ?? undefined;
        u.twoFactorEnabled = enabled;
      },
    };
  }
  if (j.role === "banco") {
    const b = bancos.find((x) => x.id === j.banco_id);
    if (!b) return null;
    return {
      account: b.loginEmail ?? b.contatoEmail,
      isEnabled: !!b.twoFactorEnabled,
      currentSecret: b.twoFactorSecret,
      set(secret, enabled) {
        b.twoFactorSecret = secret ?? undefined;
        b.twoFactorEnabled = enabled;
      },
    };
  }
  if (j.role === "prefeitura") {
    const p = prefeituras.find((x) => x.id === j.prefeitura_id);
    if (!p) return null;
    return {
      account: p.loginEmail ?? p.contatoEmail ?? p.nome,
      isEnabled: !!p.twoFactorEnabled,
      currentSecret: p.twoFactorSecret,
      set(secret, enabled) {
        p.twoFactorSecret = secret ?? undefined;
        p.twoFactorEnabled = enabled;
      },
    };
  }
  if (j.role === "servidor") {
    await ensureServidoresLoaded(env);
    // sub do JWT = idMatricula numerico. Achamos o servidor pelo matching do
    // sufixo em idMatricula (mesma logica do resolveServidor).
    const targetId = String(j.sub);
    const s = SERVIDORES_BUSCA_MOCK.find((x) => {
      const id = Number(x.idMatricula.replace(/\D/g, "").slice(-5)) || -1;
      return id === Number(targetId);
    });
    if (!s) return null;
    return {
      account: s.email ?? s.cpfMasked,
      isEnabled: !!s.twoFactorEnabled,
      currentSecret: s.twoFactorSecret,
      set(secret, enabled) {
        s.twoFactorSecret = secret ?? undefined;
        s.twoFactorEnabled = enabled;
      },
    };
  }
  return null;
}

export const meRoutes = new Hono<{ Bindings: Env; Variables: { jwt: JwtClaims } }>()
  .use("/v1/me/*", authRequired)

  /** Status atual do 2FA do usuario logado. */
  .get("/v1/me/2fa", async (c) => {
    const conta = await resolveConta(c.env, c.get("jwt"));
    if (!conta) throw Errors.notFound("conta");
    return c.json({ enabled: conta.isEnabled, account: conta.account });
  })

  /** Gera um secret novo, guarda em KV (TTL 10min) vinculado ao user, e devolve
   *  otpauth:// pra o front montar o QR. NAO persiste ainda — so na confirmacao. */
  .post("/v1/me/2fa/setup", async (c) => {
    const j = c.get("jwt");
    const conta = await resolveConta(c.env, j);
    if (!conta) throw Errors.notFound("conta");
    if (!c.env.KV_SESSIONS) throw Errors.bankUnavailable("KV nao configurado");
    const secret = generateTotpSecret();
    await c.env.KV_SESSIONS.put(`2fa_setup:${j.role}:${j.sub}`, secret, { expirationTtl: 600 });
    const otpauth = buildOtpauthUrl({ secret, account: conta.account });
    return c.json({
      secret,
      otpauth,
      account: conta.account,
      issuer: "Atlas Averbadora",
      instrucoes: [
        "Instale um autenticador (Google Authenticator, Authy, 1Password).",
        "Escaneie o QR code ou digite o secret manualmente.",
        "Volte aqui e informe o codigo de 6 digitos que o aplicativo mostrar.",
      ],
    });
  })

  /** Confirma o setup com um codigo TOTP valido — so aqui o secret e persistido
   *  e twoFactorEnabled vira true. Se o codigo nao bate, aborta sem persistir. */
  .post("/v1/me/2fa/confirm", async (c) => {
    const j = c.get("jwt");
    const conta = await resolveConta(c.env, j);
    if (!conta) throw Errors.notFound("conta");
    if (!c.env.KV_SESSIONS) throw Errors.bankUnavailable("KV nao configurado");
    const { code } = z.object({ code: z.string().min(4).max(8) }).parse(await c.req.json());
    const setupSecret = await c.env.KV_SESSIONS.get(`2fa_setup:${j.role}:${j.sub}`);
    if (!setupSecret) throw Errors.unauthorized("Sessao de setup 2FA expirada. Comece de novo.");
    const ok = await verifyTotp(setupSecret, code);
    if (!ok) throw Errors.unauthorized("Codigo invalido. Tente novamente com o codigo atual do seu autenticador.");
    conta.set(setupSecret, true);
    await c.env.KV_SESSIONS.delete(`2fa_setup:${j.role}:${j.sub}`);
    appendAudit(auditCtx(c), {
      categoria: "acesso",
      acao: "2fa_ativado",
      userId: `${j.role}:${j.sub}`,
      userRole: j.role,
      detalhes: `2FA ATIVADO em self-service pelo ${j.role} ${conta.account}.`,
    });
    return c.json({ ok: true, enabled: true });
  })

  /** Desativa o 2FA — exige codigo TOTP atual pra confirmar posse. */
  .post("/v1/me/2fa/disable", async (c) => {
    const j = c.get("jwt");
    const conta = await resolveConta(c.env, j);
    if (!conta) throw Errors.notFound("conta");
    if (!conta.isEnabled || !conta.currentSecret) {
      return c.json({ ok: true, enabled: false, aviso: "2FA ja estava desativado." });
    }
    const { code } = z.object({ code: z.string().min(4).max(8) }).parse(await c.req.json());
    const ok = await verifyTotp(conta.currentSecret, code);
    if (!ok) throw Errors.unauthorized("Codigo invalido");
    conta.set(null, false);
    // Disable de 2FA remove uma camada de protecao — evento CRITICO na trilha.
    // Ataque comum: adversario que comprometeu senha desativa o 2FA pra sessao
    // seguinte. Rastro obrigatorio pra deteccao pos-incidente.
    appendAudit(auditCtx(c), {
      categoria: "acesso",
      acao: "2fa_desativado_self",
      userId: `${j.role}:${j.sub}`,
      userRole: j.role,
      detalhes: `2FA DESATIVADO em self-service pelo ${j.role} ${conta.account}. Perda de camada de protecao — verificar se e' de fato o titular.`,
    });
    return c.json({ ok: true, enabled: false });
  });
