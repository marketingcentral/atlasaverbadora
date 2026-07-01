import { Hono } from "hono";
import { maskCPF, margemDisponivel, margemTotal, percentualUso } from "@atlas/domain";
import { authRequired, requireRole, type JwtClaims } from "../../middleware/auth.js";
import { Errors } from "../../_shared/errors.js";
import { getBankAdapter } from "../../integrations/index.js";
import type { Env } from "../../env.js";
import { SERVIDORES_BUSCA_MOCK, CONVENIOS_MOCK, type ServidorBuscaMock } from "../portal-banco/fixtures.js";
import { bancos, prefeituras } from "../admin/index.js";
import { listContratos } from "../portal-banco/store.js";

// Dev shadow data — mirrors the SERVIDORES_BUSCA_MOCK identities (source of truth used
// by todos os outros perfis), para o servidor ver os MESMOS dados.
const DEV_SERVIDORES = [
  { id: 1, nome: "ADRIANA MARQUES DA SILVA", cpf: "00011122233", matricula: "852029100", prefeitura_id: 1, vinculo: "ESTATUTARIO" as const, situacao_funcional: "ATIVO" as const, status: "ativo" as const, idConvenio: "CONV-001", idMatricula: "MAT-852029100", salarioLiquido: 4620 },
  { id: 2, nome: "FERNANDA KELLI TOMAZONI", cpf: "00011122234", matricula: "843796302", prefeitura_id: 2, vinculo: "ESTATUTARIO" as const, situacao_funcional: "ATIVO" as const, status: "ativo" as const, idConvenio: "CONV-002", idMatricula: "MAT-843796302", salarioLiquido: 5320 },
];

const round2 = (n: number) => Math.round(n * 100) / 100;
const bancoNome = (id: number) => bancos.find((b) => b.id === id)?.nome ?? `Banco ${id}`;

function mapContratoStatus(situacao: string): "Averbado" | "Em dia" | "Quitado" {
  const s = situacao.toLowerCase();
  if (s.includes("quitad")) return "Quitado";
  if (s.includes("averb") || s.includes("aguard")) return "Averbado";
  return "Em dia";
}

/**
 * Builds the full MatriculaInfo the servidor app consumes, from the real base
 * (SERVIDORES_BUSCA_MOCK + listContratos) — same source of truth as os outros perfis.
 */
function buildMatriculaInfo(e: ServidorBuscaMock) {
  const conv = CONVENIOS_MOCK.find((cv) => cv.id === e.idConvenio);
  const prefId = conv?.prefeituraId ?? 1;
  const pref = prefeituras.find((p) => p.id === prefId);
  const servidorId = Number(e.idMatricula.replace(/\D/g, "").slice(-5)) || 1;
  const contratos = listContratos({ matricula: e.matricula });
  const ativos = contratos.filter((ct) => !["cancelado", "quitado"].includes(ct.situacao.toLowerCase()));
  const comprometido = ativos.reduce((a, ct) => a + ct.valorParcela, 0);
  const margens = (["EMPRESTIMO", "CARTAO_CONSIGNADO", "CARTAO_BENEFICIOS"] as const).map((tipo) => ({
    tipo,
    total: round2(margemTotal(e.salarioLiquido, tipo)),
    disponivel: round2(margemDisponivel(e.salarioLiquido, tipo === "EMPRESTIMO" ? comprometido : 0, tipo)),
  }));
  const emp = margens.find((m) => m.tipo === "EMPRESTIMO")!;
  const contratosMock = contratos.map((ct) => ({
    id: ct.adf, banco: bancoNome(ct.bancoId), parcela: round2(ct.valorParcela), parcelasPagas: ct.parcelasPagas,
    total: ct.totalParcelas, status: mapContratoStatus(ct.situacao), proximaParcela: ct.folhaUltimoDesconto || "—",
    taxaAm: ct.taxaAm, valorFinanciado: round2(ct.valorFinanciado), pdfUrl: `/v1/portal/banco/contratos/${ct.adf}/comprovante.pdf`,
  }));
  const elegiveis = ativos.map((ct) => ({
    id: ct.adf, banco: bancoNome(ct.bancoId), saldoDevedor: round2(ct.saldoDevedor), parcela: round2(ct.valorParcela),
    parcelasRestantes: ct.totalParcelas - ct.parcelasPagas, totalParcelas: ct.totalParcelas, taxaAm: ct.taxaAm,
    tipoContrato: (ct.tipoContrato === "REFIN" ? "Refin" : "Emprestimo") as "Emprestimo" | "Refin",
  }));
  return {
    idMatricula: e.idMatricula, matricula: e.matricula,
    prefeitura: pref ? `Prefeitura de ${pref.nome}` : e.origem, prefeitura_id: prefId, servidor_id: servidorId,
    uf: pref?.uf ?? "SC", cargo: e.cargo ?? "—", vinculo: (["ESTATUTARIO", "CLT", "COMISSIONADO"].includes(e.vinculo) ? e.vinculo : "ESTATUTARIO") as "ESTATUTARIO" | "CLT" | "COMISSIONADO",
    nome: e.nome, email: e.email ?? "", telefone: e.telefone ?? "", endereco: e.endereco ?? "", ativa: true,
    margem: {
      servidor_id: servidorId, matricula: e.matricula, prefeitura_id: prefId,
      margem: { salario_base: e.salarioLiquido, comprometido: round2(comprometido), disponivel: emp.disponivel, percentual_uso: percentualUso(e.salarioLiquido, comprometido, "EMPRESTIMO") },
      margens_por_tipo: margens,
      fonte: { tipo: "folha_prefeitura" as const, sincronizado_em: new Date().toISOString(), cache_status: "MISS" as const },
    },
    contratos: contratosMock,
    elegiveisPortabilidade: elegiveis,
  };
}

