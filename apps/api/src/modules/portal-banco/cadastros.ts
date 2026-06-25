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
  { id: "U-116612", bancoId: 1, codigo: "116612", nome: "Bruno Lopes do Nascimento", email: "BRUNOLOPES@DELTAGLOBAL", cpfMasked: "***.***.***-77", organizacao: "46177 - DELTA GLOBAL SOCIEDADE DE CREDITO DIRETO S A", perfil: "admin", ipsPermitidos: [], ativo: true, criadoEm: "2026-01-10" },
  { id: "U-116889", bancoId: 1, codigo: "116889", nome: "Vinicius Costa Nery", email: "44445948888@DELTAGLOBAL", cpfMasked: "***.***.***-88", organizacao: "46177 - DELTA GLOBAL SOCIEDADE DE CREDITO DIRETO S A", perfil: "operador", ipsPermitidos: [], ativo: true, criadoEm: "2026-02-05" },
  { id: "U-116891", bancoId: 1, codigo: "116891", nome: "Lucas Vicente Ohi", email: "34537215860@DELTAGLOBAL", cpfMasked: "***.***.***-60", organizacao: "46177 - DELTA GLOBAL SOCIEDADE DE CREDITO DIRETO S A", perfil: "operador", ipsPermitidos: [], ativo: true, criadoEm: "2026-02-12" },
  { id: "U-118327", bancoId: 1, codigo: "118327", nome: "Camila Alves", email: "CAMILAALVES@DELTAGLOBAL", cpfMasked: "***.***.***-22", organizacao: "46177 - DELTA GLOBAL SOCIEDADE DE CREDITO DIRETO S A", perfil: "consulta", ipsPermitidos: [], ativo: true, criadoEm: "2026-03-01" },
  { id: "U-120258", bancoId: 1, codigo: "120258", nome: "Kaua Nogueira da Cunha", email: "45198007811@DELTAGLOBAL", cpfMasked: "***.***.***-11", organizacao: "46177 - DELTA GLOBAL SOCIEDADE DE CREDITO DIRETO S A", perfil: "relatorios", ipsPermitidos: ["189.45.10.0/24"], ativo: true, criadoEm: "2026-04-20" },
];

let _tblSeq = 100;
let _userSeq = 999000;

export function listTabelas(): TabelaEmprestimo[] {
  return [..._tabelas];
}
export function getTabela(id: string): TabelaEmprestimo | undefined {
  return _tabelas.find((t) => t.id === id);
}
export function upsertTabela(input: Omit<TabelaEmprestimo, "id" | "criadoEm"> & { id?: string }): TabelaEmprestimo {
  if (input.id) {
    const idx = _tabelas.findIndex((t) => t.id === input.id);
    if (idx >= 0) {
      const updated = { ..._tabelas[idx]!, ...input } as TabelaEmprestimo;
      _tabelas[idx] = updated;
      return updated;
    }
  }
  const novo: TabelaEmprestimo = {
    id: `TBL-${String(_tblSeq++).padStart(3, "0")}`,
    criadoEm: new Date().toISOString().slice(0, 10),
    ...input,
  };
  _tabelas.push(novo);
  return novo;
}
export function removerTabela(id: string): boolean {
  const idx = _tabelas.findIndex((t) => t.id === id);
  if (idx < 0) return false;
  _tabelas.splice(idx, 1);
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
export function upsertUsuario(input: Omit<BancoUsuario, "id" | "criadoEm" | "codigo"> & { id?: string }): BancoUsuario {
  if (input.id) {
    const idx = _usuarios.findIndex((u) => u.id === input.id);
    if (idx >= 0) {
      const updated = { ..._usuarios[idx]!, ...input } as BancoUsuario;
      _usuarios[idx] = updated;
      return updated;
    }
  }
  const novo: BancoUsuario = {
    id: `U-${++_userSeq}`,
    codigo: String(_userSeq),
    criadoEm: new Date().toISOString().slice(0, 10),
    ...input,
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
