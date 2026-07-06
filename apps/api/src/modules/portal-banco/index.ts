import { Hono } from "hono";
import { z } from "zod";
import { calcCET, margemDisponivel, margemTotal } from "@atlas/domain";
import { authRequired, type JwtClaims } from "../../middleware/auth.js";
import { Errors, HttpError } from "../../_shared/errors.js";
import type { Env } from "../../env.js";
import { COMUNICADOS_MOCK, CONVENIOS_MOCK, SERVIDORES_BUSCA_MOCK } from "./fixtures.js";
import { prefeituras } from "../admin/index.js";
import { aplicarAcao, comprometeMargem, criarContratoOuReserva, getContrato, getContratoEventos, getContratoParcelas, listContratos, persistContrato, refreshContratos } from "./store.js";
import { listTabelas, getTabela, upsertTabela, removerTabela, listUsuarios, getUsuario, upsertUsuario, removerUsuario } from "./cadastros.js";

function requireBancoRole(j: JwtClaims): void {
  if (j.role !== "banco") throw Errors.forbidden("Requer perfil banco");
}

/**
 * Servidores que ENTRARAM EM CONTATO com o banco = quem tem contrato/reserva com
 * este bancoId. O banco NÃO acessa mais a base geral de servidores da prefeitura;
 * só enxerga quem solicitou uma operação a ele. Requer refreshContratos antes.
 */
function matriculasContato(bancoId: number): Set<string> {
  return new Set(listContratos({}).filter((ct) => ct.bancoId === bancoId).map((ct) => ct.matricula));
}

function currentCompetencia(): { mes: number; ano: number; yyyymm: string } {
  const d = new Date();
  const mes = d.getMonth() + 1;
  const ano = d.getFullYear();
  return { mes, ano, yyyymm: `${ano}${String(mes).padStart(2, "0")}` };
}

async function getActiveConvenioId(env: Env, j: JwtClaims): Promise<string> {
  const key = `banco_convenio:${j.banco_id}:${j.sub}`;
  const stored = env.KV_CACHE ? await env.KV_CACHE.get(key) : null;
  if (stored) return stored;
  const first = CONVENIOS_MOCK.find((c) => c.bancoId === j.banco_id);
  return first?.id ?? CONVENIOS_MOCK[0]!.id;
}

function monthLabel(mes: number): string {
  return ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][mes - 1] ?? "";
}

function projecoesQuatroMeses(mes: number, ano: number): { mes: number; ano: number; yyyymm: string }[] {
  const arr: { mes: number; ano: number; yyyymm: string }[] = [];
  for (let i = 1; i <= 4; i++) {
    const m = ((mes - 1 + i) % 12) + 1;
    const yearOffset = Math.floor((mes - 1 + i) / 12);
    const y = ano + yearOffset;
    arr.push({ mes: m, ano: y, yyyymm: `${y}${String(m).padStart(2, "0")}` });
  }
  return arr;
}

const OperacaoTipoSchema = z.enum(["EMPRESTIMO", "REFIN", "COMPOSTA", "PORTABILIDADE"]);

const NovoContratoBody = z.object({
  idMatricula: z.string(),
  valor: z.number().min(100),
  parcelas: z.number().int().min(1).max(120),
  taxaAm: z.number().min(0).max(1),
  diasCarencia: z.number().int().min(0).max(180).default(0),
  observacoes: z.string().optional(),
  // refin / portabilidade
  contratoOrigem: z.string().optional(),
  bancoOrigem: z.string().optional(),
  saldoDevedorOrigem: z.number().optional(),
  // composta
  valorRefin: z.number().optional(),
});

