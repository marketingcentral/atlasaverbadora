export interface CETInput {
  valor: number;
  parcelas: number;
  taxaMensal: number;
  iof?: number;
  tarifas?: number;
}

export interface CETResult {
  mensal: number;
  anual: number;
  parcela: number;
  valorLiquido: number;
  iof: number;
  totalPago: number;
}

/**
 * Computes CET via Newton-Raphson IRR solver.
 * @see specs/domain/regras-negocio.md
 */
export function calcCET({ valor, parcelas, taxaMensal, iof: iofIn, tarifas = 0 }: CETInput): CETResult {
  const iof = iofIn ?? calcIOF(valor, parcelas);
  const valorLiquido = valor - iof - tarifas;
  if (valorLiquido <= 0) throw new Error("valor_liquido_invalido");

  const parcela = (valor * taxaMensal) / (1 - Math.pow(1 + taxaMensal, -parcelas));

  let i = taxaMensal * 1.1;
  for (let iter = 0; iter < 100; iter++) {
    let f = -valorLiquido;
    let df = 0;
    for (let k = 1; k <= parcelas; k++) {
      const den = Math.pow(1 + i, k);
      f += parcela / den;
      df -= (k * parcela) / (den * (1 + i));
    }
    const next = i - f / df;
    if (Math.abs(next - i) < 1e-9) {
      i = next;
      break;
    }
    i = next;
  }

  return {
    mensal: i,
    anual: Math.pow(1 + i, 12) - 1,
    parcela,
    valorLiquido,
    iof,
    totalPago: parcela * parcelas,
  };
}

export function calcIOF(valor: number, parcelas: number): number {
  const prazoDias = Math.min(parcelas * 30, 365);
  return valor * 0.0038 + valor * 0.000082 * prazoDias;
}

export function calcPMT(valor: number, parcelas: number, taxaMensal: number): number {
  return (valor * taxaMensal) / (1 - Math.pow(1 + taxaMensal, -parcelas));
}
