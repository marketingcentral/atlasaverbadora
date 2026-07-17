import { Hono } from "hono";
import { z } from "zod";
import { LoginRequestSchema, RefreshRequestSchema } from "@atlas/types";
import { Errors } from "../../_shared/errors.js";
import type { Env } from "../../env.js";
import { generateRefreshToken, signAccessToken } from "./jwt.js";
import type { JwtClaims } from "../../middleware/auth.js";
import { sha256Hex } from "../admin/api-tokens.js";
import { enviarCodigo } from "../admin/mailer.js";
import { gerarCodigoUnico } from "../admin/codes.js";
import { SERVIDORES_BUSCA_MOCK } from "../portal-banco/fixtures.js";
import { bancos as bancosStore, prefeituras as prefeiturasStore, ensureServidoresLoaded, ensurePerfisLoaded } from "../admin/index.js";
import { findByEmail as findAverbadoraByEmail, exportUsersRaw as exportAverbadoraUsers } from "../admin/perfis-admin.js";
import { verifyTotp } from "../../_shared/totp.js";
import { setServidorPassword, setServidorContato, emailEmUsoPorOutroCpf, loadServidores } from "../../db/repos.js";

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
 * Auth-resolve subusuario da averbadora (Carla operadora, Rafael comercial, etc)
 * pelo email + senha SHA-256. Todos entram como role="averbadora" no JWT; o
 * campo `perfil` (operador/supervisor/comercial/financeiro/auditoria) vai como
 * claim pra o front decidir gating de tela.
 *
 * Nao inclui o dev-user "admin@atlas.test" (esse continua vindo do DEV_USERS
 * fallback); aqui e apenas pros usuarios cadastrados no painel /averbadora/perfis.
 */
