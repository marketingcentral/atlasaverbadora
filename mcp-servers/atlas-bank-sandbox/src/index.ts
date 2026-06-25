#!/usr/bin/env node
// Atlas Bank Sandbox MCP server.
// Mocks an iFractal-style bank API for local development and testing.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  BANCOS,
  CONVENIOS,
  MATRICULAS,
  findMatriculaByCpf,
  findMatriculaById,
  getMargensFor,
  issueToken,
  nextAdf,
  verifyToken,
} from "./fixtures.js";

const server = new Server(
  { name: "atlas-bank-sandbox", version: "0.1.0" },
  { capabilities: { tools: {}, resources: {} } },
);

// ============ TOOLS ============

const tools = [
  {
    name: "bank_authorize",
    description: "Mock bank Authorize. Returns a session token. Use username='atlas' password='sandbox'.",
    inputSchema: {
      type: "object",
      properties: {
        username: { type: "string" },
        password: { type: "string" },
        banco: { type: "string", description: "Banco id (BANK-Y, SCRED, etc.)", default: "SCRED" },
      },
      required: ["username", "password"],
    },
  },
  {
    name: "bank_get_matriculas",
    description: "Get the matriculas (employment registrations) of a colaborador by CPF, optionally filtered by convenio.",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string" },
        cpf: { type: "string", description: "11 digits, with or without mask" },
        idConvenio: { type: "string" },
      },
      required: ["token", "cpf"],
    },
  },
  {
    name: "bank_get_margens",
    description: "Get available margens (EMPRESTIMO, CARTAO_CONSIGNADO, CARTAO_BENEFICIOS) for a matricula in a given competencia (YYYYMM).",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string" },
        idMatricula: { type: "string" },
        competencia: { type: "string", description: "YYYYMM" },
      },
      required: ["token", "idMatricula", "competencia"],
    },
  },
  {
    name: "bank_simulate",
    description: "Run a mock simulation: given valor + parcelas, returns oferta with taxa, parcela, CET.",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string" },
        idMatricula: { type: "string" },
        valor: { type: "number", minimum: 500 },
        parcelas: { type: "integer", minimum: 12, maximum: 96 },
      },
      required: ["token", "idMatricula", "valor", "parcelas"],
    },
  },
  {
    name: "bank_create_emprestimo",
    description: "Create a new loan contract directly (no reserva). Returns adf + numeroContrato.",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string" },
        idMatricula: { type: "string" },
        idConvenio: { type: "string" },
        payload: { type: "object" },
      },
      required: ["token", "idMatricula", "idConvenio", "payload"],
    },
  },
  {
    name: "bank_create_reserva_emprestimo",
    description: "Create a loan reservation (pre-contract). Returns adf + dataExpiracao.",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string" },
        idMatricula: { type: "string" },
        idConvenio: { type: "string" },
        payload: { type: "object" },
      },
      required: ["token", "idMatricula", "idConvenio", "payload"],
    },
  },
  {
    name: "bank_confirmar",
    description: "Confirm a reserva, converting it to a contract.",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string" },
        adf: { type: "string" },
      },
      required: ["token", "adf"],
    },
  },
  {
    name: "bank_portabilidade",
    description: "Start a portability of an existing contract to this bank.",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string" },
        idMatricula: { type: "string" },
        bancoOrigem: { type: "string" },
        contratoOrigem: { type: "string" },
        saldoDevedor: { type: "number" },
        novaParcela: { type: "number" },
      },
      required: ["token", "idMatricula", "bancoOrigem", "contratoOrigem", "saldoDevedor"],
    },
  },
  {
    name: "bank_quitacao",
    description: "Pay off (quitacao) an existing contract.",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string" },
        adf: { type: "string" },
        valorQuitacao: { type: "number" },
      },
      required: ["token", "adf", "valorQuitacao"],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const a = args ?? {};

  const requireToken = (): { banco: string } => {
    const t = z.string().parse(a.token);
    const ok = verifyToken(t);
    if (!ok) throw new Error("invalid_or_expired_token");
    return ok;
  };

  switch (name) {
    case "bank_authorize": {
      const { username, password, banco = "SCRED" } = z
        .object({ username: z.string(), password: z.string(), banco: z.string().optional() })
        .parse(a);
      if (username !== "atlas" || password !== "sandbox") throw new Error("invalid_credentials");
      const { token, expiresIn } = issueToken(banco);
      return { content: [{ type: "text", text: JSON.stringify({ token, expiresIn, banco }) }] };
    }
    case "bank_get_matriculas": {
      requireToken();
      const { cpf, idConvenio } = z.object({ cpf: z.string(), idConvenio: z.string().optional() }).parse(a);
      const list = findMatriculaByCpf(cpf, idConvenio);
      return { content: [{ type: "text", text: JSON.stringify({ matriculas: list }) }] };
    }
    case "bank_get_margens": {
      requireToken();
      const { idMatricula, competencia } = z
        .object({ idMatricula: z.string(), competencia: z.string().regex(/^\d{6}$/) })
        .parse(a);
      const mat = findMatriculaById(idMatricula);
      if (!mat) throw new Error("matricula_not_found");
      return { content: [{ type: "text", text: JSON.stringify({ margens: getMargensFor(mat, competencia) }) }] };
    }
    case "bank_simulate": {
      const sess = requireToken();
      const { idMatricula, valor, parcelas } = z
        .object({ idMatricula: z.string(), valor: z.number().min(500), parcelas: z.number().int().min(12).max(96) })
        .parse(a);
      const mat = findMatriculaById(idMatricula);
      if (!mat) throw new Error("matricula_not_found");
      const banco = BANCOS.find((b) => b.id === sess.banco) ?? BANCOS[0]!;
      const taxa = banco.taxaMinAm + ((banco.taxaMaxAm - banco.taxaMinAm) * (parcelas / 96));
      const iof = valor * 0.0038 + valor * 0.000082 * Math.min(parcelas * 30, 365);
      const valorLiquido = valor - iof;
      // PMT formula
      const parcela = (valor * taxa) / (1 - Math.pow(1 + taxa, -parcelas));
      const totalPago = parcela * parcelas;
      const cet = Math.pow(totalPago / valorLiquido, 1 / parcelas) - 1;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              banco: banco.id,
              bancoNome: banco.nome,
              valorSolicitado: valor,
              valorLiquido: round2(valorLiquido),
              parcelas,
              valorParcela: round2(parcela),
              taxaAm: round4(taxa),
              cetAm: round4(cet),
              iof: round2(iof),
            }),
          },
        ],
      };
    }
    case "bank_create_emprestimo":
    case "bank_create_reserva_emprestimo": {
      requireToken();
      z.object({ idMatricula: z.string(), idConvenio: z.string(), payload: z.record(z.any()) }).parse(a);
      const adf = nextAdf();
      const numeroContrato = `${Math.floor(Math.random() * 9999999)}AFD-1#`;
      const out: Record<string, unknown> = { adf, numeroContrato };
      if (name === "bank_create_reserva_emprestimo") {
        out.dataExpiracao = new Date(Date.now() + 24 * 3600_000).toISOString();
      }
      return { content: [{ type: "text", text: JSON.stringify(out) }] };
    }
    case "bank_confirmar": {
      requireToken();
      const { adf } = z.object({ adf: z.string() }).parse(a);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ adf, status: "confirmado", competenciaPrimeiroDesconto: currentCompetencia() }),
          },
        ],
      };
    }
    case "bank_portabilidade": {
      requireToken();
      z.object({ idMatricula: z.string(), bancoOrigem: z.string(), contratoOrigem: z.string(), saldoDevedor: z.number(), novaParcela: z.number().optional() }).parse(a);
      const adf = nextAdf();
      return { content: [{ type: "text", text: JSON.stringify({ adf, status: "solicitada", prazoAnaliseDias: 5 }) }] };
    }
    case "bank_quitacao": {
      requireToken();
      const { adf, valorQuitacao } = z.object({ adf: z.string(), valorQuitacao: z.number() }).parse(a);
      return { content: [{ type: "text", text: JSON.stringify({ adf, valorQuitacao, status: "quitado" }) }] };
    }
    default:
      throw new Error(`unknown_tool: ${name}`);
  }
});

