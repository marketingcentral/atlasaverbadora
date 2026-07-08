// Notificacoes DERIVADAS do estado real (propostas + folha). Nao mantem
// lista propria — calcula on-the-fly. So persiste o estado lida/nao-lida
// por ID em localStorage.

import { fmtDateTime, getAllPropostasForMatricula, type Proposta } from "./propostas-data";
import { readActiveIdMatricula } from "./matricula-data";

export type NotifType =
  | "proposta_em_analise"
  | "proposta_aprovada"
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
  /** Link interno (ex.: /servidor/propostas#PRO-9803). */
  href: string;
  /** Link externo opcional (ex.: link do banco pra formalizar). Quando presente, abre em nova aba. */
  externalLink?: string;
  lida: boolean;
}

const READ_KEY = "atlas:notifications:read";

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

function notifFromProposta(p: Proposta): Notification | null {
  // Hash leva direto pro card na pagina de propostas (scroll + destaque).
  const internalHref = `/servidor/propostas#${p.id}`;
  switch (p.estado) {
    case "em_analise":
      return {
        id: `proposta:${p.id}:em_analise`,
        type: "proposta_em_analise",
        titulo: `Proposta ${p.id} em análise`,
        mensagem: `O ${p.banco} está avaliando sua pré-reserva. Você será avisado quando responder.`,
        quando: tempoRelativo(p.criadaEm),
        href: internalHref,
        lida: false,
      };
    case "aprovada":
      return {
        id: `proposta:${p.id}:aprovada`,
        type: "proposta_aprovada",
        titulo: `Proposta ${p.id} aprovada`,
        // Assinatura acontece no proprio banco (nao ha formalizacao in-app por enquanto).
        mensagem: `O ${p.banco} aprovou. Entrará em contato para assinar o contrato.`,
        quando: tempoRelativo(p.criadaEm),
        href: internalHref,
        lida: false,
      };
    case "aguardando_formalizacao":
      return {
        id: `proposta:${p.id}:aguardando`,
        type: "proposta_aguardando_formalizacao",
        titulo: `Aguardando assinatura de ${p.id}`,
        // O contrato e' assinado diretamente com o banco (canal proprio dele).
        mensagem: p.expiraEm
          ? `Assine com o ${p.banco} (por telefone, e-mail ou app do banco). Trava expira em ${fmtDateTime(p.expiraEm)}.`
          : `Assine com o ${p.banco} — o banco entrará em contato pelo canal dele.`,
        quando: tempoRelativo(p.criadaEm),
        href: internalHref,
        lida: false,
      };
    case "recusada":
      return {
        id: `proposta:${p.id}:recusada`,
        type: "proposta_recusada",
        titulo: `Proposta ${p.id} recusada`,
        mensagem: p.motivoRecusa ?? `O ${p.banco} recusou sua pré-reserva.`,
        quando: tempoRelativo(p.criadaEm),
        href: internalHref,
        lida: false,
      };
    case "cancelada":
      return {
        id: `proposta:${p.id}:cancelada`,
        type: "proposta_cancelada",
        titulo: `Proposta ${p.id} cancelada`,
        mensagem: `Sua pré-reserva foi cancelada e a margem voltou a ficar disponível.`,
        quando: tempoRelativo(p.criadaEm),
        href: internalHref,
        lida: false,
      };
    default:
      return null;
  }
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
 * useQuery). Isso mantem sino e /servidor/propostas na MESMA fonte de
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
  const derivadas = propostas
    .map(notifFromProposta)
    .filter((n): n is Notification => n != null);
  const ofertas = ofertasBanco
    .map(notifDeOferta)
    .filter((n): n is Notification => n != null);
  const lista = [...derivadas, ...ofertas, folhaProcessada()];
  return lista.map((n) => ({ ...n, lida: readIds.has(n.id) }));
}
