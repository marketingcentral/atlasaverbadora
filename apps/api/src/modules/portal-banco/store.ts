// In-memory store for the portal-banco demo.
// Replaces direct DB access while the migration is not yet applied.
// Same shape as the future Drizzle queries so swapping is trivial.

import { CONTRATOS_MOCK, CONVENIOS_MOCK, type ContratoMock } from "./fixtures.js";
import type { Env } from "../../env.js";
import { ensureSchema, loadContratos, upsertContrato, seedContratosIfEmpty } from "../../db/repos.js";

export interface ContratoFull extends ContratoMock {
  bancoId: number;
  servidorId: number;
  idMatricula: string;
  valorFinanciado: number;
  valorLiquido: number;
  taxaAm: number;
  cetAm: number;
  iof: number;
  diasCarencia: number;
  saldoDevedor: number;
  parcelasPagas: number;
  folhaPrimeiroDesconto: string;
  folhaUltimoDesconto: string;
  codigoVerba: string;
  dataContrato: string;
  observacoes?: string;
  adfVinculada?: string;
  /** Dados de portabilidade — presentes quando o contrato substitui outro banco. */
  bancoOrigem?: string;
  contratoOrigem?: string;
  saldoDevedorOrigem?: number;
  /** Status do ADF na folha da prefeitura (cadeia banco→prefeitura). Só relevante
   *  em contratos averbados. "recebida" = prefeitura ainda não confirmou; "aplicada"
   *  = desconto entrou em folha; "falha" = prefeitura reprovou. Persistido no contrato
   *  pra ser fonte única (prefeitura confirma, banco vê). */
  folhaStatus?: "recebida" | "aplicada" | "falha" | "interrompida_desligamento";
  /** Snapshot da situacao antes de virar 'Falha em folha' — permite banco
   *  reenviar a ADF e restaurar o estado (Ativo/Aprovado). Setado em
   *  setContratoFalhaEmFolha, limpo em tratarFalhaContrato. */
  situacaoAntesDaFalha?: string;
  folhaMotivo?: string;
  /** R2 key do arquivo de contrato (CCB) atual anexado pelo banco. Serve pra
   *  reabrir via GET /v1/portal/banco/ccb/<key>. Requerido antes do banco poder
   *  aprovar a proposta (fluxo: anexar contrato -> aprovar). */
  ccbKey?: string;
  /** ISO — quando o CCB atual foi anexado. */
  ccbAnexadoEm?: string;
  /** Historico completo de contratos anexados (mais recente por ultimo).
   *  Cada "atualizar contrato" NAO deleta a versao anterior — ela vai pra
   *  ca com o timestamp e o ator. NUNCA hard-delete: rastreabilidade
   *  obrigatoria (LGPD/BACEN). */
  ccbHistorico?: { key: string; anexadoEm: string; ator: string }[];
  /** Bucket de margem que este contrato compromete: EMPRESTIMO (35%),
   *  CARTAO_CONSIGNADO (5%) ou CARTAO_BENEFICIOS (5%). Necessario pra
   *  cartao consignado nao descontar da margem de emprestimo (e vice-versa).
   *  Se ausente (dado antigo), infere de tipoContrato: ECONSIGNADO ->
   *  CARTAO_CONSIGNADO, restante -> EMPRESTIMO. */
  tipoMargem?: "EMPRESTIMO" | "CARTAO_CONSIGNADO" | "CARTAO_BENEFICIOS";
  /** ISO 8601 — timestamp exato de criacao. Diferente de lancamento (so DD/MM/YYYY,
   *  perde a hora) — usado pelo frontend pra calcular a trava de 48h com precisao
   *  de segundos. */
  criadoEmIso?: string;
  /** ISO 8601 — timestamp exato de expiracao da reserva (criadoEmIso + 48h). Null
   *  quando nao e reserva. Substitui `expiracao` (DD/MM/YYYY) pra o timer nao mais
   *  arredondar pra fim-de-dia. */
  expiracaoIso?: string | null;
}

/** Deriva o bucket de margem que um contrato ocupa. Explicito no campo
 *  tipoMargem (fluxo novo) tem prioridade; senao infere pelo tipoContrato
 *  pra dados antigos. */
