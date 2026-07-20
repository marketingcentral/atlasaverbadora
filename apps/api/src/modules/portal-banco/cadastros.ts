// In-memory store for cadastros (tabela emprestimos + usuarios do banco).

export interface TabelaEmprestimo {
  id: string;
  convenioId: string;
  convenio: string;
  taxaMinAm: number;
  taxaMaxAm: number;
  prazoMaxMeses: number;
  vigenciaInicio: string;
  vigenciaFim?: string;
  ativo: boolean;
  criadoEm: string;
}

/** Rotulo do preset — apenas label de UI. "personalizado" quando as caixas
 *  nao casam com nenhum preset. Fonte de verdade e sempre `permissoes`. */
export type BancoUsuarioPerfil = "admin" | "operador" | "consulta" | "relatorios" | "personalizado";

/** Presets do banco — pontos de partida pro checkbox matrix. */
export const BANCO_PRESETS: Record<BancoUsuarioPerfil, string[]> = {
  admin: ["*"],
  operador: [
    "visao-geral", "propostas", "emprestimo", "cartao", "portabilidade",
    "ofertas", "margem-contratacao", "carteira", "convenios", "conta",
  ],
  consulta: [
    "visao-geral", "propostas", "emprestimo", "cartao", "portabilidade",
    "carteira", "convenios", "conta",
  ],
  relatorios: [
    "visao-geral", "relatorios", "consignacoes", "gerador", "faturamento",
    "bate-carteira", "conta",
  ],
  personalizado: [],
};

export function detectarBancoPreset(permissoes: string[]): BancoUsuarioPerfil {
  const set = new Set(permissoes);
  for (const [nome, keys] of Object.entries(BANCO_PRESETS) as [BancoUsuarioPerfil, string[]][]) {
    if (nome === "personalizado") continue;
    if (keys.length !== set.size) continue;
    if (keys.every((k) => set.has(k))) return nome;
  }
  return "personalizado";
}

export interface BancoUsuario {
  id: string;
  bancoId: number;
  codigo: string;
  nome: string;
  email: string;
  /** 11-digit CPF without punctuation. Never sent in list responses — fetched per-row via reveal endpoint. */
  cpf: string;
  cpfMasked: string;
  organizacao: string;
  /** Label de UI. Fonte de verdade e `permissoes`. */
  perfil: BancoUsuarioPerfil;
  /** Fonte de verdade da autorizacao. "*" = wildcard (admin). */
  permissoes: string[];
  ipsPermitidos: string[];
  ativo: boolean;
  criadoEm: string;
}

// Seeds hardcoded (TBL-001 CASTRO/DELTA GLOBAL, TBL-002 FLORIPA/DELTA GLOBAL)
// removidos 20/07/2026 — apareciam pra qualquer banco que herdasse a mesma
// bancoId. Tabelas novas entram via UI (POST /portal/banco/cadastros/tabela-emprestimos).
const _tabelas: TabelaEmprestimo[] = [];

// Cliente pediu (20/07/2026) remocao dos seeds hardcoded — 5 usuarios da
// "DELTA GLOBAL" (fictícia) apareciam pra qualquer banco que herdasse bancoId=1
// (regra: novo cadastro nao herda dados de entidade deletada). Usuarios novos
// entram via UI (POST /portal/banco/cadastros/usuarios).
const _usuarios: BancoUsuario[] = [];

/** Migra usuarios existentes sem permissoes[] — deriva do perfil. Idempotente. */
function ensureBancoUsuarioPermissoes(u: BancoUsuario): void {
  if (Array.isArray(u.permissoes) && u.permissoes.length > 0) return;
  const preset = BANCO_PRESETS[u.perfil];
  u.permissoes = preset ? [...preset] : [];
}

/** Helpers para padrao mask/cpf consistente */
function maskCpf(cpf11: string): string {
  if (cpf11.length !== 11) return "***.***.***-**";
  return `***.***.***-${cpf11.slice(-2)}`;
}

let _tblSeq = 100;
let _userSeq = 999000;

// Sincronizacao com Postgres: no primeiro acesso apos boot do isolate,
// carregamos as tabelas persistidas. Se o DB estiver vazio, seed inicial.
// Mutacoes fazem write-through (memoria + DB) pra sobreviver a redeploys
// e serem visiveis por outros isolates. Se o DB estiver indisponivel, cai
// pro comportamento in-memory (nao quebra a demo).
import type { Env } from "../../env.js";
import { ensureSchema, loadTabelas, upsertTabelaRow, seedTabelasIfEmpty } from "../../db/repos.js";

let _tabelasHydrated = false;
let _hydrationPromise: Promise<void> | null = null;

async function hydrateTabelas(env: Env): Promise<void> {
  if (_tabelasHydrated) return;
  if (!_hydrationPromise) {
    _hydrationPromise = (async () => {
      try {
        await ensureSchema(env);
        await seedTabelasIfEmpty(env, _tabelas as unknown as { id: string; [k: string]: unknown }[]);
        const rows = await loadTabelas(env);
        if (rows.length > 0) {
          _tabelas.length = 0;
          _tabelas.push(...(rows as unknown as TabelaEmprestimo[]));
          // Alinha o seq com o maior sufixo numerico existente pra evitar colisao.
          const maxSeq = rows.reduce((acc, r) => {
            const m = /TBL-(\d+)/.exec(r.id);
            return m ? Math.max(acc, Number(m[1])) : acc;
          }, 100);
          _tblSeq = Math.max(_tblSeq, maxSeq + 1);
        }
        _tabelasHydrated = true;
      } catch {
        // Sem DB configurado — segue in-memory (comportamento legado).
        _tabelasHydrated = true;
      }
    })();
  }
  return _hydrationPromise;
}

