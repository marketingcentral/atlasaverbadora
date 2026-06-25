import { Hono } from "hono";
import { maskCPF, margemDisponivel, margemTotal, percentualUso } from "@atlas/domain";
import { authRequired, requireRole, type JwtClaims } from "../../middleware/auth.js";
import { Errors } from "../../_shared/errors.js";
import { getBankAdapter } from "../../integrations/index.js";
import type { Env } from "../../env.js";
import { SERVIDORES_BUSCA_MOCK, CONVENIOS_MOCK, type ServidorBuscaMock } from "../portal-banco/fixtures.js";

// Dev shadow data — same identities as DEV_USERS in auth module, mirrored from sandbox adapter.
const DEV_SERVIDORES = [
  { id: 1, nome: "Ana Carolina Silva", cpf: "00011122233", matricula: "M-009821", prefeitura_id: 1, vinculo: "ESTATUTARIO" as const, situacao_funcional: "ATIVO" as const, status: "ativo" as const, idConvenio: "CONV-001", idMatricula: "MAT-231401", salarioLiquido: 4620 },
  { id: 2, nome: "Joao da Silva Neves", cpf: "00011122234", matricula: "M-009822", prefeitura_id: 2, vinculo: "ESTATUTARIO" as const, situacao_funcional: "ATIVO" as const, status: "ativo" as const, idConvenio: "CONV-002", idMatricula: "MAT-231402", salarioLiquido: 3820 },
];

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
