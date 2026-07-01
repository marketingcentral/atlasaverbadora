// Fonte de verdade das matriculas do servidor. Os dados vem do BACKEND real
// (GET /v1/servidores/me/matriculas) — os MESMOS que os outros perfis veem —
// e ficam num cache local (localStorage) para leitura sincrona pelas telas.
// A hidratacao acontece no login e ao entrar no app do servidor.

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

export const STORAGE_KEY_ID = "atlas:idMatricula";
export const STORAGE_KEY_META = "atlas:idMatricula:meta";
export const STORAGE_KEY_LIST = "atlas:matriculas";

function loadCachedMatriculas(): MatriculaInfo[] {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY_LIST) : null;
    return raw ? (JSON.parse(raw) as MatriculaInfo[]) : [];
  } catch {
    return [];
  }
}

/**
 * Matriculas do servidor logado. Cache populado do backend (fonte de verdade) e
 * persistido no localStorage para leitura sincrona apos reload. A referencia do
 * array e mantida (mutada no lugar) para que os imports existentes vejam a atualizacao.
 */
export const MATRICULAS: MatriculaInfo[] = loadCachedMatriculas();

/** Busca as matriculas reais no backend e atualiza o cache no lugar. Idempotente. */
export async function hydrateMatriculas(): Promise<MatriculaInfo[]> {
  try {
    if (typeof window === "undefined") return MATRICULAS;
    const tk = window.localStorage.getItem("atlas:tokens");
    const token = tk ? (JSON.parse(tk) as { access_token?: string }).access_token : null;
    if (!token) return MATRICULAS;
    const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8787";
    const res = await fetch(`${base}/v1/servidores/me/matriculas`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return MATRICULAS;
    const j = (await res.json()) as { matriculas: MatriculaInfo[] };
    MATRICULAS.length = 0;
    MATRICULAS.push(...(j.matriculas ?? []));
    window.localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(MATRICULAS));
    // Sinaliza as telas (que escutam 'storage' de STORAGE_KEY_ID/META) para re-ler.
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY_META }));
    return MATRICULAS;
  } catch {
    return MATRICULAS;
  }
}

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
