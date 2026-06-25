// Portal da Prefeitura — read-only. Todos os endpoints são escopados pela
// prefeitura do JWT (claim prefeitura_id). Reusa os stores do admin/fixtures.

import { Hono } from "hono";
import { authRequired, type JwtClaims } from "../../middleware/auth.js";
import { Errors } from "../../_shared/errors.js";
import type { Env } from "../../env.js";
import { margemTotal, margemDisponivel } from "@atlas/domain";
import { bancos, folhas, prefeituras } from "../admin/index.js";
import { CONVENIOS_MOCK, COMUNICADOS_MOCK, SERVIDORES_BUSCA_MOCK } from "../portal-banco/fixtures.js";
import { listContratos } from "../portal-banco/store.js";

function requirePrefeitura(j: JwtClaims): number {
  if (j.role !== "prefeitura") throw Errors.forbidden("Requer perfil prefeitura");
  if (j.prefeitura_id == null) throw Errors.forbidden("Token sem prefeitura_id");
  return j.prefeitura_id;
}

/** Servidores que pertencem a esta prefeitura (match por origem ~ nome da prefeitura). */
function servidoresDaPrefeitura(prefeituraId: number) {
  const p = prefeituras.find((x) => x.id === prefeituraId);
  if (!p) return [];
  return SERVIDORES_BUSCA_MOCK.filter((s) => s.origem.toLowerCase().includes(p.nome.toLowerCase()));
}

/** Convênios desta prefeitura. */
function conveniosDaPrefeitura(prefeituraId: number) {
  return CONVENIOS_MOCK.filter((cv) => cv.prefeituraId === prefeituraId);
}

/** Contratos cujos convênios pertencem a esta prefeitura. */
function contratosDaPrefeitura(prefeituraId: number) {
  const ids = new Set(conveniosDaPrefeitura(prefeituraId).map((cv) => cv.id));
  return listContratos().filter((ct) => ids.has(ct.convenioId));
}

export const prefeituraRoutes = new Hono<{ Bindings: Env; Variables: { jwt: JwtClaims } }>()
  // Escopado ao próprio prefixo (nunca `.use("*")` — vaza para outras rotas).
  .use("/v1/prefeitura/*", authRequired)

  .get("/v1/prefeitura/me", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const p = prefeituras.find((x) => x.id === id);
    if (!p) throw Errors.notFound("prefeitura");
    return c.json({ prefeitura: { id: p.id, nome: p.nome, uf: p.uf, municipioIbge: p.municipioIbge, status: p.status } });
  })

  .get("/v1/prefeitura/dashboard", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const p = prefeituras.find((x) => x.id === id);
    if (!p) throw Errors.notFound("prefeitura");
    const servidores = servidoresDaPrefeitura(id);
    const contratos = contratosDaPrefeitura(id);
    const convenios = conveniosDaPrefeitura(id);
    const folhasPref = folhas.filter((f) => f.prefeituraId === id);

    // Margem agregada (EMPRESTIMO) — total vs comprometido somado dos servidores.
    let margemTotalAgg = 0;
    let margemComprometidaAgg = 0;
    for (const s of servidores) {
      const total = margemTotal(s.salarioLiquido, "EMPRESTIMO");
      const comprometido = contratos
        .filter((ct) => ct.matricula === s.matricula && !["cancelado", "quitado"].includes(ct.situacao.toLowerCase()))
        .reduce((acc, ct) => acc + ct.valorParcela, 0);
      margemTotalAgg += total;
      margemComprometidaAgg += Math.min(comprometido, total);
    }
    const r2 = (n: number) => Math.round(n * 100) / 100;

    return c.json({
      prefeitura: { id: p.id, nome: p.nome, uf: p.uf },
      kpis: {
        servidores: servidores.length,
        contratosAverbados: contratos.length,
        convenios: convenios.length,
        bancosAtuantes: new Set(contratos.map((ct) => ct.bancoId)).size,
        margemTotal: r2(margemTotalAgg),
        margemComprometida: r2(margemComprometidaAgg),
        margemDisponivel: r2(margemTotalAgg - margemComprometidaAgg),
        percentualUso: margemTotalAgg > 0 ? r2(margemComprometidaAgg / margemTotalAgg) : 0,
      },
      folhas: folhasPref.map((f) => ({ competencia: f.competencia, dataCorte: f.dataCorte, dataRepasse: f.dataRepasse, status: f.status })),
    });
  })

  .get("/v1/prefeitura/servidores", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const q = c.req.query("q")?.toLowerCase();
    const rows = servidoresDaPrefeitura(id)
      .filter((s) => !q || s.nome.toLowerCase().includes(q) || s.cpfMasked.includes(q) || s.matricula.includes(q))
      .map((s) => ({
        matricula: s.matricula,
        nome: s.nome,
        cpfMasked: s.cpfMasked,
        vinculo: s.vinculo,
        situacaoFuncional: s.situacaoFuncional,
        salarioLiquido: s.salarioLiquido,
        idConvenio: s.idConvenio,
      }));
    return c.json({ servidores: rows, total: rows.length });
  })

  .get("/v1/prefeitura/folhas", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    return c.json({ folhas: folhas.filter((f) => f.prefeituraId === id) });
  })

  .get("/v1/prefeitura/convenios", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const detalhado = conveniosDaPrefeitura(id).map((cv) => ({
      id: cv.id,
      nome: cv.nome,
      bancoNome: bancos.find((b) => b.id === cv.bancoId)?.nome ?? "—",
      codigoVerba: cv.codigoVerba,
      dataCorte: cv.dataCorte,
      diaRepasse: cv.diaRepasse,
    }));
    return c.json({ convenios: detalhado });
  })

  .get("/v1/prefeitura/contratos", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const rows = contratosDaPrefeitura(id).map((ct) => ({
      adf: ct.adf,
      bancoNome: bancos.find((b) => b.id === ct.bancoId)?.nome ?? `Banco ${ct.bancoId}`,
      matricula: ct.matricula,
      nome: ct.nome,
      situacao: ct.situacao,
      tipoContrato: ct.tipoContrato,
      valorParcela: ct.valorParcela,
      totalParcelas: ct.totalParcelas,
      lancamento: ct.lancamento,
    }));
    return c.json({ contratos: rows, total: rows.length });
  })

  .get("/v1/prefeitura/comunicados", (c) => {
    requirePrefeitura(c.get("jwt"));
    return c.json({ comunicados: COMUNICADOS_MOCK });
  });
