import { Hono } from "hono";
import { z } from "zod";
import { calcCET, margemDisponivel, margemTotal } from "@atlas/domain";
import { authRequired, type JwtClaims } from "../../middleware/auth.js";
import { Errors, HttpError } from "../../_shared/errors.js";
import type { Env } from "../../env.js";
import { COMUNICADOS_MOCK, CONVENIOS_MOCK, SERVIDORES_BUSCA_MOCK } from "./fixtures.js";
import { refreshConvenios } from "./convenios-store.js";
import { refreshComunicados } from "./comunicados-store.js";
import { prefeituras, bancos, pushEvent } from "../admin/index.js";
import { aplicarAcao, comprometeMargem, criarContratoOuReserva, getContrato, getContratoEventos, getContratoParcelas, listContratos, persistContrato, refreshContratos, setContratoCcb } from "./store.js";
import { listTabelas, getTabela, upsertTabela, removerTabela, reativarTabela, listUsuarios, getUsuario, upsertUsuario, removerUsuario, reativarUsuario } from "./cadastros.js";
import { loadOfertas, refreshOfertas, persistOferta, nextOfertaId, type Oferta, type OfertaFiltro } from "./ofertas-store.js";
import { enviarNotificacao } from "../admin/mailer.js";
import type { ContratoFull } from "./store.js";

function requireBancoRole(j: JwtClaims): void {
  if (j.role !== "banco") throw Errors.forbidden("Requer perfil banco");
}

const brlNotif = (n: number) => `R$ ${(Math.round(n * 100) / 100).toFixed(2).replace(".", ",")}`;