export function deriveTipoMargem(ct: Pick<ContratoFull, "tipoMargem" | "tipoContrato">): "EMPRESTIMO" | "CARTAO_CONSIGNADO" | "CARTAO_BENEFICIOS" {
  if (ct.tipoMargem) return ct.tipoMargem;
  return ct.tipoContrato === "ECONSIGNADO" ? "CARTAO_CONSIGNADO" : "EMPRESTIMO";
}

/** Deriva o rotulo do PRODUTO originalmente proposto, usando TODOS os sinais.
 *  Alinhado com a regra da /servidor/contratos:produtoContratoLabel: por default,
 *  `tipoContrato === "REFIN"` vira PORTABILIDADE (a UI do servidor sempre trata
 *  REFIN como portabilidade). REFIN "puro" (renegociacao no mesmo banco) so
 *  aparece se observacoes disser explicitamente "refinancia".
 *
 *  Ordem de precedencia:
 *    1. observacoes contem "telemedicina"                    -> TELEMEDICINA.
 *    2. observacoes contem "refinancia"                      -> REFIN (explicito).
 *    3. bancoOrigem OU observacoes com "portabilid"          -> PORTABILIDADE.
 *    4. tipoContrato === "REFIN"                             -> PORTABILIDADE.
 *       (fallback: contratos historicos que caiam em REFIN eram na verdade
 *       portabilidade — bug: /me/propostas com tipo="portabilidade" nao
 *       setava bancoOrigem, entao muitos contratos ficam so como REFIN puro.)
 *    5. tipoMargem === CARTAO_BENEFICIOS                     -> CARTAO_BENEFICIO.
 *    6. tipoContrato === ECONSIGNADO OU
 *       tipoMargem === CARTAO_CONSIGNADO                     -> CARTAO_CONSIGNADO.
 *    7. default                                              -> EMPRESTIMO. */
export function deriveProdutoLabel(ct: Pick<ContratoFull, "tipoContrato" | "tipoMargem" | "observacoes" | "bancoOrigem">): string {
  const obs = (ct.observacoes ?? "").toLowerCase();
  if (/telemedic/.test(obs)) return "TELEMEDICINA";
  if (/refinancia/.test(obs)) return "REFIN";
  if (ct.bancoOrigem || /portabilid/.test(obs)) return "PORTABILIDADE";
  if (ct.tipoContrato === "REFIN") return "PORTABILIDADE";
  if (ct.tipoMargem === "CARTAO_BENEFICIOS") return "CARTAO_BENEFICIO";
  if (ct.tipoContrato === "ECONSIGNADO" || ct.tipoMargem === "CARTAO_CONSIGNADO") return "CARTAO_CONSIGNADO";
  return "EMPRESTIMO";
}

export interface ContratoEvento {
  id: number;
  contratoId: string;
  evento: string;
  deEstado: string | null;
  paraEstado: string | null;
  ator: string;
  motivo?: string;
  payloadHash?: string;
  traceId?: string;
  criadoEm: string;
}

const _contratos = new Map<string, ContratoFull>();
const _eventos: ContratoEvento[] = [];
let _eventoId = 1;

/** Gera um adf único (colisão-resistente entre isolates). Usa crypto random +
 *  checagem no Map (que foi sincronizado do Postgres via refreshContratos antes
 *  de criar). Nunca chamar em escopo de módulo — só durante uma request. */
function nextAdf(): string {
  for (let i = 0; i < 8; i++) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const adf = String(9_000_000 + (buf[0]! % 990_000)); // 9.000.000–9.989.999
    if (!_contratos.has(adf)) return adf;
  }
  return String(9_000_000 + (Number(new Date()) % 990_000));
}

// Helpers (declared before seed loop to avoid TDZ on `const MESES`).

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

function idFromMatricula(matricula: string): number {
  return Number(matricula.replace(/\D/g, "").slice(-5)) || 1;
}

export const MESES = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function monthAdd(fromLabel: string, plus: number): string {
  const [mesNome, anoStr] = fromLabel.split("/") as [string, string];
  const fromIdx = MESES.indexOf(mesNome);
  const total = fromIdx + plus;
  const novoMes = ((total % 12) + 12) % 12;
  const anoOffset = Math.floor(total / 12);
  const novoAno = Number(anoStr) + anoOffset;
  return `${MESES[novoMes]}/${novoAno}`;
}

