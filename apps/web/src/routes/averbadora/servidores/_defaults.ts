import type { ServidorCampoConfig } from "@atlas/sdk";

/** Fallback usado quando o endpoint /v1/admin/servidores/campos-config nao
 *  esta disponivel ainda (backend nao deployado) ou falha. Mesma lista dos
 *  defaults do backend (defaultCamposSet em modules/admin/servidor-campos.ts). */
export const DEFAULT_CAMPOS_FALLBACK: ServidorCampoConfig[] = [
  { key: "cpf", label: "CPF", tipo: "texto", visivel: true, obrigatorio: true, ordem: 0, sistema: true, travado: true },
  { key: "matricula", label: "Matrícula", tipo: "texto", visivel: true, obrigatorio: true, ordem: 1, sistema: true, travado: true },
  { key: "email", label: "E-mail", tipo: "email", visivel: true, obrigatorio: true, ordem: 2, sistema: true, travado: true },
  { key: "nome", label: "Nome", tipo: "texto", visivel: true, obrigatorio: true, ordem: 3, sistema: true },
  { key: "telefone", label: "Telefone", tipo: "telefone", visivel: true, obrigatorio: false, ordem: 4, sistema: true },
  { key: "cargo", label: "Cargo", tipo: "texto", visivel: true, obrigatorio: false, ordem: 5, sistema: true },
  { key: "vinculo", label: "Vínculo", tipo: "texto", visivel: true, obrigatorio: false, ordem: 6, sistema: true },
  { key: "situacaoFuncional", label: "Situação funcional", tipo: "texto", visivel: true, obrigatorio: false, ordem: 7, sistema: true },
  { key: "salarioLiquido", label: "Salário líquido", tipo: "moeda", visivel: true, obrigatorio: false, ordem: 8, sistema: true },
  { key: "idConvenio", label: "Convênio", tipo: "texto", visivel: true, obrigatorio: false, ordem: 9, sistema: true },
  { key: "dataAdmissao", label: "Admissão", tipo: "data", visivel: true, obrigatorio: false, ordem: 10, sistema: true },
  { key: "dataNascimento", label: "Nascimento", tipo: "data", visivel: true, obrigatorio: false, ordem: 11, sistema: true },
  { key: "endereco", label: "Endereço", tipo: "texto", visivel: true, obrigatorio: false, ordem: 12, sistema: true },
  { key: "codigoIbge", label: "Código IBGE", tipo: "numero", visivel: true, obrigatorio: false, ordem: 13, sistema: true },
];
