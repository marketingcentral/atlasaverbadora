// Fonte unica de verdade do mock de matriculas. Os componentes leem dados
// completos por idMatricula a partir daqui — o localStorage so guarda o
// idMatricula ativo (e um snapshot de meta para retrocompatibilidade).

import type { MargemResponse } from "@atlas/types";

export interface ContratoMock {
  id: string;
  banco: string;
  parcela: number;
  parcelasPagas: number;
  total: number;
  status: "Averbado" | "Em dia" | "Quitado";
  proximaParcela: string;
  taxaAm: number;
  valorFinanciado: number;
  pdfUrl: string;
}

export interface ContratoElegivelMock {
  id: string;
  banco: string;
  saldoDevedor: number;
  parcela: number;
  parcelasRestantes: number;
  totalParcelas: number;
  taxaAm: number;
  tipoContrato: "Emprestimo" | "Refin";
}

export interface MatriculaInfo {
  idMatricula: string;
  matricula: string;
  prefeitura: string;
  prefeitura_id: number;
  servidor_id: number;
  uf: string;
  cargo: string;
  vinculo: "ESTATUTARIO" | "CLT" | "COMISSIONADO";
  nome: string;
  email: string;
  telefone: string;
  endereco: string;
  ativa: boolean;
  margem: MargemResponse;
  contratos: ContratoMock[];
  elegiveisPortabilidade: ContratoElegivelMock[];
}

const NOW_ISO_30_MIN_AGO = () => new Date(Date.now() - 30 * 60 * 1000).toISOString();
const NOW_ISO_12_MIN_AGO = () => new Date(Date.now() - 12 * 60 * 1000).toISOString();

export const MATRICULAS: MatriculaInfo[] = [
  {
    idMatricula: "MAT-852029100",
    matricula: "852029100",
    prefeitura: "Prefeitura de Palhoca",
    prefeitura_id: 1,
    servidor_id: 1,
    uf: "SC",
    cargo: "Analista Administrativo",
    vinculo: "ESTATUTARIO",
    nome: "Ana Carolina Silva",
    email: "ana.carolina@palhoca.sc.gov.br",
    telefone: "(48) 99812-3210",
    endereco: "Rua das Acacias, 145 — Palhoca/SC, 88130-XXX",
    ativa: true,
    margem: {
      servidor_id: 1,
      matricula: "852029100",
      prefeitura_id: 1,
      margem: { salario_base: 4620, comprometido: 355.74, disponivel: 1261.26, percentual_uso: 0.22 },
      margens_por_tipo: [
        { tipo: "EMPRESTIMO", disponivel: 1261.26, total: 1617 },
        { tipo: "CARTAO_CONSIGNADO", disponivel: 207.9, total: 231 },
        { tipo: "CARTAO_BENEFICIOS", disponivel: 231, total: 231 },
      ],
      fonte: { tipo: "folha_prefeitura", sincronizado_em: NOW_ISO_30_MIN_AGO(), cache_status: "MISS" },
    },
    contratos: [
      {
        id: "ADF-S0003", banco: "SCred Financeira", parcela: 1176.37, parcelasPagas: 3, total: 60,
        status: "Averbado", proximaParcela: "05/07/2026", taxaAm: 1.65, valorFinanciado: 48000,
        pdfUrl: "https://atlas.io/mock/contrato-ADF-S0003.pdf",
      },
      {
        id: "ADF-S0002", banco: "SCred Financeira", parcela: 1773.79, parcelasPagas: 4, total: 48,
        status: "Em dia", proximaParcela: "05/07/2026", taxaAm: 1.72, valorFinanciado: 65000,
        pdfUrl: "https://atlas.io/mock/contrato-ADF-S0002.pdf",
      },
      {
        id: "ADF-C0001", banco: "Banco Y", parcela: 1163.43, parcelasPagas: 36, total: 36,
        status: "Quitado", proximaParcela: "—", taxaAm: 1.95, valorFinanciado: 30000,
        pdfUrl: "https://atlas.io/mock/contrato-ADF-C0001.pdf",
      },
    ],
    elegiveisPortabilidade: [
      {
        id: "ADF-472600084", banco: "Banco Y", saldoDevedor: 18420.55, parcela: 412.4,
        parcelasRestantes: 32, totalParcelas: 36, taxaAm: 1.95, tipoContrato: "Emprestimo",
      },
      {
        id: "ADF-460690084", banco: "Pan Credito", saldoDevedor: 6210.32, parcela: 320.1,
        parcelasRestantes: 24, totalParcelas: 24, taxaAm: 1.99, tipoContrato: "Emprestimo",
      },
    ],
  },
  {
    idMatricula: "MAT-009821",
    matricula: "M-009821",
    prefeitura: "Prefeitura de Florianopolis",
    prefeitura_id: 2,
    servidor_id: 2,
    uf: "SC",
    cargo: "Professor II",
    vinculo: "ESTATUTARIO",
    nome: "Ana C. Silva Pereira",
    email: "ana.silva@edu.pmf.sc.gov.br",
    telefone: "(48) 98445-7720",
    endereco: "Av. Beira-Mar Norte, 2401 ap 504 — Florianopolis/SC, 88010-XXX",
    ativa: true,
    margem: {
      servidor_id: 2,
      matricula: "M-009821",
      prefeitura_id: 2,
      margem: { salario_base: 6890, comprometido: 542.1, disponivel: 2347.9, percentual_uso: 0.19 },
      margens_por_tipo: [
        { tipo: "EMPRESTIMO", disponivel: 2347.9, total: 2890 },
        { tipo: "CARTAO_CONSIGNADO", disponivel: 410.5, total: 445 },
        { tipo: "CARTAO_BENEFICIOS", disponivel: 380, total: 445 },
      ],
      fonte: { tipo: "folha_prefeitura", sincronizado_em: NOW_ISO_12_MIN_AGO(), cache_status: "HIT" },
    },
    contratos: [
      {
        id: "ADF-F0021", banco: "Banco Y", parcela: 412.4, parcelasPagas: 8, total: 36,
        status: "Averbado", proximaParcela: "08/07/2026", taxaAm: 1.85, valorFinanciado: 12000,
        pdfUrl: "https://atlas.io/mock/contrato-ADF-F0021.pdf",
      },
      {
        id: "ADF-F0007", banco: "Pan Credito", parcela: 280.15, parcelasPagas: 18, total: 18,
        status: "Quitado", proximaParcela: "—", taxaAm: 2.05, valorFinanciado: 4500,
        pdfUrl: "https://atlas.io/mock/contrato-ADF-F0007.pdf",
      },
    ],
    elegiveisPortabilidade: [
      {
        id: "ADF-F0021", banco: "Banco Y", saldoDevedor: 9840.75, parcela: 412.4,
        parcelasRestantes: 28, totalParcelas: 36, taxaAm: 1.85, tipoContrato: "Emprestimo",
      },
    ],
  },
];