function addDaysISO(days: number): string {
  const d = new Date(Date.now() + days * 86400_000);
  return d.toLocaleDateString("pt-BR");
}

// Seed from fixtures.
for (const c of CONTRATOS_MOCK) {
  const taxa = 0.0179;
  const valorFinanciado = c.valorParcela * c.totalParcelas;
  const iof = valorFinanciado * 0.0038 + valorFinanciado * 0.000082 * 365;
  const cetAm = taxa + 0.005;
  _contratos.set(c.adf, {
    ...c,
    bancoId: 1,
    servidorId: idFromMatricula(c.matricula),
    idMatricula: `MAT-${c.matricula}`,
    valorFinanciado: round2(valorFinanciado),
    valorLiquido: round2(valorFinanciado - iof),
    taxaAm: taxa,
    cetAm: round4(cetAm),
    iof: round2(iof),
    diasCarencia: 30,
    saldoDevedor: round2(c.valorParcela * (c.totalParcelas - 3)),
    parcelasPagas: 3,
    folhaPrimeiroDesconto: "Abril/2026",
    folhaUltimoDesconto: monthAdd("Abril/2026", c.totalParcelas - 1),
    codigoVerba: "1547 - DELTA GLOBAL I",
    dataContrato: c.lancamento,
    observacoes: "Operacao gerada pelo seed inicial.",
  });
  _eventos.push({
    id: _eventoId++,
    contratoId: c.adf,
    evento: "criar",
    deEstado: null,
    paraEstado: c.situacao,
    ator: "system:seed",
    criadoEm: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Persistência (Postgres) — compartilha contratos/reservas entre isolates e faz
// a proposta do servidor sobreviver ao refresh/redeploy. Write-through + hydrate,
// fail-safe pras fixtures em memória (segue o padrão de repos/cadastros).
// ---------------------------------------------------------------------------
let _hydrated = false;
let _hydrationPromise: Promise<void> | null = null;

/** Hidrata `_contratos` do Postgres uma vez por isolate (semeando do seed se vazio). */
export function ensureContratosLoaded(env: Env): Promise<void> {
  if (_hydrated) return Promise.resolve();
  if (!_hydrationPromise) {
    _hydrationPromise = (async () => {
      try {
        await ensureSchema(env);
        await seedContratosIfEmpty(env, Array.from(_contratos.values()) as unknown as { adf: string; [k: string]: unknown }[]);
        const rows = await loadContratos(env);
        if (rows.length > 0) {
          _contratos.clear();
          for (const r of rows) _contratos.set(r.adf, r as unknown as ContratoFull);
        }
        _hydrated = true;
      } catch {
        _hydrated = true; // sem DB → segue in-memory (demo)
      }
    })();
  }
  return _hydrationPromise;
}

/** Zera in-memory de contratos + eventos + flag de hidratacao. Usado pelo
 *  /admin/db/purge-contratos APOS o TRUNCATE no PG (senao contratos stale no
 *  isolate reapareceriam via seedContratosIfEmpty na proxima ensureContratosLoaded). */
export function clearContratosMemoria(): void {
  _contratos.clear();
  _eventos.length = 0;
  _eventoId = 1;
  _hydrated = false;
  _hydrationPromise = null;
}

/** Write-through best-effort: persiste um contrato/reserva sem quebrar a request. */
export async function persistContrato(env: Env, adf: string): Promise<void> {
  const c = _contratos.get(adf);
  if (!c) return;
  try { await upsertContrato(env, c as unknown as { adf: string; [k: string]: unknown }); } catch { /* fail-safe */ }
}

/**
 * Read-through: re-sincroniza o Map em memoria com o estado do Postgres. Chamado
 * no inicio dos endpoints de leitura (e antes de criar, pra sincronizar o
 * contador de adf entre isolates).
 *
 * IMPORTANTE: sincroniza NOS DOIS SENTIDOS — insere/atualiza o que existe em PG
 * E REMOVE do Map o que nao existe mais em PG. Se so fizesse "set", uma delecao
 * feita por OUTRO isolate (ex.: purge admin) nao vazaria pra este; requests
 * caindo em isolates "antigos" continuariam vendo contratos ja apagados.
 *
 * Best-effort: falha de DB mantem o estado em memoria.
 */
export async function refreshContratos(env: Env): Promise<void> {
  try {
    await ensureContratosLoaded(env); // garante schema + seed inicial
    const rows = await loadContratos(env);
    // Detecta contratos que sumiram do PG (deletados por outro isolate) e
    // apaga da memoria. Sem isso, um purge/delete nao propaga entre isolates.
    // So aplica se PG retornou ALGO — se veio vazio (falha transitoria de conexao?)
    // preserva o Map em memoria pra nao perder tudo por erro pontual.
    if (rows.length > 0) {
      const pgAdfs = new Set(rows.map((r) => r.adf));
      for (const adf of [..._contratos.keys()]) {
        if (!pgAdfs.has(adf)) _contratos.delete(adf);
      }
    }
    for (const r of rows) _contratos.set(r.adf, r as unknown as ContratoFull);
    // Normaliza a IDENTIDADE DO CONVÊNIO (nome único vindo de CONVENIOS_MOCK, mesmo
    // pra contratos persistidos com o nome antigo) e EXPIRA reservas vencidas
    // (reserva "Aguardando" após a data de expiração vira "Expirado" em todas as telas).
    for (const c of _contratos.values()) normalizeContrato(c);
  } catch { /* fail-safe: segue com o Map em memória */ }
}

/**
 * Normaliza um contrato IN-PLACE em toda leitura (independe do Postgres/refresh):
 *  - identidade do convênio: nome único vindo de CONVENIOS_MOCK (corrige registros
 *    persistidos com nome antigo);
 *  - expiração: reserva "Aguardando" cuja data de expiração já passou vira "Expirado".
 * Idempotente — seguro chamar em cada listagem.
 */
export function normalizeContrato(c: ContratoFull): ContratoFull {
  const conv = CONVENIOS_MOCK.find((cv) => cv.id === c.convenioId);
  if (conv && c.convenio !== conv.nome) c.convenio = conv.nome;
  if (c.expiracao && /aguard/i.test(c.situacao)) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(c.expiracao);
    if (m) {
      const exp = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]) + 1).getTime(); // fim do dia de expiração
      if (exp < Date.now()) c.situacao = "Expirado";
    }
  }
  return c;
}

