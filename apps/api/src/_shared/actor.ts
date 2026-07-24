import type { JwtClaims } from "../middleware/auth.js";
import { Errors } from "./errors.js";

/**
 * Rotulo canonico do "ator" pra append no audit log, com transparencia de
 * impersonate. Se um admin da averbadora esta agindo em nome do servidor via
 * POST /v1/admin/impersonate/servidor/:matricula, o JWT carrega `impersonated_by`
 * — este helper vira "servidor:X (via averbadora:Y)" pra o log deixar claro
 * quem realmente disparou a mutacao.
 *
 * Sem impersonate (login normal), retorna o padrao "role:sub".
 */
export function actorFromJwt(j: JwtClaims): string {
  const base = `${j.role}:${j.sub}`;
  if (j.impersonated_by) {
    return `${base} (via ${j.impersonated_by.role}:${j.impersonated_by.sub})`;
  }
  return base;
}

/**
 * Guard de leitura-apenas para sessoes impersonadas. Averbadora que impersona
 * um servidor pode VER o painel dele (auditoria, suporte, debug), mas nao pode
 * praticar atos legais em nome dele: assinar termo, criar proposta, contratar
 * beneficio, solicitar cartao, aceitar portabilidade, mudar senha/contato.
 * Endpoints mutativos ligados ao "eu" do servidor devem chamar este helper.
 *
 * Regra: se `impersonated_by` estiver presente no JWT, lanca 403 com mensagem
 * clara pra o front (que ja deve estar bloqueando o botao) — defesa em
 * profundidade contra chamada direta na API.
 */
export function assertNotImpersonating(j: JwtClaims): void {
  if (j.impersonated_by) {
    throw Errors.forbidden(
      "Modo impersonate e' somente visualizacao. Para executar esta acao, o proprio servidor precisa estar logado.",
    );
  }
}
