// Notificacoes DERIVADAS do estado real (propostas + folha). Nao mantem
// lista propria — calcula on-the-fly. So persiste o estado lida/nao-lida
// por ID em localStorage.

import { getAllPropostasForMatricula, type Proposta } from "./propostas-data";
import { readActiveIdMatricula } from "./matricula-data";

export type NotifType =
  | "proposta_em_analise"
  | "proposta_aprovada"
  | "proposta_aguardando_formalizacao"
  | "proposta_recusada"
  | "proposta_cancelada"
  | "proposta_expirando"
  | "folha_processada";

export interface Notification {
  id: string;
  type: NotifType;
  titulo: string;
  mensagem: string;
  quando: string;
  href: string;
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
  const baseHref = "/servidor/propostas";
  switch (p.estado) {
    case "em_analise":
      return {
        id: `proposta:${p.id}:em_analise`,
        type: "proposta_em_analise",
        titulo: `Proposta ${p.id} em analise`,
        mensagem: `O ${p.banco} esta avaliando sua pre-reserva. Voce sera avisado quando responder.`,
        quando: tempoRelativo(p.criadaEm),
        href: baseHref,
        lida: false,
      };
    case "aprovada":
      return {
        id: `proposta:${p.id}:aprovada`,
        type: "proposta_aprovada",
        titulo: `Proposta ${p.id} aprovada`,
        mensagem: `O ${p.banco} aprovou. ${p.linkFormalizacao ? "Formalize pelo link oficial." : "Aguarde proxima etapa."}`,
        quando: tempoRelativo(p.criadaEm),
        href: baseHref,
        lida: false,
      };
    case "aguardando_formalizacao":
      return {
        id: `proposta:${p.id}:aguardando`,
        type: "proposta_aguardando_formalizacao",
        titulo: `Aguardando formalizacao da ${p.id}`,
        mensagem: p.expiraEm
          ? `Acesse o ${p.banco} para assinar. Trava expira em ${p.expiraEm}.`
          : `Acesse o ${p.banco} para assinar o contrato.`,
        quando: tempoRelativo(p.criadaEm),
        href: baseHref,
        lida: false,
      };
    case "recusada":
      return {
        id: `proposta:${p.id}:recusada`,
        type: "proposta_recusada",
        titulo: `Proposta ${p.id} recusada`,
        mensagem: p.motivoRecusa ?? `O ${p.banco} recusou sua pre-reserva.`,
        quando: tempoRelativo(p.criadaEm),
        href: baseHref,
        lida: false,
      };
    case "cancelada":
      return {
        id: `proposta:${p.id}:cancelada`,
        type: "proposta_cancelada",
        titulo: `Proposta ${p.id} cancelada`,
        mensagem: `Sua pre-reserva foi cancelada e a margem voltou a ficar disponivel.`,
        quando: tempoRelativo(p.criadaEm),
        href: baseHref,
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
 * lida/nao-lida aplicado.
 */
export function buildNotifications(): Notification[] {
  const idMatricula = readActiveIdMatricula();
  const propostas = getAllPropostasForMatricula(idMatricula);
  const readIds = readReadIds();

  const derivadas = propostas
    .map(notifFromProposta)
    .filter((n): n is Notification => n != null);

  // Folha processada sempre presente. Em prod, geraria com base no ciclo
  // de processamento da prefeitura.
  const lista = [...derivadas, folhaProcessada()];

  return lista.map((n) => ({ ...n, lida: readIds.has(n.id) }));
}
