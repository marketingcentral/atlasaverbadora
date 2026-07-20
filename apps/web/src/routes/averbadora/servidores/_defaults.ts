import type { ServidorCampoConfig } from "@atlas/sdk";

/** Fallback usado quando o endpoint /v1/admin/servidores/campos-config nao
 *  esta disponivel ainda (backend nao deployado) ou falha.
 *  Ordem/colunas replicam EXATAMENTE a tabela do arquivo antigo servidores.tsx
 *  (17 colunas: nome, matricula, cpf, cargo, origem, vinculo, situacaoFuncional,
 *  salarioLiquido, idConvenio, email, telefone, dataAdmissao, dataNascimento,
 *  endereco, codigoIbge, status). Coluna "acoes" vem do componente. */
export const DEFAULT_CAMPOS_FALLBACK: ServidorCampoConfig[] = [
  { key: "nome", label: "Nome", tipo: "texto", visivel: true, obrigatorio: true, ordem: 0, sistema: true },
  { key: "matricula", label: "Matrícula", tipo: "texto", visivel: true, obrigatorio: true, ordem: 1, sistema: true, travado: true },
  { key: "cpf", label: "CPF", tipo: "texto", visivel: true, obrigatorio: true, ordem: 2, sistema: true, travado: true },
  { key: "cargo", label: "Cargo", tipo: "texto", visivel: true, obrigatorio: false, ordem: 3, sistema: true },
  { key: "origem", label: "Origem", tipo: "texto", visivel: true, obrigatorio: false, ordem: 4, sistema: true },
  { key: "vinculo", label: "Vínculo", tipo: "texto", visivel: true, obrigatorio: false, ordem: 5, sistema: true },
  { key: "situacaoFuncional", label: "Situação funcional", tipo: "texto", visivel: true, obrigatorio: false, ordem: 6, sistema: true },
  { key: "salarioLiquido", label: "Salário líq.", tipo: "moeda", visivel: true, obrigatorio: false, ordem: 7, sistema: true },
  { key: "idConvenio", label: "Convênio", tipo: "texto", visivel: true, obrigatorio: false, ordem: 8, sistema: true },
  { key: "email", label: "E-mail", tipo: "email", visivel: true, obrigatorio: true, ordem: 9, sistema: true, travado: true },
  { key: "telefone", label: "Telefone", tipo: "telefone", visivel: true, obrigatorio: false, ordem: 10, sistema: true },
  { key: "dataAdmissao", label: "Admissão", tipo: "data", visivel: true, obrigatorio: false, ordem: 11, sistema: true },
  { key: "dataNascimento", label: "Nascimento", tipo: "data", visivel: true, obrigatorio: false, ordem: 12, sistema: true },
  { key: "endereco", label: "Endereço", tipo: "texto", visivel: true, obrigatorio: false, ordem: 13, sistema: true },
  { key: "codigoIbge", label: "IBGE", tipo: "numero", visivel: true, obrigatorio: false, ordem: 14, sistema: true },
  { key: "status", label: "Status", tipo: "texto", visivel: true, obrigatorio: false, ordem: 15, sistema: true },
];
