import { Hono } from "hono";
import { z } from "zod";
import { authRequired, type JwtClaims } from "../../middleware/auth.js";
import { Errors } from "../../_shared/errors.js";
import type { Env } from "../../env.js";
import { CONVENIOS_MOCK, COMUNICADOS_MOCK, SERVIDORES_BUSCA_MOCK, prefeituraIdDe, type ServidorBuscaMock } from "../portal-banco/fixtures.js";
import { listContratos, refreshContratos, aplicarAcao, persistContrato, getContrato, getContratoEventos, removeContratosByMatricula, setContratoSituacaoAtivo, criarContratoOuReserva, setContratoCcb, setContratoFalhaEmFolha, revertContratoDesligamento, clearContratosMemoria } from "../portal-banco/store.js";
import { refreshConvenios, persistConvenio, nextConvenioId } from "../portal-banco/convenios-store.js";
import { refreshComunicados, persistComunicados, removerComunicadoPersistido } from "../portal-banco/comunicados-store.js";
import { createToken, setTokenPaused, listTokens, SCOPES_BY_AUDIENCE, sha256Hex, type ApiAudience, type ApiEnvironment, type ApiScope } from "./api-tokens.js";
import { sql } from "drizzle-orm";
import { getDb } from "../../db/client.js";
import { withIdempotency } from "../../_shared/idempotency.js";
import { ensureSchema, loadBancos, seedBancosIfEmpty, upsertBanco, deleteBancoRow, loadPrefeituras, seedPrefeiturasIfEmpty, upsertPrefeitura, deletePrefeituraRow, loadServidores, seedServidoresIfEmpty, upsertServidor, reseedAll, purgeServidores, purgeContratosApenas, purgePrefeituras, purgeUsuarios, purgeComunicados, appendLog, loadLogs, loadCollection, upsertCollectionRow, seedCollectionIfEmpty, deleteCollectionRow, deleteTombamentoLote, clearServidorConta, deleteContratosByMatriculas, deleteServidoresByMatriculas, setServidorPassword, setServidorContato } from "../../db/repos.js";
import type { AppLogRow } from "../../db/repos.js";
import { parseCsv, buildCsv, type ImportOutcome } from "../../_shared/csv.js";
import { MATRICULA_REGEX, normalizeMatricula, MatriculaSchema } from "../../_shared/matricula.js";
import { WEBHOOK_EVENTS, createWebhook, setWebhooksPausedForPartner, fireEvent, listDeliveries, listWebhooks, testWebhookEvents, type WebhookEvent } from "./webhooks.js";
import { ensureIdUnicoConfig, getIdUnicoConfig, issueIdUnico, listIdUnicoConfigs, previewIdUnico, upsertIdUnicoConfig, refreshIdUnicoConfigs, persistIdUnicoConfig } from "./id-unico.js";
import { getConvenioConfig, listConvenioConfigs, upsertConvenioConfig, type FormatoImportacao } from "./convenios-config.js";
import type { PreReserva, PreReservaStatus, PreReservaSummary } from "./pre-reservas.js";
import { importTombamento, listLinhas, listLotes, clearTombamentoMemoria, removeLoteMemoria, refreshTombamento, marcarTombamentoSubstituido, persistLotePublic } from "./tombamento.js";
import { bateCarteiraCsv, gerarBateCarteira } from "./bate-carteira.js";
import { appendAudit, auditCategorias, listAudit, type AuditCategoria } from "./auditoria.js";
import { deleteAverbadoraUser, reactivateAverbadoraUser, disable2FA, getAverbadoraUser, listAverbadoraUsers, perfilOptions, rotateTotpSecret, upsertAverbadoraUser, exportUsersRaw, hydrateUsers, type AverbadoraUser } from "./perfis-admin.js";
import { loadBeneficios, refreshBeneficios, persistBeneficio, nextBeneficioId, type Beneficio } from "./beneficios-store.js";
import { loadTemplates, getTemplate, upsertTemplate, removerTemplateSeguro, renderTemplate, exemploVarsRealistas, upsertTemplateBeneficio, removerTemplatePorBeneficio } from "./email-templates.js";
import { loadCliques, refreshCliques } from "./beneficio-cliques-store.js";
import { refreshCotacoes, updateCotacaoSituacao, expireStaleCotacoes, purgeCotacoes, setCotacaoContrato, removeCotacaoContrato, loadCotacoes as loadCotacoesAdmin } from "./telemedicina-cotacoes-store.js";
import { ensureAdfsGlobal, listAdfsGlobal, listAdfCompetenciasGlobal, setAdfStatusGlobal, removeAdfsByMatricula, removeAdfsByContratoAdf, clearAdfsMemoria, removeAnuenciaMemoria } from "../prefeitura/store.js";
import { clearAiKey, getAiStatus, normalizeCsvWithAi, setAiKey, testAiKey } from "./ai.js";
import { clearSmtpConfig, getSmtpStatus, setSmtpConfig } from "./smtp.js";
import { sendMail, enviarNotificacao, movimentacaoEmail, dispatchTemplateEmail } from "./mailer.js";
import { ensurePortabilidadesLoaded, listIntencoes } from "./portabilidade-store.js";
import { ensureTermosLoaded, listTermos, getTermo, upsertTermo, type TermoTipo } from "./termos-store.js";
import { getSuporteConfig, setSuporteConfig } from "./suporte.js";
import { requireUnlocked, getLockState, unlock as unlockDestructive, lock as lockDestructive, MAX_UNLOCK_SEC } from "./destructive-lock.js";
import { ensureServidorCamposConfig, getServidorCamposConfig, refreshServidorCamposConfigs, upsertServidorCamposConfig, persistServidorCamposConfig, sanitizeCampos, defaultCamposSet, CHAVES_TRAVADAS, type ServidorCampoConfig, type ServidorCampoTipo } from "./servidor-campos.js";

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

/** Gating GRANULAR por RECURSO. Fonte de verdade: `averbadora_permissoes` no JWT.
 *  - "*" = wildcard (supervisor / admin) — passa em qualquer recurso.
 *  - JWT sem claim (dev-user admin@atlas.test) — passa em tudo (retrocompat).
 *  - Exact match do resource key — permite.
 *  Ex.: requirePermissao(j, "bancos") libera para quem tem "bancos" marcado. */
export function requirePermissao(j: JwtClaims, resourceKey: string): void {
  const perms = j.averbadora_permissoes;
  if (!perms || perms.length === 0) return; // dev-user / JWT antigo — retrocompat
  if (perms.includes("*") || perms.includes(resourceKey)) return;
  throw Errors.forbidden(`Este recurso exige permissao "${resourceKey}". Seu usuario nao tem essa caixa marcada.`);
}
/** Variante: aceita QUALQUER uma das keys (OR). Util quando um endpoint serve
 *  duas telas diferentes (ex.: GET /beneficios usado por /averbadora/beneficios
 *  E por /averbadora/telemedicina — usuario precisa ter uma OU outra). */
export function requirePermissaoOneOf(j: JwtClaims, ...resourceKeys: string[]): void {
  const perms = j.averbadora_permissoes;
  if (!perms || perms.length === 0) return;
  if (perms.includes("*")) return;
  if (resourceKeys.some((k) => perms.includes(k))) return;
  throw Errors.forbidden(`Este recurso exige uma das permissoes: ${resourceKeys.join(", ")}.`);
}

/** LEGADO — mantido para retrocompat. Usa averbadora_perfil (label do preset).
 *  Novo codigo deve chamar requirePermissao(j, "<resource-key>") direto. */
export function requireAverbadoraPerfil(j: JwtClaims, ...allowed: NonNullable<JwtClaims["averbadora_perfil"]>[]): void {
  // Se JWT tem o claim novo permissoes, ignora o legado e passa (o gating real ja aconteceu).
  const perms = j.averbadora_permissoes;
  if (perms && (perms.includes("*") || perms.length > 0)) return;
  const p = j.averbadora_perfil;
  if (!p) return; // dev-user sem claim — trata como supervisor
  if (p === "supervisor") return;
  if (!allowed.includes(p)) {
    const perfisOk = allowed.length ? ["supervisor", ...allowed].join(", ") : "supervisor";
    throw Errors.forbidden(`Este recurso exige um dos perfis: ${perfisOk}. Seu perfil: ${p}.`);
  }
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
  /** URL base pra health check (opcional). Ex: "https://api.iFractal.com".
   *  Se preenchida, o monitor /averbadora/health pinga `${baseUrl}/health` a
   *  cada 20s (uptime real). Sem baseUrl, banco aparece como "sem endpoint". */
  baseUrl?: string;
  ultimoTeste?: string;
  ultimoTesteOk?: boolean;
  /** 2FA opcional pro operador do banco. Self-service via /banco/conta. */
  twoFactorEnabled?: boolean;
  /** RFC 6238 TOTP secret (base32). */
  twoFactorSecret?: string;
  // Dados do Receita/Junta Comercial preenchidos pela consulta CNPJ no cadastro.
  // Mesmo padrao usado em PrefeituraAdmin. Armazenados no config jsonb.
  cnpj?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  dataFundacao?: string;
  atividade?: string;
  telefone?: string;
  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cep?: string;
    municipio?: string;
    uf?: string;
  };
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
  /** Se true, o servidor pode editar email/telefone na propria conta pelo app.
   *  Se false, a tela /servidor/conta mostra os dados como somente-leitura e
   *  instrui procurar o RH. Cada prefeitura decide. Default: false (mais restritivo). */
  permiteServidorEditarContato?: boolean;
  /** Texto livre com condicoes exclusivas do cartao consignado para esta prefeitura
   *  ("municipios e orgaos publicos terao exclusividades"). Ex.: "Cartão Elo Consignado com
   *  1,5% a.m. exclusivo para servidores da Câmara Municipal." Aparece destacado na
   *  aba Cartão Consignado do servidor. Vazio = sem exclusividades. */
  exclusividadesCartaoConsig?: string;
  /** 2FA opcional pro operador da prefeitura. Self-service via /prefeitura/conta. */
  twoFactorEnabled?: boolean;
  /** RFC 6238 TOTP secret (base32). */
  twoFactorSecret?: string;
  // Dados do Receita/Junta Comercial preenchidos pela consulta CNPJ no cadastro.
  // Armazenados no config jsonb pra nao exigir migration.
  cnpj?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  dataFundacao?: string;
  atividade?: string;
  telefone?: string;
  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cep?: string;
    municipio?: string;
    uf?: string;
  };
}

