import { Hono } from "hono";
import { z } from "zod";
import { authRequired, type JwtClaims } from "../../middleware/auth.js";
import { Errors } from "../../_shared/errors.js";
import type { Env } from "../../env.js";
import { CONVENIOS_MOCK, COMUNICADOS_MOCK, SERVIDORES_BUSCA_MOCK } from "../portal-banco/fixtures.js";
import { listContratos } from "../portal-banco/store.js";
import { createToken, deleteToken, listTokens, SCOPES_BY_AUDIENCE, sha256Hex, type ApiAudience, type ApiEnvironment, type ApiScope } from "./api-tokens.js";
import { sql } from "drizzle-orm";
import { getDb } from "../../db/client.js";
import { parseCsv, buildCsv, type ImportOutcome } from "../../_shared/csv.js";
import { WEBHOOK_EVENTS, createWebhook, fireEvent, listDeliveries, listWebhooks, removeWebhook, testWebhookEvents, toggleWebhook, type WebhookEvent } from "./webhooks.js";
import { getIdUnicoConfig, issueIdUnico, listIdUnicoConfigs, previewIdUnico, upsertIdUnicoConfig } from "./id-unico.js";
import { deleteConvenioConfig, getConvenioConfig, listConvenioConfigs, upsertConvenioConfig, type FormatoImportacao } from "./convenios-config.js";
import { cancelPreReserva, countExpiringNext24h, getPreReserva, listPreReservas, summarizePreReservas, sweepExpired, type PreReservaStatus } from "./pre-reservas.js";
import { importTombamento, listLinhas, listLotes } from "./tombamento.js";
import { bateCarteiraCsv, gerarBateCarteira } from "./bate-carteira.js";
import { appendAudit, auditCategorias, listAudit, type AuditCategoria } from "./auditoria.js";
import { deleteAverbadoraUser, disable2FA, listAverbadoraUsers, perfilOptions, rotateTotpSecret, upsertAverbadoraUser } from "./perfis-admin.js";

function requireAdmin(j: JwtClaims): void {
  if (j.role !== "averbadora") throw Errors.forbidden("Requer perfil averbadora");
}

// Lightweight in-memory stores for the admin views.
export interface BancoAdmin {
  id: number;
  nome: string;
  status: "ativo" | "pausado" | "inativo";
  adapter: "sandbox" | "ifractal";
  contatoEmail: string;
  loginEmail?: string;
  passwordHash?: string;
  scopes: string[];
  mtlsHabilitado: boolean;
  ultimoTeste?: string;
  ultimoTesteOk?: boolean;
}

// Strip secrets before returning over the wire.
export function sanitizeBanco(b: BancoAdmin) {
  const { passwordHash, ...rest } = b;
  return { ...rest, hasPassword: !!passwordHash };
}

export interface PrefeituraAdmin {
  id: number;
  nome: string;
  uf: string;
  municipioIbge: number;
  modoIntegracao: "REST" | "SOAP" | "CSV" | "MANUAL";
  status: "ativo" | "pausado";
  loginEmail?: string;
  passwordHash?: string;
  servidoresCount: number;
  ultimaSincronizacao?: string;
}

export function sanitizePrefeitura(p: PrefeituraAdmin) {
  const { passwordHash, ...rest } = p;
  return { ...rest, hasPassword: !!passwordHash };
}

export interface FolhaAdmin {
  id: string;
  prefeituraId: number;
  prefeitura: string;
  competencia: string;
  dataCorte: string;
  dataRepasse: string | null;
  status: "aberta" | "fechada" | "consolidada";
}

interface VitrineBanner {
  id: string;
  bancoId: number;
  bancoNome: string;
  titulo: string;
  imagemUrl?: string;
  impressoes: number;
  cliques: number;
  receitaMes: number;
  ativo: boolean;
}

export const bancos: BancoAdmin[] = [
  { id: 1, nome: "SCred Financeira", status: "ativo", adapter: "sandbox", contatoEmail: "ti@scred.com.br", scopes: ["propostas:rw", "margem:r"], mtlsHabilitado: false, ultimoTeste: "2026-06-22T10:00:00Z", ultimoTesteOk: true },
  { id: 2, nome: "Banco Y", status: "ativo", adapter: "sandbox", contatoEmail: "integracao@bancoy.com.br", scopes: ["propostas:rw"], mtlsHabilitado: true, ultimoTeste: "2026-06-22T09:30:00Z", ultimoTesteOk: true },
  { id: 3, nome: "Banco BMG", status: "pausado", adapter: "ifractal", contatoEmail: "consig@bmg.com.br", scopes: ["propostas:rw"], mtlsHabilitado: true, ultimoTeste: "2026-06-20T17:12:00Z", ultimoTesteOk: false },
];

export const prefeituras: PrefeituraAdmin[] = [
  { id: 1, nome: "Palhoca", uf: "SC", municipioIbge: 4211900, modoIntegracao: "REST", status: "ativo", servidoresCount: 2400, ultimaSincronizacao: "2026-06-22T03:14:00Z" },
  { id: 2, nome: "Florianopolis", uf: "SC", municipioIbge: 4205407, modoIntegracao: "SOAP", status: "ativo", servidoresCount: 1100, ultimaSincronizacao: "2026-06-22T03:21:00Z" },
  { id: 3, nome: "Joinville", uf: "SC", municipioIbge: 4209102, modoIntegracao: "CSV", status: "ativo", servidoresCount: 480, ultimaSincronizacao: "2026-06-21T22:00:00Z" },
];

export const folhas: FolhaAdmin[] = [
  { id: "F-2026-06-1", prefeituraId: 1, prefeitura: "Palhoca", competencia: "202606", dataCorte: "2026-06-15", dataRepasse: "2026-07-05", status: "fechada" },
  { id: "F-2026-06-2", prefeituraId: 2, prefeitura: "Florianopolis", competencia: "202606", dataCorte: "2026-06-18", dataRepasse: "2026-07-08", status: "fechada" },
  { id: "F-2026-07-1", prefeituraId: 1, prefeitura: "Palhoca", competencia: "202607", dataCorte: "2026-07-15", dataRepasse: null, status: "aberta" },
];

const vitrine: VitrineBanner[] = [
  { id: "BAN-1", bancoId: 2, bancoNome: "Banco Y", titulo: "Empréstimo a 1,72% a.m.", impressoes: 42000, cliques: 3360, receitaMes: 18000, ativo: true },
  { id: "BAN-2", bancoId: 1, bancoNome: "SCred Financeira", titulo: "Portabilidade com troco", impressoes: 28000, cliques: 1400, receitaMes: 9200, ativo: true },
];

// Status do servidor não vive na fixture (sempre "ativo"); override por matrícula.
type ServidorStatus = "ativo" | "bloqueado" | "arquivado";
const servidorStatusOverride = new Map<string, ServidorStatus>();

const _events: { ts: string; level: "info" | "warn" | "error"; trace_id: string; message: string; source: string }[] = [];
const pushEvent = (level: "info" | "warn" | "error", source: string, message: string, trace_id = randomTrace()) => {
  _events.unshift({ ts: new Date().toISOString(), level, trace_id, message, source });
  if (_events.length > 200) _events.length = 200;
};
function randomTrace(): string {
  return Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}
pushEvent("info", "system", "Atlas API initialized");
pushEvent("info", "auth", "Login OK servidor:00011122233");
pushEvent("warn", "bank", "BMG timeout after 1200ms (retry 1/3)");
pushEvent("info", "bank", "BMG retry 2/3 ok");
pushEvent("error", "webhook", "HMAC signature mismatch for banco_id=3");
pushEvent("info", "cron", "Folha Palhoca 202607 sincronizada");

// Public CSV templates (no auth — browsers download via plain GET).
function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}

