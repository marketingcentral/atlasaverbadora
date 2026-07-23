// External API — camada SERVIDOR.
// Tokens com audience="servidor" consomem /v1/external/servidor/*.
// Cada token representa UM servidor (partnerId). Escopos: servidor:read | servidor:write

import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../env.js";
import { apiTokenAuth } from "../../middleware/api-token.js";
import { Errors } from "../../_shared/errors.js";
import { calcCET, margemDisponivel, margemTotal } from "@atlas/domain";
import { SERVIDORES_BUSCA_MOCK, CONVENIOS_MOCK, type ServidorBuscaMock } from "../portal-banco/fixtures.js";
import { listContratos, comprometeMargem } from "../portal-banco/store.js";

const meta = (t: { environment: "production" | "sandbox"; partnerId: number }) => ({ ambiente: t.environment, servidor_id: t.partnerId });

/** Resolve o servidor que o token representa. Demo: índice partnerId-1, fallback [0]. */
function resolveServidor(partnerId: number): ServidorBuscaMock {
  return SERVIDORES_BUSCA_MOCK[partnerId - 1] ?? SERVIDORES_BUSCA_MOCK[0]!;
}

export const externalServidorRoutes = new Hono<{ Bindings: Env }>()
  .get("/v1/external/servidor/me", apiTokenAuth(["servidor:read"], "servidor"), (c) => {
    const t = c.get("apiToken");
    const s = resolveServidor(t.partnerId);
    return c.json({
      camada: "servidor", environment: t.environment, scopes: t.scopes,
      data: { matricula: s.matricula, nome: s.nome, cpf_masked: s.cpfMasked, vinculo: s.vinculo, situacao_funcional: s.situacaoFuncional },
    });
  })

  // Margem do próprio servidor
  .get("/v1/external/servidor/margem", apiTokenAuth(["servidor:read"], "servidor"), (c) => {
    const t = c.get("apiToken");
    const s = resolveServidor(t.partnerId);
    const comprometido = listContratos({ matricula: s.matricula })
      .filter((ct) => comprometeMargem(ct.situacao)) // bloqueia já na proposta em análise
      .reduce((acc, ct) => acc + ct.valorParcela, 0);
    const margens = (["EMPRESTIMO", "CARTAO_CONSIGNADO", "CARTAO_BENEFICIOS"] as const).map((tipo) => ({
      tipo,
      total: Math.round(margemTotal(s.salarioLiquido, tipo) * 100) / 100,
      disponivel: Math.round(margemDisponivel(s.salarioLiquido, tipo === "EMPRESTIMO" ? comprometido : 0, tipo) * 100) / 100,
    }));
    return c.json({ _meta: meta(t), data: { salario_liquido: s.salarioLiquido, comprometido: Math.round(comprometido * 100) / 100, margens } });
  })

  // Ofertas pré-aprovadas (marketplace) — vindas das TABELAS reais que os
  // bancos cadastraram (portal_banco_tabelas), filtradas pelos convenios da
  // prefeitura do servidor. Cliente pediu 22/07/2026: sem bancos ficticios.
  .get("/v1/external/servidor/ofertas", apiTokenAuth(["servidor:read"], "servidor"), async (c) => {
    const t = c.get("apiToken");
    const s = resolveServidor(t.partnerId);
    const disp = margemDisponivel(s.salarioLiquido, 0, "EMPRESTIMO");
    // Convenios validos pra esta matricula (mesma prefeitura do servidor).
    const conveniosDaPref = new Set(
      CONVENIOS_MOCK.filter((cv) => cv.id === s.idConvenio).map((cv) => cv.id),
    );
    const hoje = new Date().toISOString().slice(0, 10);
    const { listTabelas } = await import("../portal-banco/cadastros.js");
    const tabelas = (await listTabelas(c.env)).filter((tb) => {
      if (!tb.ativo) return false;
      if (tb.vigenciaInicio > hoje) return false;
      if (tb.vigenciaFim && tb.vigenciaFim < hoje) return false;
      return conveniosDaPref.has(tb.convenioId);
    });
    const ofertas = tabelas.map((tb) => {
      const tAny = tb as unknown as { taxaAm?: number; taxaMaxAm?: number };
      const taxa = tAny.taxaAm ?? tAny.taxaMaxAm ?? 0;
      const [, banco = ""] = tb.convenio.split("/").map((p) => p.trim());
      const parcela = disp * 0.9;
      const valorAprox = taxa > 0
        ? (parcela * (1 - Math.pow(1 + taxa, -tb.prazoMaxMeses))) / taxa
        : 0;
      return {
        id: tb.id,
        banco: banco || tb.convenio,
        taxa_am: taxa,
        parcelas_max: tb.prazoMaxMeses,
        parcela_max_estimada: Math.round(parcela * 100) / 100,
        valor_aprovado_estimado: Math.round(valorAprox * 100) / 100,
      };
    });
    return c.json({ _meta: meta(t), data: ofertas });
  })

  // Simular crédito
  .post("/v1/external/servidor/propostas/simular", apiTokenAuth(["servidor:write"], "servidor"), async (c) => {
    const t = c.get("apiToken");
    const s = resolveServidor(t.partnerId);
    const body = z.object({
      valor: z.number().positive(),
      parcelas: z.number().int().positive(),
      taxa_am: z.number().positive().default(0.0179),
    }).parse(await c.req.json());
    const comprometido = listContratos({ matricula: s.matricula })
      .filter((ct) => comprometeMargem(ct.situacao)) // bloqueia já na proposta em análise
      .reduce((acc, ct) => acc + ct.valorParcela, 0);
    const disponivel = margemDisponivel(s.salarioLiquido, comprometido, "EMPRESTIMO");
    const cet = calcCET({ valor: body.valor, parcelas: body.parcelas, taxaMensal: body.taxa_am });
    const cabe = cet.parcela <= disponivel;
    return c.json({
      _meta: meta(t),
      data: {
        valor: body.valor, parcelas: body.parcelas, taxa_am: body.taxa_am,
        parcela: cet.parcela, cet_am: cet.mensal, cet_aa: cet.anual, total_pago: cet.totalPago, iof: cet.iof,
        margem_disponivel: Math.round(disponivel * 100) / 100,
        cabe_na_margem: cabe,
      },
    });
  })

  // Propostas (histórico) — derivado dos contratos do servidor
  .get("/v1/external/servidor/propostas", apiTokenAuth(["servidor:read"], "servidor"), (c) => {
    const t = c.get("apiToken");
    const s = resolveServidor(t.partnerId);
    const data = listContratos({ matricula: s.matricula }).map((ct) => ({
      adf: ct.adf, banco_id: ct.bancoId, situacao: ct.situacao, tipo: ct.tipoContrato,
      valor_parcela: ct.valorParcela, total_parcelas: ct.totalParcelas, data: ct.lancamento,
    }));
    return c.json({ _meta: meta(t), data });
  })

  // Contratos ativos/quitados
  .get("/v1/external/servidor/contratos", apiTokenAuth(["servidor:read"], "servidor"), (c) => {
    const t = c.get("apiToken");
    const s = resolveServidor(t.partnerId);
    const convenio = (id: string) => CONVENIOS_MOCK.find((cv) => cv.id === id)?.nome ?? id;
    const data = listContratos({ matricula: s.matricula }).map((ct) => ({
      adf: ct.adf, convenio: convenio(ct.convenioId), situacao: ct.situacao,
      valor_parcela: ct.valorParcela, parcelas_pagas: ct.parcelasPagas, total_parcelas: ct.totalParcelas,
      saldo_devedor: ct.saldoDevedor,
    }));
    return c.json({ _meta: meta(t), data });
  });
