import { Hono } from "hono";
import { z } from "zod";
import { authRequired, type JwtClaims } from "../../middleware/auth.js";
import { Errors } from "../../_shared/errors.js";
import type { Env } from "../../env.js";
import { CONVENIOS_MOCK, COMUNICADOS_MOCK, SERVIDORES_BUSCA_MOCK, prefeituraIdDe, type ServidorBuscaMock } from "../portal-banco/fixtures.js";
import { listContratos, refreshContratos, aplicarAcao, persistContrato } from "../portal-banco/store.js";
import { refreshConvenios, persistConvenio, nextConvenioId } from "../portal-banco/convenios-store.js";
import { createToken, setTokenPaused, listTokens, SCOPES_BY_AUDIENCE, sha256Hex, type ApiAudience, type ApiEnvironment, type ApiScope } from "./api-tokens.js";
import { sql } from "drizzle-orm";
import { getDb } from "../../db/client.js";
import { ensureSchema, loadBancos, seedBancosIfEmpty, upsertBanco, deleteBancoRow, loadPrefeituras, seedPrefeiturasIfEmpty, upsertPrefeitura, deletePrefeituraRow, loadServidores, seedServidoresIfEmpty, upsertServidor, reseedAll, appendLog, loadLogs, loadCollection, upsertCollectionRow, seedCollectionIfEmpty } from "../../db/repos.js";
import type { AppLogRow } from "../../db/repos.js";
import { parseCsv, buildCsv, type ImportOutcome } from "../../_shared/csv.js";
import { WEBHOOK_EVENTS, createWebhook, setWebhooksPausedForPartner, fireEvent, listDeliveries, listWebhooks, testWebhookEvents, type WebhookEvent } from "./webhooks.js";
import { getIdUnicoConfig, issueIdUnico, listIdUnicoConfigs, previewIdUnico, upsertIdUnicoConfig } from "./id-unico.js";
import { getConvenioConfig, listConvenioConfigs, upsertConvenioConfig, type FormatoImportacao } from "./convenios-config.js";
import type { PreReserva, PreReservaStatus, PreReservaSummary } from "./pre-reservas.js";
import { importTombamento, listLinhas, listLotes } from "./tombamento.js";
import { bateCarteiraCsv, gerarBateCarteira } from "./bate-carteira.js";
import { appendAudit, auditCategorias, listAudit, type AuditCategoria } from "./auditoria.js";
import { deleteAverbadoraUser, reactivateAverbadoraUser, disable2FA, getAverbadoraUser, listAverbadoraUsers, perfilOptions, rotateTotpSecret, upsertAverbadoraUser, exportUsersRaw, hydrateUsers, type AverbadoraUser } from "./perfis-admin.js";
import { clearAiKey, getAiStatus, normalizeCsvWithAi, setAiKey, testAiKey } from "./ai.js";
import { clearSmtpConfig, getSmtpStatus, setSmtpConfig } from "./smtp.js";
import { sendMail } from "./mailer.js";

// ============================================================
// Confirmacao step-up por email (acoes destrutivas: excluir banco/prefeitura).
// Codigo REAL de 6 digitos guardado em KV com TTL de 10min. Sem provider de
// email, o codigo e revelado na resposta (campo `codigoDemo`) pro modo demo.
// ============================================================
const CONFIRM_TTL_S = 600;

function emailDoOperador(j: JwtClaims): string {
  return getAverbadoraUser(Number(j.sub))?.email ?? "operador@atlas.io";
}
function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const shown = user.slice(0, Math.min(3, user.length));
  return `${shown}${"*".repeat(Math.max(3, user.length - shown.length))}@${domain}`;
}
// DEMONSTRACAO: codigo fixo 000000. Para voltar a gerar codigo real (quando
// houver provider de email), troque por: crypto.getRandomValues + padStart.
const CODIGO_DEMO_FIXO = "000000";
function gerarCodigo6(): string {
  return CODIGO_DEMO_FIXO;
}
interface ConfirmacaoPayload { sub: string; acao: string; recurso: string; codigo: string; exp: number; }

/** Valida o desafio de confirmacao. One-time: consome a chave no sucesso. */
async function verificarConfirmacao(
  env: Env, j: JwtClaims, challengeId: string, codigo: string, acao: string, recurso: string,
): Promise<void> {
  if (!env.KV_SESSIONS) throw Errors.validation({ codigo: "Confirmacao indisponivel (sem KV)." });
  const raw = challengeId ? await env.KV_SESSIONS.get(`confirm:${challengeId}`) : null;
  if (!raw) throw Errors.validation({ codigo: "Codigo expirado ou inexistente. Solicite um novo." });
  const p = JSON.parse(raw) as ConfirmacaoPayload;
  if (p.sub !== String(j.sub) || p.acao !== acao || p.recurso !== recurso) {
    throw Errors.forbidden("Confirmacao nao corresponde a esta acao.");
  }
  if (Date.now() > p.exp) { await env.KV_SESSIONS.delete(`confirm:${challengeId}`); throw Errors.validation({ codigo: "Codigo expirado. Solicite um novo." }); }
  if (p.codigo !== String(codigo).replace(/\D/g, "")) throw Errors.validation({ codigo: "Codigo incorreto." });
  await env.KV_SESSIONS.delete(`confirm:${challengeId}`);
}

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
  status: "ativo" | "pausado" | "inativo";
  loginEmail?: string;
  /** E-mail de contato do responsável da prefeitura (persistido). Separado do loginEmail. */
  contatoEmail?: string;
  passwordHash?: string;
  servidoresCount: number;
  ultimaSincronizacao?: string;
  /** URL publica de CSV da folha (modo CSV). GET faz fetch, parseia e upserta. */
  folhaSincUrl?: string;
  /** Resultado da ultima sincronizacao (novos/atualizados/removidos/erro). */
  ultimaSincResultado?: { novos: number; atualizados: number; erro?: string; ts: string };
  /** Exigências que a prefeitura impõe ao banco na averbação (algumas exigem, outras não). */
  exigeCcb?: boolean;
  exigeBanco2FA?: boolean;
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

// Banco padrao unico. O cliente opera hoje so com o Banco Atlas; parceiros
// adicionais entram pelo botao "Adicionar banco". id=1 mantem o vinculo com o
// login banco@atlas.test (banco_id 1) e com os convenios (bancoId 1).
export const bancos: BancoAdmin[] = [
  { id: 1, nome: "Banco Atlas", status: "ativo", adapter: "sandbox", contatoEmail: "integracao@atlas.io", scopes: ["propostas:rw", "margem:r"], mtlsHabilitado: false, ultimoTeste: "2026-06-22T10:00:00Z", ultimoTesteOk: true },
];

// Snapshot das fixtures iniciais — usado como seed do Postgres na primeira carga.
const BANCOS_SEED: BancoAdmin[] = bancos.map((b) => ({ ...b }));

// Hidrata o array `bancos` do Postgres uma vez por isolate (semeando se vazio).
// Fail-safe: se o banco estiver indisponível, mantém as fixtures em memória.
let _bancosLoad: Promise<void> | null = null;
export function ensureBancosLoaded(env: Env): Promise<void> {
  if (_bancosLoad) return _bancosLoad;
  _bancosLoad = (async () => {
    try {
      await seedBancosIfEmpty(env, BANCOS_SEED);
      const loaded = await loadBancos(env);
      if (loaded.length) { bancos.length = 0; bancos.push(...loaded); }
    } catch (e) {
      _bancosLoad = null; // permite nova tentativa numa próxima request
      pushEvent("warn", "db.bancos.hydrate_failed", `Falha ao hidratar bancos do Postgres: ${(e as Error).message}. Usando fixtures em memória.`);
    }
  })();
  return _bancosLoad;
}

/** Write-through best-effort: persiste o banco no Postgres sem quebrar a request. */
async function persistBanco(env: Env, b: BancoAdmin): Promise<void> {
  try { await upsertBanco(env, b); } catch (e) { pushEvent("warn", "db.bancos.write_failed", `Falha ao persistir banco ${b.id}: ${(e as Error).message}`); }
}

/**
 * Cascade de acesso dos WEBHOOKS de um banco conforme o status dele (banco
 * pausado → webhooks param de entregar; ativo → retomam). Os TOKENS não são
 * escritos aqui: o efeito do banco-inativo sobre tokens é derivado em tempo de
 * leitura (overlay na listagem + middleware de auth), para não sobrescrever o
 * pause MANUAL individual de um token (que deve sobreviver à reativação do banco).
 */
function syncBancoAccess(b: BancoAdmin): { webhooks: number } {
  const paused = b.status !== "ativo";
  const webhooks = setWebhooksPausedForPartner("banco", b.id, paused);
  return { webhooks };
}

