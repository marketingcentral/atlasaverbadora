// Portal da Prefeitura — a prefeitura é a fonte primária dos dados: envia a base de
// servidores, atualiza a folha mensal, define regras de convênio, recebe ADFs e as
// aplica em folha. Todos os endpoints são escopados pela prefeitura do JWT (prefeitura_id)
// e todas as mutações são reais (tocam os mesmos stores que os bancos leem).

import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import { authRequired, type JwtClaims } from "../../middleware/auth.js";
import { Errors } from "../../_shared/errors.js";
import type { Env } from "../../env.js";
import { margemTotal } from "@atlas/domain";
import { parseCsv, buildCsv, type ImportOutcome } from "../../_shared/csv.js";
import { bancos, folhas, prefeituras, type FolhaAdmin } from "../admin/index.js";
import { CONVENIOS_MOCK, COMUNICADOS_MOCK, SERVIDORES_BUSCA_MOCK, prefeituraIdDe, type ServidorBuscaMock } from "../portal-banco/fixtures.js";
import { listContratos } from "../portal-banco/store.js";
import { appendAudit } from "../admin/auditoria.js";
import { getConvenioConfig, upsertConvenioConfig, listConvenioConfigs } from "../admin/convenios-config.js";
import { getIdUnicoConfig, upsertIdUnicoConfig } from "../admin/id-unico.js";
import { importTombamento, listLotes, listLinhas } from "../admin/tombamento.js";
import {
  applyMovimentacao, listMovimentacoes, countMovimentacoes, type MovimentacaoTipo,
  ensureAdfs, listAdfs, listAdfCompetencias, setAdfStatus,
  TERMO_VERSAO_ATUAL, TERMO_TEXTO, listAnuencias, anuenciaVigente, registrarAnuencia,
  listPerfis, upsertPerfil, deletePerfil, rotateTotp, disable2FA, sanitizePerfil, AREA_LABEL, type PrefeituraArea,
} from "./store.js";

function requirePrefeitura(j: JwtClaims): number {
  if (j.role !== "prefeitura") throw Errors.forbidden("Requer perfil prefeitura");
  if (j.prefeitura_id == null) throw Errors.forbidden("Token sem prefeitura_id");
  return j.prefeitura_id;
}

function bancoNome(id: number): string {
  return bancos.find((b) => b.id === id)?.nome ?? `Banco ${id}`;
}

function servidoresDaPrefeitura(prefeituraId: number): ServidorBuscaMock[] {
  const p = prefeituras.find((x) => x.id === prefeituraId);
  if (!p) return [];
  // Escopo por prefeituraId (não por substring de `origem`) — assim o mesmo CPF
  // em prefeituras diferentes aparece só na sua prefeitura.
  return SERVIDORES_BUSCA_MOCK.filter((s) => prefeituraIdDe(s) === prefeituraId);
}

function conveniosDaPrefeitura(prefeituraId: number) {
  return CONVENIOS_MOCK.filter((cv) => cv.prefeituraId === prefeituraId);
}

function contratosDaPrefeitura(prefeituraId: number) {
  const ids = new Set(conveniosDaPrefeitura(prefeituraId).map((cv) => cv.id));
  return listContratos().filter((ct) => ids.has(ct.convenioId));
}

/** Comprometido (soma de parcelas ativas) por matrícula. */
function comprometidoDe(matricula: string, contratos: ReturnType<typeof listContratos>): number {
  return contratos
    .filter((ct) => ct.matricula === matricula && !["cancelado", "quitado"].includes(ct.situacao.toLowerCase()))
    .reduce((acc, ct) => acc + ct.valorParcela, 0);
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function csvResp(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${filename}"` },
  });
}

async function readCsvBody(c: Context): Promise<string> {
  const ct = c.req.header("content-type") ?? "";
  if (ct.includes("application/json")) {
    const j = (await c.req.json().catch(() => ({}))) as { csv?: string };
    return j.csv ?? "";
  }
  return await c.req.text();
}

