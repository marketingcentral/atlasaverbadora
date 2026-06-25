import { z } from "zod";

export const BancoStatusSchema = z.enum(["ativo", "pausado", "inativo"]);
export type BancoStatus = z.infer<typeof BancoStatusSchema>;

export const BancoProdutoSchema = z.object({
  tipo: z.enum(["EMPRESTIMO", "REFIN", "PORTABILIDADE", "CARTAO_CONSIGNADO"]),
  taxa_min_am: z.number(),
  taxa_max_am: z.number(),
  prazo_min: z.number().int(),
  prazo_max: z.number().int(),
});
export type BancoProduto = z.infer<typeof BancoProdutoSchema>;

export const BancoSchema = z.object({
  id: z.number().int(),
  nome: z.string(),
  logo_url: z.string().url().nullable().optional(),
  status: BancoStatusSchema,
  produtos: z.array(BancoProdutoSchema),
});
export type Banco = z.infer<typeof BancoSchema>;