/** Notifica o servidor (e-mail, best-effort) sobre uma ação do banco no contrato. */
function notifyMovimentacao(
  c: { env: Env; executionCtx: { waitUntil(p: Promise<unknown>): void } },
  ct: ContratoFull,
  acao: string,
  motivo?: string,
): void {
  const srv = SERVIDORES_BUSCA_MOCK.find((s) => s.matricula === ct.matricula);
  if (!srv?.email) return;
  const mapa: Record<string, { titulo: string; mensagem: string }> = {
    aprovar: {
      titulo: `Proposta ${ct.adf} aprovada`,
      mensagem: "Boa notícia! O banco aprovou sua proposta. Em breve entrarão em contato pra fechar o contrato — a assinatura acontece presencialmente com o banco.",
    },
    confirmar: {
      titulo: `Proposta ${ct.adf} averbada`,
      mensagem: "Sua proposta foi averbada. Aguarde a confirmação do desconto em folha pela prefeitura.",
    },
    cancelar: {
      titulo: `Proposta ${ct.adf} recusada`,
      mensagem: motivo ? `Sua proposta foi recusada pelo banco. Motivo: ${motivo}.` : "Sua proposta foi recusada pelo banco e a margem voltou a ficar disponível.",
    },
    suspender: { titulo: `Contrato ${ct.adf} suspenso`, mensagem: motivo ? `Seu contrato foi suspenso. Motivo: ${motivo}.` : "Seu contrato foi suspenso pelo banco." },
    quitar: { titulo: `Contrato ${ct.adf} quitado`, mensagem: "Seu contrato foi quitado. A margem correspondente foi liberada." },
    alongar: { titulo: `Contrato ${ct.adf} atualizado`, mensagem: "Seu contrato teve o prazo alterado pelo banco." },
    alterar: { titulo: `Contrato ${ct.adf} atualizado`, mensagem: "Seu contrato foi atualizado pelo banco." },
  };
  const info = mapa[acao];
  if (!info) return;
  const p = enviarNotificacao(c.env, {
    destinoPadrao: srv.email,
    titulo: info.titulo,
    mensagem: info.mensagem,
    detalhes: [
      { label: "Banco", valor: ct.convenio ?? "Banco Atlas" },
      { label: "Valor", valor: brlNotif(ct.valorFinanciado) },
      { label: "Parcela", valor: `${ct.totalParcelas}x de ${brlNotif(ct.valorParcela)}` },
      { label: "Situação", valor: ct.situacao },
    ],
  });
  try {
    c.executionCtx.waitUntil(p);
  } catch {
    void p;
  }
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

// Sentinela para "banco sem convênio próprio". NÃO casa com nenhum contrato, então
// listContratos({ convenioId: SEM_CONVENIO }) retorna [] — um banco novo/sem convênio
// vê NADA, em vez de cair no convênio de outro banco e vazar os clientes dele.
const SEM_CONVENIO = "__sem_convenio__";

async function getActiveConvenioId(env: Env, j: JwtClaims): Promise<string> {
  await refreshConvenios(env); // vê convênios criados pela averbadora (persistidos)
  const key = `banco_convenio:${j.banco_id}:${j.sub}`;
  const stored = env.KV_CACHE ? await env.KV_CACHE.get(key) : null;
  // Só aceita o convênio guardado se ele for DESTE banco (defesa contra vazamento).
  if (stored && CONVENIOS_MOCK.some((c) => c.id === stored && c.bancoId === j.banco_id)) return stored;
  const first = CONVENIOS_MOCK.find((c) => c.bancoId === j.banco_id && c.ativo !== false);
  // Sem fallback para o convênio de outro banco (era CONVENIOS_MOCK[0] = CONV-001 do
  // Banco Atlas). Banco sem convênio próprio → sentinela → não vê contrato nenhum.
  return first?.id ?? SEM_CONVENIO;
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
    await refreshConvenios(c.env); // vê convênios criados pela averbadora (persistidos)
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
    const conv = CONVENIOS_MOCK.find((cv) => cv.id === activeId);
    // Banco sem convênio próprio: sem contratos e sem dados de outro banco.
    const contratos = conv ? listContratos({ convenioId: activeId }) : [];
    const ativos = contratos.filter((ct) => ct.situacao === "Ativo").length;
    const pendentes = contratos.filter((ct) => ct.situacao.startsWith("Aguardando")).length;
    return c.json({
      convenio: conv
        ? { id: conv.id, nome: conv.nome, prefeitura: conv.prefeitura }
        : { id: "", nome: "Sem convênio", prefeitura: "—" },
      kpis: {
        carteira: { count: ativos, percentual: ativos > 0 ? 1 : 0 },
        novosNoMes: { count: contratos.filter((ct) => ct.lancamento.includes("/06/")).length },
        pendencias: { count: pendentes },
      },
      // Data de corte so faz sentido quando ha convenio (o dia vem do convenio
      // da prefeitura). Banco sem convenio proprio nao tem folha pra bater;
      // devolve marcadores neutros pra UI mostrar "—".
      dataCorte: conv
        ? {
            dia: conv.dataCorte,
            mes: monthLabel(currentCompetencia().mes),
            origem: conv.prefeitura.toUpperCase(),
            operacoes: "EMPRESTIMO",
          }
        : { dia: 0, mes: "—", origem: "—", operacoes: "—" },
    });
  })

  // --------- Comunicados ----------
  .get("/v1/portal/banco/comunicados", async (c) => {
    requireBancoRole(c.get("jwt"));
    await refreshComunicados(c.env);
    return c.json({ comunicados: COMUNICADOS_MOCK.filter((x) => x.publico === "banco") });
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
    const activeConvNome = CONVENIOS_MOCK.find((cv) => cv.id === activeConv)?.nome ?? "Sem convênio";
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
    // Default = SO contratos do convenio ATIVO. Isolamento por convenio: banco
    // logado em Palhoca nao deve ver proposta de servidor de Joinville.
    // Casos edge (visao geral de convenios, busca de matricula especifica) podem
    // opt-in com ?incluir_todos_convenios=true.
    const incluirTodos = url.searchParams.get("incluir_todos_convenios") === "true";
    const bancoId = j.banco_id ?? 1;
    const outrosConvenios = incluirTodos
      ? listContratos({}).filter((ct) => {
          if (ct.bancoId !== bancoId) return false;
          if (rows.some((r) => r.adf === ct.adf)) return false;
          return true;
        })
      : [];
    // Enriquecemos cada contrato com `atualizadoEm` = criadoEm do evento mais
    // recente (aprovacao, averbacao, folha aplicada). Frontend usa isso pra
    // ordenar carteira/ADF com "acabou de acontecer" no topo — sem esse campo
    // ficariam sorteados por lancamento (data BR do contrato original), o que
    // e uma proxy ruim de "novidade".
    const contratosBase = [...outrosConvenios, ...rows];
    const contratos = contratosBase.map((ct) => {
      const eventos = getContratoEventos(ct.adf);
      const ultimo = eventos.length > 0 ? eventos[eventos.length - 1]?.criadoEm : undefined;
      // Telefone do servidor na resposta do banco: o banco precisa ligar pro
      // servidor pra tocar a formalizacao offline (analise + coleta de doc +
      // assinatura presencial). Contexto ja isolado por bancoId + convenio
      // ativo, entao expor o numero e' seguro dentro desse escopo.
      const srv = SERVIDORES_BUSCA_MOCK.find((s) => s.matricula === ct.matricula);
      return {
        ...ct,
        atualizadoEm: ultimo ?? new Date().toISOString(),
        telefoneServidor: srv?.telefone,
        ccbKey: ct.ccbKey,
        ccbAnexadoEm: ct.ccbAnexadoEm,
        ccbHistorico: ct.ccbHistorico,
      };
    });
    return c.json({ contratos, total: contratos.length });
  })

  // --------- Detalhe contrato ----------
  .get("/v1/portal/banco/contratos/:adf", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const adf = c.req.param("adf");
    await refreshContratos(c.env);
    const ct = getContrato(adf);
    // Isolamento: banco so acessa contrato proprio. Antes qualquer banco lia
    // contrato de outro adivinhando o ADF (formato numerico curto).
    if (!ct || ct.bancoId !== (j.banco_id ?? -1)) throw Errors.notFound("contrato");
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
    // Averbacao direta (sem passar por reserva) — notifica a averbadora tambem.
    const bancoNome = bancos.find((b) => b.id === ct.bancoId)?.nome ?? `Banco ${ct.bancoId}`;
    const conv = CONVENIOS_MOCK.find((cv) => cv.id === ct.convenioId);
    const prefNome = conv?.prefeitura ?? "prefeitura";
    pushEvent(
      "info",
      "averbadora.notif_averbacao",
      `${bancoNome} averbou a proposta ${ct.adf} (matricula ${ct.matricula}, ${prefNome}) — pronta pra ADF na competencia atual.`,
    );
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
    const acao = z.enum(["quitar", "suspender", "cancelar", "alongar", "alterar", "confirmar", "aprovar"]).parse(c.req.param("acao"));
    const raw = c.req.header("content-type")?.includes("json") ? await c.req.json().catch(() => ({})) : {};
    const body = z
      .object({ motivo: z.string().optional(), parcelasExtras: z.number().int().optional(), observacoes: z.string().optional(), codigoVerba: z.string().optional() })
      .parse(raw);
    await refreshContratos(c.env); // garante que o contrato/reserva (de outro isolate) esteja no Map antes de agir
    // Isolamento: verifica dono antes de aplicar acao. Sem isso qualquer banco
    // podia cancelar/aprovar/suspender contrato de outro adivinhando o ADF.
    const owner = getContrato(adf);
    if (!owner || owner.bancoId !== (j.banco_id ?? -1)) throw Errors.notFound("contrato");
    // Fluxo novo (pedido do cliente): banco so aprova DEPOIS de anexar o
    // contrato assinado. Sem CCB, aprovar retorna 422.
    if (acao === "aprovar" && !owner.ccbKey) {
      throw Errors.validation({
        contrato: "anexe o contrato assinado antes de aprovar a proposta.",
      });
    }
    const r = aplicarAcao(adf, acao, `user:${j.sub}`, body.motivo, body);
    if (!r) throw Errors.notFound("contrato");
    await persistContrato(c.env, adf); // write-through: decisão do banco persiste e o servidor vê
    // Notifica a averbadora sempre que o banco APROVA (fluxo novo — averbadora
    // que faz a ADF) ou CONFIRMA (fluxo antigo — averbadora so aplica em folha).
    // Sem esse evento a averbadora ficaria de fora e a ADF nao entraria na fila.
    if (acao === "aprovar" || acao === "confirmar") {
      const bancoNome = bancos.find((b) => b.id === r.bancoId)?.nome ?? `Banco ${r.bancoId}`;
      const conv = CONVENIOS_MOCK.find((cv) => cv.id === r.convenioId);
      const prefNome = conv?.prefeitura ?? "prefeitura";
      const verbo = acao === "aprovar" ? "aprovou" : "averbou";
      pushEvent(
        "info",
        "averbadora.notif_averbacao",
        `${bancoNome} ${verbo} a proposta ${adf} (matricula ${r.matricula}, ${prefNome}) — pronta pra ADF na competencia atual.`,
      );
    }
    // Notifica o servidor da movimentação (in-app + e-mail).
    notifyMovimentacao(c, r, acao, body.motivo);
    return c.json({ contrato: r });
  })

  // --------- Comprovante PDF ----------
  .get("/v1/portal/banco/contratos/:adf/comprovante.pdf", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const adf = c.req.param("adf");
    const ct = getContrato(adf);
    // Isolamento: comprovante e documento contratual — nao pode vazar entre bancos.
    if (!ct || ct.bancoId !== (j.banco_id ?? -1)) throw Errors.notFound("contrato");
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
  // Isolamento: TabelaEmprestimo nao guarda bancoId (so convenioId), entao
  // consideramos que uma tabela pertence ao banco cujo convenio a referencia.
  // Banco novo (sem convenios proprios) → 0 tabelas visiveis. Ao criar tabela,
  // convenio informado tem que ser do proprio banco.
  .get("/v1/portal/banco/cadastros/tabela-emprestimos", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const meusConvenios = new Set(CONVENIOS_MOCK.filter((cv) => cv.bancoId === j.banco_id).map((cv) => cv.id));
    const tabelas = (await listTabelas(c.env)).filter((t) => meusConvenios.has(t.convenioId));
    return c.json({ tabelas });
  })
  .get("/v1/portal/banco/cadastros/tabela-emprestimos/:id", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const t = await getTabela(c.env, c.req.param("id"));
    const meusConvenios = new Set(CONVENIOS_MOCK.filter((cv) => cv.bancoId === j.banco_id).map((cv) => cv.id));
    if (!t || !meusConvenios.has(t.convenioId)) throw Errors.notFound("tabela");
    return c.json({ tabela: t });
  })
  .post("/v1/portal/banco/cadastros/tabela-emprestimos", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
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
    // Isolamento: so pode criar/editar tabela em convenio proprio.
    const meusConvenios = new Set(CONVENIOS_MOCK.filter((cv) => cv.bancoId === j.banco_id).map((cv) => cv.id));
    if (!meusConvenios.has(body.convenioId)) throw Errors.notFound("convenio");
    // Se editando (id), tabela existente tambem tem que ser de convenio proprio.
    if (body.id) {
      const existente = await getTabela(c.env, body.id);
      if (existente && !meusConvenios.has(existente.convenioId)) throw Errors.notFound("tabela");
    }
    return c.json({ tabela: await upsertTabela(c.env, body) });
  })
  .delete("/v1/portal/banco/cadastros/tabela-emprestimos/:id", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    // Isolamento: so desativa se a tabela for de convenio proprio.
    const t = await getTabela(c.env, c.req.param("id"));
    const meusConvenios = new Set(CONVENIOS_MOCK.filter((cv) => cv.bancoId === j.banco_id).map((cv) => cv.id));
    if (!t || !meusConvenios.has(t.convenioId)) throw Errors.notFound("tabela");
    if (!(await removerTabela(c.env, c.req.param("id")))) throw Errors.notFound("tabela");
    return c.body(null, 204);
  })
  .post("/v1/portal/banco/cadastros/tabela-emprestimos/:id/reativar", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const t = await getTabela(c.env, c.req.param("id"));
    const meusConvenios = new Set(CONVENIOS_MOCK.filter((cv) => cv.bancoId === j.banco_id).map((cv) => cv.id));
    if (!t || !meusConvenios.has(t.convenioId)) throw Errors.notFound("tabela");
    if (!(await reativarTabela(c.env, c.req.param("id")))) throw Errors.notFound("tabela");
    return c.json({ ok: true });
  })

  // --------- Upload de CCB (Cedula de Credito Bancario) pro R2 ---------
  // Fluxo: banco anexa a CCB assinada, arquivo persiste em R2 sob a chave
  // ccb/${banco_id}/${adf}/${timestamp}-${nome}.pdf. GET valida isolamento —
  // banco so consegue baixar CCBs do proprio banco_id.
  .post("/v1/portal/banco/ccb/upload", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    if (!c.env.R2_FILES) throw Errors.validation({ r2: "R2 binding indisponivel — configuracao Cloudflare pendente." });
    if (j.banco_id == null) throw Errors.forbidden("banco sem identidade");
    const form = await c.req.formData().catch(() => null);
    if (!form) throw Errors.validation({ body: "Envie multipart/form-data com campos adf e file." });
    const adfRaw = form.get("adf");
    const file = form.get("file");
    if (typeof adfRaw !== "string" || !adfRaw.trim()) throw Errors.validation({ adf: "campo 'adf' obrigatorio" });
    // Duck-type: FormDataEntryValue e string|File; File tem name/size/type/stream/arrayBuffer.
    const isFile = (v: unknown): v is { name: string; size: number; type: string; arrayBuffer: () => Promise<ArrayBuffer> } =>
      typeof v === "object" && v !== null && typeof (v as { size?: unknown }).size === "number" && typeof (v as { arrayBuffer?: unknown }).arrayBuffer === "function";
    if (!isFile(file)) throw Errors.validation({ file: "campo 'file' obrigatorio" });
    if (file.type && file.type !== "application/pdf") throw Errors.validation({ file: "apenas PDF" });
    const MAX = 15 * 1024 * 1024; // 15 MB
    if (file.size > MAX) throw Errors.validation({ file: "arquivo maior que 15 MB" });
    const adf = adfRaw.replace(/[^\w.-]/g, "").slice(0, 40);
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const safeName = (file.name || "ccb.pdf").replace(/[^\w.-]/g, "_").slice(0, 60);
    const key = `ccb/${j.banco_id}/${adf}/${ts}-${safeName}`;
    const buf = await file.arrayBuffer();
    await c.env.R2_FILES.put(key, buf, { httpMetadata: { contentType: "application/pdf" } });
    // Grava a chave no contrato pra o operador reabrir a qualquer momento.
    // Isolamento ja garantido acima (owner == banco logado).
    await refreshContratos(c.env);
    const owner = getContrato(adf);
    if (owner && owner.bancoId === (j.banco_id ?? -1)) {
      setContratoCcb(adf, key, `user:${j.sub}`);
      await persistContrato(c.env, adf);
    }
    return c.json({ key, size: file.size, contentType: "application/pdf" });
  })
  .get("/v1/portal/banco/ccb/*", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    if (!c.env.R2_FILES) throw Errors.notFound("r2");
    const url = new URL(c.req.url);
    const prefix = "/v1/portal/banco/ccb/";
    const key = decodeURIComponent(url.pathname.slice(prefix.length));
    // Isolamento: banco so pode baixar arquivos sob ccb/${banco_id}/
    if (!key.startsWith(`ccb/${j.banco_id}/`)) throw Errors.notFound("ccb");
    const obj = await c.env.R2_FILES.get(key);
    if (!obj) throw Errors.notFound("ccb");
    return new Response(obj.body, {
      headers: {
        "Content-Type": obj.httpMetadata?.contentType ?? "application/pdf",
        "Content-Disposition": `inline; filename="${key.split("/").pop()}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  })

  // --------- Ofertas de credito (banco → servidores) ----------
  // Banco cria uma oferta filtrada (por convenio/vinculo/situacao/prefeitura/salario/idade);
  // servidores cujo perfil casa recebem no sino. Nao existe hard-delete — pausar/reativar.
  .get("/v1/portal/banco/ofertas", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    await refreshOfertas(c.env);
    const bancoId = j.banco_id ?? -1;
    const list = (await loadOfertas(c.env)).filter((o) => o.bancoId === bancoId);
    return c.json({ ofertas: list });
  })
  .post("/v1/portal/banco/ofertas", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    if (j.banco_id == null) throw Errors.forbidden("banco sem identidade");
    await refreshOfertas(c.env);
    const body = z.object({
      id: z.string().optional(),
      titulo: z.string().min(3).max(120),
      mensagem: z.string().min(3).max(500),
      taxaAm: z.number().positive().max(20),
      parcelasMax: z.number().int().positive().max(120),
      valorMax: z.number().positive(),
      expiraEm: z.string().optional().or(z.literal("")),
      ativo: z.boolean().default(true),
      // Emoji tematico opcional. Limite generoso pra caber emojis compostos (ZWJ).
      icone: z.string().max(8).optional().or(z.literal("")),
      // Produto ofertado. Default retrocompat: credito_novo.
      tipo: z.enum(["credito_novo", "portabilidade", "refinanciamento", "cartao_consignado", "cartao_beneficio"]).optional(),
      filtro: z.object({
        convenioIds: z.array(z.string()).optional(),
        vinculos: z.array(z.string()).optional(),
        situacaoFuncional: z.array(z.string()).optional(),
        prefeituraIds: z.array(z.number().int()).optional(),
        salarioMin: z.number().optional(),
        salarioMax: z.number().optional(),
        idadeMin: z.number().int().optional(),
        idadeMax: z.number().int().optional(),
      }).default({}),
    }).parse(await c.req.json());
    // Isolamento por bancoId: se editando, precisa ser oferta do proprio banco.
    if (body.id) {
      const existing = (await loadOfertas(c.env)).find((o) => o.id === body.id);
      if (!existing) throw Errors.notFound("oferta");
      if (existing.bancoId !== j.banco_id) throw Errors.forbidden("oferta de outro banco");
    }
    const oferta: Oferta = {
      id: body.id ?? nextOfertaId(j.banco_id),
      bancoId: j.banco_id,
      titulo: body.titulo,
      mensagem: body.mensagem,
      taxaAm: body.taxaAm,
      parcelasMax: body.parcelasMax,
      valorMax: body.valorMax,
      filtro: body.filtro as OfertaFiltro,
      ativo: body.ativo,
      criadoEm: body.id ? (await loadOfertas(c.env)).find((o) => o.id === body.id)!.criadoEm : new Date().toISOString(),
      expiraEm: body.expiraEm || undefined,
      criadoPor: String(j.sub),
      icone: body.icone || undefined,
      tipo: body.tipo ?? "credito_novo",
    };
    await persistOferta(c.env, oferta);
    return c.json({ oferta });
  })
  .patch("/v1/portal/banco/ofertas/:id/pausar", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    await refreshOfertas(c.env);
    const o = (await loadOfertas(c.env)).find((x) => x.id === c.req.param("id"));
    if (!o || o.bancoId !== j.banco_id) throw Errors.notFound("oferta");
    o.ativo = false;
    await persistOferta(c.env, o);
    return c.json({ oferta: o });
  })
  .patch("/v1/portal/banco/ofertas/:id/reativar", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    await refreshOfertas(c.env);
    const o = (await loadOfertas(c.env)).find((x) => x.id === c.req.param("id"));
    if (!o || o.bancoId !== j.banco_id) throw Errors.notFound("oferta");
    o.ativo = true;
    await persistOferta(c.env, o);
    return c.json({ oferta: o });
  })

  // --------- Cadastros: Usuarios do banco ----------
  // Isolamento: BancoUsuario tem bancoId — banco novo (bancoId proprio) so
  // enxerga seus usuarios, nunca os do Banco Atlas (bancoId=1) nem de outros.
  .get("/v1/portal/banco/cadastros/usuarios", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const url = new URL(c.req.url);
    const perfil = url.searchParams.get("perfil") as "admin" | "operador" | "consulta" | "relatorios" | null;
    const somenteAdmin = url.searchParams.get("somenteAdmin") === "true";
    // PII hygiene: nunca devolver cpf na listagem; so cpfMasked.
    const usuarios = listUsuarios({ perfil: perfil ?? undefined, somenteAdmin })
      .filter((u) => u.bancoId === (j.banco_id ?? -1))
      .map(({ cpf: _cpf, ...rest }) => rest);
    return c.json({ usuarios });
  })
  .get("/v1/portal/banco/cadastros/usuarios/:id", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const u = getUsuario(c.req.param("id"));
    if (!u || u.bancoId !== (j.banco_id ?? -1)) throw Errors.notFound("usuario");
    const { cpf: _cpf, ...rest } = u;
    return c.json({ usuario: rest });
  })
  .get("/v1/portal/banco/cadastros/usuarios/:id/cpf", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const u = getUsuario(c.req.param("id"));
    // Isolamento CRITICO (LGPD): antes qualquer banco revelava CPF de qualquer
    // usuario de outro banco, com log audit mas sem barrar a leitura.
    if (!u || u.bancoId !== (j.banco_id ?? -1)) throw Errors.notFound("usuario");
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
    // Isolamento: se editando, usuario existente tem que ser do proprio banco.
    if (body.id) {
      const existente = getUsuario(body.id);
      if (existente && existente.bancoId !== (j.banco_id ?? -1)) throw Errors.notFound("usuario");
    }
    // Fallback bancoId=1 removido — banco sem banco_id nao pode criar usuario.
    if (j.banco_id == null) throw Errors.forbidden("banco sem identidade");
    const saved = upsertUsuario({ ...body, bancoId: j.banco_id });
    const { cpf: _cpf, ...rest } = saved;
    return c.json({ usuario: rest });
  })
  .delete("/v1/portal/banco/cadastros/usuarios/:id", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    // Isolamento CRITICO: antes qualquer banco apagava usuario de outro.
    const u = getUsuario(c.req.param("id"));
    if (!u || u.bancoId !== (j.banco_id ?? -1)) throw Errors.notFound("usuario");
    if (!removerUsuario(c.req.param("id"))) throw Errors.notFound("usuario");
    return c.body(null, 204);
  })
  .post("/v1/portal/banco/cadastros/usuarios/:id/reativar", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const u = getUsuario(c.req.param("id"));
    if (!u || u.bancoId !== (j.banco_id ?? -1)) throw Errors.notFound("usuario");
    if (!reativarUsuario(c.req.param("id"))) throw Errors.notFound("usuario");
    return c.json({ ok: true });
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