export const csvTemplateRoutes = new Hono<{ Bindings: Env }>()
  .get("/v1/admin/bancos/csv-template", () => csvResponse("bancos-exemplo.csv", buildCsv(
    ["nome", "status", "adapter", "contatoEmail", "loginEmail", "password", "scopes", "mtlsHabilitado"],
    [
      { nome: "Banco Exemplo S.A.", status: "ativo", adapter: "sandbox", contatoEmail: "ti@banco.com.br", loginEmail: "operador@banco.com.br", password: "trocar123", scopes: "propostas:rw|margem:r", mtlsHabilitado: "false" },
      { nome: "Outro Banco", status: "pausado", adapter: "ifractal", contatoEmail: "integracao@outro.com.br", loginEmail: "", password: "", scopes: "propostas:rw", mtlsHabilitado: "true" },
    ],
  )))
  .get("/v1/admin/prefeituras/csv-template", () => csvResponse("prefeituras-exemplo.csv", buildCsv(
    ["nome", "uf", "municipioIbge", "modoIntegracao", "status", "loginEmail", "password"],
    [
      { nome: "Palhoca", uf: "SC", municipioIbge: 4211900, modoIntegracao: "REST", status: "ativo", loginEmail: "rh@palhoca.sc.gov.br", password: "trocar123" },
      { nome: "Joinville", uf: "SC", municipioIbge: 4209102, modoIntegracao: "CSV", status: "ativo", loginEmail: "", password: "" },
    ],
  )))
  .get("/v1/admin/convenios/csv-template", () => csvResponse("convenios-exemplo.csv", buildCsv(
    ["bancoId", "prefeituraId", "nome", "codigoVerba", "dataCorte", "diaRepasse"],
    [
      { bancoId: 1, prefeituraId: 1, nome: "PALHOCA / DELTA GLOBAL", codigoVerba: "1547 - DELTA GLOBAL I", dataCorte: 15, diaRepasse: 5 },
      { bancoId: 1, prefeituraId: 2, nome: "FLORIPA / DELTA GLOBAL", codigoVerba: "2210 - DELTA GLOBAL II", dataCorte: 18, diaRepasse: 8 },
    ],
  )))
  .get("/v1/admin/servidores/csv-template", () => csvResponse("servidores-exemplo.csv", buildCsv(
    ["cpf", "matricula", "nome", "dataAdmissao", "dataNascimento", "vinculo", "situacaoFuncional", "salarioLiquido"],
    [
      { cpf: "00011122233", matricula: "M-9001", nome: "Ana Carolina Silva", dataAdmissao: "17/04/2017", dataNascimento: "1985-03-12", vinculo: "ESTATUTARIO", situacaoFuncional: "TRABALHANDO", salarioLiquido: 4620.50 },
      { cpf: "00011122244", matricula: "M-9002", nome: "Joao da Silva Neves", dataAdmissao: "02/02/2010", dataNascimento: "1976-08-22", vinculo: "CLT", situacaoFuncional: "TRABALHANDO", salarioLiquido: 5840 },
    ],
  )));

