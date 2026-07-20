// Tombamento de contratos — monthly import of active contracts from prefeituras.
// Workflow: receive remessa (CSV) → reconcile → update margins → produce reconciliation report.

import { parseCsv } from "../../_shared/csv.js";
import { previewIdUnico } from "./id-unico.js";
import { SERVIDORES_BUSCA_MOCK, prefeituraIdDe } from "../portal-banco/fixtures.js";
import { listContratos } from "../portal-banco/store.js";
import { ensureSchema, loadTombamento, upsertTombamentoLote, seedTombamentoIfEmpty } from "../../db/repos.js";
import type { Env } from "../../env.js";

export type TombamentoStatus = "processando" | "conciliado" | "divergente" | "rejeitado";

export interface TombamentoLote {
  id: string;
  prefeituraId: number;
  prefeituraNome: string;
  competencia: string;
  status: TombamentoStatus;
  totalLinhas: number;
  inseridos: number;
  atualizados: number;
  divergencias: number;
  recebidoEm: string;
  processadoEm?: string;
  recebidoPor: string;
  observacao?: string;
}

export interface TombamentoLinha {
  loteId: string;
  cpfMasked: string;
  matricula: string;
  bancoNome: string;
  adfBanco: string;
  /** Atlas-side unique id; computed from prefeitura config */
  idUnico: string;
  valorParcela: number;
  parcelasRestantes: number;
  saldoDevedor: number;
  /** "ok" — bate; "divergente" — valor/parcelas conflitam; "novo" — não havia no Atlas */
  reconciliacao: "ok" | "divergente" | "novo";
  detalheReconciliacao?: string;
  // Campos do relatório de empréstimos real (opcionais — presentes quando a
  // remessa vem no formato completo do banco).
  nome?: string;
  totalParcelas?: number;
  valorEmprestimo?: number;
  statusContrato?: string;
  motivo?: string;
  tipo?: string;
}

