import { z } from "zod";

export const PrefeituraSchema = z.object({
  id: z.number().int(),
  nome: z.string(),
  uf: z.string().length(2),
  municipio_ibge: z.number().int(),
  servidores_count: z.number().int(),
  modo_integracao: z.enum(["REST", "SOAP", "CSV", "MANUAL"]),
  ultima_sincronizacao: z.string().datetime().nullable(),
  status: z.enum(["ativo", "pausado"]),
});
export type Prefeitura = z.infer<typeof PrefeituraSchema>;
