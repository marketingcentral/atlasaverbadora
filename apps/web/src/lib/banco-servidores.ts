// Base de servidores visivel para o banco.
//
// Contexto de negocio: o banco NAO e dono da base — a prefeitura envia
// e a averbadora consolida. O banco consulta em modo read-only: pra
// prospectar operacoes novas, validar dados de KYC e cruzar contratos
// da carteira com a folha da prefeitura. CPF sai mascarado.
//
// Mockup local (self-contained), no mesmo padrao de banco-carteira.ts.
// O escopo respeita `getBancoConvenios()` — o banco so ve servidores
// nos convenios que ele opera.

import { getBancoConvenios } from "./banco-propostas";
import { getCarteira } from "./banco-carteira";

export type ServidorVinculo = "ESTATUTARIO" | "CLT" | "COMISSIONADO" | "APOSENTADO" | "PENSIONISTA";
export type ServidorSituacao = "TRABALHANDO" | "AFASTADO" | "APOSENTADO" | "DESLIGADO";

export interface BancoServidorRow {
  matricula: string;
  cpfMasked: string;
  nome: string;
  convenio: string;
  cargo: string;
  vinculo: ServidorVinculo;
  situacao: ServidorSituacao;
  salarioLiquido: number;
  margemDisponivel: number;
  temContratoConosco: boolean;
  contratosAtivos: number;
}

