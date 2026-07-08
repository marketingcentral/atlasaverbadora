// Ofertas ativas de credito do banco — o banco cria, servidores recebem no sino.
// Persistidas em admin_ofertas (jsonb). Match por criterios do perfil da matricula
// ativa do servidor: convenios, vinculos, situacaoFuncional, prefeitura, salario, idade.
//
// Nao existe hard-delete: pausar/reativar via campo `ativo`.

import type { Env } from "../../env.js";
import { loadCollection, upsertCollectionRow } from "../../db/repos.js";

export interface OfertaFiltro {
  /** IDs de convenios do banco (ex.: ["CONV-001","CONV-003"]). Vazio = qualquer. */
  convenioIds?: string[];
  /** Vinculos aceitos (ex.: CLT, ESTATUTARIO). Vazio = qualquer. */
  vinculos?: string[];
  /** Situacoes funcionais aceitas (ex.: ATIVO, TRABALHANDO). Vazio = qualquer. */
  situacaoFuncional?: string[];
  /** IDs de prefeituras (ex.: [1,2]). Vazio = qualquer. */
  prefeituraIds?: number[];
  salarioMin?: number;
  salarioMax?: number;
  idadeMin?: number;
  idadeMax?: number;
}

export interface Oferta {
  id: string;
  bancoId: number;
  titulo: string;
  mensagem: string;
  /** Taxa mensal em % (ex.: 1.79). */
  taxaAm: number;
  parcelasMax: number;
  valorMax: number;
  filtro: OfertaFiltro;
  ativo: boolean;
  criadoEm: string;
  /** ISO opcional — apos essa data a oferta para de aparecer no sino. */
  expiraEm?: string;
  /** Usuario averbadora/banco que criou (JWT sub). */
  criadoPor: string;
  /** Emoji tematico (ex.: "🔥" pra promocao, "🏠" pra habitacional, "🎓" pra
   *  educacional). Opcional — o card no app do servidor mostra o icone antes
   *  do titulo. Frontend limita o picker a um catalogo curado; backend aceita
   *  qualquer string curta pra nao brigar com escolhas futuras. */
  icone?: string;
}

const TABLE = "admin_ofertas";
const CACHE: { list: Oferta[]; loaded: boolean } = { list: [], loaded: false };

export async function loadOfertas(env: Env): Promise<Oferta[]> {
  if (CACHE.loaded) return CACHE.list;
  const rows = await loadCollection<Oferta>(env, TABLE).catch(() => []);
  CACHE.list = rows;
  CACHE.loaded = true;
  return CACHE.list;
}

export async function refreshOfertas(env: Env): Promise<Oferta[]> {
  const rows = await loadCollection<Oferta>(env, TABLE).catch(() => CACHE.list);
  CACHE.list = rows;
  CACHE.loaded = true;
  return CACHE.list;
}

export async function persistOferta(env: Env, o: Oferta): Promise<void> {
  try { await upsertCollectionRow(env, TABLE, o.id, o); } catch { /* fail-safe */ }
  const i = CACHE.list.findIndex((x) => x.id === o.id);
  if (i >= 0) CACHE.list[i] = o; else CACHE.list.push(o);
}

/** Proximo id sequencial: OFT-B{bancoId}-N. Nao usa Date.now/random (indeterminismo). */
export function nextOfertaId(bancoId: number): string {
  const doBanco = CACHE.list.filter((o) => o.bancoId === bancoId);
  const maxN = doBanco.reduce((m, o) => {
    const n = Number(o.id.split("-").pop());
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `OFT-B${bancoId}-${maxN + 1}`;
}

/** Servidor "casa" com a oferta? — compara perfil da matricula ativa com o filtro. */
export interface PerfilServidorParaOferta {
  idConvenio?: string;
  vinculo?: string;
  situacaoFuncional?: string;
  prefeituraId?: number;
  salarioLiquido?: number;
  idade?: number;
}
export function ofertaCasaComServidor(o: Oferta, p: PerfilServidorParaOferta, now: Date = new Date()): boolean {
  if (!o.ativo) return false;
  if (o.expiraEm && new Date(o.expiraEm).getTime() < now.getTime()) return false;
  const f = o.filtro;
  if (f.convenioIds?.length && (!p.idConvenio || !f.convenioIds.includes(p.idConvenio))) return false;
  if (f.vinculos?.length && (!p.vinculo || !f.vinculos.includes(p.vinculo))) return false;
  if (f.situacaoFuncional?.length && (!p.situacaoFuncional || !f.situacaoFuncional.includes(p.situacaoFuncional))) return false;
  if (f.prefeituraIds?.length && (p.prefeituraId == null || !f.prefeituraIds.includes(p.prefeituraId))) return false;
  if (f.salarioMin != null && (p.salarioLiquido == null || p.salarioLiquido < f.salarioMin)) return false;
  if (f.salarioMax != null && (p.salarioLiquido == null || p.salarioLiquido > f.salarioMax)) return false;
  if (f.idadeMin != null && (p.idade == null || p.idade < f.idadeMin)) return false;
  if (f.idadeMax != null && (p.idade == null || p.idade > f.idadeMax)) return false;
  return true;
}
