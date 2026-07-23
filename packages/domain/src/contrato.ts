/**
 * Helpers puros de contrato — regra de negocio que ate 2026-07-23 morava em
 * apps/api/src/modules/portal-banco/store.ts. Movida pra @atlas/domain para:
 *  1) Ficar coberta por unit test (rodava so no runtime do wrangler antes).
 *  2) Poder ser reusada pela UI web sem duplicar a logica em TypeScript
 *     (produto-label.ts do web ja espelhava manualmente).
 *
 * O store.ts do backend re-exporta esses simbolos — nenhum import interno
 * precisa mudar. Se voce introduzir novo estado de contrato ou novo produto,
 * atualize aqui + adicione teste em contrato.test.ts.
 */

import type { TipoMargem } from "@atlas/types";

export type Situacao =
  | "Aguardando Confirmação do Deferimento"
  | "Aprovado"
  | "Ativo"
  | "Averbado"
  | "Suspenso"
  | "Formalizado"
  | "Quitado"
  | "Cancelado"
  | "Recusado"
  | "Reprovado"
  | "Rejeitado"
  | "Negado"
  | "Estornado"
  | "Expirado"
  | "Falha em folha"
  | "Em cobrança direta"
  | (string & {}); // aceita string aberta pra retrocompat

/**
 * Contrato "comprometido" — margem esta travada (aguardando, aprovado, ativo,
 * averbado, suspenso, formalizado). NAO comprometem: expirado, cancelado,
 * quitado, recusado, reprovado, rejeitado, negado, estornado, falha em folha,
 * em cobranca direta.
 */
export function comprometeMargem(situacao: Situacao): boolean {
  const s = situacao.toLowerCase();
  if (s === "expirado" || s === "cancelado" || s === "quitado") return false;
  if (s.includes("recus") || s.includes("reprov") || s.includes("rejeit") || s.includes("negad") || s.includes("estorn")) return false;
  if (s.includes("falha em folha")) return false;
  if (s.includes("cobran")) return false;
  return true;
}

/**
 * Estados que contam pra KPI de "averbados" (volume/ticket medio/conversao):
 * Ativo, Averbado, Quitado (foi averbado um dia). NAO inclui Aprovado sem
 * ADF, Falha em folha, Em cobranca direta.
 */
export function situacaoContaComoAverbado(situacao: Situacao): boolean {
  const s = situacao.toLowerCase();
  return s.includes("ativo") || s.includes("averb") || s.includes("quitad");
}

/**
 * Contrato terminal (nao muda mais de estado por fluxo natural): cancelado,
 * recusado, rejeitado, reprovado, negado, estornado, expirado, quitado.
 * Usado pra excluir do denominador de "conversao" e do somatorio de
 * "valor financiado" nos KPIs.
 */
export function situacaoTerminal(situacao: Situacao): boolean {
  const s = situacao.toLowerCase();
  if (s === "expirado" || s === "cancelado" || s === "quitado") return true;
  if (s.includes("recus") || s.includes("reprov") || s.includes("rejeit") || s.includes("negad") || s.includes("estorn")) return true;
  return false;
}

/**
 * Deriva bucket de margem a partir do contrato — usa tipoMargem explicito
 * quando disponivel; senao infere via tipoContrato (ECONSIGNADO ->
 * CARTAO_CONSIGNADO, restante -> EMPRESTIMO). CARTAO_BENEFICIOS so vem
 * pelo tipoMargem — nao ha inferencia por tipoContrato.
 */
export function deriveTipoMargem(ct: { tipoMargem?: TipoMargem; tipoContrato?: string }): TipoMargem {
  if (ct.tipoMargem) return ct.tipoMargem;
  return ct.tipoContrato === "ECONSIGNADO" ? "CARTAO_CONSIGNADO" : "EMPRESTIMO";
}

/**
 * Deriva o rotulo do PRODUTO originalmente proposto. Ordem de precedencia:
 *   1. observacoes contem "telemedicina"        -> TELEMEDICINA.
 *   2. observacoes contem "refinancia"          -> REFIN (explicito).
 *   3. bancoOrigem OU observacoes "portabilid"  -> PORTABILIDADE.
 *   4. tipoContrato === "REFIN"                 -> PORTABILIDADE (default).
 *   5. tipoMargem === CARTAO_BENEFICIOS         -> CARTAO_BENEFICIO.
 *   6. tipoContrato === ECONSIGNADO OU
 *      tipoMargem === CARTAO_CONSIGNADO         -> CARTAO_CONSIGNADO.
 *   7. default                                  -> EMPRESTIMO.
 *
 * REFIN "puro" (renegociacao no mesmo banco) so aparece quando observacoes
 * disser explicitamente "refinancia" — a UI do servidor sempre trata REFIN
 * cru como portabilidade.
 */
export type ProdutoLabel =
  | "TELEMEDICINA"
  | "REFIN"
  | "PORTABILIDADE"
  | "CARTAO_BENEFICIO"
  | "CARTAO_CONSIGNADO"
  | "EMPRESTIMO";

export function deriveProdutoLabel(ct: {
  tipoContrato?: string;
  tipoMargem?: TipoMargem;
  observacoes?: string;
  bancoOrigem?: string;
}): ProdutoLabel {
  const obs = (ct.observacoes ?? "").toLowerCase();
  if (/telemedic/.test(obs)) return "TELEMEDICINA";
  if (/refinancia/.test(obs)) return "REFIN";
  if (ct.bancoOrigem || /portabilid/.test(obs)) return "PORTABILIDADE";
  if (ct.tipoContrato === "REFIN") return "PORTABILIDADE";
  if (ct.tipoMargem === "CARTAO_BENEFICIOS") return "CARTAO_BENEFICIO";
  if (ct.tipoContrato === "ECONSIGNADO" || ct.tipoMargem === "CARTAO_CONSIGNADO") return "CARTAO_CONSIGNADO";
  return "EMPRESTIMO";
}

/**
 * Detecta contrato de telemedicina (produto Atlas, nao do banco parceiro).
 * Marca via tipoContrato="TELEMEDICINA" ou observacoes contendo "telemedicina".
 */
export function isContratoTelemedicina(ct: { tipoContrato?: string; observacoes?: string }): boolean {
  if ((ct.tipoContrato ?? "").toUpperCase() === "TELEMEDICINA") return true;
  return /telemedicina/i.test(ct.observacoes ?? "");
}

/**
 * Nome de exibicao do banco: "Telemedicina Atlas" quando telemedicina, senao
 * delega ao resolver do banco parceiro. Usar em TODOS os endpoints que
 * retornam bancoNome pra manter consistencia entre perfis (averbadora,
 * servidor, prefeitura). O portal do banco pode usar o nome real (ver o
 * proprio banco na carteira dele).
 */
export function nomeExibicaoBanco(
  ct: { bancoId: number; tipoContrato?: string; observacoes?: string },
  bancoNomeResolver: (id: number) => string,
): string {
  if (isContratoTelemedicina(ct)) return "Telemedicina Atlas";
  return bancoNomeResolver(ct.bancoId);
}
