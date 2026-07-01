// Carteira do banco (contratos averbados), ADF, bate de carteira e convenios
// (Passos 8-11 do fluxo do banco). Mockup self-contained. A carteira combina
// um seed historico de contratos ja averbados + qualquer proposta que tenha
// atingido o status "averbada" no fluxo (lib/banco-propostas).

import { STORAGE_KEYS } from "./session";
import { getBancoConvenios, PRODUTO_LABEL, getAllPropostas, type BancoProduto } from "./banco-propostas";

export type ContratoStatus = "em_dia" | "quitado" | "inadimplente";

export interface Contrato {
  idUnico: string;
  cpfMasked: string;
  nome: string;
  convenio: string;
  matricula: string;
  produto: BancoProduto;
  valor: number;
  parcelas: number;
  valorParcela: number;
  status: ContratoStatus;
  proximaParcela: string; // YYYY-MM (competencia)
  averbadoEm: string; // ISO
  ccbUrl: string;
}

export const CONTRATO_STATUS_LABEL: Record<ContratoStatus, string> = {
  em_dia: "Em dia",
  quitado: "Quitado",
  inadimplente: "Inadimplente",
};

// Seed historico da carteira (contratos ja averbados em competencias anteriores).
const CARTEIRA_SEED: Contrato[] = [
  {
    idUnico: "OP-2025-0009912",
    cpfMasked: "***.301.774-**",
    nome: "Sônia Maria Batista",
    convenio: "Prefeitura de Palhoça",
    matricula: "PALH-51002",
    produto: "novo",
    valor: 14000,
    parcelas: 60,
    valorParcela: 312.5,
    status: "em_dia",
    proximaParcela: "2026-08",
    averbadoEm: "2025-11-12T14:30:00.000Z",
    ccbUrl: "https://formaliza.bancodelta.com.br/ccb/OP-2025-0009912.pdf",
  },
  {
    idUnico: "OP-2025-0010455",
    cpfMasked: "***.882.190-**",
    nome: "Paulo Henrique Costa",
    convenio: "Prefeitura de Biguaçu",
    matricula: "BIG-22811",
    produto: "portabilidade",
    valor: 27800,
    parcelas: 84,
    valorParcela: 489.9,
    status: "em_dia",
    proximaParcela: "2026-08",
    averbadoEm: "2025-12-03T10:05:00.000Z",
    ccbUrl: "https://formaliza.bancodelta.com.br/ccb/OP-2025-0010455.pdf",
  },
  {
    idUnico: "OP-2025-0008120",
    cpfMasked: "***.447.663-**",
    nome: "Regina Célia Andrade",
    convenio: "Prefeitura de São José",
    matricula: "SJ-30990",
    produto: "novo",
    valor: 9800,
    parcelas: 48,
    valorParcela: 268.0,
    status: "inadimplente",
    proximaParcela: "2026-07",
    averbadoEm: "2025-09-20T09:00:00.000Z",
    ccbUrl: "https://formaliza.bancodelta.com.br/ccb/OP-2025-0008120.pdf",
  },
  {
    idUnico: "OP-2024-0071233",
    cpfMasked: "***.115.902-**",
    nome: "Antônio Marcos Ferreira",
    convenio: "Prefeitura de Palhoça",
    matricula: "PALH-40012",
    produto: "novo",
    valor: 6000,
    parcelas: 24,
    valorParcela: 291.4,
    status: "quitado",
    proximaParcela: "—",
    averbadoEm: "2024-06-15T11:20:00.000Z",
    ccbUrl: "https://formaliza.bancodelta.com.br/ccb/OP-2024-0071233.pdf",
  },
];

/** Carteira = seed historico + propostas averbadas no fluxo (dedup por idUnico). */
export function getCarteira(): Contrato[] {
  const averbadas = getAllPropostas()
    .filter((p) => p.status === "averbada")
    .map<Contrato>((p) => ({
      idUnico: p.idUnico,
      cpfMasked: p.cpfMasked,
      nome: p.nome,
      convenio: p.convenio,
      matricula: p.matricula,
      produto: p.produto,
      valor: p.valor,
      parcelas: p.parcelas,
      valorParcela: p.parcela,
      status: "em_dia",
      proximaParcela: proximaCompetencia(),
      averbadoEm: new Date().toISOString(),
      ccbUrl: p.ccbUrl ?? `https://formaliza.bancodelta.com.br/ccb/${p.idUnico}.pdf`,
    }));
  const byId = new Map<string, Contrato>();
  for (const c of [...CARTEIRA_SEED, ...averbadas]) byId.set(c.idUnico, c);
  return [...byId.values()];
}

