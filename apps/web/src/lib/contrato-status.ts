/**
 * Rotulo unificado de situacao de contrato — usar em TODAS as telas dos 4 perfis
 * (averbadora, banco, servidor, prefeitura) pra evitar divergencia de nome.
 *
 * Antes cada perfil tinha sua heuristica local (banco chamava "Ativo" de "Em dia",
 * servidor chamava "Averbado" de "Em dia", averbadora/prefeitura mostravam a
 * string crua do backend). O mesmo contrato aparecia com rotulos diferentes
 * dependendo da tela — cliente reportou 22/07/2026.
 *
 * Entrada: string crua do backend (portal-banco/store.ts:situacao). Aceita
 * variantes de capitalizacao ("Ativo" | "ativo").
 * Saida: { label, variant } — pronto pra <Pill variant={variant}>{label}</Pill>.
 */

export type SituacaoVariant =
  | "aceita" // verde suave — vivo/aprovado (positivo mas nao terminal-bom)
  | "averbado" // verde forte — averbado/em folha (terminal-bom pro contrato)
  | "pendente" // amarelo — em analise/aguardando
  | "rejeitada" // vermelho — cancelado/recusado/rejeitado
  | "expirado"; // cinza — expirado, cobranca direta, quitado

export interface SituacaoInfo {
  /** Rotulo canonico em PT-BR (o mesmo em todas as telas). */
  label: string;
  /** Variant do componente Pill do design system. */
  variant: SituacaoVariant;
}

/**
 * Mapeia a situacao crua do backend pro par (label, variant) unificado.
 * Alinhado com portal-banco/store.ts:situacao — se o backend adicionar novo
 * estado, adicione aqui e o rotulo aparece igual em todos os perfis.
 */
export function contratoStatusInfo(situacao: string | null | undefined): SituacaoInfo {
  const raw = String(situacao ?? "").trim();
  const s = raw.toLowerCase();
  if (!s) return { label: "—", variant: "pendente" };

  // Terminais negativos primeiro (senao "Recusado pelo banco" cai no fallback).
  if (s.includes("cancel")) return { label: "Cancelado", variant: "rejeitada" };
  if (s.includes("recus") || s.includes("reprov") || s.includes("rejeit") || s.includes("negad")) {
    return { label: "Recusado", variant: "rejeitada" };
  }
  if (s.includes("estorn")) return { label: "Estornado", variant: "rejeitada" };
  if (s.includes("expir")) return { label: "Expirado", variant: "expirado" };
  if (s.includes("quitad")) return { label: "Quitado", variant: "averbado" };

  // Falha em folha — averbadora tentou aplicar e prefeitura negou. Nao e
  // "cancelado" (banco ainda pode reenviar) mas tambem nao esta ativo.
  if (s.includes("falha")) return { label: "Falha em folha", variant: "rejeitada" };

  // Cobranca direta — pos-desligamento, banco cobra fora da folha.
  if (s.includes("cobran")) return { label: "Em cobrança direta", variant: "expirado" };

  // Ativo/Averbado sao estados diferentes no backend mas semanticamente iguais
  // pro usuario final (contrato em folha, tudo em dia). Rotulo unico "Em dia"
  // pra bater com o padrao do banco (CONTRATO_STATUS_LABEL.em_dia).
  if (s.includes("averb") || s === "ativo" || s.includes("ativo")) {
    return { label: "Em dia", variant: "averbado" };
  }

  // Aprovado pelo banco, ADF ainda nao emitida. Estado intermediario visivel.
  if (s.includes("aprov")) return { label: "Aprovado", variant: "aceita" };

  if (s.includes("suspens")) return { label: "Suspenso", variant: "pendente" };
  if (s.includes("formaliz")) return { label: "Formalizado", variant: "aceita" };

  // Aguardando confirmacao do deferimento — proposta aberta em analise.
  if (s.includes("aguard")) return { label: "Em análise", variant: "pendente" };

  // Fallback: mostra a string crua mas com variant neutro. Ajuda a detectar
  // estados novos que devem entrar no dicionario acima.
  return { label: raw, variant: "pendente" };
}

/** Atalho pra quem so precisa do label. */
export function contratoStatusLabel(situacao: string | null | undefined): string {
  return contratoStatusInfo(situacao).label;
}
