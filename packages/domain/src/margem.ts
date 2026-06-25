import type { TipoMargem } from "@atlas/types";

const LIMITES: Record<TipoMargem, number> = {
  EMPRESTIMO: 0.35,
  CARTAO_CONSIGNADO: 0.05,
  CARTAO_BENEFICIOS: 0.05,
};

export function limitePercentual(tipo: TipoMargem): number {
  return LIMITES[tipo];
}

export function margemDisponivel(salarioLiquido: number, comprometido: number, tipo: TipoMargem): number {
  return Math.max(0, salarioLiquido * LIMITES[tipo] - comprometido);
}

export function margemTotal(salarioLiquido: number, tipo: TipoMargem): number {
  return salarioLiquido * LIMITES[tipo];
}

export function percentualUso(salarioLiquido: number, comprometido: number, tipo: TipoMargem): number {
  const total = margemTotal(salarioLiquido, tipo);
  if (total === 0) return 0;
  return Math.min(1, comprometido / total);
}
