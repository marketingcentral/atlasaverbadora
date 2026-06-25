import { z } from "zod";

export const PropostaStatusSchema = z.enum([
  "simulada",
  "criada",
  "em_analise",
  "aprovada",
  "rejeitada",
  "contratada",
  "averbada",
  "ativa",
  "quitada",
  "cancelada",
]);
export type PropostaStatus = z.infer<typeof PropostaStatusSchema>;

export const SimulacaoRequestSchema = z.object({
  servidor_id: z.number().int().optional(),
  valor: z.number().min(500),
  parcelas: z.number().int().min(12).max(96),
  bancos: z.array(z.number().int()).optional(),
});
export type SimulacaoRequest = z.infer<typeof SimulacaoRequestSchema>;

export const OfertaSchema = z.object({
  id: z.string(),
  banco_id: z.number().int(),
  banco_nome: z.string(),
  valor_solicitado: z.number(),
  valor_liberado: z.number(),
  parcelas: z.number().int(),
  valor_parcela: z.number(),
  taxa_am: z.number(),
  cet_am: z.number(),
  cet_aa: z.number(),
  iof: z.number(),
  prazo_liberacao_dias: z.number().int(),
  ranking: z.number().int(),
  expira_em: z.string().datetime(),
});
export type Oferta = z.infer<typeof OfertaSchema>;

export const PropostaSchema = z.object({
  id: z.string(),
  servidor_id: z.number().int(),
  banco_id: z.number().int(),
  valor: z.number(),
  parcelas: z.number().int(),
  taxa_am: z.number(),
  cet_am: z.number(),
  status: PropostaStatusSchema,
  adf: z.string().nullable(),
  criada_em: z.string().datetime(),
  atualizada_em: z.string().datetime(),
});
export type Proposta = z.infer<typeof PropostaSchema>;

export const ContratoStatusSchema = z.enum([
  "pendente",
  "averbado",
  "em_dia",
  "inadimplente",
  "quitado",
  "cancelado",
]);
export type ContratoStatus = z.infer<typeof ContratoStatusSchema>;

export const ContratoSchema = z.object({
  id: z.string(),
  proposta_id: z.string(),
  banco_id: z.number().int(),
  valor_financiado: z.number(),
  valor_liquido: z.number(),
  parcela: z.number(),
  parcelas_total: z.number().int(),
  parcelas_pagas: z.number().int(),
  taxa_am: z.number(),
  cet_am: z.number(),
  saldo_devedor: z.number(),
  status: ContratoStatusSchema,
});
export type Contrato = z.infer<typeof ContratoSchema>;

export const PortabilidadeStatusSchema = z.enum([
  "solicitada",
  "analise_origem",
  "analise_destino",
  "aprovada",
  "executada",
  "concluida",
  "falhada",
]);
export type PortabilidadeStatus = z.infer<typeof PortabilidadeStatusSchema>;
