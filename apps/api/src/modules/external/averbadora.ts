// External API — camada AVERBADORA.
// Tokens com audience="averbadora" consomem /v1/external/averbadora/* (operar o sistema via API).
// Escopos: averbadora:read | averbadora:write | averbadora:webhooks

import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../env.js";
import { apiTokenAuth } from "../../middleware/api-token.js";
import { Errors } from "../../_shared/errors.js";
import { CONVENIOS_MOCK, SERVIDORES_BUSCA_MOCK } from "../portal-banco/fixtures.js";
import { listContratos } from "../portal-banco/store.js";
import { bancos, prefeituras, sanitizeBanco, sanitizePrefeitura } from "../admin/index.js";
import { WEBHOOK_EVENTS, fireEvent, listWebhooks, type WebhookEvent } from "../admin/webhooks.js";
import { qparam, norm, textIncludes, bancoAtendeLocal, appliedFilters } from "./_filters.js";

const meta = (t: { environment: "production" | "sandbox" }) => ({ ambiente: t.environment });

export const externalAverbadoraRoutes = new Hono<{ Bindings: Env }>()
  .get("/v1/external/averbadora/me", apiTokenAuth(["averbadora:read"], "averbadora"), (c) => {
    const t = c.get("apiToken");
    return c.json({ camada: "averbadora", environment: t.environment, scopes: t.scopes });
  })

  // Dashboard consolidado
  .get("/v1/external/averbadora/dashboard", apiTokenAuth(["averbadora:read"], "averbadora"), (c) => {
    const t = c.get("apiToken");
    const contratos = listContratos();
    return c.json({
      _meta: meta(t),
      data: {
        contratos_total: contratos.length,
        bancos_ativos: bancos.filter((b) => b.status === "ativo").length,
        prefeituras_ativas: prefeituras.filter((p) => p.status === "ativo").length,
        servidores_cadastrados: SERVIDORES_BUSCA_MOCK.length,
        convenios: CONVENIOS_MOCK.length,
      },
    });
  })

  // ===== Bancos =====
  // Filtros: ?status, ?adapter, ?uf, ?cidade (uf/cidade resolvidos via convenios do banco), ?q (nome).
  .get("/v1/external/averbadora/bancos", apiTokenAuth(["averbadora:read"], "averbadora"), (c) => {
    const t = c.get("apiToken");
    const status = qparam(c, "status");
    const adapter = qparam(c, "adapter");
    const uf = qparam(c, "uf");
    const cidade = qparam(c, "cidade");
    const q = qparam(c, "q");
    let data = bancos;
    if (status) data = data.filter((b) => b.status === status);
    if (adapter) data = data.filter((b) => b.adapter === adapter);
    if (q) data = data.filter((b) => textIncludes(b.nome, q));
    if (uf || cidade) data = data.filter((b) => bancoAtendeLocal(b.id, { uf, cidade }));
    return c.json({
      _meta: { ...meta(t), total: bancos.length, retornados: data.length, filtros: appliedFilters({ status, adapter, uf, cidade, q }) },
      data: data.map(sanitizeBanco),
    });
  })
  .post("/v1/external/averbadora/bancos", apiTokenAuth(["averbadora:write"], "averbadora"), async (c) => {
    const t = c.get("apiToken");
    const body = z.object({
      id: z.number().int().optional(),
      nome: z.string().min(2),
      status: z.enum(["ativo", "pausado", "inativo"]).default("ativo"),
      adapter: z.enum(["sandbox", "ifractal"]).default("sandbox"),
      contatoEmail: z.string().email().optional().default(""),
      scopes: z.array(z.string()).default(["propostas:rw"]),
      mtlsHabilitado: z.boolean().default(false),
    }).parse(await c.req.json());
    const existing = body.id ? bancos.find((b) => b.id === body.id) : undefined;
    if (existing) {
      Object.assign(existing, body);
      return c.json({ _meta: meta(t), data: existing });
    }
    const novo = { ...body, id: Math.max(0, ...bancos.map((b) => b.id)) + 1 };
    bancos.push(novo);
    return c.json({ _meta: meta(t), data: novo }, 201);
  })

  // ===== Prefeituras =====
  // Filtros: ?uf, ?status, ?modo (REST|SOAP|CSV|MANUAL), ?cidade/?q (nome do municipio).
  .get("/v1/external/averbadora/prefeituras", apiTokenAuth(["averbadora:read"], "averbadora"), (c) => {
    const t = c.get("apiToken");
    const uf = qparam(c, "uf");
    const status = qparam(c, "status");
    const modo = qparam(c, "modo");
    const cidade = qparam(c, "cidade") ?? qparam(c, "q");
    let data = prefeituras;
    if (uf) data = data.filter((p) => norm(p.uf) === norm(uf));
    if (status) data = data.filter((p) => p.status === status);
    if (modo) data = data.filter((p) => norm(p.modoIntegracao) === norm(modo));
    if (cidade) data = data.filter((p) => textIncludes(p.nome, cidade));
    return c.json({
      _meta: { ...meta(t), total: prefeituras.length, retornados: data.length, filtros: appliedFilters({ uf, status, modo, cidade }) },
      data: data.map(sanitizePrefeitura),
    });
  })
  .post("/v1/external/averbadora/prefeituras", apiTokenAuth(["averbadora:write"], "averbadora"), async (c) => {
    const t = c.get("apiToken");
    const body = z.object({
      id: z.number().int().optional(),
      nome: z.string().min(2),
      uf: z.string().length(2),
      municipioIbge: z.number().int(),
      modoIntegracao: z.enum(["REST", "SOAP", "CSV", "MANUAL"]).default("REST"),
      status: z.enum(["ativo", "pausado"]).default("ativo"),
    }).parse(await c.req.json());
    const existing = body.id ? prefeituras.find((p) => p.id === body.id) : undefined;
    if (existing) {
      Object.assign(existing, body);
      return c.json({ _meta: meta(t), data: existing });
    }
    const novo = { ...body, uf: body.uf.toUpperCase(), servidoresCount: 0, id: Math.max(0, ...prefeituras.map((p) => p.id)) + 1 };
    prefeituras.push(novo);
    return c.json({ _meta: meta(t), data: novo }, 201);
  })

  // ===== Convênios =====
  // Filtros: ?banco_id, ?prefeitura_id, ?uf, ?cidade (nome da prefeitura), ?q (nome/codigo).
  .get("/v1/external/averbadora/convenios", apiTokenAuth(["averbadora:read"], "averbadora"), (c) => {
    const t = c.get("apiToken");
    const bancoId = qparam(c, "banco_id");
    const prefeituraId = qparam(c, "prefeitura_id");
    const uf = qparam(c, "uf");
    const cidade = qparam(c, "cidade");
    const q = qparam(c, "q");
    let data = CONVENIOS_MOCK;
    if (bancoId) data = data.filter((cv) => String(cv.bancoId) === bancoId);
    if (prefeituraId) data = data.filter((cv) => String(cv.prefeituraId) === prefeituraId);
    if (uf) data = data.filter((cv) => norm(cv.uf) === norm(uf));
    if (cidade) data = data.filter((cv) => textIncludes(cv.prefeitura, cidade));
    if (q) data = data.filter((cv) => textIncludes(cv.nome, q) || textIncludes(cv.codigoVerba, q));
    return c.json({
      _meta: { ...meta(t), total: CONVENIOS_MOCK.length, retornados: data.length, filtros: appliedFilters({ banco_id: bancoId, prefeitura_id: prefeituraId, uf, cidade, q }) },
      data,
    });
  })

  // ===== Servidores =====
  // Filtros: ?q (nome/cpf/matricula), ?vinculo, ?situacao (situacao_funcional), ?convenio_id.
  .get("/v1/external/averbadora/servidores", apiTokenAuth(["averbadora:read"], "averbadora"), (c) => {
    const t = c.get("apiToken");
    const q = qparam(c, "q")?.toLowerCase();
    const vinculo = qparam(c, "vinculo");
    const situacao = qparam(c, "situacao");
    const convenioId = qparam(c, "convenio_id");
    let rows = SERVIDORES_BUSCA_MOCK;
    if (q) rows = rows.filter((s) => s.nome.toLowerCase().includes(q) || s.cpf.includes(q) || s.matricula.includes(q));
    if (vinculo) rows = rows.filter((s) => norm(s.vinculo) === norm(vinculo));
    if (situacao) rows = rows.filter((s) => norm(s.situacaoFuncional) === norm(situacao));
    if (convenioId) rows = rows.filter((s) => norm(s.idConvenio) === norm(convenioId));
    const data = rows.map((s) => ({
      matricula: s.matricula, nome: s.nome, cpf_masked: s.cpfMasked,
      vinculo: s.vinculo, situacao_funcional: s.situacaoFuncional,
      salario_liquido: s.salarioLiquido, id_convenio: s.idConvenio,
    }));
    return c.json({
      _meta: { ...meta(t), total: SERVIDORES_BUSCA_MOCK.length, retornados: data.length, filtros: appliedFilters({ q, vinculo, situacao, convenio_id: convenioId }) },
      data,
    });
  })

  // ===== Webhooks — listar todos + disparar evento =====
  .get("/v1/external/averbadora/webhooks", apiTokenAuth(["averbadora:webhooks"], "averbadora"), (c) => {
    const t = c.get("apiToken");
    const data = listWebhooks().map((w) => ({
      id: w.id, audience: w.audience, partner_id: w.partnerId, url: w.url,
      events: w.events, active: w.active, environment: w.environment,
    }));
    return c.json({ _meta: meta(t), data });
  })
  .post("/v1/external/averbadora/eventos/disparar", apiTokenAuth(["averbadora:webhooks"], "averbadora"), async (c) => {
    const t = c.get("apiToken");
    const body = z.object({
      event: z.enum(WEBHOOK_EVENTS),
      environment: z.enum(["production", "sandbox"]).default(t.environment),
      payload: z.record(z.unknown()).default({}),
    }).parse(await c.req.json());
    const deliveries = await fireEvent(body.event, body.payload, { environment: body.environment });
    return c.json({ _meta: meta(t), data: { event: body.event, deliveries: deliveries.length } });
  });