/**
 * ATENCAO — regra que ja foi ida-e-volta varias vezes com o cliente.
 * Estado atual (15/07/2026): margem COMPROMETE JA NA PROPOSTA (Aguardando).
 * Cliente pediu de novo: "quando faco os Simular ele nao esta dando baixa
 * no valor" — quer ver a margem descontar no dashboard imediatamente ao
 * clicar Simular. Se voltar a pedir "so quando o banco aceita", tirar
 * "aguard" da lista de estados que retornam true.
 *
 * Estados que COMPROMETEM (bloqueiam margem):
 *   - "Aguardando…" (proposta em analise — desconta ja pra o servidor ver)
 *   - "Aprovado" (banco aprovou, averbadora ainda nao fez ADF)
 *   - "Ativo" / "Averbado" (operacao vigente ja averbada)
 *   - "Suspenso" (contrato vigente que foi suspenso — margem segue reservada)
 *   - "Formalizado"
 *
 * Estados que NAO COMPROMETEM:
 *   - "Expirado", "Cancelado", "Recusado", "Reprovado", "Rejeitado", "Negado", "Estornado"
 *   - "Quitado" (contrato ja fechado)
 */
export function comprometeMargem(situacao: string): boolean {
  const s = situacao.toLowerCase();
  if (s === "expirado" || s === "cancelado" || s === "quitado") return false;
  if (s.includes("recus") || s.includes("reprov") || s.includes("rejeit") || s.includes("negad") || s.includes("estorn")) return false;
  // Falha em folha (averbadora reportou falha) libera margem imediatamente —
  // cliente pediu (17/07/2026): servidor nao fica preso enquanto banco decide
  // como tratar a falha. Se banco reenviar e der certo, situacao volta a
  // comprometer margem automaticamente.
  if (s.includes("falha em folha")) return false;
  // "Em cobranca direta" (pos-desligamento F6): banco cobra fora da folha,
  // margem tambem nao mais comprometida na prefeitura.
  if (s.includes("cobran")) return false;
  return true; // aguard / aprov / ativo / averb / suspens / formaliz -> bloqueia
}

