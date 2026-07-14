// Marketplace de portabilidade.
//
// Fluxo:
//  1. Servidor publica intencao (a partir de um contrato ativo que ele tem em um banco).
//     Averbadora ja sabe TODOS os dados do contrato (saldo devedor, parcela, taxa,
//     prefeitura, convenio) — nao precisa o servidor digitar nada. So confirma e publica.
//  2. Averbadora armazena a oportunidade. Bancos concorrentes (todos MENOS o banco
//     origem do contrato) veem a oportunidade em /banco/portabilidade e fazem ofertas.
//  3. Servidor recebe as ofertas e aceita a melhor. Isso vira um contrato REFIN no
//     banco vencedor via /v1/servidores/me/propostas (fluxo existente).
//  4. Averbadora tem visao global de todas as intencoes/ofertas.
//
// Store in-memory + write-through Postgres via loadCollection/upsertCollectionRow.

import type { Env } from "../../env.js";
import { loadCollection, upsertCollectionRow } from "../../db/repos.js";

export interface PortabilidadeOferta {
  id: string;
  bancoDestinoId: number;
  bancoDestinoNome: string;
  /** Taxa a.m. proposta pelo banco destino (decimal, ex.: 0.0155 = 1,55%). */
  taxaAmProposta: number;
  /** Parcela recalculada com a nova taxa mantendo o prazo restante do original. */
  novaParcela: number;
  /** Prazo (em meses) proposto pelo banco destino. Pode ser igual ao original ou menor. */
  novoPrazo: number;
  /** Economia total estimada em R$ (parcela original × prazo − nova parcela × novo prazo). */
  economia: number;
  observacao?: string;
  ofertadaEm: string;
  status: "ativa" | "aceita" | "recusada" | "expirada";
}

export interface PortabilidadeIntencao {
  id: string;                       // PORT-000123
  publicadaEm: string;              // ISO
  expiraEm: string;                 // ISO — 30 dias apos publicacao
  status: "aberta" | "aceita" | "cancelada" | "expirada";
  aceitaOfertaId?: string;

  // Servidor (dados que a averbadora ja tem)
  servidorNome: string;
  servidorMatricula: string;
  servidorCpfMasked: string;
  prefeituraId: number;
  prefeituraNome: string;
  convenioId: string;

  // Contrato origem (pulled from portal-banco store)
  contratoAdfOrigem: string;
  bancoOrigemId: number;
  bancoOrigemNome: string;
  saldoDevedor: number;
  valorParcela: number;
  parcelasRestantes: number;
  totalParcelasOriginal: number;
  taxaAm: number;                   // taxa atual — os bancos concorrentes precisam superar

  ofertas: PortabilidadeOferta[];
}

const _intencoes: PortabilidadeIntencao[] = [];
let _seq = 1;
let _ofSeq = 1;

const COLLECTION = "portabilidade_intencoes";

let _loaded = false;
let _loadPromise: Promise<void> | null = null;

export function ensurePortabilidadesLoaded(env: Env): Promise<void> {
  if (_loaded) return Promise.resolve();
  if (!_loadPromise) {
    _loadPromise = (async () => {
      try {
        const rows = await loadCollection<PortabilidadeIntencao>(env, COLLECTION);
        if (rows.length) {
          _intencoes.length = 0;
          _intencoes.push(...rows);
          const maxIntSeq = rows.reduce((acc, r) => {
            const m = /PORT-(\d+)/.exec(r.id);
            return m ? Math.max(acc, Number(m[1])) : acc;
          }, 0);
          _seq = Math.max(_seq, maxIntSeq + 1);
          const maxOfSeq = rows
            .flatMap((r) => r.ofertas ?? [])
            .reduce((acc, o) => {
              const m = /OFR-(\d+)/.exec(o.id);
              return m ? Math.max(acc, Number(m[1])) : acc;
            }, 0);
          _ofSeq = Math.max(_ofSeq, maxOfSeq + 1);
        }
        _loaded = true;
      } catch { _loaded = true; _loadPromise = null; }
    })();
  }
  return _loadPromise;
}

async function persistIntencao(env: Env, i: PortabilidadeIntencao): Promise<void> {
  try { await upsertCollectionRow(env, COLLECTION, i.id, i); } catch { /* fail-safe */ }
}

export function listIntencoes(): PortabilidadeIntencao[] {
  return [..._intencoes].sort((a, b) => b.publicadaEm.localeCompare(a.publicadaEm));
}

export function getIntencao(id: string): PortabilidadeIntencao | undefined {
  return _intencoes.find((x) => x.id === id);
}

