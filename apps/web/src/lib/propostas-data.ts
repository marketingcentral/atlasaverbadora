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

export const PROPOSTAS_INICIAIS: Proposta[] = [
  {
    id: "PRO-9821",
    banco: "SCred Financeira",
    estado: "aguardando_formalizacao",
    valor: 25000,
    parcelas: 48,
    parcela: 750,
    taxaAm: 1.65,
    criadaEm: "29/06/2026 14:22",
    expiraEm: "01/07/2026 14:22",
    linkFormalizacao: "https://scred.test/formalizar/PRO-9821",
    idMatricula: "MAT-852029100",
  },
  {
    id: "PRO-9805",
    banco: "Banco Y",
    estado: "em_analise",
    valor: 12000,
    parcelas: 36,
    parcela: 412.4,
    taxaAm: 1.72,
    criadaEm: "30/06/2026 09:10",
    expiraEm: "02/07/2026 09:10",
    idMatricula: "MAT-852029100",
  },
  {
    id: "PRO-9803",
    banco: "Pan Credito",
    estado: "aprovada",
    valor: 8000,
    parcelas: 24,
    parcela: 380.5,
    taxaAm: 1.88,
    criadaEm: "30/06/2026 11:00",
    expiraEm: "01/07/2026 11:00",
    linkFormalizacao: "https://pan.test/contrato/PRO-9803",
    idMatricula: "MAT-009821",
  },
  {
    id: "PRO-9742",
    banco: "Pan Credito",
    estado: "expirada",
    valor: 6000,
    parcelas: 24,
    parcela: 320.1,
    taxaAm: 1.99,
    criadaEm: "20/06/2026 16:00",
    idMatricula: "MAT-852029100",
  },
  {
    id: "PRO-9701",
    banco: "Banco Y",
    estado: "recusada",
    valor: 15000,
    parcelas: 60,
    parcela: 380,
    taxaAm: 1.72,
    criadaEm: "15/06/2026 10:30",
    motivoRecusa: "Comprometimento de renda acima do limite do convenio.",
    idMatricula: "MAT-009821",
  },
];

function fmtDateTime(iso: string): string {
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

/** Combina propostas iniciais + criadas pelo usuario, filtra pela matricula. */
export function getAllPropostasForMatricula(idMatricula: string | null): Proposta[] {
  const user = readUserPropostas().map((p) => ({
    ...p,
    criadaEm: fmtDateTime(p.criadaEm),
    expiraEm: p.expiraEm ? fmtDateTime(p.expiraEm) : undefined,
  }));
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