export function listContratos(filters: { convenioId?: string; matricula?: string; situacao?: string[] } = {}): ContratoFull[] {
  return Array.from(_contratos.values()).map(normalizeContrato).filter((c) => {
    if (filters.convenioId && c.convenioId !== filters.convenioId) return false;
    if (filters.matricula && c.matricula !== filters.matricula) return false;
    if (filters.situacao && filters.situacao.length > 0) {
      if (!filters.situacao.some((s) => c.situacao.toLowerCase() === s.toLowerCase())) return false;
    }
    return true;
  });
}

export function getContrato(adf: string): ContratoFull | undefined {
  const c = _contratos.get(adf);
  return c ? normalizeContrato(c) : undefined;
}

/** Remove do Map em memória os contratos/reservas de dados ADFs
 *  (a remoção no Postgres é feita pelo chamador). Retorna quantos saíram. */
export function removeContratosByAdf(adfs: string[]): number {
  let n = 0;
  for (const adf of adfs) if (_contratos.delete(adf)) n++;
  return n;
}

/** Remove do Map em memória todos os contratos/reservas de dadas matrículas
 *  (a remoção no Postgres é feita pelo chamador). Retorna quantos saíram. */
export function removeContratosByMatricula(matriculas: string[]): number {
  const set = new Set(matriculas);
  let n = 0;
  for (const [adf, c] of _contratos) {
    if (set.has(c.matricula)) { _contratos.delete(adf); n++; }
  }
  return n;
}

/** Marca o status do ADF na folha (chamado pela prefeitura). Fonte única = contrato.
 *  Retorna o contrato atualizado (o chamador persiste via persistContrato). */
export function setContratoFolhaStatus(adf: string, status: "recebida" | "aplicada" | "falha" | "interrompida_desligamento", motivo?: string): ContratoFull | undefined {
  const c = _contratos.get(adf);
  if (!c) return undefined;
  c.folhaStatus = status;
  c.folhaMotivo = motivo;
  return c;
}

/** Marca contrato como 'Falha em folha' — usado quando averbadora reporta
 *  falha no /adf/falha. Guarda a situacao original em `situacaoAntesDaFalha`
 *  pra permitir "reenviar" e restaurar. Libera margem (via comprometeMargem
 *  que agora conhece 'Falha em folha'). Idempotente. */
export function setContratoFalhaEmFolha(adf: string, motivo: string): ContratoFull | undefined {
  const c = _contratos.get(adf);
  if (!c) return undefined;
  const s = c.situacao.toLowerCase();
  if (s.includes("falha em folha") || s.includes("cancel") || s.includes("quit")) return c; // idempotente
  const de = c.situacao;
  // Snapshot pro reenvio (banco pode devolver pro estado anterior).
  c.situacaoAntesDaFalha = de;
  c.situacao = "Falha em folha";
  c.folhaStatus = "falha";
  c.folhaMotivo = motivo;
  _eventos.push({
    id: _eventoId++, contratoId: adf,
    evento: "falha_em_folha",
    deEstado: de, paraEstado: c.situacao,
    ator: "averbadora", motivo, criadoEm: new Date().toISOString(),
  });
  return c;
}

/** Trata a falha reportada — chamado pelo banco depois de ver a pendencia:
 *  - "reenviar": volta pra situacaoAntesDaFalha, ADF vira 'recebida', averbadora
 *    reprocessa. Se nao tem snapshot, cai em "Aprovado" (banco valida de novo).
 *  - "cancelar": contrato vira 'Cancelado', ADF vira 'falha' final.
 *  - "cobranca_direta": contrato vira 'Em cobranca direta', banco cobra fora da folha.
 *  Retorna o contrato atualizado (chamador persiste). */
export function tratarFalhaContrato(
  adf: string,
  acao: "reenviar" | "cancelar" | "cobranca_direta",
  motivo: string,
  ator: string,
): ContratoFull | undefined {
  const c = _contratos.get(adf);
  if (!c) return undefined;
  if (!c.situacao.toLowerCase().includes("falha em folha")) return c; // idempotente/no-op
  const de = c.situacao;
  if (acao === "reenviar") {
    c.situacao = c.situacaoAntesDaFalha ?? "Aprovado";
    c.folhaStatus = "recebida";
    c.folhaMotivo = undefined;
  } else if (acao === "cancelar") {
    c.situacao = "Cancelado";
    c.folhaStatus = "falha";
    c.folhaMotivo = motivo;
  } else {
    c.situacao = "Em cobrança direta";
    c.folhaStatus = "interrompida_desligamento";
    c.folhaMotivo = motivo;
  }
  c.situacaoAntesDaFalha = undefined;
  _eventos.push({
    id: _eventoId++, contratoId: adf,
    evento: `tratar_falha_${acao}`,
    deEstado: de, paraEstado: c.situacao,
    ator, motivo, criadoEm: new Date().toISOString(),
  });
  return c;
}