interface ResolvedServidor {
  id: number;
  nome: string;
  cpf: string;
  matricula: string;
  prefeitura_id: number;
  vinculo: "CLT" | "ESTATUTARIO" | "COMISSIONADO";
  situacao_funcional: "ATIVO" | "FERIAS" | "AFASTADO" | "LICENCA" | "LICENCA_REMUNERADA" | "APOSENTADO";
  status: "ativo" | "bloqueado" | "arquivado";
  idMatricula: string;
  salarioLiquido: number;
  /** Quando o servidor vem da fixture (cadastrado via averbadora), o sandbox bank
   *  não conhece a idMatricula e a margem precisa ser calculada localmente. */
  fromFixture: boolean;
}

function fromFixture(s: ServidorBuscaMock): ResolvedServidor {
  const id = Number(s.idMatricula.replace(/\D/g, "").slice(-5)) || 1;
  const conv = CONVENIOS_MOCK.find((cv) => cv.id === s.idConvenio);
  const validVinculo = (["CLT", "ESTATUTARIO", "COMISSIONADO"] as const).includes(s.vinculo as never) ? s.vinculo as "CLT" | "ESTATUTARIO" | "COMISSIONADO" : "ESTATUTARIO";
  const situ = (s.situacaoFuncional || "ATIVO").toUpperCase();
  const validSitu = (["ATIVO", "FERIAS", "AFASTADO", "LICENCA", "LICENCA_REMUNERADA", "APOSENTADO"] as const).find((x) => x === situ) ?? "ATIVO";
  return {
    id, nome: s.nome, cpf: s.cpf, matricula: s.matricula,
    prefeitura_id: conv?.prefeituraId ?? 1,
    vinculo: validVinculo,
    situacao_funcional: validSitu,
    status: "ativo",
    idMatricula: s.idMatricula,
    salarioLiquido: s.salarioLiquido,
    fromFixture: true,
  };
}

function resolveServidor(j: JwtClaims): ResolvedServidor | null {
  const id = j.servidor_id;
  if (id == null) return null;
  const dev = DEV_SERVIDORES.find((x) => x.id === id);
  if (dev) return { ...dev, fromFixture: false };
  // ids sintéticos (últimos 5 dígitos da idMatricula) usados quando o servidor vem da fixture
  const fx = SERVIDORES_BUSCA_MOCK.find((s) => Number(s.idMatricula.replace(/\D/g, "").slice(-5)) === id);
  return fx ? fromFixture(fx) : null;
}

