// Mock data used while the real DB is not yet populated.
// Mirrors the dataset of mcp-servers/atlas-bank-sandbox and is used by the
// portal-banco routes until the migration to Postgres self-hosted is applied.

export interface ConvenioMock {
  id: string;
  bancoId: number;
  prefeituraId: number;
  nome: string;
  prefeitura: string;
  uf: string;
  codigoVerba: string;
  dataCorte: number;
  diaRepasse: number;
  /** Convênios desativados (soft delete) saem das listagens mas o registro permanece. */
  ativo?: boolean;
}

export type ComunicadoPublico = "banco" | "servidor" | "prefeitura";

export interface ComunicadoMock {
  id: string;
  titulo: string;
  corpo: string;
  linkLabel?: string;
  linkHref?: string;
  ativoAte?: string;
  /** Público-alvo do comunicado — define em qual portal (banco ou app do servidor) aparece. */
  publico: ComunicadoPublico;
}

// Cliente pediu remocao do seed dos 3 convenios (16/07/2026) pra teste real do
// zero — antes tinha PALHOCA/FLORIPA/JOINVILLE que reapareciam via
// seedCollectionIfEmpty depois de deletados. Sem entradas aqui, CONVENIOS_SEED
// em convenios-store.ts fica vazio e a seed nao dispara.
// Nota: SERVIDORES_BUSCA_MOCK abaixo ainda tem idConvenio: "CONV-001|002|003"
// como referencia orfa — nao quebra endpoints (prefeituraIdDe tem fallback),
// so nao resolve o convenio. Se restaurar o seed pra demo, reverter este arquivo.
export const CONVENIOS_MOCK: ConvenioMock[] = [];

// Seed vazio: cliente pediu comecar do zero (16/07/2026). Se algum dia
// precisar restaurar os 6 comunicados de exemplo (3 banco + 3 servidor),
// reverter este commit.
export const COMUNICADOS_MOCK: ComunicadoMock[] = [];

export interface ServidorBuscaMock {
  cpf: string;
  cpfMasked: string;
  matricula: string;
  idMatricula: string;
  /**
   * Prefeitura dona deste vínculo. Um mesmo CPF pode existir em VÁRIAS prefeituras
   * (acumulação legal de cargos) — a identidade do servidor é (prefeituraId, matricula),
   * NUNCA só o CPF. Opcional no seed (derivado do convênio); setado no import.
   */
  prefeituraId?: number;
  nome: string;
  dataAdmissao: string;
  dataNascimento: string;
  vinculo: string;
  origem: string;
  situacaoFuncional: string;
  salarioLiquido: number;
  idConvenio: string;
  email?: string;
  telefone?: string;
  /** Managed by the prefeitura (source of truth for HR data). */
  cargo?: string;
  endereco?: string;
  codigoIbge?: number;
  /** SHA-256 hex da senha. Nunca retornar plaintext. Login do servidor é o próprio CPF. */
  passwordHash?: string;
  /** 2FA opcional pro servidor. Ativado via self-service em /servidor/conta.
   *  Se twoFactorEnabled=true e secret setado, login pede TOTP como averbadora. */
  twoFactorEnabled?: boolean;
  /** RFC 6238 TOTP secret (base32). */
  twoFactorSecret?: string;
  /** RG (opcional, informativo). */
  rg?: string;
  /** Campos customizados por prefeitura (config em admin_servidor_campos_configs).
   *  Chave = key do campo custom (`custom_<slug>`), valor = string bruta do CSV.
   *  Ver `apps/api/src/modules/admin/servidor-campos.ts`. */
  camposCustom?: Record<string, string>;
  /** ISO 8601 — quando este vinculo foi cadastrado na base (setado no INSERT do
   *  import, nunca no update). Usado pra ordenar a tabela da prefeitura por
   *  chegada (mais recente no topo). Ausente em rows antigas -> vao pro fim.
   *  Nao confundir com dataAdmissao (data de contratacao no orgao). */
  criadoEmIso?: string;
}

/**
 * Prefeitura a que um servidor pertence. Usa o campo explícito quando presente;
 * senão deriva do convênio. É a chave de escopo para busca e deduplicação —
 * mesmo CPF em prefeituras diferentes são registros distintos.
 *
 * Retorna 0 (sentinela) quando o servidor NÃO tem prefeitura resolvida — antes
 * o fallback era 1, o que fazia a primeira prefeitura cadastrada (id=1)
 * "herdar" órfãos de imports antigos ou convênios deletados (bug reportado
 * pelo cliente 22/07/2026 no relato de dados vazando entre prefeituras).
 * Callsites que comparam `prefeituraIdDe(s) === prefId` naturalmente
 * excluem o 0. Callsites que iteram servidores por prefeitura (dashboard,
 * listagem) simplesmente ignoram os órfãos.
 */