/** Parseia valores BR: "R$ 7.944,97" -> 7944.97; "79.16" -> 79.16; "164" -> 164. */
function parseBRL(s: string | undefined): number {
  if (s == null) return NaN;
  let t = String(s).replace(/[R$\s]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  return Number(t);
}
/** Mascara CPF completo -> "000.***.***-00" (mantém 3 primeiros + 2 últimos). */
function maskCpf(cpf: string | undefined): string {
  const raw = (cpf ?? "").replace(/\D/g, "");
  if (!raw) return "";
  if (raw.includes("*")) return cpf!; // já mascarado
  const d = raw.length < 11 ? raw.padStart(11, "0") : raw.slice(-11);
  return `${d.slice(0, 3)}.***.***-${d.slice(-2)}`;
}
/** Lê um campo por vários nomes de coluna possíveis (case-insensitive). */
function pick(norm: Record<string, string>, ...names: string[]): string {
  for (const n of names) { const v = norm[n.toLowerCase().trim()]; if (v != null && v !== "") return v; }
  return "";
}

const _lotes: TombamentoLote[] = [];
const _linhas: TombamentoLinha[] = [];

/** Zera memoria do tombamento (chamado pelo purge-contratos pra evitar orfaos
 *  in-memory apos TRUNCATE do PG). */
export function clearTombamentoMemoria(): void {
  _lotes.length = 0;
  _linhas.length = 0;
}

/** Remove um lote especifico da memoria (chamado pelo endpoint delete-lote apos
 *  deletar do PG). Idempotente. */
export function removeLoteMemoria(id: string): void {
  const idx = _lotes.findIndex((l) => l.id === id);
  if (idx >= 0) _lotes.splice(idx, 1);
  for (let i = _linhas.length - 1; i >= 0; i--) {
    if (_linhas[i]?.loteId === id) _linhas.splice(i, 1);
  }
}

// Seed: one consolidated lote per prefeitura.
function seedLote(input: Omit<TombamentoLote, "id" | "recebidoEm" | "processadoEm">): TombamentoLote {
  const id = `TB-${input.prefeituraId}-${input.competencia}`;
  const recebidoEm = new Date("2026-06-05T08:30:00Z").toISOString();
  const processadoEm = new Date("2026-06-05T08:42:00Z").toISOString();
  const lote: TombamentoLote = { ...input, id, recebidoEm, processadoEm };
  _lotes.push(lote);
  return lote;
}

// Cliente pediu remocao dos seeds hardcoded de tombamento (16/07/2026) pra
// teste real do zero — antes tinha 3 lotes (Palhoca/Floripa/Joinville 202605)
// + 3 linhas sample de Ana/Joao/Maria, todos orfaos de prefeituras/bancos
// removidos. Se restaurar pra demo, reverter este bloco.

// Snapshot do seed (antes de qualquer mutação) — semeia o Postgres na 1ª carga.
const TOMBAMENTO_SEED = _lotes.map((l) => ({ lote: { ...l }, linhas: _linhas.filter((x) => x.loteId === l.id).map((x) => ({ ...x })) }));

// Hidrata _lotes/_linhas do Postgres 1x por isolate (semeando se vazio). Fail-safe.
let _tombLoad: Promise<void> | null = null;
export function ensureTombamentoLoaded(env: Env): Promise<void> {
  if (_tombLoad) return _tombLoad;
  _tombLoad = (async () => {
    try {
      await ensureSchema(env);
      await seedTombamentoIfEmpty(env, TOMBAMENTO_SEED as unknown as { lote: { id: string }; linhas: { id: string }[] }[]);
      const { lotes, linhas } = await loadTombamento(env);
      if (lotes.length) {
        _lotes.length = 0; _lotes.push(...(lotes as unknown as TombamentoLote[]));
        _linhas.length = 0; _linhas.push(...(linhas as unknown as TombamentoLinha[]));
      }
    } catch { _tombLoad = null; /* mantém memória */ }
  })();
  return _tombLoad;
}

/** Re-sync do PG a cada request — usado nos endpoints que precisam ver
 *  tombamento atualizado por outro isolate (import de lote em isolate A,
 *  leitura em isolate B). Mesmo padrao de refreshContratos.
 *  Sobrescreve incondicionalmente — se PG retornou (sem exception), aquilo eh
 *  a verdade, mesmo que vazio. Antes tinha `if (lotes.length)` como guard mas
 *  isso impedia sincronizar apos purge (isolates com memoria antiga ficavam
 *  servindo lotes ja apagados). */
export async function refreshTombamento(env: Env): Promise<void> {
  try {
    await ensureTombamentoLoaded(env);
    const { lotes, linhas } = await loadTombamento(env);
    _lotes.length = 0; _lotes.push(...(lotes as unknown as TombamentoLote[]));
    _linhas.length = 0; _linhas.push(...(linhas as unknown as TombamentoLinha[]));
  } catch { /* falha PG: mantem memoria */ }
}

/** Write-through best-effort de um lote (com suas linhas) no Postgres. */
async function persistLote(env: Env, loteId: string): Promise<void> {
  const lote = _lotes.find((l) => l.id === loteId);
  if (!lote) return;
  const linhas = _linhas.filter((l) => l.loteId === loteId);
  try { await upsertTombamentoLote(env, lote as unknown as { id: string }, linhas as unknown as { id: string }[]); } catch { /* best-effort */ }
}

export function listLotes(filter: { prefeituraId?: number; competencia?: string } = {}): TombamentoLote[] {
  return _lotes
    .filter((l) => !filter.prefeituraId || l.prefeituraId === filter.prefeituraId)
    .filter((l) => !filter.competencia || l.competencia === filter.competencia)
    .slice()
    .sort((a, b) => b.competencia.localeCompare(a.competencia));
}

export function getLote(id: string): TombamentoLote | undefined {
  return _lotes.find((l) => l.id === id);
}

export function listLinhas(loteId: string): TombamentoLinha[] {
  return _linhas.filter((l) => l.loteId === loteId);
}

// ---------------------------------------------------------------------------
// Emprestimos externos (portabilidade)
// ---------------------------------------------------------------------------
// Fonte da portabilidade: os contratos que o servidor JA TEM em OUTROS bancos.
// Vem de duas origens: (1) o tombamento importado pela prefeitura (planilha de
// emprestimos — mesmas colunas do relatorio real), e (2) um seed de teste em
// memoria (sempre presente, independente do Postgres) para validar o fluxo.
export interface ExternalLoan {
  id: string;
  matricula: string;
  bancoNome: string;
  contratoOrigem: string;
  valorParcela: number;
  parcelasRestantes: number;
  totalParcelas: number;
  saldoDevedor: number;
  valorEmprestimo: number;
  taxaAm: number;
  tipo: string;
  /** Motivo do CSV (ex: "Emprestimo", "Cartao Consignado", "Cartao Beneficio",
   *  "Refinanciamento"). Combinado com `tipo` pra decidir o bucket da margem. */
  motivo?: string;
}

// Seed de teste — SEMPRE em memoria (nao depende do Postgres), pra o fluxo de
// portabilidade poder ser validado com os servidores de teste.
const EXTERNAL_LOANS_SEED: ExternalLoan[] = [
  // Diego (teste, matricula 993410027): Santander, R$ 50 mil, faltam 40 parcelas.
  {
    id: "EXT-993410027-SANTANDER",
    matricula: "993410027",
    bancoNome: "Santander",
    contratoOrigem: "SAN-0099341027",
    valorParcela: 1483.33,
    parcelasRestantes: 40,
    totalParcelas: 60,
    saldoDevedor: 42000,
    valorEmprestimo: 50000,
    taxaAm: 0.0219,
    tipo: "Empréstimo",
  },
];

/** Mapeia uma linha de tombamento (planilha importada) para um emprestimo externo portavel. */
function tombamentoLinhaToLoan(l: TombamentoLinha): ExternalLoan {
  const total = l.totalParcelas ?? l.parcelasRestantes;
  return {
    id: `EXT-${l.matricula}-${l.adfBanco}`,
    matricula: l.matricula,
    bancoNome: l.bancoNome,
    contratoOrigem: l.adfBanco,
    valorParcela: l.valorParcela,
    parcelasRestantes: l.parcelasRestantes,
    totalParcelas: total,
    saldoDevedor: l.saldoDevedor,
    valorEmprestimo: l.valorEmprestimo ?? l.saldoDevedor,
    taxaAm: 0.02, // taxa de origem estimada (o relatorio nao traz taxa)
    tipo: l.tipo ?? "Empréstimo",
    motivo: l.motivo,
  };
}

/** Emprestimos externos (de outros bancos) de um servidor — para portabilidade.
 *  Une o seed de teste + o que a prefeitura importou via tombamento, pela matricula.
 *  Ignora cartao beneficio (nao e portavel como emprestimo consignado). */
export function listExternalLoans(matricula: string): ExternalLoan[] {
  const seed = EXTERNAL_LOANS_SEED.filter((l) => l.matricula === matricula);
  const tomb = _linhas
    .filter((l) => l.matricula === matricula)
    .filter((l) => !/beneficio|benefício/i.test(l.tipo ?? ""))
    .map(tombamentoLinhaToLoan);
  // dedup por contratoOrigem (o seed tem prioridade)
  const seen = new Set(seed.map((l) => l.contratoOrigem));
  return [...seed, ...tomb.filter((l) => !seen.has(l.contratoOrigem))];
}

/** Um emprestimo externo especifico do servidor (para preencher a portabilidade). */
export function getExternalLoan(matricula: string, id: string): ExternalLoan | undefined {
  return listExternalLoans(matricula).find((l) => l.id === id);
}

export interface ImportTombamentoResult {
  lote: TombamentoLote;
  inseridos: number;
  atualizados: number;
  divergencias: number;
  erros: { line: number; message: string }[];
}

/**
 * Receive a CSV remessa of contracts from a prefeitura. Reconciles against
 * existing data (memory-only for now) and creates a Lote entry plus per-line records.
 *
 * Expected columns: cpfMasked, matricula, bancoNome, adfBanco, valorParcela,
 * parcelasRestantes, saldoDevedor
 */
export async function importTombamento(input: {
  prefeituraId: number;
  prefeituraNome: string;
  competencia: string;
  recebidoPor: string;
  csv: string;
  env?: Env;
}): Promise<ImportTombamentoResult> {
  const { rows } = parseCsv(input.csv);
  const erros: { line: number; message: string }[] = [];
  let inseridos = 0;
  let atualizados = 0;
  let divergencias = 0;
  const loteId = `TB-${input.prefeituraId}-${input.competencia}-${Date.now().toString(36)}`;
  const linhas: TombamentoLinha[] = [];
  rows.forEach((r, idx) => {
    const line = idx + 2;
    // Aceita tanto o relatorio de emprestimos real (NÚMERO DO CONTRATO, BANCO,
    // VALOR DA PARCELA…) quanto o formato legado (cpfMasked, adfBanco…).
    const norm: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) norm[k.toLowerCase().trim()] = v as string;

    const cpfRaw = pick(norm, "cpf", "cpfmasked");
    const matricula = pick(norm, "matricula");
    const adfBanco = pick(norm, "numerocontrato", "numero do contrato", "adfbanco", "codigo");
    if (!cpfRaw) { erros.push({ line, message: "cpf/cpfMasked obrigatorio" }); return; }
    if (!matricula) { erros.push({ line, message: "matricula obrigatoria" }); return; }
    if (!adfBanco) { erros.push({ line, message: "numero do contrato (adfBanco) obrigatorio" }); return; }

    const valorParcela = parseBRL(pick(norm, "valorparcela", "valor da parcela"));
    const parcelasRestantes = Number(pick(norm, "parcelasrestantes", "parcelas remanescentes"));
    const totalParcelas = Number(pick(norm, "totalparcelas", "total de parcelas")) || undefined;
    const valorEmprestimo = parseBRL(pick(norm, "valoremprestimo", "valor do emprestimo", "valor do empréstimo")) || undefined;
    // parseBRL("") = 0 (finito) — precisa checar se a coluna veio VAZIA no CSV
    // pra cair no fallback. Sem essa verificacao, todo tombamento sem coluna
    // saldoDevedor viria com R$ 0,00 (bug 20/07/2026).
    const saldoStr = pick(norm, "saldodevedor");
    const saldoRaw = saldoStr ? parseBRL(saldoStr) : NaN;
    // Sem saldo devedor explicito, estima parcela × parcelas restantes.
    const saldoDevedor = Number.isFinite(saldoRaw) && saldoRaw > 0
      ? saldoRaw
      : (valorParcela * (Number.isFinite(parcelasRestantes) ? parcelasRestantes : 0));
    if (!Number.isFinite(valorParcela)) { erros.push({ line, message: "valorParcela invalido" }); return; }
    if (!Number.isFinite(parcelasRestantes)) { erros.push({ line, message: "parcelasRestantes invalido" }); return; }
    const existing = _linhas.find((l) => l.matricula === matricula && l.adfBanco === adfBanco);
    // Reconciliação: tombamento é POR DEFINIÇÃO contrato externo (banco não-Atlas).
    // Só flagra divergência quando algo REAL não bate:
    //   1) Servidor não existe na base da prefeitura (matricula/CPF orfao)
    //   2) Valor difere de tombamento anterior da mesma linha
    //   3) Se por acaso existir contrato Atlas com esse ADF+matricula (raro,
    //      indica que o banco JA e parceiro), o valor tem que bater
    // "Contrato nao consta na base do banco" NAO e divergencia — e o padrao pra
    // tombamento (o banco externo por natureza nao esta na base Atlas).
    const cpfDigits = cpfRaw.replace(/\D/g, "");
    const naPrefeitura = SERVIDORES_BUSCA_MOCK.find(
      (s) => s.matricula === matricula && prefeituraIdDe(s) === input.prefeituraId && (!cpfDigits || s.cpf === cpfDigits.padStart(11, "0") || s.cpf === cpfDigits),
    );
    const noBanco = listContratos({ matricula }).find((ct) => ct.adf === adfBanco);
    const divs: string[] = [];
    if (!naPrefeitura) divs.push("servidor não consta na base da prefeitura");
    if (noBanco && Math.abs((noBanco.valorParcela ?? 0) - valorParcela) > 0.01) {
      divs.push(`parcela difere do banco (contrato ${adfBanco} ja existe no Atlas): remessa=${valorParcela} / atlas=${noBanco.valorParcela}`);
    }
    if (existing && Math.abs(existing.valorParcela - valorParcela) > 0.01) divs.push(`parcela difere de tombamento anterior: ${existing.valorParcela}`);

    const linha: TombamentoLinha = {
      loteId,
      cpfMasked: maskCpf(cpfRaw),
      matricula,
      bancoNome: pick(norm, "banco", "banconome") || "?",
      adfBanco,
      idUnico: previewIdUnico(input.prefeituraId),
      valorParcela,
      parcelasRestantes,
      saldoDevedor: Number.isFinite(saldoDevedor) ? saldoDevedor : 0,
      reconciliacao: divs.length > 0 ? "divergente" : (existing ? "ok" : "novo"),
      detalheReconciliacao: divs.length > 0 ? divs.join("; ") : undefined,
      nome: pick(norm, "nome") || naPrefeitura?.nome || undefined,
      totalParcelas,
      valorEmprestimo,
      statusContrato: pick(norm, "status") || undefined,
      motivo: pick(norm, "motivo") || undefined,
      tipo: pick(norm, "tipo") || undefined,
    };
    if (linha.reconciliacao === "divergente") { divergencias++; atualizados++; }
    else if (linha.reconciliacao === "novo") { inseridos++; }
    else { atualizados++; }
    linhas.push(linha);
  });
  const lote: TombamentoLote = {
    id: loteId,
    prefeituraId: input.prefeituraId,
    prefeituraNome: input.prefeituraNome,
    competencia: input.competencia,
    status: divergencias > 0 ? "divergente" : "conciliado",
    totalLinhas: rows.length,
    inseridos,
    atualizados,
    divergencias,
    recebidoEm: new Date().toISOString(),
    processadoEm: new Date().toISOString(),
    recebidoPor: input.recebidoPor,
  };
  _lotes.push(lote);
  _linhas.push(...linhas);
  // Write-through: o lote e suas linhas ficam duráveis no Postgres.
  if (input.env) await persistLote(input.env, loteId);
  return { lote, inseridos, atualizados, divergencias, erros };
}
