// In-process sandbox adapter — uses the same dataset as the MCP server.
// For local dev / tests without external dependencies.

import type { BankAdapter, BankCredentials, BankMargem, BankMatricula, BankSession } from "./bank-adapter.js";

// Tiny mock dataset (a subset matching the MCP server's fixtures).
const MOCK_SERVIDORES = [
  {
    cpf: "00011122233",
    nome: "Ana Carolina Silva",
    matricula: "M-009821",
    idMatricula: "MAT-231401",
    idConvenio: "CONV-001",
    salarioLiquido: 4620.0,
    salarioBruto: 5925.64,
    vinculo: "ESTATUTARIO",
    situacao: "ATIVO",
    estabelecimento: "PREFEITURA DE PALHOCA",
  },
  {
    cpf: "00011122234",
    nome: "Joao da Silva Neves",
    matricula: "M-009822",
    idMatricula: "MAT-231402",
    idConvenio: "CONV-002",
    salarioLiquido: 3820.0,
    salarioBruto: 4897.43,
    vinculo: "ESTATUTARIO",
    situacao: "ATIVO",
    estabelecimento: "PREFEITURA DE FLORIANOPOLIS",
  },
];

export class BankSandboxAdapter implements BankAdapter {
  async authorize(creds: BankCredentials): Promise<BankSession> {
    if (creds.username !== "atlas" || creds.password !== "sandbox") {
      throw new Error("invalid_credentials");
    }
    return {
      token: `sandbox_${Date.now()}`,
      expiresAt: Date.now() + 3600_000,
      banco: creds.banco ?? "SCRED",
    };
  }

  async getMatriculas(_s: BankSession, cpf: string, idConvenio?: string): Promise<BankMatricula[]> {
    const clean = cpf.replace(/\D/g, "");
    return MOCK_SERVIDORES.filter((m) => m.cpf === clean && (!idConvenio || m.idConvenio === idConvenio)).map((m) => ({
      id: m.idMatricula,
      matricula: m.matricula,
      cpf: m.cpf,
      nome: m.nome,
      vinculo: m.vinculo,
      situacaoFuncional: m.situacao,
      salarioLiquido: m.salarioLiquido,
      salarioBruto: m.salarioBruto,
      permiteSolicitarEmprestimo: true,
      estabelecimentoNome: m.estabelecimento,
      idConvenio: m.idConvenio,
    }));
  }

  async getMargens(_s: BankSession, idMatricula: string, competencia: string): Promise<BankMargem[]> {
    const found = MOCK_SERVIDORES.find((m) => m.idMatricula === idMatricula);
    if (!found) throw new Error("matricula_not_found");
    const totalEmp = found.salarioLiquido * 0.35;
    const totalCart = found.salarioLiquido * 0.05;
    const totalBenef = found.salarioLiquido * 0.05;
    const compEmp = totalEmp * 0.22;
    const compCart = totalCart * 0.1;
    return [
      { competencia, tipo: "EMPRESTIMO", disponivel: totalEmp - compEmp, total: totalEmp },
      { competencia, tipo: "CARTAO_CONSIGNADO", disponivel: totalCart - compCart, total: totalCart },
      { competencia, tipo: "CARTAO_BENEFICIOS", disponivel: totalBenef, total: totalBenef },
    ];
  }
}
