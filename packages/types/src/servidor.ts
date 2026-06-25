import { z } from "zod";

export const SituacaoFuncionalSchema = z.enum([
  "ATIVO",
  "FERIAS",
  "AFASTADO",
  "LICENCA",
  "LICENCA_REMUNERADA",
  "APOSENTADO",
]);
export type SituacaoFuncional = z.infer<typeof SituacaoFuncionalSchema>;

export const VinculoSchema = z.enum(["CLT", "ESTATUTARIO", "COMISSIONADO"]);
export type Vinculo = z.infer<typeof VinculoSchema>;

export const ServidorStatusSchema = z.enum(["ativo", "bloqueado", "arquivado"]);
export type ServidorStatus = z.infer<typeof ServidorStatusSchema>;

export const ServidorSchema = z.object({
  id: z.number().int(),
  nome: z.string(),
  cpf_masked: z.string(),
  matricula: z.string(),
  prefeitura_id: z.number().int(),
  vinculo: VinculoSchema,
  situacao_funcional: SituacaoFuncionalSchema,
  status: ServidorStatusSchema,
});
export type Servidor = z.infer<typeof ServidorSchema>;

export const TipoMargemSchema = z.enum(["EMPRESTIMO", "CARTAO_CONSIGNADO", "CARTAO_BENEFICIOS"]);
export type TipoMargem = z.infer<typeof TipoMargemSchema>;

export const MargemSchema = z.object({
  salario_base: z.number(),
  comprometido: z.number(),
  disponivel: z.number(),
  percentual_uso: z.number(),
});
export type Margem = z.infer<typeof MargemSchema>;

export const MargemPorTipoSchema = z.object({
  tipo: TipoMargemSchema,
  disponivel: z.number(),
  total: z.number(),
});
export type MargemPorTipo = z.infer<typeof MargemPorTipoSchema>;

export const FonteSchema = z.object({
  tipo: z.string(),
  sincronizado_em: z.string().datetime(),
  cache_status: z.enum(["HIT", "MISS", "STALE"]),
});

export const MargemResponseSchema = z.object({
  servidor_id: z.number().int(),
  matricula: z.string(),
  prefeitura_id: z.number().int(),
  margem: MargemSchema,
  margens_por_tipo: z.array(MargemPorTipoSchema),
  fonte: FonteSchema,
  contratos: z.array(z.unknown()).optional(),
  _meta: z.object({ trace_id: z.string(), duracao_ms: z.number() }).optional(),
});
export type MargemResponse = z.infer<typeof MargemResponseSchema>;
