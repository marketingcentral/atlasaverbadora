/**
 * Helpers de formatação BR usados nos campos de entrada.
 * Todos aceitam string bruta (com ou sem pontuação) e devolvem string
 * formatada progressivamente — enquanto o usuário digita, o campo já
 * mostra a máscara correta.
 *
 * Guardar SEMPRE só os dígitos no state final quando persistir; a máscara
 * é só apresentação. Ex.: `<CpfField value={cpf} onChange={(raw) => setCpf(raw)} />`
 * onChange devolve string mascarada — extraia com `.replace(/\D/g, "")`
 * quando for salvar.
 */

/** CPF: 000.000.000-00 (11 dígitos). */
export function formatCpf(raw: string): string {
  const d = String(raw ?? "").replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** CNPJ: 00.000.000/0000-00 (14 dígitos). */
export function formatCnpj(raw: string): string {
  const d = String(raw ?? "").replace(/\D/g, "").slice(0, 14);
  if (d.length === 0) return "";
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Telefone BR: (00) 0000-0000 (fixo) ou (00) 00000-0000 (celular). */
export function formatTelefone(raw: string): string {
  const d = String(raw ?? "").replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** CEP: 00000-000 (8 dígitos). */
export function formatCep(raw: string): string {
  const d = String(raw ?? "").replace(/\D/g, "").slice(0, 8);
  if (d.length === 0) return "";
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** Remove tudo que nao for digito (util pra persistir CPF/CNPJ/tel/cep sem mascara). */
export function onlyDigits(s: string | null | undefined): string {
  return String(s ?? "").replace(/\D/g, "");
}
