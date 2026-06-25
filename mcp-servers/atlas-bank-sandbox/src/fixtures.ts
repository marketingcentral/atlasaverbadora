// Deterministic mock data for the Atlas bank sandbox.
// Seed = 42. Same data every boot so tests are reproducible.

export const SEED = 42;

let _rngState = SEED;
function rng(): number {
  // Mulberry32 PRNG — fast, good distribution, deterministic.
  _rngState |= 0;
  _rngState = (_rngState + 0x6d2b79f5) | 0;
  let t = _rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function randInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// Reset RNG so module loads are deterministic.
_rngState = SEED;

export interface Convenio {
  id: string;
  nome: string;
  prefeitura: string;
  uf: string;
}

export interface Banco {
  id: string;
  nome: string;
  taxaMinAm: number;
  taxaMaxAm: number;
  prazoMin: number;
  prazoMax: number;
  prefeiturasAceitas: string[];
}

export interface Matricula {
  id: string;
  matricula: string;
  cpf: string;
  nome: string;
  vinculoEmpregaticio: "CLT" | "ESTATUTARIO" | "COMISSIONADO";
  dataAdmissao: string;
  dataNascimento: string;
  salarioLiquido: number;
  salarioBruto: number;
  situacaoFuncional: {
    descricao: "ATIVO" | "FERIAS" | "AFASTADO" | "LICENCA" | "APOSENTADO";
    reocorrendo: boolean;
    permiteSolicitarEmprestim: boolean;
    permiteSolicitarRefinanciamento: boolean;
    permiteSolicitarPortabilidade: boolean;
    permiteSolicitarOutrosConsignacoes: boolean;
  };
  estabelecimento: { id: string; nome: string; documento: string };
  secretaria: { cnpj: string; descricao: string };
  lotacao: { cnpj: string; descricao: string };
  idConvenio: string;
}

export interface Margem {
  competencia: string;
  valorMargemDisponivel: number;
  valorMargemTotal: number;
  valorTotalSolicitacoesCartaoAtivos: number;
  saldoDisponivelCartao: number;
  valorAcedenteSolicitacoesCartaoAtivos: number;
  valorPermitidoNovasSolicitacoesCartao: number;
  tipoMargem: {
    tipo: "EMPRESTIMO" | "CARTAO_CONSIGNADO" | "CARTAO_BENEFICIOS";
    descricao: string;
  };
}

export const CONVENIOS: Convenio[] = [
  { id: "CONV-001", nome: "Convenio Palhoca SC", prefeitura: "Palhoca", uf: "SC" },
  { id: "CONV-002", nome: "Convenio Florianopolis SC", prefeitura: "Florianopolis", uf: "SC" },
  { id: "CONV-003", nome: "Convenio Joinville SC", prefeitura: "Joinville", uf: "SC" },
];

export const BANCOS: Banco[] = [
  { id: "BANK-Y", nome: "Banco Y", taxaMinAm: 0.0151, taxaMaxAm: 0.0199, prazoMin: 12, prazoMax: 96, prefeiturasAceitas: ["Palhoca", "Florianopolis"] },
  { id: "BANK-X", nome: "Banco X", taxaMinAm: 0.0172, taxaMaxAm: 0.0220, prazoMin: 12, prazoMax: 84, prefeiturasAceitas: ["Palhoca", "Joinville"] },
  { id: "SCRED", nome: "SCred Financeira", taxaMinAm: 0.0151, taxaMaxAm: 0.0230, prazoMin: 12, prazoMax: 96, prefeiturasAceitas: ["Palhoca", "Florianopolis", "Joinville"] },
  { id: "BMG", nome: "Banco BMG", taxaMinAm: 0.0179, taxaMaxAm: 0.0245, prazoMin: 24, prazoMax: 96, prefeiturasAceitas: ["Florianopolis"] },
  { id: "PAN", nome: "Pan Credito", taxaMinAm: 0.0189, taxaMaxAm: 0.0260, prazoMin: 12, prazoMax: 72, prefeiturasAceitas: ["Palhoca", "Joinville"] },
];

const NOMES = ["Ana Carolina Silva", "Joao da Silva Neves", "Maria Fernanda Costa", "Pedro Henrique Souza", "Beatriz Almeida", "Carlos Eduardo Lima", "Juliana Pereira", "Rafael Mendes", "Larissa Rocha", "Bruno Cardoso"];
const VINCULOS: ("CLT" | "ESTATUTARIO" | "COMISSIONADO")[] = ["ESTATUTARIO", "ESTATUTARIO", "ESTATUTARIO", "CLT", "COMISSIONADO"];
const SECRETARIAS = ["Secretaria de Educacao", "Secretaria de Saude", "Secretaria de Obras", "Secretaria de Administracao", "Secretaria de Cultura"];

function generateMatriculas(): Matricula[] {
  // 50 servidores spread across 3 convenios.
  const list: Matricula[] = [];
  for (let i = 0; i < 50; i++) {
    const conv = CONVENIOS[i % CONVENIOS.length]!;
    const salarioBruto = randInt(2500, 12000);
    const salarioLiq = Math.round(salarioBruto * 0.78 * 100) / 100;
    const cpfNum = (10011122233 + i).toString().padStart(11, "0");
    list.push({
      id: `MAT-${(231401 + i).toString()}`,
      matricula: `M-${(9821 + i).toString().padStart(6, "0")}`,
      cpf: cpfNum,
      nome: NOMES[i % NOMES.length]!,
      vinculoEmpregaticio: pick(VINCULOS),
      dataAdmissao: `20${randInt(15, 23)}-0${randInt(1, 9)}-${randInt(10, 28)}`,
      dataNascimento: `19${randInt(60, 99)}-0${randInt(1, 9)}-${randInt(10, 28)}`,
      salarioLiquido: salarioLiq,
      salarioBruto,
      situacaoFuncional: {
        descricao: pick(["ATIVO", "ATIVO", "ATIVO", "ATIVO", "FERIAS"] as const),
        reocorrendo: rng() > 0.95,
        permiteSolicitarEmprestim: rng() > 0.1,
        permiteSolicitarRefinanciamento: rng() > 0.2,
        permiteSolicitarPortabilidade: rng() > 0.2,
        permiteSolicitarOutrosConsignacoes: rng() > 0.3,
      },
      estabelecimento: { id: `EST-${i}`, nome: `PREFEITURA DE ${conv.prefeitura.toUpperCase()}`, documento: `${randInt(10000000, 99999999)}` },
      secretaria: { cnpj: `${randInt(10000000000000, 99999999999999)}`, descricao: pick(SECRETARIAS) },
      lotacao: { cnpj: `${randInt(10000000000000, 99999999999999)}`, descricao: "Departamento de Recursos Humanos" },
      idConvenio: conv.id,
    });
  }
  return list;
}

export const MATRICULAS: Matricula[] = generateMatriculas();

export function getMargensFor(matricula: Matricula, competencia: string): Margem[] {
  const totalEmprestimo = Math.round(matricula.salarioLiquido * 0.35 * 100) / 100;
  const usadoEmprestimo = Math.round(totalEmprestimo * (rng() * 0.6) * 100) / 100;
  const totalCartao = Math.round(matricula.salarioLiquido * 0.05 * 100) / 100;
  const usadoCartao = Math.round(totalCartao * (rng() * 0.7) * 100) / 100;
  const totalBenef = Math.round(matricula.salarioLiquido * 0.05 * 100) / 100;
  const usadoBenef = Math.round(totalBenef * (rng() * 0.5) * 100) / 100;
  return [
    {
      competencia,
      valorMargemDisponivel: totalEmprestimo - usadoEmprestimo,
      valorMargemTotal: totalEmprestimo,
      valorTotalSolicitacoesCartaoAtivos: 0,
      saldoDisponivelCartao: 0,
      valorAcedenteSolicitacoesCartaoAtivos: 0,
      valorPermitidoNovasSolicitacoesCartao: 0,
      tipoMargem: { tipo: "EMPRESTIMO", descricao: "Emprestimo" },
    },
    {
      competencia,
      valorMargemDisponivel: totalCartao - usadoCartao,
      valorMargemTotal: totalCartao,
      valorTotalSolicitacoesCartaoAtivos: usadoCartao,
      saldoDisponivelCartao: totalCartao - usadoCartao,
      valorAcedenteSolicitacoesCartaoAtivos: 0,
      valorPermitidoNovasSolicitacoesCartao: totalCartao - usadoCartao,
      tipoMargem: { tipo: "CARTAO_CONSIGNADO", descricao: "Cartao consignado" },
    },
    {
      competencia,
      valorMargemDisponivel: totalBenef - usadoBenef,
      valorMargemTotal: totalBenef,
      valorTotalSolicitacoesCartaoAtivos: usadoBenef,
      saldoDisponivelCartao: totalBenef - usadoBenef,
      valorAcedenteSolicitacoesCartaoAtivos: 0,
      valorPermitidoNovasSolicitacoesCartao: totalBenef - usadoBenef,
      tipoMargem: { tipo: "CARTAO_BENEFICIOS", descricao: "Cartao beneficios" },
    },
  ];
}

export function findMatriculaByCpf(cpf: string, idConvenio?: string): Matricula[] {
  const clean = cpf.replace(/\D/g, "");
  return MATRICULAS.filter((m) => m.cpf === clean && (!idConvenio || m.idConvenio === idConvenio));
}

export function findMatriculaById(idMatricula: string): Matricula | undefined {
  return MATRICULAS.find((m) => m.id === idMatricula);
}

const TOKENS = new Map<string, { exp: number; banco: string }>();

export function issueToken(banco: string): { token: string; expiresIn: number } {
  const token = `mock_${banco}_${Date.now()}_${Math.floor(rng() * 1e6)}`;
  const expiresIn = 3600;
  TOKENS.set(token, { exp: Date.now() + expiresIn * 1000, banco });
  return { token, expiresIn };
}

export function verifyToken(token: string): { banco: string } | null {
  const entry = TOKENS.get(token);
  if (!entry) return null;
  if (entry.exp < Date.now()) {
    TOKENS.delete(token);
    return null;
  }
  return { banco: entry.banco };
}

let _adfCounter = 1;
export function nextAdf(): string {
  return `ADF-${String(_adfCounter++).padStart(8, "0")}`;
}
