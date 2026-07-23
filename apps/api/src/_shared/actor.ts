import type { JwtClaims } from "../middleware/auth.js";

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
