// Domain calculations: CET, IOF, margem.

export interface CETInput {
  valor: number;          // gross loan amount
  parcelas: number;
  taxaMensal: number;     // e.g. 0.0179
  iof?: number;           // currency
  tarifas?: number;       // currency
}

export interface CETResult {
  mensal: number;
  anual: number;
  parcela: number;
  valorLiquido: number;
  iof: number;
}

/**
 * CET = IRR that makes PV of installments equal to net released amount.
 * Solved with Newton-Raphson.
 */
export function calcCET(input: CETInput): CETResult {
  const { valor, parcelas, taxaMensal, iof: iofIn, tarifas = 0 } = input;
  const iof = iofIn ?? defaultIOF(valor, parcelas);
  const valorLiquido = valor - iof - tarifas;
  if (valorLiquido <= 0) throw new Error("valor_liquido_invalido");

  // PMT — fixed installment formula
  const parcela = (valor * taxaMensal) / (1 - Math.pow(1 + taxaMensal, -parcelas));

  // f(i) = sum P/(1+i)^k - VL ; f'(i) = -sum k*P/(1+i)^(k+1)
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
  };
}

function defaultIOF(valor: number, parcelas: number): number {
  const prazoDias = Math.min(parcelas * 30, 365);
  return valor * 0.0038 + valor * 0.000082 * prazoDias;
}

export type TipoMargem = "EMPRESTIMO" | "CARTAO_CONSIGNADO" | "CARTAO_BENEFICIOS";

const LIMITES_MARGEM: Record<TipoMargem, number> = {
  EMPRESTIMO: 0.35,
  CARTAO_CONSIGNADO: 0.05,
  CARTAO_BENEFICIOS: 0.05,
};

export function calcMargemDisponivel(salarioLiquido: number, comprometido: number, tipo: TipoMargem): number {
  const limite = LIMITES_MARGEM[tipo];
  return Math.max(0, salarioLiquido * limite - comprometido);
}

export interface ValidacaoPropostaInput {
  dataNascimento: string; // YYYY-MM-DD
  parcelas: number;
  valor: number;
  taxaMensal: number;
  salarioLiquido: number;
  margemDisponivel: number;
  permiteSolicitarEmprestimo: boolean;
  situacaoFuncional: string;
}

export interface ValidacaoPropostaResult {
  valida: boolean;
  motivos: string[];
}

export function validateProposta(input: ValidacaoPropostaInput): ValidacaoPropostaResult {
  const motivos: string[] = [];

  if (!input.permiteSolicitarEmprestimo) motivos.push("matricula_nao_permite_emprestimo");
  if (!["ATIVO", "LICENCA_REMUNERADA"].includes(input.situacaoFuncional)) motivos.push(`situacao_funcional_invalida:${input.situacaoFuncional}`);
  if (input.salarioLiquido < 1200) motivos.push("salario_liquido_abaixo_minimo");

  const idade = calcIdade(input.dataNascimento);
  const idadeFim = idade + Math.ceil((input.parcelas + 1) / 12);
  if (idadeFim > 79) motivos.push(`idade_no_termino_excede_limite:${idadeFim}`);

  const cet = calcCET({ valor: input.valor, parcelas: input.parcelas, taxaMensal: input.taxaMensal });
  if (cet.parcela > input.margemDisponivel) motivos.push("parcela_excede_margem_disponivel");

  return { valida: motivos.length === 0, motivos };
}

function calcIdade(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split("-").map(Number) as [number, number, number];
  const today = new Date();
  let age = today.getFullYear() - y;
  const mm = today.getMonth() + 1 - m;
  if (mm < 0 || (mm === 0 && today.getDate() < d)) age--;
  return age;
}