/** Minimal single-page PDF with monospaced text lines (no external deps). */
function miniPdf(title: string, lines: string[]): Uint8Array {
  const esc = (s: string) => s.replace(/([\\()])/g, "\\$1");
  const body = [title, "", ...lines];
  const text = body.map((l, i) => `${i === 0 ? "" : "T* "}(${esc(l)}) Tj`).join("\n");
  const stream = `BT /F1 10 Tf 40 800 Td 12 TL\n${text}\nET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

const VINCULOS = ["CLT", "ESTATUTARIO", "COMISSIONADO", "APOSENTADO", "PENSIONISTA"] as const;

// CSV templates são públicos (arquivos de exemplo, sem dados reais) — assim o
// link de download simples (<a href download>) funciona sem header de auth.
export const prefeituraPublicRoutes = new Hono<{ Bindings: Env }>()
  .get("/v1/prefeitura/servidores/csv-template", () => {
    const csv = buildCsv(
      ["nome", "cpf", "email", "telefone", "matricula", "cargo", "vinculo", "endereco", "codigoIbge", "salarioLiquido", "idConvenio"],
      [{ nome: "MARIA DA SILVA", cpf: "00099988877", email: "maria@ex.com", telefone: "48999990000", matricula: "900123", cargo: "Professora", vinculo: "ESTATUTARIO", endereco: "Rua A, 100 - Centro", codigoIbge: 4211900, salarioLiquido: 4200, idConvenio: "CONV-001" }],
    );
    return csvResp("servidores-modelo.csv", csv);
  })
  .get("/v1/prefeitura/folhas/movimentacao/csv-template", () => {
    const csv = buildCsv(
      ["tipo", "matricula", "cpf", "nome", "cargoNovo", "salarioNovo", "detalhe"],
      [
        { tipo: "promocao", matricula: "852029100", cpf: "", nome: "", cargoNovo: "Coordenadora", salarioNovo: 5200, detalhe: "Promoção por antiguidade" },
        { tipo: "demissao", matricula: "843796302", cpf: "", nome: "", cargoNovo: "", salarioNovo: "", detalhe: "Exoneração" },
        { tipo: "admissao", matricula: "900500", cpf: "00055566677", nome: "NOVO SERVIDOR", cargoNovo: "Auxiliar", salarioNovo: 2800, detalhe: "Admissão" },
      ],
    );
    return csvResp("movimentacao-modelo.csv", csv);
  })
  .get("/v1/prefeitura/tombamento/csv-template", () => {
    const csv = buildCsv(
      ["cpf", "matricula", "nome", "banco", "numeroContrato", "valorParcela", "totalParcelas", "parcelasRestantes", "valorEmprestimo", "status", "motivo", "tipo"],
      [{ cpf: "73345725304", matricula: "00000230", nome: "MARIA DO SOCORRO LOPES FARIAS", banco: "104-Caixa Economica Federal", numeroContrato: "10994802", valorParcela: "164,00", totalParcelas: 120, parcelasRestantes: 120, valorEmprestimo: "R$ 7.944,97", status: "Averbação Confirmada", motivo: "Dívidas", tipo: "Novo" }],
    );
    return csvResp("tombamento-modelo.csv", csv);
  });

export const prefeituraRoutes = new Hono<{ Bindings: Env; Variables: { jwt: JwtClaims } }>()
  .use("/v1/prefeitura/*", authRequired)

  // ===== Identidade =====
  .get("/v1/prefeitura/me", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const p = prefeituras.find((x) => x.id === id);
    if (!p) throw Errors.notFound("prefeitura");
    return c.json({ prefeitura: { id: p.id, nome: p.nome, uf: p.uf, municipioIbge: p.municipioIbge, status: p.status } });
  })

  // ===== Passo 2 — Dashboard (com pendências de upload) =====
  .get("/v1/prefeitura/dashboard", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const p = prefeituras.find((x) => x.id === id);
    if (!p) throw Errors.notFound("prefeitura");
    const servidores = servidoresDaPrefeitura(id);
    const contratos = contratosDaPrefeitura(id);
    const convenios = conveniosDaPrefeitura(id);
    const folhasPref = folhas.filter((f) => f.prefeituraId === id);
    const ativos = servidores.filter((s) => !["DESLIGADO", "APOSENTADO"].includes(s.situacaoFuncional.toUpperCase()));

    let margemTotalAgg = 0, margemComprometidaAgg = 0, descontosMes = 0;
    for (const s of servidores) {
      const total = margemTotal(s.salarioLiquido, "EMPRESTIMO");
      const comprometido = comprometidoDe(s.matricula, contratos);
      margemTotalAgg += total;
      margemComprometidaAgg += Math.min(comprometido, total);
      descontosMes += comprometido;
    }

    const folhaAtual = folhasPref.find((f) => f.status === "aberta") ?? folhasPref[folhasPref.length - 1];
    const pendencias = {
      folhasAbertas: folhasPref.filter((f) => f.status === "aberta").length,
      servidoresSemConvenio: servidores.filter((s) => !s.idConvenio).length,
      anuenciaPendente: anuenciaVigente(id) ? 0 : 1,
    };

    return c.json({
      prefeitura: { id: p.id, nome: p.nome, uf: p.uf },
      kpis: {
        servidores: servidores.length,
        servidoresAtivos: ativos.length,
        contratosAverbados: contratos.length,
        convenios: convenios.length,
        bancosAtuantes: new Set(contratos.map((ct) => ct.bancoId)).size,
        descontosMes: r2(descontosMes),
        margemTotal: r2(margemTotalAgg),
        margemComprometida: r2(margemComprometidaAgg),
        margemDisponivel: r2(margemTotalAgg - margemComprometidaAgg),
        percentualUso: margemTotalAgg > 0 ? r2(margemComprometidaAgg / margemTotalAgg) : 0,
      },
      folhaAtual: folhaAtual ? { competencia: folhaAtual.competencia, status: folhaAtual.status, dataCorte: folhaAtual.dataCorte, dataRepasse: folhaAtual.dataRepasse } : null,
      pendencias,
      folhas: folhasPref.map((f) => ({ competencia: f.competencia, dataCorte: f.dataCorte, dataRepasse: f.dataRepasse, status: f.status })),
    });
  })

  // ===== Passo 6 — Servidores (consulta) =====
  .get("/v1/prefeitura/servidores", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const q = c.req.query("q")?.toLowerCase();
    const vinculo = c.req.query("vinculo");
    const situacao = c.req.query("situacao");
    const contratos = contratosDaPrefeitura(id);
    const rows = servidoresDaPrefeitura(id)
      .filter((s) => !q || s.nome.toLowerCase().includes(q) || s.cpfMasked.includes(q) || s.matricula.includes(q))
      .filter((s) => !vinculo || s.vinculo === vinculo)
      .filter((s) => !situacao || s.situacaoFuncional === situacao)
      .map((s) => {
        const total = margemTotal(s.salarioLiquido, "EMPRESTIMO");
        const comprometido = Math.min(comprometidoDe(s.matricula, contratos), total);
        return {
          matricula: s.matricula, nome: s.nome, cpf: s.cpf, cpfMasked: s.cpfMasked, vinculo: s.vinculo,
          situacaoFuncional: s.situacaoFuncional, salarioLiquido: s.salarioLiquido, idConvenio: s.idConvenio,
          cargo: s.cargo ?? "", endereco: s.endereco ?? "", email: s.email ?? "", telefone: s.telefone ?? "",
          codigoIbge: s.codigoIbge ?? null,
          margemTotal: r2(total), margemDisponivel: r2(total - comprometido),
          contratos: contratos.filter((ct) => ct.matricula === s.matricula).length,
        };
      });
    return c.json({ servidores: rows, total: rows.length });
  })

  // ===== Passo 3 — Cadastro inicial da base de servidores (CSV) =====
  .post("/v1/prefeitura/servidores/importar", async (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const p = prefeituras.find((x) => x.id === id)!;
    const conveniosPref = conveniosDaPrefeitura(id);
    const defaultConvenioId = conveniosPref[0]?.id ?? "";
    const { rows } = parseCsv(await readCsvBody(c));
    const out: ImportOutcome<{ matricula: string; nome: string; cpfMasked: string }> = { inserted: 0, updated: 0, skipped: 0, errors: [], rows: [] };
    rows.forEach((r, idx) => {
      const line = idx + 2;
      // Planilhas de Excel perdem o zero a esquerda do CPF (numero). Repadroniza
      // pra 11 digitos antes de validar, senao CPFs como "4019228396" falhariam.
      let cpf = (r.cpf ?? "").replace(/\D/g, "");
      if (cpf.length > 0 && cpf.length < 11) cpf = cpf.padStart(11, "0");
      // Validação de campos obrigatórios (passo 3).
      if (!r.nome) return void out.errors.push({ line, message: "nome obrigatorio" });
      if (cpf.length !== 11) return void out.errors.push({ line, message: "cpf deve ter 11 digitos" });
      if (!r.matricula) return void out.errors.push({ line, message: "matricula obrigatoria" });
      if (!r.cargo) return void out.errors.push({ line, message: "cargo obrigatorio" });
      const vinculo = (r.vinculo || "ESTATUTARIO").toUpperCase();
      if (!VINCULOS.includes(vinculo as (typeof VINCULOS)[number])) return void out.errors.push({ line, message: `vinculo invalido (${VINCULOS.join("/")})` });
      let idConvenio = (r.idConvenio ?? "").trim();
      if (!conveniosPref.some((cv) => cv.id === idConvenio)) idConvenio = defaultConvenioId;
      if (!idConvenio) return void out.errors.push({ line, message: `${p.nome} nao possui convenios` });
      const salario = Number(r.salarioLiquido);
      const ibge = Number(r.codigoIbge);
      // Identidade é (prefeituraId, matricula) — nunca só CPF. Assim o mesmo CPF
      // pode ser cadastrado em outra prefeitura (acumulação de cargos) sem colisão.
      const existing = SERVIDORES_BUSCA_MOCK.find((s) => s.matricula === r.matricula && prefeituraIdDe(s) === id);
      const rec: ServidorBuscaMock = {
        cpf, cpfMasked: `${cpf.slice(0, 3)}.***.***-${cpf.slice(-2)}`,
        matricula: r.matricula!, idMatricula: `MAT-${r.matricula!}`, prefeituraId: id, nome: r.nome!,
        dataAdmissao: r.dataAdmissao ?? "", dataNascimento: r.dataNascimento ?? "",
        vinculo, origem: p.nome, situacaoFuncional: r.situacaoFuncional ?? "TRABALHANDO",
        salarioLiquido: Number.isFinite(salario) ? salario : 0, idConvenio,
        email: r.email || undefined, telefone: r.telefone || undefined, cargo: r.cargo,
        endereco: r.endereco || undefined, codigoIbge: Number.isFinite(ibge) ? ibge : p.municipioIbge,
      };
      if (existing) { Object.assign(existing, rec); out.updated++; } else { SERVIDORES_BUSCA_MOCK.push(rec); out.inserted++; }
      out.rows.push({ matricula: rec.matricula, nome: rec.nome, cpfMasked: rec.cpfMasked });
    });
    appendAudit({ categoria: "dados_pessoais", acao: "base_importada", userId: `prefeitura:${id}`, userRole: "prefeitura", detalhes: `${p.nome}: base importada — ${out.inserted} inseridos, ${out.updated} atualizados, ${out.errors.length} erros.` });
    return c.json(out);
  })

  // ===== Passo 6 — Editar campos críticos (só a prefeitura) =====
  .patch("/v1/prefeitura/servidores/:matricula", async (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const matricula = c.req.param("matricula");
    const s = servidoresDaPrefeitura(id).find((x) => x.matricula === matricula);
    if (!s) throw Errors.notFound("servidor");
    const body = z.object({
      nome: z.string().min(2).optional(),
      cpf: z.string().optional(),
      cargo: z.string().min(1).optional(),
      endereco: z.string().optional(),
      matriculaNova: z.string().min(1).optional(),
      vinculo: z.enum(VINCULOS).optional(),
      email: z.string().email().optional().or(z.literal("")),
      telefone: z.string().optional(),
      codigoIbge: z.number().int().optional(),
    }).parse(await c.req.json());
    const changed: string[] = [];
    if (body.nome !== undefined) { s.nome = body.nome; changed.push("nome"); }
    if (body.cpf !== undefined) {
      let cpf = body.cpf.replace(/\D/g, "");
      if (cpf.length > 0 && cpf.length < 11) cpf = cpf.padStart(11, "0");
      if (cpf.length !== 11) throw Errors.validation({ cpf: "CPF deve ter 11 digitos" });
      // Só bloqueia se o CPF já existir NESTA prefeitura (outra matrícula) — o mesmo
      // CPF em prefeitura diferente é acúmulo legal de cargos e é permitido.
      const dup = SERVIDORES_BUSCA_MOCK.find((x) => x.cpf === cpf && x !== s && prefeituraIdDe(x) === prefeituraIdDe(s));
      if (dup) throw Errors.validation({ cpf: `CPF ja em uso nesta prefeitura pela matricula ${dup.matricula}` });
      s.cpf = cpf; s.cpfMasked = `${cpf.slice(0, 3)}.***.***-${cpf.slice(-2)}`; changed.push("cpf");
    }
    if (body.cargo !== undefined) { s.cargo = body.cargo; changed.push("cargo"); }
    if (body.endereco !== undefined) { s.endereco = body.endereco || undefined; changed.push("endereco"); }
    if (body.vinculo !== undefined) { s.vinculo = body.vinculo; changed.push("vinculo"); }
    if (body.email !== undefined) { s.email = body.email || undefined; changed.push("email"); }
    if (body.telefone !== undefined) { s.telefone = body.telefone || undefined; changed.push("telefone"); }
    if (body.codigoIbge !== undefined) { s.codigoIbge = body.codigoIbge; changed.push("codigoIbge"); }
    if (body.matriculaNova !== undefined && body.matriculaNova !== s.matricula) {
      const dup = SERVIDORES_BUSCA_MOCK.find((x) => x.matricula === body.matriculaNova);
      if (dup) throw Errors.validation({ matriculaNova: `matricula ${body.matriculaNova} já em uso` });
      s.matricula = body.matriculaNova; s.idMatricula = `MAT-${body.matriculaNova}`; changed.push("matricula");
    }
    appendAudit({ categoria: "dados_pessoais", acao: "servidor_editado", matricula: s.matricula, cpf: s.cpfMasked, userId: `prefeitura:${id}`, userRole: "prefeitura", detalhes: `Servidor ${s.matricula} editado pela prefeitura (${changed.join(",")}).` });
    return c.json({ servidor: { matricula: s.matricula, nome: s.nome, cpf: s.cpf, cpfMasked: s.cpfMasked, cargo: s.cargo ?? "", endereco: s.endereco ?? "", vinculo: s.vinculo, email: s.email ?? "", telefone: s.telefone ?? "", codigoIbge: s.codigoIbge ?? null } });
  })

  // ===== Passo 4 — Folha mensal =====
  .get("/v1/prefeitura/folhas", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const rows = folhas.filter((f) => f.prefeituraId === id).map((f) => ({ ...f, movimentacoes: countMovimentacoes(f.id) }));
    return c.json({ folhas: rows });
  })
  .post("/v1/prefeitura/folhas", async (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const p = prefeituras.find((x) => x.id === id)!;
    const body = z.object({
      competencia: z.string().regex(/^\d{6}$/, "competencia YYYYMM"),
      dataCorte: z.string().min(8),
      dataRepasse: z.string().min(8).optional(),
    }).parse(await c.req.json());
    if (folhas.some((f) => f.prefeituraId === id && f.competencia === body.competencia)) {
      throw Errors.validation({ competencia: `folha ${body.competencia} já existe` });
    }
    const folha: FolhaAdmin = {
      id: `F-${body.competencia}-${id}`, prefeituraId: id, prefeitura: p.nome,
      competencia: body.competencia, dataCorte: body.dataCorte, dataRepasse: body.dataRepasse ?? null, status: "aberta",
    };
    folhas.push(folha);
    appendAudit({ categoria: "margem", acao: "folha_aberta", userId: `prefeitura:${id}`, userRole: "prefeitura", detalhes: `Folha ${body.competencia} aberta (corte ${body.dataCorte}).` });
    return c.json({ folha }, 201);
  })
  .patch("/v1/prefeitura/folhas/:id", async (c) => {
    const pid = requirePrefeitura(c.get("jwt"));
    const f = folhas.find((x) => x.id === c.req.param("id") && x.prefeituraId === pid);
    if (!f) throw Errors.notFound("folha");
    const body = z.object({
      status: z.enum(["aberta", "fechada", "consolidada"]).optional(),
      dataCorte: z.string().optional(),
      dataRepasse: z.string().nullable().optional(),
    }).parse(await c.req.json());
    if (body.status) f.status = body.status;
    if (body.dataCorte) f.dataCorte = body.dataCorte;
    if (body.dataRepasse !== undefined) f.dataRepasse = body.dataRepasse;
    appendAudit({ categoria: "margem", acao: "folha_atualizada", userId: `prefeitura:${pid}`, userRole: "prefeitura", detalhes: `Folha ${f.competencia} -> status=${f.status}.` });
    return c.json({ folha: f });
  })
  .get("/v1/prefeitura/folhas/:id/movimentacoes", (c) => {
    requirePrefeitura(c.get("jwt"));
    return c.json({ movimentacoes: listMovimentacoes(c.req.param("id")) });
  })
  .post("/v1/prefeitura/folhas/:id/movimentacao", async (c) => {
    const pid = requirePrefeitura(c.get("jwt"));
    const f = folhas.find((x) => x.id === c.req.param("id") && x.prefeituraId === pid);
    if (!f) throw Errors.notFound("folha");
    if (f.status !== "aberta") throw Errors.validation({ folha: "só é possível movimentar folha aberta" });
    const { rows } = parseCsv(await readCsvBody(c));
    const now = new Date().toISOString();
    const out: ImportOutcome<{ matricula: string; tipo: string }> = { inserted: 0, updated: 0, skipped: 0, errors: [], rows: [] };
    const tipos: MovimentacaoTipo[] = ["admissao", "demissao", "aposentadoria", "promocao", "alteracao"];
    rows.forEach((r, idx) => {
      const line = idx + 2;
      const tipo = (r.tipo || "").toLowerCase() as MovimentacaoTipo;
      if (!tipos.includes(tipo)) return void out.errors.push({ line, message: `tipo invalido (${tipos.join("/")})` });
      if (!r.matricula) return void out.errors.push({ line, message: "matricula obrigatoria" });
      const salarioNovo = r.salarioNovo ? Number(r.salarioNovo) : undefined;
      const res = applyMovimentacao({
        folhaId: f.id, prefeituraId: pid, tipo, matricula: r.matricula,
        cargoNovo: r.cargoNovo || undefined, salarioNovo: Number.isFinite(salarioNovo) ? salarioNovo : undefined,
        detalhe: r.detalhe || undefined, nomeNovo: r.nome || undefined, cpf: r.cpf || undefined,
      }, now);
      if (!res.ok) return void out.errors.push({ line, message: res.error });
      out.inserted++;
      out.rows.push({ matricula: r.matricula, tipo });
    });
    appendAudit({ categoria: "margem", acao: "folha_movimentacao", userId: `prefeitura:${pid}`, userRole: "prefeitura", detalhes: `Folha ${f.competencia}: ${out.inserted} movimentações, ${out.errors.length} erros. Margem recalculada.` });
    return c.json(out);
  })

  // ===== Passo 5 — Configurações de convênio =====
  .get("/v1/prefeitura/convenios", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const idcfg = getIdUnicoConfig(id);
    const detalhado = conveniosDaPrefeitura(id).map((cv) => {
      const cfg = getConvenioConfig(cv.id);
      return {
        id: cv.id, nome: cv.nome, bancoNome: bancoNome(cv.bancoId), codigoVerba: cv.codigoVerba,
        dataCorte: cv.dataCorte, diaRepasse: cv.diaRepasse,
        prazoTravaHoras: cfg?.prazoTravaHoras ?? 48, prazoPortabilidadeDU: cfg?.prazoPortabilidadeDU ?? 7,
        prefixo: idcfg?.prefixo ?? "", formatoImportacao: cfg?.formatoImportacao ?? "CSV",
      };
    });
    return c.json({ convenios: detalhado, prefixo: idcfg?.prefixo ?? "" });
  })
  .get("/v1/prefeitura/convenios/:id/config", (c) => {
    const pid = requirePrefeitura(c.get("jwt"));
    const cv = conveniosDaPrefeitura(pid).find((x) => x.id === c.req.param("id"));
    if (!cv) throw Errors.notFound("convenio");
    const cfg = getConvenioConfig(cv.id);
    const idcfg = getIdUnicoConfig(pid);
    return c.json({
      convenio: { id: cv.id, nome: cv.nome, bancoNome: bancoNome(cv.bancoId) },
      config: {
        prazoTravaHoras: cfg?.prazoTravaHoras ?? 48,
        prazoPortabilidadeDU: cfg?.prazoPortabilidadeDU ?? 7,
        maxComprometimentoPct: cfg?.maxComprometimentoPct ?? 0.35,
        vinculosAceitos: cfg?.vinculosAceitos ?? ["ESTATUTARIO"],
        formatoImportacao: cfg?.formatoImportacao ?? "CSV",
        regrasEspeciais: cfg?.regrasEspeciais ?? "",
        prefixo: idcfg?.prefixo ?? "",
      },
    });
  })
  .put("/v1/prefeitura/convenios/:id/config", async (c) => {
    const pid = requirePrefeitura(c.get("jwt"));
    const cv = conveniosDaPrefeitura(pid).find((x) => x.id === c.req.param("id"));
    if (!cv) throw Errors.notFound("convenio");
    const body = z.object({
      prazoTravaHoras: z.number().int().min(1).max(720),
      prazoPortabilidadeDU: z.number().int().min(1).max(30),
      maxComprometimentoPct: z.number().min(0.05).max(0.7),
      vinculosAceitos: z.array(z.enum(VINCULOS)).min(1),
      formatoImportacao: z.enum(["CSV", "EXCEL", "API"]),
      regrasEspeciais: z.string().default(""),
      prefixo: z.string().min(2).max(5).regex(/^[A-Za-z]+$/, "prefixo só letras"),
    }).parse(await c.req.json());
    const prev = getConvenioConfig(cv.id);
    const cfg = upsertConvenioConfig({
      id: cv.id,
      prazoTravaHoras: body.prazoTravaHoras, prazoPortabilidadeDU: body.prazoPortabilidadeDU,
      maxComprometimentoPct: body.maxComprometimentoPct,
      maxParcelas: prev?.maxParcelas ?? 96, taxaMaxAm: prev?.taxaMaxAm ?? 1.8,
      idadeMin: prev?.idadeMin ?? 18, idadeMax: prev?.idadeMax ?? 80,
      vinculosAceitos: body.vinculosAceitos, formatoImportacao: body.formatoImportacao,
      regrasEspeciais: body.regrasEspeciais, vigenciaInicio: prev?.vigenciaInicio ?? "2026-01-01",
      vigenciaFim: prev?.vigenciaFim, ativo: prev?.ativo ?? true,
    });
    const idcfg = getIdUnicoConfig(pid);
    upsertIdUnicoConfig({
      prefeituraId: pid, prefixo: body.prefixo.toUpperCase(),
      formato: idcfg?.formato ?? "SEQ", larguraSeq: idcfg?.larguraSeq ?? 6,
      proximoSeq: idcfg?.proximoSeq ?? 1, separador: idcfg?.separador ?? "-",
    });
    appendAudit({ categoria: "convenio_config", acao: "config_atualizada", userId: `prefeitura:${pid}`, userRole: "prefeitura", detalhes: `Convenio ${cv.id}: trava=${body.prazoTravaHoras}h, portabilidade=${body.prazoPortabilidadeDU}DU, maxComp=${Math.round(body.maxComprometimentoPct * 100)}%, prefixo=${body.prefixo.toUpperCase()}.` });
    return c.json({ config: cfg, prefixo: body.prefixo.toUpperCase() });
  })

  // ===== Passo 7 — Contratos / Tombamento =====
  .get("/v1/prefeitura/contratos", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const rows = contratosDaPrefeitura(id).map((ct) => ({
      adf: ct.adf, bancoNome: bancoNome(ct.bancoId), matricula: ct.matricula, nome: ct.nome,
      situacao: ct.situacao, tipoContrato: ct.tipoContrato, valorParcela: ct.valorParcela,
      totalParcelas: ct.totalParcelas, lancamento: ct.lancamento,
    }));
    return c.json({ contratos: rows, total: rows.length });
  })
  .get("/v1/prefeitura/tombamento/lotes", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    return c.json({ lotes: listLotes({ prefeituraId: id }) });
  })
  .get("/v1/prefeitura/tombamento/lotes/:id/linhas", (c) => {
    requirePrefeitura(c.get("jwt"));
    return c.json({ linhas: listLinhas(c.req.param("id")) });
  })
  .post("/v1/prefeitura/tombamento/importar", async (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const p = prefeituras.find((x) => x.id === id)!;
    const competencia = c.req.query("competencia") || new Date().toISOString().slice(0, 7).replace("-", "");
    const csv = await readCsvBody(c);
    const res = importTombamento({ prefeituraId: id, prefeituraNome: p.nome, competencia, recebidoPor: `prefeitura:${id}`, csv });
    appendAudit({ categoria: "tombamento", acao: "lote_importado", userId: `prefeitura:${id}`, userRole: "prefeitura", detalhes: `Lote ${res.lote.id} (${p.nome}/${competencia}): ${res.inseridos} inseridos, ${res.atualizados} atualizados, ${res.divergencias} divergências, ${res.erros.length} erros.` });
    return c.json(res);
  })

  // ===== Passo 8 — ADF / Descontos em folha =====
  .get("/v1/prefeitura/adf/competencias", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const competenciaAtual = folhas.filter((f) => f.prefeituraId === id).sort((a, b) => b.competencia.localeCompare(a.competencia))[0]?.competencia ?? new Date().toISOString().slice(0, 7).replace("-", "");
    ensureAdfs(id, competenciaAtual, bancoNome, new Date().toISOString());
    return c.json({ competencias: listAdfCompetencias(id), competenciaAtual });
  })
  .get("/v1/prefeitura/adf", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const competencia = c.req.query("competencia") || undefined;
    if (competencia) ensureAdfs(id, competencia, bancoNome, new Date().toISOString());
    return c.json({ adfs: listAdfs(id, competencia) });
  })
  .get("/v1/prefeitura/adf/:competencia/download.csv", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const competencia = c.req.param("competencia");
    ensureAdfs(id, competencia, bancoNome, new Date().toISOString());
    const adfs = listAdfs(id, competencia);
    const csv = buildCsv(
      ["adf", "idUnico", "cpf", "matricula", "nome", "banco", "valorParcela", "totalParcelas", "status"],
      adfs.map((a) => ({ adf: a.adf, idUnico: a.idUnico, cpf: a.cpfMasked, matricula: a.matricula, nome: a.nome, banco: a.bancoNome, valorParcela: a.valorParcela, totalParcelas: a.totalParcelas, status: a.status })),
    );
    return csvResp(`adf-${competencia}.csv`, csv);
  })
  .get("/v1/prefeitura/adf/:competencia/lote.pdf", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const competencia = c.req.param("competencia");
    ensureAdfs(id, competencia, bancoNome, new Date().toISOString());
    const adfs = listAdfs(id, competencia);
    const total = adfs.reduce((s, a) => s + a.valorParcela, 0);
    const lines = [
      `Competencia: ${competencia}`,
      `Total de ADFs: ${adfs.length}   Valor total das parcelas: R$ ${total.toFixed(2)}`,
      "",
      "ADF        ID UNICO         CPF             PARCELA   STATUS",
      ...adfs.slice(0, 40).map((a) => `${a.adf.padEnd(10)} ${a.idUnico.padEnd(16)} ${a.cpfMasked.padEnd(15)} ${String(a.valorParcela).padStart(8)}  ${a.status}`),
    ];
    const pdf = miniPdf("ATLAS — LOTE DE ADFs (DESCONTOS EM FOLHA)", lines);
    return new Response(pdf, { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="adf-lote-${competencia}.pdf"` } });
  })
  .post("/v1/prefeitura/adf/confirmar", async (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const body = z.object({ ids: z.array(z.string()).min(1) }).parse(await c.req.json());
    const n = setAdfStatus(id, body.ids, "aplicada", undefined, new Date().toISOString());
    appendAudit({ categoria: "margem", acao: "adf_aplicada", userId: `prefeitura:${id}`, userRole: "prefeitura", detalhes: `${n} ADFs confirmadas/aplicadas em folha.` });
    return c.json({ aplicadas: n });
  })
  .post("/v1/prefeitura/adf/falha", async (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const body = z.object({ ids: z.array(z.string()).min(1), motivo: z.string().min(3) }).parse(await c.req.json());
    const n = setAdfStatus(id, body.ids, "falha", body.motivo, new Date().toISOString());
    appendAudit({ categoria: "margem", acao: "adf_falha", userId: `prefeitura:${id}`, userRole: "prefeitura", detalhes: `${n} ADFs marcadas como falha: ${body.motivo}.` });
    return c.json({ falhas: n });
  })

  // ===== Passo 9 — Relatórios =====
  .get("/v1/prefeitura/relatorios/servidores-por-vinculo", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const map = new Map<string, number>();
    for (const s of servidoresDaPrefeitura(id)) map.set(s.vinculo, (map.get(s.vinculo) ?? 0) + 1);
    return c.json({ dados: Array.from(map, ([vinculo, total]) => ({ vinculo, total })).sort((a, b) => b.total - a.total) });
  })
  .get("/v1/prefeitura/relatorios/margem-media", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const servidores = servidoresDaPrefeitura(id);
    const contratos = contratosDaPrefeitura(id);
    let totalMargem = 0, totalDisponivel = 0;
    for (const s of servidores) {
      const total = margemTotal(s.salarioLiquido, "EMPRESTIMO");
      totalMargem += total;
      totalDisponivel += Math.max(0, total - comprometidoDe(s.matricula, contratos));
    }
    const nn = servidores.length || 1;
    return c.json({ servidores: servidores.length, margemMediaTotal: r2(totalMargem / nn), margemMediaDisponivel: r2(totalDisponivel / nn), percentualUsoMedio: totalMargem > 0 ? r2((totalMargem - totalDisponivel) / totalMargem) : 0 });
  })
  .get("/v1/prefeitura/relatorios/contratos-por-banco", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const map = new Map<number, { banco: string; contratos: number; valorParcela: number }>();
    for (const ct of contratosDaPrefeitura(id)) {
      const g = map.get(ct.bancoId) ?? { banco: bancoNome(ct.bancoId), contratos: 0, valorParcela: 0 };
      g.contratos++; g.valorParcela += ct.valorParcela; map.set(ct.bancoId, g);
    }
    return c.json({ dados: Array.from(map.values()).map((g) => ({ ...g, valorParcela: r2(g.valorParcela) })).sort((a, b) => b.contratos - a.contratos) });
  })
  .get("/v1/prefeitura/relatorios/inconsistencias", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const servidores = servidoresDaPrefeitura(id);
    const problemas: { matricula: string; nome: string; problema: string }[] = [];
    for (const s of servidores) {
      if (!s.idConvenio) problemas.push({ matricula: s.matricula, nome: s.nome, problema: "sem convênio" });
      if (!s.cargo) problemas.push({ matricula: s.matricula, nome: s.nome, problema: "sem cargo" });
      if (!s.email) problemas.push({ matricula: s.matricula, nome: s.nome, problema: "sem e-mail" });
      if (s.salarioLiquido <= 0) problemas.push({ matricula: s.matricula, nome: s.nome, problema: "salário zerado" });
    }
    return c.json({ inconsistencias: problemas, total: problemas.length });
  })

  // ===== Passo 10 — Anuência de dados =====
  .get("/v1/prefeitura/anuencia", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const vigente = anuenciaVigente(id);
    return c.json({ versaoAtual: TERMO_VERSAO_ATUAL, termo: TERMO_TEXTO, vigente: vigente ?? null, historico: listAnuencias(id) });
  })
  .post("/v1/prefeitura/anuencia", async (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const j = c.get("jwt");
    const body = z.object({ aceito: z.literal(true), aceitoPor: z.string().min(2) }).parse(await c.req.json());
    const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? undefined;
    const anu = registrarAnuencia({ prefeituraId: id, aceitoPor: body.aceitoPor, ip }, new Date().toISOString());
    appendAudit({ categoria: "termo_aceite", acao: "anuencia_base", termoAceito: TERMO_VERSAO_ATUAL, ip, userId: `prefeitura:${j.sub}`, userRole: "prefeitura", detalhes: `Anuência de uso da base aceita por ${body.aceitoPor} (${TERMO_VERSAO_ATUAL}).` });
    return c.json({ anuencia: anu }, 201);
  })

  // ===== Passo 1 — Perfis por área + 2FA =====
  .get("/v1/prefeitura/perfis", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    return c.json({ perfis: listPerfis(id).map(sanitizePerfil), areas: Object.entries(AREA_LABEL).map(([value, label]) => ({ value, label })) });
  })
  .post("/v1/prefeitura/perfis", async (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const body = z.object({
      id: z.number().int().optional(),
      nome: z.string().min(2), email: z.string().email(),
      area: z.enum(["rh", "financeiro", "gestor"]), ativo: z.boolean().optional(),
    }).parse(await c.req.json());
    const perfil = upsertPerfil({ prefeituraId: id, ...body, area: body.area as PrefeituraArea }, new Date().toISOString());
    return c.json({ perfil: sanitizePerfil(perfil) }, body.id ? 200 : 201);
  })
  .delete("/v1/prefeitura/perfis/:id", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    if (!deletePerfil(id, Number(c.req.param("id")))) throw Errors.notFound("perfil");
    return c.body(null, 204);
  })
  .post("/v1/prefeitura/perfis/:id/2fa/rotate", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    const r = rotateTotp(id, Number(c.req.param("id")));
    if (!r) throw Errors.notFound("perfil");
    appendAudit({ categoria: "acesso", acao: "2fa_rotate", userId: `prefeitura:${id}`, userRole: "prefeitura", detalhes: `2FA (TOTP) rotacionado para perfil ${c.req.param("id")}.` });
    return c.json(r);
  })
  .post("/v1/prefeitura/perfis/:id/2fa/disable", (c) => {
    const id = requirePrefeitura(c.get("jwt"));
    if (!disable2FA(id, Number(c.req.param("id")))) throw Errors.notFound("perfil");
    return c.json({ ok: true });
  })

  .get("/v1/prefeitura/comunicados", (c) => {
    requirePrefeitura(c.get("jwt"));
    // Reaproveita a lista compartilhada (COMUNICADOS_MOCK) mas re-aponta os
    // links para rotas validas no portal da prefeitura. O mock original tinha
    // links tipo '/banco/cadastros' que sao invisiveis para o perfil prefeitura.
    const remap: Record<string, { linkHref?: string; linkLabel?: string }> = {
      "COM-1": { linkHref: "/prefeitura/convenios", linkLabel: "Ver convenios" },
      "COM-2": { linkHref: "/prefeitura/materiais", linkLabel: "Baixar materiais" },
    };
    const comunicados = COMUNICADOS_MOCK.map((c) => {
      const patch = remap[c.id];
      return patch ? { ...c, ...patch } : c;
    });
    return c.json({ comunicados });
  });

// Silence unused import in case tree-shaking complains.
void listConvenioConfigs;