export const STORAGE_KEY_ID = "atlas:idMatricula";
export const STORAGE_KEY_META = "atlas:idMatricula:meta";

export function getMatricula(idMatricula: string | null): MatriculaInfo | null {
  if (!idMatricula) return null;
  return MATRICULAS.find((m) => m.idMatricula === idMatricula) ?? null;
}

export function readActiveIdMatricula(): string | null {
  try {
    // Prefere ID direto. Se nao houver, tenta extrair do meta-snapshot legado.
    const direct = window.localStorage.getItem(STORAGE_KEY_ID);
    if (direct) return direct;
    const meta = window.localStorage.getItem(STORAGE_KEY_META);
    if (!meta) return null;
    return (JSON.parse(meta) as { idMatricula?: string }).idMatricula ?? null;
  } catch {
    return null;
  }
}

export function readActiveMatricula(): MatriculaInfo | null {
  return getMatricula(readActiveIdMatricula());
}

export function setActiveMatricula(idMatricula: string): void {
  const m = getMatricula(idMatricula);
  if (!m) return;
  window.localStorage.setItem(STORAGE_KEY_ID, idMatricula);
  // Continua escrevendo o snapshot pra retrocompatibilidade com codigo que le META_KEY.
  const snapshot = {
    idMatricula: m.idMatricula,
    matricula: m.matricula,
    prefeitura: m.prefeitura,
    uf: m.uf,
    cargo: m.cargo,
    vinculo: m.vinculo,
    nome: m.nome,
    email: m.email,
    telefone: m.telefone,
    endereco: m.endereco,
  };
  window.localStorage.setItem(STORAGE_KEY_META, JSON.stringify(snapshot));
}
