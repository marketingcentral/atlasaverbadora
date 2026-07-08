import { Hono } from "hono";
import { z } from "zod";
import { LoginRequestSchema, RefreshRequestSchema } from "@atlas/types";
import { Errors } from "../../_shared/errors.js";
import type { Env } from "../../env.js";
import { generateRefreshToken, signAccessToken } from "./jwt.js";
import { sha256Hex } from "../admin/api-tokens.js";
import { enviarCodigo } from "../admin/mailer.js";
import { gerarCodigoUnico } from "../admin/codes.js";
import { SERVIDORES_BUSCA_MOCK } from "../portal-banco/fixtures.js";
import { bancos as bancosStore, prefeituras as prefeiturasStore, ensureServidoresLoaded } from "../admin/index.js";
import { setServidorPassword, setServidorContato } from "../../db/repos.js";

/** Mascara um e-mail: "diego.ferreira@x.com" -> "di•••@x.com". */
function maskEmail(email?: string): string {
  if (!email || !email.includes("@")) return "seu e-mail";
  const parts = email.split("@");
  const user = parts[0] ?? "";
  const domain = parts[1] ?? "";
  return `${user.slice(0, 2)}•••@${domain}`;
}
/** Mascara um telefone deixando os 4 últimos dígitos: "(••) •••••-4407". */
function maskPhone(phone?: string): string {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length < 4) return "seu telefone";
  return `(••) •••••-${d.slice(-4)}`;
}
function randomCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const n = ((bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!) >>> 0;
  return String(100000 + (n % 900000));
}

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
  // Pode haver mais de uma linha para o mesmo CPF (múltiplas matrículas / imports).
  // Procura, entre TODAS com senha cadastrada, aquela cujo hash bate — não só a 1ª.
  const comSenha = SERVIDORES_BUSCA_MOCK.filter((x) => x.cpf === cpfDigits && x.passwordHash);
  if (comSenha.length === 0) return { match: null, claimedBy: false };
  const hash = await sha256Hex(password);
  const s = comSenha.find((x) => x.passwordHash === hash);
  if (!s) return { match: null, claimedBy: true };
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
const DEV_USERS: DevUser[] = [
  { id: 1, identifier: "00011122233", password: "teste123", role: "servidor", nome: "ADRIANA MARQUES DA SILVA", servidor_id: 1, cpf: "00011122233", email: "adriana.silva@palhoca.sc.gov.br" },
  { id: 2, identifier: "00011122234", password: "teste123", role: "servidor", nome: "FERNANDA KELLI TOMAZONI", servidor_id: 2, cpf: "00011122234", email: "fernanda.tomazoni@floripa.sc.gov.br" },
  { id: 100, identifier: "banco@atlas.test", password: "teste123", role: "banco", nome: "Operador Banco SCred", banco_id: 1 },
  { id: 200, identifier: "admin@atlas.test", password: "teste123", role: "averbadora", nome: "Admin Atlas" },
  { id: 300, identifier: "prefeitura@atlas.test", password: "teste123", role: "prefeitura", nome: "Prefeitura de Palhoca", prefeitura_id: 1 },
  { id: 301, identifier: "florianopolis@atlas.test", password: "teste123", role: "prefeitura", nome: "Prefeitura de Florianopolis", prefeitura_id: 2 },
  { id: 302, identifier: "joinville@atlas.test", password: "teste123", role: "prefeitura", nome: "Prefeitura de Joinville", prefeitura_id: 3 },
];

interface DevUser {
  id: number;
  identifier: string;
  password: string;
  role: "servidor" | "banco" | "averbadora" | "prefeitura";
  nome: string;
  servidor_id?: number;
  banco_id?: number;
  prefeitura_id?: number;
  cpf?: string;
  email?: string;
}

/** Info de um DEV_USER pelo id — pra resolver e-mail cadastrado do servidor DEV logado. */
export function devUserById(id: number): DevUser | undefined {
  return DEV_USERS.find((x) => x.id === id);
}

