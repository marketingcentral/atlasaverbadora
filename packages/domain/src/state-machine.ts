// Canonical state machines for Atlas entities.
// Mirrors mcp-servers/atlas-domain/src/state-machines.ts and specs/domain/state-machines.md.

export type EntityKind = "proposta" | "contrato" | "portabilidade" | "reserva";

interface Transition {
  event: string;
  from: string;
  to: string;
}

const PROPOSTA: Transition[] = [
  { event: "simular", from: "_start", to: "simulada" },
  { event: "aceitar_simulacao", from: "simulada", to: "criada" },
  { event: "enviar_banco", from: "criada", to: "em_analise" },
  { event: "banco_aprova", from: "em_analise", to: "aprovada" },
  { event: "banco_rejeita", from: "em_analise", to: "rejeitada" },
  { event: "confirmar", from: "aprovada", to: "contratada" },
  { event: "cancelar", from: "aprovada", to: "cancelada" },
  { event: "cancelar", from: "contratada", to: "cancelada" },
  { event: "prefeitura_averba", from: "contratada", to: "averbada" },
  { event: "primeira_parcela", from: "averbada", to: "ativa" },
  { event: "quitar", from: "ativa", to: "quitada" },
];

const CONTRATO: Transition[] = [
  { event: "criar", from: "_start", to: "pendente" },
  { event: "averbar", from: "pendente", to: "averbado" },
  { event: "primeira_parcela_paga", from: "averbado", to: "em_dia" },
  { event: "parcela_atrasada", from: "em_dia", to: "inadimplente" },
  { event: "regularizar", from: "inadimplente", to: "em_dia" },
  { event: "quitar", from: "em_dia", to: "quitado" },
  { event: "cancelar", from: "em_dia", to: "cancelado" },
  { event: "cancelar", from: "inadimplente", to: "cancelado" },
];

const PORTABILIDADE: Transition[] = [
  { event: "iniciar", from: "_start", to: "solicitada" },
  { event: "enviar_origem", from: "solicitada", to: "analise_origem" },
  { event: "saldo_recebido", from: "analise_origem", to: "analise_destino" },
  { event: "aprovar_destino", from: "analise_destino", to: "aprovada" },
  { event: "rejeitar_destino", from: "analise_destino", to: "falhada" },
  { event: "liquidar_origem", from: "aprovada", to: "executada" },
  { event: "averbar_destino", from: "executada", to: "concluida" },
];

const RESERVA: Transition[] = [
  { event: "reservar", from: "_start", to: "ativa" },
  { event: "confirmar", from: "ativa", to: "confirmada" },
  { event: "expirar", from: "ativa", to: "expirada" },
];

const MAP: Record<EntityKind, Transition[]> = {
  proposta: PROPOSTA,
  contrato: CONTRATO,
  portabilidade: PORTABILIDADE,
  reserva: RESERVA,
};

export function nextState(entity: EntityKind, current: string, event: string): string | null {
  const t = MAP[entity].find((x) => x.from === current && x.event === event);
  return t ? t.to : null;
}

export function allowedEvents(entity: EntityKind, current: string): string[] {
  return MAP[entity].filter((t) => t.from === current).map((t) => t.event);
}
