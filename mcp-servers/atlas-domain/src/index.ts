#!/usr/bin/env node
// Atlas Domain MCP server.
// Exposes glossary, state machines and finance calculations.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { GLOSSARIO } from "./glossario.js";
import { calcCET, calcMargemDisponivel, validateProposta, type TipoMargem } from "./finance.js";
import { allowedEvents, asJson, nextState, type EntityKind } from "./state-machines.js";

const server = new Server(
  { name: "atlas-domain", version: "0.1.0" },
  { capabilities: { tools: {}, resources: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "domain_calc_cet",
      description: "Calculate CET (Custo Efetivo Total) using Newton-Raphson. Returns monthly + yearly + parcela + valor liquido.",
      inputSchema: {
        type: "object",
        properties: {
          valor: { type: "number" },
          parcelas: { type: "integer", minimum: 1 },
          taxaMensal: { type: "number" },
          iof: { type: "number" },
          tarifas: { type: "number" },
        },
        required: ["valor", "parcelas", "taxaMensal"],
      },
    },
    {
      name: "domain_calc_margem_disponivel",
      description: "Compute available margem for a given type.",
      inputSchema: {
        type: "object",
        properties: {
          salarioLiquido: { type: "number" },
          comprometido: { type: "number" },
          tipo: { type: "string", enum: ["EMPRESTIMO", "CARTAO_CONSIGNADO", "CARTAO_BENEFICIOS"] },
        },
        required: ["salarioLiquido", "comprometido", "tipo"],
      },
    },
    {
      name: "domain_validate_proposta",
      description: "Validate a proposta against business rules (age, margin, situation).",
      inputSchema: {
        type: "object",
        properties: {
          dataNascimento: { type: "string", description: "YYYY-MM-DD" },
          parcelas: { type: "integer" },
          valor: { type: "number" },
          taxaMensal: { type: "number" },
          salarioLiquido: { type: "number" },
          margemDisponivel: { type: "number" },
          permiteSolicitarEmprestimo: { type: "boolean" },
          situacaoFuncional: { type: "string" },
        },
        required: ["dataNascimento", "parcelas", "valor", "taxaMensal", "salarioLiquido", "margemDisponivel", "permiteSolicitarEmprestimo", "situacaoFuncional"],
      },
    },
    {
      name: "domain_next_state",
      description: "Compute the next state of an entity given an event. Returns null if invalid.",
      inputSchema: {
        type: "object",
        properties: {
          entity: { type: "string", enum: ["proposta", "contrato", "portabilidade", "reserva"] },
          current: { type: "string" },
          event: { type: "string" },
        },
        required: ["entity", "current", "event"],
      },
    },
    {
      name: "domain_allowed_events",
      description: "Return the list of events allowed from a given state.",
      inputSchema: {
        type: "object",
        properties: {
          entity: { type: "string", enum: ["proposta", "contrato", "portabilidade", "reserva"] },
          current: { type: "string" },
        },
        required: ["entity", "current"],
      },
    },
    {
      name: "domain_lookup",
      description: "Look up the definition of a domain term from the glossary.",
      inputSchema: {
        type: "object",
        properties: { term: { type: "string" } },
        required: ["term"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const a = args ?? {};
  const txt = (v: unknown) => ({ content: [{ type: "text", text: JSON.stringify(v, null, 2) }] });

  switch (name) {
    case "domain_calc_cet": {
      const input = z
        .object({ valor: z.number(), parcelas: z.number().int().min(1), taxaMensal: z.number(), iof: z.number().optional(), tarifas: z.number().optional() })
        .parse(a);
      return txt(calcCET(input));
    }
    case "domain_calc_margem_disponivel": {
      const { salarioLiquido, comprometido, tipo } = z
        .object({ salarioLiquido: z.number(), comprometido: z.number(), tipo: z.enum(["EMPRESTIMO", "CARTAO_CONSIGNADO", "CARTAO_BENEFICIOS"]) })
        .parse(a);
      return txt({ disponivel: calcMargemDisponivel(salarioLiquido, comprometido, tipo as TipoMargem) });
    }
    case "domain_validate_proposta": {
      const input = z
        .object({
          dataNascimento: z.string(),
          parcelas: z.number().int(),
          valor: z.number(),
          taxaMensal: z.number(),
          salarioLiquido: z.number(),
          margemDisponivel: z.number(),
          permiteSolicitarEmprestimo: z.boolean(),
          situacaoFuncional: z.string(),
        })
        .parse(a);
      return txt(validateProposta(input));
    }
    case "domain_next_state": {
      const { entity, current, event } = z
        .object({ entity: z.enum(["proposta", "contrato", "portabilidade", "reserva"]), current: z.string(), event: z.string() })
        .parse(a);
      const to = nextState(entity as EntityKind, current, event);
      return txt({ from: current, event, to, valid: to !== null });
    }
    case "domain_allowed_events": {
      const { entity, current } = z
        .object({ entity: z.enum(["proposta", "contrato", "portabilidade", "reserva"]), current: z.string() })
        .parse(a);
      return txt({ events: allowedEvents(entity as EntityKind, current) });
    }
    case "domain_lookup": {
      const { term } = z.object({ term: z.string() }).parse(a);
      const key = term.toLowerCase().replace(/\s+/g, "_");
      const def = GLOSSARIO[key];
      return txt({ term: key, definition: def ?? null });
    }
    default:
      throw new Error(`unknown_tool: ${name}`);
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    { uri: "domain://glossario", name: "Glossario completo", mimeType: "application/json" },
    { uri: "domain://state-machine/proposta", name: "Maquina de estados: proposta", mimeType: "application/json" },
    { uri: "domain://state-machine/contrato", name: "Maquina de estados: contrato", mimeType: "application/json" },
    { uri: "domain://state-machine/portabilidade", name: "Maquina de estados: portabilidade", mimeType: "application/json" },
    { uri: "domain://state-machine/reserva", name: "Maquina de estados: reserva", mimeType: "application/json" },
    { uri: "domain://regras/limites-margem", name: "Limites legais de margem", mimeType: "application/json" },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
  const uri = req.params.uri;
  const j = (v: unknown) => ({ contents: [{ uri, mimeType: "application/json", text: JSON.stringify(v, null, 2) }] });
  if (uri === "domain://glossario") return j(GLOSSARIO);
  if (uri.startsWith("domain://state-machine/")) {
    const e = uri.replace("domain://state-machine/", "") as EntityKind;
    return j(asJson(e));
  }
  if (uri === "domain://regras/limites-margem") {
    return j({ EMPRESTIMO: 0.35, CARTAO_CONSIGNADO: 0.05, CARTAO_BENEFICIOS: 0.05, total_combinado: 0.45 });
  }
  throw new Error(`unknown_resource: ${uri}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[atlas-domain] MCP server ready");
