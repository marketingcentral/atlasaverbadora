import { z } from "zod";

/**
 * Formato canonico de matricula na plataforma.
 *
 * Contexto: prefeituras usam formatos diferentes na vida real (Palhoca usa
 * digitos "852029100", exemplo do spec era "M-009821", Florianopolis pode
 * usar "PAL-2024-001"). Nao podemos impor UM formato porque quebrariamos
 * integracoes reais. Mas tambem nao podemos aceitar QUALQUER string senao
 * viram registros duplicados por caso/espaco/acento ("m-9001" vs "M-9001"
 * vs "M 9001").
 *
 * Politica: aceitar alfanumerico + hifen, normalizado pra uppercase, sem
 * espaco/pontuacao/acento. Tamanho 1..30 (cobre desde 3 digitos ate
 * "AAA-YYYY-NNNNN"). Documentado em specs/domain/glossario.md.
 */
export const MATRICULA_REGEX = /^[A-Z0-9][A-Z0-9-]{0,29}$/;

/** Normaliza a matricula pro formato canonico: trim, uppercase, remove
 *  espacos internos. Nao rejeita nada — a validacao vem depois (`MatriculaSchema`). */
export function normalizeMatricula(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Schema Zod: normaliza no boundary + valida o formato. Uso:
 *   z.object({ matricula: MatriculaSchema, ... }) */
export const MatriculaSchema = z
  .string()
  .transform(normalizeMatricula)
  .refine((m) => MATRICULA_REGEX.test(m), {
    message: "Matricula invalida: use alfanumerico + hifen (ex: 852029100, M-009821, PAL-2024-001), 1..30 chars, sem espaco/acento.",
  });
