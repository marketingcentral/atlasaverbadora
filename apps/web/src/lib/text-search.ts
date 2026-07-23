/**
 * Busca "LIKE PHP" para tabelas do sistema. Fonte unica pra que a experiencia
 * seja consistente em todas as telas com filtro de busca (servidores,
 * contratos, ADFs, usuarios, propostas etc).
 *
 * Regras:
 * - Case-insensitive e sem acento (Joao acha João).
 * - Multi-termo AND: split por espaco, todos os termos precisam bater.
 * - Extrai automaticamente TODOS os campos string/numero do objeto — mais
 *   qualquer valor dentro de sub-objetos e arrays de 1 nivel (ex.: contratos
 *   dentro de servidor). Nao precisa manter lista manual de campos por tela.
 * - Se um termo e' so digitos, tambem casa contra a versao SEM PONTUACAO
 *   dos valores (`580.886.363-53` acha com `58088636353`, `58088`, etc).
 *
 * Uso:
 *   const filtered = lista.filter((row) => matchAny(row, query));
 */

function stripAccents(s: string): string {
  return (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Extrai todos os valores textuais/numericos do objeto (recursa 1 nivel). */
function extrairValores(obj: unknown, depth = 0): string[] {
  if (obj == null) return [];
  if (typeof obj === "string") return [obj];
  if (typeof obj === "number" || typeof obj === "bigint") return [String(obj)];
  if (typeof obj === "boolean") return [];
  if (Array.isArray(obj)) {
    if (depth > 1) return [];
    return obj.flatMap((v) => extrairValores(v, depth + 1));
  }
  if (typeof obj === "object") {
    if (depth > 1) return [];
    return Object.values(obj as Record<string, unknown>).flatMap((v) => extrairValores(v, depth + 1));
  }
  return [];
}

/** Retorna true se o objeto casa com a query (LIKE PHP). Query vazia -> true. */
export function matchAny(row: unknown, query: string): boolean {
  const q = stripAccents(String(query ?? "").trim().toLowerCase());
  if (!q) return true;
  const termos = q.split(/\s+/).filter(Boolean);

  const valores = extrairValores(row);
  const textoConcat = stripAccents(valores.join(" ").toLowerCase());
  // Versao so-digitos concatenada — usada quando termo e numerico. Cobre CPF
  // ("580.886.363-53" -> "58088636353"), matricula, telefone, etc.
  const digitos = textoConcat.replace(/\D/g, "");

  return termos.every((t) => {
    if (textoConcat.includes(t)) return true;
    if (/^\d+$/.test(t) && digitos.includes(t)) return true;
    return false;
  });
}