async function resolveAverbadoraByCredentials(
  identifier: string,
  password: string,
): Promise<{ match: ResolvedUser | null; claimedBy: boolean; perfil?: string; permissoes?: string[]; userId?: number }> {
  const email = identifier.trim().toLowerCase();
  if (!email.includes("@")) return { match: null, claimedBy: false };
  const u = findAverbadoraByEmail(email);
  if (!u || !u.passwordHash) return { match: null, claimedBy: false };
  if (!u.ativo) return { match: null, claimedBy: true };
  const hash = await sha256Hex(password);
  if (hash !== u.passwordHash) return { match: null, claimedBy: true };
  return {
    match: { id: u.id, nome: u.nome, role: "averbadora" },
    claimedBy: true,
    perfil: u.perfil,
    permissoes: u.permissoes ?? [],
    userId: u.id,
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
    // Perfis da averbadora tambem sao persistidos (admin_perfis) — hidrata antes
    // de tentar resolver senao Carla/Rafael/Sandra/etc ficariam invisiveis.
    await ensurePerfisLoaded(c.env);

    // 1) Servidor cadastrado via averbadora (login = CPF) com senha SHA-256.
    const servidorAuth = await resolveServidorByCredentials(body.identifier, body.password);
    let resolved: ResolvedUser | null = servidorAuth.match;
    let claimed = servidorAuth.claimedBy;
    let averbadoraPerfil: string | undefined;
    let averbadoraPermissoes: string[] | undefined;

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

    // 4) Subusuario da averbadora (Carla/Rafael/Sandra/etc) — login = email do painel.
    if (!resolved && !claimed) {
      const avAuth = await resolveAverbadoraByCredentials(body.identifier, body.password);
      resolved = avAuth.match;
      claimed = claimed || avAuth.claimedBy;
      averbadoraPerfil = avAuth.perfil;
      averbadoraPermissoes = avAuth.permissoes;
      if (resolved && avAuth.userId != null) {
        // Atualiza ultimoLogin na fixture (write-through persiste na proxima mutacao).
        const u = exportAverbadoraUsers().find((x) => x.id === avAuth.userId);
        if (u) u.ultimoLogin = new Date().toISOString();
      }
    }

    // 5) Fallback DEV_USERS — só se o identifier NÃO foi reivindicado por servidor/banco/prefeitura/averbadora
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

    // 2FA: se o usuario resolvido tem twoFactorEnabled=true e twoFactorSecret
    // configurado, NAO emite JWT de sessao ainda. Emite um mfa_token curto
    // (KV_SESSIONS, TTL 5min) que o frontend precisa trocar por um code TOTP
    // valido via /v1/auth/verify-2fa. Aplica pra QUALQUER perfil que tenha
    // ativado 2FA via self-service (/v1/me/2fa).
    let needs2fa = false;
    if (resolved.role === "averbadora") {
      const u = exportAverbadoraUsers().find((x) => x.id === resolved.id);
      needs2fa = !!(u?.twoFactorEnabled && u.twoFactorSecret);
    } else if (resolved.role === "banco" && resolved.banco_id != null) {
      const b = bancosStore.find((x) => x.id === resolved.banco_id);
      needs2fa = !!(b?.twoFactorEnabled && b.twoFactorSecret);
    } else if (resolved.role === "prefeitura" && resolved.prefeitura_id != null) {
      const p = prefeiturasStore.find((x) => x.id === resolved.prefeitura_id);
      needs2fa = !!(p?.twoFactorEnabled && p.twoFactorSecret);
    } else if (resolved.role === "servidor" && resolved.servidor_id != null) {
      const s = SERVIDORES_BUSCA_MOCK.find((x) => {
        const id = Number(x.idMatricula.replace(/\D/g, "").slice(-5)) || -1;
        return id === resolved.servidor_id;
      });
      needs2fa = !!(s?.twoFactorEnabled && s.twoFactorSecret);
    }
    if (needs2fa && c.env.KV_SESSIONS) {
      const mfaToken = generateRefreshToken();
      await c.env.KV_SESSIONS.put(
        `mfa:${mfaToken}`,
        JSON.stringify({
          user_id: resolved.id,
          role: resolved.role,
          nome: resolved.nome,
          servidor_id: resolved.servidor_id,
          banco_id: resolved.banco_id,
          prefeitura_id: resolved.prefeitura_id,
          averbadora_perfil: averbadoraPerfil,
          averbadora_permissoes: averbadoraPermissoes,
          device_id: body.device_id,
        }),
        { expirationTtl: 300 },
      );
      return c.json({
        requires_2fa: true,
        mfa_token: mfaToken,
        hint: "Informe o codigo de 6 digitos do seu aplicativo autenticador (Google Authenticator, Authy, 1Password).",
      });
    }

    const accessToken = await signAccessToken(c.env, {
      sub: String(resolved.id),
      role: resolved.role,
      servidor_id: resolved.servidor_id,
      banco_id: resolved.banco_id,
      prefeitura_id: resolved.prefeitura_id,
      averbadora_perfil: averbadoraPerfil as JwtClaims["averbadora_perfil"] | undefined,
      averbadora_permissoes: averbadoraPermissoes,
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
  // ===== 2FA — verify TOTP code do fluxo de login =====
  .post("/v1/auth/verify-2fa", async (c) => {
    if (!c.env.KV_SESSIONS) throw Errors.unauthorized("sessoes indisponiveis");
    const { mfa_token, code } = z.object({ mfa_token: z.string().min(10), code: z.string().min(4).max(8) }).parse(await c.req.json());
    const raw = await c.env.KV_SESSIONS.get(`mfa:${mfa_token}`);
    if (!raw) throw Errors.unauthorized("Sessao 2FA expirada. Faca login de novo.");
    const parsed = z.object({
      user_id: z.number(),
      role: z.enum(["servidor", "banco", "averbadora", "prefeitura"]),
      nome: z.string(),
      servidor_id: z.number().optional(),
      banco_id: z.number().optional(),
      prefeitura_id: z.number().optional(),
      averbadora_perfil: z.enum(["operador", "supervisor", "comercial", "financeiro", "auditoria", "personalizado"]).optional(),
      averbadora_permissoes: z.array(z.string()).optional(),
      device_id: z.string().optional(),
    }).parse(JSON.parse(raw));

    // Resolve o secret conforme o role. Todos os 4 perfis podem ter 2FA
    // via self-service (/v1/me/2fa/*).
    let secret: string | undefined;
    if (parsed.role === "averbadora") {
      await ensurePerfisLoaded(c.env);
      const u = exportAverbadoraUsers().find((x) => x.id === parsed.user_id);
      secret = u?.twoFactorSecret;
    } else if (parsed.role === "banco" && parsed.banco_id != null) {
      const b = bancosStore.find((x) => x.id === parsed.banco_id);
      secret = b?.twoFactorSecret;
    } else if (parsed.role === "prefeitura" && parsed.prefeitura_id != null) {
      const p = prefeiturasStore.find((x) => x.id === parsed.prefeitura_id);
      secret = p?.twoFactorSecret;
    } else if (parsed.role === "servidor" && parsed.servidor_id != null) {
      await ensureServidoresLoaded(c.env);
      const s = SERVIDORES_BUSCA_MOCK.find((x) => {
        const id = Number(x.idMatricula.replace(/\D/g, "").slice(-5)) || -1;
        return id === parsed.servidor_id;
      });
      secret = s?.twoFactorSecret;
    }
    if (!secret) throw Errors.unauthorized("2FA nao configurado para este usuario");

    const ok = await verifyTotp(secret, code);
    if (!ok) throw Errors.unauthorized("Codigo 2FA invalido ou expirado");

    // Consome o mfa_token (single-use) e emite o par access+refresh normal.
    await c.env.KV_SESSIONS.delete(`mfa:${mfa_token}`);
    const accessToken = await signAccessToken(c.env, {
      sub: String(parsed.user_id),
      role: parsed.role,
      servidor_id: parsed.servidor_id,
      banco_id: parsed.banco_id,
      prefeitura_id: parsed.prefeitura_id,
      averbadora_perfil: parsed.averbadora_perfil,
      averbadora_permissoes: parsed.averbadora_permissoes,
      device_id: parsed.device_id,
    });
    const refreshToken = generateRefreshToken();
    await c.env.KV_SESSIONS.put(
      `rt:${refreshToken}`,
      JSON.stringify({
        user_id: parsed.user_id,
        role: parsed.role,
        servidor_id: parsed.servidor_id,
        banco_id: parsed.banco_id,
        prefeitura_id: parsed.prefeitura_id,
        nome: parsed.nome,
        device_id: parsed.device_id,
      }),
      { expirationTtl: 60 * 60 * 24 * 30 },
    );
    return c.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900,
      role: parsed.role,
      user: { id: parsed.user_id, nome: parsed.nome, role: parsed.role },
    });
  })
  // ===== Primeiro acesso (fluxo das telas 01B–01E do app) =====
  // 1) Busca o servidor pelo CPF na base (Postgres). 404 se não existir.
  .post("/v1/auth/primeiro-acesso/buscar", async (c) => {
    const { cpf } = z.object({ cpf: z.string() }).parse(await c.req.json());
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) throw Errors.validation({ cpf: "CPF deve ter 11 dígitos" });
    await ensureServidoresLoaded(c.env);
    let s = SERVIDORES_BUSCA_MOCK.find((x) => x.cpf === digits);
    // Fallback direto no PG — cobre o caso de o servidor ter sido importado em
    // outro isolate que ainda nao propagou pra este. Antes retornava
    // "servidor nao encontrado" mesmo com o registro persistido no banco.
    if (!s) {
      try {
        const rows = await loadServidores(c.env);
        const found = rows.find((x) => x.cpf === digits);
        if (found) {
          SERVIDORES_BUSCA_MOCK.push(found);
          s = found;
        }
      } catch { /* fail-safe */ }
    }
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
    const { cpf, email, senha, telefone } = z
      .object({
        cpf: z.string(),
        email: z.string().email("E-mail invalido"),
        senha: z.string().min(8, "Senha precisa de ao menos 8 caracteres"),
        telefone: z.string().refine((v) => v.replace(/\D/g, "").length >= 10 && v.replace(/\D/g, "").length <= 11, {
          message: "Telefone deve ter DDD + numero (10 ou 11 digitos)",
        }),
      })
      .parse(await c.req.json());
    const digits = cpf.replace(/\D/g, "");
    await ensureServidoresLoaded(c.env);
    const s = SERVIDORES_BUSCA_MOCK.find((x) => x.cpf === digits);
    if (!s) throw Errors.notFound("servidor");
    // Bloqueia hijack: se ja tem senha (real ou de seed DEV), so aceita "Esqueci senha".
    if (s.passwordHash || devUserTemSenhaPorCpf(digits)) throw Errors.validation({ cpf: "Este CPF ja fez o primeiro acesso. Use 'Esqueci minha senha'." });
    // E-mail unico por servidor: nao pode pertencer a OUTRO CPF — esteja a conta
    // ativada ou nao (basta o e-mail estar gravado noutro servidor). Assim o mesmo
    // e-mail nao serve para varios CPFs.
    const emailAlvo = email.trim().toLowerCase();
    // Autoritativo: consulta o Postgres (fonte da verdade). Fallback pra memória
    // se o DB estiver indisponível — nunca deixa passar por falha de conexão.
    let emUsoDb = false;
    try {
      emUsoDb = await emailEmUsoPorOutroCpf(c.env, emailAlvo, digits);
    } catch {
      emUsoDb = SERVIDORES_BUSCA_MOCK.some((x) => x.cpf !== digits && (x.email ?? "").trim().toLowerCase() === emailAlvo);
    }
    // ...e nao pode estar reservado por um primeiro-acesso pendente de outro CPF
    // (evita dois cadastros simultaneos pegarem o mesmo e-mail antes de confirmar).
    let emUsoPendente = false;
    if (c.env.KV_SESSIONS) {
      const dono = await c.env.KV_SESSIONS.get(`pa:email:${emailAlvo}`);
      emUsoPendente = Boolean(dono && dono !== digits);
    }
    if (emUsoDb || emUsoPendente) throw Errors.validation({ email: "E-mail já cadastrado para outro CPF. Use outro e-mail." });
    const codigo = await gerarCodigoUnico(c.env);
    const senhaHash = await sha256Hex(senha);
    // Guarda o pacote pendente ate a confirmacao (10 min). Telefone normalizado (so digitos).
    const pending = { codigo, email: emailAlvo, senhaHash, telefone: telefone.replace(/\D/g, "") };
    if (c.env.KV_SESSIONS) {
      await c.env.KV_SESSIONS.put(`pa:${digits}`, JSON.stringify(pending), { expirationTtl: 600 });
      // Reserva o e-mail para este CPF enquanto o primeiro-acesso estiver pendente.
      await c.env.KV_SESSIONS.put(`pa:email:${emailAlvo}`, digits, { expirationTtl: 600 });
    }
    // Envia pro email QUE O SERVIDOR ESCOLHEU (nao pro cadastrado).
    // Primeiro-acesso: e o proprio servidor provando que aquele email e dele.
    // Nao respeitar o notifyEmail (override de teste dos perfis admin) — o codigo
    // TEM que ir pro email que o servidor digitou, senao ele nunca recebe.
    const r = await enviarCodigo(c.env, {
      destinoPadrao: email, contexto: "ativar seu acesso Atlas", codigo, respeitaOverride: false,
      templateFiltro: { evento: "primeiro_acesso", publico: "servidor" },
    });
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
    let pending: { codigo: string; email: string; senhaHash: string; telefone?: string };
    try { pending = JSON.parse(raw); } catch { throw Errors.unauthorized("Sessao invalida — solicite um novo codigo."); }
    if (pending.codigo !== codigo) throw Errors.unauthorized("Codigo invalido");
    // Grava senha + email + telefone (novos) em TODAS as matriculas desse CPF.
    const n = await setServidorPassword(c.env, digits, pending.senhaHash);
    if (n === 0) throw Errors.notFound("servidor");
    await setServidorContato(c.env, digits, { email: pending.email, telefone: pending.telefone });
    // Cache in-memory do isolate — login e 2FA funcionam imediatamente.
    SERVIDORES_BUSCA_MOCK.filter((x) => x.cpf === digits).forEach((x) => {
      x.passwordHash = pending.senhaHash;
      x.email = pending.email;
      if (pending.telefone) x.telefone = pending.telefone;
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
    const r = await enviarCodigo(c.env, {
      destinoPadrao: s.email, contexto: "redefinir sua senha Atlas", codigo, respeitaOverride: false,
      templateFiltro: { evento: "recuperar_senha", publico: "servidor" },
      nome: s.nome,
    });
    return c.json({
      enviado: r.sent,
      destino: maskEmail(r.destino || s.email),
      ...(r.sent ? {} : { codigo_teste: codigo, aviso: `E-mail não enviado (${r.reason}) — modo teste.` }),
    });
  })
  // 1b) Variante por E-MAIL: o servidor informa o e-mail que usou no primeiro acesso.
  //     Se bater com uma conta ativa, envia o código pra esse e-mail; senão, erro claro.
  .post("/v1/auth/esqueci-senha/solicitar-email", async (c) => {
    const { email } = z.object({ email: z.string().email("E-mail inválido") }).parse(await c.req.json());
    await ensureServidoresLoaded(c.env);
    const alvo = email.trim().toLowerCase();
    // Só conta ATIVA (com senha) — o e-mail tem que ser o mesmo do primeiro acesso.
    const s = SERVIDORES_BUSCA_MOCK.find(
      (x) => (x.email ?? "").trim().toLowerCase() === alvo && (Boolean(x.passwordHash) || devUserTemSenhaPorCpf(x.cpf)),
    );
    if (!s) throw Errors.validation({ email: "E-mail errado ou inexistente. Use o e-mail do seu primeiro acesso." });
    const codigo = await gerarCodigoUnico(c.env);
    if (c.env.KV_SESSIONS) await c.env.KV_SESSIONS.put(`rs:${s.cpf}`, codigo, { expirationTtl: 600 });
    const r = await enviarCodigo(c.env, {
      destinoPadrao: s.email, contexto: "redefinir sua senha Atlas", codigo, respeitaOverride: false,
      templateFiltro: { evento: "recuperar_senha", publico: "servidor" },
      nome: s.nome,
    });
    return c.json({
      enviado: r.sent,
      cpf: s.cpf, // o app usa no passo de redefinir
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
  // ==========================================================================
  // Reset UNIVERSAL: identifier = CPF (servidor) ou e-mail (banco/pref/averbadora).
  // Detecta o perfil pelo formato do identifier, dispara codigo pra o dono. Nao
  // revela QUAL perfil (evita enumeracao). Endpoints CPF/email legados acima
  // continuam funcionando pra retrocompat.
  // ==========================================================================
  .post("/v1/auth/esqueci-senha/universal-solicitar", async (c) => {
    const { identifier } = z.object({ identifier: z.string().min(3) }).parse(await c.req.json());
    const raw = identifier.trim();
    const cpfDigits = raw.replace(/\D/g, "");
    const isCpf = cpfDigits.length === 11 && !raw.includes("@");
    const isEmail = raw.includes("@");
    // Hidrata os 4 stores antes de resolver.
    await ensureServidoresLoaded(c.env);
    await ensurePerfisLoaded(c.env);

    let alvoEmail: string | undefined;
    let kvKey: string | undefined;   // chave que guarda o codigo (rs:<algo>)
    let perfil: "servidor" | "banco" | "prefeitura" | "averbadora" | null = null;

    if (isCpf) {
      const s = SERVIDORES_BUSCA_MOCK.find((x) => x.cpf === cpfDigits);
      if (s?.email) { alvoEmail = s.email; kvKey = `rs:${cpfDigits}`; perfil = "servidor"; }
    } else if (isEmail) {
      const email = raw.toLowerCase();
      const b = bancosStore.find((x) => x.loginEmail === email && x.status === "ativo");
      if (b) { alvoEmail = b.loginEmail; kvKey = `rs:banco:${b.id}`; perfil = "banco"; }
      if (!perfil) {
        const p = prefeiturasStore.find((x) => x.loginEmail === email && x.status === "ativo");
        if (p) { alvoEmail = p.loginEmail; kvKey = `rs:pref:${p.id}`; perfil = "prefeitura"; }
      }
      if (!perfil) {
        const u = findAverbadoraByEmail(email);
        if (u?.ativo) { alvoEmail = u.email; kvKey = `rs:av:${u.id}`; perfil = "averbadora"; }
      }
      // servidor tambem pode registrar email no primeiro-acesso.
      if (!perfil) {
        const s = SERVIDORES_BUSCA_MOCK.find((x) => (x.email ?? "").toLowerCase() === email);
        if (s?.email && s.passwordHash) { alvoEmail = s.email; kvKey = `rs:${s.cpf}`; perfil = "servidor"; }
      }
    }

    // Nao revela se existe (evita enumeracao). Retorna sucesso "silencioso" quando nao acha.
    if (!perfil || !alvoEmail || !kvKey) {
      return c.json({ enviado: false, destino: "", aviso: "Se este identificador existir, o codigo foi enviado." });
    }
    const codigo = await gerarCodigoUnico(c.env);
    if (c.env.KV_SESSIONS) await c.env.KV_SESSIONS.put(kvKey, codigo, { expirationTtl: 600 });
    const r = await enviarCodigo(c.env, {
      destinoPadrao: alvoEmail, contexto: "redefinir sua senha Atlas", codigo, respeitaOverride: false,
      templateFiltro: { evento: "recuperar_senha", publico: perfil },
    });
    return c.json({
      enviado: r.sent,
      destino: maskEmail(r.destino || alvoEmail),
      perfil, // usado pelo passo de redefinir
      ...(r.sent ? {} : { codigo_teste: codigo, aviso: `E-mail nao enviado (${r.reason}) — modo teste.` }),
    });
  })
  .post("/v1/auth/esqueci-senha/universal-redefinir", async (c) => {
    const { identifier, codigo, senha } = z
      .object({ identifier: z.string().min(3), codigo: z.string(), senha: z.string().min(8) })
      .parse(await c.req.json());
    if (!c.env.KV_SESSIONS) throw Errors.validation({ kv: "sessoes indisponiveis" });
    await ensureServidoresLoaded(c.env);
    await ensurePerfisLoaded(c.env);

    const raw = identifier.trim();
    const cpfDigits = raw.replace(/\D/g, "");
    const isCpf = cpfDigits.length === 11 && !raw.includes("@");
    const isEmail = raw.includes("@");
    const hash = await sha256Hex(senha);

    // Resolve QUEM e o dono e QUAL kv key foi usada — mesma logica do solicitar.
    if (isCpf) {
      const stored = await c.env.KV_SESSIONS.get(`rs:${cpfDigits}`);
      if (!stored || stored !== codigo) throw Errors.unauthorized("Codigo invalido ou expirado");
      const n = await setServidorPassword(c.env, cpfDigits, hash);
      if (n === 0) throw Errors.notFound("servidor");
      SERVIDORES_BUSCA_MOCK.filter((x) => x.cpf === cpfDigits).forEach((x) => { x.passwordHash = hash; });
      await c.env.KV_SESSIONS.delete(`rs:${cpfDigits}`);
      return c.json({ ok: true, perfil: "servidor" });
    }
    if (isEmail) {
      const email = raw.toLowerCase();
      const b = bancosStore.find((x) => x.loginEmail === email);
      if (b) {
        const stored = await c.env.KV_SESSIONS.get(`rs:banco:${b.id}`);
        if (!stored || stored !== codigo) throw Errors.unauthorized("Codigo invalido ou expirado");
        b.passwordHash = hash;
        await c.env.KV_SESSIONS.delete(`rs:banco:${b.id}`);
        return c.json({ ok: true, perfil: "banco" });
      }
      const p = prefeiturasStore.find((x) => x.loginEmail === email);
      if (p) {
        const stored = await c.env.KV_SESSIONS.get(`rs:pref:${p.id}`);
        if (!stored || stored !== codigo) throw Errors.unauthorized("Codigo invalido ou expirado");
        p.passwordHash = hash;
        await c.env.KV_SESSIONS.delete(`rs:pref:${p.id}`);
        return c.json({ ok: true, perfil: "prefeitura" });
      }
      const u = findAverbadoraByEmail(email);
      if (u) {
        const stored = await c.env.KV_SESSIONS.get(`rs:av:${u.id}`);
        if (!stored || stored !== codigo) throw Errors.unauthorized("Codigo invalido ou expirado");
        // Atualiza em memoria; upsert do proximo mutation persiste no PG. Pra
        // garantir a persistencia imediata, poderia chamar persistPerfis(env)
        // mas essa fn e privada de admin/index.ts. Deixamos best-effort aqui.
        u.passwordHash = hash;
        await c.env.KV_SESSIONS.delete(`rs:av:${u.id}`);
        return c.json({ ok: true, perfil: "averbadora" });
      }
      // Servidor por email (fluxo do primeiro-acesso).
      const s = SERVIDORES_BUSCA_MOCK.find((x) => (x.email ?? "").toLowerCase() === email);
      if (s) {
        const stored = await c.env.KV_SESSIONS.get(`rs:${s.cpf}`);
        if (!stored || stored !== codigo) throw Errors.unauthorized("Codigo invalido ou expirado");
        const n = await setServidorPassword(c.env, s.cpf, hash);
        if (n === 0) throw Errors.notFound("servidor");
        SERVIDORES_BUSCA_MOCK.filter((x) => x.cpf === s.cpf).forEach((x) => { x.passwordHash = hash; });
        await c.env.KV_SESSIONS.delete(`rs:${s.cpf}`);
        return c.json({ ok: true, perfil: "servidor" });
      }
    }
    throw Errors.notFound("identifier");
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
