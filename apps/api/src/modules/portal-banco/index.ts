import { Hono } from "hono";
import { z } from "zod";
import { calcCET, margemDisponivel, margemTotal } from "@atlas/domain";
import { authRequired, type JwtClaims } from "../../middleware/auth.js";
import { Errors, HttpError } from "../../_shared/errors.js";
import { withIdempotency } from "../../_shared/idempotency.js";
import type { Env } from "../../env.js";
import { COMUNICADOS_MOCK, CONVENIOS_MOCK, SERVIDORES_BUSCA_MOCK } from "./fixtures.js";
import { refreshConvenios } from "./convenios-store.js";
import { refreshComunicados } from "./comunicados-store.js";
import { prefeituras, bancos, pushEvent, type FolhaAdmin } from "../admin/index.js";
import { getConvenioConfig } from "../admin/convenios-config.js";
import { ensurePortabilidadesLoaded, listIntencoesAbertasParaBanco, adicionarOferta } from "../admin/portabilidade-store.js";
import { aplicarAcao, comprometeMargem, criarContratoOuReserva, deriveTipoMargem, getContrato, getContratoEventos, getContratoParcelas, listContratos, persistContrato, refreshContratos, setContratoCcb, tratarFalhaContrato } from "./store.js";
import { listTabelas, getTabela, upsertTabela, removerTabela, reativarTabela, listUsuarios, getUsuario, upsertUsuario, removerUsuario, reativarUsuario, listBancoPresets, upsertBancoPreset, hydrateBancoPresets, exportBancoPresetsRaw, type BancoPerfilPreset } from "./cadastros.js";
import { loadCollection, upsertCollectionRow } from "../../db/repos.js";
import { loadOfertas, refreshOfertas, persistOferta, nextOfertaId, type Oferta, type OfertaFiltro } from "./ofertas-store.js";
import { enviarNotificacao, dispatchTemplateEmail } from "../admin/mailer.js";
import { listExternalLoans, refreshTombamento, externosEmprestimoDe } from "../admin/tombamento.js";
import { appendAudit, auditCtx } from "../admin/auditoria.js";
import type { ContratoFull } from "./store.js";

// externosEmprestimoDe agora vive em admin/tombamento.ts — fonte unica
// compartilhada com prefeitura pra evitar drift entre as duas.

function requireBancoRole(j: JwtClaims): void {
  if (j.role !== "banco") throw Errors.forbidden("Requer perfil banco");
}

// Presets CUSTOMIZADOS de permissao por banco (banco_perfil_presets).
// Hidrata do PG no primeiro request; write-through em cada upsert.
let _presetsBancoLoad: Promise<void> | null = null;
async function ensurePresetsBancoLoaded(env: Env): Promise<void> {
  if (_presetsBancoLoad) return _presetsBancoLoad;
  _presetsBancoLoad = (async () => {
    try {
      const rows = await loadCollection<BancoPerfilPreset>(env, "banco_perfil_presets");
      hydrateBancoPresets(rows);
    } catch { _presetsBancoLoad = null; }
  })();
  return _presetsBancoLoad;
}
async function persistBancoPreset(env: Env, preset: BancoPerfilPreset): Promise<void> {
  // Chave composta bancoId:key pra nao colidir entre bancos.
  const id = `${preset.bancoId}:${preset.key}`;
  try { await upsertCollectionRow(env, "banco_perfil_presets", id, preset); } catch { /* fail-safe */ }
}

const brlNotif = (n: number) => `R$ ${(Math.round(n * 100) / 100).toFixed(2).replace(".", ",")}`;

/** Mapeia acao do banco -> status do template de simulacao. */
function acaoToSimStatus(acao: string): "aprovada" | "recusada" | "averbada" | null {
  if (acao === "aprovar") return "aprovada";
  if (acao === "cancelar") return "recusada";
  if (acao === "confirmar") return "averbada";
  return null;
}

/** Deriva simulacaoTipo do contrato (EMPRESTIMO | REFIN | ECONSIGNADO). */
function contratoToSimTipo(ct: ContratoFull): "emprestimo" | "cartao_consignado" | "cartao_beneficio" | "portabilidade" {
  const t = (ct.tipoContrato ?? "").toUpperCase();
  if (t === "REFIN") return "portabilidade";
  if (t === "ECONSIGNADO") {
    return ct.tipoMargem === "CARTAO_BENEFICIOS" ? "cartao_beneficio" : "cartao_consignado";
  }
  return "emprestimo";
}

/** Notifica o servidor (e-mail, best-effort) sobre uma ação do banco no contrato.
 *  Fluxo real, tempo real: tenta template editavel primeiro; cai no hardcoded
 *  como fallback (nunca deixa de notificar por falta de template ativo). */
function notifyMovimentacao(
  c: { env: Env; executionCtx: { waitUntil(p: Promise<unknown>): void } },
  ct: ContratoFull,
  acao: string,
  motivo?: string,
): void {
  const srv = SERVIDORES_BUSCA_MOCK.find((s) => s.matricula === ct.matricula);
  if (!srv?.email) return;
  const srvEmail: string = srv.email;

  const conv = CONVENIOS_MOCK.find((cv) => cv.id === ct.convenioId);
  const bancoNome = bancos.find((b) => b.id === ct.bancoId)?.nome ?? `Banco ${ct.bancoId}`;
  const vars: Record<string, string> = {
    nome: ct.nome,
    matricula: ct.matricula,
    prefeitura: conv?.prefeitura ?? "",
    adf: ct.adf,
    banco: bancoNome,
    valor: brlNotif(ct.valorFinanciado),
    parcelas: String(ct.totalParcelas),
    valorParcela: brlNotif(ct.valorParcela),
    motivo: motivo ?? "não informado",
    contract_name: `CCB-${new Date().getFullYear()}-${ct.adf}`,
  };

  const simStatus = acaoToSimStatus(acao);
  const p = (async () => {
    // 1) Tenta template editavel do consultor (/averbadora/emails).
    if (simStatus) {
      const r = await dispatchTemplateEmail(
        c.env,
        { evento: "simulacao", publico: "servidor", simulacaoTipo: contratoToSimTipo(ct), simulacaoStatus: simStatus },
        srvEmail,
        vars,
      );
      if (r.usouTemplate) return; // enviou via template, fim.
    }
    // 2) Fallback hardcoded (acoes sem template: suspender/quitar/alongar/alterar
    //    e casos onde nao ha template ativo pro (tipo, status) especifico).
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
    await enviarNotificacao(c.env, {
      destinoPadrao: srvEmail,
      titulo: info.titulo,
      mensagem: info.mensagem,
      detalhes: [
        { label: "Banco", valor: bancoNome },
        { label: "Valor", valor: brlNotif(ct.valorFinanciado) },
        { label: "Parcela", valor: `${ct.totalParcelas}x de ${brlNotif(ct.valorParcela)}` },
        { label: "Situação", valor: ct.situacao },
      ],
    });
  })();
  try { c.executionCtx.waitUntil(p); } catch { void p; }
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

/** Indice absoluto de mes (ano*12 + mes-1). Permite subtrair competencias sem
 *  lidar com virada de ano na mao. */
const mesAbs = (mes: number, ano: number): number => ano * 12 + (mes - 1);

/** Extrai {mes, ano} de um `lancamento` no formato pt-BR "DD/MM/YYYY"
 *  (`criarContratoOuReserva` grava com `toLocaleDateString("pt-BR")`).
 *  null quando o formato nao bate — o caller cai num fallback. */
function mesDoLancamento(lancamento: string): { mes: number; ano: number } | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((lancamento ?? "").trim());
  if (!m) return null;
  const mes = Number(m[2]);
  const ano = Number(m[3]);
  if (mes < 1 || mes > 12) return null;
  return { mes, ano };
}