export const prefeituras: PrefeituraAdmin[] = [
  { id: 1, nome: "Palhoca", uf: "SC", municipioIbge: 4211900, modoIntegracao: "REST", status: "ativo", servidoresCount: 2400, ultimaSincronizacao: "2026-06-22T03:14:00Z" },
  { id: 2, nome: "Florianopolis", uf: "SC", municipioIbge: 4205407, modoIntegracao: "SOAP", status: "ativo", servidoresCount: 1100, ultimaSincronizacao: "2026-06-22T03:21:00Z" },
  { id: 3, nome: "Joinville", uf: "SC", municipioIbge: 4209102, modoIntegracao: "CSV", status: "ativo", servidoresCount: 480, ultimaSincronizacao: "2026-06-21T22:00:00Z" },
];

const PREFEITURAS_SEED: PrefeituraAdmin[] = prefeituras.map((p) => ({ ...p }));
const SERVIDORES_SEED = SERVIDORES_BUSCA_MOCK.map((s) => ({ ...s }));
// CPFs de contas de teste que devem SEMPRE existir no login, mesmo que um import/reseed
// da folha real as remova do banco (a hidratação faz merge, não replace, para elas).
const TEST_CPFS = new Set(["37534239800", "12345678909"]);

let _prefeiturasLoad: Promise<void> | null = null;
export function ensurePrefeiturasLoaded(env: Env): Promise<void> {
  if (_prefeiturasLoad) return _prefeiturasLoad;
  _prefeiturasLoad = (async () => {
    try {
      await ensureSchema(env);
      await seedPrefeiturasIfEmpty(env, PREFEITURAS_SEED);
      const loaded = await loadPrefeituras(env);
      if (loaded.length) { prefeituras.length = 0; prefeituras.push(...loaded); }
    } catch (e) {
      _prefeiturasLoad = null;
      pushEvent("warn", "db.prefeituras.hydrate_failed", `Falha ao hidratar prefeituras: ${(e as Error).message}. Usando fixtures.`);
    }
  })();
  return _prefeiturasLoad;
}
async function persistPrefeitura(env: Env, p: PrefeituraAdmin): Promise<void> {
  try { await upsertPrefeitura(env, p); } catch (e) { pushEvent("warn", "db.prefeituras.write_failed", `Falha ao persistir prefeitura ${p.id}: ${(e as Error).message}`); }
}

// Servidores dependem de prefeituras (FK) — hidratar depois delas.
let _servidoresLoad: Promise<void> | null = null;
export function ensureServidoresLoaded(env: Env): Promise<void> {
  if (_servidoresLoad) return _servidoresLoad;
  _servidoresLoad = (async () => {
    try {
      await ensurePrefeiturasLoaded(env);
      await seedServidoresIfEmpty(env, SERVIDORES_SEED);
      const loaded = await loadServidores(env);
      if (loaded.length) {
        // As contas de teste vêm SEMPRE do seed (com passwordHash correto), sobrescrevendo
        // qualquer versão do Postgres — um import/reseed da folha real pode ter removido ou
        // estragado o hash delas. Assim Diego/Mariana nunca quebram no login/primeiro acesso.
        const filtered: ServidorBuscaMock[] = loaded.filter((s) => !TEST_CPFS.has(s.cpf));
        const testAccounts = SERVIDORES_SEED.filter((s) => TEST_CPFS.has(s.cpf));
        SERVIDORES_BUSCA_MOCK.length = 0;
        SERVIDORES_BUSCA_MOCK.push(...filtered, ...testAccounts);
      }
    } catch (e) {
      _servidoresLoad = null;
      pushEvent("warn", "db.servidores.hydrate_failed", `Falha ao hidratar servidores: ${(e as Error).message}. Usando fixtures.`);
    }
  })();
  return _servidoresLoad;
}
async function persistServidor(env: Env, s: typeof SERVIDORES_BUSCA_MOCK[number]): Promise<void> {
  try { await upsertServidor(env, s); } catch (e) { pushEvent("warn", "db.servidores.write_failed", `Falha ao persistir servidor ${s.matricula}: ${(e as Error).message}`); }
}

export const folhas: FolhaAdmin[] = [
  { id: "F-2026-06-1", prefeituraId: 1, prefeitura: "Palhoca", competencia: "202606", dataCorte: "2026-06-15", dataRepasse: "2026-07-05", status: "fechada" },
  { id: "F-2026-06-2", prefeituraId: 2, prefeitura: "Florianopolis", competencia: "202606", dataCorte: "2026-06-18", dataRepasse: "2026-07-08", status: "fechada" },
  { id: "F-2026-07-1", prefeituraId: 1, prefeitura: "Palhoca", competencia: "202607", dataCorte: "2026-07-15", dataRepasse: null, status: "aberta" },
];

const vitrine: VitrineBanner[] = [
  { id: "BAN-1", bancoId: 2, bancoNome: "Banco Y", titulo: "Empréstimo a 1,72% a.m.", impressoes: 42000, cliques: 3360, receitaMes: 18000, ativo: true },
  { id: "BAN-2", bancoId: 1, bancoNome: "SCred Financeira", titulo: "Portabilidade com troco", impressoes: 28000, cliques: 1400, receitaMes: 9200, ativo: true },
];
const VITRINE_SEED: VitrineBanner[] = vitrine.map((v) => ({ ...v }));
// Persistência da vitrine (write-through + hydrate; fail-safe pras fixtures).
let _vitrineLoad: Promise<void> | null = null;
function ensureVitrineLoaded(env: Env): Promise<void> {
  if (_vitrineLoad) return _vitrineLoad;
  _vitrineLoad = (async () => {
    try {
      await seedCollectionIfEmpty(env, "admin_vitrine", VITRINE_SEED.map((v) => ({ id: v.id, data: v })));
      const rows = await loadCollection<VitrineBanner>(env, "admin_vitrine");
      if (rows.length) { vitrine.length = 0; vitrine.push(...rows); }
    } catch { _vitrineLoad = null; }
  })();
  return _vitrineLoad;
}
async function persistVitrine(env: Env, v: VitrineBanner): Promise<void> {
  try { await upsertCollectionRow(env, "admin_vitrine", v.id, v); } catch { /* fail-safe */ }
}
// Persistência dos usuários da averbadora (perfis).
let _perfisLoad: Promise<void> | null = null;
export function ensurePerfisLoaded(env: Env): Promise<void> {
  if (_perfisLoad) return _perfisLoad;
  _perfisLoad = (async () => {
    try {
      await seedCollectionIfEmpty(env, "admin_perfis", exportUsersRaw().map((u) => ({ id: String(u.id), data: u })));
      const rows = await loadCollection<AverbadoraUser>(env, "admin_perfis");
      hydrateUsers(rows);
    } catch { _perfisLoad = null; }
  })();
  return _perfisLoad;
}
/** Persiste TODOS os usuários (lista pequena) — write-through após qualquer mutação. */
async function persistPerfis(env: Env): Promise<void> {
  try { for (const u of exportUsersRaw()) await upsertCollectionRow(env, "admin_perfis", String(u.id), u); } catch { /* fail-safe */ }
}
// Persistência do status do servidor (ativo/bloqueado/arquivado) — o override em memória.
let _servidorStatusLoad: Promise<void> | null = null;
function ensureServidorStatusLoaded(env: Env): Promise<void> {
  if (_servidorStatusLoad) return _servidorStatusLoad;
  _servidorStatusLoad = (async () => {
    try {
      const rows = await loadCollection<{ matricula: string; status: ServidorStatus }>(env, "admin_servidor_status");
      for (const r of rows) if (r.matricula && r.status) servidorStatusOverride.set(r.matricula, r.status);
    } catch { _servidorStatusLoad = null; }
  })();
  return _servidorStatusLoad;
}
async function persistServidorStatus(env: Env, matricula: string, status: ServidorStatus): Promise<void> {
  try { await upsertCollectionRow(env, "admin_servidor_status", matricula, { matricula, status }); } catch { /* fail-safe */ }
}

// Status do servidor não vive na fixture (sempre "ativo"); override por matrícula.
type ServidorStatus = "ativo" | "bloqueado" | "arquivado";
const servidorStatusOverride = new Map<string, ServidorStatus>();

export type LogPerfil = "averbadora" | "banco" | "prefeitura" | "servidor" | "sistema";
/** Deriva o perfil (aba do log) a partir do prefixo do source. */
export function perfilDoSource(source: string): LogPerfil {
  if (source.startsWith("admin") || source.startsWith("averbadora")) return "averbadora";
  if (source.startsWith("portal.banco") || source.startsWith("banco") || source === "bank") return "banco";
  if (source.startsWith("prefeitura")) return "prefeitura";
  if (source.startsWith("servidor")) return "servidor";
  return "sistema";
}
type LogEntry = { ts: string; level: "info" | "warn" | "error"; trace_id: string; message: string; source: string; perfil: LogPerfil };
const _events: LogEntry[] = [];
const pushEvent = (level: "info" | "warn" | "error", source: string, message: string, trace_id = randomTrace()): LogEntry => {
  const entry: LogEntry = { ts: new Date().toISOString(), level, trace_id, message, source, perfil: perfilDoSource(source) };
  _events.unshift(entry);
  if (_events.length > 400) _events.length = 400;
  return entry;
};

/** Traduz método+rota numa frase PT-BR legível ("Banco aprovou a proposta X"),
 *  pra qualquer um entender no log o que aconteceu em cada perfil. */