export function listIntencoesAbertasParaBanco(bancoDestinoId: number): PortabilidadeIntencao[] {
  return listIntencoes().filter((i) =>
    i.status === "aberta" && i.bancoOrigemId !== bancoDestinoId,
  );
}

export function listIntencoesDoServidor(matricula: string): PortabilidadeIntencao[] {
  return listIntencoes().filter((i) => i.servidorMatricula === matricula);
}

export async function criarIntencao(
  env: Env,
  input: Omit<PortabilidadeIntencao, "id" | "publicadaEm" | "expiraEm" | "status" | "ofertas">,
): Promise<PortabilidadeIntencao> {
  // Idempotencia soft: se ja tem intencao ABERTA pro mesmo ADF+matricula, retorna a existente.
  const ja = _intencoes.find(
    (i) => i.status === "aberta" &&
      i.contratoAdfOrigem === input.contratoAdfOrigem &&
      i.servidorMatricula === input.servidorMatricula,
  );
  if (ja) return ja;

  const now = new Date();
  const expira = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const novo: PortabilidadeIntencao = {
    id: `PORT-${String(_seq++).padStart(6, "0")}`,
    publicadaEm: now.toISOString(),
    expiraEm: expira.toISOString(),
    status: "aberta",
    ofertas: [],
    ...input,
  };
  _intencoes.push(novo);
  await persistIntencao(env, novo);
  return novo;
}

export async function cancelarIntencao(env: Env, id: string, matricula: string): Promise<PortabilidadeIntencao | undefined> {
  const i = _intencoes.find((x) => x.id === id);
  if (!i) return undefined;
  if (i.servidorMatricula !== matricula) return undefined; // so o dono cancela
  if (i.status !== "aberta") return i; // idempotente
  i.status = "cancelada";
  i.ofertas.forEach((o) => { if (o.status === "ativa") o.status = "expirada"; });
  await persistIntencao(env, i);
  return i;
}

export async function adicionarOferta(
  env: Env,
  intencaoId: string,
  bancoDestinoId: number,
  bancoDestinoNome: string,
  input: { taxaAmProposta: number; novaParcela: number; novoPrazo: number; observacao?: string },
): Promise<{ ok: true; intencao: PortabilidadeIntencao; oferta: PortabilidadeOferta } | { ok: false; motivo: string }> {
  const i = _intencoes.find((x) => x.id === intencaoId);
  if (!i) return { ok: false, motivo: "intencao_nao_encontrada" };
  if (i.status !== "aberta") return { ok: false, motivo: "intencao_nao_aberta" };
  if (i.bancoOrigemId === bancoDestinoId) return { ok: false, motivo: "banco_origem_nao_pode_ofertar" };
  // Um banco so pode ter uma oferta ATIVA por intencao. Substitui se ja existe.
  const previa = i.ofertas.find((o) => o.bancoDestinoId === bancoDestinoId && o.status === "ativa");
  if (previa) previa.status = "expirada";

  const economia = round2(i.valorParcela * i.parcelasRestantes - input.novaParcela * input.novoPrazo);
  const of: PortabilidadeOferta = {
    id: `OFR-${String(_ofSeq++).padStart(6, "0")}`,
    bancoDestinoId, bancoDestinoNome,
    taxaAmProposta: input.taxaAmProposta,
    novaParcela: round2(input.novaParcela),
    novoPrazo: input.novoPrazo,
    economia,
    observacao: input.observacao,
    ofertadaEm: new Date().toISOString(),
    status: "ativa",
  };
  i.ofertas.push(of);
  await persistIntencao(env, i);
  return { ok: true, intencao: i, oferta: of };
}

export async function aceitarOferta(
  env: Env, intencaoId: string, ofertaId: string, matricula: string,
): Promise<{ ok: true; intencao: PortabilidadeIntencao } | { ok: false; motivo: string }> {
  const i = _intencoes.find((x) => x.id === intencaoId);
  if (!i) return { ok: false, motivo: "intencao_nao_encontrada" };
  if (i.servidorMatricula !== matricula) return { ok: false, motivo: "nao_e_seu" };
  if (i.status !== "aberta") return { ok: false, motivo: "intencao_nao_aberta" };
  const of = i.ofertas.find((o) => o.id === ofertaId && o.status === "ativa");
  if (!of) return { ok: false, motivo: "oferta_nao_encontrada" };
  of.status = "aceita";
  i.ofertas.forEach((o) => { if (o.id !== ofertaId && o.status === "ativa") o.status = "expirada"; });
  i.status = "aceita";
  i.aceitaOfertaId = ofertaId;
  await persistIntencao(env, i);
  return { ok: true, intencao: i };
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