/** Se este CPF ja tem senha via DEV_USERS (bypass do fixture). */
function devUserTemSenhaPorCpf(cpf: string): boolean {
  return DEV_USERS.some((u) => u.role === "servidor" && u.cpf === cpf && !!u.password);
}

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
  // ===== Primeiro acesso (fluxo das telas 01B–01E do app) =====
  // 1) Busca o servidor pelo CPF na base (Postgres). 404 se não existir.
  .post("/v1/auth/primeiro-acesso/buscar", async (c) => {
    const { cpf } = z.object({ cpf: z.string() }).parse(await c.req.json());
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) throw Errors.validation({ cpf: "CPF deve ter 11 dígitos" });
    await ensureServidoresLoaded(c.env);
    const s = SERVIDORES_BUSCA_MOCK.find((x) => x.cpf === digits);
    if (!s) return c.json({ encontrado: false });
    // "Ja tem senha" considera AMBOS: passwordHash real (Postgres) E DEV_USERS
    // (senha de seed). Sem isso, servidores sandbox como Adriana passariam pelo
    // primeiro-acesso e alguem poderia hijackear a conta com email/senha novos.
    return c.json({
      encontrado: true,
      nome: s.nome,
      matricula: s.matricula,
      cargo: s.cargo ?? null,
      origem: s.origem ?? null,
      email_masked: maskEmail(s.email),
      telefone_masked: maskPhone(s.telefone),
      ja_tem_senha: Boolean(s.passwordHash) || devUserTemSenhaPorCpf(digits),
    });
  })
  // 2) Envia (test-mode: retorna) o código de 6 dígitos.
  // 2) Servidor escolhe SEU proprio email + senha; o codigo vai pra esse email
  //    (nao pro cadastrado pela prefeitura — que pode ser institucional).
  //    O email so e considerado valido apos o codigo ser confirmado.
  .post("/v1/auth/primeiro-acesso/codigo", async (c) => {
    const { cpf, email, senha } = z
      .object({
        cpf: z.string(),
        email: z.string().email("E-mail invalido"),
        senha: z.string().min(8, "Senha precisa de ao menos 8 caracteres"),
      })
      .parse(await c.req.json());
    const digits = cpf.replace(/\D/g, "");
    await ensureServidoresLoaded(c.env);
    const s = SERVIDORES_BUSCA_MOCK.find((x) => x.cpf === digits);
    if (!s) throw Errors.notFound("servidor");
    // Bloqueia hijack: se ja tem senha (real ou de seed DEV), so aceita "Esqueci senha".
    if (s.passwordHash || devUserTemSenhaPorCpf(digits)) throw Errors.validation({ cpf: "Este CPF ja fez o primeiro acesso. Use 'Esqueci minha senha'." });
    const codigo = await gerarCodigoUnico(c.env);
    const senhaHash = await sha256Hex(senha);
    // Guarda o pacote pendente ate a confirmacao (10 min).
    const pending = { codigo, email: email.trim().toLowerCase(), senhaHash };
    if (c.env.KV_SESSIONS) await c.env.KV_SESSIONS.put(`pa:${digits}`, JSON.stringify(pending), { expirationTtl: 600 });
    // Envia pro email QUE O SERVIDOR ESCOLHEU (nao pro cadastrado).
    // Primeiro-acesso: e o proprio servidor provando que aquele email e dele.
    // Nao respeitar o notifyEmail (override de teste dos perfis admin) — o codigo
    // TEM que ir pro email que o servidor digitou, senao ele nunca recebe.
    const r = await enviarCodigo(c.env, { destinoPadrao: email, contexto: "ativar seu acesso Atlas", codigo, respeitaOverride: false });
    return c.json({
      enviado: r.sent,
      destino: maskEmail(r.destino || email),
      ...(r.sent ? {} : { codigo_teste: codigo, aviso: `E-mail nao enviado (${r.reason}) — modo teste.` }),
    });
  })
  // 3) Confirma o codigo — grava passwordHash E o novo email no Postgres.
  .post("/v1/auth/primeiro-acesso/senha", async (c) => {
    const { cpf, codigo } = z
      .object({ cpf: z.string(), codigo: z.string() })
      .parse(await c.req.json());
    const digits = cpf.replace(/\D/g, "");
    if (!c.env.KV_SESSIONS) throw Errors.validation({ kv: "sessoes indisponiveis" });
    const raw = await c.env.KV_SESSIONS.get(`pa:${digits}`);
    if (!raw) throw Errors.unauthorized("Codigo expirado. Solicite um novo.");
    let pending: { codigo: string; email: string; senhaHash: string };
    try { pending = JSON.parse(raw); } catch { throw Errors.unauthorized("Sessao invalida — solicite um novo codigo."); }
    if (pending.codigo !== codigo) throw Errors.unauthorized("Codigo invalido");
    // Grava senha + email (novo) em TODAS as matriculas desse CPF.
    const n = await setServidorPassword(c.env, digits, pending.senhaHash);
    if (n === 0) throw Errors.notFound("servidor");
    await setServidorContato(c.env, digits, { email: pending.email });
    // Cache in-memory do isolate — login e 2FA funcionam imediatamente.
    SERVIDORES_BUSCA_MOCK.filter((x) => x.cpf === digits).forEach((x) => {
      x.passwordHash = pending.senhaHash;
      x.email = pending.email;
    });
    await c.env.KV_SESSIONS.delete(`pa:${digits}`);
    return c.json({ ok: true });
  })
  // ===== Recuperar senha do servidor (esqueci minha senha) =====
  // Diferente do primeiro-acesso: aqui o servidor JA tem senha; queremos redefini-la.
  // 1) Manda codigo pro e-mail cadastrado do servidor.
  .post("/v1/auth/esqueci-senha/solicitar", async (c) => {
    const { cpf } = z.object({ cpf: z.string() }).parse(await c.req.json());
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) throw Errors.validation({ cpf: "CPF deve ter 11 dígitos" });
    await ensureServidoresLoaded(c.env);
    const s = SERVIDORES_BUSCA_MOCK.find((x) => x.cpf === digits);
    // Nunca revelar se o CPF existe ou nao (evita enumeracao). Se nao acha, finge
    // sucesso mas nao envia nada — a mensagem no front e igual em ambos os casos.
    if (!s) return c.json({ enviado: false, destino: "", aviso: "Se este CPF existir, o codigo foi enviado." });
    const codigo = await gerarCodigoUnico(c.env);
    if (c.env.KV_SESSIONS) await c.env.KV_SESSIONS.put(`rs:${digits}`, codigo, { expirationTtl: 600 });
    // Esqueci-senha: dono da conta recebe direto. Bypass do notifyEmail global.
    const r = await enviarCodigo(c.env, { destinoPadrao: s.email, contexto: "redefinir sua senha Atlas", codigo, respeitaOverride: false });
    return c.json({
      enviado: r.sent,
      destino: maskEmail(r.destino || s.email),
      ...(r.sent ? {} : { codigo_teste: codigo, aviso: `E-mail não enviado (${r.reason}) — modo teste.` }),
    });
  })
  // 2) Valida o codigo e define a nova senha.
  .post("/v1/auth/esqueci-senha/redefinir", async (c) => {
    const { cpf, codigo, senha } = z
      .object({ cpf: z.string(), codigo: z.string(), senha: z.string().min(8) })
      .parse(await c.req.json());
    const digits = cpf.replace(/\D/g, "");
    if (!c.env.KV_SESSIONS) throw Errors.validation({ kv: "sessões indisponíveis" });
    const stored = await c.env.KV_SESSIONS.get(`rs:${digits}`);
    if (!stored || stored !== codigo) throw Errors.unauthorized("Código inválido ou expirado");
    const hash = await sha256Hex(senha);
    const n = await setServidorPassword(c.env, digits, hash);
    if (n === 0) throw Errors.notFound("servidor");
    // Atualiza cache em memoria do isolate — login funciona imediatamente.
    SERVIDORES_BUSCA_MOCK.filter((x) => x.cpf === digits).forEach((x) => { x.passwordHash = hash; });
    await c.env.KV_SESSIONS.delete(`rs:${digits}`);
    return c.json({ ok: true });
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
