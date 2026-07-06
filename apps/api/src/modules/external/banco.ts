// External API — camada BANCO.
// Tokens com audience="banco" consomem /v1/external/banco/*.
// Escopos: banco:read | banco:write | banco:webhooks

import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../env.js";
import { apiTokenAuth } from "../../middleware/api-token.js";
import { Errors } from "../../_shared/errors.js";
import { calcCET, margemDisponivel, margemTotal } from "@atlas/domain";
import { CONVENIOS_MOCK, SERVIDORES_BUSCA_MOCK } from "../portal-banco/fixtures.js";
import { aplicarAcao, criarContratoOuReserva, getContrato, getContratoParcelas, listContratos, comprometeMargem } from "../portal-banco/store.js";
import {
  WEBHOOK_EVENTS, createWebhook, listDeliveries, listWebhooks, deactivateWebhook, toggleWebhook, type WebhookEvent,
} from "../admin/webhooks.js";
import { qparam, norm, textIncludes, appliedFilters } from "./_filters.js";

const meta = (t: { environment: "production" | "sandbox"; partnerId: number }) => ({ ambiente: t.environment, banco_id: t.partnerId });

export const externalBancoRoutes = new Hono<{ Bindings: Env }>()
  .get("/v1/external/banco/me", apiTokenAuth(["banco:read"], "banco"), (c) => {
    const t = c.get("apiToken");
    return c.json({ camada: "banco", banco_id: t.partnerId, environment: t.environment, scopes: t.scopes });
  })

  // Convênios do banco
  // Filtros: ?uf, ?cidade (nome da prefeitura), ?q (nome/codigo de verba).
  .get("/v1/external/banco/convenios", apiTokenAuth(["banco:read"], "banco"), (c) => {
    const t = c.get("apiToken");
    const uf = qparam(c, "uf");
    const cidade = qparam(c, "cidade");
    const q = qparam(c, "q");
    const doBanco = CONVENIOS_MOCK.filter((cv) => cv.bancoId === t.partnerId);
    let rows = doBanco;
    if (uf) rows = rows.filter((cv) => norm(cv.uf) === norm(uf));
    if (cidade) rows = rows.filter((cv) => textIncludes(cv.prefeitura, cidade));
    if (q) rows = rows.filter((cv) => textIncludes(cv.nome, q) || textIncludes(cv.codigoVerba, q));
    const data = rows.map((cv) => ({
      id: cv.id, nome: cv.nome, prefeitura: cv.prefeitura, uf: cv.uf,
      codigo_verba: cv.codigoVerba, data_corte: cv.dataCorte, dia_repasse: cv.diaRepasse,
    }));
    return c.json({
      _meta: { ...meta(t), total: doBanco.length, retornados: data.length, filtros: appliedFilters({ uf, cidade, q }) },
      data,
    });
  })

  // Consultar margem de um colaborador (por CPF ou matrícula)
  .get("/v1/external/banco/margem", apiTokenAuth(["banco:read"], "banco"), (c) => {
    const t = c.get("apiToken");
    const cpf = c.req.query("cpf")?.replace(/\D/g, "");
    const matricula = c.req.query("matricula");
    if (!cpf && !matricula) throw Errors.validation({ query: "informe cpf ou matricula" });
    const s = SERVIDORES_BUSCA_MOCK.find((x) => (cpf && x.cpf === cpf) || (matricula && x.matricula === matricula));
    if (!s) throw Errors.notFound("colaborador");
    const comprometido = listContratos({ matricula: s.matricula })
      .filter((ct) => comprometeMargem(ct.situacao)) // só após aprovação do banco
      .reduce((acc, ct) => acc + ct.valorParcela, 0);
    const tipos = (["EMPRESTIMO", "CARTAO_CONSIGNADO", "CARTAO_BENEFICIOS"] as const).map((tipo) => ({
      tipo,
      total: Math.round(margemTotal(s.salarioLiquido, tipo) * 100) / 100,
      disponivel: Math.round(margemDisponivel(s.salarioLiquido, tipo === "EMPRESTIMO" ? comprometido : 0, tipo) * 100) / 100,
    }));
    return c.json({
      _meta: meta(t),
      data: {
        matricula: s.matricula, nome: s.nome, cpf_masked: s.cpfMasked,
        vinculo: s.vinculo, situacao_funcional: s.situacaoFuncional,
        salario_liquido: s.salarioLiquido, comprometido: Math.round(comprometido * 100) / 100,
        margens: tipos,
      },
    });
  })

  // Listar contratos do banco.
  // Filtros: ?situacao, ?tipo_contrato, ?convenio_id, ?matricula, ?q (nome/matricula/adf).
  .get("/v1/external/banco/contratos", apiTokenAuth(["banco:read"], "banco"), (c) => {
    const t = c.get("apiToken");
    const situacao = qparam(c, "situacao");
    const tipo = qparam(c, "tipo_contrato");
    const convenioId = qparam(c, "convenio_id");
    const matricula = qparam(c, "matricula");
    const q = qparam(c, "q");
    const doBanco = listContratos().filter((x) => x.bancoId === t.partnerId);
    let rows = listContratos({
      convenioId,
      matricula,
      situacao: situacao ? [situacao] : undefined,
    }).filter((x) => x.bancoId === t.partnerId);
    if (tipo) rows = rows.filter((x) => norm(x.tipoContrato) === norm(tipo));
    if (q) rows = rows.filter((x) => textIncludes(x.nome, q) || x.matricula.includes(q) || x.adf.includes(q));
    const data = rows.map((x) => ({
      adf: x.adf, matricula: x.matricula, nome: x.nome, situacao: x.situacao,
      tipo_contrato: x.tipoContrato, valor_parcela: x.valorParcela, total_parcelas: x.totalParcelas,
      data_lancamento: x.lancamento,
    }));
    return c.json({
      _meta: { ...meta(t), total: doBanco.length, retornados: data.length, filtros: appliedFilters({ situacao, tipo_contrato: tipo, convenio_id: convenioId, matricula, q }) },
      data,
    });
  })

  .get("/v1/external/banco/contratos/:adf", apiTokenAuth(["banco:read"], "banco"), (c) => {
    const t = c.get("apiToken");
    const ct = getContrato(c.req.param("adf"));
    if (!ct || ct.bancoId !== t.partnerId) throw Errors.notFound("contrato");
    return c.json({ _meta: meta(t), data: { ...ct, parcelas: getContratoParcelas(ct) } });
  })

  // Averbar / reservar contrato
  .post("/v1/external/banco/contratos/averbar", apiTokenAuth(["banco:write"], "banco"), async (c) => {
    const t = c.get("apiToken");
    const body = z.object({
      cpf: z.string().optional(),
      matricula: z.string(),
      convenio_id: z.string(),
      tipo_contrato: z.enum(["EMPRESTIMO", "REFIN", "ECONSIGNADO"]).default("EMPRESTIMO"),
      valor_financiado: z.number().positive(),
      parcelas: z.number().int().positive(),
      taxa_am: z.number().positive(),
      dias_carencia: z.number().int().nonnegative().default(30),
      reserva: z.boolean().default(false),
      observacoes: z.string().optional(),
    }).parse(await c.req.json());

    const conv = CONVENIOS_MOCK.find((cv) => cv.id === body.convenio_id && cv.bancoId === t.partnerId);
    if (!conv) throw Errors.notFound("convenio");
    const s = SERVIDORES_BUSCA_MOCK.find((x) => x.matricula === body.matricula);
    if (!s) throw Errors.notFound("colaborador");

    const iof = body.valor_financiado * 0.0038 + body.valor_financiado * 0.000082 * Math.min(body.parcelas * 30, 365);
    const cet = calcCET({ valor: body.valor_financiado, parcelas: body.parcelas, taxaMensal: body.taxa_am, iof });
    const contrato = criarContratoOuReserva({
      bancoId: t.partnerId,
      servidorId: Number(s.idMatricula.replace(/\D/g, "").slice(-5)) || 1,
      idMatricula: s.idMatricula, matricula: s.matricula, nome: s.nome, cpfMasked: s.cpfMasked,
      convenioId: conv.id, convenio: conv.nome, tipoContrato: body.tipo_contrato,
      valorFinanciado: body.valor_financiado, parcelas: body.parcelas, taxaAm: body.taxa_am,
      cetAm: cet.mensal, iof: Math.round(iof * 100) / 100, diasCarencia: body.dias_carencia,
      valorParcela: cet.parcela, codigoVerba: conv.codigoVerba, observacoes: body.observacoes,
      isReserva: body.reserva, ator: `token:${t.id}`,
    });
    return c.json({ _meta: meta(t), data: { adf: contrato.adf, situacao: contrato.situacao, expiracao: contrato.expiracao, valor_parcela: contrato.valorParcela, cet_am: contrato.cetAm } }, 201);
  })

  // Ações sobre contrato
  .post("/v1/external/banco/contratos/:adf/acao", apiTokenAuth(["banco:write"], "banco"), async (c) => {
    const t = c.get("apiToken");
    const ct = getContrato(c.req.param("adf"));
    if (!ct || ct.bancoId !== t.partnerId) throw Errors.notFound("contrato");
    const body = z.object({
      acao: z.enum(["quitar", "suspender", "cancelar", "alongar", "alterar", "confirmar"]),
      motivo: z.string().optional(),
      parcelas_extras: z.number().int().positive().optional(),
      observacoes: z.string().optional(),
      codigo_verba: z.string().optional(),
    }).parse(await c.req.json());
    const updated = aplicarAcao(c.req.param("adf"), body.acao, `token:${t.id}`, body.motivo, {
      parcelasExtras: body.parcelas_extras, observacoes: body.observacoes, codigoVerba: body.codigo_verba,
    });
    if (!updated) throw Errors.notFound("contrato");
    return c.json({ _meta: meta(t), data: { adf: updated.adf, situacao: updated.situacao } });
  })

  // ===== Webhooks =====
  .get("/v1/external/banco/webhooks", apiTokenAuth(["banco:webhooks"], "banco"), (c) => {
    const t = c.get("apiToken");
    const data = listWebhooks({ audience: "banco", partnerId: t.partnerId, environment: t.environment })
      .map((w) => ({ id: w.id, url: w.url, events: w.events, active: w.active, secret_prefix: w.secretPrefix, created_at: w.createdAt }));
    return c.json({ _meta: meta(t), data });
  })
  .post("/v1/external/banco/webhooks", apiTokenAuth(["banco:webhooks"], "banco"), async (c) => {
    const t = c.get("apiToken");
    const body = z.object({ url: z.string().url(), events: z.array(z.enum(WEBHOOK_EVENTS)).min(1) }).parse(await c.req.json());
    const { webhook, secret } = await createWebhook({ audience: "banco", partnerId: t.partnerId, environment: t.environment, url: body.url, events: body.events as WebhookEvent[], createdBy: `token:${t.id}` });
    return c.json({ _meta: meta(t), data: { id: webhook.id, url: webhook.url, events: webhook.events, secret, warning: "Guarde este secret — não será exibido novamente." } }, 201);
  })
  .patch("/v1/external/banco/webhooks/:id/toggle", apiTokenAuth(["banco:webhooks"], "banco"), (c) => {
    const w = toggleWebhook(c.req.param("id"));
    if (!w) throw Errors.notFound("webhook");
    return c.json({ data: { id: w.id, active: w.active } });
  })
  // Nunca apaga — DESATIVA (soft). O registro fica; pode ser reativado pelo toggle.
  .delete("/v1/external/banco/webhooks/:id", apiTokenAuth(["banco:webhooks"], "banco"), (c) => {
    if (!deactivateWebhook(c.req.param("id"))) throw Errors.notFound("webhook");
    return c.body(null, 204);
  })
  .get("/v1/external/banco/webhooks/:id/deliveries", apiTokenAuth(["banco:webhooks"], "banco"), (c) => {
    const t = c.get("apiToken");
    return c.json({ _meta: meta(t), data: listDeliveries(c.req.param("id")) });
  });
