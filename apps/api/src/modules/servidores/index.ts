import { Hono } from "hono";
import { z } from "zod";
import { maskCPF, margemDisponivel, margemTotal, percentualUso, calcCET } from "@atlas/domain";
import { authRequired, requireRole, type JwtClaims } from "../../middleware/auth.js";
import { Errors, HttpError } from "../../_shared/errors.js";
import type { Env } from "../../env.js";
import { SERVIDORES_BUSCA_MOCK, CONVENIOS_MOCK, COMUNICADOS_MOCK, type ServidorBuscaMock } from "../portal-banco/fixtures.js";
import { bancos, prefeituras, ensureServidoresLoaded, ensureBancosLoaded, ensureVitrineLoaded, getServidorStatus, pushEvent, vitrine } from "../admin/index.js";
import { listContratos, criarContratoOuReserva, persistContrato, refreshContratos, comprometeMargem, deriveTipoMargem, getContrato } from "../portal-banco/store.js";
import { refreshOfertas, loadOfertas, ofertaCasaComServidor } from "../portal-banco/ofertas-store.js";
import { refreshBeneficios, loadBeneficios } from "../admin/beneficios-store.js";
import { loadCliques, refreshCliques, persistClique, nextCliqueId, type BeneficioClique } from "../admin/beneficio-cliques-store.js";
import { refreshComunicados } from "../portal-banco/comunicados-store.js";
import { listTabelas } from "../portal-banco/cadastros.js";
import { sha256Hex } from "../admin/api-tokens.js";
import { enviarCodigo, enviarNotificacao } from "../admin/mailer.js";
import { gerarCodigoUnico } from "../admin/codes.js";
import { setServidorPassword, setServidorContato } from "../../db/repos.js";

/** Mascara um e-mail: "diego@x.com" -> "di•••@x.com". */
function maskEmailSrv(email?: string): string {
  if (!email || !email.includes("@")) return "seu e-mail";
  const [user = "", domain = ""] = email.split("@");
  return `${user.slice(0, 2)}•••@${domain}`;
}
function code6(): string {
  const b = new Uint8Array(4);
  crypto.getRandomValues(b);
  const n = ((b[0]! << 24) | (b[1]! << 16) | (b[2]! << 8) | b[3]!) >>> 0;
  return String(100000 + (n % 900000));
}

// Dev shadow data — mirrors the SERVIDORES_BUSCA_MOCK identities (source of truth used
// by todos os outros perfis), para o servidor ver os MESMOS dados.
const DEV_SERVIDORES = [
  { id: 1, nome: "ADRIANA MARQUES DA SILVA", cpf: "00011122233", matricula: "852029100", prefeitura_id: 1, vinculo: "ESTATUTARIO" as const, situacao_funcional: "ATIVO" as const, status: "ativo" as const, idConvenio: "CONV-001", idMatricula: "MAT-852029100", salarioLiquido: 4620 },
  { id: 2, nome: "FERNANDA KELLI TOMAZONI", cpf: "00011122234", matricula: "843796302", prefeitura_id: 2, vinculo: "ESTATUTARIO" as const, situacao_funcional: "ATIVO" as const, status: "ativo" as const, idConvenio: "CONV-002", idMatricula: "MAT-843796302", salarioLiquido: 5320 },
];

const round2 = (n: number) => Math.round(n * 100) / 100;
const bancoNome = (id: number) => bancos.find((b) => b.id === id)?.nome ?? `Banco ${id}`;
const brlFmt = (n: number) => `R$ ${round2(n).toFixed(2).replace(".", ",")}`;