export const portalBancoRoutes = new Hono<{ Bindings: Env; Variables: { jwt: JwtClaims; trace_id: string } }>()
  // Escopado ao próprio prefixo — `.use("*")` vazaria para /v1/external/* quando montado em "/".
  .use("/v1/portal/banco/*", authRequired)

  // --------- Convenio switcher ----------
  .get("/v1/portal/banco/convenios", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const ativos = CONVENIOS_MOCK.filter((cv) => cv.bancoId === j.banco_id && cv.ativo !== false);
    const activeId = await getActiveConvenioId(c.env, j);
    return c.json({
      // Inclui as exigências que a prefeitura de cada convênio impõe ao averbar
      // (CCB e/ou 2FA), pra o front condicionar o fluxo de averbação.
      convenios: ativos.map((cv) => {
        const pref = prefeituras.find((p) => p.id === cv.prefeituraId);
        return { id: cv.id, nome: cv.nome, prefeitura: cv.prefeitura, uf: cv.uf, exigeCcb: pref?.exigeCcb ?? false, exigeBanco2FA: pref?.exigeBanco2FA ?? false };
      }),
      activeId,
    });
  })
  .post("/v1/portal/banco/convenio-ativo", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const { convenioId } = z.object({ convenioId: z.string() }).parse(await c.req.json());
    const valid = CONVENIOS_MOCK.find((cv) => cv.id === convenioId && cv.bancoId === j.banco_id);
    if (!valid) throw Errors.notFound("convenio");
    if (c.env.KV_CACHE) {
      await c.env.KV_CACHE.put(`banco_convenio:${j.banco_id}:${j.sub}`, convenioId, { expirationTtl: 60 * 60 * 24 * 7 });
    }
    return c.json({ activeId: convenioId });
  })

  // --------- Visao Geral ----------
  .get("/v1/portal/banco/visao-geral", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const activeId = await getActiveConvenioId(c.env, j);
    const conv = CONVENIOS_MOCK.find((cv) => cv.id === activeId)!;
    const contratos = listContratos({ convenioId: activeId });
    const ativos = contratos.filter((ct) => ct.situacao === "Ativo").length;
    const pendentes = contratos.filter((ct) => ct.situacao.startsWith("Aguardando")).length;
    return c.json({
      convenio: { id: conv.id, nome: conv.nome, prefeitura: conv.prefeitura },
      kpis: {
        carteira: { count: ativos, percentual: 1 },
        novosNoMes: { count: contratos.filter((ct) => ct.lancamento.includes("/06/")).length },
        pendencias: { count: pendentes },
      },
      dataCorte: {
        dia: conv.dataCorte,
        mes: monthLabel(currentCompetencia().mes),
        origem: conv.prefeitura.toUpperCase(),
        operacoes: "EMPRESTIMO",
      },
    });
  })

  // --------- Comunicados ----------
  .get("/v1/portal/banco/comunicados", async (c) => {
    requireBancoRole(c.get("jwt"));
    return c.json({ comunicados: COMUNICADOS_MOCK });
  })

  // --------- Busca por CPF ou Matricula ----------
  .post("/v1/portal/banco/margem/buscar", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const body = z
      .object({
        cpf: z.string().optional(),
        matricula: z.string().optional(),
      })
      .refine((b) => !!b.cpf || !!b.matricula, "cpf_ou_matricula_obrigatorio")
      .parse(await c.req.json());
    // O banco só acessa quem entrou em contato com ele (tem contrato/reserva).
    await refreshContratos(c.env);
    const contatos = matriculasContato(j.banco_id ?? 1);
    const cpfNorm = body.cpf?.replace(/\D/g, "");
    const matchPred = (s: typeof SERVIDORES_BUSCA_MOCK[number]) =>
      cpfNorm ? s.cpf === cpfNorm : body.matricula ? s.matricula === body.matricula : false;
    // Busca só entre os contatos do banco (não na base geral da prefeitura).
    const found = SERVIDORES_BUSCA_MOCK.find((s) => contatos.has(s.matricula) && matchPred(s));
    if (found) {
      // LGPD: o banco não vê o salário líquido — só a MARGEM disponível.
      // Comprometido = parcelas de operações já APROVADAS pelo banco (não conta
      // reserva/proposta pendente) — assim o banco enxerga a margem real que sobra.
      const { salarioLiquido, ...ficha } = found;
      const comprometido = listContratos({ matricula: found.matricula })
        .filter((ct) => comprometeMargem(ct.situacao))
        .reduce((a, ct) => a + ct.valorParcela, 0);
      const margemDisponivelValor = Math.round(margemDisponivel(salarioLiquido, comprometido, "EMPRESTIMO") * 100) / 100;
      return c.json({ ficha: { ...ficha, margemDisponivel: margemDisponivelValor } });
    }
    throw new HttpError(
      404,
      "not_found",
      `Nenhum servidor com ${cpfNorm ? `CPF ${body.cpf}` : `matricula ${body.matricula}`} entrou em contato com o banco. O banco só acessa servidores que solicitaram uma operação (proposta/averbação).`,
      {},
    );
  })

  // --------- Exemplos de busca (auxilia debug e demo) ----------
  .get("/v1/portal/banco/margem/exemplos", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const activeConv = await getActiveConvenioId(c.env, j);
    const activeConvNome = CONVENIOS_MOCK.find((cv) => cv.id === activeConv)?.nome ?? activeConv;
    // Só os servidores que entraram em contato com o banco (não a base da prefeitura).
    await refreshContratos(c.env);
    const contatos = matriculasContato(j.banco_id ?? 1);
    const noConvenio = SERVIDORES_BUSCA_MOCK.filter((s) => contatos.has(s.matricula))
      .slice(0, 6)
      .map((s) => ({ nome: s.nome, matricula: s.matricula, cpf: s.cpf, cpfMasked: s.cpfMasked, idConvenio: s.idConvenio }));
    // Nada de "outros convênios": o banco não navega mais a base de servidores.
    return c.json({ activeConvenioId: activeConv, activeConvenioNome: activeConvNome, noConvenio, outrosConvenios: [] });
  })

  // --------- Calcular margem para uma competencia ----------
  .post("/v1/portal/banco/margem/:idMatricula/calcular", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const body = z
      .object({ mes: z.number().int().min(1).max(12), ano: z.number().int() })
      .parse(await c.req.json());
    const idMatricula = c.req.param("idMatricula");
    const s = SERVIDORES_BUSCA_MOCK.find((x) => x.idMatricula === idMatricula);
    if (!s) throw Errors.notFound("colaborador");
    // Só calcula margem de quem contatou o banco.
    await refreshContratos(c.env);
    if (!matriculasContato(j.banco_id ?? 1).has(s.matricula)) {
      throw Errors.forbidden("Este servidor não entrou em contato com o banco.");
    }
    const total = margemTotal(s.salarioLiquido, "EMPRESTIMO");
    // Comprometido real = parcelas de operações já aprovadas pelo banco.
    const comprometido = Math.round(
      listContratos({ matricula: s.matricula })
        .filter((ct) => comprometeMargem(ct.situacao))
        .reduce((a, ct) => a + ct.valorParcela, 0) * 100,
    ) / 100;
    const disponivel = margemDisponivel(s.salarioLiquido, comprometido, "EMPRESTIMO");
    const projecao = projecoesQuatroMeses(body.mes, body.ano).map((p, idx) => ({
      competencia: p.yyyymm,
      rotulo: `${monthLabel(p.mes)}/${p.ano}`,
      valor: disponivel + idx * 12.5,
    }));
    return c.json({
      competencia: `${body.ano}${String(body.mes).padStart(2, "0")}`,
      tipo: "EMPRESTIMO",
      total,
      disponivel,
      projecao,
    });
  })

  // --------- Listagem de contratos (Gerenciador + da ficha) ----------
  .get("/v1/portal/banco/contratos", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const activeConv = await getActiveConvenioId(c.env, j);
    await refreshContratos(c.env); // vê propostas/reservas criadas pelo servidor em outros isolates
    const url = new URL(c.req.url);
    const colaborador = url.searchParams.get("colaborador");
    const filtroSituacao: string[] = [];
    for (const [k, v] of url.searchParams.entries()) {
      if (k.startsWith("situacao_")) filtroSituacao.push(v);
    }
    const rows = listContratos({
      convenioId: activeConv,
      matricula: colaborador ?? undefined,
      situacao: filtroSituacao.length ? filtroSituacao : undefined,
    });
    // Todos os contratos do banco que estejam em situacao "viva" (aguardando
    // decisao, ativo, liberado) aparecem independente do convenio ativo do
    // switcher. Sem isso, quando o operador troca de convenio depois de
    // aprovar uma proposta, ela some do /banco/propostas, /banco/carteira e
    // /banco/adf — servidor ve a operacao mas banco nao consegue mais achar.
    const bancoId = j.banco_id ?? 1;
    const outrosConvenios = listContratos({}).filter((ct) => {
      if (ct.bancoId !== bancoId) return false;
      if (rows.some((r) => r.adf === ct.adf)) return false; // ja incluida via filtro principal
      const s = ct.situacao.toLowerCase();
      return s.includes("aguard") || s.includes("ativo") || s.includes("libera") || s.includes("averb");
    });
    const contratos = [...outrosConvenios, ...rows];
    return c.json({ contratos, total: contratos.length });
  })

  // --------- Detalhe contrato ----------
  .get("/v1/portal/banco/contratos/:adf", async (c) => {
    requireBancoRole(c.get("jwt"));
    const adf = c.req.param("adf");
    await refreshContratos(c.env);
    const ct = getContrato(adf);
    if (!ct) throw Errors.notFound("contrato");
    return c.json({
      contrato: ct,
      parcelas: getContratoParcelas(ct),
      eventos: getContratoEventos(adf),
    });
  })

  // --------- Averbar / Reservar ----------
  .post("/v1/portal/banco/contratos/averbar/:tipo", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const tipo = OperacaoTipoSchema.parse(c.req.param("tipo")?.toUpperCase());
    const body = NovoContratoBody.parse(await c.req.json());
    const ct = await persistir(j, c.env, tipo, body, false);
    await persistContrato(c.env, ct.adf);
    return c.json(ct);
  })
  .post("/v1/portal/banco/contratos/reservar/:tipo", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const tipo = OperacaoTipoSchema.parse(c.req.param("tipo")?.toUpperCase());
    const body = NovoContratoBody.parse(await c.req.json());
    const ct = await persistir(j, c.env, tipo, body, true);
    await persistContrato(c.env, ct.adf);
    return c.json(ct);
  })

  // --------- Acoes em contratos ----------
  .post("/v1/portal/banco/contratos/:adf/:acao", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const adf = c.req.param("adf");
    const acao = z.enum(["quitar", "suspender", "cancelar", "alongar", "alterar", "confirmar"]).parse(c.req.param("acao"));
    const raw = c.req.header("content-type")?.includes("json") ? await c.req.json().catch(() => ({})) : {};
    const body = z
      .object({ motivo: z.string().optional(), parcelasExtras: z.number().int().optional(), observacoes: z.string().optional(), codigoVerba: z.string().optional() })
      .parse(raw);
    await refreshContratos(c.env); // garante que o contrato/reserva (de outro isolate) esteja no Map antes de agir
    const r = aplicarAcao(adf, acao, `user:${j.sub}`, body.motivo, body);
    if (!r) throw Errors.notFound("contrato");
    await persistContrato(c.env, adf); // write-through: decisão do banco persiste e o servidor vê
    return c.json({ contrato: r });
  })

  // --------- Comprovante PDF ----------
  .get("/v1/portal/banco/contratos/:adf/comprovante.pdf", async (c) => {
    requireBancoRole(c.get("jwt"));
    const adf = c.req.param("adf");
    const ct = getContrato(adf);
    if (!ct) throw Errors.notFound("contrato");
    // Minimal PDF placeholder. Production would render via @react-pdf/renderer + upload to R2 + signed URL.
    const pdf = miniPdf(`COMPROVANTE ATLAS\n\nADF: ${ct.adf}\nNome: ${ct.nome}\nMatricula: ${ct.matricula}\nValor parcela: R$ ${ct.valorParcela.toFixed(2)}\nParcelas: ${ct.totalParcelas}\nTaxa: ${(ct.taxaAm * 100).toFixed(2)}% a.m.\nCET: ${(ct.cetAm * 100).toFixed(2)}% a.m.`);
    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="comprovante-${ct.adf}.pdf"`,
      },
    });
  })

  // --------- Cadastros: Tabela de Emprestimos ----------
  .get("/v1/portal/banco/cadastros/tabela-emprestimos", async (c) => {
    requireBancoRole(c.get("jwt"));
    return c.json({ tabelas: await listTabelas(c.env) });
  })
  .get("/v1/portal/banco/cadastros/tabela-emprestimos/:id", async (c) => {
    requireBancoRole(c.get("jwt"));
    const t = await getTabela(c.env, c.req.param("id"));
    if (!t) throw Errors.notFound("tabela");
    return c.json({ tabela: t });
  })
  .post("/v1/portal/banco/cadastros/tabela-emprestimos", async (c) => {
    requireBancoRole(c.get("jwt"));
    const body = z
      .object({
        id: z.string().optional(),
        convenioId: z.string(),
        convenio: z.string(),
        taxaMinAm: z.number().min(0).max(1),
        taxaMaxAm: z.number().min(0).max(1),
        prazoMaxMeses: z.number().int().min(1).max(240),
        vigenciaInicio: z.string(),
        vigenciaFim: z.string().optional(),
        ativo: z.boolean().default(true),
      })
      .parse(await c.req.json());
    return c.json({ tabela: await upsertTabela(c.env, body) });
  })
  .delete("/v1/portal/banco/cadastros/tabela-emprestimos/:id", async (c) => {
    requireBancoRole(c.get("jwt"));
    if (!(await removerTabela(c.env, c.req.param("id")))) throw Errors.notFound("tabela");
    return c.body(null, 204);
  })

  // --------- Cadastros: Usuarios do banco ----------
  .get("/v1/portal/banco/cadastros/usuarios", async (c) => {
    requireBancoRole(c.get("jwt"));
    const u = new URL(c.req.url);
    const perfil = u.searchParams.get("perfil") as "admin" | "operador" | "consulta" | "relatorios" | null;
    const somenteAdmin = u.searchParams.get("somenteAdmin") === "true";
    // PII hygiene: nunca devolver cpf na listagem; so cpfMasked.
    const usuarios = listUsuarios({ perfil: perfil ?? undefined, somenteAdmin }).map(({ cpf: _cpf, ...rest }) => rest);
    return c.json({ usuarios });
  })
  .get("/v1/portal/banco/cadastros/usuarios/:id", async (c) => {
    requireBancoRole(c.get("jwt"));
    const u = getUsuario(c.req.param("id"));
    if (!u) throw Errors.notFound("usuario");
    const { cpf: _cpf, ...rest } = u;
    return c.json({ usuario: rest });
  })
  .get("/v1/portal/banco/cadastros/usuarios/:id/cpf", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const u = getUsuario(c.req.param("id"));
    if (!u) throw Errors.notFound("usuario");
    // Audit append-only para acesso a PII (LGPD).
    console.info(JSON.stringify({
      ts: new Date().toISOString(),
      level: "warn",
      source: "banco.usuarios.reveal-cpf",
      trace_id: c.get("trace_id"),
      actor: `user:${j.sub}`,
      banco_id: j.banco_id,
      target_user: u.id,
      target_codigo: u.codigo,
      message: `User ${j.sub} (banco_id=${j.banco_id}) revealed CPF of usuario ${u.id}`,
    }));
    return c.json({ id: u.id, cpf: u.cpf, cpfMasked: u.cpfMasked });
  })
  .post("/v1/portal/banco/cadastros/usuarios", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const body = z
      .object({
        id: z.string().optional(),
        nome: z.string().min(3),
        email: z.string(),
        cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 digitos").optional(),
        cpfMasked: z.string().optional().default("***.***.***-**"),
        organizacao: z.string().default("DELTA GLOBAL"),
        perfil: z.enum(["admin", "operador", "consulta", "relatorios"]),
        ipsPermitidos: z.array(z.string()).default([]),
        ativo: z.boolean().default(true),
      })
      .parse(await c.req.json());
    const saved = upsertUsuario({ ...body, bancoId: j.banco_id ?? 1 });
    const { cpf: _cpf, ...rest } = saved;
    return c.json({ usuario: rest });
  })
  .delete("/v1/portal/banco/cadastros/usuarios/:id", async (c) => {
    requireBancoRole(c.get("jwt"));
    if (!removerUsuario(c.req.param("id"))) throw Errors.notFound("usuario");
    return c.body(null, 204);
  })

  // --------- Relatorios ----------
  .get("/v1/portal/banco/relatorios/consignacoes", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const activeConv = await getActiveConvenioId(c.env, j);
    const url = new URL(c.req.url);
    const tipo = url.searchParams.get("tipo");
    const inicio = url.searchParams.get("inicio");
    const fim = url.searchParams.get("fim");
    let rows = listContratos({ convenioId: activeConv });
    if (tipo) rows = rows.filter((r) => r.tipoContrato === tipo);
    if (inicio || fim) {
      // simples: nao calcula intervalos, apenas sinaliza
    }
    const total = rows.reduce((acc, r) => acc + r.valorFinanciado, 0);
    return c.json({
      filtros: { tipo, inicio, fim, convenioId: activeConv },
      linhas: rows,
      totalValorFinanciado: Math.round(total * 100) / 100,
      quantidade: rows.length,
    });
  })
  .get("/v1/portal/banco/relatorios/faturamento", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const activeConv = await getActiveConvenioId(c.env, j);
    const contratos = listContratos({ convenioId: activeConv });
    // Apuracao mensal simulada: agrupa pela folha primeiro desconto.
    const grupos = new Map<string, { competencia: string; contratos: number; valorFinanciado: number; comissaoEstimada: number }>();
    for (const c of contratos) {
      const key = c.folhaPrimeiroDesconto;
      const cur = grupos.get(key) ?? { competencia: key, contratos: 0, valorFinanciado: 0, comissaoEstimada: 0 };
      cur.contratos += 1;
      cur.valorFinanciado += c.valorFinanciado;
      cur.comissaoEstimada += c.valorFinanciado * 0.02;
      grupos.set(key, cur);
    }
    return c.json({
      convenioId: activeConv,
      meses: Array.from(grupos.values()).map((g) => ({
        ...g,
        valorFinanciado: Math.round(g.valorFinanciado * 100) / 100,
        comissaoEstimada: Math.round(g.comissaoEstimada * 100) / 100,
      })),
    });
  })

  // --------- /me ----------
  .get("/v1/portal/banco/me", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    return c.json({
      user_id: Number(j.sub),
      banco_id: j.banco_id,
      role: j.role,
      perfil: "operador",
    });
  });

async function persistir(
  j: JwtClaims,
  env: Env,
  tipo: "EMPRESTIMO" | "REFIN" | "COMPOSTA" | "PORTABILIDADE",
  body: z.infer<typeof NovoContratoBody>,
  isReserva: boolean,
) {
  await refreshContratos(env); // sincroniza contador de adf entre isolates antes de criar
  const activeConvenioId = await getActiveConvenioId(env, j);
  const conv = CONVENIOS_MOCK.find((c) => c.id === activeConvenioId);
  const colaborador = SERVIDORES_BUSCA_MOCK.find((s) => s.idMatricula === body.idMatricula);
  if (!conv || !colaborador) throw Errors.notFound("colaborador_ou_convenio");
  const cet = calcCET({ valor: body.valor, parcelas: body.parcelas, taxaMensal: body.taxaAm });
  const tipoContrato = tipo === "COMPOSTA" ? "EMPRESTIMO" : tipo === "PORTABILIDADE" ? "REFIN" : (tipo as "EMPRESTIMO" | "REFIN");
  return criarContratoOuReserva({
    bancoId: j.banco_id ?? 1,
    servidorId: 1,
    idMatricula: colaborador.idMatricula,
    matricula: colaborador.matricula,
    nome: colaborador.nome,
    cpfMasked: colaborador.cpfMasked,
    convenioId: conv.id,
    convenio: conv.nome,
    tipoContrato,
    valorFinanciado: body.valor,
    parcelas: body.parcelas,
    taxaAm: body.taxaAm,
    cetAm: cet.mensal,
    iof: cet.iof,
    diasCarencia: body.diasCarencia,
    valorParcela: Math.round(cet.parcela * 100) / 100,
    codigoVerba: conv.codigoVerba,
    observacoes: body.observacoes,
    isReserva,
    bancoOrigem: body.bancoOrigem,
    contratoOrigem: body.contratoOrigem,
    saldoDevedorOrigem: body.saldoDevedorOrigem,
    ator: `user:${j.sub}`,
  });
}

function miniPdf(text: string): Uint8Array {
  // Smallest valid one-page PDF. Production replace with @react-pdf/renderer.
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const lines = text.split("\n");
  let y = 760;
  const stream = lines.map((l) => `BT /F1 11 Tf 60 ${y -= 16} Td (${esc(l)}) Tj ET`).join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const o of objects) {
    offsets.push(body.length);
    body += o + "\n";
  }
  const xrefOffset = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    body += String(off).padStart(10, "0") + " 00000 n \n";
  }
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(body);
}