export function prefeituraIdDe(s: Pick<ServidorBuscaMock, "prefeituraId" | "idConvenio">): number {
  return s.prefeituraId ?? CONVENIOS_MOCK.find((cv) => cv.id === s.idConvenio)?.prefeituraId ?? 0;
}

// Cliente pediu (17/07/2026) remocao TOTAL dos seeds de servidores — incluindo
// Diego (993410027) e Mariana (778102055) que ate entao eram protegidos por
// TEST_CPFS. Regra do cliente: "se eu mando apagar todos, e todos, sem excecao
// de conta de teste". Servidores novos entram exclusivamente via import CSV ou
// endpoint admin. NAO restaurar sem pedido explicito.
export const SERVIDORES_BUSCA_MOCK: ServidorBuscaMock[] = [];

// Seeds antigos preservados aqui como referencia de shape — NAO EXPORTAR/USAR.
// Se por engano algum PR adicionar esses seeds de volta ao array acima, a UI
// vai mostrar 3+ servidores fake e regressao contra a regra do cliente vira
// obvia. Mantido para servir de exemplo em documentacao/tests.
/*
const _SEEDS_HISTORICO_REFERENCIA = [
  {
    cpf: "00011122233",
    cpfMasked: "***.***.***-33",
    matricula: "852029100",
    idMatricula: "MAT-852029100",
    nome: "ADRIANA MARQUES DA SILVA",
    dataAdmissao: "17/04/2017",
    dataNascimento: "1985-03-12",
    vinculo: "ESTATUTARIO",
    origem: "PREFEITURA DE PALHOCA",
    situacaoFuncional: "TRABALHANDO",
    salarioLiquido: 4620,
    idConvenio: "CONV-001",
    cargo: "Professora II",
    endereco: "Rua das Palmeiras, 320 - Centro, Palhoca/SC",
    email: "adriana.silva@palhoca.sc.gov.br",
    telefone: "48991012233",
    codigoIbge: 4211900,
  },
  {
    // Segunda matricula da Adriana — acumulacao legal de cargos (Professora em
    // Palhoca + Auxiliar em Florianopolis). MESMO CPF, matricula/prefeitura
    // diferentes. Serve pra demo do fluxo de trocar matricula no app do servidor.
    cpf: "00011122233",
    cpfMasked: "***.***.***-33",
    matricula: "764521800",
    idMatricula: "MAT-764521800",
    nome: "ADRIANA MARQUES DA SILVA",
    dataAdmissao: "05/09/2020",
    dataNascimento: "1985-03-12",
    vinculo: "ESTATUTARIO",
    origem: "PREFEITURA DE FLORIANOPOLIS",
    situacaoFuncional: "TRABALHANDO",
    salarioLiquido: 3980,
    idConvenio: "CONV-002",
    cargo: "Auxiliar Administrativa",
    endereco: "Rua das Palmeiras, 320 - Centro, Palhoca/SC",
    email: "adriana.silva@palhoca.sc.gov.br",
    telefone: "48991012233",
    codigoIbge: 4205407,
  },
  {
    cpf: "00011122234",
    cpfMasked: "***.***.***-34",
    matricula: "843796302",
    idMatricula: "MAT-843796302",
    nome: "FERNANDA KELLI TOMAZONI",
    dataAdmissao: "10/01/2019",
    dataNascimento: "1990-07-22",
    vinculo: "ESTATUTARIO",
    origem: "PREFEITURA DE FLORIANOPOLIS",
    situacaoFuncional: "TRABALHANDO",
    salarioLiquido: 5320,
    idConvenio: "CONV-002",
    cargo: "Enfermeira",
    endereco: "Av. Beira Mar Norte, 1500 - Centro, Florianopolis/SC",
    email: "fernanda.tomazoni@floripa.sc.gov.br",
    telefone: "48991022234",
    codigoIbge: 4205407,
  },
  {
    cpf: "00011122235",
    cpfMasked: "***.***.***-35",
    matricula: "56571701",
    idMatricula: "MAT-56571701",
    nome: "SUZANA DALLARMI",
    dataAdmissao: "05/03/2015",
    dataNascimento: "1988-11-30",
    vinculo: "ESTATUTARIO",
    origem: "PREFEITURA DE JOINVILLE",
    situacaoFuncional: "TRABALHANDO",
    salarioLiquido: 3820,
    idConvenio: "CONV-003",
    cargo: "Auxiliar Administrativo",
    endereco: "Rua XV de Novembro, 88 - Centro, Joinville/SC",
    email: "suzana.dallarmi@joinville.sc.gov.br",
    telefone: "47991032235",
    codigoIbge: 4209102,
  },
  {
    // Servidor de teste (login direto) — senha "teste123".
    cpf: "37534239800",
    cpfMasked: "***.***.***-00",
    rg: "40.837.175-4",
    matricula: "993410027",
    idMatricula: "MAT-993410027",
    nome: "DIEGO PEREZ FERREIRA",
    dataAdmissao: "01/03/2015",
    dataNascimento: "1987-02-07",
    vinculo: "ESTATUTARIO",
    origem: "PREFEITURA DE PALHOCA",
    situacaoFuncional: "TRABALHANDO",
    salarioLiquido: 12000,
    idConvenio: "CONV-001",
    cargo: "Programador",
    endereco: "Rua dos Programadores, 100 - Centro, Palhoca/SC",
    email: "marketingcentral.mkt2@gmail.com", // e-mail de teste p/ receber notificações reais
    telefone: "48991073451",
    codigoIbge: 4211900,
    passwordHash: "7da852ae47737c9c8ed2d7f89f2b8cc113d586da226ef31a2642d213ea2db707", // sha256("@44515899")
  },
  {
    // Servidor de teste SEM senha — usar para testar o fluxo de PRIMEIRO ACESSO.
    cpf: "12345678909",
    cpfMasked: "***.***.***-09",
    rg: "33.112.845-2",
    matricula: "778102055",
    idMatricula: "MAT-778102055",
    nome: "MARIANA COSTA LIMA",
    dataAdmissao: "10/02/2018",
    dataNascimento: "1990-05-20",
    vinculo: "ESTATUTARIO",
    origem: "PREFEITURA DE JOINVILLE",
    situacaoFuncional: "TRABALHANDO",
    salarioLiquido: 8500,
    idConvenio: "CONV-003",
    cargo: "Analista de Sistemas",
    endereco: "Rua XV de Novembro, 480 - Centro, Joinville/SC",
    email: "mariana.lima@joinville.sc.gov.br",
    telefone: "47992018745",
    codigoIbge: 4209102,
  },
  // --- Servidores de teste (primeiro acesso) — cadastrados em 2026-07-08. Sem e-mail/senha:
  // o servidor informa o e-mail no primeiro acesso e recebe o código de verificação nele. ---
  {
    cpf: "01844730808", cpfMasked: "***.***.***-08", rg: "30000000-0",
    matricula: "700100001", idMatricula: "MAT-700100001", prefeituraId: 1,
    nome: "CARLOS EDUARDO SOUZA", dataAdmissao: "12/03/2016", dataNascimento: "1988-03-12",
    vinculo: "ESTATUTARIO", origem: "PREFEITURA DE PALHOCA", situacaoFuncional: "ATIVO", salarioLiquido: 3200,
    idConvenio: "CONV-001", cargo: "Auxiliar Administrativo", endereco: "Rua Central, 100 - Palhoca/SC", codigoIbge: 4211900,
  },
  {
    cpf: "93025100850", cpfMasked: "***.***.***-50", rg: "30111111-1",
    matricula: "700100002", idMatricula: "MAT-700100002", prefeituraId: 2,
    nome: "MARIA APARECIDA LIMA", dataAdmissao: "01/02/2012", dataNascimento: "1985-07-25",
    vinculo: "ESTATUTARIO", origem: "PREFEITURA DE FLORIANOPOLIS", situacaoFuncional: "ATIVO", salarioLiquido: 4800,
    idConvenio: "CONV-002", cargo: "Professora", endereco: "Rua Central, 101 - Florianopolis/SC", codigoIbge: 4205407,
  },
  {
    cpf: "40800297806", cpfMasked: "***.***.***-06", rg: "30222222-2",
    matricula: "700100003", idMatricula: "MAT-700100003", prefeituraId: 3,
    nome: "JOAO PEDRO ALVES", dataAdmissao: "15/08/2019", dataNascimento: "1992-11-03",
    vinculo: "ESTATUTARIO", origem: "PREFEITURA DE JOINVILLE", situacaoFuncional: "ATIVO", salarioLiquido: 5600,
    idConvenio: "CONV-003", cargo: "Agente de Saude", endereco: "Rua Central, 102 - Joinville/SC", codigoIbge: 4209102,
  },
  {
    cpf: "22421560802", cpfMasked: "***.***.***-02", rg: "30333333-3",
    matricula: "700100004", idMatricula: "MAT-700100004", prefeituraId: 1,
    nome: "ANA BEATRIZ ROCHA", dataAdmissao: "20/04/2017", dataNascimento: "1990-01-18",
    vinculo: "ESTATUTARIO", origem: "PREFEITURA DE PALHOCA", situacaoFuncional: "ATIVO", salarioLiquido: 3900,
    idConvenio: "CONV-001", cargo: "Fiscal Municipal", endereco: "Rua Central, 103 - Palhoca/SC", codigoIbge: 4211900,
  },
  {
    cpf: "88549417866", cpfMasked: "***.***.***-66", rg: "30444444-4",
    matricula: "700100005", idMatricula: "MAT-700100005", prefeituraId: 2,
    nome: "RAFAEL MOREIRA DIAS", dataAdmissao: "05/06/2014", dataNascimento: "1987-09-30",
    vinculo: "ESTATUTARIO", origem: "PREFEITURA DE FLORIANOPOLIS", situacaoFuncional: "ATIVO", salarioLiquido: 6200,
    idConvenio: "CONV-002", cargo: "Motorista", endereco: "Rua Central, 104 - Florianopolis/SC", codigoIbge: 4205407,
  },
  {
    cpf: "72430314800", cpfMasked: "***.***.***-00", rg: "30555555-5",
    matricula: "700100006", idMatricula: "MAT-700100006", prefeituraId: 3,
    nome: "JULIANA SANTOS CRUZ", dataAdmissao: "10/09/2020", dataNascimento: "1993-05-14",
    vinculo: "ESTATUTARIO", origem: "PREFEITURA DE JOINVILLE", situacaoFuncional: "ATIVO", salarioLiquido: 7100,
    idConvenio: "CONV-003", cargo: "Enfermeira", endereco: "Rua Central, 105 - Joinville/SC", codigoIbge: 4209102,
  },
  {
    cpf: "43012777814", cpfMasked: "***.***.***-14", rg: "30666666-6",
    matricula: "700100007", idMatricula: "MAT-700100007", prefeituraId: 1,
    nome: "BRUNO HENRIQUE GOMES", dataAdmissao: "02/01/2018", dataNascimento: "1991-02-27",
    vinculo: "ESTATUTARIO", origem: "PREFEITURA DE PALHOCA", situacaoFuncional: "ATIVO", salarioLiquido: 4400,
    idConvenio: "CONV-001", cargo: "Tecnico de TI", endereco: "Rua Central, 106 - Palhoca/SC", codigoIbge: 4211900,
  },
  {
    cpf: "76568969885", cpfMasked: "***.***.***-85", rg: "30777777-7",
    matricula: "700100008", idMatricula: "MAT-700100008", prefeituraId: 2,
    nome: "PATRICIA REGINA MELO", dataAdmissao: "18/07/2011", dataNascimento: "1986-12-08",
    vinculo: "ESTATUTARIO", origem: "PREFEITURA DE FLORIANOPOLIS", situacaoFuncional: "ATIVO", salarioLiquido: 5200,
    idConvenio: "CONV-002", cargo: "Assistente Social", endereco: "Rua Central, 107 - Florianopolis/SC", codigoIbge: 4205407,
  },
  {
    cpf: "45668163890", cpfMasked: "***.***.***-90", rg: "30888888-8",
    matricula: "700100009", idMatricula: "MAT-700100009", prefeituraId: 3,
    nome: "FELIPE AUGUSTO NUNES", dataAdmissao: "25/03/2021", dataNascimento: "1994-06-21",
    vinculo: "ESTATUTARIO", origem: "PREFEITURA DE JOINVILLE", situacaoFuncional: "ATIVO", salarioLiquido: 8300,
    idConvenio: "CONV-003", cargo: "Guarda Municipal", endereco: "Rua Central, 108 - Joinville/SC", codigoIbge: 4209102,
  },
  {
    cpf: "44334721826", cpfMasked: "***.***.***-26", rg: "30999999-0",
    matricula: "700100010", idMatricula: "MAT-700100010", prefeituraId: 1,
    nome: "CAMILA FERREIRA PINTO", dataAdmissao: "30/10/2015", dataNascimento: "1989-08-05",
    vinculo: "ESTATUTARIO", origem: "PREFEITURA DE PALHOCA", situacaoFuncional: "ATIVO", salarioLiquido: 6800,
    idConvenio: "CONV-001", cargo: "Contadora", endereco: "Rua Central, 109 - Palhoca/SC", codigoIbge: 4211900,
  },
];
*/

export interface ContratoMock {
  adf: string;
  situacao: string;
  lancamento: string;
  expiracao: string | null;
  cpfMasked: string;
  matricula: string;
  nome: string;
  tipoContrato: "EMPRESTIMO" | "REFIN" | "ECONSIGNADO";
  totalParcelas: number;
  valorParcela: number;
  convenio: string;
  convenioId: string;
}

// Cliente pediu remocao dos 3 contratos fixture (16/07/2026) pra teste real do
// zero — antes tinha ADRIANA/SUZANA/FERNANDA que reapareciam via
// seedContratosIfEmpty depois de deletados. Isso limpa tambem as pre-reservas
// visiveis em /averbadora/pre-reservas (sao derivadas de contratos).
// Se restaurar pra demo, reverter este arquivo.
export const CONTRATOS_MOCK: ContratoMock[] = [];
