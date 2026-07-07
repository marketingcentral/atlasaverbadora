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

// CARTEIRA_SEED zerada. Antes tinha 4 clientes hardcoded (Sonia, Paulo,
// Regina, Antonio) que apareciam em bate-carteira/convenios/getCarteira
// pra QUALQUER banco logado — incluindo bancos recem criados pela averbadora,
// que deveriam ficar zerados. Fonte de verdade agora e o backend
// (atlas.banco.contratos()) — carteira/adf ja passaram por isso; agora
// bate-carteira e convenios tambem.
const CARTEIRA_SEED: Contrato[] = [];

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
      // Usa a data de criacao real da proposta como averbadoEm — antes era
      // new Date().toISOString() e todas as seed propostas ficavam empatadas
      // em "agora", empurrando contratos reais do backend (com data antiga)
      // pro fim da lista no sort desc.
      averbadoEm: p.criadaEm,
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
  quitados: number;
  ticketMedio: number;
  matriculasUnicas: number;
}

export function getConveniosDoBanco(): ConvenioResumo[] {
  const carteira = getCarteira();
  return getBancoConvenios().map((nome) => {
    const doConv = carteira.filter((c) => c.convenio === nome);
    const ativos = doConv.filter((c) => c.status !== "quitado");
    const volumeAtivo = ativos.reduce((sum, c) => sum + c.valor, 0);
    const matriculas = new Set(ativos.map((c) => c.matricula));
    return {
      nome,
      contratosAtivos: ativos.length,
      volumeAtivo,
      inadimplentes: ativos.filter((c) => c.status === "inadimplente").length,
      quitados: doConv.filter((c) => c.status === "quitado").length,
      ticketMedio: ativos.length > 0 ? volumeAtivo / ativos.length : 0,
      matriculasUnicas: matriculas.size,
    };
  });
}

export { PRODUTO_LABEL };