export const adminRoutes = new Hono<{ Bindings: Env; Variables: { jwt: JwtClaims; trace_id: string } }>()
  // Escopado ao próprio prefixo — `.use("*")` vazaria para /v1/external/* quando montado em "/".
  .use("/v1/admin/*", authRequired)

  .get("/v1/admin/dashboard", async (c) => {
    requireAdmin(c.get("jwt"));
    const todosContratos = listContratos({});
    const totalVitrineMes = vitrine.reduce((acc, v) => acc + v.receitaMes, 0);
    sweepExpired();
    const preResumo = summarizePreReservas();
    const folhasAbertas = folhas.filter((f) => f.status === "aberta").length;
    const volumePorConvenio = todosContratos.reduce<Record<string, number>>((acc, c) => {
      acc[c.convenio] = (acc[c.convenio] ?? 0) + c.valorFinanciado;
      return acc;
    }, {});
    const volumePorBanco = todosContratos.reduce<Record<string, number>>((acc, c) => {
      const banco = bancos.find((b) => b.id === c.bancoId)?.nome ?? "—";
      acc[banco] = (acc[banco] ?? 0) + c.valorFinanciado;
      return acc;
    }, {});
    return c.json({
      kpis: {
        propostasHoje: todosContratos.length,
        conversao: 0.427,
        ticketMedio: todosContratos.length > 0 ? Math.round((todosContratos.reduce((a, c) => a + c.valorFinanciado, 0) / todosContratos.length) * 100) / 100 : 0,
        bancosAtivos: bancos.filter((b) => b.status === "ativo").length,
        prefeiturasAtivas: prefeituras.filter((p) => p.status === "ativo").length,
        servidoresCadastrados: prefeituras.reduce((a, p) => a + p.servidoresCount, 0),
        receitaVitrineMes: totalVitrineMes,
        preReservasAtivas: preResumo.ativas,
        preReservasExpirandoEm24h: countExpiringNext24h(),
        margemTravada: preResumo.margemTotalTravada,
        folhasAbertas,
      },
      topBancos: bancos.slice(0, 3).map((b) => ({ nome: b.nome, propostas: Math.floor(Math.random() * 500) + 100 })),
      topPrefeituras: prefeituras.slice(0, 3).map((p) => ({ nome: `${p.nome}/${p.uf}`, servidores: p.servidoresCount })),
      volumePorConvenio: Object.entries(volumePorConvenio).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor),
      volumePorBanco: Object.entries(volumePorBanco).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor),
    });
  })

  .get("/v1/admin/bancos", async (c) => {
    requireAdmin(c.get("jwt"));
    return c.json({ bancos: bancos.map(sanitizeBanco) });
  })
  .get("/v1/admin/bancos/:id", async (c) => {
    requireAdmin(c.get("jwt"));
    const b = bancos.find((x) => x.id === Number(c.req.param("id")));
    if (!b) throw Errors.notFound("banco");
    return c.json({ banco: sanitizeBanco(b) });
  })

  .get("/v1/admin/db/ping", async (c) => {
    requireAdmin(c.get("jwt"));
    const started = Date.now();
    const db = getDb(c.env);
    try {
      const meta = await db.execute(sql`SELECT current_database() AS db, version() AS pg_version, now() AS server_time`);
      // Uma única query agregada — count por tabela via pg_class.reltuples + UNION ALL para counts exatos.
      const counts = await db.execute(sql`
        SELECT relname AS table, n_live_tup::int AS n
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY relname
      `);
      const list = (counts as unknown as { table: string; n: number }[]).map((r) => ({ table: r.table, rows: r.n }));
      return c.json({
        transport: c.env.HYPERDRIVE ? "hyperdrive" : "direct",
        meta: (meta as unknown as { db: string; pg_version: string; server_time: string }[])[0],
        tables: list,
        latency_ms: Date.now() - started,
      });
    } catch (err) {
      return c.json({ error: { code: "db_ping_failed", message: (err as Error).message } }, 500);
    }
  })

  .post("/v1/admin/bancos", async (c) => {
    requireAdmin(c.get("jwt"));
    const body = z
      .object({
        id: z.number().int().optional(),
        nome: z.string(),
        status: z.enum(["ativo", "pausado", "inativo"]),
        adapter: z.enum(["sandbox", "ifractal"]),
        contatoEmail: z.string(),
        loginEmail: z.string().email().optional().or(z.literal("")),
        password: z.string().min(6).optional(),
        scopes: z.array(z.string()).default([]),
        mtlsHabilitado: z.boolean().default(false),
      })
      .parse(await c.req.json());
    const { password, loginEmail, ...rest } = body;
    const normalizedLogin = loginEmail ? loginEmail.trim().toLowerCase() : undefined;
    if (normalizedLogin) {
      const dup = bancos.find((b) => b.loginEmail === normalizedLogin && b.id !== body.id);
      if (dup) throw Errors.validation({ loginEmail: `Login ja em uso pelo banco ${dup.nome}` });
    }
    if (body.id) {
      const idx = bancos.findIndex((b) => b.id === body.id);
      if (idx < 0) throw Errors.notFound("banco");
      const current = bancos[idx]!;
      bancos[idx] = {
        ...current,
        ...rest,
        id: body.id,
        loginEmail: normalizedLogin ?? current.loginEmail,
        passwordHash: password ? await sha256Hex(password) : current.passwordHash,
      };
      pushEvent("info", "admin", `Banco "${bancos[idx]!.nome}" atualizado${password ? " (senha trocada)" : ""}`);
      return c.json({ banco: sanitizeBanco(bancos[idx]!) });
    }
    const novo: BancoAdmin = {
      ...rest,
      id: Math.max(...bancos.map((b) => b.id), 0) + 1,
      loginEmail: normalizedLogin,
      passwordHash: password ? await sha256Hex(password) : undefined,
    };
    bancos.push(novo);
    pushEvent("info", "admin", `Banco "${novo.nome}" criado${password ? " com credencial de acesso" : ""}`);
    return c.json({ banco: sanitizeBanco(novo) });
  })
  .post("/v1/admin/bancos/:id/testar-conexao", async (c) => {
    requireAdmin(c.get("jwt"));
    const b = bancos.find((x) => x.id === Number(c.req.param("id")));
    if (!b) throw Errors.notFound("banco");
    b.ultimoTeste = new Date().toISOString();
    b.ultimoTesteOk = b.adapter === "sandbox"; // sandbox sempre passa
    pushEvent(b.ultimoTesteOk ? "info" : "error", "admin", `Teste de conexao ${b.nome} ${b.ultimoTesteOk ? "OK" : "FALHOU"}`);
    return c.json({ ok: b.ultimoTesteOk, banco: sanitizeBanco(b) });
  })
  .post("/v1/admin/bancos/:id/reset-password", async (c) => {
    requireAdmin(c.get("jwt"));
    const b = bancos.find((x) => x.id === Number(c.req.param("id")));
    if (!b) throw Errors.notFound("banco");
    const body = z.object({ password: z.string().min(6) }).parse(await c.req.json());
    b.passwordHash = await sha256Hex(body.password);
    pushEvent("warn", "admin.bancos.reset-password", `Senha do banco "${b.nome}" trocada por user:${c.get("jwt").sub}`);
    return c.json({ banco: sanitizeBanco(b) });
  })

  .get("/v1/admin/prefeituras", async (c) => {
    requireAdmin(c.get("jwt"));
    return c.json({ prefeituras: prefeituras.map(sanitizePrefeitura) });
  })
  .post("/v1/admin/prefeituras", async (c) => {
    requireAdmin(c.get("jwt"));
    const body = z
      .object({
        id: z.number().int().optional(),
        nome: z.string(),
        uf: z.string().length(2),
        municipioIbge: z.number().int(),
        modoIntegracao: z.enum(["REST", "SOAP", "CSV", "MANUAL"]),
        status: z.enum(["ativo", "pausado"]),
        loginEmail: z.string().email().optional().or(z.literal("")),
        password: z.string().min(6).optional(),
        servidoresCount: z.number().int().default(0),
      })
      .parse(await c.req.json());
    const { password, loginEmail, ...rest } = body;
    const normalizedLogin = loginEmail ? loginEmail.trim().toLowerCase() : undefined;
    if (normalizedLogin) {
      const dup = prefeituras.find((p) => p.loginEmail === normalizedLogin && p.id !== body.id);
      if (dup) throw Errors.validation({ loginEmail: `Login ja em uso pela prefeitura ${dup.nome}` });
    }
    if (body.id) {
      const idx = prefeituras.findIndex((p) => p.id === body.id);
      if (idx < 0) throw Errors.notFound("prefeitura");
      const current = prefeituras[idx]!;
      prefeituras[idx] = {
        ...current,
        ...rest,
        id: body.id,
        loginEmail: normalizedLogin ?? current.loginEmail,
        passwordHash: password ? await sha256Hex(password) : current.passwordHash,
      };
      pushEvent("info", "admin", `Prefeitura "${prefeituras[idx]!.nome}" atualizada${password ? " (senha trocada)" : ""}`);
      return c.json({ prefeitura: sanitizePrefeitura(prefeituras[idx]!) });
    }
    const novo: PrefeituraAdmin = {
      ...rest,
      id: Math.max(...prefeituras.map((p) => p.id), 0) + 1,
      loginEmail: normalizedLogin,
      passwordHash: password ? await sha256Hex(password) : undefined,
    };
    prefeituras.push(novo);
    pushEvent("info", "admin", `Prefeitura "${novo.nome}/${novo.uf}" criada${password ? " com credencial de acesso" : ""}`);
    return c.json({ prefeitura: sanitizePrefeitura(novo) });
  })
  .post("/v1/admin/prefeituras/:id/sincronizar", async (c) => {
    requireAdmin(c.get("jwt"));
    const p = prefeituras.find((x) => x.id === Number(c.req.param("id")));
    if (!p) throw Errors.notFound("prefeitura");
    p.ultimaSincronizacao = new Date().toISOString();
    pushEvent("info", "cron", `Folha ${p.nome} sincronizada manualmente`);
    return c.json({ prefeitura: sanitizePrefeitura(p) });
  })
  .post("/v1/admin/prefeituras/:id/reset-password", async (c) => {
    requireAdmin(c.get("jwt"));
    const p = prefeituras.find((x) => x.id === Number(c.req.param("id")));
    if (!p) throw Errors.notFound("prefeitura");
    const body = z.object({ password: z.string().min(6) }).parse(await c.req.json());
    p.passwordHash = await sha256Hex(body.password);
    pushEvent("warn", "admin.prefeituras.reset-password", `Senha da prefeitura "${p.nome}" trocada por user:${c.get("jwt").sub}`);
    return c.json({ prefeitura: sanitizePrefeitura(p) });
  })

  .get("/v1/admin/convenios", async (c) => {
    requireAdmin(c.get("jwt"));
    const detalhado = CONVENIOS_MOCK.map((cv) => ({
      ...cv,
      bancoNome: bancos.find((b) => b.id === cv.bancoId)?.nome ?? "—",
      prefeituraNome: prefeituras.find((p) => p.id === cv.prefeituraId)?.nome ?? cv.prefeitura,
    }));
    return c.json({ convenios: detalhado });
  })

  .get("/v1/admin/servidores", async (c) => {
    requireAdmin(c.get("jwt"));
    const url = new URL(c.req.url);
    const prefeituraId = url.searchParams.get("prefeitura_id");
    const status = url.searchParams.get("status");
    let rows = SERVIDORES_BUSCA_MOCK.map((s) => ({
      id: Number(s.idMatricula.replace(/\D/g, "").slice(-5)),
      nome: s.nome,
      cpfMasked: s.cpfMasked,
      matricula: s.matricula,
      vinculo: s.vinculo,
      situacaoFuncional: s.situacaoFuncional,
      origem: s.origem,
      cpf: s.cpf,
      idConvenio: s.idConvenio,
      salarioLiquido: s.salarioLiquido,
      status: servidorStatusOverride.get(s.matricula) ?? ("ativo" as ServidorStatus),
      email: s.email ?? "",
      telefone: s.telefone ?? "",
      cargo: s.cargo ?? "",
      endereco: s.endereco ?? "",
      codigoIbge: s.codigoIbge ?? null,
      hasPassword: !!s.passwordHash,
    }));
    if (prefeituraId) {
      const p = prefeituras.find((x) => x.id === Number(prefeituraId));
      if (p) rows = rows.filter((r) => r.origem.toLowerCase().includes(p.nome.toLowerCase()));
    }
    if (status) rows = rows.filter((r) => r.status === status);
    return c.json({ servidores: rows, total: rows.length });
  })
  .patch("/v1/admin/servidores/:matricula", async (c) => {
    requireAdmin(c.get("jwt"));
    const matricula = c.req.param("matricula");
    const s = SERVIDORES_BUSCA_MOCK.find((x) => x.matricula === matricula);
    if (!s) throw Errors.notFound("servidor");
    const body = z
      .object({
        nome: z.string().min(2).optional(),
        cpf: z.string().regex(/^\d{11}$/, "CPF deve conter exatamente 11 dígitos").optional(),
        vinculo: z.enum(["CLT", "ESTATUTARIO", "COMISSIONADO"]).optional(),
        situacaoFuncional: z.string().min(1).optional(),
        salarioLiquido: z.number().nonnegative().optional(),
        idConvenio: z.string().optional(),
        status: z.enum(["ativo", "bloqueado", "arquivado"]).optional(),
        email: z.string().email().optional().or(z.literal("")),
        telefone: z.string().optional(),
        password: z.string().min(6).optional(),
      })
      .parse(await c.req.json());
    if (body.cpf !== undefined && body.cpf !== s.cpf) {
      const dup = SERVIDORES_BUSCA_MOCK.find((x) => x.cpf === body.cpf && x.matricula !== matricula);
      if (dup) throw Errors.validation({ cpf: `CPF já em uso pela matrícula ${dup.matricula}` });
      s.cpf = body.cpf;
      s.cpfMasked = `${body.cpf.slice(0, 3)}.***.***-${body.cpf.slice(-2)}`;
    }
    if (body.nome !== undefined) s.nome = body.nome;
    if (body.vinculo !== undefined) s.vinculo = body.vinculo;
    if (body.situacaoFuncional !== undefined) s.situacaoFuncional = body.situacaoFuncional;
    if (body.salarioLiquido !== undefined) s.salarioLiquido = body.salarioLiquido;
    if (body.idConvenio !== undefined) s.idConvenio = body.idConvenio;
    if (body.status !== undefined) servidorStatusOverride.set(matricula, body.status);
    if (body.email !== undefined) s.email = body.email || undefined;
    if (body.telefone !== undefined) s.telefone = body.telefone || undefined;
    if (body.password) s.passwordHash = await sha256Hex(body.password);
    const changed: string[] = [];
    if (body.cpf !== undefined) changed.push("cpf");
    if (body.nome !== undefined) changed.push("nome");
    if (body.vinculo !== undefined) changed.push("vinculo");
    if (body.situacaoFuncional !== undefined) changed.push("situacao");
    if (body.salarioLiquido !== undefined) changed.push("salario");
    if (body.idConvenio !== undefined) changed.push("convenio");
    if (body.status !== undefined) changed.push("status");
    if (body.email !== undefined) changed.push("email");
    if (body.telefone !== undefined) changed.push("telefone");
    if (body.password) changed.push("senha");
    pushEvent("info", "admin.servidores.update", `Servidor matricula=${matricula} atualizado (${changed.join(",")}) por user:${c.get("jwt").sub}`);
    return c.json({
      servidor: {
        id: Number(s.idMatricula.replace(/\D/g, "").slice(-5)),
        nome: s.nome,
        cpf: s.cpf,
        cpfMasked: s.cpfMasked,
        matricula: s.matricula,
        vinculo: s.vinculo,
        situacaoFuncional: s.situacaoFuncional,
        origem: s.origem,
        idConvenio: s.idConvenio,
        salarioLiquido: s.salarioLiquido,
        status: servidorStatusOverride.get(matricula) ?? "ativo",
        email: s.email ?? "",
        telefone: s.telefone ?? "",
        hasPassword: !!s.passwordHash,
      },
    });
  })

  .get("/v1/admin/folhas", async (c) => {
    requireAdmin(c.get("jwt"));
    return c.json({ folhas });
  })
  .post("/v1/admin/folhas", async (c) => {
    requireAdmin(c.get("jwt"));
    const body = z
      .object({
        id: z.string().optional(),
        prefeituraId: z.number().int(),
        prefeitura: z.string(),
        competencia: z.string(),
        dataCorte: z.string(),
        dataRepasse: z.string().nullable().optional(),
        status: z.enum(["aberta", "fechada", "consolidada"]),
      })
      .parse(await c.req.json());
    if (body.id) {
      const idx = folhas.findIndex((f) => f.id === body.id);
      if (idx < 0) throw Errors.notFound("folha");
      folhas[idx] = { ...folhas[idx]!, ...body, id: body.id, dataRepasse: body.dataRepasse ?? null };
      return c.json({ folha: folhas[idx] });
    }
    const novo: FolhaAdmin = { ...body, id: `F-${Date.now()}`, dataRepasse: body.dataRepasse ?? null };
    folhas.push(novo);
    return c.json({ folha: novo });
  })

  .get("/v1/admin/comunicados", async (c) => {
    requireAdmin(c.get("jwt"));
    return c.json({ comunicados: COMUNICADOS_MOCK });
  })

  .get("/v1/admin/health", async (c) => {
    requireAdmin(c.get("jwt"));
    return c.json({
      checks: [
        { servico: "banco SCred /propostas", uptime: 1, p95: 142, ok: true },
        { servico: "banco Y /propostas", uptime: 0.997, p95: 188, ok: true },
        { servico: "banco BMG /propostas", uptime: 0.962, p95: 820, ok: false },
        { servico: "prefeitura Palhoca /folha", uptime: 0.99, p95: 320, ok: true },
        { servico: "prefeitura Floripa /folha", uptime: 0.982, p95: 800, ok: true },
      ],
    });
  })

  .get("/v1/admin/logs", async (c) => {
    requireAdmin(c.get("jwt"));
    const url = new URL(c.req.url);
    const level = url.searchParams.get("level");
    const source = url.searchParams.get("source");
    let rows = _events;
    if (level) rows = rows.filter((e) => e.level === level);
    if (source) rows = rows.filter((e) => e.source === source);
    return c.json({ logs: rows.slice(0, 100) });
  })

  .get("/v1/admin/vitrine", async (c) => {
    requireAdmin(c.get("jwt"));
    return c.json({ banners: vitrine });
  })
  .post("/v1/admin/vitrine", async (c) => {
    requireAdmin(c.get("jwt"));
    const body = z
      .object({
        id: z.string().optional(),
        bancoId: z.number().int(),
        titulo: z.string(),
        imagemUrl: z.string().optional(),
        ativo: z.boolean().default(true),
      })
      .parse(await c.req.json());
    const banco = bancos.find((b) => b.id === body.bancoId);
    if (!banco) throw Errors.notFound("banco");
    if (body.id) {
      const idx = vitrine.findIndex((v) => v.id === body.id);
      if (idx < 0) throw Errors.notFound("banner");
      vitrine[idx] = { ...vitrine[idx]!, ...body, bancoNome: banco.nome };
      return c.json({ banner: vitrine[idx] });
    }
    const novo: VitrineBanner = {
      id: `BAN-${vitrine.length + 1}`,
      bancoNome: banco.nome,
      impressoes: 0,
      cliques: 0,
      receitaMes: 0,
      ...body,
    };
    vitrine.push(novo);
    return c.json({ banner: novo });
  })

  // ===== API Tokens =====
  .get("/v1/admin/api-tokens", authRequired, async (c) => {
    const j = c.get("jwt"); requireAdmin(j);
    const kv = c.env.KV_CACHE; if (!kv) throw Errors.bankUnavailable("KV não configurado");
    const env = c.req.query("environment") as ApiEnvironment | undefined;
    const aud = c.req.query("audience") as ApiAudience | undefined;
    const tokens = await listTokens(kv, { ...(env ? { environment: env } : {}), ...(aud ? { audience: aud } : {}) });
    return c.json({ tokens, scopesByAudience: SCOPES_BY_AUDIENCE });
  })
  .post("/v1/admin/api-tokens", authRequired, async (c) => {
    const j = c.get("jwt"); requireAdmin(j);
    const kv = c.env.KV_CACHE; if (!kv) throw Errors.bankUnavailable("KV não configurado");
    const body = z.object({
      name: z.string().min(2),
      environment: z.enum(["production", "sandbox"]),
      audience: z.enum(["banco", "servidor", "averbadora"]),
      partnerId: z.number().int().default(0),
      scopes: z.array(z.string()).min(1),
    }).parse(await c.req.json());
    const { token, plaintext } = await createToken(kv, {
      name: body.name,
      environment: body.environment,
      audience: body.audience as ApiAudience,
      partnerId: body.partnerId,
      scopes: body.scopes as ApiScope[],
      createdBy: `user:${j.sub}`,
    });
    return c.json({ token, plaintext, warning: "Guarde o plaintext agora. Nao sera exibido novamente." }, 201);
  })
  .delete("/v1/admin/api-tokens/:id", authRequired, async (c) => {
    const j = c.get("jwt"); requireAdmin(j);
    const kv = c.env.KV_CACHE; if (!kv) throw Errors.bankUnavailable("KV não configurado");
    const ok = await deleteToken(kv, c.req.param("id"));
    if (!ok) throw Errors.notFound("token");
    pushEvent("warn", "admin.api-tokens.delete", `Token ${c.req.param("id")} excluido permanentemente por user:${j.sub}`);
    return c.body(null, 204);
  })

  // ===== Webhooks (admin) =====
  .get("/v1/admin/webhooks", authRequired, async (c) => {
    const j = c.get("jwt"); requireAdmin(j);
    const env = c.req.query("environment") as ApiEnvironment | undefined;
    return c.json({ webhooks: listWebhooks(env ? { environment: env } : undefined), events: WEBHOOK_EVENTS });
  })
  .post("/v1/admin/webhooks", authRequired, async (c) => {
    const j = c.get("jwt"); requireAdmin(j);
    const body = z.object({
      audience: z.enum(["banco", "averbadora"]),
      partnerId: z.number().int().default(0),
      environment: z.enum(["production", "sandbox"]),
      url: z.string().url(),
      events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
    }).parse(await c.req.json());
    const { webhook, secret } = await createWebhook({
      audience: body.audience as ApiAudience,
      partnerId: body.partnerId,
      environment: body.environment,
      url: body.url,
      events: body.events as WebhookEvent[],
      createdBy: `user:${j.sub}`,
    });
    return c.json({ webhook, secret, warning: "Guarde o secret agora." }, 201);
  })
  .patch("/v1/admin/webhooks/:id/toggle", authRequired, async (c) => {
    const j = c.get("jwt"); requireAdmin(j);
    const w = toggleWebhook(c.req.param("id"));
    if (!w) throw Errors.notFound("webhook");
    return c.json({ webhook: w });
  })
  .delete("/v1/admin/webhooks/:id", authRequired, async (c) => {
    const j = c.get("jwt"); requireAdmin(j);
    const ok = removeWebhook(c.req.param("id"));
    if (!ok) throw Errors.notFound("webhook");
    return c.body(null, 204);
  })
  .get("/v1/admin/webhooks/:id/deliveries", authRequired, async (c) => {
    const j = c.get("jwt"); requireAdmin(j);
    return c.json({ deliveries: listDeliveries(c.req.param("id")) });
  })
  .post("/v1/admin/webhooks/fire", authRequired, async (c) => {
    const j = c.get("jwt"); requireAdmin(j);
    const body = z.object({
      event: z.enum(WEBHOOK_EVENTS),
      environment: z.enum(["production", "sandbox"]).default("sandbox"),
      payload: z.record(z.unknown()).default({}),
    }).parse(await c.req.json());
    const deliveries = await fireEvent(body.event, body.payload, { environment: body.environment });
    return c.json({ deliveries: deliveries.length });
  })
  // Test a webhook by delivering each event it is subscribed to (the exact ones
  // selected), so they all appear in the receiver.
  .post("/v1/admin/webhooks/:id/test", authRequired, async (c) => {
    const j = c.get("jwt"); requireAdmin(j);
    const deliveries = await testWebhookEvents(c.req.param("id"));
    if (!deliveries) throw Errors.notFound("webhook");
    return c.json({
      deliveries: deliveries.map((d) => ({
        id: d.id, event: d.event, status: d.status, httpStatus: d.httpStatus,
        attempt: d.attempt, error: d.error, deliveredAt: d.deliveredAt,
      })),
    });
  })

  // ===== CSV Import =====
  .post("/v1/admin/bancos/importar", authRequired, async (c) => {
    requireAdmin(c.get("jwt"));
    const text = await readCsvBody(c);
    const { rows } = parseCsv(text);
    const out: ImportOutcome<BancoAdmin> = { inserted: 0, updated: 0, skipped: 0, errors: [], rows: [] };
    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx]!;
      const line = idx + 2;
      if (!r.nome) { out.errors.push({ line, message: "nome obrigatorio" }); continue; }
      const loginEmail = r.loginEmail?.trim().toLowerCase() || undefined;
      const password = r.password?.trim() || undefined;
      if (password && password.length < 6) { out.errors.push({ line, message: "password deve ter ao menos 6 caracteres" }); continue; }
      const existing = bancos.find((b) => b.nome.toLowerCase() === r.nome!.toLowerCase());
      if (loginEmail) {
        const dup = bancos.find((b) => b.loginEmail === loginEmail && b.id !== existing?.id);
        if (dup) { out.errors.push({ line, message: `loginEmail ja em uso pelo banco ${dup.nome}` }); continue; }
      }
      const banco: BancoAdmin = {
        id: existing?.id ?? Math.max(0, ...bancos.map((b) => b.id)) + 1,
        nome: r.nome!,
        status: ((r.status ?? "ativo").toLowerCase() as BancoAdmin["status"]),
        adapter: ((r.adapter ?? "sandbox").toLowerCase() as BancoAdmin["adapter"]),
        contatoEmail: r.contatoEmail ?? "",
        loginEmail: loginEmail ?? existing?.loginEmail,
        passwordHash: password ? await sha256Hex(password) : existing?.passwordHash,
        scopes: (r.scopes ?? "propostas:rw").split("|").map((s) => s.trim()).filter(Boolean),
        mtlsHabilitado: r.mtlsHabilitado === "true" || r.mtlsHabilitado === "1",
      };
      if (existing) {
        Object.assign(existing, banco);
        out.updated++;
      } else {
        bancos.push(banco);
        out.inserted++;
      }
      out.rows.push(banco);
    }
    pushEvent("info", "admin.bancos.import", `${out.inserted} inseridos, ${out.updated} atualizados, ${out.errors.length} erros`);
    return c.json(out);
  })
  .post("/v1/admin/prefeituras/importar", authRequired, async (c) => {
    requireAdmin(c.get("jwt"));
    const text = await readCsvBody(c);
    const { rows } = parseCsv(text);
    const out: ImportOutcome<PrefeituraAdmin> = { inserted: 0, updated: 0, skipped: 0, errors: [], rows: [] };
    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx]!;
      const line = idx + 2;
      if (!r.nome) { out.errors.push({ line, message: "nome obrigatorio" }); continue; }
      if (!r.uf || r.uf.length !== 2) { out.errors.push({ line, message: "uf invalida (use 2 letras)" }); continue; }
      const ibge = Number(r.municipioIbge);
      if (!Number.isFinite(ibge)) { out.errors.push({ line, message: "municipioIbge deve ser numero" }); continue; }
      const loginEmail = r.loginEmail?.trim().toLowerCase() || undefined;
      const password = r.password?.trim() || undefined;
      if (password && password.length < 6) { out.errors.push({ line, message: "password deve ter ao menos 6 caracteres" }); continue; }
      const existing = prefeituras.find((p) => p.nome.toLowerCase() === r.nome!.toLowerCase() && p.uf === r.uf!.toUpperCase());
      if (loginEmail) {
        const dup = prefeituras.find((p) => p.loginEmail === loginEmail && p.id !== existing?.id);
        if (dup) { out.errors.push({ line, message: `loginEmail ja em uso pela prefeitura ${dup.nome}` }); continue; }
      }
      const p: PrefeituraAdmin = {
        id: existing?.id ?? Math.max(0, ...prefeituras.map((x) => x.id)) + 1,
        nome: r.nome!,
        uf: r.uf!.toUpperCase(),
        municipioIbge: ibge,
        modoIntegracao: ((r.modoIntegracao ?? "REST").toUpperCase() as PrefeituraAdmin["modoIntegracao"]),
        status: ((r.status ?? "ativo").toLowerCase() as PrefeituraAdmin["status"]),
        loginEmail: loginEmail ?? existing?.loginEmail,
        passwordHash: password ? await sha256Hex(password) : existing?.passwordHash,
        servidoresCount: existing?.servidoresCount ?? 0,
      };
      if (existing) { Object.assign(existing, p); out.updated++; }
      else { prefeituras.push(p); out.inserted++; }
      out.rows.push(p);
    }
    pushEvent("info", "admin.prefeituras.import", `${out.inserted} inseridos, ${out.updated} atualizados, ${out.errors.length} erros`);
    return c.json(out);
  })
  .post("/v1/admin/convenios/importar", authRequired, async (c) => {
    requireAdmin(c.get("jwt"));
    const text = await readCsvBody(c);
    const { rows } = parseCsv(text);
    const out: ImportOutcome<typeof CONVENIOS_MOCK[number]> = { inserted: 0, updated: 0, skipped: 0, errors: [], rows: [] };
    rows.forEach((r, idx) => {
      const line = idx + 2;
      const bancoId = Number(r.bancoId);
      const prefeituraId = Number(r.prefeituraId);
      if (!Number.isFinite(bancoId)) { out.errors.push({ line, message: "bancoId invalido" }); return; }
      if (!Number.isFinite(prefeituraId)) { out.errors.push({ line, message: "prefeituraId invalido" }); return; }
      if (!r.nome) { out.errors.push({ line, message: "nome obrigatorio" }); return; }
      const pref = prefeituras.find((p) => p.id === prefeituraId);
      if (!pref) { out.errors.push({ line, message: `prefeitura ${prefeituraId} nao encontrada` }); return; }
      const existing = CONVENIOS_MOCK.find((c) => c.nome.toLowerCase() === r.nome!.toLowerCase());
      const codigo = `CONV-${String(CONVENIOS_MOCK.length + out.inserted + 1).padStart(3, "0")}`;
      const conv = {
        id: existing?.id ?? codigo,
        bancoId,
        prefeituraId,
        nome: r.nome!,
        prefeitura: pref.nome,
        uf: pref.uf,
        codigoVerba: r.codigoVerba ?? "",
        dataCorte: Number(r.dataCorte) || 15,
        diaRepasse: Number(r.diaRepasse) || 5,
      };
      if (existing) { Object.assign(existing, conv); out.updated++; }
      else { CONVENIOS_MOCK.push(conv); out.inserted++; }
      out.rows.push(conv);
    });
    pushEvent("info", "admin.convenios.import", `${out.inserted} inseridos, ${out.updated} atualizados, ${out.errors.length} erros`);
    return c.json(out);
  })
  // ===== Convenios CRUD + Config (passos 5 e 13) =====
  .post("/v1/admin/convenios", async (c) => {
    requireAdmin(c.get("jwt"));
    const body = z
      .object({
        id: z.string().optional(),
        bancoId: z.number().int(),
        prefeituraId: z.number().int(),
        nome: z.string().min(2),
        codigoVerba: z.string().min(1),
        dataCorte: z.number().int().min(1).max(31),
        diaRepasse: z.number().int().min(1).max(31),
      })
      .parse(await c.req.json());
    const pref = prefeituras.find((p) => p.id === body.prefeituraId);
    if (!pref) throw Errors.notFound("prefeitura");
    if (!bancos.find((b) => b.id === body.bancoId)) throw Errors.notFound("banco");
    if (body.id) {
      const idx = CONVENIOS_MOCK.findIndex((c) => c.id === body.id);
      if (idx < 0) throw Errors.notFound("convenio");
      const current = CONVENIOS_MOCK[idx]!;
      CONVENIOS_MOCK[idx] = { ...current, ...body, id: body.id, prefeitura: pref.nome, uf: pref.uf };
      pushEvent("info", "admin.convenios", `Convenio "${CONVENIOS_MOCK[idx]!.nome}" atualizado`);
      return c.json({ convenio: CONVENIOS_MOCK[idx] });
    }
    const id = `CONV-${String(CONVENIOS_MOCK.length + 1).padStart(3, "0")}`;
    const novo = { ...body, id, prefeitura: pref.nome, uf: pref.uf };
    CONVENIOS_MOCK.push(novo);
    pushEvent("info", "admin.convenios", `Convenio "${novo.nome}" criado`);
    return c.json({ convenio: novo });
  })
  .delete("/v1/admin/convenios/:id", async (c) => {
    requireAdmin(c.get("jwt"));
    const id = c.req.param("id");
    const idx = CONVENIOS_MOCK.findIndex((cv) => cv.id === id);
    if (idx < 0) throw Errors.notFound("convenio");
    const removido = CONVENIOS_MOCK.splice(idx, 1)[0]!;
    deleteConvenioConfig(id);
    pushEvent("warn", "admin.convenios", `Convenio "${removido.nome}" removido por user:${c.get("jwt").sub}`);
    return c.body(null, 204);
  })
  .get("/v1/admin/convenios/:id/config", async (c) => {
    requireAdmin(c.get("jwt"));
    const id = c.req.param("id");
    if (!CONVENIOS_MOCK.find((cv) => cv.id === id)) throw Errors.notFound("convenio");
    return c.json({ config: getConvenioConfig(id) ?? null });
  })
  .get("/v1/admin/convenios-configs", async (c) => {
    requireAdmin(c.get("jwt"));
    return c.json({ configs: listConvenioConfigs() });
  })
  .post("/v1/admin/convenios/:id/config", async (c) => {
    requireAdmin(c.get("jwt"));
    const id = c.req.param("id");
    if (!CONVENIOS_MOCK.find((cv) => cv.id === id)) throw Errors.notFound("convenio");
    const body = z
      .object({
        prazoTravaHoras: z.number().int().min(1).max(720).default(48),
        prazoPortabilidadeDU: z.number().int().min(1).max(30).default(7),
        maxParcelas: z.number().int().min(1).max(120).default(72),
        taxaMaxAm: z.number().min(0).max(20),
        idadeMin: z.number().int().min(0).max(120).default(18),
        idadeMax: z.number().int().min(1).max(120).default(80),
        vinculosAceitos: z.array(z.enum(["CLT", "ESTATUTARIO", "COMISSIONADO", "APOSENTADO", "PENSIONISTA"])).min(1),
        formatoImportacao: z.enum(["CSV", "EXCEL", "API"]),
        regrasEspeciais: z.string().max(2000).default(""),
        vigenciaInicio: z.string(),
        vigenciaFim: z.string().optional(),
        ativo: z.boolean().default(true),
      })
      .parse(await c.req.json());
    const config = upsertConvenioConfig({ id, ...body });
    appendAudit({ categoria: "convenio_config", acao: "config_atualizada", userId: `averbadora:${c.get("jwt").sub}`, userRole: "averbadora", detalhes: `Config do convenio ${id} atualizada (prazoTrava=${body.prazoTravaHoras}h, formato=${body.formatoImportacao}).` });
    pushEvent("info", "admin.convenios.config", `Config do convenio ${id} salva por user:${c.get("jwt").sub}`);
    return c.json({ config });
  })

  // ===== ID Único — config + preview/issue (passo 10) =====
  .get("/v1/admin/id-unico/configs", async (c) => {
    requireAdmin(c.get("jwt"));
    return c.json({
      configs: listIdUnicoConfigs().map((cfg) => ({
        ...cfg,
        prefeituraNome: prefeituras.find((p) => p.id === cfg.prefeituraId)?.nome ?? "?",
        exemplo: previewIdUnico(cfg.prefeituraId),
      })),
    });
  })
  .post("/v1/admin/id-unico/configs", async (c) => {
    requireAdmin(c.get("jwt"));
    const body = z
      .object({
        prefeituraId: z.number().int(),
        prefixo: z.string().regex(/^[A-Z0-9]{2,8}$/, "prefixo: 2-8 letras maiusculas/digitos"),
        formato: z.enum(["SEQ", "SEQ_HASH", "YYYYMM_SEQ"] as const),
        larguraSeq: z.number().int().min(3).max(10),
        proximoSeq: z.number().int().min(1),
        separador: z.string().max(2).default("-"),
      })
      .parse(await c.req.json());
    if (!prefeituras.find((p) => p.id === body.prefeituraId)) throw Errors.notFound("prefeitura");
    const cfg = upsertIdUnicoConfig(body);
    appendAudit({ categoria: "id_unico", acao: "config_atualizada", userId: `averbadora:${c.get("jwt").sub}`, userRole: "averbadora", detalhes: `Config ID Unico prefeitura=${body.prefeituraId} prefixo=${body.prefixo} formato=${body.formato}.` });
    pushEvent("info", "admin.id-unico", `Config ID-Unico prefeitura=${body.prefeituraId} salva`);
    return c.json({ config: cfg, exemplo: previewIdUnico(cfg.prefeituraId) });
  })
  .post("/v1/admin/id-unico/issue", async (c) => {
    requireAdmin(c.get("jwt"));
    const body = z.object({ prefeituraId: z.number().int() }).parse(await c.req.json());
    if (!getIdUnicoConfig(body.prefeituraId)) throw Errors.notFound("id_unico_config");
    const id = issueIdUnico(body.prefeituraId);
    appendAudit({ categoria: "id_unico", acao: "id_emitido", idUnico: id, userId: `averbadora:${c.get("jwt").sub}`, userRole: "averbadora", detalhes: `ID Unico ${id} emitido manualmente para prefeitura=${body.prefeituraId}.` });
    return c.json({ idUnico: id });
  })

  // ===== Pre-reservas e travas (passo 8) =====
  .get("/v1/admin/pre-reservas", async (c) => {
    requireAdmin(c.get("jwt"));
    sweepExpired();
    const url = new URL(c.req.url);
    const status = url.searchParams.get("status") as PreReservaStatus | null;
    const prefeituraId = Number(url.searchParams.get("prefeitura_id"));
    const bancoId = Number(url.searchParams.get("banco_id"));
    const list = listPreReservas({
      status: status ?? undefined,
      prefeituraId: Number.isFinite(prefeituraId) ? prefeituraId : undefined,
      bancoId: Number.isFinite(bancoId) ? bancoId : undefined,
    });
    return c.json({ preReservas: list, resumo: summarizePreReservas() });
  })
  .post("/v1/admin/pre-reservas/:id/cancelar", async (c) => {
    requireAdmin(c.get("jwt"));
    const id = c.req.param("id");
    const body = z.object({ motivo: z.string().min(3).max(200) }).parse(await c.req.json());
    const existing = getPreReserva(id);
    if (!existing) throw Errors.notFound("pre_reserva");
    const r = cancelPreReserva(id, `averbadora:${c.get("jwt").sub}`, body.motivo);
    if (!r) throw Errors.notFound("pre_reserva");
    appendAudit({ categoria: "margem", acao: "pre_reserva_cancelada", propostaId: id, idUnico: r.idUnico, matricula: r.matricula, cpf: r.servidorCpfMasked, userId: `averbadora:${c.get("jwt").sub}`, userRole: "averbadora", detalhes: `Pre-reserva ${id} cancelada manualmente. Motivo: ${body.motivo}. Margem R$ ${r.valorMargem.toFixed(2)} liberada.` });
    pushEvent("warn", "admin.pre-reservas", `Pre-reserva ${id} cancelada por user:${c.get("jwt").sub}`);
    return c.json({ preReserva: r });
  })
  .post("/v1/admin/pre-reservas/sweep", async (c) => {
    requireAdmin(c.get("jwt"));
    const expiradas = sweepExpired();
    for (const r of expiradas) {
      appendAudit({ categoria: "margem", acao: "margem_liberada", propostaId: r.id, idUnico: r.idUnico, matricula: r.matricula, cpf: r.servidorCpfMasked, detalhes: `Pre-reserva ${r.id} expirou por TTL. Margem R$ ${r.valorMargem.toFixed(2)} liberada automaticamente.` });
    }
    return c.json({ expiradas: expiradas.length });
  })

  // ===== Tombamento de contratos (passo 9) =====
  .get("/v1/admin/tombamento/lotes", async (c) => {
    requireAdmin(c.get("jwt"));
    const url = new URL(c.req.url);
    const prefeituraId = Number(url.searchParams.get("prefeitura_id"));
    const competencia = url.searchParams.get("competencia") ?? undefined;
    const lotes = listLotes({
      prefeituraId: Number.isFinite(prefeituraId) ? prefeituraId : undefined,
      competencia,
    });
    return c.json({ lotes });
  })
  .get("/v1/admin/tombamento/lotes/:id/linhas", async (c) => {
    requireAdmin(c.get("jwt"));
    const linhas = listLinhas(c.req.param("id"));
    return c.json({ linhas });
  })
  .post("/v1/admin/tombamento/importar", async (c) => {
    requireAdmin(c.get("jwt"));
    const body = z.object({
      prefeituraId: z.number().int(),
      competencia: z.string().regex(/^\d{6}$/, "competencia formato YYYYMM"),
      csv: z.string().min(1),
    }).parse(await c.req.json());
    const pref = prefeituras.find((p) => p.id === body.prefeituraId);
    if (!pref) throw Errors.notFound("prefeitura");
    const result = importTombamento({
      prefeituraId: body.prefeituraId,
      prefeituraNome: pref.nome,
      competencia: body.competencia,
      recebidoPor: `averbadora:${c.get("jwt").sub}`,
      csv: body.csv,
    });
    appendAudit({ categoria: "tombamento", acao: "lote_processado", detalhes: `Lote ${result.lote.id} (${pref.nome}/${body.competencia}): ${result.inseridos} inseridos, ${result.atualizados} atualizados, ${result.divergencias} divergencias, ${result.erros.length} erros.` });
    pushEvent("info", "admin.tombamento", `Lote ${result.lote.id} processado por user:${c.get("jwt").sub}`);
    return c.json(result);
  })
  .get("/v1/admin/tombamento/csv-template", () => csvResponse("tombamento-exemplo.csv", buildCsv(
    ["cpfMasked", "matricula", "bancoNome", "adfBanco", "valorParcela", "parcelasRestantes", "saldoDevedor"],
    [
      { cpfMasked: "000.***.***-33", matricula: "M-9001", bancoNome: "SCred Financeira", adfBanco: "9000123", valorParcela: 320.5, parcelasRestantes: 70, saldoDevedor: 22435 },
      { cpfMasked: "000.***.***-44", matricula: "M-9002", bancoNome: "Banco Y", adfBanco: "9000124", valorParcela: 180, parcelasRestantes: 58, saldoDevedor: 10440 },
    ],
  )))

  // ===== Bate-de-carteira (passo 11) =====
  .post("/v1/admin/bate-carteira", async (c) => {
    requireAdmin(c.get("jwt"));
    const body = z.object({
      bancoId: z.number().int(),
      competencia: z.string().regex(/^\d{6}$/),
      prefeituraId: z.number().int().optional(),
      format: z.enum(["json", "csv"]).default("json"),
    }).parse(await c.req.json());
    const banco = bancos.find((b) => b.id === body.bancoId);
    if (!banco) throw Errors.notFound("banco");
    const resolver = (id: number) => bancos.find((b) => b.id === id)?.nome ?? "?";
    const r = gerarBateCarteira({ bancoId: body.bancoId, competencia: body.competencia, prefeituraId: body.prefeituraId }, resolver);
    appendAudit({ categoria: "tombamento", acao: "bate_carteira_gerado", userId: `averbadora:${c.get("jwt").sub}`, userRole: "averbadora", detalhes: `Bate-de-carteira ${banco.nome}/${body.competencia}: ${r.totalLinhas} linhas, saldo R$ ${r.somaSaldoDevedor.toFixed(2)}.` });
    if (body.format === "csv") {
      return csvResponse(`bate-carteira-${banco.nome.replace(/\s+/g, "-")}-${body.competencia}.csv`, bateCarteiraCsv(r));
    }
    return c.json(r);
  })

  // ===== Auditoria (passo 12) =====
  .get("/v1/admin/auditoria", async (c) => {
    requireAdmin(c.get("jwt"));
    const url = new URL(c.req.url);
    const categoria = url.searchParams.get("categoria") as AuditCategoria | null;
    const cpf = url.searchParams.get("cpf") ?? undefined;
    const matricula = url.searchParams.get("matricula") ?? undefined;
    const propostaId = url.searchParams.get("proposta_id") ?? undefined;
    const desde = url.searchParams.get("desde") ?? undefined;
    const ate = url.searchParams.get("ate") ?? undefined;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 200), 500);
    const entries = listAudit({ categoria: categoria ?? undefined, cpf, matricula, propostaId, desde, ate }, limit);
    return c.json({ entries, categorias: auditCategorias() });
  })

  // ===== Perfis admin (passo 1: perfis + 2FA) =====
  .get("/v1/admin/perfis", async (c) => {
    requireAdmin(c.get("jwt"));
    return c.json({ usuarios: listAverbadoraUsers(), perfis: perfilOptions() });
  })
  .post("/v1/admin/perfis", async (c) => {
    requireAdmin(c.get("jwt"));
    const body = z.object({
      id: z.number().int().optional(),
      nome: z.string().min(2),
      email: z.string().email(),
      perfil: z.enum(["operador", "supervisor", "comercial", "financeiro", "auditoria"] as const),
      ativo: z.boolean().default(true),
      password: z.string().min(6).optional(),
      twoFactorEnabled: z.boolean().optional(),
    }).parse(await c.req.json());
    const u = await upsertAverbadoraUser(body);
    appendAudit({ categoria: "acesso", acao: body.id ? "usuario_atualizado" : "usuario_criado", userId: `averbadora:${c.get("jwt").sub}`, userRole: "averbadora", detalhes: `Usuario averbadora ${u.email} (perfil=${u.perfil}, 2FA=${u.twoFactorEnabled}) ${body.id ? "atualizado" : "criado"}.` });
    return c.json({ usuario: u });
  })
  .post("/v1/admin/perfis/:id/2fa/rotate", async (c) => {
    requireAdmin(c.get("jwt"));
    const id = Number(c.req.param("id"));
    const r = rotateTotpSecret(id);
    if (!r) throw Errors.notFound("usuario");
    appendAudit({ categoria: "acesso", acao: "2fa_rotacionado", userId: `averbadora:${c.get("jwt").sub}`, userRole: "averbadora", detalhes: `2FA do usuario id=${id} rotacionado. Novo secret deve ser entregue uma unica vez.` });
    return c.json(r);
  })
  .post("/v1/admin/perfis/:id/2fa/disable", async (c) => {
    requireAdmin(c.get("jwt"));
    const id = Number(c.req.param("id"));
    if (!disable2FA(id)) throw Errors.notFound("usuario");
    appendAudit({ categoria: "acesso", acao: "2fa_desativado", userId: `averbadora:${c.get("jwt").sub}`, userRole: "averbadora", detalhes: `2FA do usuario id=${id} desativado.` });
    return c.json({ ok: true });
  })
  .delete("/v1/admin/perfis/:id", async (c) => {
    requireAdmin(c.get("jwt"));
    const id = Number(c.req.param("id"));
    if (!deleteAverbadoraUser(id)) throw Errors.notFound("usuario");
    appendAudit({ categoria: "acesso", acao: "usuario_removido", userId: `averbadora:${c.get("jwt").sub}`, userRole: "averbadora", detalhes: `Usuario averbadora id=${id} removido.` });
    return c.body(null, 204);
  })

  .post("/v1/admin/servidores/importar", authRequired, async (c) => {
    requireAdmin(c.get("jwt"));
    const prefId = Number(c.req.query("prefeituraId"));
    if (!Number.isFinite(prefId)) throw Errors.validation({ prefeituraId: "obrigatorio (use ?prefeituraId=N)" });
    const pref = prefeituras.find((p) => p.id === prefId);
    if (!pref) throw Errors.notFound("prefeitura");
    const conveniosPref = CONVENIOS_MOCK.filter((cv) => cv.prefeituraId === prefId);
    const defaultConvenioId = conveniosPref[0]?.id ?? "";
    const text = await readCsvBody(c);
    const { rows } = parseCsv(text);
    const out: ImportOutcome<typeof SERVIDORES_BUSCA_MOCK[number]> = { inserted: 0, updated: 0, skipped: 0, errors: [], rows: [] };
    rows.forEach((r, idx) => {
      const line = idx + 2;
      const cpf = (r.cpf ?? "").replace(/\D/g, "");
      if (cpf.length !== 11) { out.errors.push({ line, message: "cpf deve ter 11 digitos" }); return; }
      if (!r.nome) { out.errors.push({ line, message: "nome obrigatorio" }); return; }
      if (!r.matricula) { out.errors.push({ line, message: "matricula obrigatoria" }); return; }
      // idConvenio: usa o do CSV se pertencer a esta prefeitura; caso contrário (vazio ou de outra)
      // cai silenciosamente no convênio padrão da prefeitura selecionada.
      let idConvenio = (r.idConvenio ?? "").trim();
      if (idConvenio && !conveniosPref.some((cv) => cv.id === idConvenio)) {
        idConvenio = defaultConvenioId;
      }
      if (!idConvenio) idConvenio = defaultConvenioId;
      if (!idConvenio) { out.errors.push({ line, message: `prefeitura ${pref.nome} nao possui convenios cadastrados` }); return; }
      const existing = SERVIDORES_BUSCA_MOCK.find((s) => s.cpf === cpf);
      const salario = Number(r.salarioLiquido);
      const s = {
        cpf,
        cpfMasked: cpf.slice(0, 3) + ".***.***-" + cpf.slice(-2),
        matricula: r.matricula!,
        idMatricula: `MAT-${r.matricula!}`,
        nome: r.nome!,
        dataAdmissao: r.dataAdmissao ?? "",
        dataNascimento: r.dataNascimento ?? "",
        vinculo: r.vinculo ?? "ESTATUTARIO",
        origem: pref.nome,
        situacaoFuncional: r.situacaoFuncional ?? "TRABALHANDO",
        salarioLiquido: Number.isFinite(salario) ? salario : 0,
        idConvenio,
      };
      if (existing) { Object.assign(existing, s); out.updated++; }
      else { SERVIDORES_BUSCA_MOCK.push(s); out.inserted++; }
      out.rows.push(s);
    });
    pushEvent("info", "admin.servidores.import", `prefeitura=${pref.nome}: ${out.inserted} inseridos, ${out.updated} atualizados, ${out.errors.length} erros`);
    return c.json(out);
  });

async function readCsvBody(c: { req: { json: () => Promise<unknown>; text: () => Promise<string>; header: (n: string) => string | undefined } }): Promise<string> {
  const ct = c.req.header("content-type") ?? "";
  if (ct.includes("application/json")) {
    const j = (await c.req.json()) as { csv?: string };
    return j.csv ?? "";
  }
  return await c.req.text();
}
