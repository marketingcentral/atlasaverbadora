// Tombamento de contratos — monthly import of active contracts from prefeituras.
// Workflow: receive remessa (CSV) → reconcile → update margins → produce reconciliation report.

import { parseCsv } from "../../_shared/csv.js";
import { previewIdUnico } from "./id-unico.js";

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

// Seed: one consolidated lote per prefeitura.
function seedLote(input: Omit<TombamentoLote, "id" | "recebidoEm" | "processadoEm">): TombamentoLote {
  const id = `TB-${input.prefeituraId}-${input.competencia}`;
  const recebidoEm = new Date("2026-06-05T08:30:00Z").toISOString();
  const processadoEm = new Date("2026-06-05T08:42:00Z").toISOString();
  const lote: TombamentoLote = { ...input, id, recebidoEm, processadoEm };
  _lotes.push(lote);
  return lote;
}

seedLote({
  prefeituraId: 1, prefeituraNome: "Palhoca", competencia: "202605",
  status: "conciliado", totalLinhas: 312, inseridos: 8, atualizados: 296, divergencias: 8,
  recebidoPor: "averbadora:admin", observacao: "8 divergencias para revisao.",
});
seedLote({
  prefeituraId: 2, prefeituraNome: "Florianopolis", competencia: "202605",
  status: "divergente", totalLinhas: 188, inseridos: 4, atualizados: 161, divergencias: 23,
  recebidoPor: "averbadora:admin", observacao: "23 divergencias — bancos Y e BMG.",
});
seedLote({
  prefeituraId: 3, prefeituraNome: "Joinville", competencia: "202605",
  status: "conciliado", totalLinhas: 96, inseridos: 1, atualizados: 91, divergencias: 4,
  recebidoPor: "averbadora:admin",
});

// Seed a handful of linhas para o lote 1 (Palhoca).
const sample = [
  { cpfMasked: "000.***.***-33", matricula: "M-9001", bancoNome: "SCred Financeira", adfBanco: "9000123", valorParcela: 320.5, parcelasRestantes: 70, saldoDevedor: 22435.0, reconciliacao: "ok" as const },
  { cpfMasked: "000.***.***-44", matricula: "M-9002", bancoNome: "Banco Y", adfBanco: "9000124", valorParcela: 180.0, parcelasRestantes: 58, saldoDevedor: 10440.0, reconciliacao: "divergente" as const, detalheReconciliacao: "valorParcela difere: prefeitura=180,00 / atlas=185,40" },
  { cpfMasked: "000.***.***-55", matricula: "M-9003", bancoNome: "SCred Financeira", adfBanco: "9000125", valorParcela: 420.0, parcelasRestantes: 84, saldoDevedor: 35280.0, reconciliacao: "novo" as const, detalheReconciliacao: "Contrato nao existia no Atlas — tombado." },
];
for (const s of sample) {
  _linhas.push({
    loteId: "TB-1-202605",
    cpfMasked: s.cpfMasked,
    matricula: s.matricula,
    bancoNome: s.bancoNome,
    adfBanco: s.adfBanco,
    idUnico: previewIdUnico(1),
    valorParcela: s.valorParcela,
    parcelasRestantes: s.parcelasRestantes,
    saldoDevedor: s.saldoDevedor,
    reconciliacao: s.reconciliacao,
    detalheReconciliacao: s.detalheReconciliacao,
  });
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
export function importTombamento(input: {
  prefeituraId: number;
  prefeituraNome: string;
  competencia: string;
  recebidoPor: string;
  csv: string;
}): ImportTombamentoResult {
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
    const saldoRaw = parseBRL(pick(norm, "saldodevedor"));
    // Sem saldo devedor explicito, estima parcela × parcelas restantes.
    const saldoDevedor = Number.isFinite(saldoRaw) ? saldoRaw : (valorParcela * (Number.isFinite(parcelasRestantes) ? parcelasRestantes : 0));
    if (!Number.isFinite(valorParcela)) { erros.push({ line, message: "valorParcela invalido" }); return; }
    if (!Number.isFinite(parcelasRestantes)) { erros.push({ line, message: "parcelasRestantes invalido" }); return; }
    const existing = _linhas.find((l) => l.matricula === matricula && l.adfBanco === adfBanco);
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
      reconciliacao: existing ? (Math.abs(existing.valorParcela - valorParcela) > 0.01 ? "divergente" : "ok") : "novo",
      nome: pick(norm, "nome") || undefined,
      totalParcelas,
      valorEmprestimo,
      statusContrato: pick(norm, "status") || undefined,
      motivo: pick(norm, "motivo") || undefined,
      tipo: pick(norm, "tipo") || undefined,
    };
    if (linha.reconciliacao === "divergente") {
      linha.detalheReconciliacao = `valorParcela difere: prefeitura=${valorParcela} / atlas=${existing!.valorParcela}`;
      divergencias++;
      atualizados++;
    } else if (linha.reconciliacao === "novo") {
      inseridos++;
    } else {
      atualizados++;
    }
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
  return { lote, inseridos, atualizados, divergencias, erros };
}
