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

// Counters POR BANCO. Antes eram globais — banco A cria usuarios U-999001..
// U-999040, banco B recem-criado ja saia U-999041 (mesma classe do bug de
// prefeitura). Agora cada banco tem seus seqs isolados: TBL-{bancoId}-{seq} e
// U-{bancoId}-{seq}. IDs legacy sao considerados na base do seq quando o max
// bater. Cliente pediu 22/07/2026.
const _tblSeqPorBanco: Map<number, number> = new Map();
const _userSeqPorBanco: Map<number, number> = new Map();
function nextTblId(bancoId: number): string {
  const maxExistente = _tabelas.reduce((acc, t) => {
    // Filtro por bancoId derivado do convenio (bancoId do t.convenioId no
    // CONVENIOS_MOCK — nao acessivel aqui sem circular import; usamos so o
    // sufixo numerico da propria pref). Alternativa: consultar o campo se
    // o schema tiver bancoId direto (nao tem). Vamos com o max simples do
    // banco atraves do prefixo TBL-{bancoId}-.
    const m1 = new RegExp(`^TBL-${bancoId}-(\\d+)$`).exec(t.id);
    if (m1) return Math.max(acc, Number(m1[1]));
    return acc;
  }, 100);
  const cur = _tblSeqPorBanco.get(bancoId) ?? 100;
  const seq = Math.max(cur, maxExistente) + 1;
  _tblSeqPorBanco.set(bancoId, seq);
  return `TBL-${bancoId}-${String(seq).padStart(3, "0")}`;
}
function nextUserId(bancoId: number): { id: string; codigo: string } {
  const maxExistente = _usuarios.reduce((acc, u) => {
    if (u.bancoId !== bancoId) return acc;
    const m = new RegExp(`^U-${bancoId}-(\\d+)$`).exec(u.id);
    if (m) return Math.max(acc, Number(m[1]));
    return acc;
  }, 0);
  const cur = _userSeqPorBanco.get(bancoId) ?? 0;
  const seq = Math.max(cur, maxExistente) + 1;
  _userSeqPorBanco.set(bancoId, seq);
  const seqStr = String(seq).padStart(3, "0");
  return { id: `U-${bancoId}-${seqStr}`, codigo: `${bancoId}${seqStr}` };
}

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
        }
        // Seqs por-banco recalculam sob demanda em nextTblId — nada a fazer.
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
export async function upsertTabela(env: Env, input: Omit<TabelaEmprestimo, "id" | "criadoEm"> & { id?: string }, bancoId: number): Promise<TabelaEmprestimo> {
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
    id: nextTblId(bancoId),
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
  const gen = nextUserId(input.bancoId);
  const novo: BancoUsuario = {
    id: gen.id,
    codigo: gen.codigo,
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

// ============================================================
// Presets CUSTOMIZADOS nomeados por banco. Cliente pediu 22/07/2026:
// ao criar usuario com config PERSONALIZADA, o admin do banco nomeia
// a config e ela vira preset reutilizavel no dropdown. Isolado por
// bancoId — cada banco enxerga so seus presets.
// ============================================================
export interface BancoPerfilPreset {
  bancoId: number;
  key: string;
  nome: string;
  permissoes: string[];
  criadoEm: string;
}
const _presets: BancoPerfilPreset[] = [];

function slugBancoPreset(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
export function listBancoPresets(bancoId: number): BancoPerfilPreset[] {
  return _presets.filter((p) => p.bancoId === bancoId);
}
export function upsertBancoPreset(input: { bancoId: number; nome: string; permissoes: string[] }, now: string): BancoPerfilPreset {
  const key = slugBancoPreset(input.nome);
  const existing = _presets.find((p) => p.bancoId === input.bancoId && p.key === key);
  if (existing) {
    existing.nome = input.nome.trim();
    existing.permissoes = [...input.permissoes];
    return existing;
  }
  const novo: BancoPerfilPreset = { bancoId: input.bancoId, key, nome: input.nome.trim(), permissoes: [...input.permissoes], criadoEm: now };
  _presets.push(novo);
  return novo;
}
export function hydrateBancoPresets(rows: BancoPerfilPreset[]): void {
  _presets.length = 0;
  _presets.push(...rows);
}
export function exportBancoPresetsRaw(): BancoPerfilPreset[] {
  return [..._presets];
}
