/**
 * Busca "LIKE PHP" para tabelas do sistema. Fonte unica pra que a experiencia
 * seja consistente em todas as telas com filtro de busca (servidores,
 * contratos, ADFs, usuarios, propostas etc).
 *
 * Regras:
 * - Case-insensitive e sem acento (Joao acha João).
 * - Multi-termo AND: split por espaco, todos os termos precisam bater.
 * - Varre APENAS campos primitivos de PRIMEIRO NIVEL do objeto — NAO recursa
 *   em subojetos (camposCustom, contratos etc). Isso evita falso-positivo
 *   tipo "trabalhando" em camposCustom.saffdsgfefe fazer aparecer servidores
 *   cuja SituacaoFuncional NAO e' trabalhando. Se precisar buscar num campo
 *   aninhado, achatar antes ou passar `keys` explicitas via matchAnyKeys.
 * - Termo com ou sem pontuacao — CPF "375.342.333-00", telefone
 *   "(11) 99999-0000", matricula "852-029" casam contra versao so-digitos.
 *   Antes exigia digitos puros; cliente reportou 23/07/2026 (CPF com pontos
 *   nao achava).
 *
 * Uso:
 *   const filtered = lista.filter((row) => matchAny(row, query));
 */

function stripAccents(s: string): string {
  return (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Extrai valores primitivos SO do primeiro nivel — sem recursao. Booleanos e
 *  null sao ignorados. Objetos aninhados (camposCustom, contratos) tambem —
 *  se precisa buscar neles, use matchAnyKeys passando chaves explicitas. */
function extrairPrimitivos(obj: unknown): string[] {
  if (obj == null || typeof obj !== "object" || Array.isArray(obj)) return [];
  const out: string[] = [];
  for (const v of Object.values(obj as Record<string, unknown>)) {
    if (typeof v === "string") out.push(v);
    else if (typeof v === "number" || typeof v === "bigint") out.push(String(v));
  }
  return out;
}

function matchTermos(valores: string[], termos: string[]): boolean {
  const textoConcat = stripAccents(valores.join(" ").toLowerCase());
  const digitos = textoConcat.replace(/\D/g, "");
  return termos.every((t) => {
    if (textoConcat.includes(t)) return true;
    // Termo numerico digitado COM ou SEM mascara — CPF "375.342.333-00",
    // telefone "(11) 99999-0000", matricula "852-029". Tira a pontuacao e
    // compara contra a versao so-digitos.
    const tDigitos = t.replace(/\D/g, "");
    if (tDigitos && /^[\d.\-/()\s]+$/.test(t) && digitos.includes(tDigitos)) return true;
    return false;
  });
}

/** Retorna true se o objeto casa com a query (LIKE PHP). Query vazia -> true. */
export function matchAny(row: unknown, query: string): boolean {
  const q = stripAccents(String(query ?? "").trim().toLowerCase());
  if (!q) return true;
  const termos = q.split(/\s+/).filter(Boolean);
  return matchTermos(extrairPrimitivos(row), termos);
}

/** Versao restrita: casa apenas nos campos informados. Usar quando o objeto
 *  tem campos textuais grandes (endereco, observacoes) que geram falso-positivo
 *  por substring. */
export function matchAnyKeys<T extends Record<string, unknown>>(row: T, query: string, keys: (keyof T)[]): boolean {
  const q = stripAccents(String(query ?? "").trim().toLowerCase());
  if (!q) return true;
  const termos = q.split(/\s+/).filter(Boolean);
  const valores: string[] = [];
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string") valores.push(v);
    else if (typeof v === "number" || typeof v === "bigint") valores.push(String(v));
  }
  return matchTermos(valores, termos);
}
