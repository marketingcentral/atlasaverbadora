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
}

export interface ComunicadoMock {
  id: string;
  titulo: string;
  corpo: string;
  linkLabel?: string;
  linkHref?: string;
  ativoAte?: string;
}

export const CONVENIOS_MOCK: ConvenioMock[] = [
  { id: "CONV-001", bancoId: 1, prefeituraId: 1, nome: "CASTRO / DELTA GLOBAL", prefeitura: "Palhoca", uf: "SC", codigoVerba: "1547 - DELTA GLOBAL I", dataCorte: 15, diaRepasse: 5 },
  { id: "CONV-002", bancoId: 1, prefeituraId: 2, nome: "FLORIPA / DELTA GLOBAL", prefeitura: "Florianopolis", uf: "SC", codigoVerba: "2210 - DELTA GLOBAL II", dataCorte: 18, diaRepasse: 8 },
  { id: "CONV-003", bancoId: 1, prefeituraId: 3, nome: "JOINVILLE / DELTA GLOBAL", prefeitura: "Joinville", uf: "SC", codigoVerba: "2310 - DELTA GLOBAL III", dataCorte: 20, diaRepasse: 10 },
];

export const COMUNICADOS_MOCK: ComunicadoMock[] = [
  {
    id: "COM-1",
    titulo: "Nova vigencia de tabelas — Julho/2026",
    corpo: "A partir de 01/07 entra em vigor a nova tabela de taxas. Verifique em Cadastros > Tabela de Empréstimos.",
    linkLabel: "Acessar Cadastros",
    linkHref: "/banco/cadastros/tabela-emprestimos",
  },
  {
    id: "COM-2",
    titulo: "Servidores municipais podem usar o app Atlas",
    corpo: "Divulgue o app para os servidores e aumente as conversoes em ofertas pre-aprovadas. Material de divulgacao no portal.",
    linkLabel: "Materiais",
    linkHref: "#",
  },
  {
    id: "COM-3",
    titulo: "Treinamento UX Atlas vs Consignet",
    corpo: "Sessao gratuita 15/07 19h. Apresentamos o mapa de equivalencia entre os menus.",
  },
];

export interface ServidorBuscaMock {
  cpf: string;
  cpfMasked: string;
  matricula: string;
  idMatricula: string;
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
}

export const SERVIDORES_BUSCA_MOCK: ServidorBuscaMock[] = [
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
];

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

export const CONTRATOS_MOCK: ContratoMock[] = [
  { adf: "472600084", situacao: "Aguardando Confirmação do Deferimento", lancamento: "19/06/2026", expiracao: "26/06/2026", cpfMasked: "***.***.***-34", matricula: "843796302", nome: "FERNANDA KELLI TOMAZONI", tipoContrato: "EMPRESTIMO", totalParcelas: 96, valorParcela: 240.18, convenio: "FLORIPA / DELTA GLOBAL", convenioId: "CONV-002" },
  { adf: "461050084", situacao: "Ativo", lancamento: "25/03/2026", expiracao: null, cpfMasked: "***.***.***-35", matricula: "56571701", nome: "SUZANA DALLARMI", tipoContrato: "EMPRESTIMO", totalParcelas: 84, valorParcela: 312.50, convenio: "JOINVILLE / DELTA GLOBAL", convenioId: "CONV-003" },
  { adf: "460690084", situacao: "Ativo", lancamento: "18/03/2026", expiracao: null, cpfMasked: "***.***.***-33", matricula: "852029100", nome: "ADRIANA MARQUES DA SILVA", tipoContrato: "EMPRESTIMO", totalParcelas: 120, valorParcela: 15.48, convenio: "CASTRO / DELTA GLOBAL", convenioId: "CONV-001" },
];