const SEED: Omit<BancoServidorRow, "temContratoConosco" | "contratosAtivos">[] = [
  { matricula: "PALH-88213", cpfMasked: "***.412.905-**", nome: "Maria Aparecida Ramos", convenio: "Prefeitura de Palhoça", cargo: "Professora II", vinculo: "ESTATUTARIO", situacao: "TRABALHANDO", salarioLiquido: 5820.4, margemDisponivel: 1746.12 },
  { matricula: "PALH-40012", cpfMasked: "***.115.902-**", nome: "Antônio Marcos Ferreira", convenio: "Prefeitura de Palhoça", cargo: "Agente de Trânsito", vinculo: "ESTATUTARIO", situacao: "TRABALHANDO", salarioLiquido: 4210.0, margemDisponivel: 380.5 },
  { matricula: "PALH-51002", cpfMasked: "***.301.774-**", nome: "Sônia Maria Batista", convenio: "Prefeitura de Palhoça", cargo: "Auxiliar Administrativa", vinculo: "ESTATUTARIO", situacao: "TRABALHANDO", salarioLiquido: 3980.0, margemDisponivel: 0 },
  { matricula: "PALH-77451", cpfMasked: "***.998.221-**", nome: "Rodrigo Almeida Souza", convenio: "Prefeitura de Palhoça", cargo: "Fiscal Municipal", vinculo: "COMISSIONADO", situacao: "TRABALHANDO", salarioLiquido: 7120.0, margemDisponivel: 2136.0 },
  { matricula: "PALH-32109", cpfMasked: "***.550.443-**", nome: "Ana Carolina Lima", convenio: "Prefeitura de Palhoça", cargo: "Enfermeira", vinculo: "ESTATUTARIO", situacao: "AFASTADO", salarioLiquido: 6540.0, margemDisponivel: 1962.0 },
  { matricula: "PALH-90810", cpfMasked: "***.221.336-**", nome: "Carla Regina Menezes", convenio: "Prefeitura de Palhoça", cargo: "Assistente Social", vinculo: "ESTATUTARIO", situacao: "APOSENTADO", salarioLiquido: 4800.0, margemDisponivel: 1440.0 },

  { matricula: "BIG-22811", cpfMasked: "***.882.190-**", nome: "Paulo Henrique Costa", convenio: "Prefeitura de Biguaçu", cargo: "Motorista", vinculo: "CLT", situacao: "TRABALHANDO", salarioLiquido: 3450.0, margemDisponivel: 862.5 },
  { matricula: "BIG-30044", cpfMasked: "***.109.766-**", nome: "Fernanda Vieira Machado", convenio: "Prefeitura de Biguaçu", cargo: "Coordenadora Pedagógica", vinculo: "ESTATUTARIO", situacao: "TRABALHANDO", salarioLiquido: 6820.0, margemDisponivel: 2046.0 },
  { matricula: "BIG-51123", cpfMasked: "***.640.882-**", nome: "Roberto Silva Andrade", convenio: "Prefeitura de Biguaçu", cargo: "Guarda Municipal", vinculo: "ESTATUTARIO", situacao: "TRABALHANDO", salarioLiquido: 4290.0, margemDisponivel: 1287.0 },
  { matricula: "BIG-70055", cpfMasked: "***.734.905-**", nome: "Luciana Ferreira Dias", convenio: "Prefeitura de Biguaçu", cargo: "Auditora Fiscal", vinculo: "ESTATUTARIO", situacao: "TRABALHANDO", salarioLiquido: 9800.0, margemDisponivel: 2940.0 },

  { matricula: "SJ-30990", cpfMasked: "***.447.663-**", nome: "Regina Célia Andrade", convenio: "Prefeitura de São José", cargo: "Professora III", vinculo: "ESTATUTARIO", situacao: "TRABALHANDO", salarioLiquido: 6120.0, margemDisponivel: 1836.0 },
  { matricula: "SJ-41208", cpfMasked: "***.213.554-**", nome: "Marcelo Antunes Pires", convenio: "Prefeitura de São José", cargo: "Odontólogo Municipal", vinculo: "ESTATUTARIO", situacao: "TRABALHANDO", salarioLiquido: 8320.0, margemDisponivel: 2496.0 },
  { matricula: "SJ-55870", cpfMasked: "***.877.132-**", nome: "Beatriz Oliveira Nunes", convenio: "Prefeitura de São José", cargo: "Analista de RH", vinculo: "COMISSIONADO", situacao: "TRABALHANDO", salarioLiquido: 5480.0, margemDisponivel: 1644.0 },
  { matricula: "SJ-62002", cpfMasked: "***.302.774-**", nome: "Eduardo Barbosa Silva", convenio: "Prefeitura de São José", cargo: "Engenheiro Civil", vinculo: "ESTATUTARIO", situacao: "TRABALHANDO", salarioLiquido: 11250.0, margemDisponivel: 3375.0 },
  { matricula: "SJ-70441", cpfMasked: "***.618.290-**", nome: "Vera Lúcia Amaral", convenio: "Prefeitura de São José", cargo: "Bibliotecária", vinculo: "ESTATUTARIO", situacao: "APOSENTADO", salarioLiquido: 4180.0, margemDisponivel: 1254.0 },
];

/** Lista servidores dos convenios que este banco opera. Read-only. */
export function getBancoServidores(): BancoServidorRow[] {
  const conveniosDoBanco = new Set(getBancoConvenios());
  const carteira = getCarteira();
  const matriculasComContrato = new Map<string, number>();
  for (const c of carteira) {
    if (c.status === "quitado") continue;
    matriculasComContrato.set(c.matricula, (matriculasComContrato.get(c.matricula) ?? 0) + 1);
  }
  return SEED
    .filter((s) => conveniosDoBanco.has(s.convenio))
    .map<BancoServidorRow>((s) => ({
      ...s,
      contratosAtivos: matriculasComContrato.get(s.matricula) ?? 0,
      temContratoConosco: matriculasComContrato.has(s.matricula),
    }));
}

export const VINCULO_LABEL: Record<ServidorVinculo, string> = {
  ESTATUTARIO: "Estatutário",
  CLT: "CLT",
  COMISSIONADO: "Comissionado",
  APOSENTADO: "Aposentado",
  PENSIONISTA: "Pensionista",
};

export const SITUACAO_LABEL: Record<ServidorSituacao, string> = {
  TRABALHANDO: "Trabalhando",
  AFASTADO: "Afastado",
  APOSENTADO: "Aposentado",
  DESLIGADO: "Desligado",
};
