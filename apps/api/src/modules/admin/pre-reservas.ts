// Types de pre-reserva usados pela averbadora (admin/index.ts). O storage
// FISICO nao mora mais aqui — pre-reservas sao DERIVADAS de _contratos
// (portal-banco/store.ts) via contratoToPreReserva em admin/index.ts, e o
// bate-carteira busca as confirmadas via listContratos + filtro por
// situacaoContaComoAverbado (admin/bate-carteira.ts).
//
// O arquivo antigo tinha:
//   - _preReservas: PreReserva[] = [] (array nunca populado; seeds ja
//     removidos em 16/07/2026 a pedido do cliente)
//   - listPreReservas / getPreReserva / cancelPreReserva / sweepExpired /
//     summarizePreReservas / countExpiringNext24h — todas operavam no
//     array vazio; unico consumidor externo (bate-carteira) foi migrado
//     em C5 (commit cb48606).
// Removido pra evitar reintroducao acidental de fonte-dupla no fluxo.

export type PreReservaStatus = "ativa" | "confirmada" | "expirada" | "cancelada";
export type OperacaoTipo = "EMPRESTIMO" | "REFIN" | "PORTABILIDADE" | "COMPOSTA";

export interface PreReserva {
  id: string;
  idUnico: string;
  bancoId: number;
  bancoNome: string;
  prefeituraId: number;
  prefeituraNome: string;
  convenioId: string;
  convenioNome: string;
  servidorCpfMasked: string;
  servidorNome: string;
  matricula: string;
  tipoOperacao: OperacaoTipo;
  /** Total margin locked (R$). */
  valorMargem: number;
  valorParcela: number;
  parcelas: number;
  criadoEm: string;
  /** Auto-computed at creation based on convenio config + portabilidade flag. */
  expiraEm: string;
  status: PreReservaStatus;
  /** Set when status transitions to anything other than "ativa". */
  finalizadoEm?: string;
  finalizadoPor?: string;
  motivoFinalizacao?: string;
}

export interface PreReservaSummary {
  ativas: number;
  expirandoEm24h: number;
  confirmadasHoje: number;
  expiradasHoje: number;
  margemTotalTravada: number;
}
