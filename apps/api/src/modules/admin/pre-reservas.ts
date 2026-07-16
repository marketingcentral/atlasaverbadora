// Pre-reservation queue — proposals with locked margin awaiting confirmation/expiration.
// On expiration the lock reverts and the margin returns to "disponivel".

import { issueIdUnico, previewIdUnico } from "./id-unico.js";
import { resolveLockHours } from "./convenios-config.js";

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

const _preReservas: PreReserva[] = [];

interface SeedInput {
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
  valorMargem: number;
  valorParcela: number;
  parcelas: number;
  hoursOffset: number; // negative = past, positive = future expiration shift
}

function seed(input: SeedInput): PreReserva {
  const now = new Date();
  const created = new Date(now.getTime() + input.hoursOffset * 3600_000);
  const lockHours = resolveLockHours(input.convenioId, input.tipoOperacao === "PORTABILIDADE");
  const expires = new Date(created.getTime() + lockHours * 3600_000);
  const isExpired = expires.getTime() < now.getTime();
  const idUnico = isExpired ? previewIdUnico(input.prefeituraId, created) : issueIdUnico(input.prefeituraId, created);
  return {
    id: `PR-${created.getTime().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000).toString(36).toUpperCase()}`,
    idUnico,
    bancoId: input.bancoId,
    bancoNome: input.bancoNome,
    prefeituraId: input.prefeituraId,
    prefeituraNome: input.prefeituraNome,
    convenioId: input.convenioId,
    convenioNome: input.convenioNome,
    servidorCpfMasked: input.servidorCpfMasked,
    servidorNome: input.servidorNome,
    matricula: input.matricula,
    tipoOperacao: input.tipoOperacao,
    valorMargem: input.valorMargem,
    valorParcela: input.valorParcela,
    parcelas: input.parcelas,
    criadoEm: created.toISOString(),
    expiraEm: expires.toISOString(),
    status: isExpired ? "expirada" : "ativa",
    finalizadoEm: isExpired ? expires.toISOString() : undefined,
    motivoFinalizacao: isExpired ? "TTL atingido (seed)" : undefined,
  };
}

// Cliente pediu remocao dos seeds hardcoded de pre-reservas (16/07/2026) pra
// teste real do zero — antes tinha 4 sample entries (Ana/Joao/Maria/Carlos)
// referenciando prefeituras 1/2/3 e bancos 1/2/3 ja removidos. Alem de serem
// orfas, elas quebravam o startup do isolate ao chamar issueIdUnico com
// configs vazias (id_unico_config_missing). Se restaurar pra demo, reverter.

export function listPreReservas(filter: {
  status?: PreReservaStatus;
  prefeituraId?: number;
  bancoId?: number;
} = {}): PreReserva[] {
  return _preReservas.filter((r) => {
    if (filter.status && r.status !== filter.status) return false;
    if (filter.prefeituraId && r.prefeituraId !== filter.prefeituraId) return false;
    if (filter.bancoId && r.bancoId !== filter.bancoId) return false;
    return true;
  });
}

export function getPreReserva(id: string): PreReserva | undefined {
  return _preReservas.find((r) => r.id === id);
}

/**
 * Sweep "ativa" reservations whose expiration has passed and mark them as "expirada".
 * Returns the list of newly expired entries. Called by the GET handler and any cron job.
 */
export function sweepExpired(now: Date = new Date()): PreReserva[] {
  const expired: PreReserva[] = [];
  const ts = now.getTime();
  for (const r of _preReservas) {
    if (r.status !== "ativa") continue;
    if (new Date(r.expiraEm).getTime() <= ts) {
      r.status = "expirada";
      r.finalizadoEm = now.toISOString();
      r.motivoFinalizacao = "TTL atingido — margem liberada automaticamente";
      expired.push(r);
    }
  }
  return expired;
}

/** Counts a 24h-window of "ativa" reservations expiring within the next 24h. */
export function countExpiringNext24h(now: Date = new Date()): number {
  const limit = now.getTime() + 24 * 3600_000;
  return _preReservas.filter((r) => r.status === "ativa" && new Date(r.expiraEm).getTime() <= limit).length;
}

export interface PreReservaSummary {
  ativas: number;
  expirandoEm24h: number;
  confirmadasHoje: number;
  expiradasHoje: number;
  margemTotalTravada: number;
}

export function summarizePreReservas(now: Date = new Date()): PreReservaSummary {
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime();
  let ativas = 0;
  let expirandoEm24h = 0;
  let confirmadasHoje = 0;
  let expiradasHoje = 0;
  let margemTotalTravada = 0;
  const next24 = now.getTime() + 24 * 3600_000;
  for (const r of _preReservas) {
    if (r.status === "ativa") {
      ativas++;
      margemTotalTravada += r.valorMargem;
      if (new Date(r.expiraEm).getTime() <= next24) expirandoEm24h++;
    } else if (r.status === "confirmada" && r.finalizadoEm && new Date(r.finalizadoEm).getTime() >= todayStart) {
      confirmadasHoje++;
    } else if (r.status === "expirada" && r.finalizadoEm && new Date(r.finalizadoEm).getTime() >= todayStart) {
      expiradasHoje++;
    }
  }
  return { ativas, expirandoEm24h, confirmadasHoje, expiradasHoje, margemTotalTravada };
}

/**
 * Manually cancel a pre-reservation (admin override). Returns updated record or undefined.
 */
export function cancelPreReserva(id: string, finalizadoPor: string, motivo: string): PreReserva | undefined {
  const r = getPreReserva(id);
  if (!r) return undefined;
  if (r.status !== "ativa") return r; // idempotent
  r.status = "cancelada";
  r.finalizadoEm = new Date().toISOString();
  r.finalizadoPor = finalizadoPor;
  r.motivoFinalizacao = motivo;
  return r;
}