export async function listTabelas(env: Env): Promise<TabelaEmprestimo[]> {
  await hydrateTabelas(env);
  return [..._tabelas];
}
export async function getTabela(env: Env, id: string): Promise<TabelaEmprestimo | undefined> {
  await hydrateTabelas(env);
  return _tabelas.find((t) => t.id === id);
}
export async function upsertTabela(env: Env, input: Omit<TabelaEmprestimo, "id" | "criadoEm"> & { id?: string }): Promise<TabelaEmprestimo> {
  await hydrateTabelas(env);
  let saved: TabelaEmprestimo;
  if (input.id) {
    const idx = _tabelas.findIndex((t) => t.id === input.id);
    if (idx >= 0) {
      saved = { ..._tabelas[idx]!, ...input } as TabelaEmprestimo;
      _tabelas[idx] = saved;
      await upsertTabelaRow(env, saved as unknown as { id: string; [k: string]: unknown }).catch(() => undefined);
      return saved;
    }
  }
  saved = {
    id: `TBL-${String(_tblSeq++).padStart(3, "0")}`,
    criadoEm: new Date().toISOString().slice(0, 10),
    ...input,
  };
  _tabelas.push(saved);
  await upsertTabelaRow(env, saved as unknown as { id: string; [k: string]: unknown }).catch(() => undefined);
  return saved;
}
/** Nunca apaga — DESATIVA (ativo=false), persistindo o novo estado. */
export async function removerTabela(env: Env, id: string): Promise<boolean> {
  await hydrateTabelas(env);
  const t = _tabelas.find((x) => x.id === id);
  if (!t) return false;
  t.ativo = false;
  await upsertTabelaRow(env, t as unknown as { id: string; [k: string]: unknown }).catch(() => undefined);
  return true;
}
/** Reativa (ativo=true), reversivel do soft-delete. */
export async function reativarTabela(env: Env, id: string): Promise<boolean> {
  await hydrateTabelas(env);
  const t = _tabelas.find((x) => x.id === id);
  if (!t) return false;
  t.ativo = true;
  await upsertTabelaRow(env, t as unknown as { id: string; [k: string]: unknown }).catch(() => undefined);
  return true;
}

export function listUsuarios(opts: { perfil?: BancoUsuario["perfil"]; somenteAdmin?: boolean } = {}): BancoUsuario[] {
  return _usuarios.filter((u) => {
    if (opts.perfil && u.perfil !== opts.perfil) return false;
    if (opts.somenteAdmin && u.perfil !== "admin") return false;
    return true;
  });
}
export function getUsuario(id: string): BancoUsuario | undefined {
  return _usuarios.find((u) => u.id === id);
}
type UsuarioUpsert = Omit<BancoUsuario, "id" | "criadoEm" | "codigo" | "cpf" | "cpfMasked" | "perfil" | "permissoes"> & {
  id?: string;
  cpf?: string;
  cpfMasked?: string;
  /** Preset escolhido (label). Opcional — deriva de permissoes se ausente. */
  perfil?: BancoUsuarioPerfil;
  /** Fonte de verdade da autorizacao. Opcional — deriva do preset se ausente. */
  permissoes?: string[];
};

export function upsertUsuario(input: UsuarioUpsert): BancoUsuario {
  const cpf = (input.cpf ?? "").replace(/\D/g, "");
  const cpfMasked = cpf.length === 11 ? maskCpf(cpf) : input.cpfMasked ?? "***.***.***-**";
  // Resolve permissoes: se veio explicito, usa; senao deriva do preset; senao "operador".
  const permissoes = Array.isArray(input.permissoes)
    ? [...input.permissoes]
    : input.perfil && BANCO_PRESETS[input.perfil]
      ? [...BANCO_PRESETS[input.perfil]]
      : [...BANCO_PRESETS.operador];
  const perfilResolvido: BancoUsuarioPerfil = input.perfil ?? detectarBancoPreset(permissoes);
  const normalized = { ...input, cpf, cpfMasked, perfil: perfilResolvido, permissoes };
  if (input.id) {
    const idx = _usuarios.findIndex((u) => u.id === input.id);
    if (idx >= 0) {
      const updated = { ..._usuarios[idx]!, ...normalized } as BancoUsuario;
      // Preserva CPF anterior se nenhum novo foi enviado
      if (!cpf) updated.cpf = _usuarios[idx]!.cpf;
      _usuarios[idx] = updated;
      return updated;
    }
  }
  const novo: BancoUsuario = {
    id: `U-${++_userSeq}`,
    codigo: String(_userSeq),
    criadoEm: new Date().toISOString().slice(0, 10),
    ...normalized,
  };
  _usuarios.push(novo);
  return novo;
}
/** Nunca apaga — DESATIVA (ativo=false). */
export function removerUsuario(id: string): boolean {
  const u = _usuarios.find((x) => x.id === id);
  if (!u) return false;
  u.ativo = false;
  return true;
}
/** Reativa usuario (ativo=true). */
export function reativarUsuario(id: string): boolean {
  const u = _usuarios.find((x) => x.id === id);
  if (!u) return false;
  u.ativo = true;
  return true;
}