/** Marca contrato como 'Em cobranca direta' — usado quando o servidor desliga
 *  da prefeitura (demissao/aposentadoria). ADF associada para de descontar em
 *  folha (folhaStatus interrompida_desligamento) e o banco assume cobranca
 *  fora da folha. Idempotente: nao regride Cancelado/Quitado. */
export function setContratoDesligamento(adf: string, motivo: string): ContratoFull | undefined {
  const c = _contratos.get(adf);
  if (!c) return undefined;
  const s = c.situacao.toLowerCase();
  if (s.includes("cancel") || s.includes("quit") || s.includes("cobranca direta")) return c;
  const de = c.situacao;
  c.situacao = "Em cobrança direta";
  c.folhaStatus = "interrompida_desligamento";
  c.folhaMotivo = motivo;
  _eventos.push({
    id: _eventoId++, contratoId: adf,
    evento: "desligamento_servidor",
    deEstado: de, paraEstado: c.situacao,
    ator: "sistema:cascade",
    motivo, criadoEm: new Date().toISOString(),
  });
  return c;
}

/** Reverte cascade de desligamento — chamado quando um servidor foi marcado
 *  como desligado por engano OU foi readmitido. Volta situacao pra "Aprovado"
 *  (estado padrao pos-aprovacao do banco, aguardando ADF da averbadora) e
 *  limpa folhaStatus/folhaMotivo. Idempotente: se contrato nao esta em
 *  "cobranca direta", retorna sem alterar. */
export function revertContratoDesligamento(adf: string, ator: string): ContratoFull | undefined {
  const c = _contratos.get(adf);
  if (!c) return undefined;
  const s = c.situacao.toLowerCase();
  if (!s.includes("cobran")) return c;
  const de = c.situacao;
  c.situacao = "Aprovado";
  c.folhaStatus = undefined;
  c.folhaMotivo = undefined;
  _eventos.push({
    id: _eventoId++, contratoId: adf,
    evento: "reversao_desligamento",
    deEstado: de, paraEstado: c.situacao,
    ator,
    motivo: "reversao manual (readmissao ou correcao)",
    criadoEm: new Date().toISOString(),
  });
  return c;
}

/** Lista contratos ativos de uma matricula (pra cascade de desligamento). */
export function listContratosAtivosDaMatricula(matricula: string): ContratoFull[] {
  const out: ContratoFull[] = [];
  for (const c of _contratos.values()) {
    if (c.matricula !== matricula) continue;
    const s = c.situacao.toLowerCase();
    // "Ativo" (averbado) ou "Aprovado" (banco aprovou, aguardando averbadora)
    if (s === "ativo" || s.includes("aprov")) out.push(c);
  }
  return out;
}

/** Marca o contrato como averbado (situacao "Ativo") — usado pela averbadora
 *  quando aplica a ADF em folha. So promove contratos que estao no estado
 *  "Aprovado" (fluxo novo: banco aprova, averbadora averba); ignora os que
 *  ja estao Ativo/Cancelado/Quitado (idempotente). */
export function setContratoSituacaoAtivo(adf: string, ator: string): ContratoFull | undefined {
  const c = _contratos.get(adf);
  if (!c) return undefined;
  const s = c.situacao.toLowerCase();
  if (!s.includes("aprov")) return c; // idempotente — nao regride estado
  const de = c.situacao;
  c.situacao = "Ativo";
  c.expiracao = null;
  _eventos.push({
    id: _eventoId++,
    contratoId: adf,
    evento: "averbar_averbadora",
    deEstado: de,
    paraEstado: c.situacao,
    ator,
    criadoEm: new Date().toISOString(),
  });
  return c;
}