/** Janela de meses em que uma divida compromete margem, em offsets relativos
 *  a HOJE (negativo = passado). Usada pra responder "qual era/sera a margem
 *  na competencia X" em vez de devolver sempre a margem de hoje. */
interface JanelaDivida { inicio: number; fim: number; valor: number }

const comprometidoNaJanela = (janelas: JanelaDivida[], off: number): number =>
  Math.round(
    janelas.filter((j) => off >= j.inicio && off <= j.fim).reduce((a, j) => a + j.valor, 0) * 100,
  ) / 100;

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

  // Identidade do banco logado — usado no header do portal pra mostrar nome.
  .get("/v1/portal/banco/me", (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    if (j.banco_id == null) throw Errors.forbidden("banco sem identidade");
    const b = bancos.find((x) => x.id === j.banco_id);
    return c.json({ id: j.banco_id, nome: b?.nome ?? `Banco ${j.banco_id}` });
  })

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
        const cfg = getConvenioConfig(cv.id);
        return {
          id: cv.id, nome: cv.nome, prefeitura: cv.prefeitura, uf: cv.uf,
          exigeCcb: pref?.exigeCcb ?? false,
          exigeBanco2FA: pref?.exigeBanco2FA ?? false,
          // Regras definidas pela averbadora/prefeitura no /averbadora/convenios.
          // Banco enxerga como readonly e o backend valida ao salvar tabela.
          maxParcelas: cfg?.maxParcelas ?? 96,
          taxaMaxAm: cfg?.taxaMaxAm ?? null,
          idadeMin: cfg?.idadeMin ?? null,
          idadeMax: cfg?.idadeMax ?? null,
          maxComprometimentoPct: cfg?.maxComprometimentoPct ?? null,
          vinculosAceitos: cfg?.vinculosAceitos ?? [],
          formatoImportacao: cfg?.formatoImportacao ?? null,
          regrasEspeciais: cfg?.regrasEspeciais ?? "",
          vigenciaInicio: cfg?.vigenciaInicio ?? null,
          vigenciaFim: cfg?.vigenciaFim ?? null,
          prazoTravaHoras: cfg?.prazoTravaHoras ?? null,
          prazoPortabilidadeDU: cfg?.prazoPortabilidadeDU ?? null,
          configAtivo: cfg?.ativo ?? null,
        };
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

  // --------- Portabilidade marketplace (banco destino) ----------
  // Lista intencoes ABERTAS onde este banco NAO e' o origem — ou seja,
  // oportunidades onde ele pode entrar como banco destino.
  .get("/v1/portal/banco/portabilidade", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    if (j.banco_id == null) throw Errors.forbidden("banco sem identidade");
    await ensurePortabilidadesLoaded(c.env);
    const intencoes = listIntencoesAbertasParaBanco(j.banco_id);
    return c.json({ intencoes });
  })
  .post("/v1/portal/banco/portabilidade/:id/ofertar", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    if (j.banco_id == null) throw Errors.forbidden("banco sem identidade");
    await ensurePortabilidadesLoaded(c.env);
    const body = z.object({
      taxaAmProposta: z.number().min(0).max(1),
      novaParcela: z.number().min(1),
      novoPrazo: z.number().int().min(1).max(120),
      observacao: z.string().max(500).optional(),
    }).parse(await c.req.json());
    const bancoNome = bancos.find((b) => b.id === j.banco_id)?.nome ?? `Banco ${j.banco_id}`;
    const r = await adicionarOferta(c.env, c.req.param("id"), j.banco_id, bancoNome, body);
    if (!r.ok) throw Errors.validation({ oferta: r.motivo });
    return c.json({ intencao: r.intencao, oferta: r.oferta });
  })

  // --------- Visao Geral ----------
  .get("/v1/portal/banco/visao-geral", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    // Sincroniza com o PG antes de contar — banco recem-logado num isolate
    // fresh via zero em tudo mesmo com contratos existentes no banco.
    await refreshContratos(c.env);
    const activeId = await getActiveConvenioId(c.env, j);
    const conv = CONVENIOS_MOCK.find((cv) => cv.id === activeId);
    // Folhas REAIS da prefeitura do convenio: o corte/repasse verdadeiros de
    // cada competencia sao os que a prefeitura definiu ao abrir a folha (datas
    // completas), NAO o "dia" generico do convenio. Cliente pediu 23/07/2026
    // que o card do banco siga a folha. Ausencia de folha -> UI cai no dia do
    // convenio como "prevista".
    const folhasPref = conv
      ? (await loadCollection<FolhaAdmin>(c.env, "admin_folhas"))
          .filter((f) => f.prefeituraId === conv.prefeituraId)
          .sort((a, b) => a.competencia.localeCompare(b.competencia))
          .map((f) => ({ competencia: f.competencia, dataCorte: f.dataCorte, dataRepasse: f.dataRepasse, status: f.status }))
      : [];
    // Banco sem convênio próprio: sem contratos e sem dados de outro banco.
    const contratos = conv ? listContratos({ convenioId: activeId }) : [];
    const ativos = contratos.filter((ct) => ct.situacao === "Ativo").length;
    const pendentes = contratos.filter((ct) => ct.situacao.startsWith("Aguardando")).length;
    // Painel de propostas: buckets alinhados ao ciclo de vida do contrato.
    // - emAnalise: proposta chegou no banco, aguardando decisao (Aguardando*)
    // - aprovadas: banco aprovou, ADF pendente (contem "aprov" ou "aguardando averb/adf")
    // - formalizadas: averbadas em folha (Ativo / Averbado / Formalizado)
    // - recusadasExpiradas: nao entram na carteira (recus/reprov/rejeit/negad/expir/cancel)
    let emAnalise = 0, aprovadas = 0, formalizadas = 0, recusadasExpiradas = 0;
    const volumePorConvenio = new Map<string, number>();
    for (const ct of contratos) {
      const s = ct.situacao.toLowerCase();
      if (s === "expirado" || s === "cancelado" || s.includes("recus") || s.includes("reprov") || s.includes("rejeit") || s.includes("negad") || s.includes("estorn")) recusadasExpiradas++;
      else if (s === "ativo" || s === "averbado" || s === "formalizado") formalizadas++;
      else if (s.includes("aprov")) aprovadas++;
      else if (s.startsWith("aguard")) emAnalise++;
      // Volume: soma o financiado dos contratos que ficam na carteira
      // (formalizados + aprovados que viram carteira). Agrupa por convenio pra
      // banco multi-convenio ver a fatia de cada um.
      if (s === "ativo" || s === "averbado" || s === "formalizado" || s.includes("aprov")) {
        const nomeConv = CONVENIOS_MOCK.find((cv) => cv.id === ct.convenioId)?.nome ?? ct.convenioId;
        volumePorConvenio.set(nomeConv, (volumePorConvenio.get(nomeConv) ?? 0) + (ct.valorFinanciado ?? 0));
      }
    }
    return c.json({
      convenio: conv
        ? { id: conv.id, nome: conv.nome, prefeitura: conv.prefeitura }
        : { id: "", nome: "Sem convênio", prefeitura: "—" },
      kpis: {
        carteira: { count: ativos, percentual: ativos > 0 ? 1 : 0 },
        novosNoMes: { count: contratos.filter((ct) => ct.lancamento.includes("/06/")).length },
        pendencias: { count: pendentes },
        propostas: { emAnalise, aprovadas, formalizadas, recusadasExpiradas },
        volumePorConvenio: Array.from(volumePorConvenio.entries()).map(([nome, valor]) => ({ nome, valor: Math.round(valor * 100) / 100 })),
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
      // Folhas reais (corte/repasse por competencia) — a UI usa isto como fonte
      // primaria e cai no dia do convenio so quando nao ha folha aberta.
      folhas: folhasPref,
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
    if (j.banco_id == null) throw Errors.forbidden("banco sem identidade");
    await refreshContratos(c.env);
    const contatos = matriculasContato(j.banco_id);
    const cpfNorm = body.cpf?.replace(/\D/g, "");
    const matchPred = (s: typeof SERVIDORES_BUSCA_MOCK[number]) =>
      cpfNorm ? s.cpf === cpfNorm : body.matricula ? s.matricula === body.matricula : false;
    // Busca só entre os contatos do banco (não na base geral da prefeitura).
    const found = SERVIDORES_BUSCA_MOCK.find((s) => contatos.has(s.matricula) && matchPred(s));
    if (found) {
      // LGPD: o banco não vê o salário líquido — só a MARGEM disponível.
      // Cliente reportou 22/07/2026: UI da ficha mostrava R$ 0,00 nos 3 cards
      // (total/utilizado/disponivel) porque a UI fazia `f.salarioLiquido ?? 0`
      // e o endpoint tirava salario (LGPD). Fix: retornar `margens` pre-
      // calculadas por bucket (mesma forma do /me/matriculas), zero salario.
      const { salarioLiquido, ...ficha } = found;
      await refreshTombamento(c.env); // pra listExternalLoans ver o tombamento atual
      const atlasComprometido = listContratos({ matricula: found.matricula })
        .filter((ct) => comprometeMargem(ct.situacao) && deriveTipoMargem(ct) === "EMPRESTIMO")
        .reduce((a, ct) => a + ct.valorParcela, 0);
      const externoComprometido = externosEmprestimoDe(found.matricula).reduce((a, l) => a + l.valorParcela, 0);
      const comprometido = atlasComprometido + externoComprometido;
      const margemDisponivelValor = Math.round(margemDisponivel(salarioLiquido, comprometido, "EMPRESTIMO") * 100) / 100;
      // Margens por bucket — UI usa direto sem precisar de salario.
      const margens = (["EMPRESTIMO", "CARTAO_CONSIGNADO", "CARTAO_BENEFICIOS"] as const).map((tipo) => {
        const compBucket = tipo === "EMPRESTIMO" ? comprometido : 0;
        return {
          tipo,
          total: Math.round(margemTotal(salarioLiquido, tipo) * 100) / 100,
          utilizado: Math.round(compBucket * 100) / 100,
          disponivel: Math.round(margemDisponivel(salarioLiquido, compBucket, tipo) * 100) / 100,
        };
      });
      return c.json({ ficha: { ...ficha, margemDisponivel: margemDisponivelValor, margens } });
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
    if (j.banco_id == null) throw Errors.forbidden("banco sem identidade");
    await refreshContratos(c.env);
    const contatos = matriculasContato(j.banco_id);
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
    if (j.banco_id == null) throw Errors.forbidden("banco sem identidade");
    await refreshContratos(c.env);
    if (!matriculasContato(j.banco_id).has(s.matricula)) {
      throw Errors.forbidden("Este servidor não entrou em contato com o banco.");
    }
    await refreshTombamento(c.env); // pra listExternalLoans ver o tombamento atual
    const total = margemTotal(s.salarioLiquido, "EMPRESTIMO");
    // Comprometido real = parcelas de operações já aprovadas pelo banco (bucket
    // EMPRESTIMO) + emprestimos EXTERNOS (tombamento) do mesmo bucket. Sem os
    // externos, o banco liberava simulacao acima do teto real do servidor (a
    // prefeitura e o proprio servidor ja descontam). Cliente pediu 21/07/2026.
    const contratosAtivos = listContratos({ matricula: s.matricula })
      .filter((ct) => comprometeMargem(ct.situacao) && deriveTipoMargem(ct) === "EMPRESTIMO");
    const externos = externosEmprestimoDe(s.matricula);
    // Cliente reportou 23/07/2026: pedindo Agosto (mes futuro) a tela devolvia a
    // margem de HOJE — `total`/`disponivel` ignoravam body.mes/body.ano por
    // completo. Agora cada divida vira uma JANELA de meses (inicio..fim) em
    // offsets relativos a hoje, e a margem e' recalculada para a competencia
    // pedida — passado ou futuro.
    const agora = new Date();
    const absHoje = mesAbs(agora.getMonth() + 1, agora.getFullYear());

    const janelas: JanelaDivida[] = [
      // Contrato Atlas: parcela 1 cai no mes do `lancamento`; compromete margem
      // por `totalParcelas` meses a partir dali. Sem lancamento parseavel, cai
      // no fallback "comecou ha parcelasPagas meses".
      ...contratosAtivos.map((ct) => {
        const l = mesDoLancamento(ct.lancamento);
        const inicio = l ? mesAbs(l.mes, l.ano) - absHoje : -ct.parcelasPagas;
        return { inicio, fim: inicio + Math.max(1, ct.totalParcelas) - 1, valor: ct.valorParcela };
      }),
      // Externo (tombamento): nao traz data de inicio, so o par
      // total/restantes — deriva quantas ja venceram pra achar o inicio.
      ...externos.map((l) => {
        const totalP = l.totalParcelas > 0 ? l.totalParcelas : l.parcelasRestantes;
        const inicio = -Math.max(0, totalP - l.parcelasRestantes);
        return { inicio, fim: inicio + Math.max(1, totalP) - 1, valor: l.valorParcela };
      }),
    ];

    const offPedido = mesAbs(body.mes, body.ano) - absHoje;
    const comprometidoNaCompetencia = comprometidoNaJanela(janelas, offPedido);
    const disponivel = margemDisponivel(s.salarioLiquido, comprometidoNaCompetencia, "EMPRESTIMO");

    // Projecao dos 4 meses SEGUINTES ao pedido. `projecoesQuatroMeses` ja
    // devolve mes+1..mes+4, mas o map antigo usava `idx` (0..3) como se o
    // indice 0 fosse o mes pedido — a projecao inteira saia deslocada um mes
    // (o card "Set" mostrava o numero de Agosto). Agora cada mes e' calculado
    // com o proprio offset.
    const projecao = projecoesQuatroMeses(body.mes, body.ano).map((p) => {
      const off = mesAbs(p.mes, p.ano) - absHoje;
      const disponivelNoMes = Math.max(
        0,
        Math.round((total - comprometidoNaJanela(janelas, off)) * 100) / 100,
      );
      return {
        competencia: p.yyyymm,
        rotulo: `${monthLabel(p.mes)}/${p.ano}`,
        valor: disponivelNoMes,
      };
    });
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
    if (j.banco_id == null) throw Errors.forbidden("banco sem identidade");
    const bancoId = j.banco_id;
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
    // Parseia DD/MM/YYYY -> ISO 00:00 pra fallback do atualizadoEm sem
    // introduzir `new Date()` que muda a cada request (bug corrigido no
    // admin/contratos, replicado aqui). Ordem de precedencia:
    //   1) evento mais recente  2) ccb anexada  3) criadoEmIso  4) lancamento ISO
    const parseLanc = (s: string): string | undefined => {
      const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s ?? "");
      return m ? `${m[3]}-${m[2]}-${m[1]}T00:00:00.000Z` : undefined;
    };
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
        atualizadoEm: ultimo ?? ct.ccbAnexadoEm ?? ct.criadoEmIso ?? parseLanc(ct.lancamento) ?? "",
        telefoneServidor: srv?.telefone,
        ccbKey: ct.ccbKey,
        ccbAnexadoEm: ct.ccbAnexadoEm,
        ccbHistorico: ct.ccbHistorico,
      };
    });
    // Mais novos no topo (cliente pediu 21/07/2026 — mesmo padrao de
    // /prefeitura/contratos e /admin/contratos).
    contratos.sort((a, b) => (b.atualizadoEm ?? "").localeCompare(a.atualizadoEm ?? ""));
    return c.json({ contratos, total: contratos.length });
  })

  // Lista contratos com falha em folha pra o banco tratar (nova pendencia).
  // Path FORA de /contratos/:adf pra evitar colisao com o trie-router do Hono
  // — antes estava em /contratos/falhas e caia no handler /:adf mesmo com a
  // rota registrada primeiro (Hono prefere match mais especifico do trie).
  .get("/v1/portal/banco/falhas", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    await refreshContratos(c.env);
    const list = listContratos({}).filter(
      (ct) => ct.bancoId === j.banco_id && ct.situacao.toLowerCase().includes("falha em folha"),
    );
    return c.json({ contratos: list });
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
  // Idempotencia via header Idempotency-Key — retorno cacheado por 24h.
  .post("/v1/portal/banco/contratos/averbar/:tipo", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const tipo = OperacaoTipoSchema.parse(c.req.param("tipo")?.toUpperCase());
    const body = NovoContratoBody.parse(await c.req.json());
    const idemKey = c.req.header("Idempotency-Key") ?? c.req.header("idempotency-key");
    const idemScope = `banco:${j.banco_id}:POST:/v1/portal/banco/contratos/averbar/${tipo}`;
    const idem = await withIdempotency(c.env, idemKey, idemScope, async () => {
      const ct = await persistir(j, c.env, tipo, body, false);
      await persistContrato(c.env, ct.adf);
      const bancoNome = bancos.find((b) => b.id === ct.bancoId)?.nome ?? `Banco ${ct.bancoId}`;
      const conv = CONVENIOS_MOCK.find((cv) => cv.id === ct.convenioId);
      const prefNome = conv?.prefeitura ?? "prefeitura";
      pushEvent(
        "info",
        "averbadora.notif_averbacao",
        `${bancoNome} averbou a proposta ${ct.adf} (matricula ${ct.matricula}, ${prefNome}) — pronta pra ADF na competencia atual.`,
      );
      return { status: 200, body: ct };
    });
    if (idem.replayed) c.header("Idempotent-Replay", "true");
    return c.json(idem.result);
  })
  .post("/v1/portal/banco/contratos/reservar/:tipo", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const tipo = OperacaoTipoSchema.parse(c.req.param("tipo")?.toUpperCase());
    const body = NovoContratoBody.parse(await c.req.json());
    const idemKey = c.req.header("Idempotency-Key") ?? c.req.header("idempotency-key");
    const idemScope = `banco:${j.banco_id}:POST:/v1/portal/banco/contratos/reservar/${tipo}`;
    const idem = await withIdempotency(c.env, idemKey, idemScope, async () => {
      const ct = await persistir(j, c.env, tipo, body, true);
      await persistContrato(c.env, ct.adf);
      return { status: 200, body: ct };
    });
    if (idem.replayed) c.header("Idempotent-Replay", "true");
    return c.json(idem.result);
  })

  // Banco trata a falha reportada pela averbadora — escolhe uma das 3 acoes.
  // Fluxo F1-falha do plano: averbadora reporta falha -> ADF vira 'falha' +
  // contrato 'Falha em folha' + notificacao pro banco -> banco decide.
  // Path FORA de /contratos/:adf pelo mesmo motivo do GET /falhas — Hono
  // priorizava /:adf/:acao mesmo com /tratar-falha registrada antes.
  .post("/v1/portal/banco/tratar-falha/:adf", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const adf = c.req.param("adf");
    const body = z
      .object({
        acao: z.enum(["reenviar", "cancelar", "cobranca_direta"]),
        motivo: z.string().min(3).max(500),
      })
      .parse(await c.req.json());
    const idemKey = c.req.header("Idempotency-Key") ?? c.req.header("idempotency-key");
    const idemScope = `banco:${j.banco_id}:POST:/v1/portal/banco/tratar-falha/${adf}`;
    const idem = await withIdempotency(c.env, idemKey, idemScope, async () => {
      await refreshContratos(c.env);
      const owner = getContrato(adf);
      if (!owner || owner.bancoId !== (j.banco_id ?? -1)) throw Errors.notFound("contrato");
      if (!owner.situacao.toLowerCase().includes("falha em folha")) {
        throw Errors.validation({ contrato: "contrato nao esta em falha — nada pra tratar" });
      }
      const r = tratarFalhaContrato(adf, body.acao, body.motivo, `user:${j.sub}`);
      if (!r) throw Errors.notFound("contrato");
      await persistContrato(c.env, adf);
      appendAudit(auditCtx(c), {
        categoria: "margem",
        acao: `banco_falha_${body.acao}`,
        propostaId: adf,
        matricula: r.matricula,
        cpf: r.cpfMasked,
        userId: `banco:${j.banco_id ?? "?"}`,
        userRole: "banco",
        detalhes: `Banco ${j.banco_id} tratou falha do contrato ${adf} com acao "${body.acao}" — motivo: ${body.motivo}.`,
      });
      pushEvent(
        "info",
        "banco.tratou_falha",
        `Banco ${j.banco_id} tratou falha do contrato ${adf} com acao "${body.acao}": ${body.motivo}`,
      );
      const acaoParaNotif = body.acao === "reenviar" ? "aprovar" : body.acao === "cancelar" ? "cancelar" : "suspender";
      notifyMovimentacao(c, r, acaoParaNotif, `Tratamento de falha: ${body.motivo}`);
      return { status: 200, body: { contrato: r } };
    });
    if (idem.replayed) c.header("Idempotent-Replay", "true");
    return c.json(idem.result);
  })

  // --------- Acoes em contratos ----------
  // Idempotencia via Idempotency-Key — util pra evitar dupla-aprovacao/quitacao
  // se o operador do banco clicar 2x ou o cliente retentar depois de timeout.
  .post("/v1/portal/banco/contratos/:adf/:acao", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const adf = c.req.param("adf");
    const acao = z.enum(["quitar", "suspender", "cancelar", "alongar", "alterar", "confirmar", "aprovar"]).parse(c.req.param("acao"));
    const raw = c.req.header("content-type")?.includes("json") ? await c.req.json().catch(() => ({})) : {};
    const body = z
      .object({ motivo: z.string().optional(), parcelasExtras: z.number().int().optional(), observacoes: z.string().optional(), codigoVerba: z.string().optional() })
      .parse(raw);
    const idemKey = c.req.header("Idempotency-Key") ?? c.req.header("idempotency-key");
    const idemScope = `banco:${j.banco_id}:POST:/v1/portal/banco/contratos/${adf}/${acao}`;
    const idem = await withIdempotency(c.env, idemKey, idemScope, async () => {
      await refreshContratos(c.env); // garante que o contrato/reserva (de outro isolate) esteja no Map antes de agir
      // Isolamento: verifica dono antes de aplicar acao. Sem isso qualquer banco
      // podia cancelar/aprovar/suspender contrato de outro adivinhando o ADF.
      const owner = getContrato(adf);
      if (!owner || owner.bancoId !== (j.banco_id ?? -1)) throw Errors.notFound("contrato");
      // Fluxo novo (pedido do cliente): banco so aprova DEPOIS de anexar o
      // contrato assinado — MAS so quando a prefeitura exige CCB (config por
      // prefeitura). Se a prefeitura tem exigeCcb=false, deixa aprovar sem PDF.
      if (acao === "aprovar" && !owner.ccbKey) {
        const conv = CONVENIOS_MOCK.find((cv) => cv.id === owner.convenioId);
        const pref = conv ? prefeituras.find((p) => p.id === conv.prefeituraId) : undefined;
        const exigeCcb = pref?.exigeCcb === true;
        if (exigeCcb) {
          throw Errors.validation({
            contrato: `anexe o contrato assinado antes de aprovar a proposta (${pref?.nome ?? "prefeitura"} exige CCB).`,
          });
        }
      }
      const r = aplicarAcao(adf, acao, `user:${j.sub}`, body.motivo, body);
      if (!r) throw Errors.notFound("contrato");
      await persistContrato(c.env, adf); // write-through: decisão do banco persiste e o servidor vê
      // Auditoria: decisao contratual do banco (aprovar/recusar/quitar/etc)
      // muda estado de dinheiro e obrigacao. Categoria pre_reserva enquanto
      // esta em analise; margem quando ja e contrato ativo (quitar/suspender).
      const bancoNomeAudit = bancos.find((b) => b.id === (j.banco_id ?? -1))?.nome ?? `Banco ${j.banco_id}`;
      const categoriaAudit = (acao === "quitar" || acao === "suspender" || acao === "alongar" || acao === "alterar")
        ? "margem" as const
        : "pre_reserva" as const;
      const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;
      appendAudit(auditCtx(c), {
        categoria: categoriaAudit,
        acao: `banco_${acao}`,
        propostaId: adf,
        matricula: r.matricula,
        cpf: r.cpfMasked,
        userId: `banco:${j.banco_id ?? "?"}`,
        userRole: "banco",
        detalhes: `${bancoNomeAudit} ${acao === "aprovar" ? "aprovou" : acao === "confirmar" ? "averbou" : acao === "quitar" ? "quitou" : acao === "cancelar" ? "cancelou" : acao === "suspender" ? "suspendeu" : acao === "alongar" ? "alongou" : "alterou"} a proposta ADF ${adf} (parcela ${brl(r.valorParcela)} x ${r.totalParcelas}, ${r.nome})${body.motivo ? ` — motivo: ${body.motivo}` : ""}.`,
      });
      // Notifica a averbadora sempre que o banco APROVA ou CONFIRMA.
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
      return { status: 200, body: { contrato: r } };
    });
    if (idem.replayed) c.header("Idempotent-Replay", "true");
    return c.json(idem.result);
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
        // Taxa unica a.m. (0..1 = 0..100%). Cliente pediu 22/07/2026: antes
        // era taxaMinAm/taxaMaxAm mas nada consumia o intervalo (puramente
        // decorativo). Aceita legacy pra tabelas antigas ainda no PG.
        taxaAm: z.number().min(0).max(1).optional(),
        taxaMinAm: z.number().min(0).max(1).optional(),
        taxaMaxAm: z.number().min(0).max(1).optional(),
        // Cliente pediu prazo max fechado — so aceita 12/24/36/48/60/72/96/120.
        // Bloqueio server-side alem do dropdown fechado no form.
        prazoMaxMeses: z.union([
          z.literal(12), z.literal(24), z.literal(36), z.literal(48),
          z.literal(60), z.literal(72), z.literal(96), z.literal(120),
        ]),
        vigenciaInicio: z.string(),
        vigenciaFim: z.string().optional(),
        ativo: z.boolean().default(true),
      })
      .refine((b) => b.taxaAm != null || b.taxaMaxAm != null, {
        message: "taxaAm obrigatoria (ou taxaMaxAm em requests legadas)",
        path: ["taxaAm"],
      })
      .parse(await c.req.json());
    // Normaliza pra taxaAm unica — legacy taxaMaxAm vira taxaAm (topo era o
    // valor efetivamente praticado). Descarta taxaMinAm/taxaMaxAm no persist.
    const taxaAmFinal = body.taxaAm ?? body.taxaMaxAm!;
    const bodyNorm = {
      id: body.id,
      convenioId: body.convenioId,
      convenio: body.convenio,
      taxaAm: taxaAmFinal,
      prazoMaxMeses: body.prazoMaxMeses,
      vigenciaInicio: body.vigenciaInicio,
      vigenciaFim: body.vigenciaFim,
      ativo: body.ativo,
    };
    // Isolamento: so pode criar/editar tabela em convenio proprio.
    const meusConvenios = new Set(CONVENIOS_MOCK.filter((cv) => cv.bancoId === j.banco_id).map((cv) => cv.id));
    if (!meusConvenios.has(body.convenioId)) throw Errors.notFound("convenio");
    // Se editando (id), tabela existente tambem tem que ser de convenio proprio.
    if (body.id) {
      const existente = await getTabela(c.env, body.id);
      if (existente && !meusConvenios.has(existente.convenioId)) throw Errors.notFound("tabela");
    }
    // REGRAS DO CONVENIO (definidas pela averbadora + prefeitura). Banco nao
    // pode criar tabela que viole nenhum dos parametros combinados. Tudo que
    // conseguir passar cliente-side ainda e' validado aqui.
    const cfg = getConvenioConfig(body.convenioId);
    if (cfg) {
      const err: Record<string, string> = {};
      if (body.prazoMaxMeses > cfg.maxParcelas) {
        err.prazoMaxMeses = `Prazo maximo do convenio e' de ${cfg.maxParcelas} parcelas (teto definido pela prefeitura). Reduza o prazo desta tabela.`;
      }
      // Taxa a.m.: teto vem em % (ex. 1.87) — normaliza pra fracao (0.0187)
      // porque bodyNorm.taxaAm ja esta em fracao (0..1).
      const taxaTetoFrac = cfg.taxaMaxAm / 100;
      if (taxaAmFinal > taxaTetoFrac + 1e-6) {
        err.taxaAm = `Taxa acima do teto do convenio (${cfg.taxaMaxAm}% a.m.). Reduza a taxa desta tabela.`;
      }
      // Vigencia: interval da tabela deve estar CONTIDO no da averbadora.
      // Comparacao lexicografica funciona pra ISO YYYY-MM-DD.
      if (cfg.vigenciaInicio && body.vigenciaInicio < cfg.vigenciaInicio) {
        err.vigenciaInicio = `Inicio da vigencia antes do convenio (${cfg.vigenciaInicio}). Ajuste a data.`;
      }
      if (cfg.vigenciaFim && body.vigenciaFim && body.vigenciaFim > cfg.vigenciaFim) {
        err.vigenciaFim = `Fim da vigencia depois do convenio (${cfg.vigenciaFim}). Ajuste a data.`;
      }
      if (cfg.vigenciaFim && !body.vigenciaFim) {
        // Convenio tem fim mas tabela ficaria aberta — obriga a fechar no
        // maximo no fim do convenio pra evitar tabela "orfa" apos expiracao.
        err.vigenciaFim = `Convenio tem fim em ${cfg.vigenciaFim}. Defina uma vigencia fim para a tabela (<= essa data).`;
      }
      if (Object.keys(err).length > 0) throw Errors.validation(err);
    }
    const saved = await upsertTabela(c.env, bodyNorm, j.banco_id!);
    appendAudit(auditCtx(c), {
      categoria: "convenio_config",
      acao: body.id ? "banco_tabela_editada" : "banco_tabela_criada",
      userId: `banco:${j.banco_id}`,
      userRole: "banco",
      detalhes: `Banco ${j.banco_id} ${body.id ? "editou" : "criou"} tabela (id=${saved.id}) no convenio ${body.convenioId}: taxa=${(taxaAmFinal * 100).toFixed(2)}% a.m., prazoMax=${body.prazoMaxMeses}, ativo=${body.ativo}. Muda o cardapio de credito exposto ao servidor.`,
    });
    return c.json({ tabela: saved });
  })
  .delete("/v1/portal/banco/cadastros/tabela-emprestimos/:id", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    // Isolamento: so desativa se a tabela for de convenio proprio.
    const t = await getTabela(c.env, c.req.param("id"));
    const meusConvenios = new Set(CONVENIOS_MOCK.filter((cv) => cv.bancoId === j.banco_id).map((cv) => cv.id));
    if (!t || !meusConvenios.has(t.convenioId)) throw Errors.notFound("tabela");
    if (!(await removerTabela(c.env, c.req.param("id")))) throw Errors.notFound("tabela");
    appendAudit(auditCtx(c), {
      categoria: "convenio_config",
      acao: "banco_tabela_desativada",
      userId: `banco:${j.banco_id}`,
      userRole: "banco",
      detalhes: `Banco ${j.banco_id} desativou tabela ${c.req.param("id")} (convenio ${t.convenioId}, taxa ${((t as unknown as { taxaAm?: number; taxaMaxAm?: number }).taxaAm ?? (t as unknown as { taxaMaxAm?: number }).taxaMaxAm ?? 0)}).`,
    });
    return c.body(null, 204);
  })
  .post("/v1/portal/banco/cadastros/tabela-emprestimos/:id/reativar", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const t = await getTabela(c.env, c.req.param("id"));
    const meusConvenios = new Set(CONVENIOS_MOCK.filter((cv) => cv.bancoId === j.banco_id).map((cv) => cv.id));
    if (!t || !meusConvenios.has(t.convenioId)) throw Errors.notFound("tabela");
    if (!(await reativarTabela(c.env, c.req.param("id")))) throw Errors.notFound("tabela");
    appendAudit(auditCtx(c), {
      categoria: "convenio_config",
      acao: "banco_tabela_reativada",
      userId: `banco:${j.banco_id}`,
      userRole: "banco",
      detalhes: `Banco ${j.banco_id} reativou tabela ${c.req.param("id")} (convenio ${t.convenioId}).`,
    });
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
    // Whitelist rigida: PDF, DOCX e Excel (XLS/XLSX). Cliente pediu apenas esses
    // 3 formatos — nao aceita DOC (formato antigo), ODT, RTF, TXT, imagens etc.
    // Alguns navegadores enviam type vazio pra DOCX/XLSX — cai no fallback por extensao.
    const ACEITOS = new Set([
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]);
    const extOk = /\.(pdf|docx|xls|xlsx)$/i.test(file.name || "");
    if (file.type ? !ACEITOS.has(file.type) : !extOk) {
      throw Errors.validation({ file: "apenas PDF, DOCX ou Excel (XLS/XLSX)" });
    }
    const MAX = 15 * 1024 * 1024; // 15 MB
    if (file.size > MAX) throw Errors.validation({ file: "arquivo maior que 15 MB" });
    const adf = adfRaw.replace(/[^\w.-]/g, "").slice(0, 40);
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const safeName = (file.name || "contrato.bin").replace(/[^\w.-]/g, "_").slice(0, 60);
    const key = `ccb/${j.banco_id}/${adf}/${ts}-${safeName}`;
    const buf = await file.arrayBuffer();
    // Preserva o contentType real do arquivo pra que o download/abertura funcione
    // corretamente no navegador. Fallback pra octet-stream se o browser nao enviou.
    const lower = safeName.toLowerCase();
    const storedType = file.type
      || (lower.endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : lower.endsWith(".xls") ? "application/vnd.ms-excel"
        : lower.endsWith(".docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : lower.endsWith(".pdf") ? "application/pdf"
        : "application/octet-stream");
    await c.env.R2_FILES.put(key, buf, { httpMetadata: { contentType: storedType } });
    // Grava a chave no contrato pra o operador reabrir a qualquer momento.
    // Isolamento ja garantido acima (owner == banco logado).
    await refreshContratos(c.env);
    const owner = getContrato(adf);
    if (owner && owner.bancoId === (j.banco_id ?? -1)) {
      // Antes de substituir: apaga o arquivo antigo do R2 (regra do cliente
      // 20/07/2026: nao deixar orfaos em disco quando CCB e' substituida).
      // O historico do ccbHistorico mantem so o registro de metadados, nao o
      // arquivo — a versao anterior nao pode mais ser baixada.
      const oldKey = owner.ccbKey;
      if (oldKey && oldKey !== key) {
        try { await c.env.R2_FILES.delete(oldKey); } catch { /* segue */ }
      }
      setContratoCcb(adf, key, `user:${j.sub}`);
      await persistContrato(c.env, adf);
      appendAudit(auditCtx(c), {
        categoria: "termo_aceite",
        acao: oldKey ? "ccb_substituida" : "ccb_anexada",
        propostaId: adf,
        matricula: owner.matricula,
        cpf: owner.cpfMasked,
        userId: `banco:${j.banco_id ?? "?"}`,
        userRole: "banco",
        termoAceito: `ccb:${key}`,
        detalhes: `Banco ${j.banco_id} ${oldKey ? "SUBSTITUIU" : "anexou"} CCB do contrato ADF ${adf} (${file.name}, ${Math.round(file.size / 1024)} KiB, ${storedType})${oldKey ? " — versao anterior removida do R2" : ""}.`,
      });
    }
    return c.json({ key, size: file.size, contentType: storedType });
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
    appendAudit(auditCtx(c), {
      categoria: "convenio_config",
      acao: body.id ? "banco_oferta_editada" : "banco_oferta_criada",
      userId: `banco:${j.banco_id}`,
      userRole: "banco",
      detalhes: `Banco ${j.banco_id} ${body.id ? "editou" : "criou"} oferta "${oferta.titulo}" (${oferta.tipo}): taxa=${oferta.taxaAm}%, parcelasMax=${oferta.parcelasMax}, valorMax=${oferta.valorMax}, ativo=${oferta.ativo}. Cardapio exposto ao servidor.`,
    });
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
    appendAudit(auditCtx(c), {
      categoria: "convenio_config",
      acao: "banco_oferta_pausada",
      userId: `banco:${j.banco_id}`,
      userRole: "banco",
      detalhes: `Banco ${j.banco_id} pausou oferta "${o.titulo}" (id=${o.id}).`,
    });
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
    appendAudit(auditCtx(c), {
      categoria: "convenio_config",
      acao: "banco_oferta_reativada",
      userId: `banco:${j.banco_id}`,
      userRole: "banco",
      detalhes: `Banco ${j.banco_id} reativou oferta "${o.titulo}" (id=${o.id}).`,
    });
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
    // Presets customizados nomeados desse banco — o front usa pra popular o
    // dropdown no modal de criacao/edicao de usuario.
    await ensurePresetsBancoLoaded(c.env);
    const presets = j.banco_id != null
      ? listBancoPresets(j.banco_id).map((p) => ({ key: p.key, nome: p.nome, permissoes: p.permissoes }))
      : [];
    return c.json({ usuarios, presets });
  })
  // Endpoints dedicados de presets — get/upsert em tela dedicada ou hot-save
  // sem passar por criacao de usuario.
  .get("/v1/portal/banco/perfil-presets", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    if (j.banco_id == null) throw Errors.forbidden("banco sem identidade");
    await ensurePresetsBancoLoaded(c.env);
    return c.json({ presets: listBancoPresets(j.banco_id).map((p) => ({ key: p.key, nome: p.nome, permissoes: p.permissoes })) });
  })
  .post("/v1/portal/banco/perfil-presets", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    if (j.banco_id == null) throw Errors.forbidden("banco sem identidade");
    const body = z.object({ nome: z.string().min(2).max(60), permissoes: z.array(z.string().min(1).max(64)).min(1).max(200) }).parse(await c.req.json());
    await ensurePresetsBancoLoaded(c.env);
    const preset = upsertBancoPreset({ bancoId: j.banco_id, nome: body.nome, permissoes: body.permissoes }, new Date().toISOString());
    await persistBancoPreset(c.env, preset);
    return c.json({ preset: { key: preset.key, nome: preset.nome, permissoes: preset.permissoes } }, 201);
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
        perfil: z.enum(["admin", "operador", "consulta", "relatorios", "personalizado"]).optional(),
        permissoes: z.array(z.string().min(1).max(64)).max(200).optional(),
        ipsPermitidos: z.array(z.string()).default([]),
        ativo: z.boolean().default(true),
        // Nome do preset customizado — obrigatorio no front quando perfil e'
        // "personalizado" e esta CRIANDO. Salva a config como preset reusavel.
        presetNome: z.string().min(2).max(60).optional(),
      })
      .parse(await c.req.json());
    // Isolamento: se editando, usuario existente tem que ser do proprio banco.
    if (body.id) {
      const existente = getUsuario(body.id);
      if (existente && existente.bancoId !== (j.banco_id ?? -1)) throw Errors.notFound("usuario");
    }
    // Fallback bancoId=1 removido — banco sem banco_id nao pode criar usuario.
    if (j.banco_id == null) throw Errors.forbidden("banco sem identidade");
    await ensurePresetsBancoLoaded(c.env);
    const { presetNome, ...bodyUpsert } = body;
    const saved = upsertUsuario({ ...bodyUpsert, bancoId: j.banco_id });
    if (presetNome && Array.isArray(body.permissoes) && body.permissoes.length > 0) {
      const preset = upsertBancoPreset({ bancoId: j.banco_id, nome: presetNome, permissoes: body.permissoes }, new Date().toISOString());
      await persistBancoPreset(c.env, preset);
    }
    appendAudit(auditCtx(c), {
      categoria: "acesso",
      acao: body.id ? "banco_usuario_editado" : "banco_usuario_criado",
      userId: `banco:${j.banco_id}`,
      userRole: "banco",
      detalhes: `Banco ${j.banco_id} ${body.id ? "editou" : "criou"} usuario interno "${saved.nome}" (${saved.email}, perfil=${saved.perfil ?? "-"}, ativo=${saved.ativo}). Insider access — quem edita usuario define quem aprova propostas.`,
    });
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
    appendAudit(auditCtx(c), {
      categoria: "acesso",
      acao: "banco_usuario_removido",
      userId: `banco:${j.banco_id}`,
      userRole: "banco",
      detalhes: `Banco ${j.banco_id} removeu (soft-delete) usuario interno "${u.nome}" (${u.email}).`,
    });
    return c.body(null, 204);
  })
  .post("/v1/portal/banco/cadastros/usuarios/:id/reativar", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    const u = getUsuario(c.req.param("id"));
    if (!u || u.bancoId !== (j.banco_id ?? -1)) throw Errors.notFound("usuario");
    if (!reativarUsuario(c.req.param("id"))) throw Errors.notFound("usuario");
    appendAudit(auditCtx(c), {
      categoria: "acesso",
      acao: "banco_usuario_reativado",
      userId: `banco:${j.banco_id}`,
      userRole: "banco",
      detalhes: `Banco ${j.banco_id} reativou usuario interno "${u.nome}" (${u.email}).`,
    });
    return c.json({ ok: true });
  })

  // --------- Bate de carteira (mesma logica do /admin/bate-carteira, mas
  // escopado ao banco logado — nao aceita bancoId no body, usa jwt.banco_id).
  // Substitui o baterCarteira() local do frontend que era 100% pseudo-random.
  .post("/v1/portal/banco/bate-carteira", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    if (j.banco_id == null) throw Errors.forbidden("banco sem identidade");
    const body = z.object({
      competencia: z.string().regex(/^\d{6}$/, "competencia formato YYYYMM"),
      prefeituraId: z.number().int().optional(),
    }).parse(await c.req.json());
    const banco = bancos.find((b) => b.id === j.banco_id);
    if (!banco) throw Errors.notFound("banco");
    // Import dinamico pra evitar ciclo (bate-carteira.ts esta em admin/, que
    // por sua vez ja importa portal-banco/store).
    const { gerarBateCarteira } = await import("../admin/bate-carteira.js");
    const resolver = (id: number) => bancos.find((b) => b.id === id)?.nome ?? "?";
    const r = gerarBateCarteira({ bancoId: j.banco_id, competencia: body.competencia, prefeituraId: body.prefeituraId }, resolver);
    return c.json(r);
  })

  // --------- Relatorios ----------
  .get("/v1/portal/banco/relatorios/consignacoes", async (c) => {
    const j = c.get("jwt");
    requireBancoRole(j);
    await refreshContratos(c.env);
    const activeConv = await getActiveConvenioId(c.env, j);
    const url = new URL(c.req.url);
    const tipo = url.searchParams.get("tipo");
    const inicio = url.searchParams.get("inicio"); // YYYY-MM-DD
    const fim = url.searchParams.get("fim");       // YYYY-MM-DD
    let rows = listContratos({ convenioId: activeConv });
    if (tipo) rows = rows.filter((r) => r.tipoContrato === tipo);
    // Filtro de data agora e' real. dataContrato vem em DD/MM/YYYY (BR); converte
    // pra ISO YYYY-MM-DD antes de comparar. Antes: filtro era no-op ("simples:
    // nao calcula intervalos") — cliente selecionava intervalo e via TUDO.
    if (inicio || fim) {
      const toIso = (br: string): string => {
        const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
        return m ? `${m[3]}-${m[2]}-${m[1]}` : br; // ja ISO ou invalido
      };
      rows = rows.filter((r) => {
        const iso = toIso(r.dataContrato ?? "");
        if (!iso) return false;
        if (inicio && iso < inicio) return false;
        if (fim && iso > fim) return false;
        return true;
      });
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
    await refreshContratos(c.env);
    const activeConv = await getActiveConvenioId(c.env, j);
    const contratos = listContratos({ convenioId: activeConv });
    // Comissao configuravel por convenio (percentualComissao 0..1). Antes era
    // 0.02 fixo — nao refletia acordos reais entre averbadora e banco.
    // Fallback 2% pra convenio sem config (comportamento antigo preservado).
    const convCfg = activeConv ? getConvenioConfig(activeConv) : undefined;
    const pctComissao = (convCfg as unknown as { percentualComissao?: number })?.percentualComissao ?? 0.02;
    // Meses BR (usados em folhaPrimeiroDesconto e folhaUltimoDesconto).
    const MESES = ["janeiro","fevereiro","marco","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
    // Deriva competencia REAL do primeiro desconto em folha do contrato. Antes
    // agrupava por c.folhaPrimeiroDesconto direto — mas TODO contrato novo
    // sai hardcoded "Abril/2026" (store.ts), entao TUDO caia num mes so.
    // Agora: se folhaPrimeiroDesconto veio "Mes/Ano", converte pra YYYY-MM;
    // senao, deriva de dataContrato (DD/MM/YYYY) + 1 mes de carencia.
    const toCompetencia = (ct: typeof contratos[number]): string => {
      const parseMesAno = (raw: string): string | null => {
        const [mes, ano] = (raw ?? "").split("/");
        if (!mes || !ano) return null;
        const idx = MESES.indexOf(mes.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""));
        if (idx < 0) return null;
        return `${ano}-${String(idx + 1).padStart(2, "0")}`;
      };
      const fromLabel = parseMesAno(ct.folhaPrimeiroDesconto);
      if (fromLabel) return fromLabel;
      // Fallback: dataContrato + 1 mes (carencia padrao).
      const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(ct.dataContrato ?? "");
      if (m) {
        const d = new Date(Number(m[3]), Number(m[2]), 1); // ja soma 1 pq month e' zero-based
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      }
      return "sem_data";
    };
    const grupos = new Map<string, { competencia: string; contratos: number; valorFinanciado: number; comissaoEstimada: number }>();
    for (const ct of contratos) {
      const key = toCompetencia(ct);
      const cur = grupos.get(key) ?? { competencia: key, contratos: 0, valorFinanciado: 0, comissaoEstimada: 0 };
      cur.contratos += 1;
      cur.valorFinanciado += ct.valorFinanciado;
      cur.comissaoEstimada += ct.valorFinanciado * pctComissao;
      grupos.set(key, cur);
    }
    // Ordena por competencia ASC pra o grafico ficar cronologico.
    const meses = Array.from(grupos.values())
      .sort((a, b) => a.competencia.localeCompare(b.competencia))
      .map((g) => ({
        ...g,
        valorFinanciado: Math.round(g.valorFinanciado * 100) / 100,
        comissaoEstimada: Math.round(g.comissaoEstimada * 100) / 100,
      }));
    return c.json({ convenioId: activeConv, meses, pctComissao });
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
  // Banco sem identidade nao pode criar contrato — antes caia no fallback
  // bancoId=1 (Banco Atlas), atribuindo silenciosamente o contrato ao Atlas.
  if (j.banco_id == null) throw Errors.forbidden("banco sem identidade");
  return criarContratoOuReserva({
    bancoId: j.banco_id,
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