function currentCompetencia(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const servidoresRoutes = new Hono<{ Bindings: Env; Variables: { jwt: JwtClaims; trace_id: string } }>()
  // Escopado ao próprio prefixo — `.use("*")` vazaria para /v1/external/* quando montado em "/".
  .use("/v1/servidores/*", authRequired)
  .get("/v1/servidores/me", async (c) => {
    const j = c.get("jwt");
    requireRoleInline(j, ["servidor"]);
    const s = resolveServidor(j);
    if (!s) throw Errors.notFound("servidor");
    return c.json({
      id: s.id,
      nome: s.nome,
      cpf_masked: maskCPF(s.cpf),
      matricula: s.matricula,
      prefeitura_id: s.prefeitura_id,
      vinculo: s.vinculo,
      situacao_funcional: s.situacao_funcional,
      status: s.status,
    });
  })
  .get("/v1/servidores/me/margem-consignavel", async (c) => {
    const startedAt = Date.now();
    const j = c.get("jwt");
    requireRoleInline(j, ["servidor"]);
    const s = resolveServidor(j);
    if (!s) throw Errors.notFound("servidor");

    let margens: { tipo: "EMPRESTIMO" | "CARTAO_CONSIGNADO" | "CARTAO_BENEFICIOS"; disponivel: number; total: number }[];
    if (s.fromFixture) {
      // Sandbox bank desconhece idMatricula desta fixture — calcular localmente.
      margens = (["EMPRESTIMO", "CARTAO_CONSIGNADO", "CARTAO_BENEFICIOS"] as const).map((tipo) => ({
        tipo,
        total: Math.round(margemTotal(s.salarioLiquido, tipo) * 100) / 100,
        disponivel: Math.round(margemDisponivel(s.salarioLiquido, 0, tipo) * 100) / 100,
      }));
    } else {
      const competencia = currentCompetencia();
      const bank = getBankAdapter(c.env);
      const session = await bank.authorize({ username: "atlas", password: "sandbox" });
      margens = await bank.getMargens(session, s.idMatricula, competencia);
    }

    const emp = margens.find((m) => m.tipo === "EMPRESTIMO");
    if (!emp) throw Errors.notFound("margem_emprestimo");
    const comprometido = emp.total - emp.disponivel;
    return c.json({
      servidor_id: s.id,
      matricula: s.matricula,
      prefeitura_id: s.prefeitura_id,
      margem: {
        salario_base: s.salarioLiquido,
        comprometido,
        disponivel: emp.disponivel,
        percentual_uso: percentualUso(s.salarioLiquido, comprometido, "EMPRESTIMO"),
      },
      margens_por_tipo: margens.map((m) => ({ tipo: m.tipo, disponivel: m.disponivel, total: m.total })),
      fonte: {
        tipo: "folha_prefeitura",
        sincronizado_em: new Date().toISOString(),
        cache_status: "MISS" as const,
      },
      _meta: { trace_id: c.get("trace_id"), duracao_ms: Date.now() - startedAt },
    });
  })
  // Todas as matrículas do servidor logado, com MatriculaInfo completo (dados reais).
  .get("/v1/servidores/me/matriculas", async (c) => {
    const j = c.get("jwt");
    requireRoleInline(j, ["servidor"]);
    const s = resolveServidor(j);
    if (!s) throw Errors.notFound("servidor");
    const entries = SERVIDORES_BUSCA_MOCK.filter((x) => x.cpf === s.cpf);
    const matriculas = entries.map((e) => buildMatriculaInfo(e));
    return c.json({ matriculas });
  })
  .get("/v1/servidores/:id", async (c) => {
    const j = c.get("jwt");
    requireRoleInline(j, ["averbadora"]);
    const id = Number(c.req.param("id"));
    const s = DEV_SERVIDORES.find((x) => x.id === id);
    if (!s) throw Errors.notFound("servidor");
    return c.json({
      id: s.id, nome: s.nome, cpf_masked: maskCPF(s.cpf), matricula: s.matricula,
      prefeitura_id: s.prefeitura_id, vinculo: s.vinculo, situacao_funcional: s.situacao_funcional, status: s.status,
    });
  })
  .get("/v1/servidores", async (c) => {
    const j = c.get("jwt");
    requireRoleInline(j, ["averbadora"]);
    return c.json({
      data: DEV_SERVIDORES.map((s) => ({
        id: s.id, nome: s.nome, cpf_masked: maskCPF(s.cpf), matricula: s.matricula,
        prefeitura_id: s.prefeitura_id, vinculo: s.vinculo, situacao_funcional: s.situacao_funcional, status: s.status,
      })),
      meta: { has_more: false, next_cursor: null, limit: 25 },
    });
  });

function requireRoleInline(j: JwtClaims, roles: JwtClaims["role"][]): void {
  if (!roles.includes(j.role)) throw Errors.forbidden(`Requer um dos perfis: ${roles.join(", ")}`);
}
// margemDisponivel and margemTotal currently unused but kept for downstream features.
void margemDisponivel; void margemTotal;
