// Mock de propostas iniciais e helpers de leitura/escrita do localStorage.
// Compartilhado entre /servidor/propostas e /lib/notifications para que ambos
// trabalhem com a mesma fonte de dados.

export type EstadoProposta =
  | "em_analise"
  | "aprovada"
  | "aguardando_formalizacao"
  | "formalizada"
  | "liberada"
  | "recusada"
  | "expirada"
  | "cancelada";

export interface Proposta {
  id: string;
  banco: string;
  estado: EstadoProposta;
  valor: number;
  parcelas: number;
  parcela: number;
  taxaAm: number;
  criadaEm: string; // ISO ou texto formatado dependendo da fonte
  expiraEm?: string;
  linkFormalizacao?: string;
  motivoRecusa?: string;
  idMatricula?: string;
}

export interface StoredProposta extends Proposta {
  tipo?: "novo" | "portabilidade" | "refinanciamento";
}

export const PROPOSTAS_KEY = "atlas:propostas:userCriadas";

export const ESTADO_LABEL: Record<EstadoProposta, string> = {
  em_analise: "Em analise pelo banco",
  aprovada: "Aprovada",
  aguardando_formalizacao: "Aguardando formalizacao",
  formalizada: "Formalizada",
  liberada: "Liberada",
  recusada: "Recusada",
  expirada: "Expirada",
  cancelada: "Cancelada",
};

export const ESTADOS_TIMELINE: EstadoProposta[] = [
  "em_analise",
  "aprovada",
  "aguardando_formalizacao",
  "formalizada",
  "liberada",
];

// Demo comeca vazia. Propostas sao criadas pelo usuario via /simular -> /termo
// (salvas em localStorage[atlas:propostas:userCriadas]) ou via /portabilidade.
// Para popular dados pre-existentes, adicione entradas aqui com idMatricula
// apontando para a matricula correspondente.
export const PROPOSTAS_INICIAIS: Proposta[] = [];

/** Formata ISO em "DD/MM/YYYY HH:MM" para exibicao nas telas. */
export function fmtDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function readUserPropostas(): StoredProposta[] {
  try {
    const raw = window.localStorage.getItem(PROPOSTAS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredProposta[];
  } catch {
    return [];
  }
}

export function writeUserPropostas(list: StoredProposta[]): void {
  try {
    window.localStorage.setItem(PROPOSTAS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

/**
 * Combina propostas iniciais + criadas pelo usuario, filtra pela matricula.
 * `criadaEm` e `expiraEm` ficam em ISO (raw) — telas devem formatar com
 * `fmtDateTime` para exibir, e notificacoes usam tempoRelativo().
 */
export function getAllPropostasForMatricula(idMatricula: string | null): Proposta[] {
  const user = readUserPropostas();
  const iniciais = idMatricula
    ? PROPOSTAS_INICIAIS.filter((p) => !p.idMatricula || p.idMatricula === idMatricula)
    : PROPOSTAS_INICIAIS;
  const userFiltradas = idMatricula
    ? user.filter((p) => !p.idMatricula || p.idMatricula === idMatricula)
    : user;
  return [...userFiltradas, ...iniciais];
}

export function updateEstadoProposta(id: string, novoEstado: EstadoProposta): void {
  const list = readUserPropostas();
  const next = list.map((p) => (p.id === id ? { ...p, estado: novoEstado } : p));
  writeUserPropostas(next);
}
