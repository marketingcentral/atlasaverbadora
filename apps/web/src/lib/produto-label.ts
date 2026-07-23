/**
 * Rotulo canonico de PRODUTO — usar em TODAS as telas web que mostram
 * "que produto foi contratado" (empréstimo, portabilidade, cartão, etc).
 *
 * O backend (portal-banco/store.ts:deriveProdutoLabel) ja retorna a chave
 * normalizada: TELEMEDICINA | REFIN | PORTABILIDADE | CARTAO_BENEFICIO |
 * CARTAO_CONSIGNADO | EMPRESTIMO — este helper so traduz pra PT-BR.
 *
 * Antes existiam ao menos 4 implementacoes locais espalhadas:
 * - servidor/contratos.tsx:mapProduto/produtoContratoLabel
 * - banco/lib/banco-propostas.ts:PRODUTO_LABEL (usa chaves emprestimo/
 *   cartao/portabilidade — mantido pois faz parte do fluxo BancoProduto)
 * - averbadora/contratos.tsx:produtoLabel (parcial — nao cobria telemedicina)
 * - averbadora/adf.tsx:produtoLabel (versao completa)
 *
 * Consolidacao: novos consumidores devem usar produtoLabelDe/produtoLabelDeContrato.
 * O PRODUTO_LABEL do banco continua vivo pra retrocompat do enum BancoProduto.
 */

export type ProdutoChave =
  | "TELEMEDICINA"
  | "REFIN"
  | "PORTABILIDADE"
  | "CARTAO_BENEFICIO"
  | "CARTAO_CONSIGNADO"
  | "EMPRESTIMO";

const LABEL: Record<ProdutoChave, string> = {
  TELEMEDICINA: "Telemedicina",
  REFIN: "Refinanciamento",
  PORTABILIDADE: "Portabilidade",
  CARTAO_BENEFICIO: "Cartão Benefício",
  CARTAO_CONSIGNADO: "Cartão Consignado",
  EMPRESTIMO: "Empréstimo",
};

/** Traduz chave canonica (do backend) pra rotulo PT-BR. */
export function produtoLabelDe(chave: string | undefined | null): string {
  if (!chave) return "Empréstimo";
  const k = chave.toUpperCase() as ProdutoChave;
  return LABEL[k] ?? "Empréstimo";
}

/** Deriva a chave canonica a partir de tipoContrato+tipoMargem+observacoes+bancoOrigem.
 *  MESMA logica do backend deriveProdutoLabel (portal-banco/store.ts) — se
 *  o backend ja mandou tipoContrato pronto como uma das chaves canonicas,
 *  use direto; senao inferir aqui a partir dos sinais. */
export function deriveProdutoChave(ct: {
  tipoContrato?: string | null;
  tipoMargem?: string | null;
  observacoes?: string | null;
  bancoOrigem?: string | null;
}): ProdutoChave {
  const obs = (ct.observacoes ?? "").toLowerCase();
  if (/telemedic/.test(obs)) return "TELEMEDICINA";
  if (/refinancia/.test(obs)) return "REFIN";
  if (ct.bancoOrigem || /portabilid/.test(obs)) return "PORTABILIDADE";
  const tc = (ct.tipoContrato ?? "").toUpperCase();
  if (tc === "REFIN") return "PORTABILIDADE";
  if (tc === "TELEMEDICINA") return "TELEMEDICINA";
  if (tc === "PORTABILIDADE") return "PORTABILIDADE";
  if (ct.tipoMargem === "CARTAO_BENEFICIOS") return "CARTAO_BENEFICIO";
  if (tc === "ECONSIGNADO" || ct.tipoMargem === "CARTAO_CONSIGNADO") return "CARTAO_CONSIGNADO";
  return "EMPRESTIMO";
}

/** Atalho: contrato -> rotulo PT-BR direto. */
export function produtoLabelDeContrato(ct: {
  tipoContrato?: string | null;
  tipoMargem?: string | null;
  observacoes?: string | null;
  bancoOrigem?: string | null;
}): string {
  return produtoLabelDe(deriveProdutoChave(ct));
}