// ============ RESOURCES ============

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    { uri: "bank://convenios", name: "Convenios disponiveis no sandbox", mimeType: "application/json" },
    { uri: "bank://bancos", name: "Bancos disponiveis no sandbox", mimeType: "application/json" },
    { uri: "bank://matriculas", name: "Todas as matriculas mock (50 servidores)", mimeType: "application/json" },
    { uri: "bank://test-credentials", name: "Credenciais para autorizar no sandbox", mimeType: "text/plain" },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
  const uri = req.params.uri;
  if (uri === "bank://convenios") return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(CONVENIOS, null, 2) }] };
  if (uri === "bank://bancos") return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(BANCOS, null, 2) }] };
  if (uri === "bank://matriculas") return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(MATRICULAS, null, 2) }] };
  if (uri === "bank://test-credentials") {
    return {
      contents: [
        {
          uri,
          mimeType: "text/plain",
          text:
            "Bank sandbox credentials\n========================\nusername: atlas\npassword: sandbox\n\nExample servidor CPFs (50 generated, sequential from base):\n  00011122233 (servidor 0)\n  00011122234 (servidor 1)\n  ...\n  00011122282 (servidor 49)\n\nBank ids: BANK-Y, BANK-X, SCRED, BMG, PAN\n",
        },
      ],
    };
  }
  throw new Error(`unknown_resource: ${uri}`);
});

// ============ HELPERS ============

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }
function currentCompetencia(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ============ MAIN ============

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[atlas-bank-sandbox] MCP server ready");
