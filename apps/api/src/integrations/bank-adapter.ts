// Canonical bank adapter interface. Every banco implementation must satisfy this.
// See specs/adrs/0004-bank-integration-pattern.md.

export interface BankSession {
  token: string;
  expiresAt: number;
  banco: string;
}

export interface BankCredentials {
  username: string;
  password: string;
  banco?: string;
}

export interface BankMatricula {
  id: string;
  matricula: string;
  cpf: string;
  nome: string;
  vinculo: string;
  situacaoFuncional: string;
  salarioLiquido: number;
  salarioBruto: number;
  permiteSolicitarEmprestimo: boolean;
  estabelecimentoNome: string;
  idConvenio: string;
}

export interface BankMargem {
  competencia: string;
  tipo: "EMPRESTIMO" | "CARTAO_CONSIGNADO" | "CARTAO_BENEFICIOS";
  disponivel: number;
  total: number;
}

export interface BankAdapter {
  authorize(creds: BankCredentials): Promise<BankSession>;
  getMatriculas(s: BankSession, cpf: string, idConvenio?: string): Promise<BankMatricula[]>;
  getMargens(s: BankSession, idMatricula: string, competencia: string): Promise<BankMargem[]>;
}