/** Grava a R2 key do CCB anexado no contrato. Se ja tinha um CCB atual, ele
 *  vai pra ccbHistorico junto com o timestamp e o ator (NUNCA hard-delete —
 *  cliente pediu: contrato substituido nao pode ser excluido, so arquivado).
 *  Chamador chama persistContrato pra write-through. */
export function setContratoCcb(adf: string, ccbKey: string, ator: string): ContratoFull | undefined {
  const c = _contratos.get(adf);
  if (!c) return undefined;
  if (c.ccbKey && c.ccbAnexadoEm) {
    c.ccbHistorico = [
      ...(c.ccbHistorico ?? []),
      { key: c.ccbKey, anexadoEm: c.ccbAnexadoEm, ator },
    ];
  }
  c.ccbKey = ccbKey;
  c.ccbAnexadoEm = new Date().toISOString();
  return c;
}

export function getContratoEventos(adf: string): ContratoEvento[] {
  return _eventos.filter((e) => e.contratoId === adf).sort((a, b) => a.id - b.id);
}

export function getContratoParcelas(c: ContratoFull): { numero: number; vencimento: string; valor: number; situacao: "Paga" | "A vencer" | "Em aberto" }[] {
  const parcelas: { numero: number; vencimento: string; valor: number; situacao: "Paga" | "A vencer" | "Em aberto" }[] = [];
  for (let i = 1; i <= Math.min(c.totalParcelas, 24); i++) {
    parcelas.push({
      numero: i,
      vencimento: monthAdd("Abril/2026", i - 1),
      valor: c.valorParcela,
      situacao: i <= c.parcelasPagas ? "Paga" : i === c.parcelasPagas + 1 ? "Em aberto" : "A vencer",
    });
  }
  return parcelas;
}

export interface NovoContratoInput {
  bancoId: number;
  servidorId: number;
  idMatricula: string;
  matricula: string;
  nome: string;
  cpfMasked: string;
  convenioId: string;
  convenio: string;
  tipoContrato: "EMPRESTIMO" | "REFIN" | "ECONSIGNADO";
  valorFinanciado: number;
  parcelas: number;
  taxaAm: number;
  cetAm: number;
  iof: number;
  diasCarencia: number;
  valorParcela: number;
  codigoVerba: string;
  observacoes?: string;
  isReserva: boolean;
  /** Dias ate a reserva expirar (libera a margem). Default 2 (48h). Portabilidade usa 5. */
  reservaDias?: number;
  bancoOrigem?: string;
  contratoOrigem?: string;
  saldoDevedorOrigem?: number;
  /** Bucket de margem — opcional. Se ausente, inferido pelo tipoContrato
   *  (via deriveTipoMargem). Cartao consignado usa "CARTAO_CONSIGNADO",
   *  cartao beneficio usa "CARTAO_BENEFICIOS", emprestimo/refin usa "EMPRESTIMO". */
  tipoMargem?: "EMPRESTIMO" | "CARTAO_CONSIGNADO" | "CARTAO_BENEFICIOS";
  ator: string;
}

