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
  /** Status do ADF na folha da prefeitura (cadeia banco→prefeitura). Só relevante
   *  em contratos averbados. "recebida" = prefeitura ainda não confirmou; "aplicada"
   *  = desconto entrou em folha; "falha" = prefeitura reprovou. Persistido no contrato
   *  pra ser fonte única (prefeitura confirma, banco vê). */
  folhaStatus?: "recebida" | "aplicada" | "falha";
  folhaMotivo?: string;
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

const MESES = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function monthAdd(fromLabel: string, plus: number): string {
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

/** Write-through best-effort: persiste um contrato/reserva sem quebrar a request. */
export async function persistContrato(env: Env, adf: string): Promise<void> {
  const c = _contratos.get(adf);
  if (!c) return;
  try { await upsertContrato(env, c as unknown as { adf: string; [k: string]: unknown }); } catch { /* fail-safe */ }
}

/**
 * Read-through: re-carrega os contratos do Postgres e faz merge no Map deste
 * isolate. O hydrate de boot roda só uma vez, então sem isto uma reserva criada
 * por OUTRO isolate não apareceria aqui. Chamado no início dos endpoints de
 * leitura (e antes de criar, pra sincronizar o contador de adf entre isolates).
 * Best-effort: falha de DB mantém o estado em memória.
 */
export async function refreshContratos(env: Env): Promise<void> {
  try {
    await ensureContratosLoaded(env); // garante schema + seed inicial
    const rows = await loadContratos(env);
    for (const r of rows) _contratos.set(r.adf, r as unknown as ContratoFull);
    // Normaliza a IDENTIDADE DO CONVÊNIO (nome único vindo de CONVENIOS_MOCK, mesmo
    // pra contratos persistidos com o nome antigo) e EXPIRA reservas vencidas
    // (reserva "Aguardando" após a data de expiração vira "Expirado" em todas as telas).
    const hoje = Date.now();
    for (const c of _contratos.values()) {
      const conv = CONVENIOS_MOCK.find((cv) => cv.id === c.convenioId);
      if (conv && c.convenio !== conv.nome) c.convenio = conv.nome;
      if (c.expiracao && /aguard/i.test(c.situacao)) {
        const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(c.expiracao);
        if (m) {
          const exp = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]) + 1).getTime(); // fim do dia de expiração
          if (exp < hoje) c.situacao = "Expirado";
        }
      }
    }
  } catch { /* fail-safe: segue com o Map em memória */ }
}

export function listContratos(filters: { convenioId?: string; matricula?: string; situacao?: string[] } = {}): ContratoFull[] {
  return Array.from(_contratos.values()).filter((c) => {
    if (filters.convenioId && c.convenioId !== filters.convenioId) return false;
    if (filters.matricula && c.matricula !== filters.matricula) return false;
    if (filters.situacao && filters.situacao.length > 0) {
      if (!filters.situacao.some((s) => c.situacao.toLowerCase() === s.toLowerCase())) return false;
    }
    return true;
  });
}

export function getContrato(adf: string): ContratoFull | undefined {
  return _contratos.get(adf);
}

/** Marca o status do ADF na folha (chamado pela prefeitura). Fonte única = contrato.
 *  Retorna o contrato atualizado (o chamador persiste via persistContrato). */
export function setContratoFolhaStatus(adf: string, status: "recebida" | "aplicada" | "falha", motivo?: string): ContratoFull | undefined {
  const c = _contratos.get(adf);
  if (!c) return undefined;
  c.folhaStatus = status;
  c.folhaMotivo = motivo;
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
  bancoOrigem?: string;
  contratoOrigem?: string;
  saldoDevedorOrigem?: number;
  ator: string;
}

export function criarContratoOuReserva(input: NovoContratoInput): ContratoFull {
  const adf = nextAdf();
  const expiracao = input.isReserva ? addDaysISO(2) : null;
  const valorLiquido = input.valorFinanciado - input.iof;
  const c: ContratoFull = {
    adf,
    situacao: input.isReserva ? "Aguardando Confirmação do Deferimento" : "Ativo",
    lancamento: new Date().toLocaleDateString("pt-BR"),
    expiracao,
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
    folhaPrimeiroDesconto: monthAdd("Abril/2026", 0),
    folhaUltimoDesconto: monthAdd("Abril/2026", input.parcelas - 1),
    codigoVerba: input.codigoVerba,
    dataContrato: new Date().toLocaleDateString("pt-BR"),
    observacoes: input.observacoes,
    adfVinculada: input.contratoOrigem,
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
  acao: "quitar" | "suspender" | "cancelar" | "alongar" | "alterar" | "confirmar",
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