function descreverMutacao(perfil: LogPerfil, method: string, path: string, ok: boolean): string {
  const ator = perfil === "averbadora" ? "Averbadora" : perfil === "banco" ? "Banco" : perfil === "prefeitura" ? "Prefeitura" : perfil === "servidor" ? "Servidor" : "Sistema";
  const p = path.replace(/^\/v1\//, "");
  const seg = p.split("/");
  const adf = seg[3] ?? "";
  let acao: string;
  // ---- Fluxo da proposta (servidor ↔ banco) ----
  if (p === "servidores/me/propostas" && method === "POST") acao = "solicitou uma nova proposta de empréstimo ao banco";
  else if (/^portal\/banco\/contratos\/[^/]+\/confirmar$/.test(p)) acao = `aprovou/averbou a proposta ${adf}`;
  else if (/^portal\/banco\/contratos\/[^/]+\/cancelar$/.test(p)) acao = `recusou/cancelou a proposta ${adf}`;
  else if (/^portal\/banco\/contratos\/[^/]+\/(quitar|suspender|alongar|alterar)$/.test(p)) {
    const v = seg[4] === "quitar" ? "quitou" : seg[4] === "suspender" ? "suspendeu" : seg[4] === "alongar" ? "alongou" : "alterou";
    acao = `${v} o contrato ${adf}`;
  } else if (/^portal\/banco\/contratos\/averbar\//.test(p)) acao = "averbou um novo contrato";
  else if (/^portal\/banco\/contratos\/reservar\//.test(p)) acao = "reservou margem para um contrato";
  else if (p === "portal/banco/convenio-ativo") acao = "trocou o convênio ativo";
  // ---- Prefeitura: ADF / folha ----
  else if (p === "prefeitura/adf/confirmar") acao = "confirmou ADF(s) em folha — desconto aplicado";
  else if (p === "prefeitura/adf/falha") acao = "reprovou ADF(s) — falha na folha";
  else if (/^prefeitura\/folhas\/[^/]+\/movimentacao$/.test(p)) acao = "importou movimentações da folha";
  else if (p === "prefeitura/folhas" && method === "POST") acao = "abriu uma competência de folha";
  else if (/^prefeitura\/folhas\//.test(p) && method === "PATCH") acao = "atualizou o status da folha";
  else if (p === "prefeitura/config") acao = "ajustou exigências de averbação (CCB/2FA)";
  else if (/^prefeitura\/servidores/.test(p)) acao = "importou/atualizou a base de servidores";
  else if (/^prefeitura\/tombamento/.test(p)) acao = "processou um lote de tombamento";
  // ---- Averbadora (admin) ----
  else if (p === "admin/bancos" && method === "POST") acao = "criou/atualizou um banco parceiro";
  else if (/^admin\/bancos\/\d+$/.test(p) && method === "DELETE") acao = "desativou um banco";
  else if (/^admin\/bancos\/\d+\/reset-password$/.test(p)) acao = "trocou a senha de um banco";
  else if (p === "admin/prefeituras" && method === "POST") acao = "criou/atualizou uma prefeitura";
  else if (/^admin\/prefeituras\/\d+$/.test(p) && method === "DELETE") acao = "desativou uma prefeitura";
  else if (p === "admin/api-tokens" && method === "POST") acao = "criou um token de acesso à API";
  else if (/^admin\/api-tokens\/[^/]+\/pause$/.test(p)) acao = "desativou/reativou um token de acesso";
  else if (p === "admin/webhooks" && method === "POST") acao = "cadastrou um webhook";
  else if (p === "admin/convenios" && method === "POST") acao = "criou/atualizou um convênio";
  else if (/^admin\/convenios\//.test(p) && method === "DELETE") acao = "desativou um convênio";
  else if (/^admin\/pre-reservas\/[^/]+\/cancelar$/.test(p)) acao = `cancelou a pré-reserva ${seg[2] ?? ""}`;
  else if (/^admin\/tombamento/.test(p)) acao = "processou tombamento de contratos";
  else if (/^admin\/servidores\/importar/.test(p)) acao = "importou base de servidores";
  else if (/^admin\/servidores/.test(p)) acao = "atualizou um servidor";
  else if (p === "admin/confirmacao/solicitar") acao = "solicitou um código de confirmação por e-mail";
  else if (p === "admin/vitrine" && method === "POST") acao = "atualizou a vitrine de ofertas";
  else if (p === "admin/comunicados" && method === "POST") acao = "publicou um comunicado";
  else if (/^admin\/bate-carteira/.test(p)) acao = "rodou o bate de carteira (conciliação banco × folha)";
  else if (/^admin\/id-unico/.test(p)) acao = "configurou a chave de ID único";
  // ---- Servidor: conta ----
  else if (/^servidores\/me\/(conta|contato|senha)/.test(p)) acao = "atualizou os dados da conta";
  // ---- fallback amigável ----
  else acao = `fez uma alteração (${method} ${p})`;
  return `${ator} ${acao}${ok ? "" : " — FALHOU"}`;
}

/** Registra uma mutação (POST/PATCH/DELETE) no log do perfil correspondente,
 *  em memória. Usado pelo middleware global. Ver logMutacaoPersistido para o
 *  write-through compartilhado entre isolates. */
export function logMutacao(role: string | undefined, method: string, path: string, ok: boolean): void {
  const perfil: LogPerfil = role === "averbadora" ? "averbadora" : role === "banco" ? "banco" : role === "prefeitura" ? "prefeitura" : role === "servidor" ? "servidor" : "sistema";
  const source = perfil === "averbadora" ? "admin.mutacao" : `${perfil}.mutacao`;
  pushEvent(ok ? "info" : "warn", source, descreverMutacao(perfil, method, path, ok));
}

/** Igual a logMutacao, mas também persiste no Postgres (app_logs) via waitUntil,
 *  para que a alteração apareça no log mesmo se o GET /logs cair em outro isolate.
 *  Best-effort: falha de banco nunca quebra a request. */
export function logMutacaoPersistido(env: Env, waitUntil: ((p: Promise<unknown>) => void) | undefined, role: string | undefined, method: string, path: string, ok: boolean): void {
  const perfil: LogPerfil = role === "averbadora" ? "averbadora" : role === "banco" ? "banco" : role === "prefeitura" ? "prefeitura" : role === "servidor" ? "servidor" : "sistema";
  const source = perfil === "averbadora" ? "admin.mutacao" : `${perfil}.mutacao`;
  const entry = pushEvent(ok ? "info" : "warn", source, descreverMutacao(perfil, method, path, ok));
  const p = appendLog(env, entry).catch(() => undefined);
  if (waitUntil) waitUntil(p); else void p;
}
function randomTrace(): string {
  return Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

// ===== Pré-reservas derivadas do fluxo REAL (store de contratos), não mais seed.
// A averbadora vê as propostas/reservas que os servidores criam, com o mesmo
// estado que o banco/prefeitura enxergam. Fonte única = _contratos (persistido).
function brToIso(s: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || "");
  if (!m) return new Date().toISOString();
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).toISOString();
}
function contratoToPreReserva(ct: ReturnType<typeof listContratos>[number]): PreReserva {
  const conv = CONVENIOS_MOCK.find((cv) => cv.id === ct.convenioId);
  const prefId = conv?.prefeituraId ?? 1;
  const pref = prefeituras.find((p) => p.id === prefId);
  const banco = bancos.find((b) => b.id === ct.bancoId);
  const s = ct.situacao.toLowerCase();
  const criadoEm = brToIso(ct.lancamento);
  const expiraEm = ct.expiracao ? brToIso(ct.expiracao) : criadoEm;
  const expirou = !!ct.expiracao && new Date(expiraEm).getTime() < Date.now();
  const status: PreReservaStatus = s.includes("cancel")
    ? "cancelada"
    : s.includes("ativo") || s.includes("averb") || s.includes("quitad")
      ? "confirmada"
      : s.includes("aguard") && expirou
        ? "expirada"
        : "ativa";
  return {
    id: ct.adf,
    idUnico: ct.adf,
    bancoId: ct.bancoId,
    bancoNome: banco?.nome ?? `Banco ${ct.bancoId}`,
    prefeituraId: prefId,
    prefeituraNome: pref?.nome ?? conv?.prefeitura ?? "",
    convenioId: ct.convenioId,
    convenioNome: ct.convenio,
    servidorCpfMasked: ct.cpfMasked,
    servidorNome: ct.nome,
    matricula: ct.matricula,
    tipoOperacao: ct.tipoContrato === "REFIN" ? "REFIN" : "EMPRESTIMO",
    valorMargem: ct.valorFinanciado,
    valorParcela: ct.valorParcela,
    parcelas: ct.totalParcelas,
    criadoEm,
    expiraEm,
    status,
    finalizadoEm: status !== "ativa" ? (ct.expiracao ? expiraEm : criadoEm) : undefined,
  };
}
function resumoPreReservas(list: PreReserva[]): PreReservaSummary {
  const now = Date.now();
  const todayStart = new Date(new Date().toISOString().slice(0, 10)).getTime();
  let ativas = 0, expirandoEm24h = 0, confirmadasHoje = 0, expiradasHoje = 0, margemTotalTravada = 0;
  for (const r of list) {
    if (r.status === "ativa") {
      ativas++; margemTotalTravada += r.valorMargem;
      if (new Date(r.expiraEm).getTime() <= now + 24 * 3600_000) expirandoEm24h++;
    } else if (r.status === "confirmada" && r.finalizadoEm && new Date(r.finalizadoEm).getTime() >= todayStart) {
      confirmadasHoje++;
    } else if (r.status === "expirada" && r.finalizadoEm && new Date(r.finalizadoEm).getTime() >= todayStart) {
      expiradasHoje++;
    }
  }
  return { ativas, expirandoEm24h, confirmadasHoje, expiradasHoje, margemTotalTravada };
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
    [
      "cpf", "matricula", "nome", "dataAdmissao", "dataNascimento",
      "vinculo", "situacaoFuncional", "salarioLiquido", "idConvenio",
      "cargo", "endereco", "email", "telefone", "codigoIbge",
    ],
    [
      {
        cpf: "00011122233", matricula: "M-9001", nome: "Ana Carolina Silva",
        dataAdmissao: "17/04/2017", dataNascimento: "1985-03-12",
        vinculo: "ESTATUTARIO", situacaoFuncional: "TRABALHANDO", salarioLiquido: 4620.50,
        idConvenio: "CONV-001",
        cargo: "Professora II", endereco: "Rua das Palmeiras, 320 - Centro, Palhoca/SC",
        email: "ana.silva@palhoca.sc.gov.br", telefone: "48991010001", codigoIbge: 4211900,
      },
      {
        cpf: "00011122244", matricula: "M-9002", nome: "Joao da Silva Neves",
        dataAdmissao: "02/02/2010", dataNascimento: "1976-08-22",
        vinculo: "CLT", situacaoFuncional: "TRABALHANDO", salarioLiquido: 5840,
        idConvenio: "CONV-002",
        cargo: "Motorista", endereco: "Rua Central, 45 - Ingleses, Florianopolis/SC",
        email: "joao.neves@floripa.sc.gov.br", telefone: "48991020002", codigoIbge: 4205407,
      },
    ],
  )));

export const adminRoutes = new Hono<{ Bindings: Env; Variables: { jwt: JwtClaims; trace_id: string } }>()
  // Escopado ao próprio prefixo — `.use("*")` vazaria para /v1/external/* quando montado em "/".
  .use("/v1/admin/*", authRequired)

  .get("/v1/admin/dashboard", async (c) => {
    requireAdmin(c.get("jwt"));
    await refreshContratos(c.env);
    const todosContratos = listContratos({});
    const totalVitrineMes = vitrine.reduce((acc, v) => acc + v.receitaMes, 0);
    const preResumo = resumoPreReservas(todosContratos.map(contratoToPreReserva));
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
        preReservasExpirandoEm24h: preResumo.expirandoEm24h,
        margemTravada: preResumo.margemTotalTravada,
        folhasAbertas,
      },
      topBancos: bancos.slice(0, 3).map((b) => ({ nome: b.nome, propostas: Math.floor(Math.random() * 500) + 100 })),
      topPrefeituras: prefeituras.slice(0, 3).map((p) => ({ nome: `${p.nome}/${p.uf}`, servidores: p.servidoresCount })),
      volumePorConvenio: Object.entries(volumePorConvenio).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor),
      volumePorBanco: Object.entries(volumePorBanco).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor),
    });
  })

  // ===== IA (OpenAI) =====
  .get("/v1/admin/ai/config", async (c) => {
    requireAdmin(c.get("jwt"));
    return c.json(await getAiStatus(c.env));
  })
  .put("/v1/admin/ai/config", async (c) => {
    requireAdmin(c.get("jwt"));
    const body = z.object({ apiKey: z.string().min(20) }).parse(await c.req.json());
    try {
      const status = await setAiKey(c.env, body.apiKey);
      appendAudit({
        trace_id: c.get("trace_id"),
        categoria: "convenio_config",
        acao: "ai.config.set",
        userId: c.get("jwt").sub,
        userRole: "averbadora",
        ip: c.req.header("cf-connecting-ip") ?? undefined,
        detalhes: "OpenAI API key configurada",
      });
      return c.json(status);
    } catch (err) {
      throw Errors.validation({ apiKey: err instanceof Error ? err.message : "invalida" });
    }
  })
  .delete("/v1/admin/ai/config", async (c) => {
    requireAdmin(c.get("jwt"));
    await clearAiKey(c.env);
    appendAudit({
      trace_id: c.get("trace_id"),
      categoria: "convenio_config",
      acao: "ai.config.clear",
      userId: c.get("jwt").sub,
      userRole: "averbadora",
      ip: c.req.header("cf-connecting-ip") ?? undefined,
      detalhes: "OpenAI API key removida",
    });
    return c.body(null, 204);
  })
  .post("/v1/admin/ai/test", async (c) => {
    requireAdmin(c.get("jwt"));
    return c.json(await testAiKey(c.env));
  })
  // ===== SMTP (envio de e-mails de confirmação) =====
  .get("/v1/admin/smtp/config", async (c) => {
    requireAdmin(c.get("jwt"));
    return c.json(await getSmtpStatus(c.env));
  })
  .put("/v1/admin/smtp/config", async (c) => {
    requireAdmin(c.get("jwt"));
    const body = z
      .object({
        host: z.string().optional(),
        port: z.number().int().min(1).max(65535).optional(),
        user: z.string().optional(),
        password: z.string().optional(),
        secure: z.boolean().optional(),
        fromEmail: z.string().email().optional().or(z.literal("")),
        fromName: z.string().optional(),
        notifyEmail: z.string().email().optional().or(z.literal("")),
      })
      .parse(await c.req.json());
    const status = await setSmtpConfig(c.env, body);
    appendAudit({
      trace_id: c.get("trace_id"),
      categoria: "convenio_config",
      acao: "smtp.config.set",
      userId: c.get("jwt").sub,
      userRole: "averbadora",
      ip: c.req.header("cf-connecting-ip") ?? undefined,
      detalhes: `SMTP configurado (${body.host}:${body.port}, from ${body.fromEmail})`,
    });
    return c.json(status);
  })
  .delete("/v1/admin/smtp/config", async (c) => {
    requireAdmin(c.get("jwt"));
    await clearSmtpConfig(c.env);
    appendAudit({
      trace_id: c.get("trace_id"),
      categoria: "convenio_config",
      acao: "smtp.config.clear",
      userId: c.get("jwt").sub,
      userRole: "averbadora",
      ip: c.req.header("cf-connecting-ip") ?? undefined,
      detalhes: "Configuração SMTP removida",
    });
    return c.body(null, 204);
  })
  // Envia um e-mail de teste com a config SMTP salva — para o operador validar.
  .post("/v1/admin/smtp/test", async (c) => {
    requireAdmin(c.get("jwt"));
    const { to } = z.object({ to: z.string().email() }).parse(await c.req.json());
    const r = await sendMail(c.env, {
      to,
      subject: "Atlas — teste de SMTP",
      text: "Este é um e-mail de teste do Atlas Averbadora.\n\nSe você recebeu, o servidor de e-mail (SMTP) está configurado corretamente e os e-mails de confirmação vão funcionar.\n\n— Atlas Averbadora",
    });
    return c.json(r);
  })
  .post("/v1/admin/ai/normalize-csv", async (c) => {
    requireAdmin(c.get("jwt"));
    const body = z.object({
      csv: z.string().min(1).max(200_000),
      expectedHeaders: z.array(z.string()).min(1),
      contextHint: z.string().max(200).optional(),
      model: z.string().max(60).optional(),
    }).parse(await c.req.json());
    try {
      const result = await normalizeCsvWithAi(c.env, body);
      return c.json(result);
    } catch (err) {
      throw Errors.validation({ ai: err instanceof Error ? err.message : "falha" });
    }
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
      // Contagem REAL (count(*)) dos módulos persistidos — n_live_tup é estimativa e engana.
      let seedError: string | null = null;
      try {
        await ensureSchema(c.env);
        await seedPrefeiturasIfEmpty(c.env, PREFEITURAS_SEED);
        await seedServidoresIfEmpty(c.env, SERVIDORES_SEED);
        await seedBancosIfEmpty(c.env, BANCOS_SEED);
      } catch (e) { seedError = (e as Error).message; }
      const real = (await db.execute(sql`SELECT
        (SELECT count(*) FROM bancos)::int AS bancos,
        (SELECT count(*) FROM prefeituras)::int AS prefeituras,
        (SELECT count(*) FROM servidores)::int AS servidores`)) as unknown as Record<string, number>[];
      // Sanidade do jsonb (read-only): quantos servidores tem `data` como objeto vs escalar.
      const jt = (await db.execute(sql`SELECT
        count(*) FILTER (WHERE jsonb_typeof(data) = 'object')::int AS objetos,
        count(*) FILTER (WHERE jsonb_typeof(data) <> 'object')::int AS escalares
        FROM servidores`)) as unknown as { objetos: number; escalares: number }[];
      return c.json({
        transport: c.env.HYPERDRIVE ? "hyperdrive" : "direct",
        meta: (meta as unknown as { db: string; pg_version: string; server_time: string }[])[0],
        counts: real[0],
        servidorDataObjetos: jt[0]?.objetos ?? 0,
        servidorDataEscalares: jt[0]?.escalares ?? 0,
        seedError,
        latency_ms: Date.now() - started,
      });
    } catch (err) {
      return c.json({ error: { code: "db_ping_failed", message: (err as Error).message } }, 500);
    }
  })

  // ⚠️ OPERACAO DESTRUTIVA: reseedAll faz TRUNCATE servidores/bancos/prefeituras +
  // re-seed. So existe pra reparar jsonb corrompido. GUARDA ANTI-RESET: exige
  // confirmacao explicita no body para NUNCA apagar dados por acidente/automacao/
  // deploy. Sem a frase exata, retorna 400 e nao toca no banco.
  .post("/v1/admin/db/reseed", async (c) => {
    requireAdmin(c.get("jwt"));
    const body = (await c.req.json().catch(() => ({}))) as { confirmar?: string };
    if (body.confirmar !== "APAGAR-TUDO-E-RESEMEAR") {
      throw Errors.validation({
        confirmar: 'Operacao destrutiva bloqueada (TRUNCATE). Para confirmar, envie { "confirmar": "APAGAR-TUDO-E-RESEMEAR" }. Isso apaga servidores/bancos/prefeituras e volta ao seed.',
      });
    }
    pushEvent("error", "admin.db.reseed", `RESEED DESTRUTIVO confirmado por admin ${c.get("jwt")?.sub}: TRUNCATE + re-seed de servidores/bancos/prefeituras.`);
    await reseedAll(c.env, BANCOS_SEED, PREFEITURAS_SEED, SERVIDORES_SEED);
    const [nb, np, ns] = [await loadBancos(c.env), await loadPrefeituras(c.env), await loadServidores(c.env)];
    bancos.length = 0; bancos.push(...nb);
    prefeituras.length = 0; prefeituras.push(...np);
    SERVIDORES_BUSCA_MOCK.length = 0; SERVIDORES_BUSCA_MOCK.push(...ns);
    return c.json({ ok: true, counts: { bancos: nb.length, prefeituras: np.length, servidores: ns.length } });
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
      await persistBanco(c.env, bancos[idx]!);
      const casc = syncBancoAccess(bancos[idx]!); // status ativo↔inativo → retoma/pausa webhooks (tokens são derivados)
      if (casc.webhooks) {
        const verbo = bancos[idx]!.status === "ativo" ? "reativados" : "pausados";
        pushEvent("info", "admin.bancos.cascata", `Banco "${bancos[idx]!.nome}" ${bancos[idx]!.status}: ${casc.webhooks} webhook(s) ${verbo} junto.`);
      }
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
    await persistBanco(c.env, novo);
    return c.json({ banco: sanitizeBanco(novo) });
  })
  .post("/v1/admin/bancos/:id/testar-conexao", async (c) => {
    requireAdmin(c.get("jwt"));
    const b = bancos.find((x) => x.id === Number(c.req.param("id")));
    if (!b) throw Errors.notFound("banco");
    b.ultimoTeste = new Date().toISOString();
    b.ultimoTesteOk = b.adapter === "sandbox"; // sandbox sempre passa
    pushEvent(b.ultimoTesteOk ? "info" : "error", "admin", `Teste de conexao ${b.nome} ${b.ultimoTesteOk ? "OK" : "FALHOU"}`);
    await persistBanco(c.env, b);
    return c.json({ ok: b.ultimoTesteOk, banco: sanitizeBanco(b) });
  })
  .post("/v1/admin/bancos/:id/reset-password", async (c) => {
    requireAdmin(c.get("jwt"));
    const b = bancos.find((x) => x.id === Number(c.req.param("id")));
    if (!b) throw Errors.notFound("banco");
    const body = z.object({ password: z.string().min(6) }).parse(await c.req.json());
    b.passwordHash = await sha256Hex(body.password);
    pushEvent("warn", "admin.bancos.reset-password", `Senha do banco "${b.nome}" trocada por user:${c.get("jwt").sub}`);
    await persistBanco(c.env, b);
    return c.json({ banco: sanitizeBanco(b) });
  })
  // Solicita um codigo de confirmacao para uma acao destrutiva. Envia (demo:
  // revela) um codigo de 6 digitos ao email do operador logado.
  .post("/v1/admin/confirmacao/solicitar", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    const body = z.object({ acao: z.string().min(1), recurso: z.string().min(1) }).parse(await c.req.json());
    const challengeId = crypto.randomUUID();
    const codigo = gerarCodigo6();
    const email = emailDoOperador(j);
    const payload: ConfirmacaoPayload = { sub: String(j.sub), acao: body.acao, recurso: body.recurso, codigo, exp: Date.now() + CONFIRM_TTL_S * 1000 };
    if (c.env.KV_SESSIONS) await c.env.KV_SESSIONS.put(`confirm:${challengeId}`, JSON.stringify(payload), { expirationTtl: CONFIRM_TTL_S });
    pushEvent("info", "admin.confirmacao.solicitada", `Codigo de confirmacao para "${body.acao}" enviado a ${maskEmail(email)} (user:${j.sub})`);
    // codigoDemo so existe porque nao ha provider de email; em producao seria omitido.
    return c.json({ challengeId, emailMascarado: maskEmail(email), codigoDemo: codigo, expiraEmSegundos: CONFIRM_TTL_S });
  })
  // Nunca exclui de fato — DESATIVA (status inativo). Reversível via POST /bancos (status ativo).
  // Rota mantida por compat; body de confirmação (se enviado) é ignorado.
  .delete("/v1/admin/bancos/:id", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    const id = Number(c.req.param("id"));
    const b = bancos.find((x) => x.id === id);
    if (!b) throw Errors.notFound("banco");
    b.status = "inativo";
    await persistBanco(c.env, b);
    const casc = syncBancoAccess(b); // pausa webhooks do banco em cascata (tokens são derivados)
    appendAudit({ categoria: "acesso", acao: "banco_desativado", userId: `averbadora:${j.sub}`, userRole: "averbadora", detalhes: `Banco "${b.nome}" (id=${id}) desativado.` });
    pushEvent("info", "admin.bancos.desativar", `Banco "${b.nome}" desativado por user:${j.sub} — ${casc.webhooks} webhook(s) pausados junto.`);
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
        status: z.enum(["ativo", "pausado", "inativo"]),
        loginEmail: z.string().email().optional().or(z.literal("")),
        contatoEmail: z.string().email().optional().or(z.literal("")),
        password: z.string().min(6).optional(),
        servidoresCount: z.number().int().default(0),
        folhaSincUrl: z.string().url().optional().or(z.literal("")),
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
      await persistPrefeitura(c.env, prefeituras[idx]!);
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
    await persistPrefeitura(c.env, novo);
    return c.json({ prefeitura: sanitizePrefeitura(novo) });
  })
  .post("/v1/admin/prefeituras/:id/sincronizar", async (c) => {
    requireAdmin(c.get("jwt"));
    const p = prefeituras.find((x) => x.id === Number(c.req.param("id")));
    if (!p) throw Errors.notFound("prefeitura");
    const ts = new Date().toISOString();
    // MANUAL: nao ha origem automatica de dados; apenas registra o timestamp.
    if (p.modoIntegracao === "MANUAL") {
      p.ultimaSincronizacao = ts;
      p.ultimaSincResultado = { novos: 0, atualizados: 0, ts, erro: "modo MANUAL — importe via CSV" };
      pushEvent("info", "cron", `Prefeitura ${p.nome}: sincronizacao pulada (modo MANUAL)`);
      await persistPrefeitura(c.env, p);
      return c.json({ prefeitura: sanitizePrefeitura(p), resultado: p.ultimaSincResultado });
    }
    // REST/SOAP: ainda nao implementado (depende do contrato de integracao especifico).
    if (p.modoIntegracao === "REST" || p.modoIntegracao === "SOAP") {
      p.ultimaSincronizacao = ts;
      p.ultimaSincResultado = { novos: 0, atualizados: 0, ts, erro: `adapter ${p.modoIntegracao} ainda nao implementado — use modo CSV com folhaSincUrl` };
      await persistPrefeitura(c.env, p);
      return c.json({ prefeitura: sanitizePrefeitura(p), resultado: p.ultimaSincResultado });
    }
    // CSV: busca a URL configurada, faz fetch, parseia, upserta cada servidor.
    if (!p.folhaSincUrl) {
      p.ultimaSincronizacao = ts;
      p.ultimaSincResultado = { novos: 0, atualizados: 0, ts, erro: "folhaSincUrl nao configurada — edite a prefeitura" };
      await persistPrefeitura(c.env, p);
      return c.json({ prefeitura: sanitizePrefeitura(p), resultado: p.ultimaSincResultado });
    }
    let csv = "";
    try {
      const res = await fetch(p.folhaSincUrl, { headers: { Accept: "text/csv, text/plain, */*" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      csv = await res.text();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "falha ao baixar CSV";
      p.ultimaSincronizacao = ts;
      p.ultimaSincResultado = { novos: 0, atualizados: 0, ts, erro: `download falhou: ${msg}` };
      await persistPrefeitura(c.env, p);
      return c.json({ prefeitura: sanitizePrefeitura(p), resultado: p.ultimaSincResultado });
    }
    // Reusa o mesmo parser do import CSV manual.
    const { rows } = parseCsv(csv);
    let novos = 0, atualizados = 0;
    const conveniosPref = CONVENIOS_MOCK.filter((cv) => cv.prefeituraId === p.id);
    const defaultConvenioId = conveniosPref[0]?.id ?? "";
    const upserts: ServidorBuscaMock[] = [];
    for (const r of rows) {
      let cpf = (r.cpf ?? "").replace(/\D/g, "");
      if (cpf.length > 0 && cpf.length < 11) cpf = cpf.padStart(11, "0");
      if (cpf.length !== 11) continue;
      if (!r.nome || !r.matricula) continue;
      const vinculo = (r.vinculo || "ESTATUTARIO").toUpperCase();
      const salario = Number(r.salarioLiquido);
      const ibge = Number(r.codigoIbge);
      let idConvenio = (r.idConvenio ?? "").trim();
      if (!conveniosPref.some((cv) => cv.id === idConvenio)) idConvenio = defaultConvenioId;
      if (!idConvenio) continue;
      const existing = SERVIDORES_BUSCA_MOCK.find((s) => s.matricula === r.matricula && (s.prefeituraId === p.id || (!s.prefeituraId && (s.origem ?? "").toLowerCase().includes(p.nome.toLowerCase()))));
      const rec: ServidorBuscaMock = {
        cpf, cpfMasked: `${cpf.slice(0, 3)}.***.***-${cpf.slice(-2)}`,
        matricula: r.matricula, idMatricula: `MAT-${r.matricula}`, prefeituraId: p.id, nome: r.nome,
        dataAdmissao: r.dataAdmissao ?? "", dataNascimento: r.dataNascimento ?? "",
        vinculo: vinculo as ServidorBuscaMock["vinculo"], origem: p.nome,
        situacaoFuncional: (r.situacaoFuncional ?? "TRABALHANDO") as ServidorBuscaMock["situacaoFuncional"],
        salarioLiquido: Number.isFinite(salario) ? salario : 0, idConvenio,
        email: r.email || undefined, telefone: r.telefone || undefined, cargo: r.cargo,
        endereco: r.endereco || undefined, codigoIbge: Number.isFinite(ibge) ? ibge : p.municipioIbge,
      };
      if (existing) { Object.assign(existing, rec); atualizados++; upserts.push(existing); }
      else { SERVIDORES_BUSCA_MOCK.push(rec); novos++; upserts.push(rec); }
    }
    // Write-through: persiste no PG (best-effort — falhas nao quebram a sync).
    try { for (const s of upserts) await upsertServidor(c.env, s); } catch { /* fail-safe */ }
    p.servidoresCount = SERVIDORES_BUSCA_MOCK.filter((s) => s.prefeituraId === p.id).length;
    p.ultimaSincronizacao = ts;
    p.ultimaSincResultado = { novos, atualizados, ts };
    pushEvent("info", "cron", `Folha ${p.nome} sincronizada: ${novos} novos, ${atualizados} atualizados`);
    await persistPrefeitura(c.env, p);
    return c.json({ prefeitura: sanitizePrefeitura(p), resultado: p.ultimaSincResultado });
  })
  .post("/v1/admin/prefeituras/:id/reset-password", async (c) => {
    requireAdmin(c.get("jwt"));
    const p = prefeituras.find((x) => x.id === Number(c.req.param("id")));
    if (!p) throw Errors.notFound("prefeitura");
    const body = z.object({ password: z.string().min(6) }).parse(await c.req.json());
    p.passwordHash = await sha256Hex(body.password);
    pushEvent("warn", "admin.prefeituras.reset-password", `Senha da prefeitura "${p.nome}" trocada por user:${c.get("jwt").sub}`);
    await persistPrefeitura(c.env, p);
    return c.json({ prefeitura: sanitizePrefeitura(p) });
  })
  // Nunca exclui — DESATIVA (status inativo). Reversível via POST /prefeituras.
  .delete("/v1/admin/prefeituras/:id", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    const id = Number(c.req.param("id"));
    const p = prefeituras.find((x) => x.id === id);
    if (!p) throw Errors.notFound("prefeitura");
    p.status = "inativo";
    await persistPrefeitura(c.env, p);
    appendAudit({ categoria: "acesso", acao: "prefeitura_desativada", userId: `averbadora:${j.sub}`, userRole: "averbadora", detalhes: `Prefeitura "${p.nome}" (id=${id}) desativada.` });
    pushEvent("info", "admin.prefeituras.desativar", `Prefeitura "${p.nome}" desativada por user:${j.sub}`);
    return c.json({ prefeitura: sanitizePrefeitura(p) });
  })

  .post("/v1/admin/convenios/:id/reativar", async (c) => {
    requireAdmin(c.get("jwt"));
    const id = c.req.param("id");
    await refreshConvenios(c.env);
    const cv = CONVENIOS_MOCK.find((x) => x.id === id);
    if (!cv) throw Errors.notFound("convenio");
    cv.ativo = true;
    await persistConvenio(c.env, cv);
    pushEvent("info", "admin.convenios", `Convenio "${cv.nome}" reativado por user:${c.get("jwt").sub}`);
    return c.json({ ok: true });
  })
  .get("/v1/admin/convenios", async (c) => {
    requireAdmin(c.get("jwt"));
    await refreshConvenios(c.env);
    // Retorna TODOS (ativos e inativos) — a UI mostra a situacao e permite reativar.
    const detalhado = CONVENIOS_MOCK.map((cv) => ({
      ...cv,
      ativo: cv.ativo !== false,
      bancoNome: bancos.find((b) => b.id === cv.bancoId)?.nome ?? "—",
      prefeituraNome: prefeituras.find((p) => p.id === cv.prefeituraId)?.nome ?? cv.prefeitura,
    }));
    return c.json({ convenios: detalhado });
  })

  .get("/v1/admin/servidores", async (c) => {
    requireAdmin(c.get("jwt"));
    await ensureServidorStatusLoaded(c.env);
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
    await ensureServidorStatusLoaded(c.env);
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
      // Mesmo CPF em prefeitura diferente é acúmulo legal — só bloqueia dentro da mesma prefeitura.
      const dup = SERVIDORES_BUSCA_MOCK.find((x) => x.cpf === body.cpf && x !== s && prefeituraIdDe(x) === prefeituraIdDe(s));
      if (dup) throw Errors.validation({ cpf: `CPF já em uso nesta prefeitura pela matrícula ${dup.matricula}` });
      s.cpf = body.cpf;
      s.cpfMasked = `${body.cpf.slice(0, 3)}.***.***-${body.cpf.slice(-2)}`;
    }
    if (body.nome !== undefined) s.nome = body.nome;
    if (body.vinculo !== undefined) s.vinculo = body.vinculo;
    if (body.situacaoFuncional !== undefined) s.situacaoFuncional = body.situacaoFuncional;
    if (body.salarioLiquido !== undefined) s.salarioLiquido = body.salarioLiquido;
    if (body.idConvenio !== undefined) s.idConvenio = body.idConvenio;
    if (body.status !== undefined) { servidorStatusOverride.set(matricula, body.status); await persistServidorStatus(c.env, matricula, body.status); }
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
    await persistServidor(c.env, s);
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
    const perfil = url.searchParams.get("perfil");
    // Junta o buffer em memória (deste isolate) com o log compartilhado do
    // Postgres (todas as mutações de todos os isolates). Dedup por trace_id+ts.
    let shared: AppLogRow[] = [];
    try { shared = await loadLogs(c.env, 300); } catch { /* fail-safe: só memória */ }
    const seen = new Set<string>();
    const merged: LogEntry[] = [];
    for (const e of [..._events, ...(shared as unknown as LogEntry[])]) {
      const k = `${e.trace_id}|${e.ts}`;
      if (seen.has(k)) continue;
      seen.add(k);
      merged.push(e);
    }
    merged.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
    let rows = merged;
    if (level) rows = rows.filter((e) => e.level === level);
    if (source) rows = rows.filter((e) => e.source === source);
    if (perfil) rows = rows.filter((e) => e.perfil === perfil);
    // Traduz na leitura os logs antigos ainda no formato cru "METODO /rota"
    // (gravados antes das frases) — assim TODO o painel fica legível.
    const traduzidos = rows.slice(0, 200).map((e) => {
      const mm = /^(GET|POST|PATCH|PUT|DELETE)\s+(\S+)(\s+\(falhou\))?$/.exec(e.message);
      return mm ? { ...e, message: descreverMutacao(e.perfil, mm[1]!, mm[2]!, !mm[3]) } : e;
    });
    return c.json({ logs: traduzidos });
  })

  .get("/v1/admin/vitrine", async (c) => {
    requireAdmin(c.get("jwt"));
    await ensureVitrineLoaded(c.env);
    return c.json({ banners: vitrine });
  })
  .post("/v1/admin/vitrine", async (c) => {
    requireAdmin(c.get("jwt"));
    await ensureVitrineLoaded(c.env);
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
      await persistVitrine(c.env, vitrine[idx]!);
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
    await persistVitrine(c.env, novo);
    return c.json({ banner: novo });
  })

  // ===== API Tokens =====
  .get("/v1/admin/api-tokens", authRequired, async (c) => {
    const j = c.get("jwt"); requireAdmin(j);
    const kv = c.env.KV_CACHE; if (!kv) throw Errors.bankUnavailable("KV não configurado");
    const env = c.req.query("environment") as ApiEnvironment | undefined;
    const aud = c.req.query("audience") as ApiAudience | undefined;
    const raw = await listTokens(kv, { ...(env ? { environment: env } : {}), ...(aud ? { audience: aud } : {}) });
    // Dois motivos independentes de um token estar inativo:
    //  - pausedAt: pause MANUAL individual (sobrevive à reativação do banco).
    //  - bancoInativo (derivado): o banco dono está pausado. Segue o status do
    //    banco em tempo de leitura (fonte de verdade), sem depender do TTL do KV.
    // Efetivamente pausado = pausedAt || bancoInativo. O front decide o rótulo/ação.
    const tokens = raw.map((t) => {
      const banco = t.audience === "banco" ? bancos.find((b) => b.id === t.partnerId) : undefined;
      const bancoInativo = !!banco && banco.status !== "ativo";
      return { ...t, bancoInativo };
    });
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
  // Pausa/retoma UM token específico (ação manual, reversível). NÃO apaga nem
  // revoga, e NÃO toca no perfil/parceria dono — ele continua ativo. Independe
  // do cascade do banco: reativar o banco não desfaz um pause manual.
  .patch("/v1/admin/api-tokens/:id/pause", authRequired, async (c) => {
    const j = c.get("jwt"); requireAdmin(j);
    const kv = c.env.KV_CACHE; if (!kv) throw Errors.bankUnavailable("KV não configurado");
    const body = z.object({ paused: z.boolean() }).parse(await c.req.json());
    const t = await setTokenPaused(kv, c.req.param("id"), body.paused);
    if (!t) throw Errors.notFound("token");
    pushEvent("info", "admin.api-tokens.pause", `Token "${t.name}" ${body.paused ? "pausado" : "reativado"} por user:${j.sub} (perfil/parceria segue ativo).`);
    return c.json({ token: t });
  })

  // ===== Webhooks (admin) =====
  .get("/v1/admin/webhooks", authRequired, async (c) => {
    const j = c.get("jwt"); requireAdmin(j);
    const env = c.req.query("environment") as ApiEnvironment | undefined;
    // Overlay do pause: webhook de banco pausado aparece inativo, seguindo o
    // status do banco (fonte de verdade), independente do estado em memória
    // deste isolate.
    const webhooks = listWebhooks(env ? { environment: env } : undefined).map((w) => {
      if (w.audience !== "banco") return w;
      const banco = bancos.find((b) => b.id === w.partnerId);
      return banco && banco.status !== "ativo" ? { ...w, active: false } : w;
    });
    return c.json({ webhooks, events: WEBHOOK_EVENTS });
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
  // Webhooks NÃO são apagados nem pausados manualmente. Pausam/retomam em
  // cascata com o status do banco dono (ver syncBancoAccess). Sem rota de
  // toggle/exclusão individual.
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
        await persistBanco(c.env, existing);
      } else {
        bancos.push(banco);
        out.inserted++;
        await persistBanco(c.env, banco);
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
    for (const p of out.rows) await persistPrefeitura(c.env, p);
    pushEvent("info", "admin.prefeituras.import", `${out.inserted} inseridos, ${out.updated} atualizados, ${out.errors.length} erros`);
    return c.json(out);
  })
  .post("/v1/admin/convenios/importar", authRequired, async (c) => {
    requireAdmin(c.get("jwt"));
    const text = await readCsvBody(c);
    const { rows } = parseCsv(text);
    await refreshConvenios(c.env);
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
      const conv = {
        id: existing?.id ?? nextConvenioId(),
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
      else { CONVENIOS_MOCK.push(conv); out.inserted++; } // push antes do proximo nextConvenioId -> id unico
      out.rows.push(conv);
    });
    // Write-through: cada convenio importado persiste no Postgres.
    for (const conv of out.rows) await persistConvenio(c.env, conv);
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
    await refreshConvenios(c.env);
    const pref = prefeituras.find((p) => p.id === body.prefeituraId);
    if (!pref) throw Errors.notFound("prefeitura");
    if (!bancos.find((b) => b.id === body.bancoId)) throw Errors.notFound("banco");
    if (body.id) {
      const idx = CONVENIOS_MOCK.findIndex((c) => c.id === body.id);
      if (idx < 0) throw Errors.notFound("convenio");
      const current = CONVENIOS_MOCK[idx]!;
      CONVENIOS_MOCK[idx] = { ...current, ...body, id: body.id, prefeitura: pref.nome, uf: pref.uf };
      await persistConvenio(c.env, CONVENIOS_MOCK[idx]!); // write-through: sobrevive ao reciclo
      pushEvent("info", "admin.convenios", `Convenio "${CONVENIOS_MOCK[idx]!.nome}" atualizado`);
      return c.json({ convenio: CONVENIOS_MOCK[idx] });
    }
    const id = nextConvenioId();
    const novo = { ...body, id, prefeitura: pref.nome, uf: pref.uf };
    CONVENIOS_MOCK.push(novo);
    await persistConvenio(c.env, novo); // write-through: convenio novo persiste no Postgres
    pushEvent("info", "admin.convenios", `Convenio "${novo.nome}" criado`);
    return c.json({ convenio: novo });
  })
  // Nunca apaga — DESATIVA (ativo=false). Sai das listagens; referências ficam intactas.
  .delete("/v1/admin/convenios/:id", async (c) => {
    requireAdmin(c.get("jwt"));
    const id = c.req.param("id");
    await refreshConvenios(c.env);
    const cv = CONVENIOS_MOCK.find((x) => x.id === id);
    if (!cv) throw Errors.notFound("convenio");
    cv.ativo = false;
    await persistConvenio(c.env, cv); // write-through: desativacao persiste (nunca some, so ativo=false)
    pushEvent("info", "admin.convenios", `Convenio "${cv.nome}" desativado por user:${c.get("jwt").sub}`);
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
    await refreshContratos(c.env); // fluxo real: propostas/reservas criadas pelos servidores
    const all = listContratos({}).map(contratoToPreReserva);
    const url = new URL(c.req.url);
    const status = url.searchParams.get("status") as PreReservaStatus | null;
    const prefeituraId = Number(url.searchParams.get("prefeitura_id"));
    const bancoId = Number(url.searchParams.get("banco_id"));
    // Number(null/"") === 0 (finito) — por isso o guard é falsy (0/NaN = sem filtro).
    const list = all.filter((r) =>
      (!status || r.status === status)
      && (!prefeituraId || r.prefeituraId === prefeituraId)
      && (!bancoId || r.bancoId === bancoId));
    return c.json({ preReservas: list, resumo: resumoPreReservas(all) });
  })
  .post("/v1/admin/pre-reservas/:id/cancelar", async (c) => {
    requireAdmin(c.get("jwt"));
    const id = c.req.param("id");
    const body = z.object({ motivo: z.string().min(3).max(200) }).parse(await c.req.json());
    // Cancela a reserva REAL (contrato) — libera a margem e o servidor vê "Cancelada".
    await refreshContratos(c.env);
    const ct = aplicarAcao(id, "cancelar", `averbadora:${c.get("jwt").sub}`, body.motivo);
    if (!ct) throw Errors.notFound("pre_reserva");
    await persistContrato(c.env, id);
    const r = contratoToPreReserva(ct);
    appendAudit({ categoria: "margem", acao: "pre_reserva_cancelada", propostaId: id, idUnico: r.idUnico, matricula: r.matricula, cpf: r.servidorCpfMasked, userId: `averbadora:${c.get("jwt").sub}`, userRole: "averbadora", detalhes: `Pre-reserva ${id} cancelada manualmente. Motivo: ${body.motivo}. Margem R$ ${r.valorMargem.toFixed(2)} liberada.` });
    pushEvent("warn", "admin.pre-reservas", `Pre-reserva ${id} cancelada por user:${c.get("jwt").sub}`);
    return c.json({ preReserva: r });
  })
  .post("/v1/admin/pre-reservas/sweep", async (c) => {
    requireAdmin(c.get("jwt"));
    await refreshContratos(c.env);
    // Expiração é derivada (reserva "Aguardando" com data de expiração vencida).
    const expiradas = listContratos({}).map(contratoToPreReserva).filter((r) => r.status === "expirada").length;
    return c.json({ expiradas });
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
    const result = await importTombamento({
      prefeituraId: body.prefeituraId,
      prefeituraNome: pref.nome,
      competencia: body.competencia,
      recebidoPor: `averbadora:${c.get("jwt").sub}`,
      csv: body.csv,
      env: c.env,
    });
    appendAudit({ categoria: "tombamento", acao: "lote_processado", detalhes: `Lote ${result.lote.id} (${pref.nome}/${body.competencia}): ${result.inseridos} inseridos, ${result.atualizados} atualizados, ${result.divergencias} divergencias, ${result.erros.length} erros.` });
    // Notifica a averbadora quando há divergência entre as 3 bases (prefeitura × banco × remessa).
    if (result.divergencias > 0) {
      pushEvent("warn", "admin.tombamento.divergencia", `⚠ Lote ${result.lote.id} (${pref.nome}/${body.competencia}) tem ${result.divergencias} divergência(s) entre as bases. Revise as linhas marcadas.`);
    } else {
      pushEvent("info", "admin.tombamento", `Lote ${result.lote.id} conciliado sem divergências.`);
    }
    return c.json(result);
  })
  .get("/v1/admin/tombamento/csv-template", () => csvResponse("tombamento-exemplo.csv", buildCsv(
    // Formato do relatorio de emprestimos real. Aceita CPF completo (mascarado
    // no import) e valores em R$. adfBanco = numero do contrato.
    ["cpf", "matricula", "nome", "banco", "numeroContrato", "valorParcela", "totalParcelas", "parcelasRestantes", "valorEmprestimo", "status", "motivo", "tipo"],
    [
      { cpf: "73345725304", matricula: "00000230", nome: "MARIA DO SOCORRO LOPES FARIAS", banco: "104-Caixa Economica Federal", numeroContrato: "10994802", valorParcela: "164,00", totalParcelas: 120, parcelasRestantes: 120, valorEmprestimo: "R$ 7.944,97", status: "Averbação Confirmada", motivo: "Dívidas", tipo: "Novo" },
      { cpf: "01733410392", matricula: "00004421", nome: "FRANCISCO MARDONIO PEREIRA DOS SANTOS", banco: "85-TA FACIL CONSIGNADOS", numeroContrato: "04053861-000", valorParcela: "79,16", totalParcelas: 96, parcelasRestantes: 96, valorEmprestimo: "R$ 2.036,69", status: "Averbação Confirmada", motivo: "Empréstimo", tipo: "Novo" },
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
    await ensurePerfisLoaded(c.env);
    return c.json({ usuarios: listAverbadoraUsers(), perfis: perfilOptions() });
  })
  .post("/v1/admin/perfis", async (c) => {
    requireAdmin(c.get("jwt"));
    await ensurePerfisLoaded(c.env);
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
    await persistPerfis(c.env);
    appendAudit({ categoria: "acesso", acao: body.id ? "usuario_atualizado" : "usuario_criado", userId: `averbadora:${c.get("jwt").sub}`, userRole: "averbadora", detalhes: `Usuario averbadora ${u.email} (perfil=${u.perfil}, 2FA=${u.twoFactorEnabled}) ${body.id ? "atualizado" : "criado"}.` });
    return c.json({ usuario: u });
  })
  .post("/v1/admin/perfis/:id/2fa/rotate", async (c) => {
    requireAdmin(c.get("jwt"));
    const id = Number(c.req.param("id"));
    const r = rotateTotpSecret(id);
    if (!r) throw Errors.notFound("usuario");
    await persistPerfis(c.env);
    appendAudit({ categoria: "acesso", acao: "2fa_rotacionado", userId: `averbadora:${c.get("jwt").sub}`, userRole: "averbadora", detalhes: `2FA do usuario id=${id} rotacionado. Novo secret deve ser entregue uma unica vez.` });
    return c.json(r);
  })
  .post("/v1/admin/perfis/:id/2fa/disable", async (c) => {
    requireAdmin(c.get("jwt"));
    const id = Number(c.req.param("id"));
    if (!disable2FA(id)) throw Errors.notFound("usuario");
    await persistPerfis(c.env);
    appendAudit({ categoria: "acesso", acao: "2fa_desativado", userId: `averbadora:${c.get("jwt").sub}`, userRole: "averbadora", detalhes: `2FA do usuario id=${id} desativado.` });
    return c.json({ ok: true });
  })
  .delete("/v1/admin/perfis/:id", async (c) => {
    requireAdmin(c.get("jwt"));
    const id = Number(c.req.param("id"));
    if (!deleteAverbadoraUser(id)) throw Errors.notFound("usuario");
    await persistPerfis(c.env);
    appendAudit({ categoria: "acesso", acao: "usuario_removido", userId: `averbadora:${c.get("jwt").sub}`, userRole: "averbadora", detalhes: `Usuario averbadora id=${id} desativado.` });
    return c.body(null, 204);
  })
  .post("/v1/admin/perfis/:id/reativar", async (c) => {
    requireAdmin(c.get("jwt"));
    const id = Number(c.req.param("id"));
    if (!reactivateAverbadoraUser(id)) throw Errors.notFound("usuario");
    await persistPerfis(c.env);
    appendAudit({ categoria: "acesso", acao: "usuario_reativado", userId: `averbadora:${c.get("jwt").sub}`, userRole: "averbadora", detalhes: `Usuario averbadora id=${id} reativado.` });
    return c.json({ ok: true });
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
      // Identidade (prefeituraId, matricula) — permite mesmo CPF em outra prefeitura.
      const existing = SERVIDORES_BUSCA_MOCK.find((s) => s.matricula === r.matricula && prefeituraIdDe(s) === prefId);
      const salario = Number(r.salarioLiquido);
      const ibge = Number(r.codigoIbge);
      const s = {
        cpf,
        cpfMasked: cpf.slice(0, 3) + ".***.***-" + cpf.slice(-2),
        matricula: r.matricula!,
        idMatricula: `MAT-${r.matricula!}`,
        prefeituraId: prefId,
        nome: r.nome!,
        dataAdmissao: r.dataAdmissao ?? "",
        dataNascimento: r.dataNascimento ?? "",
        vinculo: r.vinculo ?? "ESTATUTARIO",
        origem: pref.nome,
        situacaoFuncional: r.situacaoFuncional ?? "TRABALHANDO",
        salarioLiquido: Number.isFinite(salario) ? salario : 0,
        idConvenio,
        cargo: r.cargo || undefined,
        endereco: r.endereco || undefined,
        email: r.email || undefined,
        telefone: r.telefone || undefined,
        codigoIbge: Number.isFinite(ibge) ? ibge : undefined,
      };
      if (existing) { Object.assign(existing, s); out.updated++; }
      else { SERVIDORES_BUSCA_MOCK.push(s); out.inserted++; }
      out.rows.push(s);
    });
    // Persistencia NAO-silenciosa. persistServidor engolia erros e o import
    // reportava "sucesso" mesmo quando nada foi para o Postgres — dai a
    // sensacao de "dados resetaram sozinhos" no dia seguinte (na verdade
    // nunca chegaram no DB). Agora usamos upsertServidor direto e coletamos
    // as falhas por linha pra devolver no response.
    const persistFailures: { matricula: string; message: string }[] = [];
    for (const s of out.rows) {
      try { await upsertServidor(c.env, s); }
      catch (e) { persistFailures.push({ matricula: s.matricula, message: (e as Error).message }); }
    }
    // Log persistido inclui o total de linhas do CSV recebido — sem isso
    // fica dificil detectar depois "importei 50 mas so 1 entrou". Se houver
    // qualquer rejeicao ou falha, log fica "error" pra a linha aparecer
    // em vermelho em /averbadora/logs.
    const totalLinhas = rows.length;
    const nivel = (persistFailures.length + out.errors.length) > 0 ? "error" : "info";
    if (persistFailures.length > 0) {
      pushEvent(nivel, "admin.servidores.import", `prefeitura=${pref.nome}: ${totalLinhas} linhas no CSV, ${out.inserted} inseridos, ${out.updated} atualizados, ${out.errors.length} rejeitados, ${persistFailures.length} falhas de persistencia. Primeira: ${persistFailures[0]?.message}`);
    } else {
      pushEvent(nivel, "admin.servidores.import", `prefeitura=${pref.nome}: ${totalLinhas} linhas no CSV, ${out.inserted} inseridos, ${out.updated} atualizados, ${out.errors.length} rejeitados` + (out.errors.length > 0 ? `. Primeiro erro (linha ${out.errors[0]?.line}): ${out.errors[0]?.message}` : ""));
    }
    return c.json({ ...out, persistFailures });
  });

async function readCsvBody(c: { req: { json: () => Promise<unknown>; text: () => Promise<string>; header: (n: string) => string | undefined } }): Promise<string> {
  const ct = c.req.header("content-type") ?? "";
  if (ct.includes("application/json")) {
    const j = (await c.req.json()) as { csv?: string };
    return j.csv ?? "";
  }
  return await c.req.text();
}