export function criarContratoOuReserva(input: NovoContratoInput): ContratoFull {
  const adf = nextAdf();
  const nowMs = Date.now();
  const reservaDias = input.reservaDias ?? 2;
  const expiracao = input.isReserva ? addDaysISO(reservaDias) : null;
  // Timestamps ISO exatos (com hora/minuto/segundo). O frontend usa criadoEmIso
  // + 48h pra calcular a trava com precisao — usar so lancamento (DD/MM/YYYY)
  // e "expiracao" (DD/MM/YYYY) inflava a contagem em ate ~24h porque parse cai
  // em fim-de-dia (23:59:59).
  const criadoEmIso = new Date(nowMs).toISOString();
  const expiracaoIso = input.isReserva ? new Date(nowMs + reservaDias * 86400_000).toISOString() : null;
  const valorLiquido = input.valorFinanciado - input.iof;
  const dNow = new Date(nowMs);
  const mesAtualLabel = `${MESES[dNow.getMonth()]}/${dNow.getFullYear()}`;
  const c: ContratoFull = {
    adf,
    situacao: input.isReserva ? "Aguardando Confirmação do Deferimento" : "Ativo",
    lancamento: new Date().toLocaleDateString("pt-BR"),
    expiracao,
    criadoEmIso,
    expiracaoIso,
    cpfMasked: input.cpfMasked,
    matricula: input.matricula,
    nome: input.nome,
    tipoContrato: input.tipoContrato,
    totalParcelas: input.parcelas,
    valorParcela: input.valorParcela,
    convenio: input.convenio,
    convenioId: input.convenioId,
    bancoId: input.bancoId,
    servidorId: input.servidorId,
    idMatricula: input.idMatricula,
    valorFinanciado: round2(input.valorFinanciado),
    valorLiquido: round2(valorLiquido),
    taxaAm: input.taxaAm,
    cetAm: round4(input.cetAm),
    iof: round2(input.iof),
    diasCarencia: input.diasCarencia,
    saldoDevedor: round2(input.valorFinanciado),
    parcelasPagas: 0,
    // Primeiro desconto = mes real da contratacao (antes era hardcoded
    // "Abril/2026", o que deixava as datas de parcela irreais). Ultimo =
    // primeiro + (parcelas-1).
    folhaPrimeiroDesconto: mesAtualLabel,
    folhaUltimoDesconto: monthAdd(mesAtualLabel, input.parcelas - 1),
    codigoVerba: input.codigoVerba,
    dataContrato: new Date().toLocaleDateString("pt-BR"),
    observacoes: input.observacoes,
    adfVinculada: input.contratoOrigem,
    bancoOrigem: input.bancoOrigem,
    contratoOrigem: input.contratoOrigem,
    saldoDevedorOrigem: input.saldoDevedorOrigem,
    tipoMargem: input.tipoMargem,
  };
  _contratos.set(adf, c);
  _eventos.push({
    id: _eventoId++,
    contratoId: adf,
    evento: input.isReserva ? "reservar" : "criar",
    deEstado: null,
    paraEstado: c.situacao,
    ator: input.ator,
    criadoEm: new Date().toISOString(),
  });
  return c;
}

export function aplicarAcao(
  adf: string,
  acao: "quitar" | "suspender" | "cancelar" | "alongar" | "alterar" | "confirmar" | "aprovar",
  ator: string,
  motivo?: string,
  extra?: Record<string, unknown>,
): ContratoFull | undefined {
  const c = _contratos.get(adf);
  if (!c) return undefined;
  const de = c.situacao;
  let para = de;
  switch (acao) {
    case "quitar":
      para = "Quitado";
      c.saldoDevedor = 0;
      c.parcelasPagas = c.totalParcelas;
      break;
    case "suspender":
      para = "Suspenso";
      break;
    case "cancelar":
      para = "Cancelado";
      // Cancela a ADF na folha tambem. Antes: se o contrato ja estava averbado
      // (folhaStatus="aplicada") e o admin cancelava, a situacao virava
      // "Cancelado" mas folhaStatus continuava "aplicada" — averbadora via
      // "CANCELADO | APLICADA" na mesma linha, contradicao visivel.
      // Semantica: cancelamento zera a folha; se o desconto ja rodou em folha
      // anterior, o rastro fica nos eventos (linha ~694+).
      c.folhaStatus = undefined;
      c.folhaMotivo = motivo;
      break;
    case "alongar":
      if (extra && typeof extra.parcelasExtras === "number" && extra.parcelasExtras > 0) {
        c.totalParcelas += extra.parcelasExtras;
      }
      break;
    case "alterar":
      // sem mudanca de estado; aplica patch em campos editaveis
      if (extra) {
        if (typeof extra.observacoes === "string") c.observacoes = extra.observacoes;
        if (typeof extra.codigoVerba === "string") c.codigoVerba = extra.codigoVerba;
      }
      break;
    case "aprovar":
      // Aprovar SEM averbar — o banco vai baixar o contrato modelo e fechar a
      // formalizacao offline (ligacao/e-mail). Situacao intermediaria entre
      // "Aguardando" e "Ativo": nem esta averbada, nem pendente de decisao.
      para = "Aprovado";
      break;
    case "confirmar":
      para = "Ativo";
      c.expiracao = null;
      break;
  }
  c.situacao = para;
  _eventos.push({
    id: _eventoId++,
    contratoId: adf,
    evento: acao,
    deEstado: de,
    paraEstado: para,
    ator,
    motivo,
    criadoEm: new Date().toISOString(),
  });
  return c;
}

