// Bate-de-carteira — monthly per-banco reconciliation report.
// Aggregates contracts + pre-reservas confirmed for a given competencia into a CPF + ID-Unico table.
// Exports as CSV/JSON for the bank to ingest.

import { buildCsv } from "../../_shared/csv.js";
import { listLotes, listLinhas, type TombamentoLinha } from "./tombamento.js";
import { listPreReservas, type PreReserva } from "./pre-reservas.js";

export interface BateCarteiraLinha {
  competencia: string;
  bancoId: number;
  bancoNome: string;
  prefeituraId: number;
  prefeituraNome: string;
  cpfMasked: string;
  matricula: string;
  idUnico: string;
  adfBanco?: string;
  valorParcela: number;
  parcelasRestantes?: number;
  saldoDevedor?: number;
  origem: "tombamento" | "pre_reserva_confirmada";
  status: string;
  /** Date when this entry was issued/confirmed in Atlas (YYYY-MM-DD). */
  data: string;
}

export interface BateCarteiraRequest {
  bancoId: number;
  competencia: string; // YYYYMM
  prefeituraId?: number;
}

export interface BateCarteiraResultado {
  bancoId: number;
  bancoNome: string;
  competencia: string;
  totalLinhas: number;
  somaSaldoDevedor: number;
  somaValorParcela: number;
  linhas: BateCarteiraLinha[];
  geradoEm: string;
}

/**
 * Build a per-banco reconciliation export. Pulls confirmed pre-reservas + tombamento linhas
 * matching the banco for the requested competencia.
 */
export function gerarBateCarteira(input: BateCarteiraRequest, bancoNomeResolver: (id: number) => string): BateCarteiraResultado {
  const competencia = input.competencia;
  const bancoNome = bancoNomeResolver(input.bancoId);
  const linhas: BateCarteiraLinha[] = [];

  // 1) Tombamento — linhas processadas no mês.
  const lotes = listLotes({ competencia });
  for (const lote of lotes) {
    if (input.prefeituraId && lote.prefeituraId !== input.prefeituraId) continue;
    for (const linha of listLinhas(lote.id)) {
      if (linha.bancoNome.toLowerCase() !== bancoNome.toLowerCase()) continue;
      linhas.push({
        competencia,
        bancoId: input.bancoId,
        bancoNome,
        prefeituraId: lote.prefeituraId,
        prefeituraNome: lote.prefeituraNome,
        cpfMasked: linha.cpfMasked,
        matricula: linha.matricula,
        idUnico: linha.idUnico,
        adfBanco: linha.adfBanco,
        valorParcela: linha.valorParcela,
        parcelasRestantes: linha.parcelasRestantes,
        saldoDevedor: linha.saldoDevedor,
        origem: "tombamento",
        status: linha.reconciliacao,
        data: lote.processadoEm?.slice(0, 10) ?? lote.recebidoEm.slice(0, 10),
      });
    }
  }

  // 2) Pre-reservas confirmadas no mês.
  const preReservas = listPreReservas({ status: "confirmada", bancoId: input.bancoId });
  for (const r of preReservas) {
    if (!r.finalizadoEm) continue;
    const compConfirmacao = r.finalizadoEm.slice(0, 7).replace("-", "");
    if (compConfirmacao !== competencia) continue;
    if (input.prefeituraId && r.prefeituraId !== input.prefeituraId) continue;
    linhas.push({
      competencia,
      bancoId: input.bancoId,
      bancoNome,
      prefeituraId: r.prefeituraId,
      prefeituraNome: r.prefeituraNome,
      cpfMasked: r.servidorCpfMasked,
      matricula: r.matricula,
      idUnico: r.idUnico,
      valorParcela: r.valorParcela,
      saldoDevedor: r.valorMargem,
      origem: "pre_reserva_confirmada",
      status: "confirmada",
      data: r.finalizadoEm.slice(0, 10),
    });
  }

  const somaSaldoDevedor = linhas.reduce((a, l) => a + (l.saldoDevedor ?? 0), 0);
  const somaValorParcela = linhas.reduce((a, l) => a + l.valorParcela, 0);

  return {
    bancoId: input.bancoId,
    bancoNome,
    competencia,
    totalLinhas: linhas.length,
    somaSaldoDevedor,
    somaValorParcela,
    linhas,
    geradoEm: new Date().toISOString(),
  };
}

/** Render the result as CSV (header + rows) ready for download. */
export function bateCarteiraCsv(r: BateCarteiraResultado): string {
  return buildCsv(
    [
      "competencia", "bancoId", "bancoNome", "prefeituraId", "prefeituraNome",
      "cpfMasked", "matricula", "idUnico", "adfBanco",
      "valorParcela", "parcelasRestantes", "saldoDevedor",
      "origem", "status", "data",
    ],
    r.linhas.map((l) => ({
      competencia: l.competencia,
      bancoId: l.bancoId,
      bancoNome: l.bancoNome,
      prefeituraId: l.prefeituraId,
      prefeituraNome: l.prefeituraNome,
      cpfMasked: l.cpfMasked,
      matricula: l.matricula,
      idUnico: l.idUnico,
      adfBanco: l.adfBanco ?? "",
      valorParcela: l.valorParcela.toFixed(2),
      parcelasRestantes: l.parcelasRestantes ?? "",
      saldoDevedor: (l.saldoDevedor ?? 0).toFixed(2),
      origem: l.origem,
      status: l.status,
      data: l.data,
    })),
  );
}
