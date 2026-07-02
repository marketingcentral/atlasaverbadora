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
  perfil: "admin" | "operador" | "consulta" | "relatorios";
  ipsPermitidos: string[];
  ativo: boolean;
  criadoEm: string;
}

const _tabelas: TabelaEmprestimo[] = [
  {
    id: "TBL-001",
    convenioId: "CONV-001",
    convenio: "CASTRO / DELTA GLOBAL",
    taxaMinAm: 0.0151,
    taxaMaxAm: 0.0199,
    prazoMaxMeses: 120,
    vigenciaInicio: "2026-03-18",
    ativo: true,
    criadoEm: "2026-03-18",
  },
  {
    id: "TBL-002",
    convenioId: "CONV-002",
    convenio: "FLORIPA / DELTA GLOBAL",
    taxaMinAm: 0.0165,
    taxaMaxAm: 0.0210,
    prazoMaxMeses: 96,
    vigenciaInicio: "2026-04-01",
    ativo: true,
    criadoEm: "2026-04-01",
  },
];

const _usuarios: BancoUsuario[] = [
  { id: "U-116612", bancoId: 1, codigo: "116612", nome: "Bruno Lopes do Nascimento", email: "BRUNOLOPES@DELTAGLOBAL", cpf: "12345678977", cpfMasked: "***.***.***-77", organizacao: "46177 - DELTA GLOBAL SOCIEDADE DE CREDITO DIRETO S A", perfil: "admin", ipsPermitidos: [], ativo: true, criadoEm: "2026-01-10" },
  { id: "U-116889", bancoId: 1, codigo: "116889", nome: "Vinicius Costa Nery", email: "44445948888@DELTAGLOBAL", cpf: "44445948888", cpfMasked: "***.***.***-88", organizacao: "46177 - DELTA GLOBAL SOCIEDADE DE CREDITO DIRETO S A", perfil: "operador", ipsPermitidos: [], ativo: true, criadoEm: "2026-02-05" },
  { id: "U-116891", bancoId: 1, codigo: "116891", nome: "Lucas Vicente Ohi", email: "34537215860@DELTAGLOBAL", cpf: "34537215860", cpfMasked: "***.***.***-60", organizacao: "46177 - DELTA GLOBAL SOCIEDADE DE CREDITO DIRETO S A", perfil: "operador", ipsPermitidos: [], ativo: true, criadoEm: "2026-02-12" },
  { id: "U-118327", bancoId: 1, codigo: "118327", nome: "Camila Alves", email: "CAMILAALVES@DELTAGLOBAL", cpf: "55566677722", cpfMasked: "***.***.***-22", organizacao: "46177 - DELTA GLOBAL SOCIEDADE DE CREDITO DIRETO S A", perfil: "consulta", ipsPermitidos: [], ativo: true, criadoEm: "2026-03-01" },
  { id: "U-120258", bancoId: 1, codigo: "120258", nome: "Kaua Nogueira da Cunha", email: "45198007811@DELTAGLOBAL", cpf: "45198007811", cpfMasked: "***.***.***-11", organizacao: "46177 - DELTA GLOBAL SOCIEDADE DE CREDITO DIRETO S A", perfil: "relatorios", ipsPermitidos: ["189.45.10.0/24"], ativo: true, criadoEm: "2026-04-20" },
];

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
import { ensureSchema, loadTabelas, upsertTabelaRow, deleteTabelaRow, seedTabelasIfEmpty } from "../../db/repos.js";

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
export async function removerTabela(env: Env, id: string): Promise<boolean> {
  await hydrateTabelas(env);
  const idx = _tabelas.findIndex((t) => t.id === id);
  if (idx < 0) return false;
  _tabelas.splice(idx, 1);
  await deleteTabelaRow(env, id).catch(() => undefined);
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
type UsuarioUpsert = Omit<BancoUsuario, "id" | "criadoEm" | "codigo" | "cpf" | "cpfMasked"> & {
  id?: string;
  cpf?: string;
  cpfMasked?: string;
};

export function upsertUsuario(input: UsuarioUpsert): BancoUsuario {
  const cpf = (input.cpf ?? "").replace(/\D/g, "");
  const cpfMasked = cpf.length === 11 ? maskCpf(cpf) : input.cpfMasked ?? "***.***.***-**";
  const normalized = { ...input, cpf, cpfMasked };
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
export function removerUsuario(id: string): boolean {
  const idx = _usuarios.findIndex((u) => u.id === id);
  if (idx < 0) return false;
  _usuarios.splice(idx, 1);
  return true;
}