// Normaliza resposta do ReceitaWS pro shape que o frontend consome (mesmo da
// BrasilAPI). Nao mapeia todos os campos — apenas os que a UI usa.
function mapReceitaWsToBrasilApi(r: Record<string, unknown>): Record<string, unknown> {
  const s = (k: string) => (typeof r[k] === "string" ? (r[k] as string) : undefined);
  const cepDigits = s("cep")?.replace(/\D/g, "");
  return {
    cnpj: s("cnpj")?.replace(/\D/g, ""),
    razao_social: s("nome"),
    nome_fantasia: s("fantasia"),
    data_inicio_atividade: s("abertura")?.split("/").reverse().join("-"),
    cnae_fiscal_descricao: (r["atividade_principal"] as { text?: string }[] | undefined)?.[0]?.text,
    logradouro: s("logradouro"),
    numero: s("numero"),
    complemento: s("complemento"),
    bairro: s("bairro"),
    cep: cepDigits,
    municipio: s("municipio"),
    uf: s("uf"),
    codigo_municipio_ibge: undefined,
    ddd_telefone_1: s("telefone"),
    email: s("email"),
    descricao_situacao_cadastral: s("situacao"),
  };
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

export interface VitrineBanner {
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

// Seed vazio: cliente pediu comecar do zero (16/07/2026). Banco Delta ja esta
// no PG (renomeado via /admin/bancos, id=1). Se o admin deletar TODOS os bancos,
// nao ha re-populacao automatica via seedBancosIfEmpty.
export const bancos: BancoAdmin[] = [];

// Snapshot das fixtures iniciais — usado como seed do Postgres na primeira carga.
const BANCOS_SEED: BancoAdmin[] = bancos.map((b) => ({ ...b }));

// Hidrata o array `bancos` do Postgres uma vez por isolate (semeando se vazio).
// High-water-mark de IDs em KV pra impedir reciclagem apos delete.
// Cenario que motivou (21/07/2026): admin deletou banco id=X, criou outro.
// `Math.max(...bancos.map(b => b.id), 0) + 1` recicla id=X quando a lista
// perde o registro. Consequencia: dev-user com banco_id=X hardcoded loga
// e "cai" no banco novo. Fix: guardar o max ja visto em KV; reservar o
// proximo id sempre acima disso.
async function nextIdMonotonic(env: Env, kvKey: string, currentMaxInMemory: number): Promise<number> {
  const stored = env.KV_CACHE ? Number((await env.KV_CACHE.get(kvKey)) ?? 0) : 0;
  const next = Math.max(stored, currentMaxInMemory, 0) + 1;
  if (env.KV_CACHE) await env.KV_CACHE.put(kvKey, String(next));
  return next;
}
async function nextBancoId(env: Env): Promise<number> {
  return nextIdMonotonic(env, "admin:bancos_max_id", Math.max(0, ...bancos.map((b) => b.id)));
}
async function nextPrefeituraId(env: Env): Promise<number> {
  return nextIdMonotonic(env, "admin:prefeituras_max_id", Math.max(0, ...prefeituras.map((p) => p.id)));
}

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

// Seed vazio (16/07/2026): cliente pediu remocao TOTAL dos seeds de prefeituras
// pra teste real do zero. Uma sessao paralela readicionou Palhoca/Floripa/Joinville
// em algum ponto; removendo de novo. Prefeituras novas entram via UI (CNPJ).
// Se restaurar pra demo, reverter este bloco.
export const prefeituras: PrefeituraAdmin[] = [];

const PREFEITURAS_SEED: PrefeituraAdmin[] = prefeituras.map((p) => ({ ...p }));
const SERVIDORES_SEED = SERVIDORES_BUSCA_MOCK.map((s) => ({ ...s }));
// Cliente pediu (17/07/2026) remocao TOTAL da whitelist de contas de teste —
// Diego (37534239800) / Mariana (12345678909) nao voltam mais via merge. Base
// zerada = zerada, sem excecao pra QA. Se um dia precisar, criar via cadastro
// normal + import CSV.
const TEST_CPFS = new Set<string>();

let _prefeiturasLoad: Promise<void> | null = null;
export function ensurePrefeiturasLoaded(env: Env): Promise<void> {
  if (_prefeiturasLoad) return _prefeiturasLoad;
  _prefeiturasLoad = (async () => {
    try {
      await ensureSchema(env);
      // Trava de purge: se o admin fez /db/purge-prefeituras, o flag
      // "purge:prefeituras" fica no KV pra impedir o seed automatico repopular
      // as prefeituras que o admin acabou de zerar. Sem a trava, o proximo
      // isolate frio re-seedaria e o loop ficaria infinito.
      const purged = env.KV_CACHE ? await env.KV_CACHE.get("purge:prefeituras") : null;
      if (!purged) await seedPrefeiturasIfEmpty(env, PREFEITURAS_SEED);
      const loaded = await loadPrefeituras(env);
      // Sempre sincroniza in-memory com o PG (mesmo que loaded esteja vazio).
      prefeituras.length = 0;
      if (loaded.length) prefeituras.push(...loaded);
    } catch (e) {
      _prefeiturasLoad = null;
      pushEvent("warn", "db.prefeituras.hydrate_failed", `Falha ao hidratar prefeituras: ${(e as Error).message}. Usando fixtures.`);
    }
  })();
  return _prefeiturasLoad;
}
async function persistPrefeitura(env: Env, p: PrefeituraAdmin): Promise<void> {
  try {
    await upsertPrefeitura(env, p);
    // Qualquer prefeitura recem-criada/editada libera o purge lock —
    // significa que o admin voltou a povoar a base manualmente.
    if (env.KV_CACHE) await env.KV_CACHE.delete("purge:prefeituras");
  } catch (e) { pushEvent("warn", "db.prefeituras.write_failed", `Falha ao persistir prefeitura ${p.id}: ${(e as Error).message}`); }
}

/** Re-sync in-memory de prefeituras do PG a cada request. Chamado no GET
 *  /admin/prefeituras (e outros) pra detectar hard-delete/edicao feita em
 *  outro isolate. Sem isso, isolates dormentes mostram prefeitura ja
 *  removida (aparece na lista mesmo apos delete). */
export async function refreshPrefeituras(env: Env): Promise<void> {
  try {
    await ensurePrefeiturasLoaded(env);
    const loaded = await loadPrefeituras(env);
    prefeituras.length = 0;
    if (loaded.length) prefeituras.push(...loaded);
  } catch { /* fail-safe */ }
}

// Servidores dependem de prefeituras (FK) — hidratar depois delas.
let _servidoresLoad: Promise<void> | null = null;
export function ensureServidoresLoaded(env: Env): Promise<void> {
  if (_servidoresLoad) return _servidoresLoad;
  _servidoresLoad = (async () => {
    try {
      await ensurePrefeiturasLoaded(env);
      // Mesma trava de purge — impede re-seed apos /db/purge-servidores.
      const purged = env.KV_CACHE ? await env.KV_CACHE.get("purge:servidores") : null;
      if (!purged) await seedServidoresIfEmpty(env, SERVIDORES_SEED);
      const loaded = await loadServidores(env);
      if (loaded.length) {
        // As contas de teste vêm SEMPRE do seed (com passwordHash correto), sobrescrevendo
        // qualquer versão do Postgres — um import/reseed da folha real pode ter removido ou
        // estragado o hash delas. Assim Diego/Mariana nunca quebram no login/primeiro acesso.
        const filtered: ServidorBuscaMock[] = loaded.filter((s) => !TEST_CPFS.has(s.cpf));
        // Test accounts so voltam se o purge nao esta ativo — assim base 100%
        // vazia realmente fica vazia (nem CPFs de demo entram).
        const testAccounts = purged ? [] : SERVIDORES_SEED.filter((s) => TEST_CPFS.has(s.cpf));
        SERVIDORES_BUSCA_MOCK.length = 0;
        SERVIDORES_BUSCA_MOCK.push(...filtered, ...testAccounts);
      } else if (purged) {
        // PG vazio + trava purge ativa: cliente pediu base zerada explicitamente.
        // Zera in-memory tambem (senao isolate frio carrega os fixtures hardcoded
        // do SERVIDORES_BUSCA_MOCK inicial e o "base zerada" nao acontece).
        SERVIDORES_BUSCA_MOCK.length = 0;
      }
      // Sem trava e PG vazio: MANTEM in-memory (fixtures ou servidor recem-importado
      // que ainda nao propagou pro PG). Regra do cliente: dados so somem por pedido explicito.
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

/** Re-sync de SERVIDORES_BUSCA_MOCK do PG a cada request. Chamado no login
 *  (auth) pra pegar mutacoes de outros isolates — especialmente F6:
 *  situacaoFuncional="DESLIGADO" precisa propagar pra que o auth bloqueie
 *  o servidor demitido em qualquer isolate. Sem isso, ensureServidoresLoaded
 *  so carrega 1x por isolate e outros isolates viam o servidor ainda ativo. */
export async function refreshServidores(env: Env): Promise<void> {
  try {
    await ensureServidoresLoaded(env);
    const purged = env.KV_CACHE ? await env.KV_CACHE.get("purge:servidores") : null;
    const loaded = await loadServidores(env);
    if (loaded.length) {
      const filtered = loaded.filter((s) => !TEST_CPFS.has(s.cpf));
      const testAccounts = purged ? [] : SERVIDORES_SEED.filter((s) => TEST_CPFS.has(s.cpf));
      SERVIDORES_BUSCA_MOCK.length = 0;
      SERVIDORES_BUSCA_MOCK.push(...filtered, ...testAccounts);
    }
  } catch { /* fail-safe: mantem memoria */ }
}

/** Parse de numero em formato BR ou US. Aceita:
 *   "R$ 5.000,50" | "5.000,50" | "5000,50" | "5000.50" | "5000" | 5000
 *   Retorna NaN se input vazio/invalido — chamador decide fallback. */
function parseNumberBr(v: unknown): number {
  if (typeof v === "number") return v;
  if (v == null) return NaN;
  const s = String(v).trim();
  if (!s) return NaN;
  // Remove tudo que nao e digito, virgula, ponto ou sinal (elimina "R$", espacos, etc).
  const clean = s.replace(/[^\d,.\-]/g, "");
  if (!clean) return NaN;
  // Se tem virgula E ponto: assume ponto como milhar, virgula como decimal (BR).
  // Se so tem virgula: e decimal BR. So ponto: pode ser milhar (US) ou decimal.
  const hasComma = clean.includes(",");
  const hasDot = clean.includes(".");
  let normalized = clean;
  if (hasComma && hasDot) {
    normalized = clean.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = clean.replace(",", ".");
  }
  // (so ponto: mantem — Number("5.000") = 5 (milhar) OU decimal, ambiguo; assume decimal)
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

/** Mapeia codigos numericos comuns de vinculo (usados por planilhas de RH) pra
 *  os literais que o sistema entende. Retorna undefined se nao reconhecer — o
 *  chamador cai no default "ESTATUTARIO". */
function mapVinculo(raw: unknown): "CLT" | "ESTATUTARIO" | "COMISSIONADO" | undefined {
  if (raw == null) return undefined;
  const v = String(raw).trim().toUpperCase();
  if (!v) return undefined;
  if (v === "ESTATUTARIO" || v === "CLT" || v === "COMISSIONADO") return v;
  // Codigos numericos: convencao "1=Estatutario, 2=CLT, 3=Comissionado".
  if (v === "1") return "ESTATUTARIO";
  if (v === "2") return "CLT";
  if (v === "3") return "COMISSIONADO";
  // Variantes textuais comuns.
  if (v.startsWith("EST")) return "ESTATUTARIO";
  if (v.startsWith("COM")) return "COMISSIONADO";
  return undefined;
}

// Cliente pediu remocao do seed das 4 folhas fixture (16/07/2026) pra teste
// real do zero — antes tinha F-2026-06-1/06-2/07-1/07-2 (Palhoca+Floripa) que
// reapareciam via seedCollectionIfEmpty depois de deletadas. Prefeituras
// cadastradas via UI criam suas proprias folhas. Se restaurar pra demo,
// reverter este commit.
export const folhas: FolhaAdmin[] = [];
const FOLHAS_SEED: FolhaAdmin[] = folhas.map((f) => ({ ...f }));
// Persistência das folhas (write-through + hydrate). Antes o array vivia so
// em memoria do isolate — folhas abertas via UI da prefeitura sumiam no proximo
// redeploy. Mesmo padrao usado em vitrine/perfis.
let _folhasLoad: Promise<void> | null = null;
export function ensureFolhasLoaded(env: Env): Promise<void> {
  if (_folhasLoad) return _folhasLoad;
  _folhasLoad = (async () => {
    try {
      await seedCollectionIfEmpty(env, "admin_folhas", FOLHAS_SEED.map((f) => ({ id: f.id, data: f })));
      const rows = await loadCollection<FolhaAdmin>(env, "admin_folhas");
      if (rows.length > 0) {
        folhas.length = 0;
        folhas.push(...rows);
      }
    } catch { _folhasLoad = null; }
  })();
  return _folhasLoad;
}
export async function persistFolha(env: Env, f: FolhaAdmin): Promise<void> {
  try { await upsertCollectionRow(env, "admin_folhas", f.id, f); } catch { /* fail-safe */ }
}

/** Reconcilia contratos "Aprovado" cujas ADFs foram marcadas 'falha' antes do
 *  fluxo F1-falha existir (dados historicos): promove pra 'Falha em folha' e
 *  persiste. Sem isso, a proposta fica presa em Em andamento no /servidor/contratos
 *  mesmo com todas ADFs falhadas. Idempotente. */
export async function reconcileContratosFalhaHistorica(env: Env): Promise<number> {
  await refreshContratos(env);
  const adfs = listAdfsGlobal();
  const falhaPorAdf = new Map<string, string>();
  for (const a of adfs) {
    if (a.status === "falha") falhaPorAdf.set(a.adf, a.motivo ?? "falha em folha");
  }
  let promovidos = 0;
  for (const [adf, motivo] of falhaPorAdf) {
    const ct = getContrato(adf);
    if (!ct) continue;
    const s = ct.situacao.toLowerCase();
    if (s.includes("falha em folha") || s.includes("cancel") || s.includes("quit") || s.includes("cobran")) continue;
    setContratoFalhaEmFolha(adf, motivo);
    await persistContrato(env, adf);
    promovidos++;
  }
  return promovidos;
}


// Cliente pediu remocao dos 2 banners de vitrine fixture (17/07/2026) — R$
// 18.000 (BAN-1 Banco Y) + R$ 9.200 (BAN-2 SCred) = R$ 27.200 apareciam como
// "Receita vitrine (mes)" no dashboard mesmo sem receita real. Se restaurar
// pra demo, reverter este bloco.
export const vitrine: VitrineBanner[] = [];
const VITRINE_SEED: VitrineBanner[] = vitrine.map((v) => ({ ...v }));
// Persistência da vitrine (write-through + hydrate; fail-safe pras fixtures).
let _vitrineLoad: Promise<void> | null = null;
export function ensureVitrineLoaded(env: Env): Promise<void> {
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
      const seed = exportUsersRaw();
      // Mesma trava dos outros purges — impede re-seed apos /db/purge-usuarios.
      const purged = env.KV_CACHE ? await env.KV_CACHE.get("purge:usuarios") : null;
      if (!purged) await seedCollectionIfEmpty(env, "admin_perfis", seed.map((u) => ({ id: String(u.id), data: u })));
      const rows = await loadCollection<AverbadoraUser>(env, "admin_perfis");
      // Migracao suave: se o PG ja tem os 5 seed users MAS sem passwordHash
      // (populados antes de existir seed com senha), preenche o hash do seed
      // atual pra o login funcionar. Nao mexe em nada mais — nome/perfil/2FA
      // continuam vindo do PG. So chega aqui pros ids que existem no seed.
      const seedById = new Map(seed.map((u) => [u.id, u]));
      for (const r of rows) {
        if (!r.passwordHash) {
          const s = seedById.get(r.id);
          if (s?.passwordHash) r.passwordHash = s.passwordHash;
        }
      }
      hydrateUsers(rows);
    } catch { _perfisLoad = null; }
  })();
  return _perfisLoad;
}
/** Persiste TODOS os usuários (lista pequena) — write-through após qualquer mutação. */
async function persistPerfis(env: Env): Promise<void> {
  try {
    for (const u of exportUsersRaw()) await upsertCollectionRow(env, "admin_perfis", String(u.id), u);
    // Criar/editar usuario libera o purge lock — base voltou a ser povoada.
    if (env.KV_CACHE && exportUsersRaw().length > 0) await env.KV_CACHE.delete("purge:usuarios");
  } catch { /* fail-safe */ }
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

/** Le o status do servidor (garantindo o load do override do PG). Usado pelo
 *  endpoint do proprio servidor pra esconder do switcher matriculas arquivadas
 *  (soft-delete de um registro fantasma criado por import de exemplo). */
export async function getServidorStatus(env: Env, matricula: string): Promise<ServidorStatus> {
  await ensureServidorStatusLoaded(env);
  return servidorStatusOverride.get(matricula) ?? "ativo";
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
export const pushEvent = (level: "info" | "warn" | "error", source: string, message: string, trace_id = randomTrace()): LogEntry => {
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
  // Convenios: bancoId + prefeituraId TEM que existir no banco. Se hardcoded
  // (era 1,1 / 1,2), o CSV vira orfao quando a base esta zerada. Gera dinamico:
  // usa o primeiro banco cadastrado + as primeiras 2 prefeituras. Se algum lado
  // vazio, retorna template com header + linha comentario avisando.
  .get("/v1/admin/convenios/csv-template", async (c) => {
    await Promise.all([ensureBancosLoaded(c.env), ensurePrefeiturasLoaded(c.env)]);
    const banco = bancos[0];
    const prefs = prefeituras.slice(0, 2);
    if (!banco || prefs.length === 0) {
      const aviso = `# Cadastre pelo menos 1 banco e 1 prefeitura antes de importar convenios.\n# Ainda ${!banco ? "sem banco" : ""}${!banco && prefs.length === 0 ? " e " : ""}${prefs.length === 0 ? "sem prefeitura" : ""} cadastrado.\nbancoId,prefeituraId,nome,codigoVerba,dataCorte,diaRepasse\n`;
      return csvResponse("convenios-exemplo.csv", aviso);
    }
    const linhas = prefs.map((p, i) => ({
      bancoId: banco.id, prefeituraId: p.id,
      nome: `${p.nome.toUpperCase()} / ${banco.nome.toUpperCase()}`,
      codigoVerba: `${1500 + i * 700} - VERBA CONSIGNACAO ${i + 1}`,
      dataCorte: 15 + i * 3, diaRepasse: 5 + i * 3,
    }));
    return csvResponse("convenios-exemplo.csv", buildCsv(
      ["bancoId", "prefeituraId", "nome", "codigoVerba", "dataCorte", "diaRepasse"],
      linhas,
    ));
  })
  // Servidores: template DINAMICO por prefeitura. Requer ?prefeituraId=N. Le
  // a config de campos da prefeitura (admin_servidor_campos_configs) e gera
  // headers apenas dos campos `visivel:true`, na ordem definida. Sem config,
  // usa default (14 campos built-in). Ver `modules/admin/servidor-campos.ts`.
  .get("/v1/admin/servidores/csv-template", async (c) => {
    await Promise.all([ensureBancosLoaded(c.env), ensurePrefeiturasLoaded(c.env)]);
    if (CONVENIOS_MOCK.length === 0) {
      try { await refreshConvenios(c.env); } catch { /* ignore */ }
    }
    const prefIdRaw = new URL(c.req.url).searchParams.get("prefeituraId");
    const prefId = Number(prefIdRaw);
    if (!prefIdRaw || !Number.isFinite(prefId)) {
      const aviso = "# Query param obrigatorio: ?prefeituraId=N\n# Cada prefeitura tem seus proprios campos de servidor configuraveis.\n";
      return csvResponse("servidores-exemplo.csv", aviso);
    }
    const pref = prefeituras.find((p) => p.id === prefId);
    if (!pref) {
      const aviso = `# Prefeitura ${prefId} nao encontrada.\n`;
      return csvResponse("servidores-exemplo.csv", aviso);
    }
    await refreshServidorCamposConfigs(c.env);
    const config = ensureServidorCamposConfig(prefId);
    // ?preset=custom_key -> usa o snapshot do preset (cada custom guarda o
    // estado do sistema quando foi criado; baixar o CSV daquele preset
    // replica esse estado). Sem preset, usa a config atual.
    const presetKey = new URL(c.req.url).searchParams.get("preset");
    let baseCampos: ServidorCampoConfig[] = config.campos;
    let presetCustom: ServidorCampoConfig | undefined;
    if (presetKey) {
      presetCustom = config.campos.find((f) => f.key === presetKey && !f.sistema);
      if (presetCustom && Array.isArray(presetCustom.snapshotCampos) && presetCustom.snapshotCampos.length > 0) {
        baseCampos = [...presetCustom.snapshotCampos, presetCustom];
      }
    }
    const camposVisiveis = baseCampos.filter((f) => f.visivel).sort((a, b) => a.ordem - b.ordem);
    // CSV usa slug puro (sem prefixo "custom_") — mais legivel pro operador
    // preencher. O importar aceita as duas formas (com e sem prefixo) via
    // lookup dupla, entao nao quebra CSVs antigos.
    const csvHeader = (key: string) => key.startsWith("custom_") ? key.slice("custom_".length) : key;
    const headers = camposVisiveis.map((f) => csvHeader(f.key));
    const convs = CONVENIOS_MOCK.filter((cv) => cv.prefeituraId === prefId).slice(0, 2);
    if (convs.length === 0) {
      const aviso = `# Prefeitura ${pref.nome} sem convenios cadastrados. Cadastre um convenio antes.\n${headers.join(",")}\n`;
      return csvResponse("servidores-exemplo.csv", aviso);
    }
    // Gera 1-2 linhas de exemplo. Para cada header visivel, chama placeholder
    // apropriado por tipo (built-in ou custom).
    const placeholderFor = (key: string, tipo: ServidorCampoTipo, idx: number): string => {
      // Built-ins com valores coerentes com convenio/prefeitura escolhidos.
      switch (key) {
        case "cpf": return `9990001112${idx}`;
        case "matricula": return `EXEMPLO-900${idx + 1}`;
        case "nome": return `EXEMPLO - Servidor ${idx + 1}`;
        case "email": return `exemplo${idx + 1}@example.com`;
        case "telefone": return `48991010${String(idx + 1).padStart(3, "0")}`;
        case "cargo": return idx === 0 ? "Professora II" : "Motorista";
        case "vinculo": return "ESTATUTARIO";
        case "situacaoFuncional": return "TRABALHANDO";
        case "salarioLiquido": return String(4620.50 + idx * 500);
        case "idConvenio": return convs[idx]?.id ?? convs[0]!.id;
        case "dataAdmissao": return "17/04/2017";
        case "dataNascimento": return "1985-03-12";
        case "endereco": return `Rua Exemplo, ${100 + idx} - Centro, ${pref.nome}/${pref.uf}`;
        case "codigoIbge": return String(pref.municipioIbge ?? 4211900);
      }
      // Campo custom: placeholder por tipo.
      switch (tipo) {
        case "numero": return String(100 + idx);
        case "moeda": return String(1000 + idx * 250);
        case "data": return "2020-01-15";
        case "email": return `custom${idx + 1}@example.com`;
        case "telefone": return `48999880${String(idx + 1).padStart(3, "0")}`;
        default: return `Exemplo ${idx + 1}`;
      }
    };
    // Cliente pediu 21/07/2026: baixar so o cabecalho, sem linhas de exemplo
    // pra evitar que operador esqueca de deletar e importe dados fake.
    // placeholderFor mantido pra retrocompat/debug; nao chamamos mais.
    void placeholderFor; void convs;
    return csvResponse("servidores-exemplo.csv", buildCsv(headers, []));
  });

export const adminRoutes = new Hono<{ Bindings: Env; Variables: { jwt: JwtClaims; trace_id: string } }>()
  // Escopado ao próprio prefixo — `.use("*")` vazaria para /v1/external/* quando montado em "/".
  .use("/v1/admin/*", authRequired)

  .get("/v1/admin/dashboard", async (c) => {
    requireAdmin(c.get("jwt"));
    await refreshContratos(c.env);
    // refreshServidores (nao ensureServidoresLoaded): o ensure e' memoized por
    // isolate — se rodou 1x com PG vazio, cacheia vazio pra sempre. Precisamos
    // ler do PG A CADA request pra topPrefeituras refletir servidores importados
    // recentemente. Mesmo padrao que /v1/admin/servidores usa.
    await refreshServidores(c.env);
    const todosContratos = listContratos({});
    // Contagem REAL de servidores por prefeitura — usa EXCLUSIVAMENTE o
    // vinculo explicito (prefeituraId do servidor ou prefeituraId do
    // convenio). Sem fallback pra id=1 (que prefeituraIdDe usa e infla
    // Capistrano com servidores orfaos). Cliente reportou 21/07/2026:
    // dashboard mostrava 31 pra Capistrano e visualizar mostrava 11 —
    // desmentindo a contagem inflada pelo fallback.
    const servidoresPorPref = new Map<number, number>();
    for (const s of SERVIDORES_BUSCA_MOCK) {
      const explicito =
        s.prefeituraId ??
        CONVENIOS_MOCK.find((cv) => cv.id === s.idConvenio)?.prefeituraId;
      if (explicito == null) continue; // servidor sem vinculo NAO conta
      servidoresPorPref.set(explicito, (servidoresPorPref.get(explicito) ?? 0) + 1);
    }
    const totalVitrineMes = vitrine.reduce((acc, v) => acc + v.receitaMes, 0);
    const preResumo = resumoPreReservas(todosContratos.map(contratoToPreReserva));
    const folhasAbertas = folhas.filter((f) => f.status === "aberta").length;
    // "Averbado" = margem efetivamente registrada em folha. Volume AVERBADO
    // conta SO contratos nesse estado (Ativo/Averbado/Formalizado) — nao
    // propostas em aberto, aprovadas nem canceladas. Cliente apontou 21/07/2026:
    // o card somava TODOS os contratos (listContratos({})) sob o rotulo
    // "averbado", contradizendo a conversao 0% (nada formalizado). Mesmo
    // criterio de `formalizadas` (conversao) — as duas metricas agora batem.
    const isAverbado = (ct: typeof todosContratos[number]): boolean => {
      const s = ct.situacao.toLowerCase();
      return s === "ativo" || s === "averbado" || s === "formalizado";
    };
    const contratosAverbados = todosContratos.filter(isAverbado);
    const volumePorConvenio = contratosAverbados.reduce<Record<string, number>>((acc, c) => {
      acc[c.convenio] = (acc[c.convenio] ?? 0) + c.valorFinanciado;
      return acc;
    }, {});
    const volumePorBanco = contratosAverbados.reduce<Record<string, number>>((acc, c) => {
      const banco = bancos.find((b) => b.id === c.bancoId)?.nome ?? "—";
      acc[banco] = (acc[banco] ?? 0) + c.valorFinanciado;
      return acc;
    }, {});
    // Contagem REAL de propostas por banco — antes vinha do Math.random(), que
    // fazia os numeros dancarem a cada request/refetch e nao batia com nada.
    const propostasPorBanco = todosContratos.reduce<Record<number, number>>((acc, c) => {
      acc[c.bancoId] = (acc[c.bancoId] ?? 0) + 1;
      return acc;
    }, {});
    const topBancos = bancos
      .map((b) => ({ nome: b.nome, propostas: propostasPorBanco[b.id] ?? 0 }))
      .sort((a, b) => b.propostas - a.propostas)
      .slice(0, 3);
    // "Propostas hoje" = contratos criados hoje (criadoEmIso). Antes contava TUDO
    // desde o inicio dos tempos e chamava de "hoje".
    const hojeIso = new Date().toISOString().slice(0, 10);
    const propostasHoje = todosContratos.filter((c) => (c.criadoEmIso ?? "").slice(0, 10) === hojeIso).length;
    // Conversao = formalizadas / total (bruto — nao considera propostas que nunca
    // viraram contrato porque nao temos historico delas na base atual). Ainda
    // assim, muito melhor que o 0.427 hardcoded que o cliente ja viu ha meses.
    const formalizadas = contratosAverbados.length;
    const conversao = todosContratos.length > 0 ? Math.round((formalizadas / todosContratos.length) * 1000) / 1000 : 0;
    return c.json({
      kpis: {
        propostasHoje,
        conversao,
        ticketMedio: todosContratos.length > 0 ? Math.round((todosContratos.reduce((a, c) => a + c.valorFinanciado, 0) / todosContratos.length) * 100) / 100 : 0,
        bancosAtivos: bancos.filter((b) => b.status === "ativo").length,
        prefeiturasAtivas: prefeituras.filter((p) => p.status === "ativo").length,
        servidoresCadastrados: SERVIDORES_BUSCA_MOCK.length,
        receitaVitrineMes: totalVitrineMes,
        preReservasAtivas: preResumo.ativas,
        preReservasExpirandoEm24h: preResumo.expirandoEm24h,
        margemTravada: preResumo.margemTotalTravada,
        folhasAbertas,
      },
      topBancos,
      topPrefeituras: prefeituras
        .map((p) => ({ nome: `${p.nome}/${p.uf}`, servidores: servidoresPorPref.get(p.id) ?? 0 }))
        .sort((a, b) => b.servidores - a.servidores)
        .slice(0, 3),
      volumePorConvenio: Object.entries(volumePorConvenio).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor),
      volumePorBanco: Object.entries(volumePorBanco).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor),
    });
  })

  // Cotacoes de telemedicina solicitadas pelos servidores (banner de Beneficios).
  // A averbadora ve os dados do servidor — principalmente o TELEFONE — pra formalizar.
  .get("/v1/admin/telemedicina/cotacoes", async (c) => {
    requireAdmin(c.get("jwt"));
    await expireStaleCotacoes(c.env); // cancela as >48h sem contato (libera margem)
    const list = await refreshCotacoes(c.env);
    const cotacoes = [...list]
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
      .map((x) => ({
        id: x.id,
        nome: x.nome,
        cpfMasked: x.cpfMasked,
        telefone: x.telefone,
        email: x.email,
        matricula: x.matricula,
        prefeitura: x.prefeitura,
        situacao: x.situacao,
        criadoEm: x.criadoEm,
        ativadoEm: x.ativadoEm ?? null,
        // Contrato anexado? Sem ele a averbadora nao consegue ativar o plano.
        temContrato: !!x.contratoKey,
        contratoNome: x.contratoNome ?? null,
      }));
    return c.json({ cotacoes });
  })
  // Limpa TODAS as cotacoes de telemedicina (limpeza de testes).
  .post("/v1/admin/telemedicina/cotacoes/purge", async (c) => {
    requireAdmin(c.get("jwt"));
    const apagadas = await purgeCotacoes(c.env);
    return c.json({ ok: true, apagadas });
  })

  // Averbadora anexa o CONTRATO da telemedicina (R2) — mesma regra do CCB do banco:
  // sem contrato anexado, o plano NAO pode ser ativado.
  .post("/v1/admin/telemedicina/cotacoes/:id/contrato", async (c) => {
    requireAdmin(c.get("jwt"));
    if (!c.env.R2_FILES) throw Errors.validation({ r2: "R2 binding indisponivel — configuracao Cloudflare pendente." });
    const id = c.req.param("id");
    await refreshCotacoes(c.env);
    const existe = (await loadCotacoesAdmin(c.env)).find((x) => x.id === id);
    if (!existe) throw Errors.notFound("cotacao");
    const form = await c.req.formData().catch(() => null);
    if (!form) throw Errors.validation({ body: "Envie multipart/form-data com o campo file." });
    const file = form.get("file");
    const isFile = (v: unknown): v is { name: string; size: number; type: string; arrayBuffer: () => Promise<ArrayBuffer> } =>
      typeof v === "object" && v !== null && typeof (v as { size?: unknown }).size === "number"
      && typeof (v as { arrayBuffer?: unknown }).arrayBuffer === "function";
    if (!isFile(file)) throw Errors.validation({ file: "campo 'file' obrigatorio" });
    // Mesma whitelist do CCB: PDF, DOCX, XLS, XLSX.
    const ACEITOS = new Set([
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]);
    const extOk = /\.(pdf|docx|xls|xlsx)$/i.test(file.name || "");
    if (file.type ? !ACEITOS.has(file.type) : !extOk) {
      throw Errors.validation({ file: "apenas PDF, DOCX ou Excel (XLS/XLSX)" });
    }
    if (file.size > 15 * 1024 * 1024) throw Errors.validation({ file: "arquivo maior que 15 MB" });
    const safeName = (file.name || "contrato.pdf").replace(/[^\w.-]/g, "_").slice(0, 60);
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const key = `telemedicina/${id}/${ts}-${safeName}`;
    const lower = safeName.toLowerCase();
    const storedType = file.type
      || (lower.endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : lower.endsWith(".xls") ? "application/vnd.ms-excel"
        : lower.endsWith(".docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : lower.endsWith(".pdf") ? "application/pdf"
        : "application/octet-stream");
    await c.env.R2_FILES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: storedType } });
    await setCotacaoContrato(c.env, id, key, safeName);
    return c.json({ ok: true, key, nome: safeName, size: file.size });
  })
  // Remove o contrato anexado (arquivo errado por engano) — volta a bloquear a ativacao.
  .delete("/v1/admin/telemedicina/cotacoes/:id/contrato", async (c) => {
    requireAdmin(c.get("jwt"));
    const cot = await removeCotacaoContrato(c.env, c.req.param("id"));
    if (!cot) throw Errors.notFound("cotacao");
    return c.json({ ok: true });
  })
  // Baixa o contrato anexado da cotacao.
  .get("/v1/admin/telemedicina/cotacoes/:id/contrato", async (c) => {
    requireAdmin(c.get("jwt"));
    if (!c.env.R2_FILES) throw Errors.notFound("r2");
    await refreshCotacoes(c.env);
    const cot = (await loadCotacoesAdmin(c.env)).find((x) => x.id === c.req.param("id"));
    if (!cot?.contratoKey) throw Errors.notFound("contrato");
    const obj = await c.env.R2_FILES.get(cot.contratoKey);
    if (!obj) throw Errors.notFound("arquivo");
    return new Response(obj.body, {
      headers: {
        "content-type": obj.httpMetadata?.contentType ?? "application/octet-stream",
        "content-disposition": `attachment; filename="${cot.contratoNome ?? "contrato.pdf"}"`,
      },
    });
  })
  // Averbadora ativa o plano de telemedicina: promove a RESERVA (contrato ja
  // criado quando servidor pediu a cotacao) pra "Ativo" e marca a cotacao
  // como "fechado". EXIGE contrato anexado antes.
  // Fallback: cotacoes antigas (pre-fix) sem contratoAdf caem no fluxo antigo
  // que CRIA contrato novo — mantém compat.
  .post("/v1/admin/telemedicina/cotacoes/:id/ativar", async (c) => {
    requireAdmin(c.get("jwt"));
    await refreshCotacoes(c.env);
    await refreshContratos(c.env);
    const pre = (await loadCotacoesAdmin(c.env)).find((x) => x.id === c.req.param("id"));
    if (!pre) throw Errors.notFound("cotacao");
    if (!pre.contratoKey) {
      throw Errors.validation({ contrato: "Anexe o contrato antes de ativar o plano." });
    }
    const cot = await updateCotacaoSituacao(c.env, c.req.param("id"), "fechado");
    if (!cot) throw Errors.notFound("cotacao");
    const ator = `averbadora:${c.get("jwt").sub}`;
    let contratoAdf = pre.contratoAdf;
    if (contratoAdf && getContrato(contratoAdf)) {
      // Fluxo novo: reserva ja existe — promove pra Ativo (mesma logica que
      // averbadora aplicar ADF no fluxo de emprestimo comum).
      setContratoSituacaoAtivo(contratoAdf, ator);
    } else {
      // Fallback: cotacao antiga sem reserva pre-criada. Cria contrato direto
      // Ativo pra nao quebrar historico.
      const entry = SERVIDORES_BUSCA_MOCK.find((x) => x.matricula === cot.matricula);
      const conv = entry ? CONVENIOS_MOCK.find((cv) => cv.id === entry.idConvenio) : undefined;
      const contrato = criarContratoOuReserva({
        bancoId: conv?.bancoId ?? 1,
        servidorId: cot.servidorId,
        idMatricula: entry?.idMatricula ?? cot.matricula,
        matricula: cot.matricula,
        nome: cot.nome,
        cpfMasked: cot.cpfMasked,
        convenioId: conv?.id ?? entry?.idConvenio ?? "",
        convenio: "Telemedicina Atlas",
        tipoContrato: "EMPRESTIMO",
        valorFinanciado: 50 * 12,
        parcelas: 12,
        taxaAm: 0, cetAm: 0, iof: 0, diasCarencia: 0,
        valorParcela: 50,
        codigoVerba: conv?.codigoVerba ?? "",
        observacoes: "Plano de Telemedicina — 12 meses (R$ 50,00/mês), descontado da margem de empréstimo consignado.",
        isReserva: false,
        tipoMargem: "EMPRESTIMO",
        ator: "averbadora",
      });
      contratoAdf = contrato.adf;
    }
    setContratoCcb(contratoAdf, pre.contratoKey, ator);
    await persistContrato(c.env, contratoAdf);
    return c.json({ ok: true, situacao: cot.situacao, contratoAdf });
  })
  // Averbadora cancela a cotacao (situacao -> "cancelado").
  .post("/v1/admin/telemedicina/cotacoes/:id/cancelar", async (c) => {
    requireAdmin(c.get("jwt"));
    await refreshCotacoes(c.env);
    await refreshContratos(c.env);
    const preCot = (await loadCotacoesAdmin(c.env)).find((x) => x.id === c.req.param("id"));
    const cot = await updateCotacaoSituacao(c.env, c.req.param("id"), "cancelado");
    if (!cot) throw Errors.notFound("cotacao");
    // Cancela a reserva vinculada — libera a margem de emprestimo. Ignora
    // erro (cotacao antiga sem reserva pre-criada nao tem contratoAdf).
    const adf = preCot?.contratoAdf;
    if (adf && getContrato(adf)) {
      aplicarAcao(adf, "cancelar", `averbadora:${c.get("jwt").sub}`, "Cotacao de telemedicina cancelada pela averbadora");
      await persistContrato(c.env, adf);
    }
    return c.json({ ok: true, situacao: cot.situacao });
  })

  // ===== Manutenção de contas de TESTE =====
  // Zera TODOS os 10 CPFs de teste (remove senha/e-mail/telefone + empréstimos) deixando-os
  // como novos usuários que ainda NÃO fizeram o primeiro acesso. Também apaga os
  // contratos/propostas do Diego (993410027) — a conta/login do Diego NÃO é tocada.
  // O roster é FIXO — o endpoint nunca toca um servidor real.
  .post("/v1/admin/manutencao/reset-servidores-teste", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "manutencao");
    await ensureServidoresLoaded(c.env);
    const TESTE: { cpf: string; matricula: string }[] = [
      { cpf: "01844730808", matricula: "700100001" },
      { cpf: "93025100850", matricula: "700100002" },
      { cpf: "40800297806", matricula: "700100003" },
      { cpf: "22421560802", matricula: "700100004" },
      { cpf: "88549417866", matricula: "700100005" },
      { cpf: "72430314800", matricula: "700100006" },
      { cpf: "43012777814", matricula: "700100007" },
      { cpf: "76568969885", matricula: "700100008" },
      { cpf: "45668163890", matricula: "700100009" },
      { cpf: "44334721826", matricula: "700100010" },
    ];
    const passos: Record<string, string> = {};

    // 1) Zera os 10 CPFs no Postgres (remove passwordHash/email/telefone) — ficam como
    //    primeiro-acesso pendente.
    let contasZeradas = 0;
    try {
      for (const t of TESTE) if ((await clearServidorConta(c.env, t.cpf)) > 0) contasZeradas++;
    } catch (e) { passos.clearServidorConta = (e as Error).message; }

    // 2) Apaga os empréstimos de TODAS as matrículas de teste + do Diego (993410027).
    const matriculas = [...TESTE.map((t) => t.matricula), "993410027"];
    let contratosPg = 0;
    try { contratosPg = await deleteContratosByMatriculas(c.env, matriculas); } catch (e) { passos.deleteContratos = (e as Error).message; }
    const contratosMem = removeContratosByMatricula(matriculas);

    // 3) Reflete na cópia em memória deste isolate.
    const cpfSet = new Set(TESTE.map((t) => t.cpf));
    for (const x of SERVIDORES_BUSCA_MOCK) {
      if (cpfSet.has(x.cpf)) { x.passwordHash = undefined; x.email = undefined; x.telefone = undefined; }
    }

    // 4) Libera pendências de primeiro-acesso desses CPFs (KV).
    if (c.env.KV_SESSIONS) for (const t of TESTE) await c.env.KV_SESSIONS.delete(`pa:${t.cpf}`);

    pushEvent("info", "admin.reset_servidores_teste", `Reset de teste: ${contasZeradas} contas zeradas (primeiro-acesso), ${contratosPg} empréstimos apagados.`);
    return c.json({
      zeradas: TESTE.map((t) => t.cpf),
      contasZeradas,
      contratosApagados: { postgres: contratosPg, memoria: contratosMem },
      ...(Object.keys(passos).length ? { erros: passos } : {}),
    });
  })

  // Apaga TODAS as propostas/contratos de uma ou mais matriculas — memoria +
  // Postgres. Nao mexe em dados do servidor (nome/senha/email). Usado pra
  // resetar cenarios de teste: "quero simular do zero, sem contratos travando
  // margem". Se a matricula era so uma reserva, some. Se ja era um contrato
  // averbado, tambem some — cuidado: nao existe "undo".
  .post("/v1/admin/manutencao/purge-contratos-matricula", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "manutencao");
    const body = z.object({
      matriculas: z.array(z.string().min(1)).min(1),
    }).parse(await c.req.json());
    let contratosPg = 0;
    const erros: Record<string, string> = {};
    try { contratosPg = await deleteContratosByMatriculas(c.env, body.matriculas); } catch (e) { erros.postgres = (e as Error).message; }
    const contratosMem = removeContratosByMatricula(body.matriculas);
    // ADFs materializadas ficam no _adfs in-memory. Sem essa linha, a fila do
    // ADF da averbadora continua mostrando entradas orfas dos contratos apagados.
    const adfsMem = removeAdfsByMatricula(body.matriculas);
    pushEvent("info", "admin.purge_matricula", `Purga: matriculas ${body.matriculas.join(", ")} → ${contratosPg} contratos PG, ${contratosMem} contratos mem, ${adfsMem} ADFs mem.`);
    return c.json({
      matriculas: body.matriculas,
      contratosApagados: { postgres: contratosPg, memoria: contratosMem },
      adfsApagadas: adfsMem,
      ...(Object.keys(erros).length ? { erros } : {}),
    });
  })

  // Zera senha + email + telefone de TODAS as matriculas de um CPF (via
  // clearServidorConta). Depois disso, o login por CPF cai no fallback do
  // DEV_USERS (senha "teste123") — util pra recuperar contas de teste que
  // tiveram a senha alterada num fluxo de redefinicao. Nao apaga contratos,
  // so limpa credenciais/contato.
  .post("/v1/admin/manutencao/reset-servidor-conta", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "manutencao");
    const body = z.object({
      cpfs: z.array(z.string().regex(/^\d{11}$/, "CPF deve ter 11 digitos")).min(1),
    }).parse(await c.req.json());
    const contas: Record<string, number> = {};
    const erros: Record<string, string> = {};
    for (const cpf of body.cpfs) {
      try {
        const n = await clearServidorConta(c.env, cpf);
        contas[cpf] = n;
        // Reflete na memoria in-isolate.
        SERVIDORES_BUSCA_MOCK.filter((x) => x.cpf === cpf).forEach((x) => {
          x.passwordHash = undefined;
          x.email = undefined;
          x.telefone = undefined;
        });
        // Libera pendencia de primeiro-acesso no KV pra poder cadastrar de novo.
        if (c.env.KV_SESSIONS) await c.env.KV_SESSIONS.delete(`pa:${cpf}`);
      } catch (e) { erros[cpf] = (e as Error).message; }
    }
    pushEvent("info", "admin.reset_servidor_conta", `Reset de conta: CPFs ${body.cpfs.join(", ")} → ${Object.values(contas).reduce((a, b) => a + b, 0)} matriculas zeradas.`);
    return c.json({ contas, ...(Object.keys(erros).length ? { erros } : {}) });
  })

  // ===== IA (OpenAI) =====
  .get("/v1/admin/ai/config", async (c) => {
    requireAdmin(c.get("jwt"));
    return c.json(await getAiStatus(c.env));
  })
  .put("/v1/admin/ai/config", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "configuracoes");
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
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "configuracoes");
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
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "configuracoes");
    return c.json(await testAiKey(c.env));
  })
  // ===== SMTP (envio de e-mails de confirmação) =====
  .get("/v1/admin/smtp/config", async (c) => {
    requireAdmin(c.get("jwt"));
    return c.json(await getSmtpStatus(c.env));
  })
  .put("/v1/admin/smtp/config", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "configuracoes");
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
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "configuracoes");
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
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "configuracoes");
    const { to } = z.object({ to: z.string().email() }).parse(await c.req.json());
    const r = await sendMail(c.env, {
      to,
      subject: "Atlas — teste de SMTP",
      text: "Este é um e-mail de teste do Atlas Averbadora.\n\nSe você recebeu, o servidor de e-mail (SMTP) está configurado corretamente e os e-mails de confirmação vão funcionar.\n\n— Atlas Averbadora",
    });
    return c.json(r);
  })

  // ===== Config de suporte (email/whatsapp/horario) exibida ao servidor =====
  .get("/v1/admin/suporte-config", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "configuracoes");
    return c.json(await getSuporteConfig(c.env));
  })
  .put("/v1/admin/suporte-config", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "configuracoes");
    const body = z.object({
      email: z.string().email().optional(),
      whatsapp: z.string().max(20).optional(),
      horario: z.string().max(200).optional(),
      mensagem: z.string().max(200).optional(),
    }).parse(await c.req.json());
    const proximo = await setSuporteConfig(c.env, body);
    appendAudit({
      categoria: "convenio_config", acao: "suporte.config.set",
      userId: c.get("jwt").sub, userRole: "averbadora",
      detalhes: `Config de suporte atualizada: email=${proximo.email} whatsapp=${proximo.whatsapp || "-"}`,
    });
    return c.json(proximo);
  })

  .post("/v1/admin/ai/normalize-csv", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "configuracoes");
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
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "bancos");
    return c.json({ bancos: bancos.map(sanitizeBanco) });
  })
  .get("/v1/admin/bancos/:id", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "bancos");
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

  // Kill-switch cross-isolate pra endpoints destrutivos.
  // Default: TRAVADO. Sessoes paralelas nao conseguem rodar purge/delete sem
  // que o usuario destrave manualmente. Auto-trava em <=300s (MAX_UNLOCK_SEC).
  .get("/v1/admin/destructive-lock", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    const state = await getLockState(c.env);
    return c.json({ ...state, maxUnlockSec: MAX_UNLOCK_SEC });
  })
  .post("/v1/admin/destructive-lock/unlock", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "manutencao");
    const body = (await c.req.json().catch(() => ({}))) as { senha?: string; durationSec?: number; reason?: string };
    const expected = c.env.ADMIN_PURGE_PASSWORD;
    if (!expected) throw Errors.validation({ senha: "Senha de operacoes destrutivas nao configurada." });
    if (!body.senha || body.senha !== expected) throw Errors.forbidden("Senha invalida");
    const duration = Math.min(Math.max(Number(body.durationSec) || 120, 30), MAX_UNLOCK_SEC);
    const state = await unlockDestructive(c.env, {
      durationSec: duration,
      unlockedBy: `averbadora:${j?.sub}`,
      reason: body.reason,
    });
    pushEvent("error", "admin.destructive_lock.unlock", `Endpoints destrutivos DESTRAVADOS por admin ${j?.sub} por ${duration}s. Motivo: ${body.reason ?? "-"}.`);
    appendAudit({ categoria: "termo_aceite", acao: "destructive_unlock", userId: `averbadora:${j?.sub}`, userRole: "averbadora", detalhes: `Destravou endpoints destrutivos por ${duration}s. Motivo: ${body.reason ?? "-"}.` });
    return c.json(state);
  })
  .post("/v1/admin/destructive-lock/lock", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    const state = await lockDestructive(c.env);
    pushEvent("info", "admin.destructive_lock.lock", `Endpoints destrutivos TRAVADOS por admin ${j?.sub}.`);
    return c.json(state);
  })

  // ⚠️ OPERACAO DESTRUTIVA: reseedAll faz TRUNCATE servidores/bancos/prefeituras +
  // re-seed. So existe pra reparar jsonb corrompido. GUARDA ANTI-RESET: exige
  // confirmacao explicita no body para NUNCA apagar dados por acidente/automacao/
  // deploy. Sem a frase exata, retorna 400 e nao toca no banco.
  .post("/v1/admin/db/reseed", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "manutencao");
    await requireUnlocked(c.env, "db/reseed");
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

  // ⚠️ OPERACAO DESTRUTIVA (escopo cirurgico): zera SO servidores + contratos +
  // ADFs + propostas + eventos + consentimentos. NAO toca em bancos, prefeituras
  // ou convenios. Cliente pediu (16/07/2026): "vamos comecar essa parte do zero".
  // Reverte cascade F6 de desligamento em contratos especificos. Usado quando
  // um servidor foi marcado como desligado por engano (ou readmitido). Body:
  // { senha, adfs: [...] }. Cada contrato listado volta pra situacao="Aprovado"
  // + folhaStatus limpo, e a ADF stale eh removida do _adfs pra rehidratar
  // como "recebida" no proximo ensureAdfs.
  .post("/v1/admin/contratos/reverter-desligamento", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "adf");
    await requireUnlocked(c.env, "contratos/reverter-desligamento");
    const body = (await c.req.json().catch(() => ({}))) as { senha?: string; adfs?: string[] };
    const expected = c.env.ADMIN_PURGE_PASSWORD;
    if (!expected) throw Errors.validation({ senha: "Senha de operacoes destrutivas nao configurada." });
    if (!body.senha || body.senha !== expected) throw Errors.forbidden("Senha invalida");
    const adfs = (body.adfs ?? []).filter(Boolean);
    if (adfs.length === 0) throw Errors.validation({ adfs: "Informe pelo menos uma ADF." });
    await refreshContratos(c.env);
    const ator = `averbadora:${j?.sub}`;
    const revertidos: string[] = [];
    for (const adf of adfs) {
      const ct = revertContratoDesligamento(adf, ator);
      if (ct && !ct.situacao.toLowerCase().includes("cobran")) {
        await persistContrato(c.env, adf);
        revertidos.push(adf);
      }
    }
    // Limpa ADFs stale para que o proximo ensureAdfs recrie com status correto.
    removeAdfsByContratoAdf(revertidos);
    appendAudit({ categoria: "margem", acao: "reverter_desligamento", userId: ator, userRole: "averbadora", detalhes: `Reversao de cascade F6 em ${revertidos.length} contrato(s): ${revertidos.join(", ")}.` });
    pushEvent("info", "admin.contratos.reverter_desligamento", `Reversao F6 por admin ${j?.sub}: ${revertidos.length} contratos.`);
    return c.json({ ok: true, revertidos });
  })
  // Delete cirurgico de anuencia — usado quando o admin registrou entrada
  // errada e precisa reverter (ex: nome truncado, prefeitura errada). Body:
  // { senha, ids }. Protegido por ADMIN_PURGE_PASSWORD.
  .post("/v1/admin/anuencias/delete", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    await requireUnlocked(c.env, "anuencias/delete");
    const body = (await c.req.json().catch(() => ({}))) as { senha?: string; ids?: string[] };
    const expected = c.env.ADMIN_PURGE_PASSWORD;
    if (!expected) throw Errors.validation({ senha: "Senha nao configurada." });
    if (!body.senha || body.senha !== expected) throw Errors.forbidden("Senha invalida");
    const ids = (body.ids ?? []).filter(Boolean);
    if (ids.length === 0) throw Errors.validation({ ids: "Informe ao menos um id." });
    const removidos: string[] = [];
    for (const id of ids) {
      try { await deleteCollectionRow(c.env, "admin_anuencias", id); } catch { /* segue */ }
      if (removeAnuenciaMemoria(id)) removidos.push(id);
      else removidos.push(id); // considera removido mesmo se so estava no PG
    }
    appendAudit({ categoria: "termo_aceite", acao: "anuencia_removida", userId: `averbadora:${j?.sub}`, userRole: "averbadora", detalhes: `Anuencia(s) removida(s) por admin: ${removidos.join(", ")}` });
    return c.json({ ok: true, removidos });
  })
  // Delete cirurgico por matricula(s) — protegido por ADMIN_PURGE_PASSWORD.
  // Usado pra expurgar contas de teste especificas (Diego/Mariana em 17/07/2026)
  // sem zerar a base inteira via /db/purge-servidores. Body: { senha, matriculas[] }.
  .post("/v1/admin/servidores/delete-matriculas", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "servidores");
    await requireUnlocked(c.env, "servidores/delete-matriculas");
    const body = (await c.req.json().catch(() => ({}))) as { senha?: string; matriculas?: string[] };
    const expected = c.env.ADMIN_PURGE_PASSWORD;
    if (!expected) throw Errors.validation({ senha: "Senha de operacoes destrutivas nao configurada." });
    if (!body.senha || body.senha !== expected) throw Errors.forbidden("Senha invalida");
    const mats = (body.matriculas ?? []).filter(Boolean);
    if (mats.length === 0) throw Errors.validation({ matriculas: "Informe pelo menos uma matricula." });
    const removidosContratos = await deleteContratosByMatriculas(c.env, mats).catch(() => 0);
    const removidosServidores = await deleteServidoresByMatriculas(c.env, mats).catch(() => 0);
    // Sincroniza in-memory tambem — evita o servidor sumir do PG mas continuar
    // aparecendo em outros isolates warm ate o proximo reload.
    for (let i = SERVIDORES_BUSCA_MOCK.length - 1; i >= 0; i--) {
      if (mats.includes(SERVIDORES_BUSCA_MOCK[i]!.matricula)) SERVIDORES_BUSCA_MOCK.splice(i, 1);
    }
    pushEvent("info", "admin.servidores.delete", `Delete cirurgico por admin ${j?.sub}: matriculas=${mats.join(",")} (${removidosServidores} servidores + ${removidosContratos} contratos).`);
    return c.json({ ok: true, removidosServidores, removidosContratos });
  })
  .post("/v1/admin/db/purge-servidores", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "manutencao");
    await requireUnlocked(c.env, "db/purge-servidores");
    const body = (await c.req.json().catch(() => ({}))) as { confirmar?: string };
    if (body.confirmar !== "APAGAR-SERVIDORES") {
      throw Errors.validation({
        confirmar: 'Operacao destrutiva bloqueada. Para confirmar, envie { "confirmar": "APAGAR-SERVIDORES" }. Apaga servidores + contratos + ADFs + propostas + eventos. Bancos/prefeituras/convenios ficam intocados.',
      });
    }
    pushEvent("error", "admin.db.purge_servidores", `PURGE DE SERVIDORES confirmado por admin ${j?.sub}: TRUNCATE servidores + contratos + adfs + propostas.`);
    // Seta flag ANTES do TRUNCATE pra evitar race com seed em isolate frio.
    if (c.env.KV_CACHE) await c.env.KV_CACHE.put("purge:servidores", "1");
    await purgeServidores(c.env);
    SERVIDORES_BUSCA_MOCK.length = 0;
    return c.json({ ok: true, mensagem: "Base de servidores zerada. Bancos/prefeituras/convenios preservados." });
  })

  // Purge cirurgico: SO contratos + propostas + ADFs (preserva servidores/bancos/prefeituras).
  // Usado quando cliente quer "testar do zero" o fluxo de contratos sem perder
  // servidores cadastrados. Body: { confirmar: "APAGAR-CONTRATOS" }.
  .post("/v1/admin/db/purge-contratos", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "manutencao");
    await requireUnlocked(c.env, "db/purge-contratos");
    const body = (await c.req.json().catch(() => ({}))) as { confirmar?: string };
    if (body.confirmar !== "APAGAR-CONTRATOS") {
      throw Errors.validation({
        confirmar: 'Operacao destrutiva bloqueada. Para confirmar, envie { "confirmar": "APAGAR-CONTRATOS" }. Apaga contratos + propostas + ADFs + eventos. Servidores/bancos/prefeituras/convenios ficam intocados.',
      });
    }
    pushEvent("error", "admin.db.purge_contratos", `PURGE CIRURGICO de contratos confirmado por admin ${j?.sub}: TRUNCATE contratos + propostas + eventos + folhas. TOMBAMENTO PRESERVADO.`);
    await purgeContratosApenas(c.env);
    clearContratosMemoria();
    clearAdfsMemoria();
    // NAO chama clearTombamentoMemoria — tombamento eh declaracao da prefeitura,
    // nao deve sumir com purge de contratos internos (bug repetido 20/07/2026).
    // Regra do cliente (20/07/2026): "nao faz sentido ter as folhas se nao tem
    // contrato/propostas". Sem contratos, todas as folhas viram cascas vazias
    // — apaga junto pra manter a base consistente. Se o cliente quiser reabrir
    // uma competencia depois, usa "+ Abrir competencia" na UI da prefeitura.
    const folhasRemovidas = folhas.length;
    for (const f of [...folhas]) {
      try { await deleteCollectionRow(c.env, "admin_folhas", f.id); } catch { /* segue */ }
    }
    folhas.length = 0;
    return c.json({ ok: true, mensagem: `Contratos + propostas + ADFs + ${folhasRemovidas} folha(s) zerados. Servidores/bancos/prefeituras preservados.` });
  })

  // ⚠️ OPERACAO DESTRUTIVA: zera prefeituras + convenios + folhas + ofertas
  // + tabelas de emprestimo. Bancos ficam mas sem convenio pra operar.
  // Cliente pediu (16/07/2026): recomecar cadastro de prefeituras do zero.
  // Limpa APENAS a tabela de prefeituras (sem cascatear pra convenios/folhas
  // /ofertas). Protegido por senha compartilhada em env.ADMIN_PURGE_PASSWORD.
  // Usado pelo botao "Limpar Base" em /averbadora/prefeituras.
  // Limpa APENAS a tabela de bancos. Protegido pela mesma senha compartilhada
  // (env.ADMIN_PURGE_PASSWORD) — mesma logica do /prefeituras/limpar-base.
  .post("/v1/admin/bancos/limpar-base", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "bancos");
    const body = (await c.req.json().catch(() => ({}))) as { senha?: string };
    const expected = c.env.ADMIN_PURGE_PASSWORD;
    if (!expected) throw Errors.validation({ senha: "Senha de operacoes destrutivas nao configurada no ambiente. Contate o operador da plataforma." });
    if (!body.senha || body.senha !== expected) throw Errors.forbidden("Senha invalida");
    const antes = bancos.length;
    for (const b of [...bancos]) {
      try { await deleteBancoRow(c.env, b.id); } catch { /* segue */ }
    }
    bancos.length = 0;
    pushEvent("info", "admin.bancos.limpar", `Base de bancos zerada por admin ${j?.sub} (${antes} removidos).`);
    return c.json({ ok: true, removidos: antes });
  })
  .post("/v1/admin/prefeituras/limpar-base", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "prefeituras");
    const body = (await c.req.json().catch(() => ({}))) as { senha?: string };
    const expected = c.env.ADMIN_PURGE_PASSWORD;
    if (!expected) throw Errors.validation({ senha: "Senha de operacoes destrutivas nao configurada no ambiente. Contate o operador da plataforma." });
    if (!body.senha || body.senha !== expected) throw Errors.forbidden("Senha invalida");
    // Trava anti-reseed antes do delete pra nao repopular via cold-start.
    if (c.env.KV_CACHE) await c.env.KV_CACHE.put("purge:prefeituras", "1");
    // Deleta so a tabela `prefeituras`. Rows dependentes (convenios FK etc)
    // ficam como orfaos ate serem limpas manualmente ou via /db/purge-prefeituras.
    const antes = prefeituras.length;
    for (const p of [...prefeituras]) {
      try { await deletePrefeituraRow(c.env, p.id); } catch { /* segue */ }
    }
    prefeituras.length = 0;
    pushEvent("info", "admin.prefeituras.limpar", `Base de prefeituras zerada por admin ${j?.sub} (${antes} removidas).`);
    return c.json({ ok: true, removidas: antes });
  })
  .post("/v1/admin/db/purge-prefeituras", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "manutencao");
    await requireUnlocked(c.env, "db/purge-prefeituras");
    const body = (await c.req.json().catch(() => ({}))) as { confirmar?: string };
    if (body.confirmar !== "APAGAR-PREFEITURAS") {
      throw Errors.validation({
        confirmar: 'Operacao destrutiva bloqueada. Para confirmar, envie { "confirmar": "APAGAR-PREFEITURAS" }. Apaga prefeituras + convenios + folhas + ofertas + tabelas de emprestimo. Bancos ficam intocados.',
      });
    }
    pushEvent("error", "admin.db.purge_prefeituras", `PURGE DE PREFEITURAS confirmado por admin ${j?.sub}: TRUNCATE prefeituras + convenios + folhas + ofertas.`);
    // Seta o flag ANTES do TRUNCATE. Se setar depois, um isolate frio que
    // chegue no meio pode ver o PG vazio, rodar seedPrefeiturasIfEmpty e
    // re-popular — race condition observada em 16/07/2026.
    if (c.env.KV_CACHE) {
      await c.env.KV_CACHE.put("purge:prefeituras", "1");
      await c.env.KV_CACHE.put("purge:servidores", "1");
    }
    await purgePrefeituras(c.env);
    prefeituras.length = 0;
    CONVENIOS_MOCK.length = 0;
    SERVIDORES_BUSCA_MOCK.length = 0;
    return c.json({ ok: true, mensagem: "Prefeituras, convenios, folhas e ofertas zerados. Bancos preservados." });
  })

  // ⚠️ OPERACAO DESTRUTIVA: zera usuarios da averbadora (admin_perfis) +
  // usuarios do banco (users, banco_usuarios). Dev-users hardcoded em
  // auth/index.ts (admin@atlas.test, banco@atlas.test) continuam funcionando
  // pra nao trancar o login. Perfis de prefeitura vivem so em memoria — sem
  // persistencia. Cliente pediu (16/07/2026): recomecar cadastro do zero.
  .post("/v1/admin/db/purge-usuarios", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "manutencao");
    await requireUnlocked(c.env, "db/purge-usuarios");
    const body = (await c.req.json().catch(() => ({}))) as { confirmar?: string };
    if (body.confirmar !== "APAGAR-USUARIOS") {
      throw Errors.validation({
        confirmar: 'Operacao destrutiva bloqueada. Para confirmar, envie { "confirmar": "APAGAR-USUARIOS" }. Apaga usuarios da averbadora e do banco. Dev-users (admin@atlas.test, banco@atlas.test) continuam funcionando.',
      });
    }
    pushEvent("error", "admin.db.purge_usuarios", `PURGE DE USUARIOS confirmado por admin ${j?.sub}: TRUNCATE users + banco_usuarios + admin_perfis.`);
    // Trava contra re-seed antes do TRUNCATE (evita race com isolate frio).
    if (c.env.KV_CACHE) await c.env.KV_CACHE.put("purge:usuarios", "1");
    await purgeUsuarios(c.env);
    // Limpa memoria in-isolate: users da averbadora.
    hydrateUsers([]);
    _perfisLoad = null;
    return c.json({ ok: true, mensagem: "Usuarios averbadora e banco zerados. Dev-users hardcoded preservados." });
  })

  // ⚠️ OPERACAO DESTRUTIVA: zera todos os comunicados (banco + servidor).
  // Cliente pediu (16/07/2026).
  .post("/v1/admin/db/purge-comunicados", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "manutencao");
    await requireUnlocked(c.env, "db/purge-comunicados");
    const body = (await c.req.json().catch(() => ({}))) as { confirmar?: string };
    if (body.confirmar !== "APAGAR-COMUNICADOS") {
      throw Errors.validation({
        confirmar: 'Operacao destrutiva bloqueada. Para confirmar, envie { "confirmar": "APAGAR-COMUNICADOS" }.',
      });
    }
    pushEvent("error", "admin.db.purge_comunicados", `PURGE DE COMUNICADOS confirmado por admin ${j?.sub}: TRUNCATE admin_comunicados.`);
    if (c.env.KV_CACHE) await c.env.KV_CACHE.put("purge:comunicados", "1");
    await purgeComunicados(c.env);
    COMUNICADOS_MOCK.length = 0;
    return c.json({ ok: true, mensagem: "Comunicados zerados." });
  })

  .post("/v1/admin/bancos", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "bancos");
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
        // URL base pra health check (opcional). Se preenchida, o monitor
        // /averbadora/health pinga /health desse endpoint a cada request.
        baseUrl: z.string().url().optional().or(z.literal("")),
        // Campos novos (consulta CNPJ) — armazenados no config jsonb via ...rest.
        cnpj: z.string().max(14).optional().or(z.literal("")),
        razaoSocial: z.string().max(200).optional().or(z.literal("")),
        nomeFantasia: z.string().max(200).optional().or(z.literal("")),
        dataFundacao: z.string().max(10).optional().or(z.literal("")),
        atividade: z.string().max(200).optional().or(z.literal("")),
        telefone: z.string().max(40).optional().or(z.literal("")),
        endereco: z.object({
          logradouro: z.string().optional().or(z.literal("")),
          numero: z.string().optional().or(z.literal("")),
          complemento: z.string().optional().or(z.literal("")),
          bairro: z.string().optional().or(z.literal("")),
          cep: z.string().optional().or(z.literal("")),
          municipio: z.string().optional().or(z.literal("")),
          uf: z.string().optional().or(z.literal("")),
        }).optional(),
      })
      .parse(await c.req.json());
    const { password, loginEmail, ...rest } = body;
    const normalizedLogin = loginEmail ? loginEmail.trim().toLowerCase() : undefined;
    if (normalizedLogin) {
      // Mesma protecao do POST /prefeituras — bloqueia emails reservados
      // pros dev-users (evita conflito no auth/login).
      const reservados = ["admin@atlas.test", "banco@atlas.test", "prefeitura@atlas.test"];
      if (reservados.includes(normalizedLogin)) {
        throw Errors.validation({ loginEmail: `E-mail ${normalizedLogin} e reservado pro sistema. Use outro (ex.: contato@banco.com.br).` });
      }
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
      id: await nextBancoId(c.env),
      loginEmail: normalizedLogin,
      passwordHash: password ? await sha256Hex(password) : undefined,
    };
    bancos.push(novo);
    pushEvent("info", "admin", `Banco "${novo.nome}" criado${password ? " com credencial de acesso" : ""}`);
    await persistBanco(c.env, novo);
    return c.json({ banco: sanitizeBanco(novo) });
  })
  .post("/v1/admin/bancos/:id/testar-conexao", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "bancos");
    const b = bancos.find((x) => x.id === Number(c.req.param("id")));
    if (!b) throw Errors.notFound("banco");
    b.ultimoTeste = new Date().toISOString();
    b.ultimoTesteOk = b.adapter === "sandbox"; // sandbox sempre passa
    pushEvent(b.ultimoTesteOk ? "info" : "error", "admin", `Teste de conexao ${b.nome} ${b.ultimoTesteOk ? "OK" : "FALHOU"}`);
    await persistBanco(c.env, b);
    return c.json({ ok: b.ultimoTesteOk, banco: sanitizeBanco(b) });
  })
  .post("/v1/admin/bancos/:id/reset-password", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "bancos");
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
    requirePermissao(j, "bancos");
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
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "prefeituras");
    // Re-sync do PG: sem isso hard-delete feito em outro isolate nao propaga
    // e a lista mostra prefeitura ja removida.
    await refreshPrefeituras(c.env);
    await ensureServidoresLoaded(c.env); // pra contagem real
    // servidoresCount OVERRIDE com contagem REAL: o campo do PG e um numero
    // declarado manualmente no form (default 0), mas o usuario espera ver a
    // contagem real de servidores cadastrados. Bug reportado 21/07/2026:
    // Capistrano mostrando 0 mesmo com 11 servidores.
    // Mesma regra do dashboard: vinculo EXPLICITO, sem fallback pra id=1.
    // Cliente pediu 21/07/2026 dados reais — servidor orfao (sem prefeituraId
    // e sem convenio com prefeituraId) NAO deve ser atribuido a Capistrano
    // so porque prefeituraIdDe defaulta pra 1.
    const countByPref = new Map<number, number>();
    for (const s of SERVIDORES_BUSCA_MOCK) {
      const explicito =
        s.prefeituraId ??
        CONVENIOS_MOCK.find((cv) => cv.id === s.idConvenio)?.prefeituraId;
      if (explicito == null) continue;
      countByPref.set(explicito, (countByPref.get(explicito) ?? 0) + 1);
    }
    return c.json({
      prefeituras: prefeituras.map((p) => ({
        ...sanitizePrefeitura(p),
        servidoresCount: countByPref.get(p.id) ?? 0,
      })),
    });
  })
  // Consulta CNPJ com fallback multi-provider + cache KV 24h. Ordem:
  // 1) KV_CACHE (se hit, retorna direto — evita 429)
  // 2) BrasilAPI (Receita + Junta Comercial, gratuito mas rate-limited 3req/min)
  // 3) ReceitaWS (fallback, tambem gratuito, limite menor)
  // Ambos retornam shapes diferentes — normalizamos pro shape do BrasilAPI
  // (que o frontend ja consome). Se ambos 429/falharem, mensagem clara.
  .get("/v1/admin/prefeituras/consulta-cnpj/:cnpj", async (c) => {
    // Reutilizado tambem pelo cadastro de bancos — mesma consulta CNPJ.
    // Aceita quem tem permissao em prefeituras OU bancos (nao amarra ao path).
    const j = c.get("jwt"); requireAdmin(j); requirePermissaoOneOf(j, "prefeituras", "bancos");
    const raw = c.req.param("cnpj").replace(/\D/g, "");
    if (raw.length !== 14) throw Errors.validation({ cnpj: "CNPJ invalido — envie 14 digitos" });
    // v2: bump apos adicionar enriquecimento IBGE — invalida entradas antigas
    // que foram cacheadas sem codigo_municipio_ibge (a UI exige IBGE agora).
    const cacheKey = `cnpj:v2:${raw}`;
    let cameFromCache = false;
    let dados: Record<string, unknown> | null = null;
    // 1) Cache — CNPJ nao muda com frequencia; 24h e razoavel.
    if (c.env.KV_CACHE) {
      const cached = await c.env.KV_CACHE.get(cacheKey);
      if (cached) {
        dados = JSON.parse(cached) as Record<string, unknown>;
        cameFromCache = true;
      }
    }
    // 2) BrasilAPI — provedor primario (so bate se nao veio do cache).
    let ultimoErro = "";
    if (!dados) {
      try {
        const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${raw}`);
        if (r.status === 404) throw Errors.notFound("cnpj_nao_encontrado");
        if (r.ok) dados = await r.json() as Record<string, unknown>;
        else ultimoErro = `BrasilAPI HTTP ${r.status}`;
      } catch (e) {
        if ((e as { status?: number }).status === 404) throw e;
        ultimoErro = `BrasilAPI: ${(e as Error).message}`;
      }
    }
    // 3) ReceitaWS — fallback. Retorna nomes de campo em PT — normalizamos.
    if (!dados) {
      try {
        const r = await fetch(`https://receitaws.com.br/v1/cnpj/${raw}`);
        if (r.ok) {
          const rw = await r.json() as Record<string, unknown>;
          if (rw.status === "ERROR") {
            ultimoErro = `${ultimoErro} + ReceitaWS: ${String(rw.message ?? "erro")}`;
          } else {
            dados = mapReceitaWsToBrasilApi(rw);
          }
        } else {
          ultimoErro = `${ultimoErro} + ReceitaWS HTTP ${r.status}`;
        }
      } catch (e) {
        ultimoErro = `${ultimoErro} + ReceitaWS: ${(e as Error).message}`;
      }
    }
    if (!dados) {
      throw Errors.validation({
        cnpj: ultimoErro.includes("429")
          ? "Limite temporario de consulta atingido. Aguarde 1 minuto e tente de novo."
          : `Consulta falhou (${ultimoErro}). Tente de novo em instantes.`,
      });
    }
    // Enriquecimento IBGE: SEMPRE que faltar (cache antigo ou provedor sem
    // IBGE). Frontend exige IBGE pra permitir save do cadastro — sem ele o
    // usuario ficaria travado. Endpoint /ibge/municipios usa rate limit
    // separado do /cnpj, entao raramente bate 429.
    let ibgeEnriquecido = false;
    if (!dados.codigo_municipio_ibge && dados.uf && dados.municipio) {
      try {
        const r = await fetch(`https://brasilapi.com.br/api/ibge/municipios/v1/${dados.uf}`);
        if (r.ok) {
          const municipios = await r.json() as { nome: string; codigo_ibge: string }[];
          const alvo = String(dados.municipio).toUpperCase().trim();
          const match = municipios.find((m) => m.nome.toUpperCase() === alvo);
          if (match) {
            dados.codigo_municipio_ibge = Number(match.codigo_ibge);
            ibgeEnriquecido = true;
          }
        }
      } catch { /* fail-safe: IBGE fica vazio, frontend bloqueia save com msg clara */ }
    }
    // Cacheia por 24h — proxima consulta ao mesmo CNPJ nao passa pelo provedor.
    // Refaz cache se veio de cache mas o IBGE foi enriquecido agora (cache
    // antigo estava sem, novo tem). Sem isso, ficariamos re-enriquecendo em
    // toda request.
    if (c.env.KV_CACHE && (!cameFromCache || ibgeEnriquecido)) {
      try { await c.env.KV_CACHE.put(cacheKey, JSON.stringify(dados), { expirationTtl: 86400 }); } catch { /* fail-safe */ }
    }
    return c.json({ dados });
  })
  .post("/v1/admin/prefeituras", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "prefeituras");
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
        folhaSincUrl: z.string().optional().or(z.literal("")).refine(
          (v) => !v || /^https?:\/\//i.test(v),
          { message: "URL da folha deve começar com http:// ou https://" },
        ),
        permiteServidorEditarContato: z.boolean().optional(),
        exclusividadesCartaoConsig: z.string().max(500).optional().or(z.literal("")),
        // Campos novos (consulta CNPJ) — armazenados no config jsonb via ...rest.
        cnpj: z.string().max(14).optional().or(z.literal("")),
        razaoSocial: z.string().max(200).optional().or(z.literal("")),
        nomeFantasia: z.string().max(200).optional().or(z.literal("")),
        dataFundacao: z.string().max(10).optional().or(z.literal("")),
        atividade: z.string().max(200).optional().or(z.literal("")),
        telefone: z.string().max(40).optional().or(z.literal("")),
        endereco: z.object({
          logradouro: z.string().optional().or(z.literal("")),
          numero: z.string().optional().or(z.literal("")),
          complemento: z.string().optional().or(z.literal("")),
          bairro: z.string().optional().or(z.literal("")),
          cep: z.string().optional().or(z.literal("")),
          municipio: z.string().optional().or(z.literal("")),
          uf: z.string().optional().or(z.literal("")),
        }).optional(),
      })
      .parse(await c.req.json());
    const { password, loginEmail, ...rest } = body;
    const normalizedLogin = loginEmail ? loginEmail.trim().toLowerCase() : undefined;
    if (normalizedLogin) {
      // Bloqueia emails de dev-users (admin@atlas.test / banco@atlas.test /
      // capistrano@teste.com) — se prefeitura pegar esses, o auth/login
      // resolve pra prefeitura em vez do dev-user e quebra login de teste.
      const reservados = ["admin@atlas.test", "banco@atlas.test", "prefeitura@atlas.test"];
      if (reservados.includes(normalizedLogin)) {
        throw Errors.validation({ loginEmail: `E-mail ${normalizedLogin} e reservado pro sistema. Use outro (ex.: prefeitura@municipio.gov.br).` });
      }
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
      id: await nextPrefeituraId(c.env),
      loginEmail: normalizedLogin,
      passwordHash: password ? await sha256Hex(password) : undefined,
    };
    prefeituras.push(novo);
    // Cria a config de ID unico default (prefixo derivado do nome/UF, SEQ 6 digitos)
    // — evita "Nenhum item encontrado" logo apos o cadastro; averbadora pode
    // ajustar depois via POST /admin/id-unico/configs.
    ensureIdUnicoConfig(novo.id, novo.nome, novo.uf);
    pushEvent("info", "admin", `Prefeitura "${novo.nome}/${novo.uf}" criada${password ? " com credencial de acesso" : ""}`);
    await persistPrefeitura(c.env, novo);
    return c.json({ prefeitura: sanitizePrefeitura(novo) });
  })
  .post("/v1/admin/prefeituras/:id/sincronizar", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "prefeituras");
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
      // Contato/endereço vazios no CSV NÃO devem sobrescrever o que o servidor
      // escolheu no primeiro acesso — só entram em `rec` se vierem preenchidos.
      const rec: ServidorBuscaMock = {
        cpf, cpfMasked: `${cpf.slice(0, 3)}.***.***-${cpf.slice(-2)}`,
        matricula: r.matricula, idMatricula: `MAT-${r.matricula}`, prefeituraId: p.id, nome: r.nome,
        dataAdmissao: r.dataAdmissao ?? "", dataNascimento: r.dataNascimento ?? "",
        vinculo: vinculo as ServidorBuscaMock["vinculo"], origem: p.nome,
        situacaoFuncional: (r.situacaoFuncional ?? "TRABALHANDO") as ServidorBuscaMock["situacaoFuncional"],
        salarioLiquido: Number.isFinite(salario) ? salario : 0, idConvenio,
        cargo: r.cargo, codigoIbge: Number.isFinite(ibge) ? ibge : p.municipioIbge,
      };
      if (r.email) rec.email = r.email;
      if (r.telefone) rec.telefone = r.telefone;
      if (r.endereco) rec.endereco = r.endereco;
      if (existing) { Object.assign(existing, rec); atualizados++; upserts.push(existing); }
      else { SERVIDORES_BUSCA_MOCK.push(rec); novos++; upserts.push(rec); }
    }
    // Write-through: persiste no PG (best-effort — falhas nao quebram a sync).
    try {
      for (const s of upserts) await upsertServidor(c.env, s);
      // Import CSV com dados de verdade libera o purge lock — base voltou a ser povoada.
      if (upserts.length > 0 && c.env.KV_CACHE) await c.env.KV_CACHE.delete("purge:servidores");
    } catch { /* fail-safe */ }
    p.servidoresCount = SERVIDORES_BUSCA_MOCK.filter((s) => s.prefeituraId === p.id).length;
    p.ultimaSincronizacao = ts;
    p.ultimaSincResultado = { novos, atualizados, ts };
    pushEvent("info", "cron", `Folha ${p.nome} sincronizada: ${novos} novos, ${atualizados} atualizados`);
    await persistPrefeitura(c.env, p);
    return c.json({ prefeitura: sanitizePrefeitura(p), resultado: p.ultimaSincResultado });
  })
  .post("/v1/admin/prefeituras/:id/reset-password", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "prefeituras");
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
    requirePermissao(j, "prefeituras");
    const id = Number(c.req.param("id"));
    const hard = c.req.query("hard") === "true";
    const p = prefeituras.find((x) => x.id === id);
    if (!p) throw Errors.notFound("prefeitura");
    if (hard) {
      // Hard-delete: apaga do PG e da memoria. Sem contratos/servidores
      // associados so pode ser feito por supervisor (permissao prefeituras
      // ja checa isso). Usado pra remover cadastros de teste ou duplicados
      // que ficaram na base — o soft-delete deixa 'inativo' mas continua
      // aparecendo na lista.
      await deletePrefeituraRow(c.env, id);
      const idx = prefeituras.findIndex((x) => x.id === id);
      if (idx >= 0) prefeituras.splice(idx, 1);
      appendAudit({ categoria: "acesso", acao: "prefeitura_hard_deleted", userId: `averbadora:${j.sub}`, userRole: "averbadora", detalhes: `Prefeitura "${p.nome}" (id=${id}) DELETADA permanentemente.` });
      pushEvent("warn", "admin.prefeituras.hard_delete", `Prefeitura "${p.nome}" DELETADA por user:${j.sub}`);
      return c.json({ ok: true, deleted: id });
    }
    p.status = "inativo";
    await persistPrefeitura(c.env, p);
    appendAudit({ categoria: "acesso", acao: "prefeitura_desativada", userId: `averbadora:${j.sub}`, userRole: "averbadora", detalhes: `Prefeitura "${p.nome}" (id=${id}) desativada.` });
    pushEvent("info", "admin.prefeituras.desativar", `Prefeitura "${p.nome}" desativada por user:${j.sub}`);
    return c.json({ prefeitura: sanitizePrefeitura(p) });
  })

  .post("/v1/admin/convenios/:id/reativar", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "convenios");
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
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "convenios");
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

  // Config dos campos de servidor POR PREFEITURA. Cada prefeitura escolhe quais
  // campos quer visiveis + obrigatorios + custom. cpf/matricula travados.
  // Ver `modules/admin/servidor-campos.ts`.
  .get("/v1/admin/servidores/campos-config/:prefeituraId", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "servidores");
    const prefId = Number(c.req.param("prefeituraId"));
    if (!Number.isFinite(prefId)) throw Errors.validation({ prefeituraId: "invalido" });
    await refreshServidorCamposConfigs(c.env);
    let config = ensureServidorCamposConfig(prefId);
    // Re-sanea sempre no GET pra flags obsoletas (ex: email travado apos remocao
    // de CHAVES_TRAVADAS em 21/07/2026) sumirem sem exigir save manual do admin.
    // Se resultado difere do stored, upsert + persist pra correcao ser durable.
    const camposLimpos = sanitizeCampos(config.campos);
    if (JSON.stringify(camposLimpos) !== JSON.stringify(config.campos)) {
      config = upsertServidorCamposConfig({ prefeituraId: prefId, campos: camposLimpos });
    }
    // Se acabou de criar (sem persist), grava agora pra sincronizar isolates.
    try { await persistServidorCamposConfig(c.env, config); } catch { /* best-effort */ }
    return c.json({ config });
  })
  .put("/v1/admin/servidores/campos-config/:prefeituraId", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "servidores");
    const prefId = Number(c.req.param("prefeituraId"));
    if (!Number.isFinite(prefId)) throw Errors.validation({ prefeituraId: "invalido" });
    const pref = prefeituras.find((p) => p.id === prefId);
    if (!pref) throw Errors.notFound("prefeitura");
    const body = (await c.req.json().catch(() => ({}))) as { campos?: ServidorCampoConfig[] };
    const camposIn = Array.isArray(body.campos) ? body.campos : [];
    // sanitizeCampos re-injeta visivel+obrigatorio+travado nos travados
    // (cpf/matricula/email) — payload malicioso nao consegue desligar.
    const camposLimpos = sanitizeCampos(camposIn);
    const config = upsertServidorCamposConfig({ prefeituraId: prefId, campos: camposLimpos });
    await persistServidorCamposConfig(c.env, config);
    pushEvent("info", "admin.servidor_campos.update", `Campos de servidor da prefeitura ${pref.nome} atualizados por admin ${j?.sub}: ${config.campos.length} campos (${config.campos.filter((f) => f.visivel).length} visiveis).`);
    return c.json({ config });
  })

  .get("/v1/admin/servidores", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "servidores");
    // Sincroniza SERVIDORES_BUSCA_MOCK com o PG a CADA request — sem isso,
    // isolate warm segurava a lista velha e servidor recem-importado em outro
    // isolate sumia. Padrao equivalente ao refreshContratos/refreshConvenios.
    await ensureServidoresLoaded(c.env);
    try {
      const loaded = await loadServidores(c.env);
      const inMemoryTests = SERVIDORES_BUSCA_MOCK.filter((s) => TEST_CPFS.has(s.cpf));
      const merged = [
        ...loaded.filter((s) => !TEST_CPFS.has(s.cpf)),
        ...inMemoryTests,
      ];
      SERVIDORES_BUSCA_MOCK.length = 0;
      SERVIDORES_BUSCA_MOCK.push(...merged);
    } catch { /* fail-safe: usa in-memory */ }
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
      dataAdmissao: s.dataAdmissao ?? "",
      dataNascimento: s.dataNascimento ?? "",
      hasPassword: !!s.passwordHash,
      camposCustom: s.camposCustom ?? {},
    }));
    if (prefeituraId) {
      const pid = Number(prefeituraId);
      // Filtra por prefeituraId EXPLICITO (do servidor ou do convenio),
      // sem fallback pra id=1. Cliente reportou 21/07/2026: filtro antigo
      // por `origem.includes(pref.nome)` mostrava 11 servidores enquanto
      // o dashboard (com fallback) mostrava 31. Agora ambos usam a mesma
      // regra e o numero e' o mesmo em toda a UI.
      const matriculasDaPref = new Set(
        SERVIDORES_BUSCA_MOCK
          .filter((s) => {
            const explicito =
              s.prefeituraId ??
              CONVENIOS_MOCK.find((cv) => cv.id === s.idConvenio)?.prefeituraId;
            return explicito === pid;
          })
          .map((s) => s.matricula),
      );
      rows = rows.filter((r) => matriculasDaPref.has(r.matricula));
    }
    if (status) rows = rows.filter((r) => r.status === status);
    return c.json({ servidores: rows, total: rows.length });
  })
  .patch("/v1/admin/servidores/:matricula", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "servidores");
    await ensureServidorStatusLoaded(c.env);
    const matricula = c.req.param("matricula");
    const s = SERVIDORES_BUSCA_MOCK.find((x) => x.matricula === matricula);
    if (!s) throw Errors.notFound("servidor");
    // Averbadora NAO pode editar a senha do servidor (regra do cliente).
    // Senha e alterada exclusivamente pelo proprio servidor via
    // /v1/servidores/me/senha com verificacao por email.
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
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "folhas");
    await ensureFolhasLoaded(c.env);
    // Reload folhas do PG a CADA request. ensureFolhasLoaded e' memoized por
    // isolate (e so troca a lista quando rows>0) — a averbadora carregava vazio
    // uma vez e ficava presa, entao a folha que a prefeitura abriu em OUTRO
    // isolate nunca aparecia aqui. Cliente reportou 21/07/2026: abriu folha
    // 202607 na prefeitura (ABERTA), averbadora/folhas continuou "0 de 0".
    // Mesmo pattern do GET /v1/prefeitura/folhas.
    try {
      const rows = await loadCollection<FolhaAdmin>(c.env, "admin_folhas");
      folhas.length = 0;
      folhas.push(...rows);
    } catch { /* fail-safe: usa in-memory */ }
    // Sincroniza contratos + convenios antes de contar ADFs (contratos
    // "Aprovado"/"Ativo" viram ADFs materializadas no _adfs; sem refreshConvenios
    // o ensureAdfs nao mapeia convenioId->prefeitura no isolate frio).
    await refreshContratos(c.env);
    await refreshConvenios(c.env);
    const now = new Date().toISOString();
    // Materializa ADFs pra todas as competencias que aparecem em folhas
    // (nao so a atual — a averbadora ve o historico completo).
    const bancoNomeById = (id: number) => bancos.find((b) => b.id === id)?.nome ?? `Banco ${id}`;
    const prefIds = prefeituras.map((p) => p.id);
    const compsUnicas = Array.from(new Set(folhas.map((f) => f.competencia)));
    for (const comp of compsUnicas) ensureAdfsGlobal(comp, bancoNomeById, now, prefIds);
    // Enriquece cada folha com contagem/soma de ADFs (aplicadas + recebidas)
    // por prefeitura+competencia. Mais recente no topo.
    const enriched = folhas.map((f) => {
      const adfsFolha = listAdfsGlobal(f.competencia).filter((a) => a.prefeituraId === f.prefeituraId);
      const aplicadas = adfsFolha.filter((a) => a.status === "aplicada");
      const recebidas = adfsFolha.filter((a) => a.status === "recebida");
      const valorAplicado = aplicadas.reduce((s, a) => s + a.valorParcela, 0);
      return {
        ...f,
        adfsAplicadas: aplicadas.length,
        adfsRecebidas: recebidas.length,
        adfsTotal: adfsFolha.length,
        valorAplicado: Math.round(valorAplicado * 100) / 100,
      };
    });
    enriched.sort((a, b) => b.competencia.localeCompare(a.competencia));
    return c.json({ folhas: enriched });
  })
  .post("/v1/admin/folhas", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "folhas");
    await ensureFolhasLoaded(c.env);
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
      await persistFolha(c.env, folhas[idx]!);
      return c.json({ folha: folhas[idx] });
    }
    const novo: FolhaAdmin = { ...body, id: `F-${Date.now()}`, dataRepasse: body.dataRepasse ?? null };
    folhas.push(novo);
    await persistFolha(c.env, novo);
    return c.json({ folha: novo });
  })
  // Deleta folha individual (cirurgico, nao usa purge global). Util pra
  // higienizar folhas de teste criadas via 'Avancar meses' sem tocar em
  // contratos/servidores/prefeituras.
  .delete("/v1/admin/folhas/:id", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "folhas");
    await ensureFolhasLoaded(c.env);
    const id = c.req.param("id");
    const idx = folhas.findIndex((f) => f.id === id);
    if (idx < 0) throw Errors.notFound("folha");
    const removida = folhas[idx]!;
    folhas.splice(idx, 1);
    try { await deleteCollectionRow(c.env, "admin_folhas", id); } catch { /* fail-safe */ }
    pushEvent("info", "admin.folhas.delete", `Folha ${id} (${removida.competencia}/${removida.prefeitura}) removida por user:${c.get("jwt").sub}`);
    return c.json({ ok: true, id, competencia: removida.competencia, prefeitura: removida.prefeitura });
  })
  .post("/v1/admin/folhas/:id/consolidar", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "folhas");
    const folhaId = c.req.param("id");
    // Idempotency: se o operador clica 2x no botao Consolidar (rede lenta,
    // duplo-clique, retry do SDK), o cascade parcelasPagas roda so 1 vez.
    // Sem isso, cada retry incrementava as parcelas de novo.
    const idemKey = c.req.header("Idempotency-Key") ?? c.req.header("idempotency-key");
    const idemScope = `admin:${j.sub}:POST:/v1/admin/folhas/${folhaId}/consolidar`;
    const idem = await withIdempotency(c.env, idemKey, idemScope, async () => {
    await ensureFolhasLoaded(c.env);
    await refreshContratos(c.env);
    await Promise.all([ensurePrefeiturasLoaded(c.env), ensureBancosLoaded(c.env), refreshConvenios(c.env)]);
    const f = folhas.find((x) => x.id === folhaId);
    if (!f) throw Errors.notFound("folha");
    if (f.status !== "fechada") throw Errors.validation({ status: "so folha 'fechada' pode ser consolidada" });
    // Materializa _adfs pro isolate atual ANTES de ler listAdfsGlobal — sem
    // isso, isolate frio (nunca tocou /adf/*) tem _adfs vazio e o cascade
    // achava 0 ADFs pra incrementar (parcelasIncrementadas ficava 0).
    const bancoNomeById = (id: number) => bancos.find((b) => b.id === id)?.nome ?? `Banco ${id}`;
    ensureAdfsGlobal(f.competencia, bancoNomeById, new Date().toISOString(), [f.prefeituraId]);
    f.status = "consolidada";
    await persistFolha(c.env, f);

    // Cascade parcelasPagas: consolidar a folha da competencia X significa que
    // os descontos daquela competencia foram efetivamente processados. Cada
    // ADF aplicada = +1 parcela paga no contrato correspondente. Antes esse
    // incremento nao acontecia em lugar nenhum — /servidor/contratos ficava
    // eternamente em "0/48". Ao atingir totalParcelas, contrato vira Quitado
    // (mesma acao do aplicarAcao("quitar")).
    const ator = `averbadora:${c.get("jwt").sub}`;
    const adfsDaFolha = listAdfsGlobal(f.competencia).filter((a) => a.prefeituraId === f.prefeituraId && a.status === "aplicada");
    let incrementados = 0;
    let quitados = 0;
    for (const a of adfsDaFolha) {
      const ct = getContrato(a.adf);
      if (!ct) continue;
      // Guard: nao ultrapassa totalParcelas. Se o operador consolidar 2 folhas
      // da mesma competencia (nao deveria acontecer, mas), o segundo cascade
      // vira no-op pra contratos ja no limite.
      if (ct.parcelasPagas >= ct.totalParcelas) continue;
      ct.parcelasPagas += 1;
      const parcela = Math.round(ct.valorParcela * 100) / 100;
      ct.saldoDevedor = Math.max(0, Math.round((ct.saldoDevedor - parcela) * 100) / 100);
      incrementados++;
      if (ct.parcelasPagas >= ct.totalParcelas) {
        aplicarAcao(a.adf, "quitar", ator, `Contrato quitado automaticamente ao consolidar folha ${f.competencia}.`);
        quitados++;
      }
      await persistContrato(c.env, a.adf);
    }
    if (adfsDaFolha.length > 0) {
      appendAudit({
        categoria: "margem", acao: "folha_consolidada", userId: ator, userRole: "averbadora",
        detalhes: `Folha ${f.competencia}/${f.prefeitura} consolidada: ${incrementados} contratos avancaram 1 parcela, ${quitados} quitados.`,
      });
      pushEvent("info", "admin.folhas.consolidar", `Folha ${f.id} consolidada: ${incrementados}/${quitados} (avancados/quitados) de ${adfsDaFolha.length} ADFs.`);
    }
      return { status: 200, body: { folha: f, parcelasIncrementadas: incrementados, contratosQuitados: quitados } };
    });
    if (idem.replayed) c.header("Idempotent-Replay", "true");
    return c.json(idem.result, (idem.status === 200 || idem.status === 201) ? idem.status : 200);
  })

  // === ADF (averbadora) — visao global de todos os contratos averbados de
  // todos os bancos. Retorna a mesma forma que /v1/portal/banco/contratos, mas
  // sem escopo de convenio e enriquecido com bancoId+bancoNome pra colunar.
  .get("/v1/admin/contratos", async (c) => {
    requireAdmin(c.get("jwt"));
    await refreshContratos(c.env);
    const rows = listContratos({}); // todos os bancos
    const contratos = rows.map((ct) => {
      const eventos = getContratoEventos(ct.adf);
      // Ordem de precedencia (fixa, nao muda entre requests):
      // 1) ultimo evento real (aprovacao, averbacao, falha em folha, etc)
      // 2) ccb anexada (banco enviou CCB — evento real do contrato)
      // 3) criadoEmIso (criacao do contrato)
      // 4) lancamento DD/MM/YYYY -> ISO 00:00 (contratos do seed sem criadoEmIso)
      // Antes tinha fallback pra `new Date().toISOString()` — bug: coluna
      // "Ultima atualizacao" atualizava a cada request pra 'agora'. Removido.
      const parseLanc = (s: string): string | undefined => {
        const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
        return m ? `${m[3]}-${m[2]}-${m[1]}T00:00:00.000Z` : undefined;
      };
      const atualizadoEm =
        (eventos.length > 0 ? eventos[eventos.length - 1]?.criadoEm : undefined)
        ?? ct.ccbAnexadoEm
        ?? ct.criadoEmIso
        ?? parseLanc(ct.lancamento);
      const banco = bancos.find((b) => b.id === ct.bancoId);
      return {
        adf: ct.adf,
        situacao: ct.situacao,
        lancamento: ct.lancamento,
        expiracao: ct.expiracao,
        cpfMasked: ct.cpfMasked,
        matricula: ct.matricula,
        nome: ct.nome,
        tipoContrato: ct.tipoContrato,
        // Sinais adicionais pro diagnostico de "qual produto foi realmente
        // proposto" — usados por deriveProdutoLabel no /prefeitura/contratos.
        // Sem eles nao da pra distinguir TELEMEDICINA/PORTABILIDADE/CARTAO_*
        // (tipoContrato so aceita EMPRESTIMO/REFIN/ECONSIGNADO).
        tipoMargem: ct.tipoMargem,
        observacoes: ct.observacoes,
        bancoOrigem: ct.bancoOrigem,
        totalParcelas: ct.totalParcelas,
        valorParcela: ct.valorParcela,
        convenio: ct.convenio,
        convenioId: ct.convenioId,
        valorFinanciado: ct.valorFinanciado,
        taxaAm: ct.taxaAm,
        folhaStatus: ct.folhaStatus,
        atualizadoEm,
        bancoId: ct.bancoId,
        bancoNome: banco?.nome ?? `Banco ${ct.bancoId}`,
        ccbKey: ct.ccbKey,
        ccbAnexadoEm: ct.ccbAnexadoEm,
      };
    });
    // Mais novos no topo — mesmo padrao de /prefeitura/contratos (cliente
    // pediu 21/07/2026). Usa `atualizadoEm` que ja tem o timestamp mais
    // recente do contrato (evento -> ccb -> criadoEmIso -> lancamento).
    contratos.sort((a, b) => (b.atualizadoEm ?? "").localeCompare(a.atualizadoEm ?? ""));
    return c.json({ contratos, total: contratos.length });
  })
  // Diagnostico: descarta a CCB anexada (limpa ccbKey no contrato + apaga o
  // arquivo do R2). Usado quando o banco anexou uma CCB errada (ex: um modelo
  // com dados de outro servidor) e precisa reenviar. Protegido por senha.
  .post("/v1/admin/contratos/limpar-ccb", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "adf");
    await requireUnlocked(c.env, "contratos/limpar-ccb");
    const body = (await c.req.json().catch(() => ({}))) as { senha?: string; adfs?: string[] };
    const expected = c.env.ADMIN_PURGE_PASSWORD;
    if (!expected) throw Errors.validation({ senha: "Senha nao configurada." });
    if (!body.senha || body.senha !== expected) throw Errors.forbidden("Senha invalida");
    const adfs = (body.adfs ?? []).filter(Boolean);
    if (adfs.length === 0) throw Errors.validation({ adfs: "Informe pelo menos uma ADF." });
    await refreshContratos(c.env);
    const limpos: { adf: string; keyRemovida?: string }[] = [];
    for (const adf of adfs) {
      const ct = getContrato(adf);
      if (!ct) continue;
      const key = ct.ccbKey;
      ct.ccbKey = undefined;
      ct.ccbAnexadoEm = undefined;
      await persistContrato(c.env, adf);
      if (key && c.env.R2_FILES) {
        try { await c.env.R2_FILES.delete(key); } catch { /* segue */ }
      }
      limpos.push({ adf, keyRemovida: key });
    }
    appendAudit({ categoria: "margem", acao: "limpar_ccb", userId: `averbadora:${j?.sub}`, userRole: "averbadora", detalhes: `Limpou CCB de ${limpos.length} contrato(s): ${limpos.map((x) => x.adf).join(", ")}.` });
    return c.json({ ok: true, limpos });
  })

  // Reclassifica contrato como PORTABILIDADE (corrige contratos criados como
  // "REFIN" quando na verdade eram portabilidade — bug historico: /me/propostas
  // com tipo="portabilidade" nao setava bancoOrigem, entao deriveProdutoLabel
  // cai no fallback REFIN). Injeta "Portabilidade" nas observacoes; se
  // bancoOrigem for informado, tambem seta. Protegido por senha.
  .post("/v1/admin/contratos/marcar-portabilidade", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "adf");
    const body = (await c.req.json().catch(() => ({}))) as { senha?: string; adfs?: string[]; bancoOrigem?: string; contratoOrigem?: string };
    const expected = c.env.ADMIN_PURGE_PASSWORD;
    if (!expected) throw Errors.validation({ senha: "Senha nao configurada." });
    if (!body.senha || body.senha !== expected) throw Errors.forbidden("Senha invalida");
    const adfs = (body.adfs ?? []).filter(Boolean);
    if (adfs.length === 0) throw Errors.validation({ adfs: "Informe pelo menos uma ADF." });
    await refreshContratos(c.env);
    const marcados: string[] = [];
    for (const adf of adfs) {
      const ct = getContrato(adf);
      if (!ct) continue;
      const prefixoObs = "Portabilidade (reclassificada retroativamente)";
      const obsAntigo = ct.observacoes ?? "";
      ct.observacoes = obsAntigo.toLowerCase().includes("portabilid")
        ? obsAntigo
        : `${prefixoObs}${obsAntigo ? ` — ${obsAntigo}` : ""}`;
      if (body.bancoOrigem) ct.bancoOrigem = body.bancoOrigem;
      if (body.contratoOrigem) ct.contratoOrigem = body.contratoOrigem;
      await persistContrato(c.env, adf);
      marcados.push(adf);
    }
    appendAudit({ categoria: "margem", acao: "marcar_portabilidade", userId: `averbadora:${j?.sub}`, userRole: "averbadora", detalhes: `Reclassificou ${marcados.length} contrato(s) como portabilidade: ${marcados.join(", ")}` });
    pushEvent("info", "admin.contratos.marcar_portabilidade", `Reclassificou como portabilidade por admin ${j?.sub}: ${marcados.join(", ")}`);
    return c.json({ ok: true, marcados });
  })

  .get("/v1/admin/comunicados", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "comunicados");
    await refreshComunicados(c.env);
    return c.json({ comunicados: COMUNICADOS_MOCK });
  })
  .post("/v1/admin/comunicados", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "comunicados");
    await refreshComunicados(c.env);
    const body = z
      .object({
        id: z.string().optional(),
        titulo: z.string().min(1),
        corpo: z.string().min(1),
        linkLabel: z.string().optional(),
        linkHref: z.string().optional(),
        publico: z.enum(["banco", "servidor", "prefeitura"]),
      })
      .parse(await c.req.json());
    if (body.id) {
      const idx = COMUNICADOS_MOCK.findIndex((x) => x.id === body.id);
      if (idx < 0) throw Errors.notFound("comunicado");
      COMUNICADOS_MOCK[idx] = { ...COMUNICADOS_MOCK[idx]!, ...body, id: body.id };
      await persistComunicados(c.env);
      return c.json({ comunicado: COMUNICADOS_MOCK[idx] });
    }
    const novo = { ...body, id: `COM-${Date.now()}` };
    COMUNICADOS_MOCK.push(novo);
    await persistComunicados(c.env);
    return c.json({ comunicado: novo });
  })
  .post("/v1/admin/comunicados/:id/mover", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "comunicados");
    await refreshComunicados(c.env);
    const id = c.req.param("id");
    const { direction } = z.object({ direction: z.enum(["up", "down"]) }).parse(await c.req.json());
    const idx = COMUNICADOS_MOCK.findIndex((x) => x.id === id);
    if (idx < 0) throw Errors.notFound("comunicado");
    const alvo = direction === "up" ? idx - 1 : idx + 1;
    if (alvo < 0 || alvo >= COMUNICADOS_MOCK.length) {
      return c.json({ comunicados: COMUNICADOS_MOCK });
    }
    const tmp = COMUNICADOS_MOCK[idx]!;
    COMUNICADOS_MOCK[idx] = COMUNICADOS_MOCK[alvo]!;
    COMUNICADOS_MOCK[alvo] = tmp;
    await persistComunicados(c.env);
    return c.json({ comunicados: COMUNICADOS_MOCK });
  })
  .post("/v1/admin/comunicados/reordenar", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "comunicados");
    await refreshComunicados(c.env);
    const { ids } = z.object({ ids: z.array(z.string()).min(1) }).parse(await c.req.json());
    // Reordena in-place com base na nova ordem. Ids fora da lista sao ignorados;
    // ids da lista que nao vieram no payload vao pro fim (defensivo — evita
    // sumir um comunicado se o front por bug mandar array incompleto).
    const mapa = new Map(COMUNICADOS_MOCK.map((c) => [c.id, c]));
    const reordenados = [] as typeof COMUNICADOS_MOCK;
    for (const id of ids) {
      const item = mapa.get(id);
      if (item) { reordenados.push(item); mapa.delete(id); }
    }
    for (const restante of mapa.values()) reordenados.push(restante);
    COMUNICADOS_MOCK.length = 0;
    COMUNICADOS_MOCK.push(...reordenados);
    await persistComunicados(c.env);
    return c.json({ comunicados: COMUNICADOS_MOCK });
  })
  .delete("/v1/admin/comunicados/:id", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "comunicados");
    await refreshComunicados(c.env);
    const id = c.req.param("id");
    const idx = COMUNICADOS_MOCK.findIndex((x) => x.id === id);
    if (idx < 0) throw Errors.notFound("comunicado");
    COMUNICADOS_MOCK.splice(idx, 1);
    await removerComunicadoPersistido(c.env, id);
    return c.json({ ok: true });
  })

  .get("/v1/admin/health", async (c) => {
    requireAdmin(c.get("jwt"));
    // Monitor real de dependencias externas + infra. Cada request executa os
    // checks em paralelo (timeout 3s cada) e persiste em KV um historico curto
    // dos ultimos 20 checks por servico — dai calculamos uptime e p95 reais
    // em vez de valores fake. Resposta cacheada em KV_CACHE por 20s pra
    // varios operadores olhando a tela nao bombardearem os alvos.
    const CACHE_KEY = "health:snapshot";
    const HIST_KEY = (svc: string) => `health:hist:${svc}`;
    const HIST_MAX = 20;
    const TIMEOUT_MS = 3000;

    if (c.env.KV_CACHE) {
      const cached = await c.env.KV_CACHE.get(CACHE_KEY, "json").catch(() => null);
      if (cached) return c.json(cached);
    }

    type CheckResult = { servico: string; ok: boolean; latenciaMs: number };
    async function withTimeout<T>(p: Promise<T>): Promise<{ ok: true; value: T; ms: number } | { ok: false; ms: number; error: string }> {
      const start = performance.now();
      try {
        const value = await Promise.race([
          p,
          new Promise<never>((_r, rej) => setTimeout(() => rej(new Error("timeout")), TIMEOUT_MS)),
        ]);
        return { ok: true, value, ms: Math.round(performance.now() - start) };
      } catch (e) {
        return { ok: false, ms: Math.round(performance.now() - start), error: (e as Error).message };
      }
    }

    // 1) Postgres / Hyperdrive — SELECT 1
    const pgCheck = async (): Promise<CheckResult> => {
      const r = await withTimeout(getDb(c.env).execute(sql`SELECT 1`));
      return { servico: "Postgres (Hyperdrive)", ok: r.ok, latenciaMs: r.ms };
    };

    // 2) KV bindings — put/get temporario com TTL curto
    const kvCheck = async (name: string, kv: KVNamespace | undefined): Promise<CheckResult> => {
      if (!kv) return { servico: name, ok: false, latenciaMs: 0 };
      const k = `health:probe:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
      const r = await withTimeout((async () => {
        await kv.put(k, "1", { expirationTtl: 60 });
        return await kv.get(k);
      })());
      return { servico: name, ok: r.ok && r.value === "1", latenciaMs: r.ms };
    };

    // 3) R2 — list com limit 1
    const r2Check = async (): Promise<CheckResult> => {
      if (!c.env.R2_FILES) return { servico: "R2 (arquivos)", ok: false, latenciaMs: 0 };
      const r = await withTimeout(c.env.R2_FILES.list({ limit: 1 }));
      return { servico: "R2 (arquivos)", ok: r.ok, latenciaMs: r.ms };
    };

    // 4) Bank Adapter (mock/iFractal) — informa qual esta em uso.
    const adapterCheck = async (): Promise<CheckResult> => {
      const adapter = c.env.BANK_ADAPTER ?? "sandbox";
      return { servico: `Bank Adapter (${adapter})`, ok: true, latenciaMs: 0 };
    };

    // 5) Cada banco ATIVO com baseUrl cadastrada — pinga a URL EXATA que o
    //    operador cadastrou (nao concatena /health automaticamente). Assim
    //    da pra apontar pra qualquer endpoint de status que o banco expuser
    //    (ex: https://api.banco.com/health OU https://status.banco.com/ping).
    //    Bancos sem baseUrl entram como "sem endpoint" (nao afeta uptime).
    const bankChecks = async (): Promise<CheckResult[]> => {
      await ensureBancosLoaded(c.env);
      const ativos = bancos.filter((b) => b.status === "ativo");
      return Promise.all(ativos.map(async (b): Promise<CheckResult> => {
        const url = (b.baseUrl ?? "").trim();
        if (!url) return { servico: `Banco: ${b.nome}`, ok: true, latenciaMs: 0 };
        const r = await withTimeout(fetch(url, { method: "GET", headers: { Accept: "application/json,text/plain,*/*" } }).then((res) => res.ok));
        const okReal = r.ok && (r as { value?: boolean }).value === true;
        return { servico: `Banco: ${b.nome}`, ok: okReal, latenciaMs: r.ms };
      }));
    };

    const now = new Date().toISOString();
    const results: CheckResult[] = [
      await pgCheck(),
      await kvCheck("KV_CACHE", c.env.KV_CACHE),
      await kvCheck("KV_SESSIONS", c.env.KV_SESSIONS),
      await kvCheck("KV_RATELIMIT", c.env.KV_RATELIMIT),
      await r2Check(),
      await adapterCheck(),
      ...(await bankChecks()),
    ];

    // Persiste historico + agrega. uptime = %OK nos ultimos N checks (persistido);
    // p95 = latencia no percentil 95 nos ultimos N.
    const checks = await Promise.all(results.map(async (r) => {
      let hist: { ok: boolean; ms: number; ts: string }[] = [];
      if (c.env.KV_CACHE) {
        try {
          const raw = await c.env.KV_CACHE.get(HIST_KEY(r.servico), "json") as typeof hist | null;
          if (Array.isArray(raw)) hist = raw;
        } catch { /* fail-safe */ }
      }
      hist.push({ ok: r.ok, ms: r.latenciaMs, ts: now });
      if (hist.length > HIST_MAX) hist = hist.slice(-HIST_MAX);
      if (c.env.KV_CACHE) {
        // waitUntil pra nao segurar a resposta esperando o KV put terminar.
        try { c.executionCtx.waitUntil(c.env.KV_CACHE.put(HIST_KEY(r.servico), JSON.stringify(hist), { expirationTtl: 60 * 60 * 24 })); } catch { /* fail-safe */ }
      }
      const oks = hist.filter((h) => h.ok).length;
      const uptime = hist.length > 0 ? oks / hist.length : (r.ok ? 1 : 0);
      const sorted = hist.map((h) => h.ms).sort((a, b) => a - b);
      const p95Idx = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
      const p95 = sorted.length > 0 ? sorted[p95Idx] : r.latenciaMs;
      return { servico: r.servico, uptime, p95, ok: r.ok };
    }));

    const payload = { checks };
    if (c.env.KV_CACHE) {
      try { c.executionCtx.waitUntil(c.env.KV_CACHE.put(CACHE_KEY, JSON.stringify(payload), { expirationTtl: 20 })); } catch { /* fail-safe */ }
    }
    return c.json(payload);
  })

  .get("/v1/admin/logs", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "logs");
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
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "vitrine");
    await ensureVitrineLoaded(c.env);
    return c.json({ banners: vitrine });
  })
  .post("/v1/admin/vitrine", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "vitrine");
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
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "api-tokens");
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
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "api-tokens");
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
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "api-tokens");
    const kv = c.env.KV_CACHE; if (!kv) throw Errors.bankUnavailable("KV não configurado");
    const body = z.object({ paused: z.boolean() }).parse(await c.req.json());
    const t = await setTokenPaused(kv, c.req.param("id"), body.paused);
    if (!t) throw Errors.notFound("token");
    pushEvent("info", "admin.api-tokens.pause", `Token "${t.name}" ${body.paused ? "pausado" : "reativado"} por user:${j.sub} (perfil/parceria segue ativo).`);
    return c.json({ token: t });
  })

  // ===== Webhooks (admin) =====
  .get("/v1/admin/webhooks", authRequired, async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "api-webhooks");
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
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "api-webhooks");
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
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "api-webhooks");
    return c.json({ deliveries: listDeliveries(c.req.param("id")) });
  })
  .post("/v1/admin/webhooks/fire", authRequired, async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "api-webhooks");
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
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "api-webhooks");
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
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "bancos");
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
        id: existing?.id ?? await nextBancoId(c.env),
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
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "prefeituras");
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
        id: existing?.id ?? await nextPrefeituraId(c.env),
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
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "convenios");
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
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "convenios");
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
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "convenios");
    const id = c.req.param("id");
    await refreshConvenios(c.env);
    const cv = CONVENIOS_MOCK.find((x) => x.id === id);
    if (!cv) throw Errors.notFound("convenio");
    cv.ativo = false;
    await persistConvenio(c.env, cv); // write-through: desativacao persiste (nunca some, so ativo=false)
    pushEvent("info", "admin.convenios", `Convenio "${cv.nome}" desativado por user:${c.get("jwt").sub}`);
    return c.body(null, 204);
  })
  // Hard-delete: remove PERMANENTEMENTE. Exige convenio INATIVO + sem
  // contratos vinculados. Usado pra limpar convenios duplicados criados por
  // engano na matriz (antes do fix de reativar em vez de criar novo).
  .delete("/v1/admin/convenios/:id/hard", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "convenios");
    const id = c.req.param("id");
    await refreshConvenios(c.env);
    await refreshContratos(c.env);
    const cv = CONVENIOS_MOCK.find((x) => x.id === id);
    if (!cv) throw Errors.notFound("convenio");
    if (cv.ativo) throw Errors.validation({ ativo: "so convenio inativo pode ser excluido permanentemente. Desative antes." });
    const usados = listContratos({ convenioId: id });
    if (usados.length > 0) {
      throw Errors.validation({ contratos: `convenio tem ${usados.length} contrato(s) vinculado(s). Nao pode ser excluido.` });
    }
    const { deleteConvenioHard } = await import("../portal-banco/convenios-store.js");
    await deleteConvenioHard(c.env, id);
    pushEvent("warn", "admin.convenios", `Convenio "${cv.nome}" (${id}) EXCLUIDO PERMANENTEMENTE por user:${c.get("jwt").sub}`);
    return c.body(null, 204);
  })
  .get("/v1/admin/convenios/:id/config", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "convenios");
    const id = c.req.param("id");
    if (!CONVENIOS_MOCK.find((cv) => cv.id === id)) throw Errors.notFound("convenio");
    return c.json({ config: getConvenioConfig(id) ?? null });
  })
  .get("/v1/admin/convenios-configs", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "convenios");
    return c.json({ configs: listConvenioConfigs() });
  })
  .post("/v1/admin/convenios/:id/config", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "convenios");
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
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "id-unico");
    // Recarrega prefeituras + configs do PG — sincroniza in-memory com o
    // storage compartilhado (evita divergencia entre isolates e entre a visao
    // da averbadora e da prefeitura).
    await Promise.all([ensurePrefeiturasLoaded(c.env), refreshIdUnicoConfigs(c.env)]);
    // Garante que toda prefeitura tem uma config default gerada + persistida.
    for (const p of prefeituras) {
      const before = getIdUnicoConfig(p.id);
      const cfg = ensureIdUnicoConfig(p.id, p.nome, p.uf);
      if (!before) await persistIdUnicoConfig(c.env, cfg);
    }
    return c.json({
      configs: listIdUnicoConfigs().map((cfg) => ({
        ...cfg,
        prefeituraNome: prefeituras.find((p) => p.id === cfg.prefeituraId)?.nome ?? "?",
        exemplo: previewIdUnico(cfg.prefeituraId),
      })),
    });
  })
  .post("/v1/admin/id-unico/configs", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "id-unico");
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
    await persistIdUnicoConfig(c.env, cfg);
    appendAudit({ categoria: "id_unico", acao: "config_atualizada", userId: `averbadora:${c.get("jwt").sub}`, userRole: "averbadora", detalhes: `Config ID Unico prefeitura=${body.prefeituraId} prefixo=${body.prefixo} formato=${body.formato}.` });
    pushEvent("info", "admin.id-unico", `Config ID-Unico prefeitura=${body.prefeituraId} salva`);
    return c.json({ config: cfg, exemplo: previewIdUnico(cfg.prefeituraId) });
  })
  .post("/v1/admin/id-unico/issue", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "id-unico");
    const body = z.object({ prefeituraId: z.number().int() }).parse(await c.req.json());
    if (!getIdUnicoConfig(body.prefeituraId)) throw Errors.notFound("id_unico_config");
    const id = issueIdUnico(body.prefeituraId);
    appendAudit({ categoria: "id_unico", acao: "id_emitido", idUnico: id, userId: `averbadora:${c.get("jwt").sub}`, userRole: "averbadora", detalhes: `ID Unico ${id} emitido manualmente para prefeitura=${body.prefeituraId}.` });
    return c.json({ idUnico: id });
  })

  // ===== Pre-reservas e travas (passo 8) =====
  .get("/v1/admin/pre-reservas", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "pre-reservas");
    await refreshContratos(c.env); // fluxo real: propostas/reservas criadas pelos servidores
    // Mais novas no TOPO (ordem de chegada) — mesmo padrao DESC por timestamp da
    // tabela de contratos (cliente pediu 21/07/2026: "as que chegam ficam em
    // primeiro, as antigas descem"). Ordena pelo criadoEmIso REAL do contrato
    // (com hora), nao pelo criadoEm da pre-reserva que vem so da DATA do
    // lancamento (empataria todas as do mesmo dia). Ordena antes do map — o
    // filtro abaixo preserva a ordem.
    const parseLanc = (s: string): string | undefined => {
      const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
      return m ? `${m[3]}-${m[2]}-${m[1]}T00:00:00.000Z` : undefined;
    };
    const all = listContratos({})
      .slice()
      .sort((a, b) => {
        const ta = a.criadoEmIso ?? parseLanc(a.lancamento) ?? "";
        const tb = b.criadoEmIso ?? parseLanc(b.lancamento) ?? "";
        return tb.localeCompare(ta);
      })
      .map(contratoToPreReserva);
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
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "pre-reservas");
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
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "pre-reservas");
    await refreshContratos(c.env);
    // Expiração é derivada (reserva "Aguardando" com data de expiração vencida).
    const expiradas = listContratos({}).map(contratoToPreReserva).filter((r) => r.status === "expirada").length;
    return c.json({ expiradas });
  })

  // Delete cirurgico de lote de tombamento — protegido por ADMIN_PURGE_PASSWORD.
  // Usado quando o operador enviou lote errado/vazio e precisa limpar sem rodar
  // purge-contratos inteiro (que apaga contratos + folhas junto).
  .post("/v1/admin/tombamento/lotes/delete", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    requirePermissao(j, "tombamento");
    await requireUnlocked(c.env, "tombamento/lotes/delete");
    const body = (await c.req.json().catch(() => ({}))) as { senha?: string; ids?: string[] };
    const expected = c.env.ADMIN_PURGE_PASSWORD;
    if (!expected) throw Errors.validation({ senha: "Senha nao configurada." });
    if (!body.senha || body.senha !== expected) throw Errors.forbidden("Senha invalida");
    const ids = (body.ids ?? []).filter(Boolean);
    if (ids.length === 0) throw Errors.validation({ ids: "Informe pelo menos um lote." });
    const removidos: string[] = [];
    for (const id of ids) {
      const ok = await deleteTombamentoLote(c.env, id).catch(() => false);
      removeLoteMemoria(id);
      if (ok) removidos.push(id);
    }
    appendAudit({ categoria: "tombamento", acao: "lote_excluido", userId: `averbadora:${j?.sub}`, userRole: "averbadora", detalhes: `${removidos.length} lote(s) removido(s): ${removidos.join(", ")}.` });
    return c.json({ ok: true, removidos });
  })

  // ===== Tombamento de contratos (passo 9) =====
  .get("/v1/admin/tombamento/lotes", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "tombamento");
    // Refresh do PG a cada request pra sincronizar isolates: um import feito
    // em isolate A precisa aparecer imediatamente pro isolate B que serve a
    // averbadora. Antes: averbadora e prefeitura viam contagens diferentes.
    await refreshTombamento(c.env);
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
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "tombamento");
    await refreshTombamento(c.env);
    const linhas = listLinhas(c.req.param("id"));
    return c.json({ linhas });
  })
  .post("/v1/admin/tombamento/importar", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "tombamento");
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
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "bate-carteira");
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

  // ===== Portabilidade marketplace (visao global) =====
  .get("/v1/admin/portabilidade", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "portabilidade");
    await ensurePortabilidadesLoaded(c.env);
    return c.json({ intencoes: listIntencoes() });
  })

  // ===== Templates de TERMOS =====
  .get("/v1/admin/termos", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "termos");
    await ensureTermosLoaded(c.env);
    return c.json({ termos: listTermos() });
  })
  .post("/v1/admin/termos/:tipo", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "termos");
    await ensureTermosLoaded(c.env);
    const tipo = c.req.param("tipo") as TermoTipo;
    const body = z.object({
      titulo: z.string().min(3).max(200).optional(),
      descricao: z.string().max(500).optional(),
      corpo: z.string().min(10).max(20000).optional(),
      ativo: z.boolean().optional(),
      versao: z.string().max(20).optional(),
    }).parse(await c.req.json());
    const t = await upsertTermo(c.env, tipo, body);
    if (!t) throw Errors.notFound("termo");
    appendAudit({ categoria: "convenio_config", acao: "termo_atualizado", userId: `averbadora:${j.sub}`, userRole: "averbadora", detalhes: `Termo ${tipo} atualizado (versao ${t.versao}).` });
    return c.json({ termo: t });
  })

  // ===== Auditoria (passo 12) =====
  .get("/v1/admin/auditoria", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "auditoria");
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

  // Identidade do averbadora logado — usado no header do painel pra mostrar nome.
  .get("/v1/admin/me", async (c) => {
    const j = c.get("jwt");
    requireAdmin(j);
    await ensurePerfisLoaded(c.env);
    const u = listAverbadoraUsers().find((x) => String(x.id) === j.sub);
    return c.json({
      id: j.sub,
      nome: u?.nome ?? "Averbadora",
      email: u?.email ?? "",
      perfil: u?.perfil ?? j.averbadora_perfil ?? "supervisor",
    });
  })

  // ===== Perfis admin (passo 1: perfis + 2FA) =====
  .get("/v1/admin/perfis", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "perfis");
    await ensurePerfisLoaded(c.env);
    return c.json({ usuarios: listAverbadoraUsers(), perfis: perfilOptions() });
  })
  .post("/v1/admin/perfis", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "perfis");
    await ensurePerfisLoaded(c.env);
    const body = z.object({
      id: z.number().int().optional(),
      nome: z.string().min(2),
      email: z.string().email(),
      perfil: z.enum(["operador", "supervisor", "comercial", "financeiro", "auditoria", "personalizado"] as const).optional(),
      permissoes: z.array(z.string().min(1).max(64)).max(200).optional(),
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
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "perfis");
    const id = Number(c.req.param("id"));
    const r = rotateTotpSecret(id);
    if (!r) throw Errors.notFound("usuario");
    await persistPerfis(c.env);
    appendAudit({ categoria: "acesso", acao: "2fa_rotacionado", userId: `averbadora:${c.get("jwt").sub}`, userRole: "averbadora", detalhes: `2FA do usuario id=${id} rotacionado. Novo secret deve ser entregue uma unica vez.` });
    return c.json(r);
  })
  .post("/v1/admin/perfis/:id/2fa/disable", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "perfis");
    const id = Number(c.req.param("id"));
    if (!disable2FA(id)) throw Errors.notFound("usuario");
    await persistPerfis(c.env);
    appendAudit({ categoria: "acesso", acao: "2fa_desativado", userId: `averbadora:${c.get("jwt").sub}`, userRole: "averbadora", detalhes: `2FA do usuario id=${id} desativado.` });
    return c.json({ ok: true });
  })
  .delete("/v1/admin/perfis/:id", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "perfis");
    const id = Number(c.req.param("id"));
    if (!deleteAverbadoraUser(id)) throw Errors.notFound("usuario");
    await persistPerfis(c.env);
    appendAudit({ categoria: "acesso", acao: "usuario_removido", userId: `averbadora:${c.get("jwt").sub}`, userRole: "averbadora", detalhes: `Usuario averbadora id=${id} desativado.` });
    return c.body(null, 204);
  })
  .post("/v1/admin/perfis/:id/reativar", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "perfis");
    const id = Number(c.req.param("id"));
    if (!reactivateAverbadoraUser(id)) throw Errors.notFound("usuario");
    await persistPerfis(c.env);
    appendAudit({ categoria: "acesso", acao: "usuario_reativado", userId: `averbadora:${c.get("jwt").sub}`, userRole: "averbadora", detalhes: `Usuario averbadora id=${id} reativado.` });
    return c.json({ ok: true });
  })
  // ============================================================
  // Beneficios / descontos comerciais e de saude — averbadora cadastra por prefeitura.
  // Servidor consulta em /v1/servidores/me/beneficios (filtrado pela pref dele).
  // ============================================================
  .get("/v1/admin/beneficios", async (c) => {
    // Aceita "beneficios" OU "telemedicina" — a tela /averbadora/telemedicina
    // filtra a mesma lista por categoria=telemedicina, e o usuario com so essa
    // caixa marcada deve conseguir listar (frontend faz o filtro).
    const j = c.get("jwt"); requireAdmin(j); requirePermissaoOneOf(j, "beneficios", "telemedicina");
    await refreshBeneficios(c.env);
    const list = await loadBeneficios(c.env);
    return c.json({ beneficios: list });
  })
  .post("/v1/admin/beneficios", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "beneficios");
    await refreshBeneficios(c.env);
    // Cliente pediu pra afrouxar TUDO pra testar rapido — so prefeituraId
    // continua obrigatorio (senao o beneficio fica orfao). Demais campos
    // aceitam vazio e o backend preenche placeholders sensatos.
    const body = z.object({
      id: z.string().optional(),
      prefeituraId: z.number().int(),
      nome: z.string().max(100).default("Beneficio sem nome"),
      categorias: z.array(z.enum(["saude", "alimentacao", "educacao", "lazer", "telemedicina", "academia", "farmacia", "supermercado"])).default([]),
      local: z.string().max(80).default(""),
      icone: z.string().max(500).default("🎁"),
      cor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#C9A961"),
      descontoLabel: z.string().max(80).default(""),
      descontoComplemento: z.string().max(120).default(""),
      origem: z.enum(["banco", "averbadora", "prefeitura", "convenio"]).default("averbadora"),
      ativo: z.boolean().default(true),
      // ===== Campos estendidos =====
      cnpj: z.string().max(20).optional(),
      descricaoCurta: z.string().max(280).optional(),
      descricaoLonga: z.string().max(4000).optional(),
      logoUrl: z.string().url().optional().or(z.literal("")),
      endereco: z.object({
        cep: z.string().max(10).optional(),
        logradouro: z.string().max(120).optional(),
        numero: z.string().max(10).optional(),
        complemento: z.string().max(60).optional(),
        bairro: z.string().max(80).optional(),
        cidade: z.string().max(80).optional(),
        uf: z.string().length(2).optional(),
      }).optional(),
      contato: z.object({
        telefone: z.string().max(40).optional(),
        whatsapp: z.string().max(20).optional(),
        email: z.string().email().optional().or(z.literal("")),
        site: z.string().url().optional().or(z.literal("")),
        instagram: z.string().max(40).optional(),
      }).optional(),
      desconto: z.object({
        tipo: z.enum(["percentual", "valor_fixo", "preco_especial", "gratuidade"]),
        valor: z.number().nonnegative().optional(),
        aplicavelEm: z.string().max(160).optional(),
        limiteMensal: z.number().nonnegative().optional(),
        cumulativo: z.boolean().optional(),
      }).optional(),
      comoUsar: z.object({
        modo: z.enum(["cartao_consignado", "matricula", "cpf", "codigo", "qr"]),
        codigoPromocional: z.string().max(60).optional(),
        instrucoes: z.string().max(1000).optional(),
      }).optional(),
      filtro: z.object({
        convenioIds: z.array(z.string()).optional(),
        vinculos: z.array(z.string()).optional(),
        situacaoFuncional: z.array(z.string()).optional(),
        salarioMin: z.number().nonnegative().optional(),
        salarioMax: z.number().nonnegative().optional(),
        idadeMin: z.number().int().nonnegative().optional(),
        idadeMax: z.number().int().nonnegative().optional(),
      }).optional(),
      vigencia: z.object({
        inicio: z.string().optional(),
        fim: z.string().optional(),
        diasSemana: z.array(z.number().int().min(0).max(6)).optional(),
        horaInicio: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        horaFim: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      }).optional(),
      responsavel: z.object({
        nome: z.string().max(120).optional(),
        email: z.string().email().optional().or(z.literal("")),
        telefone: z.string().max(40).optional(),
        cargo: z.string().max(80).optional(),
      }).optional(),
      restricoes: z.string().max(1000).optional(),
      destaque: z.enum(["novo", "popular", "exclusivo", "desconto_extra"]).optional(),
      comissaoPct: z.number().nonnegative().max(100).optional(),
      notasInternas: z.string().max(2000).optional(),
      prefeituraIdsExtras: z.array(z.number().int()).optional(),
      // F5: valor mensal em R$ da assinatura — quando preenchido, servidor pode
      // "Contratar" (gera intencao -> averbadora aprova -> ADF em folha).
      // Vazio/0 = beneficio nao vira ADF, so gera clique/lead.
      valorMensal: z.number().nonnegative().optional(),
      bancoId: z.number().int().optional(),
      convenioId: z.string().optional(),
      imagens: z.array(z.string().url()).max(10).optional(),
      modoImagens: z.enum(["nenhum", "unica", "carrossel"]).optional(),
      linkAcesso: z.object({
        url: z.string().url(),
        textoBotao: z.string().max(40).optional(),
      }).optional(),
      todasPrefeiturasParceiras: z.boolean().optional(),
      duracaoMinimaMeses: z.number().int().min(0).max(120).optional(),
    }).parse(await c.req.json());
    // Consistencia origem-vinculo: banco exige bancoId, convenio exige convenioId.
    // Sem isso, o servidor recebe o beneficio sem saber QUAL banco/convenio ofereceu.
    if (body.origem === "banco" && body.bancoId == null) {
      throw Errors.validation({ bancoId: "Ao definir origem=banco, escolha qual banco parceiro oferece o beneficio." });
    }
    if (body.origem === "convenio" && !body.convenioId) {
      throw Errors.validation({ convenioId: "Ao definir origem=convenio, escolha qual convenio da prefeitura." });
    }
    if (body.id) {
      const existing = (await loadBeneficios(c.env)).find((b) => b.id === body.id);
      if (!existing) throw Errors.notFound("beneficio");
    }
    const b: Beneficio = {
      id: body.id ?? nextBeneficioId(),
      prefeituraId: body.prefeituraId,
      nome: body.nome,
      categorias: body.categorias,
      local: body.local,
      icone: body.icone,
      cor: body.cor,
      descontoLabel: body.descontoLabel,
      descontoComplemento: body.descontoComplemento,
      origem: body.origem,
      ativo: body.ativo,
      criadoEm: body.id ? (await loadBeneficios(c.env)).find((x) => x.id === body.id)!.criadoEm : new Date().toISOString(),
      criadoPor: String(j.sub),
      cnpj: body.cnpj || undefined,
      descricaoCurta: body.descricaoCurta || undefined,
      descricaoLonga: body.descricaoLonga || undefined,
      logoUrl: body.logoUrl || undefined,
      endereco: body.endereco,
      contato: body.contato,
      desconto: body.desconto,
      comoUsar: body.comoUsar,
      filtro: body.filtro,
      vigencia: body.vigencia,
      responsavel: body.responsavel,
      restricoes: body.restricoes || undefined,
      destaque: body.destaque,
      comissaoPct: body.comissaoPct,
      notasInternas: body.notasInternas || undefined,
      prefeituraIdsExtras: body.prefeituraIdsExtras,
      bancoId: body.bancoId,
      convenioId: body.convenioId || undefined,
      imagens: body.imagens?.length ? body.imagens : undefined,
      modoImagens: body.modoImagens,
      linkAcesso: body.linkAcesso?.url ? body.linkAcesso : undefined,
      todasPrefeiturasParceiras: body.todasPrefeiturasParceiras,
      duracaoMinimaMeses: body.duracaoMinimaMeses,
    };
    await persistBeneficio(c.env, b);
    // Hook: cria/atualiza o template de e-mail vinculado a este beneficio.
    // Se ja existe (edit), preserva assunto/corpo customizados.
    try { await upsertTemplateBeneficio(c.env, { id: b.id, nome: b.nome, publico: "servidor" }); }
    catch { /* best-effort — nao quebra o save do beneficio */ }
    return c.json({ beneficio: b });
  })
  .patch("/v1/admin/beneficios/:id/pausar", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "beneficios");
    await refreshBeneficios(c.env);
    const b = (await loadBeneficios(c.env)).find((x) => x.id === c.req.param("id"));
    if (!b) throw Errors.notFound("beneficio");
    b.ativo = false;
    await persistBeneficio(c.env, b);
    return c.json({ beneficio: b });
  })
  .patch("/v1/admin/beneficios/:id/reativar", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "beneficios");
    await refreshBeneficios(c.env);
    const b = (await loadBeneficios(c.env)).find((x) => x.id === c.req.param("id"));
    if (!b) throw Errors.notFound("beneficio");
    b.ativo = true;
    await persistBeneficio(c.env, b);
    return c.json({ beneficio: b });
  })

  // ===== Modelos de e-mail (editaveis pela averbadora) =====
  // A averbadora edita assunto/corpo/publico-alvo. Nao dispara envio real
  // automatico ainda — os handlers de fluxo usam textos hardcoded hoje. Este
  // consultor serve pra o operador ver, ajustar e mandar teste pro proprio
  // email. Prox iteracao: os handlers passam a ler daqui.
  .get("/v1/admin/email-templates", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "email-sistema");
    return c.json({ templates: await loadTemplates(c.env) });
  })
  .post("/v1/admin/email-templates", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "email-sistema");
    // Edicao mantem as regras: id obrigatorio (evento e' fixado no seed/hook,
    // nao pode mudar), evento vem do proprio template atual (nao no body).
    const body = z.object({
      id: z.string(),
      assunto: z.string().max(200).default(""),
      corpo: z.string().max(20_000).default(""),
      descricao: z.string().max(500).optional(),
      variaveis: z.array(z.string().max(60)).max(30).optional(),
      ativo: z.boolean().default(true),
    }).parse(await c.req.json());
    const atual = await getTemplate(c.env, body.id);
    if (!atual) throw Errors.notFound("template");
    const t = await upsertTemplate(c.env, {
      id: atual.id,
      evento: atual.evento,
      nome: atual.nome,
      publico: atual.publico,
      assunto: body.assunto,
      corpo: body.corpo,
      descricao: body.descricao,
      variaveis: body.variaveis,
      ativo: body.ativo,
      simulacaoTipo: atual.simulacaoTipo,
      simulacaoStatus: atual.simulacaoStatus,
      beneficioId: atual.beneficioId,
    });
    return c.json({ template: t });
  })
  // DELETE so remove templates de beneficio (dinamicos). Fixos nao podem
  // ser excluidos — regra do cliente.
  .delete("/v1/admin/email-templates/:id", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "email-sistema");
    const r = await removerTemplateSeguro(c.env, c.req.param("id"));
    if (!r.ok) throw Errors.validation({ template: r.motivo });
    return c.json({ ok: true });
  })
  // Preview de variaveis pre-preenchidas com dados REAIS do ambiente.
  // Serve pra UX: o operador nao precisa digitar valor pra cada {{var}} —
  // o front puxa esse endpoint e usa como default.
  .get("/v1/admin/email-templates/:id/preview-vars", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "email-sistema");
    const t = await getTemplate(c.env, c.req.param("id"));
    if (!t) throw Errors.notFound("template");
    return c.json({ vars: exemploVarsRealistas(t) });
  })
  // Envia teste REAL via SMTP configurado, DIRETO pro `destino` (nao passa
  // pelo notifyEmail global). Se o body nao trouxer `vars` (ou vier vazio),
  // usa dados de exemplo realistas — assim o operador so precisa digitar
  // o email de destino e clicar enviar.
  .post("/v1/admin/email-templates/:id/test", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "email-sistema");
    const id = c.req.param("id");
    const t = await getTemplate(c.env, id);
    if (!t) throw Errors.notFound("template");
    const body = z.object({
      destino: z.string().email(),
      vars: z.record(z.string()).optional(),
    }).parse(await c.req.json());
    // Merge: user tem prioridade, defaults cobrem o resto.
    const defaults = exemploVarsRealistas(t);
    const mergedVars = { ...defaults, ...(body.vars ?? {}) };
    const { assunto, corpo } = renderTemplate(t, mergedVars);
    // sendMail DIRETO com destino do body — nao passa por enviarNotificacao
    // que sobrescreveria com notifyEmail global do SMTP.
    const { subject, text, html } = movimentacaoEmail(assunto, corpo, [
      { label: "Template", valor: `${t.nome} (${t.id})` },
      { label: "Modo", valor: "Teste manual pelo painel" },
    ]);
    const r = await sendMail(c.env, { to: body.destino, subject, text, html });
    return c.json({
      sent: r.sent,
      destino: body.destino,
      reason: r.reason,
      preview: { assunto, corpo },
      varsAplicadas: mergedVars,
    });
  })
  // Interessados = servidores que clicaram no botao "Acessar" de um beneficio.
  // ?beneficioId=BEN-X filtra por beneficio; sem filtro, retorna todos os
  // cliques (ate 500 mais recentes). Ordenados do mais recente pro mais antigo.
  .get("/v1/admin/beneficios/interessados", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "interessados");
    await refreshCliques(c.env);
    const url = new URL(c.req.url);
    const beneficioId = url.searchParams.get("beneficioId");
    let cliques = await loadCliques(c.env);
    if (beneficioId) cliques = cliques.filter((clk) => clk.beneficioId === beneficioId);
    // Ordena desc por criadoEm e limita a 500.
    cliques = [...cliques]
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
      .slice(0, 500);
    // Agrega totais por beneficio pra a UI mostrar "N interessados" sem
    // precisar contar no client.
    const total = cliques.length;
    return c.json({ cliques, total });
  })
  // Contadores por beneficio — usado pelas listas (badge de N interessados).
  .get("/v1/admin/beneficios/interessados/resumo", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "interessados");
    await refreshCliques(c.env);
    const cliques = await loadCliques(c.env);
    const contagemPorBeneficio = new Map<string, number>();
    for (const clk of cliques) {
      contagemPorBeneficio.set(clk.beneficioId, (contagemPorBeneficio.get(clk.beneficioId) ?? 0) + 1);
    }
    return c.json({
      contagens: Array.from(contagemPorBeneficio.entries()).map(([beneficioId, total]) => ({ beneficioId, total })),
    });
  })
  // ============================================================
  // ADF — a averbadora aplica/reporta falha; prefeitura so recebe/consulta.
  // Cliente disse: "a averbadora que faz a adf, a prefeitura so recebe".
  // ============================================================
  .get("/v1/admin/adf/competencias", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "adf");
    // Isolate novo/redeploy: precisa recarregar prefeituras (pra ensureAdfsGlobal
    // iterar) + convenios (pra ensureAdfs conseguir mapear convenioId -> prefeitura)
    // + bancos (pra resolver banco_id -> nome). Sem isso, contratos aprovados
    // pelo banco nunca viravam ADF (bug 17/07/2026: 1 aprovada no banco, 0 em ADF).
    await Promise.all([
      refreshContratos(c.env),
      refreshConvenios(c.env),
      ensurePrefeiturasLoaded(c.env),
      ensureBancosLoaded(c.env),
    ]);
    const now = new Date().toISOString();
    const compAtual = folhas.sort((a, b) => b.competencia.localeCompare(a.competencia))[0]?.competencia ?? new Date().toISOString().slice(0, 7).replace("-", "");
    // Materializa para TODAS as prefeituras da competencia atual.
    ensureAdfsGlobal(compAtual, (id) => bancos.find((b) => b.id === id)?.nome ?? `Banco ${id}`, now, prefeituras.map((p) => p.id));
    return c.json({ competencias: listAdfCompetenciasGlobal(), competenciaAtual: compAtual });
  })
  .get("/v1/admin/adf", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "adf");
    await Promise.all([
      refreshContratos(c.env),
      refreshConvenios(c.env),
      ensurePrefeiturasLoaded(c.env),
      ensureBancosLoaded(c.env),
    ]);
    const now = new Date().toISOString();
    const url = new URL(c.req.url);
    const competencia = url.searchParams.get("competencia") ?? undefined;
    const prefFiltro = url.searchParams.get("prefeitura_id");
    const compAtual = competencia ?? (folhas.sort((a, b) => b.competencia.localeCompare(a.competencia))[0]?.competencia ?? new Date().toISOString().slice(0, 7).replace("-", ""));
    ensureAdfsGlobal(compAtual, (id) => bancos.find((b) => b.id === id)?.nome ?? `Banco ${id}`, now, prefeituras.map((p) => p.id));
    // Reconcilia contratos historicos: ADFs marcadas 'falha' pelo fluxo antigo
    // (antes do F1-falha) nao mexiam no contrato — ficavam presos em 'Aprovado'.
    await reconcileContratosFalhaHistorica(c.env);
    let list = listAdfsGlobal(competencia);
    if (prefFiltro) {
      const pid = Number(prefFiltro);
      list = list.filter((a) => a.prefeituraId === pid);
    }
    // Enriquece com nome da prefeitura pra UI + preenche tipoMargem a partir
    // do contrato correspondente EM TEMPO DE LEITURA. Evita depender do _adfs
    // in-memory ter o campo preenchido (que podia ficar stale entre isolates).
    const enriched = list.map((a) => {
      const ct = getContrato(a.adf);
      // Deduz do contrato: tipoMargem explicito > observacoes (Cartao Consig / Beneficio)
      let tipoMargem = a.tipoMargem ?? ct?.tipoMargem;
      if (!tipoMargem && ct?.tipoContrato === "ECONSIGNADO") {
        const obs = (ct?.observacoes ?? "").toLowerCase();
        if (obs.includes("beneficio") || obs.includes("benefício")) tipoMargem = "CARTAO_BENEFICIOS";
        else if (obs.includes("consignado")) tipoMargem = "CARTAO_CONSIGNADO";
      }
      return {
        ...a,
        tipoMargem,
        prefeituraNome: prefeituras.find((p) => p.id === a.prefeituraId)?.nome ?? `Pref ${a.prefeituraId}`,
      };
    });
    return c.json({ adfs: enriched });
  })
  .post("/v1/admin/adf/confirmar", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "adf");
    const body = z.object({ ids: z.array(z.string()).min(1) }).parse(await c.req.json());
    await refreshContratos(c.env);
    // Re-materializa ADFs no _adfs deste isolate. Sem isso, um isolate frio
    // que atende o POST direto (sem ter servido GET /admin/adf antes) tem
    // _adfs vazio e o setAdfStatusGlobal nao acha os ids -> retorna 0.
    // ensureAdfs precisa de CONVENIOS_MOCK populado — sem refreshConvenios em
    // isolate frio o filtro convenioIds.has(ct.convenioId) rejeita tudo.
    await Promise.all([
      ensurePrefeiturasLoaded(c.env), ensureBancosLoaded(c.env), refreshConvenios(c.env),
    ]);
    const nowIso = new Date().toISOString();
    for (const pref of prefeituras) {
      ensureAdfsGlobal(new Date().toISOString().slice(0, 7).replace("-", ""),
        (id) => bancos.find((b) => b.id === id)?.nome ?? `Banco ${id}`, nowIso, [pref.id]);
    }
    const adfs = setAdfStatusGlobal(body.ids, "aplicada", undefined, new Date().toISOString());
    // Promove pra "Ativo" contratos que estavam em "Aprovado" — o banco so
    // aprovou; e' a averbadora que efetiva a averbacao ao aplicar em folha.
    // No fluxo antigo (banco averbava direto) ja eram "Ativo": aqui e' no-op.
    const ator = `averbadora:${c.get("jwt").sub}`;
    // setAdfStatusGlobal ja carimbou folhaStatus="aplicada" no contrato — e' esse
    // sinal que CONCLUI o passo a passo e libera a entrada em CONTRATOS ATIVOS.
    for (const adf of adfs) {
      setContratoSituacaoAtivo(adf, ator);
      await persistContrato(c.env, adf);
      // F2 substituicao: se este contrato e REFIN (portabilidade) e tem
      // contratoOrigem apontando pra um adfBanco externo, marca a linha de
      // tombamento como substituida — sai do calculo de margem e da lista
      // de portaveis. Bug pre-fix: contrato origem continuava ativo em
      // paralelo, gerando double-count no comprometido.
      const ct = getContrato(adf);
      if (ct?.tipoContrato === "REFIN" && ct.contratoOrigem && ct.matricula) {
        const affectedLotes = marcarTombamentoSubstituido(ct.matricula, ct.contratoOrigem, adf);
        // Write-through: sem isso a marcacao fica so no isolate atual e outros
        // isolates continuariam vendo o tombamento como portavel.
        for (const loteId of affectedLotes) await persistLotePublic(c.env, loteId);
        if (affectedLotes.length > 0) {
          appendAudit({
            categoria: "margem", acao: "portabilidade_substituiu_tombamento",
            userId: ator, userRole: "averbadora",
            detalhes: `Contrato ${adf} (REFIN) substituiu tombamento ${ct.contratoOrigem} da matricula ${ct.matricula}.`,
          });
        }
      }
    }
    appendAudit({ categoria: "margem", acao: "adf_aplicada_admin", userId: ator, userRole: "averbadora", detalhes: `${adfs.length} ADFs aplicadas em folha pela averbadora.` });
    // Notifica cada servidor por email (best-effort — nunca quebra a request).
    // Tenta template editavel /averbadora/emails/simulacao (averbada) primeiro;
    // fallback hardcoded se nao houver template ativo.
    for (const adf of adfs) {
      const ct = getContrato(adf);
      if (!ct) continue;
      const srv = SERVIDORES_BUSCA_MOCK.find((s) => s.matricula === ct.matricula);
      if (!srv?.email) continue;
      const brl = (n: number) => `R$ ${(Math.round(n * 100) / 100).toFixed(2).replace(".", ",")}`;
      const bancoNome = bancos.find((b) => b.id === ct.bancoId)?.nome ?? `Banco ${ct.bancoId}`;
      const conv = CONVENIOS_MOCK.find((cv) => cv.id === ct.convenioId);
      const simTipo: "emprestimo" | "cartao_consignado" | "cartao_beneficio" | "portabilidade" = (() => {
        const t = (ct.tipoContrato ?? "").toUpperCase();
        if (t === "REFIN") return "portabilidade";
        if (t === "ECONSIGNADO") return ct.tipoMargem === "CARTAO_BENEFICIOS" ? "cartao_beneficio" : "cartao_consignado";
        return "emprestimo";
      })();
      const vars: Record<string, string> = {
        nome: ct.nome, matricula: ct.matricula, prefeitura: conv?.prefeitura ?? "",
        adf, banco: bancoNome, valor: brl(ct.valorFinanciado),
        parcelas: String(ct.totalParcelas), valorParcela: brl(ct.valorParcela),
        contract_name: `CCB-${new Date().getFullYear()}-${adf}`,
      };
      const p = (async () => {
        const r = await dispatchTemplateEmail(
          c.env,
          { evento: "simulacao", publico: "servidor", simulacaoTipo: simTipo, simulacaoStatus: "averbada" },
          srv.email!,
          vars,
        );
        if (r.usouTemplate) return;
        // Fallback
        await enviarNotificacao(c.env, {
          destinoPadrao: srv.email,
          titulo: `Contrato ${adf} averbado`,
          mensagem: "Sua averbacao foi confirmada em folha pela prefeitura. O recurso ja pode ser liberado pelo banco conforme o combinado.",
          detalhes: [
            { label: "Banco", valor: bancoNome },
            { label: "Valor financiado", valor: brl(ct.valorFinanciado) },
            { label: "Parcela", valor: `${ct.totalParcelas}x de ${brl(ct.valorParcela)}` },
            { label: "Situacao", valor: "Averbada / Liberada" },
          ],
        });
      })();
      try { c.executionCtx.waitUntil(p); } catch { void p; }
    }
    return c.json({ aplicadas: adfs.length });
  })
  .post("/v1/admin/adf/falha", async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "adf");
    const body = z.object({ ids: z.array(z.string()).min(1), motivo: z.string().min(3) }).parse(await c.req.json());
    await refreshContratos(c.env);
    // Materializa ADFs no isolate frio antes de mutar (mesmo motivo do /confirmar).
    await Promise.all([
      ensurePrefeiturasLoaded(c.env), ensureBancosLoaded(c.env), refreshConvenios(c.env),
    ]);
    const nowIso = new Date().toISOString();
    for (const pref of prefeituras) {
      ensureAdfsGlobal(new Date().toISOString().slice(0, 7).replace("-", ""),
        (id) => bancos.find((b) => b.id === id)?.nome ?? `Banco ${id}`, nowIso, [pref.id]);
    }
    const adfs = setAdfStatusGlobal(body.ids, "falha", body.motivo, new Date().toISOString());
    // Muda situacao do contrato pra 'Falha em folha' (libera margem + gera pendencia
    // pro banco tratar via /portal/banco/contratos/:adf/tratar-falha).
    for (const adf of adfs) {
      setContratoFalhaEmFolha(adf, body.motivo);
      await persistContrato(c.env, adf);
    }
    appendAudit({ categoria: "margem", acao: "adf_falha_admin", userId: `averbadora:${c.get("jwt").sub}`, userRole: "averbadora", detalhes: `${adfs.length} ADFs marcadas como falha: ${body.motivo}.` });
    // Notifica servidor + banco por email (best-effort).
    for (const adf of adfs) {
      const ct = getContrato(adf);
      if (!ct) continue;
      const bancoNome = bancos.find((b) => b.id === ct.bancoId)?.nome ?? `Banco ${ct.bancoId}`;
      // 1) Servidor
      const srv = SERVIDORES_BUSCA_MOCK.find((s) => s.matricula === ct.matricula);
      if (srv?.email) {
        const p = enviarNotificacao(c.env, {
          destinoPadrao: srv.email,
          titulo: `Averbacao ${adf} nao aplicada em folha`,
          mensagem: `A averbacao nao pode ser aplicada em folha. Motivo: ${body.motivo}. O banco esta ciente e vai decidir como tratar (reenviar / cancelar / cobranca direta). Sua margem foi liberada enquanto isso.`,
          detalhes: [
            { label: "Banco", valor: bancoNome },
            { label: "Situacao", valor: "Falha em folha (pendente banco)" },
          ],
        });
        try { c.executionCtx.waitUntil(p); } catch { void p; }
      }
      // 2) Banco (pendencia — precisa acao)
      const banco = bancos.find((b) => b.id === ct.bancoId);
      const bancoEmail = banco?.contatoEmail ?? banco?.loginEmail;
      if (bancoEmail) {
        const p = enviarNotificacao(c.env, {
          destinoPadrao: bancoEmail,
          titulo: `[Acao necessaria] ADF ${adf} falhou em folha`,
          mensagem: `A averbadora reportou falha aplicando a ADF ${adf} (matricula ${ct.matricula}, ${ct.nome}) em folha. Motivo: ${body.motivo}. Trate no portal: reenviar / cancelar contrato / cobranca direta.`,
          detalhes: [
            { label: "ADF", valor: adf },
            { label: "Servidor", valor: ct.nome },
            { label: "Matricula", valor: ct.matricula },
            { label: "Valor parcela", valor: `R$ ${ct.valorParcela.toFixed(2).replace(".", ",")}` },
            { label: "Portal", valor: "/banco/carteira ou /banco/propostas" },
          ],
        });
        try { c.executionCtx.waitUntil(p); } catch { void p; }
      }
    }
    return c.json({ falhas: adfs.length });
  })

  .post("/v1/admin/servidores/importar", authRequired, async (c) => {
    const j = c.get("jwt"); requireAdmin(j); requirePermissao(j, "servidores");
    const prefId = Number(c.req.query("prefeituraId"));
    if (!Number.isFinite(prefId)) throw Errors.validation({ prefeituraId: "obrigatorio (use ?prefeituraId=N)" });
    const pref = prefeituras.find((p) => p.id === prefId);
    if (!pref) throw Errors.notFound("prefeitura");
    // Hidrata convenios do PG antes de filtrar — isolate fresh via CONVENIOS_MOCK
    // vazio mesmo com convenios persistidos, e a importacao devolvia erro
    // "prefeitura nao possui convenios" mentindo pro usuario.
    await refreshConvenios(c.env);
    await refreshServidorCamposConfigs(c.env);
    const config = ensureServidorCamposConfig(prefId);
    const camposByKey = new Map(config.campos.map((f) => [f.key, f]));
    const camposCustomAtivos = config.campos.filter((f) => !f.sistema && f.visivel);
    const conveniosPref = CONVENIOS_MOCK.filter((cv) => cv.prefeituraId === prefId);
    const defaultConvenioId = conveniosPref[0]?.id ?? "";
    const text = await readCsvBody(c);
    const { rows } = parseCsv(text);
    const out: ImportOutcome<typeof SERVIDORES_BUSCA_MOCK[number]> = { inserted: 0, updated: 0, skipped: 0, errors: [], rows: [] };
    rows.forEach((r, idx) => {
      const line = idx + 2;
      // Obrigatorios TRAVADOS (cpf/matricula/email) + os que a prefeitura marcou
      // como `obrigatorio:true` na config. Rejeita se faltar qualquer um.
      for (const f of config.campos) {
        if (!f.obrigatorio || !f.sistema) continue;
        const val = (r[f.key] ?? "").toString().trim();
        if (!val) { out.errors.push({ line, message: `campo obrigatorio faltando: ${f.key}` }); return; }
      }
      const cpf = (r.cpf ?? "").replace(/\D/g, "");
      if (cpf.length !== 11) { out.errors.push({ line, message: "cpf deve ter 11 digitos" }); return; }
      const emailReq = camposByKey.get("email");
      if (emailReq?.obrigatorio && !(r.email ?? "").trim()) {
        out.errors.push({ line, message: "email obrigatorio (login do servidor)" }); return;
      }
      const matricula = normalizeMatricula(r.matricula ?? "");
      if (!MATRICULA_REGEX.test(matricula)) {
        out.errors.push({ line, message: `matricula "${r.matricula}" invalida: use alfanumerico + hifen, 1..30 chars (ex: 852029100, M-009821)` });
        return;
      }
      r.matricula = matricula;
      // idConvenio: SEM fallback silencioso pro default. Se CSV nao trouxer
      // idConvenio valido, rejeita a linha com erro explicito (regra
      // 20/07/2026: "nao inventar"). Servidor precisa ter convenio real.
      const idConvenio = (r.idConvenio ?? "").trim();
      if (!idConvenio) { out.errors.push({ line, message: "idConvenio obrigatorio no CSV (nao ha mais auto-fill silencioso)" }); return; }
      if (!conveniosPref.some((cv) => cv.id === idConvenio)) {
        out.errors.push({ line, message: `idConvenio "${idConvenio}" nao pertence a ${pref.nome}. Convenios validos: ${conveniosPref.map((cv) => cv.id).join(", ") || "(nenhum)"}` });
        return;
      }
      // Identidade (prefeituraId, matricula) — permite mesmo CPF em outra prefeitura.
      const existing = SERVIDORES_BUSCA_MOCK.find((s) => s.matricula === r.matricula && prefeituraIdDe(s) === prefId);
      // Salario: aceita formato BR ("R$ 5.000,50", "5.000,50") e US ("5000.50").
      const salario = parseNumberBr(r.salarioLiquido);
      const ibge = Number((r.codigoIbge ?? "").toString().replace(/\D/g, ""));
      // Vinculo: aceita string canonica (ESTATUTARIO/CLT/etc) OU codigo numerico.
      // SEM fallback pra "ESTATUTARIO" — se CSV nao trouxer, salva vazio.
      const vinculo = mapVinculo(r.vinculo) ?? "";
      // Origem: usa o do CSV se veio; SEM fallback pro nome da prefeitura.
      // Antes: origem sempre sobrescrita com pref.nome (inventado 20/07/2026).
      const origem = (r.origem ?? "").trim();
      const s: ServidorBuscaMock = {
        cpf,
        cpfMasked: cpf.slice(0, 3) + ".***.***-" + cpf.slice(-2),
        matricula: r.matricula!,
        idMatricula: `MAT-${r.matricula!}`,
        prefeituraId: prefId,
        nome: r.nome!,
        dataAdmissao: r.dataAdmissao ?? "",
        dataNascimento: r.dataNascimento ?? "",
        vinculo,
        origem,
        // SEM fallback pra "TRABALHANDO" — se CSV nao trouxer, salva vazio.
        situacaoFuncional: (r.situacaoFuncional?.trim() ?? "") as ServidorBuscaMock["situacaoFuncional"],
        salarioLiquido: Number.isFinite(salario) && salario > 0 ? salario : 0,
        idConvenio,
        codigoIbge: Number.isFinite(ibge) && ibge > 0 ? ibge : undefined,
      };
      // Só entra em `s` se o CSV trouxe valor — evita zerar contato/endereço
      // que o servidor definiu no primeiro acesso.
      if (r.cargo) s.cargo = r.cargo;
      if (r.endereco) s.endereco = r.endereco;
      if (r.email) s.email = r.email;
      if (r.telefone) s.telefone = r.telefone;
      // Campos custom da config: le do CSV pela key OU pelo slug sem prefixo
      // (o template CSV agora usa slug puro — "marketing_central" em vez de
      // "custom_marketing_central" — mas CSVs antigos com prefixo continuam
      // valendo). Chave no camposCustom permanece a key completa.
      if (camposCustomAtivos.length > 0) {
        const custom: Record<string, string> = { ...(existing?.camposCustom ?? {}) };
        for (const f of camposCustomAtivos) {
          const slugSemPrefixo = f.key.startsWith("custom_") ? f.key.slice("custom_".length) : f.key;
          const val = ((r[f.key] ?? r[slugSemPrefixo]) ?? "").toString().trim();
          if (val) custom[f.key] = val;
        }
        if (Object.keys(custom).length > 0) s.camposCustom = custom;
      }
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
    // Atualiza ultimaSincronizacao da prefeitura sempre que houver import
    // manual bem-sucedido de servidores. Antes so o botao "Sincronizar"
    // (endpoint /admin/prefeituras/:id/sincronizar) atualizava, e como esse
    // botao raramente e usado no fluxo manual, o campo ficava "-" pra sempre
    // mesmo com dados fresquinhos. Cliente reportou 21/07/2026.
    if (out.inserted + out.updated > 0) {
      const ts = new Date().toISOString();
      pref.ultimaSincronizacao = ts;
      pref.ultimaSincResultado = { novos: out.inserted, atualizados: out.updated, ts };
      try { await persistPrefeitura(c.env, pref); } catch { /* best-effort */ }
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