/** Dispara uma notificação por e-mail sem segurar a resposta (best-effort). */
function notifyServidor(
  c: { env: Env; executionCtx: { waitUntil(p: Promise<unknown>): void } },
  email: string | undefined,
  n: { titulo: string; mensagem: string; detalhes?: { label: string; valor: string }[] },
): void {
  if (!email) return;
  const p = enviarNotificacao(c.env, { destinoPadrao: email, ...n });
  try {
    c.executionCtx.waitUntil(p);
  } catch {
    void p; // sem executionCtx: dispara e esquece
  }
}

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
  // Margem comprometida JA NA PROPOSTA — assim que o servidor aceita o termo,
  // a parcela sai da margem disponivel do BUCKET correspondente (evita
  // solicitar 2 operacoes sobrepondo a mesma margem). So volta se a proposta
  // for recusada/expirada/cancelada.
  const ativos = contratos.filter((ct) => comprometeMargem(ct.situacao));
  // Comprometido POR BUCKET — cartao consignado nao desconta da margem de
  // emprestimo (e vice-versa), sao servicos independentes com 3 buckets:
  // EMPRESTIMO (35%), CARTAO_CONSIGNADO (5%), CARTAO_BENEFICIOS (5%).
  const comprometidoPorTipo: Record<"EMPRESTIMO" | "CARTAO_CONSIGNADO" | "CARTAO_BENEFICIOS", number> = {
    EMPRESTIMO: 0, CARTAO_CONSIGNADO: 0, CARTAO_BENEFICIOS: 0,
  };
  for (const ct of ativos) {
    const bucket = deriveTipoMargem(ct);
    comprometidoPorTipo[bucket] += ct.valorParcela;
  }
  // Total comprometido de emprestimo (pra retro-compat no campo comprometido raiz).
  const comprometido = comprometidoPorTipo.EMPRESTIMO;
  const margens = (["EMPRESTIMO", "CARTAO_CONSIGNADO", "CARTAO_BENEFICIOS"] as const).map((tipo) => ({
    tipo,
    total: round2(margemTotal(e.salarioLiquido, tipo)),
    disponivel: round2(margemDisponivel(e.salarioLiquido, comprometidoPorTipo[tipo], tipo)),
  }));
  const emp = margens.find((m) => m.tipo === "EMPRESTIMO")!;
  // A aba Contratos mostra só contratos REAIS: aprovados (vigentes) ou quitados.
  // Pendentes ("Aguardando") vivem em "Em análise"; recusados/cancelados/expirados/suspensos
  // no Histórico (via lista de propostas). Sem este filtro, uma proposta pendente ou recusada
  // aparecia como "contrato ativo" — e duplicava no Histórico.
  const isContratoReal = (situacao: string) => {
    const s = situacao.toLowerCase();
    if (s.includes("aguard") || s.includes("cancel") || s.includes("recus") || s.includes("expir") || s.includes("suspens")) {
      return false;
    }
    return true; // ativo / averbado / vigente / quitado
  };
  // Recentes primeiro — cliente pediu contratos averbados em ordem cronologica
  // decrescente (o de hoje aparece no topo, historico mais antigo desce).
  // ct.lancamento vem "DD/MM/YYYY" — inverte pra "YYYY-MM-DD" que compara direto.
  const parseLanc = (s: string): string => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
  };
  const contratosMock = contratos
    .filter((ct) => isContratoReal(ct.situacao))
    .sort((a, b) => parseLanc(b.lancamento).localeCompare(parseLanc(a.lancamento)))
    .map((ct) => ({
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
    // Flag da prefeitura: se true, servidor pode editar email/telefone; se false,
    // esconde botao Editar em /servidor/conta. Default false = mais restritivo.
    permiteServidorEditarContato: pref?.permiteServidorEditarContato ?? false,
    /** Condicoes exclusivas do cartao consignado dessa prefeitura, se houver. */
    exclusividadesCartaoConsig: pref?.exclusividadesCartaoConsig ?? "",
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
  if (dev) {
    // Prefer the Postgres-hydrated row for this identity (SERVIDORES_BUSCA_MOCK is
    // replaced by loadServidores() em ensureServidoresLoaded). Fall back ao shadow dev.
    // Um mesmo CPF pode estar em >1 convênio/prefeitura — casa pelo convênio do dev
    // (determinístico) pra o servidor cair sempre na prefeitura esperada (login),
    // senão a ordem do Postgres decide e o ciclo com a prefeitura logada não bate.
    const fx =
      SERVIDORES_BUSCA_MOCK.find((s) => s.cpf === dev.cpf && s.idConvenio === dev.idConvenio) ??
      SERVIDORES_BUSCA_MOCK.find((s) => s.cpf === dev.cpf);
    return fx ? fromFixture(fx) : { ...dev, fromFixture: true };
  }
  // ids sintéticos (últimos 5 dígitos da idMatricula) usados quando o servidor vem da fixture
  const fx = SERVIDORES_BUSCA_MOCK.find((s) => Number(s.idMatricula.replace(/\D/g, "").slice(-5)) === id);
  return fx ? fromFixture(fx) : null;
}

export const servidoresRoutes = new Hono<{ Bindings: Env; Variables: { jwt: JwtClaims; trace_id: string } }>()
  // Escopado ao próprio prefixo — `.use("*")` vazaria para /v1/external/* quando montado em "/".
  .use("/v1/servidores/*", authRequired)
  .get("/v1/servidores/me", async (c) => {
    const j = c.get("jwt");
    requireRoleInline(j, ["servidor"]);
    await ensureServidoresLoaded(c.env);
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
    await ensureServidoresLoaded(c.env);
    const s = resolveServidor(j);
    if (!s) throw Errors.notFound("servidor");

    // Margem derivada da folha (salário do Postgres) pelas regras do domínio. Na era
    // sandbox o banco não conhece a idMatricula real; quando o adapter iFractal entrar,
    // trocar por bank.getMargens(session, s.idMatricula, competencia).
    const margens = (["EMPRESTIMO", "CARTAO_CONSIGNADO", "CARTAO_BENEFICIOS"] as const).map((tipo) => ({
      tipo,
      total: Math.round(margemTotal(s.salarioLiquido, tipo) * 100) / 100,
      disponivel: Math.round(margemDisponivel(s.salarioLiquido, 0, tipo) * 100) / 100,
    }));

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
    await ensureServidoresLoaded(c.env);
    await ensureBancosLoaded(c.env);
    const s = resolveServidor(j);
    if (!s) throw Errors.notFound("servidor");
    // Filtra matriculas arquivadas (soft-delete) — a averbadora pode arquivar
    // uma matricula fantasma (ex.: registro criado por import do CSV de exemplo)
    // e a partir daqui ela some do switcher do servidor sem apagar do banco.
    const entries = SERVIDORES_BUSCA_MOCK.filter((x) => x.cpf === s.cpf);
    const withStatus = await Promise.all(
      entries.map(async (e) => ({ e, status: await getServidorStatus(c.env, e.matricula) })),
    );
    const matriculas = withStatus
      .filter(({ status }) => status !== "arquivado")
      .map(({ e }) => buildMatriculaInfo(e));
    return c.json({ matriculas });
  })
  // Ofertas ATIVAS criadas pelos bancos que casam com o perfil do servidor
  // (convenio, vinculo, situacao funcional, prefeitura, salario, idade). Vira
  // notificacao no sino do servidor. Fonte de verdade: admin_ofertas.
  .get("/v1/servidores/me/ofertas-banco", async (c) => {
    const j = c.get("jwt");
    requireRoleInline(j, ["servidor"]);
    await ensureServidoresLoaded(c.env);
    const s = resolveServidor(j);
    if (!s) throw Errors.notFound("servidor");
    await refreshOfertas(c.env);
    // Aceita ?matricula=X pra respeitar o switcher do app (mesmo tratamento
    // do endpoint /me/ofertas). Sem esse param, cai na matricula do JWT.
    const url = new URL(c.req.url);
    const matAtiva = url.searchParams.get("matricula");
    const entryAtivo = matAtiva
      ? SERVIDORES_BUSCA_MOCK.find((x) => x.cpf === s.cpf && x.matricula === matAtiva)
      : SERVIDORES_BUSCA_MOCK.find((x) => x.matricula === s.matricula);
    const conv = entryAtivo ? CONVENIOS_MOCK.find((cv) => cv.id === entryAtivo.idConvenio) : undefined;
    const salarioBase = entryAtivo?.salarioLiquido ?? s.salarioLiquido ?? 0;
    // Ofertas de cartao consig/beneficio so podem casar com quem AINDA tem espaco
    // na margem correspondente (5% cada, regulado). Fatia C.
    const margemCartaoConsig = salarioBase > 0 ? margemDisponivel(salarioBase, 0, "CARTAO_CONSIGNADO") : undefined;
    const margemCartaoBenef = salarioBase > 0 ? margemDisponivel(salarioBase, 0, "CARTAO_BENEFICIOS") : undefined;
    const perfil = {
      idConvenio: entryAtivo?.idConvenio,
      vinculo: s.vinculo,
      situacaoFuncional: s.situacao_funcional,
      prefeituraId: conv?.prefeituraId ?? s.prefeitura_id,
      salarioLiquido: salarioBase,
      margemCartaoConsig,
      margemCartaoBenef,
    };
    const list = (await loadOfertas(c.env)).filter((o) => ofertaCasaComServidor(o, perfil));
    // enriquece com nome do banco pra UI
    const nomeBanco = (id: number) => bancos.find((b) => b.id === id)?.nome ?? `Banco ${id}`;
    return c.json({
      ofertas: list.map((o) => ({
        id: o.id,
        bancoId: o.bancoId,
        bancoNome: nomeBanco(o.bancoId),
        titulo: o.titulo,
        mensagem: o.mensagem,
        taxaAm: o.taxaAm,
        parcelasMax: o.parcelasMax,
        valorMax: o.valorMax,
        criadoEm: o.criadoEm,
        expiraEm: o.expiraEm ?? null,
        icone: o.icone ?? null,
        tipo: o.tipo ?? "credito_novo",
      })),
    });
  })
  // Solicitacao de cartao (consignado ou beneficio). Fatia C — nao cria contrato
  // tradicional (o modelo de contrato ainda so aceita EMPRESTIMO/REFIN/ECONSIGNADO).
  // Registra a solicitacao como evento pra averbadora + notifica o banco emissor
  // via canal proprio. Em prod isso viraria um pipeline especifico de cartao.
  .post("/v1/servidores/me/cartoes", async (c) => {
    const j = c.get("jwt");
    requireRoleInline(j, ["servidor"]);
    await ensureServidoresLoaded(c.env);
    await ensureBancosLoaded(c.env);
    const s = resolveServidor(j);
    if (!s) throw Errors.notFound("servidor");
    const body = z.object({
      produto: z.enum(["cartao_consignado", "cartao_beneficio"]),
      bancoNome: z.string().min(1),
      limite: z.number().positive(),
      matricula: z.string().optional(),
      ofertaId: z.string().optional(),
    }).parse(await c.req.json());
    const entry = body.matricula
      ? SERVIDORES_BUSCA_MOCK.find((x) => x.cpf === s.cpf && x.matricula === body.matricula)
      : SERVIDORES_BUSCA_MOCK.find((x) => x.matricula === s.matricula);
    if (!entry) throw Errors.notFound("matricula");
    const conv = CONVENIOS_MOCK.find((cv) => cv.id === entry.idConvenio);
    await refreshContratos(c.env); // ve contratos criados em outros isolates
    // Valida que o servidor tem margem cartao correspondente > 0 e que soma
    // do ja comprometido no BUCKET dele + nova fatura minima nao ultrapassa
    // a margem total. Assim o servidor nao consegue solicitar 2 cartoes
    // sobrepondo a mesma margem (fluxo espelho do emprestimo).
    const tipoMargem = body.produto === "cartao_consignado" ? "CARTAO_CONSIGNADO" : "CARTAO_BENEFICIOS";
    const comprometidoBucket = listContratos({ matricula: entry.matricula })
      .filter((ct) => comprometeMargem(ct.situacao) && deriveTipoMargem(ct) === tipoMargem)
      .reduce((acc, ct) => acc + ct.valorParcela, 0);
    const margemDisp = margemDisponivel(entry.salarioLiquido, comprometidoBucket, tipoMargem);
    if (margemDisp <= 0) {
      const nomeMargem = tipoMargem === "CARTAO_CONSIGNADO" ? "cartao consignado" : "cartao beneficio";
      throw Errors.validation({
        margem: `sem margem de ${nomeMargem} disponivel — voce ja tem uma solicitacao em analise ou contrato ativo que consome essa margem.`,
      });
    }
    const nomeProduto = body.produto === "cartao_consignado" ? "Cartao Consignado" : "Cartao Beneficio";
    // Cria contrato real de cartao (ECONSIGNADO) — assim aparece em
    // /servidor/contratos, na fila do banco em /banco/propostas (aba Cartao)
    // e materializa ADF pra averbadora. Antes era so pushEvent no log —
    // proposta sumia. Modelo do cartao consignado: valorFinanciado=limite
    // proposto; parcela=5% do limite (fatura minima que casa com a margem
    // cartao); totalParcelas=12 (simbolico, cartao rotativo nao tem prazo
    // fixo mas o schema exige positive). Reserva 48h ate o banco aprovar.
    const parcelaMin = Math.min(round2(body.limite * 0.05), margemDisp);
    const contrato = criarContratoOuReserva({
      bancoId: conv?.bancoId ?? 1,
      servidorId: s.id,
      idMatricula: entry.idMatricula,
      matricula: entry.matricula,
      nome: entry.nome,
      cpfMasked: entry.cpfMasked,
      convenioId: conv?.id ?? entry.idConvenio,
      convenio: conv?.nome ?? "Banco Atlas",
      tipoContrato: "ECONSIGNADO",
      valorFinanciado: body.limite,
      parcelas: 12,
      taxaAm: 0,
      cetAm: 0,
      iof: 0,
      diasCarencia: 30,
      valorParcela: parcelaMin,
      codigoVerba: conv?.codigoVerba ?? "",
      observacoes: `Solicitacao de ${nomeProduto} via app do servidor (${body.bancoNome})`,
      isReserva: true,
      tipoMargem, // bucket explicito — cartao consig / cartao benef
      ator: `servidor:${s.id}`,
    });
    await persistContrato(c.env, contrato.adf);
    pushEvent(
      "info",
      "averbadora.solicitacao_cartao",
      `${entry.nome} (matricula ${entry.matricula}, ${conv?.prefeitura ?? "prefeitura"}) solicitou ${nomeProduto} com ${body.bancoNome} — limite proposto R$ ${body.limite.toFixed(2)}.`,
    );
    // Notifica o servidor da criacao (in-app + e-mail).
    notifyServidor(c, entry.email, {
      titulo: `Solicitacao ${contrato.adf} enviada ao banco`,
      mensagem: `Sua solicitacao de ${nomeProduto} foi enviada ao ${body.bancoNome} e esta em analise. Voce sera avisado quando houver uma atualizacao.`,
      detalhes: [
        { label: "Banco", valor: body.bancoNome },
        { label: "Produto", valor: nomeProduto },
        { label: "Limite proposto", valor: `R$ ${body.limite.toFixed(2)}` },
      ],
    });
    return c.json({
      ok: true,
      protocolo: contrato.adf,
      produto: body.produto,
      bancoNome: body.bancoNome,
      limite: body.limite,
      mensagem: `Solicitacao enviada ao ${body.bancoNome}. Voce sera contatado pelo banco pra finalizar a emissao e ativacao do cartao.`,
    });
  })
  // Beneficios/descontos da prefeitura do servidor. Filtra pela prefeituraId do
  // convenio ativo e pela categoria (?categoria=saude|alimentacao|educacao|lazer).
  // So retorna beneficios ativos. Averbadora cadastra via /v1/admin/beneficios.
  .get("/v1/servidores/me/beneficios", async (c) => {
    const j = c.get("jwt");
    requireRoleInline(j, ["servidor"]);
    await ensureServidoresLoaded(c.env);
    const s = resolveServidor(j);
    if (!s) throw Errors.notFound("servidor");
    await refreshBeneficios(c.env);
    const url = new URL(c.req.url);
    const categoria = url.searchParams.get("categoria");
    // Aceita ?matricula=X pra respeitar o switcher do app (mesmo padrao de
    // /me/ofertas e /me/ofertas-banco). Sem esse param, cai na prefeitura do JWT.
    const matAtiva = url.searchParams.get("matricula");
    const entryAtivo = matAtiva
      ? SERVIDORES_BUSCA_MOCK.find((x) => x.cpf === s.cpf && x.matricula === matAtiva)
      : SERVIDORES_BUSCA_MOCK.find((x) => x.matricula === s.matricula);
    const convAtivo = entryAtivo ? CONVENIOS_MOCK.find((cv) => cv.id === entryAtivo.idConvenio) : undefined;
    const prefeituraAtiva = convAtivo?.prefeituraId ?? s.prefeitura_id;
    // Filtro por prefeitura ATIVA + multi-prefeitura + flag "todas parceiras".
    // todasPrefeiturasParceiras=true prevalece (aparece em qualquer prefeitura).
    const list = (await loadBeneficios(c.env)).filter((b) => {
      if (!b.ativo) return false;
      const cobrePrefeitura = b.todasPrefeiturasParceiras
        || b.prefeituraId === prefeituraAtiva
        || (b.prefeituraIdsExtras?.includes(prefeituraAtiva) ?? false);
      if (!cobrePrefeitura) return false;
      if (categoria && !b.categorias.includes(categoria as "saude" | "alimentacao" | "educacao" | "lazer" | "telemedicina")) return false;
      return true;
    });
    // Enriquece com nome do banco/convenio quando aplicavel — o servidor precisa
    // ver "oferecido por DELTA GLOBAL" no card, senao nao sabe quem esta por tras.
    const nomeBanco = (id: number) => bancos.find((b) => b.id === id)?.nome ?? `Banco ${id}`;
    return c.json({
      beneficios: list.map((b) => ({
        id: b.id,
        nome: b.nome,
        categorias: b.categorias,
        local: b.local,
        icone: b.icone,
        cor: b.cor,
        descontoLabel: b.descontoLabel,
        descontoComplemento: b.descontoComplemento,
        origem: b.origem,
        descricaoCurta: b.descricaoCurta,
        contato: b.contato,
        destaque: b.destaque,
        bancoNome: b.bancoId != null ? nomeBanco(b.bancoId) : undefined,
        convenioNome: b.convenioId ? (CONVENIOS_MOCK.find((cv) => cv.id === b.convenioId)?.nome) : undefined,
        imagens: b.imagens,
        modoImagens: b.modoImagens,
        linkAcesso: b.linkAcesso,
      })),
    });
  })
  // Registra o clique do servidor no botao "Acessar" de um beneficio. A
  // averbadora usa isso pra ver quem se interessou por cada parceria (util
  // em telemedicina — clique = intencao de agendar consulta). Idempotente
  // por (servidor, beneficio) num intervalo curto pra evitar spam.
  .post("/v1/servidores/me/beneficios/:id/clique", async (c) => {
    const j = c.get("jwt");
    requireRoleInline(j, ["servidor"]);
    await ensureServidoresLoaded(c.env);
    const s = resolveServidor(j);
    if (!s) throw Errors.notFound("servidor");
    await refreshBeneficios(c.env);
    const beneficioId = c.req.param("id");
    const beneficio = (await loadBeneficios(c.env)).find((b) => b.id === beneficioId);
    if (!beneficio) throw Errors.notFound("beneficio");
    if (!beneficio.ativo) throw Errors.validation({ beneficio: "beneficio pausado" });

    // Resolve matricula ativa (mesmo padrao dos outros endpoints).
    const body = await c.req.json().catch(() => ({}));
    const matAtiva = typeof body?.matricula === "string" ? body.matricula : undefined;
    const origemTela = typeof body?.origemTela === "string" ? body.origemTela : undefined;
    const entryAtivo = matAtiva
      ? SERVIDORES_BUSCA_MOCK.find((x) => x.cpf === s.cpf && x.matricula === matAtiva)
      : SERVIDORES_BUSCA_MOCK.find((x) => x.matricula === s.matricula);
    if (!entryAtivo) throw Errors.notFound("matricula");
    const conv = CONVENIOS_MOCK.find((cv) => cv.id === entryAtivo.idConvenio);
    const prefeituraId = conv?.prefeituraId ?? s.prefeitura_id;

    // Dedup: se ja clicou nos ultimos 60 minutos, nao duplica.
    await refreshCliques(c.env);
    const agora = Date.now();
    const jaExiste = (await loadCliques(c.env)).some((clk) =>
      clk.beneficioId === beneficioId
      && clk.servidorId === s.id
      && clk.matricula === entryAtivo.matricula
      && (agora - new Date(clk.criadoEm).getTime()) < 60 * 60 * 1000,
    );
    if (jaExiste) return c.json({ ok: true, deduplicado: true });

    const clique: BeneficioClique = {
      id: nextCliqueId(),
      beneficioId,
      servidorId: s.id,
      nome: entryAtivo.nome,
      cpfMasked: entryAtivo.cpfMasked,
      matricula: entryAtivo.matricula,
      prefeituraId,
      criadoEm: new Date().toISOString(),
      origemTela,
    };
    await persistClique(c.env, clique);
    return c.json({ ok: true });
  })
  // Vitrine (carrossel) exibido no dashboard do servidor. So banners ativos.
  // Fonte de verdade: admin_vitrine (a averbadora cadastra em /averbadora/vitrine).
  .get("/v1/servidores/me/vitrine", async (c) => {
    const j = c.get("jwt");
    requireRoleInline(j, ["servidor"]);
    await ensureVitrineLoaded(c.env);
    // So banners ativos; nao expoe metricas internas (impressoes, cliques, receita).
    const banners = vitrine
      .filter((b) => b.ativo)
      .map((b) => ({
        id: b.id,
        titulo: b.titulo,
        bancoNome: b.bancoNome,
        imagemUrl: b.imagemUrl ?? null,
      }));
    return c.json({ banners });
  })
  // Marketplace de ofertas do servidor — deriva das tabelas de emprestimo
  // publicadas pelos bancos parceiros. So retorna tabelas ativas e dentro
  // da vigencia. Cada card do marketplace corresponde a uma tabela vigente.
  .get("/v1/servidores/me/ofertas", async (c) => {
    const j = c.get("jwt");
    requireRoleInline(j, ["servidor"]);
    await ensureServidoresLoaded(c.env);
    const s = resolveServidor(j);
    if (!s) throw Errors.notFound("servidor");
    // Filtro por prefeituraId da matricula ATIVA: se o servidor tem matricula
    // em Palhoca (CONV-001) e outra em Florianopolis (CONV-002), so mostra
    // ofertas dos convenios da prefeitura da matricula ativa. Cliente antigo
    // que nao mandava matricula continua vendo todas (backward compat).
    const url = new URL(c.req.url);
    const matAtiva = url.searchParams.get("matricula");
    const entryAtivo = matAtiva
      ? SERVIDORES_BUSCA_MOCK.find((x) => x.cpf === s.cpf && x.matricula === matAtiva)
      : undefined;
    const convAtivo = entryAtivo
      ? CONVENIOS_MOCK.find((cv) => cv.id === entryAtivo.idConvenio)
      : undefined;
    const convenioIdsDaPrefeitura = convAtivo
      ? new Set(CONVENIOS_MOCK.filter((cv) => cv.prefeituraId === convAtivo.prefeituraId).map((cv) => cv.id))
      : null;
    const hoje = new Date().toISOString().slice(0, 10);
    const tabelas = (await listTabelas(c.env)).filter((t) => {
      if (!t.ativo) return false;
      if (t.vigenciaInicio > hoje) return false;
      if (t.vigenciaFim && t.vigenciaFim < hoje) return false;
      if (convenioIdsDaPrefeitura && !convenioIdsDaPrefeitura.has(t.convenioId)) return false;
      return true;
    });
    return c.json({
      ofertas: tabelas.map((t) => {
        // "CASTRO / DELTA GLOBAL" -> banco = "DELTA GLOBAL", cidade = "CASTRO"
        const [cidade = "", banco = ""] = t.convenio.split("/").map((p) => p.trim());
        return {
          id: t.id,
          bancoNome: banco || t.convenio,
          convenioId: t.convenioId,
          convenio: t.convenio,
          cidade,
          taxaMinAm: t.taxaMinAm,
          taxaMaxAm: t.taxaMaxAm,
          prazoMaxMeses: t.prazoMaxMeses,
          vigenciaInicio: t.vigenciaInicio,
          vigenciaFim: t.vigenciaFim ?? null,
        };
      }),
    });
  })
  // Servidor solicita uma proposta (pré-reserva) — CRIA no store do banco, então o
  // portal do banco RECEBE a solicitação (situacao "Aguardando Confirmação do Deferimento").
  // É assim que o ecossistema conversa: servidor -> banco.
  .post("/v1/servidores/me/propostas", async (c) => {
    const j = c.get("jwt");
    requireRoleInline(j, ["servidor"]);
    await ensureServidoresLoaded(c.env);
    await ensureBancosLoaded(c.env);
    const s = resolveServidor(j);
    if (!s) throw Errors.notFound("servidor");
    const body = z
      .object({
        valor: z.number().positive(),
        parcelas: z.number().int().positive(),
        taxaAm: z.number().positive(),
        matricula: z.string().optional(),
        bancoNome: z.string().optional(),
      })
      .parse(await c.req.json());
    // A matricula ATIVA no app do servidor eh a fonte de verdade — e vem no
    // body.matricula. Antes o backend priorizava a matricula do JWT (fixada
    // no login) e o body era so fallback, entao servidor com acumulacao de
    // cargos que trocava de matricula no dropdown continuava criando
    // proposta na matricula do login. Agora body.matricula > JWT > primeira.
    const entry =
      (body.matricula
        ? SERVIDORES_BUSCA_MOCK.find((x) => x.cpf === s.cpf && x.matricula === body.matricula)
        : undefined) ??
      SERVIDORES_BUSCA_MOCK.find((x) => x.cpf === s.cpf && x.matricula === s.matricula) ??
      SERVIDORES_BUSCA_MOCK.find((x) => x.cpf === s.cpf);
    if (!entry) throw Errors.notFound("matricula");
    const conv = CONVENIOS_MOCK.find((cv) => cv.id === entry.idConvenio);
    const cet = calcCET({ valor: body.valor, parcelas: body.parcelas, taxaMensal: body.taxaAm });
    await refreshContratos(c.env); // sincroniza o contador de adf entre isolates antes de criar
    // SEGURANÇA (server-side): a parcela nunca pode exceder a margem consignável
    // disponível da matrícula. O cliente já limita o valor, mas o backend é a fonte
    // de verdade — sem isto, uma chamada adulterada criaria empréstimo acima da margem.
    // Compromete apenas o bucket EMPRESTIMO — cartao consig/beneficio nao
    // afetam a margem de emprestimo (buckets independentes).
    const comprometidoAtual = listContratos({ matricula: entry.matricula })
      .filter((ct) => comprometeMargem(ct.situacao) && deriveTipoMargem(ct) === "EMPRESTIMO")
      .reduce((acc, ct) => acc + ct.valorParcela, 0);
    const margemDisp = margemDisponivel(entry.salarioLiquido, comprometidoAtual, "EMPRESTIMO");
    if (round2(cet.parcela) > round2(margemDisp) + 0.01) {
      const brl = (n: number) => `R$ ${round2(n).toFixed(2).replace(".", ",")}`;
      throw new HttpError(
        422,
        "margem_insuficiente",
        `A parcela de ${brl(cet.parcela)} excede sua margem disponível de ${brl(margemDisp)}.`,
      );
    }
    const contrato = criarContratoOuReserva({
      bancoId: conv?.bancoId ?? 1,
      servidorId: s.id,
      idMatricula: entry.idMatricula,
      matricula: entry.matricula,
      nome: entry.nome,
      cpfMasked: entry.cpfMasked,
      convenioId: conv?.id ?? entry.idConvenio,
      convenio: conv?.nome ?? "Banco Atlas",
      tipoContrato: "EMPRESTIMO",
      valorFinanciado: body.valor,
      parcelas: body.parcelas,
      taxaAm: body.taxaAm,
      cetAm: cet.mensal,
      iof: cet.iof,
      diasCarencia: 30,
      valorParcela: round2(cet.parcela),
      codigoVerba: conv?.codigoVerba ?? "",
      observacoes: `Solicitacao via app do servidor (${body.bancoNome ?? "Banco Atlas"})`,
      isReserva: true,
      tipoMargem: "EMPRESTIMO", // explicit bucket — nao confunde com margem de cartao
      ator: `servidor:${s.id}`,
    });
    await persistContrato(c.env, contrato.adf); // write-through: a proposta chega no banco e sobrevive ao refresh
    // Notificação de movimentação (in-app + e-mail): solicitação enviada ao banco.
    notifyServidor(c, entry.email, {
      titulo: `Solicitação ${contrato.adf} enviada ao banco`,
      mensagem: `Sua solicitação de empréstimo foi enviada ao ${bancoNome(contrato.bancoId)} e está em análise. Você será avisado quando houver uma atualização.`,
      detalhes: [
        { label: "Valor", valor: brlFmt(contrato.valorFinanciado) },
        { label: "Parcelas", valor: `${contrato.totalParcelas}x de ${brlFmt(contrato.valorParcela)}` },
        { label: "Situação", valor: contrato.situacao },
      ],
    });
    return c.json(
      {
        id: contrato.adf,
        situacao: contrato.situacao,
        banco: body.bancoNome ?? bancoNome(contrato.bancoId),
        valor: contrato.valorFinanciado,
        parcelas: contrato.totalParcelas,
        parcela: contrato.valorParcela,
        expira_em: contrato.expiracao,
      },
      201,
    );
  })
  // Lista as propostas/pré-reservas do próprio servidor (mesma fonte que o banco lê).
  // Opcionalmente filtra pela matricula ativa — sem esse filtro o servidor
  // com múltiplas matrículas (acumulação de cargos) veria propostas de todas
  // ao mesmo tempo, misturando históricos que devem viver por matrícula.
  .get("/v1/servidores/me/propostas", async (c) => {
    const j = c.get("jwt");
    requireRoleInline(j, ["servidor"]);
    await ensureServidoresLoaded(c.env);
    await ensureBancosLoaded(c.env);
    const s = resolveServidor(j);
    if (!s) throw Errors.notFound("servidor");
    await refreshContratos(c.env); // vê reservas criadas em outros isolates
    const matAtiva = c.req.query("matricula")?.trim();
    const mats = new Set(
      SERVIDORES_BUSCA_MOCK
        .filter((x) => x.cpf === s.cpf && (!matAtiva || x.matricula === matAtiva))
        .map((e) => e.matricula),
    );
    const propostas = listContratos({})
      .filter((ct) => mats.has(ct.matricula))
      .map((ct) => ({
        id: ct.adf,
        banco: bancoNome(ct.bancoId),
        valor: round2(ct.valorFinanciado),
        parcelas: ct.totalParcelas,
        parcela: round2(ct.valorParcela),
        taxaAm: round2(ct.taxaAm * 100),
        situacao: ct.situacao,
        tipoContrato: ct.tipoContrato,
        // Dados de portabilidade (quando a proposta e' um REFIN vindo de outro banco)
        bancoOrigem: ct.bancoOrigem,
        contratoOrigem: ct.contratoOrigem,
        saldoDevedorOrigem: ct.saldoDevedorOrigem,
        folhaStatus: ct.folhaStatus, // "recebida" | "aplicada" | "falha" — estágio da ADF na prefeitura
        folhaMotivo: ct.folhaMotivo, // motivo quando a prefeitura nega a ADF
        data: ct.lancamento,
        expira_em: ct.expiracao,
        // Timestamps ISO exatos — o frontend usa pra timer da trava de 48h ficar
        // preciso (sem arredondar pra fim-de-dia). Sao null pra contratos antigos
        // que nao gravaram esses campos.
        criado_em_iso: ct.criadoEmIso ?? null,
        expira_em_iso: ct.expiracaoIso ?? null,
      }));
    return c.json({ propostas });
  })
  // Envia um código de verificação (test-mode: retorna no corpo) pro e-mail do servidor.
  .post("/v1/servidores/me/codigo", async (c) => {
    const j = c.get("jwt");
    requireRoleInline(j, ["servidor"]);
    await ensureServidoresLoaded(c.env);
    const s = resolveServidor(j);
    if (!s) throw Errors.notFound("servidor");
    const entry = SERVIDORES_BUSCA_MOCK.find((x) => x.cpf === s.cpf);
    const codigo = await gerarCodigoUnico(c.env); // 6 dígitos, sem reuso por 30 dias
    if (c.env.KV_SESSIONS) await c.env.KV_SESSIONS.put(`chg:${s.cpf}`, codigo, { expirationTtl: 600 });
    // Envia por e-mail de verdade se o SMTP estiver configurado (para o destino
    // de notificação, se definido). Senão, modo teste (código na resposta).
    // Servidor atualizando o proprio contato — codigo vai pro email atual dele,
    // sem passar pelo notifyEmail (que e override de teste dos perfis admin).
    const r = await enviarCodigo(c.env, { destinoPadrao: entry?.email, contexto: "atualizar seus dados de contato", codigo, respeitaOverride: false });
    return c.json({
      enviado: r.sent,
      destino: maskEmailSrv(r.destino || entry?.email),
      ...(r.sent ? {} : { codigo_teste: codigo, aviso: `E-mail não enviado (${r.reason}) — modo teste.` }),
    });
  })
  // Atualiza e-mail/telefone (exige o código enviado). Persiste no Postgres.
  .post("/v1/servidores/me/contato", async (c) => {
    const j = c.get("jwt");
    requireRoleInline(j, ["servidor"]);
    await ensureServidoresLoaded(c.env);
    const s = resolveServidor(j);
    if (!s) throw Errors.notFound("servidor");
    const body = z
      .object({ codigo: z.string(), email: z.string().email().optional(), telefone: z.string().optional() })
      .parse(await c.req.json());
    if (!c.env.KV_SESSIONS) throw Errors.validation({ kv: "indisponível" });
    const stored = await c.env.KV_SESSIONS.get(`chg:${s.cpf}`);
    if (!stored || stored !== body.codigo) throw Errors.unauthorized("Código inválido ou expirado");
    const n = await setServidorContato(c.env, s.cpf, { email: body.email, telefone: body.telefone });
    SERVIDORES_BUSCA_MOCK.filter((x) => x.cpf === s.cpf).forEach((x) => {
      if (body.email !== undefined) x.email = body.email;
      if (body.telefone !== undefined) x.telefone = body.telefone;
    });
    await c.env.KV_SESSIONS.delete(`chg:${s.cpf}`);
    return c.json({ ok: n > 0, email: body.email, telefone: body.telefone });
  })
  // Troca de senha: valida a senha atual + o código. Persiste o novo hash no Postgres.
  .post("/v1/servidores/me/senha", async (c) => {
    const j = c.get("jwt");
    requireRoleInline(j, ["servidor"]);
    await ensureServidoresLoaded(c.env);
    const s = resolveServidor(j);
    if (!s) throw Errors.notFound("servidor");
    const body = z
      .object({ senha_atual: z.string(), codigo: z.string(), nova_senha: z.string().min(8) })
      .parse(await c.req.json());
    const entry = SERVIDORES_BUSCA_MOCK.find((x) => x.cpf === s.cpf);
    const atualHash = await sha256Hex(body.senha_atual);
    if (entry?.passwordHash && entry.passwordHash !== atualHash) {
      throw Errors.unauthorized("Senha atual incorreta");
    }
    if (!c.env.KV_SESSIONS) throw Errors.validation({ kv: "indisponível" });
    const stored = await c.env.KV_SESSIONS.get(`chg:${s.cpf}`);
    if (!stored || stored !== body.codigo) throw Errors.unauthorized("Código inválido ou expirado");
    const novoHash = await sha256Hex(body.nova_senha);
    await setServidorPassword(c.env, s.cpf, novoHash);
    SERVIDORES_BUSCA_MOCK.filter((x) => x.cpf === s.cpf).forEach((x) => { x.passwordHash = novoHash; });
    await c.env.KV_SESSIONS.delete(`chg:${s.cpf}`);
    return c.json({ ok: true });
  })
  .get("/v1/servidores/me/comunicados", async (c) => {
    const j = c.get("jwt");
    requireRoleInline(j, ["servidor"]);
    await refreshComunicados(c.env);
    return c.json({ comunicados: COMUNICADOS_MOCK.filter((x) => x.publico === "servidor") });
  })
  // Baixa o CCB (contrato assinado que o banco anexou) de um contrato do proprio
  // servidor. Antes o front gerava um PDF fake com buildSimplePdf — cliente
  // reclamou que "não era o que o banco enviou". Agora serve o R2 direto.
  //
  // Isolamento: servidor so pode baixar contrato cuja matricula bata com uma das
  // matriculas do proprio CPF (acumulacao de cargos e' possivel — mesmo CPF em
  // varias prefeituras). 404 se nao for dele; 404 tambem se banco ainda nao
  // anexou (o front trata como "banco nao enviou ainda").
  .get("/v1/servidores/me/contratos/:adf/ccb.pdf", async (c) => {
    const j = c.get("jwt");
    requireRoleInline(j, ["servidor"]);
    await ensureServidoresLoaded(c.env);
    await refreshContratos(c.env);
    const s = resolveServidor(j);
    if (!s) return c.json({ reason: "servidor_nao_identificado" }, 404);
    const mats = new Set(
      SERVIDORES_BUSCA_MOCK.filter((x) => x.cpf === s.cpf).map((e) => e.matricula),
    );
    const adf = c.req.param("adf");
    const contrato = getContrato(adf);
    // Retorna reason especifico em cada 404 pra debug — antes tudo caia
    // no mesmo alert "banco nao anexou" (falso positivo quando na verdade
    // o contrato nao foi achado ou a matricula nao bate).
    if (!contrato) {
      return c.json({ reason: "contrato_nao_encontrado", adf }, 404);
    }
    if (!mats.has(contrato.matricula)) {
      return c.json({
        reason: "contrato_nao_e_seu",
        contratoMatricula: contrato.matricula,
        minhasMatriculas: [...mats],
      }, 404);
    }
    if (!contrato.ccbKey) {
      return c.json({ reason: "ccb_nao_anexado", adf }, 404);
    }
    if (!c.env.R2_FILES) {
      return c.json({ reason: "r2_indisponivel" }, 503);
    }
    const obj = await c.env.R2_FILES.get(contrato.ccbKey);
    if (!obj) {
      return c.json({ reason: "arquivo_nao_encontrado_no_r2", key: contrato.ccbKey }, 404);
    }
    return new Response(obj.body, {
      headers: {
        "Content-Type": obj.httpMetadata?.contentType ?? "application/pdf",
        "Content-Disposition": `attachment; filename="contrato-${adf}.pdf"`,
        "Cache-Control": "private, max-age=60",
      },
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