function proximaCompetencia(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// ADF — Autorizacao de Desconto em Folha (Passo 10). Gerada por operacao
// averbada, carrega o ID unico. Persistida em localStorage.
// ---------------------------------------------------------------------------

export interface Adf {
  numero: string;
  idUnico: string;
  geradaEm: string; // ISO
}

type AdfStore = Record<string, Adf>;

function readAdfs(): AdfStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.bancoAdf);
    return raw ? (JSON.parse(raw) as AdfStore) : {};
  } catch {
    return {};
  }
}

function writeAdfs(s: AdfStore): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.bancoAdf, JSON.stringify(s));
  } catch {
    // ignore
  }
}

export function getAdf(idUnico: string): Adf | undefined {
  return readAdfs()[idUnico];
}

export function gerarAdf(idUnico: string): Adf {
  const store = readAdfs();
  const existing = store[idUnico];
  if (existing) return existing;
  const seq = idUnico.replace(/\D/g, "").slice(-6);
  const adf: Adf = { numero: `ADF-${seq}`, idUnico, geradaEm: new Date().toISOString() };
  store[idUnico] = adf;
  writeAdfs(store);
  return adf;
}

// ---------------------------------------------------------------------------
// Bate de carteira mensal (Passo 9). Concilia contratos do banco com o que a
// folha da prefeitura processou. Chave de conciliacao = ID unico (um CPF pode
// ter varias matriculas e varias operacoes). Mock deterministico.
// ---------------------------------------------------------------------------

export type ConciliacaoStatus = "conciliado" | "divergente" | "nao_encontrado";

export interface LinhaConciliacao {
  idUnico: string;
  cpfMasked: string;
  nome: string;
  convenio: string;
  matricula: string;
  valorBanco: number;
  valorFolha: number;
  status: ConciliacaoStatus;
}

// Hash deterministico pra variar resultados por competencia + contrato.
function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Converte "YYYY-MM" em Date (primeiro dia do mes).
function competenciaToDate(comp: string): Date | null {
  const m = comp.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, 1);
}

/**
 * Simula o processamento da folha para uma competencia especifica.
 * - Contratos averbados APOS a competencia nao aparecem (nao existiam ainda).
 * - Contratos quitados nao entram na conciliacao.
 * - Status conciliado/divergente/nao_encontrado varia por competencia via hash
 *   deterministico (mesmo mes/ano sempre da o mesmo resultado, meses
 *   diferentes dao resultados diferentes).
 */
export function baterCarteira(competencia: string): { competencia: string; linhas: LinhaConciliacao[] } {
  const compDate = competenciaToDate(competencia);
  const linhas = getCarteira()
    .filter((c) => c.status !== "quitado")
    .filter((c) => {
      if (!compDate) return true;
      // So inclui contratos averbados ATE a competencia
      const avDate = new Date(c.averbadoEm);
      return avDate <= new Date(compDate.getFullYear(), compDate.getMonth() + 1, 0); // ultimo dia do mes
    })
    .map<LinhaConciliacao>((c) => {
      const seed = hashSeed(c.idUnico + "|" + competencia);
      let status: ConciliacaoStatus = "conciliado";
      let valorFolha = c.valorParcela;
      if (c.status === "inadimplente") {
        // Inadimplente sempre nao aparece na folha
        status = "nao_encontrado";
        valorFolha = 0;
      } else if (seed % 11 === 0) {
        // ~9% divergente por competencia (valor da folha != valor banco)
        status = "divergente";
        const delta = ((seed % 40) + 5) / 10; // R$ 0.50 a R$ 4.40
        valorFolha = Math.round((c.valorParcela - delta * 3) * 100) / 100;
      } else if (seed % 23 === 0) {
        // ~4% nao encontrado por competencia
        status = "nao_encontrado";
        valorFolha = 0;
      }
      return {
        idUnico: c.idUnico,
        cpfMasked: c.cpfMasked,
        nome: c.nome,
        convenio: c.convenio,
        matricula: c.matricula,
        valorBanco: c.valorParcela,
        valorFolha,
        status,
      };
    });
  return { competencia, linhas };
}

// ---------------------------------------------------------------------------
// Convenios do banco (Passo 11). Cada banco ve apenas os seus.
// ---------------------------------------------------------------------------

export interface ConvenioResumo {
  nome: string;
  contratosAtivos: number;
  volumeAtivo: number;
  inadimplentes: number;
}

export function getConveniosDoBanco(): ConvenioResumo[] {
  const carteira = getCarteira();
  return getBancoConvenios().map((nome) => {
    const doConv = carteira.filter((c) => c.convenio === nome && c.status !== "quitado");
    return {
      nome,
      contratosAtivos: doConv.length,
      volumeAtivo: doConv.reduce((sum, c) => sum + c.valor, 0),
      inadimplentes: doConv.filter((c) => c.status === "inadimplente").length,
    };
  });
}

export { PRODUTO_LABEL };
