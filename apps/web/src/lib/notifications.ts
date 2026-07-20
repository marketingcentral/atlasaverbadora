// Notificacoes DERIVADAS do estado real (propostas + folha). Nao mantem
// lista propria — calcula on-the-fly. So persiste o estado lida/nao-lida
// por ID em localStorage.

import { fmtDateTime, getAllPropostasForMatricula, type Proposta } from "./propostas-data";
import { readActiveIdMatricula } from "./matricula-data";

export type NotifType =
  | "proposta_enviada"
  | "proposta_em_analise"
  | "proposta_aprovada"
  | "proposta_aguardando_adf"
  | "proposta_averbada"
  | "proposta_aguardando_formalizacao"
  | "proposta_recusada"
  | "proposta_cancelada"
  | "proposta_expirando"
  | "folha_processada"
  | "oferta_banco";

export interface Notification {
  id: string;
  type: NotifType;
  titulo: string;
  mensagem: string;
  quando: string;
  /** Link interno (ex.: /servidor/contratos#PRO-9803). */
  href: string;
  /** Link externo opcional (ex.: link do banco pra formalizar). Quando presente, abre em nova aba. */
  externalLink?: string;
  lida: boolean;
}

const READ_KEY = "atlas:notifications:read";
const DISMISSED_KEY = "atlas:notifications:dismissed";

function readReadIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeReadIds(set: Set<string>): void {
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

function readDismissedIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeDismissedIds(set: Set<string>): void {
  try {
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

/** Dispensa todas as notificacoes atuais — some do dropdown do sino. Chamado
 *  pelo botao "Limpar tudo". Notificacoes NOVAS (estados futuros da proposta)
 *  continuam aparecendo — so o snapshot atual e escondido. */
export function dismissAll(notifIds: string[]): void {
  const set = readDismissedIds();
  for (const id of notifIds) set.add(id);
  writeDismissedIds(set);
}

/** Filtra ids dispensados — usado pelo builder. */
export function isDismissed(id: string): boolean {
  return readDismissedIds().has(id);
}

export function markAsRead(notifId: string): void {
  const set = readReadIds();
  set.add(notifId);
  writeReadIds(set);
}

export function markAllAsRead(notifIds: string[]): void {
  const set = readReadIds();
  for (const id of notifIds) set.add(id);
  writeReadIds(set);
}

function tempoRelativo(criadaEm: string): string {
  // Aceita ISO ou texto formatado. Para textos hardcoded ja formatados, devolve o proprio texto.
  const tentativa = new Date(criadaEm);
  if (Number.isNaN(tentativa.getTime())) return criadaEm;
  const diffMs = Date.now() - tentativa.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `ha ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `ha ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `ha ${d}d`;
  return tentativa.toLocaleDateString("pt-BR");
}

/** Emite UMA notificacao POR ETAPA que a proposta ja alcancou — assim o
 *  servidor ve a timeline inteira no sino ("Proposta enviada" → "Em analise"
 *  → "Aprovada" → "Aguardando ADF" → "Averbada"). O estado atual determina
 *  quantas etapas foram alcancadas — nao emite futuras. */
function notifsFromProposta(p: Proposta): Notification[] {
  const internalHref = `/servidor/contratos#${p.id}`;
  const quando = tempoRelativo(p.criadaEm);
  const list: Notification[] = [];

  // ETAPA 1 — Proposta enviada. Sempre emitida (mesmo que ja tenha avancado).
  list.push({
    id: `proposta:${p.id}:enviada`,
    type: "proposta_enviada",
    titulo: `Proposta ${p.id} enviada`,
    mensagem: `Sua pré-reserva foi registrada no Atlas e enviada ao ${p.banco}.`,
    quando,
    href: internalHref,
    lida: false,
  });

  // Fluxos negativos — encerram a timeline aqui.
  if (p.estado === "recusada") {
    list.push({
      id: `proposta:${p.id}:recusada`,
      type: "proposta_recusada",
      titulo: `Proposta ${p.id} recusada`,
      mensagem: p.motivoRecusa ?? `O ${p.banco} recusou sua pré-reserva.`,
      quando,
      href: internalHref,
      lida: false,
    });
    return list;
  }
  if (p.estado === "cancelada" || p.estado === "expirada") {
    list.push({
      id: `proposta:${p.id}:cancelada`,
      type: "proposta_cancelada",
      titulo: `Proposta ${p.id} cancelada`,
      mensagem: p.estado === "expirada"
        ? `Sua pré-reserva expirou (48h sem resposta do banco). Margem liberada.`
        : `Sua pré-reserva foi cancelada e a margem voltou a ficar disponível.`,
      quando,
      href: internalHref,
      lida: false,
    });
    return list;
  }

  // ETAPA 2 — Em analise pelo banco. Alcancada assim que a proposta existe.
  list.push({
    id: `proposta:${p.id}:em_analise`,
    type: "proposta_em_analise",
    titulo: `Proposta ${p.id} em análise`,
    mensagem: `O ${p.banco} está avaliando sua pré-reserva. Você será avisado quando responder.`,
    quando,
    href: internalHref,
    lida: false,
  });

  // ETAPA 3 — Aprovada pelo banco.
  if (p.estado === "aprovada" || p.estado === "aguardando_formalizacao" || p.estado === "liberada") {
    list.push({
      id: `proposta:${p.id}:aprovada`,
      type: "proposta_aprovada",
      titulo: `Proposta ${p.id} aprovada`,
      mensagem: `O ${p.banco} aprovou sua proposta. A averbadora vai processar a ADF nas próximas horas.`,
      quando,
      href: internalHref,
      lida: false,
    });
  }

  // ETAPA 4 — Aguardando ADF da averbadora (apos aprovacao, antes de virar Ativo).
  if (p.estado === "aprovada") {
    list.push({
      id: `proposta:${p.id}:aguardando_adf`,
      type: "proposta_aguardando_adf",
      titulo: `Aguardando averbadora aplicar ${p.id}`,
      mensagem: `A averbadora Atlas vai aplicar sua ADF na folha da prefeitura em breve.`,
      quando,
      href: internalHref,
      lida: false,
    });
  }

  // ETAPA 4b — Aguardando assinatura (fluxo pos-formalizacao, se aplicavel).
  if (p.estado === "aguardando_formalizacao") {
    list.push({
      id: `proposta:${p.id}:aguardando_formalizacao`,
      type: "proposta_aguardando_formalizacao",
      titulo: `Aguardando assinatura de ${p.id}`,
      mensagem: p.expiraEm
        ? `Assine com o ${p.banco} (por telefone, e-mail ou app do banco). Trava expira em ${fmtDateTime(p.expiraEm)}.`
        : `Assine com o ${p.banco} — o banco entrará em contato pelo canal dele.`,
      quando,
      href: internalHref,
      lida: false,
    });
  }

  // ETAPA 5 — Averbacao completa (ADF aplicada em folha).
  if (p.estado === "liberada") {
    list.push({
      id: `proposta:${p.id}:averbada`,
      type: "proposta_averbada",
      titulo: `Averbação de ${p.id} confirmada`,
      mensagem: `Sua ADF foi aplicada na folha da prefeitura. O contrato está ativo e o desconto começa na próxima competência.`,
      quando,
      href: internalHref,
      lida: false,
    });
  }

  return list;
}

/** Notificacao estatica de folha — em prod seria gerada pelo webhook do RH. */
function folhaProcessada(): Notification {
  return {
    id: "folha:junho-2026",
    type: "folha_processada",
    titulo: "Folha de Junho/2026 processada",
    mensagem: "Sua margem foi recalculada com base na nova folha da prefeitura.",
    quando: "ontem",
    href: "/servidor/dashboard",
    lida: false,
  };
}

/**
 * Constroi a lista de notificacoes para a matricula ativa, com estado
 * lida/nao-lida aplicado. Le propostas do localStorage (legado).
 */
export function buildNotifications(): Notification[] {
  const idMatricula = readActiveIdMatricula();
  const propostas = getAllPropostasForMatricula(idMatricula);
  return buildNotificationsFromPropostas(propostas);
}

/**
 * Versao que aceita propostas ja carregadas (idealmente do backend via
 * useQuery). Isso mantem sino e /servidor/contratos na MESMA fonte de
 * verdade, evitando notificar sobre proposta que ja nao existe no DB.
 * Opcionalmente inclui ofertas de credito criadas pelos bancos.
 */
export interface OfertaBancoParaNotif {
  id: string;
  bancoNome: string;
  titulo: string;
  mensagem: string;
  taxaAm: number;
  parcelasMax: number;
  valorMax: number;
  criadoEm: string;
  expiraEm?: string | null;
}
/** "1h 23min" ou "45min" ou "12s". Para countdown de promocao relampago. */
function formatCountdown(msRestantes: number): string {
  const total = Math.max(0, Math.floor(msRestantes / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min`;
  if (m > 0) return `${m}min ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}
function notifDeOferta(o: OfertaBancoParaNotif): Notification | null {
  let sufixo = "";
  if (o.expiraEm) {
    const restante = new Date(o.expiraEm).getTime() - Date.now();
    if (restante <= 0) return null; // ja expirou — nao aparece no sino
    // Promocao relampago (≤ 24h): destaca o countdown.
    if (restante <= 24 * 3600 * 1000) sufixo = ` ⏰ Termina em ${formatCountdown(restante)}.`;
  }
  return {
    id: `oferta:${o.id}`,
    type: "oferta_banco",
    titulo: `${o.bancoNome}: ${o.titulo}`,
    mensagem: `${o.mensagem} — ${o.taxaAm.toFixed(2)}% a.m. em até ${o.parcelasMax}x.${sufixo}`,
    quando: tempoRelativo(o.criadoEm),
    href: "/servidor/ofertas",
    lida: false,
  };
}
export function buildNotificationsFromPropostas(
  propostas: Proposta[],
  ofertasBanco: OfertaBancoParaNotif[] = [],
): Notification[] {
  const readIds = readReadIds();
  const dismissedIds = readDismissedIds();
  // Cada proposta pode emitir varias notifs (uma por etapa da timeline).
  const derivadas = propostas.flatMap(notifsFromProposta);
  const ofertas = ofertasBanco
    .map(notifDeOferta)
    .filter((n): n is Notification => n != null);
  const lista = [...derivadas, ...ofertas, folhaProcessada()];
  // Filtra dispensadas (usuario clicou "Limpar tudo") e marca lidas.
  return lista
    .filter((n) => !dismissedIds.has(n.id))
    .map((n) => ({ ...n, lida: readIds.has(n.id) }));
}
