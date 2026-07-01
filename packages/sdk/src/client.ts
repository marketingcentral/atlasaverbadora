import type { AuthSuccess, LoginRequest, MargemResponse, Servidor } from "@atlas/types";
import { ApiHttpError } from "./errors.js";

export interface BancoContratoFull {
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
  bancoId: number;
  servidorId: number;
  idMatricula: string;
  valorFinanciado: number;
  valorLiquido: number;
  taxaAm: number;
  cetAm: number;
  iof: number;
  diasCarencia: number;
  saldoDevedor: number;
  parcelasPagas: number;
  folhaPrimeiroDesconto: string;
  folhaUltimoDesconto: string;
  codigoVerba: string;
  dataContrato: string;
  observacoes?: string;
  adfVinculada?: string;
}

export interface NovoContratoBody {
  idMatricula: string;
  valor: number;
  parcelas: number;
  taxaAm: number;
  diasCarencia?: number;
  observacoes?: string;
  contratoOrigem?: string;
  bancoOrigem?: string;
  saldoDevedorOrigem?: number;
  valorRefin?: number;
}

export type BancoPerfil = "admin" | "operador" | "consulta" | "relatorios";

export interface BancoTabela {
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

export interface BancoTabelaInput {
  id?: string;
  convenioId: string;
  convenio: string;
  taxaMinAm: number;
  taxaMaxAm: number;
  prazoMaxMeses: number;
  vigenciaInicio: string;
  vigenciaFim?: string;
  ativo?: boolean;
}

export interface BancoUsuario {
  id: string;
  bancoId: number;
  codigo: string;
  nome: string;
  email: string;
  cpfMasked: string;
  organizacao: string;
  perfil: BancoPerfil;
  ipsPermitidos: string[];
  ativo: boolean;
  criadoEm: string;
}

export interface BancoUsuarioInput {
  id?: string;
  nome: string;
  email: string;
  /** Full 11-digit CPF (sem pontuacao). Quando enviado, sobrescreve a mascara. */
  cpf?: string;
  cpfMasked?: string;
  organizacao?: string;
  perfil: BancoPerfil;
  ipsPermitidos?: string[];
  ativo?: boolean;
}

// ===== Admin types =====

export interface AdminBanco {
  id: number;
  nome: string;
  status: "ativo" | "pausado" | "inativo";
  adapter: "sandbox" | "ifractal";
  contatoEmail: string;
  loginEmail?: string;
  hasPassword: boolean;
  scopes: string[];
  mtlsHabilitado: boolean;
  ultimoTeste?: string;
  ultimoTesteOk?: boolean;
}

export interface AdminBancoInput {
  id?: number;
  nome: string;
  status: "ativo" | "pausado" | "inativo";
  adapter: "sandbox" | "ifractal";
  contatoEmail: string;
  loginEmail?: string;
  password?: string;
  scopes?: string[];
  mtlsHabilitado?: boolean;
}

export interface AdminPrefeitura {
  id: number;
  nome: string;
  uf: string;
  municipioIbge: number;
  modoIntegracao: "REST" | "SOAP" | "CSV" | "MANUAL";
  status: "ativo" | "pausado";
  loginEmail?: string;
  hasPassword: boolean;
  servidoresCount: number;
  ultimaSincronizacao?: string;
}

export interface AdminPrefeituraInput {
  id?: number;
  nome: string;
  uf: string;
  municipioIbge: number;
  modoIntegracao: "REST" | "SOAP" | "CSV" | "MANUAL";
  status: "ativo" | "pausado";
  loginEmail?: string;
  password?: string;
  servidoresCount?: number;
}

export interface AdminConvenio {
  id: string;
  bancoId: number;
  prefeituraId: number;
  nome: string;
  prefeitura: string;
  uf: string;
  codigoVerba: string;
  dataCorte: number;
  diaRepasse: number;
  bancoNome: string;
  prefeituraNome: string;
}

export interface AdminConvenioInput {
  id?: string;
  bancoId: number;
  prefeituraId: number;
  nome: string;
  codigoVerba: string;
  dataCorte: number;
  diaRepasse: number;
}

export type FormatoImportacao = "CSV" | "EXCEL" | "API";
export type VinculoAceito = "CLT" | "ESTATUTARIO" | "COMISSIONADO" | "APOSENTADO" | "PENSIONISTA";

export interface AdminConvenioConfig {
  id: string;
  prazoTravaHoras: number;
  prazoPortabilidadeDU: number;
  maxParcelas: number;
  taxaMaxAm: number;
  idadeMin: number;
  idadeMax: number;
  vinculosAceitos: VinculoAceito[];
  formatoImportacao: FormatoImportacao;
  regrasEspeciais: string;
  vigenciaInicio: string;
  vigenciaFim?: string;
  ativo: boolean;
  atualizadoEm: string;
}

export type IdUnicoFormato = "SEQ" | "SEQ_HASH" | "YYYYMM_SEQ";
export interface AdminIdUnicoConfig {
  prefeituraId: number;
  prefeituraNome: string;
  prefixo: string;
  formato: IdUnicoFormato;
  larguraSeq: number;
  proximoSeq: number;
  separador: string;
  atualizadoEm: string;
  exemplo: string;
}

export type PreReservaStatus = "ativa" | "confirmada" | "expirada" | "cancelada";
export type OperacaoTipo = "EMPRESTIMO" | "REFIN" | "PORTABILIDADE" | "COMPOSTA";

export interface AdminPreReserva {
  id: string;
  idUnico: string;
  bancoId: number;
  bancoNome: string;
  prefeituraId: number;
  prefeituraNome: string;
  convenioId: string;
  convenioNome: string;
  servidorCpfMasked: string;
  servidorNome: string;
  matricula: string;
  tipoOperacao: OperacaoTipo;
  valorMargem: number;
  valorParcela: number;
  parcelas: number;
  criadoEm: string;
  expiraEm: string;
  status: PreReservaStatus;
  finalizadoEm?: string;
  finalizadoPor?: string;
  motivoFinalizacao?: string;
}

export interface AdminPreReservaResumo {
  ativas: number;
  expirandoEm24h: number;
  confirmadasHoje: number;
  expiradasHoje: number;
  margemTotalTravada: number;
}

export type TombamentoStatus = "processando" | "conciliado" | "divergente" | "rejeitado";
export interface AdminTombamentoLote {
  id: string;
  prefeituraId: number;
  prefeituraNome: string;
  competencia: string;
  status: TombamentoStatus;
  totalLinhas: number;
  inseridos: number;
  atualizados: number;
  divergencias: number;
  recebidoEm: string;
  processadoEm?: string;
  recebidoPor: string;
  observacao?: string;
}

export interface AdminTombamentoLinha {
  loteId: string;
  cpfMasked: string;
  matricula: string;
  bancoNome: string;
  adfBanco: string;
  idUnico: string;
  valorParcela: number;
  parcelasRestantes: number;
  saldoDevedor: number;
  reconciliacao: "ok" | "divergente" | "novo";
  detalheReconciliacao?: string;
}

export interface AdminBateCarteiraLinha {
  competencia: string;
  bancoId: number;
  bancoNome: string;
  prefeituraId: number;
  prefeituraNome: string;
  cpfMasked: string;
  matricula: string;
  idUnico: string;
  adfBanco?: string;
  valorParcela: number;
  parcelasRestantes?: number;
  saldoDevedor?: number;
  origem: "tombamento" | "pre_reserva_confirmada";
  status: string;
  data: string;
}

export interface AdminBateCarteiraResultado {
  bancoId: number;
  bancoNome: string;
  competencia: string;
  totalLinhas: number;
  somaSaldoDevedor: number;
  somaValorParcela: number;
  linhas: AdminBateCarteiraLinha[];
  geradoEm: string;
}

export type AuditCategoria =
  | "pre_reserva" | "termo_aceite" | "biometria" | "dados_pessoais"
  | "margem" | "tombamento" | "id_unico" | "convenio_config" | "acesso";

export interface AdminAuditEntry {
  id: string;
  ts: string;
  trace_id: string;
  categoria: AuditCategoria;
  acao: string;
  cpf?: string;
  matricula?: string;
  propostaId?: string;
  idUnico?: string;
  ip?: string;
  userAgent?: string;
  deviceId?: string;
  termoAceito?: string;
  userId?: string;
  userRole?: string;
  detalhes: string;
}

export type AverbadoraPerfil = "operador" | "supervisor" | "comercial" | "financeiro" | "auditoria";

export interface AdminAverbadoraUser {
  id: number;
  nome: string;
  email: string;
  perfil: AverbadoraPerfil;
  ativo: boolean;
  twoFactorEnabled: boolean;
  criadoEm: string;
  ultimoLogin?: string;
}

export interface AdminServidor {
  id: number;
  nome: string;
  cpf: string;
  cpfMasked: string;
  matricula: string;
  vinculo: string;
  situacaoFuncional: string;
  origem: string;
  idConvenio: string;
  salarioLiquido: number;
  status: "ativo" | "bloqueado" | "arquivado";
  email: string;
  telefone: string;
  cargo?: string;
  endereco?: string;
  codigoIbge?: number | null;
  /** true se o servidor já tem senha cadastrada; o plaintext nunca é retornado. */
  hasPassword: boolean;
}

export interface AdminServidorUpdate {
  nome?: string;
  /** 11 dígitos. Validado no backend; conflito com outro servidor → 400. */
  cpf?: string;
  vinculo?: "CLT" | "ESTATUTARIO" | "COMISSIONADO";
  situacaoFuncional?: string;
  salarioLiquido?: number;
  idConvenio?: string;
  status?: "ativo" | "bloqueado" | "arquivado";
  email?: string;
  telefone?: string;
  /** Nova senha; se omitido ou vazio, a senha atual é mantida. */
  password?: string;
}

export interface AdminFolha {
  id: string;
  prefeituraId: number;
  prefeitura: string;
  competencia: string;
  dataCorte: string;
  dataRepasse: string | null;
  status: "aberta" | "fechada" | "consolidada";
}

export interface AdminFolhaInput {
  id?: string;
  prefeituraId: number;
  prefeitura: string;
  competencia: string;
  dataCorte: string;
  dataRepasse?: string | null;
  status: "aberta" | "fechada" | "consolidada";
}

export interface AdminBanner {
  id: string;
  bancoId: number;
  bancoNome: string;
  titulo: string;
  imagemUrl?: string;
  impressoes: number;
  cliques: number;
  receitaMes: number;
  ativo: boolean;
}

export type ApiEnvironment = "production" | "sandbox";
export type ApiAudience = "banco" | "servidor" | "averbadora";
/** Backward-compat alias (deprecated): use ApiAudience. */
export type ApiPartnerType = ApiAudience;
export type ApiScope = string;

export interface AdminApiToken {
  id: string;
  name: string;
  prefix: string;
  environment: ApiEnvironment;
  audience: ApiAudience;
  partnerId: number;
  scopes: ApiScope[];
  createdAt: string;
  createdBy: string;
  lastUsedAt?: string;
  revokedAt?: string;
}

export interface AdminApiTokenInput {
  name: string;
  environment: ApiEnvironment;
  audience: ApiAudience;
  partnerId: number;
  scopes: ApiScope[];
}

export interface AdminWebhook {
  id: string;
  audience: ApiAudience;
  partnerId: number;
  environment: ApiEnvironment;
  url: string;
  secretPrefix: string;
  events: string[];
  active: boolean;
  createdAt: string;
  createdBy: string;
}

export interface AdminWebhookInput {
  audience: ApiAudience;
  partnerId: number;
  environment: ApiEnvironment;
  url: string;
  events: string[];
}

export interface PrefeituraServidor {
  matricula: string;
  nome: string;
  cpfMasked: string;
  vinculo: string;
  situacaoFuncional: string;
  salarioLiquido: number;
  idConvenio: string;
  cargo?: string;
  endereco?: string;
  email?: string;
  telefone?: string;
  codigoIbge?: number | null;
  margemTotal?: number;
  margemDisponivel?: number;
  contratos?: number;
}
export interface PrefeituraAdf {
  id: string;
  competencia: string;
  adf: string;
  idUnico: string;
  cpfMasked: string;
  matricula: string;
  nome: string;
  bancoNome: string;
  valorParcela: number;
  totalParcelas: number;
  status: "recebida" | "aplicada" | "falha";
  motivo?: string;
}
export interface PrefeituraPerfil {
  id: number;
  prefeituraId: number;
  nome: string;
  email: string;
  area: "rh" | "financeiro" | "gestor";
  ativo: boolean;
  twofaEnabled: boolean;
  hasTotp: boolean;
}
export interface PrefeituraFolha {
  id: string;
  prefeituraId: number;
  prefeitura: string;
  competencia: string;
  dataCorte: string;
  dataRepasse: string | null;
  status: "aberta" | "fechada" | "consolidada";
}
export interface PrefeituraConvenio {
  id: string;
  nome: string;
  bancoNome: string;
  codigoVerba: string;
  dataCorte: number;
  diaRepasse: number;
}
export interface PrefeituraContrato {
  adf: string;
  bancoNome: string;
  matricula: string;
  nome: string;
  situacao: string;
  tipoContrato: string;
  valorParcela: number;
  totalParcelas: number;
  lancamento: string;
}

export interface CsvImportOutcome {
  inserted: number;
  updated: number;
  skipped: number;
  errors: { line: number; message: string }[];
  rows: unknown[];
}

export interface AdminWebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  status: "pending" | "success" | "failed";
  httpStatus?: number;
  attempt: number;
  scheduledAt: string;
  deliveredAt?: string;
  error?: string;
  payloadPreview: string;
}

export interface TokenStorage {
  getAccess(): string | null | Promise<string | null>;
  getRefresh(): string | null | Promise<string | null>;
  set(tokens: { access_token: string; refresh_token: string; expires_in: number }): void | Promise<void>;
  clear(): void | Promise<void>;
}

export interface AtlasClientOptions {
  baseUrl: string;
  storage?: TokenStorage;
  fetch?: typeof fetch;
  onAuthFailure?: () => void;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  signal?: AbortSignal;
  skipAuth?: boolean;
}

/** Minimal in-memory storage used as default. Replace in app code with SecureStore / localStorage. */
class MemoryStorage implements TokenStorage {
  private access: string | null = null;
  private refresh: string | null = null;
  getAccess() { return this.access; }
  getRefresh() { return this.refresh; }
  set(t: { access_token: string; refresh_token: string }) { this.access = t.access_token; this.refresh = t.refresh_token; }
  clear() { this.access = null; this.refresh = null; }
}

export class AtlasClient {
  private readonly fetchImpl: typeof fetch;
  private readonly storage: TokenStorage;
  private refreshing: Promise<void> | null = null;

  constructor(private readonly opts: AtlasClientOptions) {
    this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis);
    this.storage = opts.storage ?? new MemoryStorage();
  }

  // ============ Auth ============
  async login(req: LoginRequest): Promise<AuthSuccess> {
    const res = await this.request<AuthSuccess>("/v1/auth/login", { method: "POST", body: req, skipAuth: true });
    await this.storage.set({ access_token: res.access_token, refresh_token: res.refresh_token, expires_in: res.expires_in });
    return res;
  }

  async logout(): Promise<void> {
    try {
      await this.request("/v1/auth/logout", { method: "POST" });
    } finally {
      await this.storage.clear();
    }
  }

  // ============ Servidores ============
  async getMyProfile(): Promise<Servidor> {
    return this.request<Servidor>("/v1/servidores/me");
  }

  async getMyMargem(opts?: { forceRefresh?: boolean; include?: string[] }): Promise<MargemResponse> {
    return this.request<MargemResponse>("/v1/servidores/me/margem-consignavel", {
      query: {
        force_refresh: opts?.forceRefresh,
        include: opts?.include?.join(","),
      },
    });
  }

  /** All matrículas of the logged-in servidor, each with full data (margem, contratos, elegíveis). */
  async getMyMatriculas<T = unknown>(): Promise<{ matriculas: T[] }> {
    return this.request<{ matriculas: T[] }>("/v1/servidores/me/matriculas");
  }

  // ============ Portal Banco ============
  readonly banco = {
    convenios: () => this.request<{ convenios: { id: string; nome: string; prefeitura: string; uf: string }[]; activeId: string }>("/v1/portal/banco/convenios"),
    setConvenioAtivo: (convenioId: string) =>
      this.request<{ activeId: string }>("/v1/portal/banco/convenio-ativo", { method: "POST", body: { convenioId } }),
    visaoGeral: () =>
      this.request<{
        convenio: { id: string; nome: string; prefeitura: string };
        kpis: { carteira: { count: number; percentual: number }; novosNoMes: { count: number }; pendencias: { count: number } };
        dataCorte: { dia: number; mes: string; origem: string; operacoes: string };
      }>("/v1/portal/banco/visao-geral"),
    comunicados: () => this.request<{ comunicados: { id: string; titulo: string; corpo: string; linkLabel?: string; linkHref?: string }[] }>("/v1/portal/banco/comunicados"),
    margemBuscar: (input: { cpf?: string; matricula?: string }) =>
      this.request<{
        ficha: {
          cpf: string; cpfMasked: string; matricula: string; idMatricula: string;
          nome: string; dataAdmissao: string; dataNascimento: string;
          vinculo: string; origem: string; situacaoFuncional: string;
          salarioLiquido: number; idConvenio: string;
        };
      }>("/v1/portal/banco/margem/buscar", { method: "POST", body: input }),
    margemExemplos: () =>
      this.request<{
        activeConvenioId: string;
        activeConvenioNome: string;
        noConvenio: { nome: string; matricula: string; cpf: string; cpfMasked: string; idConvenio: string }[];
        outrosConvenios: { nome: string; matricula: string; cpfMasked: string; idConvenio: string; convenio: string }[];
      }>("/v1/portal/banco/margem/exemplos"),
    margemCalcular: (idMatricula: string, input: { mes: number; ano: number }) =>
      this.request<{
        competencia: string;
        tipo: "EMPRESTIMO";
        total: number;
        disponivel: number;
        projecao: { competencia: string; rotulo: string; valor: number }[];
      }>(`/v1/portal/banco/margem/${idMatricula}/calcular`, { method: "POST", body: input }),
    contratos: (filtros: { colaborador?: string; situacao?: string[] } = {}) =>
      this.request<{
        contratos: {
          adf: string; situacao: string; lancamento: string; expiracao: string | null;
          cpfMasked: string; matricula: string; nome: string; tipoContrato: string;
          totalParcelas: number; valorParcela: number; convenio: string;
        }[];
        total: number;
      }>("/v1/portal/banco/contratos", {
        query: {
          colaborador: filtros.colaborador,
          ...(filtros.situacao ? Object.fromEntries(filtros.situacao.map((s, i) => [`situacao_${i}`, s])) : {}),
        },
      }),
    getContrato: (adf: string) =>
      this.request<{
        contrato: BancoContratoFull;
        parcelas: { numero: number; vencimento: string; valor: number; situacao: string }[];
        eventos: { id: number; evento: string; deEstado: string | null; paraEstado: string | null; ator: string; motivo?: string; criadoEm: string }[];
      }>(`/v1/portal/banco/contratos/${adf}`),
    averbar: (tipo: "EMPRESTIMO" | "REFIN" | "COMPOSTA" | "PORTABILIDADE", body: NovoContratoBody) =>
      this.request<BancoContratoFull>(`/v1/portal/banco/contratos/averbar/${tipo}`, { method: "POST", body }),
    reservar: (tipo: "EMPRESTIMO" | "REFIN" | "COMPOSTA" | "PORTABILIDADE", body: NovoContratoBody) =>
      this.request<BancoContratoFull>(`/v1/portal/banco/contratos/reservar/${tipo}`, { method: "POST", body }),
    acao: (
      adf: string,
      acao: "quitar" | "suspender" | "cancelar" | "alongar" | "alterar" | "confirmar",
      body?: { motivo?: string; parcelasExtras?: number; observacoes?: string; codigoVerba?: string },
    ) =>
      this.request<{ contrato: BancoContratoFull }>(`/v1/portal/banco/contratos/${adf}/${acao}`, { method: "POST", body: body ?? {} }),
    comprovanteUrl: (adf: string) => new URL(`/v1/portal/banco/contratos/${adf}/comprovante.pdf`, this.opts.baseUrl).toString(),

    // Cadastros
    listTabelas: () => this.request<{ tabelas: BancoTabela[] }>("/v1/portal/banco/cadastros/tabela-emprestimos"),
    getTabela: (id: string) => this.request<{ tabela: BancoTabela }>(`/v1/portal/banco/cadastros/tabela-emprestimos/${id}`),
    upsertTabela: (body: BancoTabelaInput) => this.request<{ tabela: BancoTabela }>("/v1/portal/banco/cadastros/tabela-emprestimos", { method: "POST", body }),
    removerTabela: (id: string) => this.request<void>(`/v1/portal/banco/cadastros/tabela-emprestimos/${id}`, { method: "DELETE" }),

    listUsuarios: (q?: { perfil?: BancoPerfil; somenteAdmin?: boolean }) =>
      this.request<{ usuarios: BancoUsuario[] }>("/v1/portal/banco/cadastros/usuarios", { query: q ?? {} }),
    getUsuario: (id: string) => this.request<{ usuario: BancoUsuario }>(`/v1/portal/banco/cadastros/usuarios/${id}`),
    upsertUsuario: (body: BancoUsuarioInput) => this.request<{ usuario: BancoUsuario }>("/v1/portal/banco/cadastros/usuarios", { method: "POST", body }),
    removerUsuario: (id: string) => this.request<void>(`/v1/portal/banco/cadastros/usuarios/${id}`, { method: "DELETE" }),
    /** Devolve o CPF completo do usuario (acesso registrado em audit log no servidor). */
    revealUsuarioCpf: (id: string) =>
      this.request<{ id: string; cpf: string; cpfMasked: string }>(`/v1/portal/banco/cadastros/usuarios/${id}/cpf`),

    // Relatorios
    relatorioConsignacoes: (q?: { tipo?: string; inicio?: string; fim?: string }) =>
      this.request<{
        filtros: { tipo: string | null; inicio: string | null; fim: string | null; convenioId: string };
        linhas: BancoContratoFull[];
        totalValorFinanciado: number;
        quantidade: number;
      }>("/v1/portal/banco/relatorios/consignacoes", { query: q ?? {} }),
    relatorioFaturamento: () =>
      this.request<{
        convenioId: string;
        meses: { competencia: string; contratos: number; valorFinanciado: number; comissaoEstimada: number }[];
      }>("/v1/portal/banco/relatorios/faturamento"),
  };

  // ============ Admin (Averbadora) ============
  readonly admin = {
    dashboard: () =>
      this.request<{
        kpis: { propostasHoje: number; conversao: number; ticketMedio: number; bancosAtivos: number; prefeiturasAtivas: number; servidoresCadastrados: number; receitaVitrineMes: number };
        topBancos: { nome: string; propostas: number }[];
        topPrefeituras: { nome: string; servidores: number }[];
      }>("/v1/admin/dashboard"),
    listBancos: () => this.request<{ bancos: AdminBanco[] }>("/v1/admin/bancos"),
    getBanco: (id: number) => this.request<{ banco: AdminBanco }>(`/v1/admin/bancos/${id}`),
    upsertBanco: (b: AdminBancoInput) => this.request<{ banco: AdminBanco }>("/v1/admin/bancos", { method: "POST", body: b }),
    testarBanco: (id: number) => this.request<{ ok: boolean; banco: AdminBanco }>(`/v1/admin/bancos/${id}/testar-conexao`, { method: "POST" }),
    resetBancoPassword: (id: number, password: string) =>
      this.request<{ banco: AdminBanco }>(`/v1/admin/bancos/${id}/reset-password`, { method: "POST", body: { password } }),
    listPrefeituras: () => this.request<{ prefeituras: AdminPrefeitura[] }>("/v1/admin/prefeituras"),
    upsertPrefeitura: (p: AdminPrefeituraInput) => this.request<{ prefeitura: AdminPrefeitura }>("/v1/admin/prefeituras", { method: "POST", body: p }),
    sincronizarPrefeitura: (id: number) => this.request<{ prefeitura: AdminPrefeitura }>(`/v1/admin/prefeituras/${id}/sincronizar`, { method: "POST" }),
    resetPrefeituraPassword: (id: number, password: string) =>
      this.request<{ prefeitura: AdminPrefeitura }>(`/v1/admin/prefeituras/${id}/reset-password`, { method: "POST", body: { password } }),
    listConvenios: () => this.request<{ convenios: AdminConvenio[] }>("/v1/admin/convenios"),
    upsertConvenio: (body: AdminConvenioInput) =>
      this.request<{ convenio: AdminConvenio }>("/v1/admin/convenios", { method: "POST", body }),
    deleteConvenio: (id: string) =>
      this.request<void>(`/v1/admin/convenios/${id}`, { method: "DELETE" }),
    getConvenioConfig: (id: string) =>
      this.request<{ config: AdminConvenioConfig | null }>(`/v1/admin/convenios/${id}/config`),
    listConveniosConfigs: () =>
      this.request<{ configs: AdminConvenioConfig[] }>("/v1/admin/convenios-configs"),
    upsertConvenioConfig: (id: string, body: Omit<AdminConvenioConfig, "id" | "atualizadoEm">) =>
      this.request<{ config: AdminConvenioConfig }>(`/v1/admin/convenios/${id}/config`, { method: "POST", body }),

    // ID único
    listIdUnicoConfigs: () =>
      this.request<{ configs: AdminIdUnicoConfig[] }>("/v1/admin/id-unico/configs"),
    upsertIdUnicoConfig: (body: Omit<AdminIdUnicoConfig, "atualizadoEm" | "exemplo" | "prefeituraNome">) =>
      this.request<{ config: AdminIdUnicoConfig; exemplo: string }>("/v1/admin/id-unico/configs", { method: "POST", body }),
    issueIdUnico: (prefeituraId: number) =>
      this.request<{ idUnico: string }>("/v1/admin/id-unico/issue", { method: "POST", body: { prefeituraId } }),

    // Pré-reservas
    listPreReservas: (q?: { status?: PreReservaStatus; prefeitura_id?: number; banco_id?: number }) =>
      this.request<{ preReservas: AdminPreReserva[]; resumo: AdminPreReservaResumo }>("/v1/admin/pre-reservas", { query: q ?? {} }),
    cancelarPreReserva: (id: string, motivo: string) =>
      this.request<{ preReserva: AdminPreReserva }>(`/v1/admin/pre-reservas/${id}/cancelar`, { method: "POST", body: { motivo } }),
    sweepPreReservas: () =>
      this.request<{ expiradas: number }>("/v1/admin/pre-reservas/sweep", { method: "POST" }),

    // Tombamento
    listTombamentoLotes: (q?: { prefeitura_id?: number; competencia?: string }) =>
      this.request<{ lotes: AdminTombamentoLote[] }>("/v1/admin/tombamento/lotes", { query: q ?? {} }),
    listTombamentoLinhas: (loteId: string) =>
      this.request<{ linhas: AdminTombamentoLinha[] }>(`/v1/admin/tombamento/lotes/${loteId}/linhas`),
    importarTombamento: (body: { prefeituraId: number; competencia: string; csv: string }) =>
      this.request<{ lote: AdminTombamentoLote; inseridos: number; atualizados: number; divergencias: number; erros: { line: number; message: string }[] }>(
        "/v1/admin/tombamento/importar",
        { method: "POST", body },
      ),
    tombamentoCsvTemplateUrl: (): string => `${this.opts.baseUrl}/v1/admin/tombamento/csv-template`,

    // Bate-de-carteira
    bateCarteira: (body: { bancoId: number; competencia: string; prefeituraId?: number; format?: "json" | "csv" }) =>
      this.request<AdminBateCarteiraResultado>("/v1/admin/bate-carteira", { method: "POST", body }),
    bateCarteiraCsvUrl: (): string => `${this.opts.baseUrl}/v1/admin/bate-carteira`,

    // Auditoria
    listAuditoria: (q?: { categoria?: AuditCategoria; cpf?: string; matricula?: string; proposta_id?: string; desde?: string; ate?: string; limit?: number }) =>
      this.request<{ entries: AdminAuditEntry[]; categorias: { value: AuditCategoria; label: string }[] }>("/v1/admin/auditoria", { query: q ?? {} }),

    // Perfis admin
    listPerfisAdmin: () =>
      this.request<{ usuarios: AdminAverbadoraUser[]; perfis: { value: AverbadoraPerfil; label: string; descricao: string }[] }>("/v1/admin/perfis"),
    upsertPerfilAdmin: (body: { id?: number; nome: string; email: string; perfil: AverbadoraPerfil; ativo: boolean; password?: string; twoFactorEnabled?: boolean }) =>
      this.request<{ usuario: AdminAverbadoraUser }>("/v1/admin/perfis", { method: "POST", body }),
    rotate2FA: (id: number) =>
      this.request<{ secret: string; otpauthUrl: string }>(`/v1/admin/perfis/${id}/2fa/rotate`, { method: "POST" }),
    disable2FA: (id: number) =>
      this.request<{ ok: boolean }>(`/v1/admin/perfis/${id}/2fa/disable`, { method: "POST" }),
    deletePerfilAdmin: (id: number) =>
      this.request<void>(`/v1/admin/perfis/${id}`, { method: "DELETE" }),
    listServidores: (q?: { prefeitura_id?: number; status?: string }) =>
      this.request<{ servidores: AdminServidor[]; total: number }>("/v1/admin/servidores", { query: q ?? {} }),
    updateServidor: (matricula: string, body: AdminServidorUpdate) =>
      this.request<{ servidor: AdminServidor }>(`/v1/admin/servidores/${matricula}`, { method: "PATCH", body }),
    listFolhas: () => this.request<{ folhas: AdminFolha[] }>("/v1/admin/folhas"),
    upsertFolha: (f: AdminFolhaInput) => this.request<{ folha: AdminFolha }>("/v1/admin/folhas", { method: "POST", body: f }),
    listComunicados: () => this.request<{ comunicados: { id: string; titulo: string; corpo: string; linkLabel?: string; linkHref?: string }[] }>("/v1/admin/comunicados"),
    health: () =>
      this.request<{ checks: { servico: string; uptime: number; p95: number; ok: boolean }[] }>("/v1/admin/health"),
    logs: (q?: { level?: "info" | "warn" | "error"; source?: string }) =>
      this.request<{ logs: { ts: string; level: "info" | "warn" | "error"; trace_id: string; message: string; source: string }[] }>("/v1/admin/logs", { query: q ?? {} }),
    listVitrine: () => this.request<{ banners: AdminBanner[] }>("/v1/admin/vitrine"),
    upsertBanner: (b: { id?: string; bancoId: number; titulo: string; imagemUrl?: string; ativo?: boolean }) =>
      this.request<{ banner: AdminBanner }>("/v1/admin/vitrine", { method: "POST", body: b }),

    // === API tokens ===
    listApiTokens: (filter?: { environment?: "production" | "sandbox"; audience?: ApiAudience }) =>
      this.request<{ tokens: AdminApiToken[]; scopesByAudience: Record<ApiAudience, ApiScope[]> }>("/v1/admin/api-tokens", { query: filter ?? {} }),
    createApiToken: (body: AdminApiTokenInput) =>
      this.request<{ token: AdminApiToken; plaintext: string; warning: string }>("/v1/admin/api-tokens", { method: "POST", body }),
    deleteApiToken: (id: string) =>
      this.request<void>(`/v1/admin/api-tokens/${id}`, { method: "DELETE" }),

    // === Webhooks ===
    listWebhooks: (environment?: "production" | "sandbox") =>
      this.request<{ webhooks: AdminWebhook[]; events: readonly string[] }>("/v1/admin/webhooks", { query: environment ? { environment } : {} }),
    createWebhook: (body: AdminWebhookInput) =>
      this.request<{ webhook: AdminWebhook; secret: string; warning: string }>("/v1/admin/webhooks", { method: "POST", body }),
    toggleWebhook: (id: string) =>
      this.request<{ webhook: AdminWebhook }>(`/v1/admin/webhooks/${id}/toggle`, { method: "PATCH" }),
    deleteWebhook: (id: string) =>
      this.request<void>(`/v1/admin/webhooks/${id}`, { method: "DELETE" }),
    webhookDeliveries: (id: string) =>
      this.request<{ deliveries: AdminWebhookDelivery[] }>(`/v1/admin/webhooks/${id}/deliveries`),
    fireWebhook: (body: { event: string; environment?: "production" | "sandbox"; payload?: Record<string, unknown> }) =>
      this.request<{ deliveries: number }>("/v1/admin/webhooks/fire", { method: "POST", body }),
    testWebhook: (id: string) =>
      this.request<{ deliveries: { id: string; event: string; status: "pending" | "success" | "failed"; httpStatus?: number; attempt: number; error?: string; deliveredAt?: string }[] }>(
        `/v1/admin/webhooks/${id}/test`,
        { method: "POST" },
      ),

    // === CSV import ===
    importCsv: (entity: "bancos" | "prefeituras" | "convenios" | "servidores", csv: string, params?: Record<string, string | number>) =>
      this.request<CsvImportOutcome>(`/v1/admin/${entity}/importar`, { method: "POST", body: { csv }, query: params }),
    csvTemplateUrl: (entity: "bancos" | "prefeituras" | "convenios" | "servidores"): string =>
      `${this.opts.baseUrl}/v1/admin/${entity}/csv-template`,
  };

  // ============ Prefeitura (portal completo) ============
  readonly prefeitura = {
    me: () => this.request<{ prefeitura: { id: number; nome: string; uf: string; municipioIbge: number; status: string } }>("/v1/prefeitura/me"),
    dashboard: () =>
      this.request<{
        prefeitura: { id: number; nome: string; uf: string };
        kpis: {
          servidores: number; servidoresAtivos: number; contratosAverbados: number; convenios: number; bancosAtuantes: number;
          descontosMes: number; margemTotal: number; margemComprometida: number; margemDisponivel: number; percentualUso: number;
        };
        folhaAtual: { competencia: string; status: string; dataCorte: string; dataRepasse: string | null } | null;
        pendencias: { folhasAbertas: number; servidoresSemConvenio: number; anuenciaPendente: number };
        folhas: { competencia: string; dataCorte: string; dataRepasse: string | null; status: string }[];
      }>("/v1/prefeitura/dashboard"),

    // Servidores (passos 3 e 6)
    servidores: (query?: { q?: string; vinculo?: string; situacao?: string }) =>
      this.request<{ servidores: PrefeituraServidor[]; total: number }>("/v1/prefeitura/servidores", { query: query ?? {} }),
    importarServidores: (csv: string) => this.request<CsvImportOutcome>("/v1/prefeitura/servidores/importar", { method: "POST", body: { csv } }),
    editarServidor: (matricula: string, patch: Partial<{ nome: string; cargo: string; endereco: string; matriculaNova: string; vinculo: string; email: string; telefone: string; codigoIbge: number }>) =>
      this.request<{ servidor: PrefeituraServidor }>(`/v1/prefeitura/servidores/${matricula}`, { method: "PATCH", body: patch }),
    servidoresCsvTemplateUrl: (): string => `${this.opts.baseUrl}/v1/prefeitura/servidores/csv-template`,

    // Folha (passo 4)
    folhas: () => this.request<{ folhas: (PrefeituraFolha & { movimentacoes: number })[] }>("/v1/prefeitura/folhas"),
    abrirFolha: (body: { competencia: string; dataCorte: string; dataRepasse?: string }) =>
      this.request<{ folha: PrefeituraFolha }>("/v1/prefeitura/folhas", { method: "POST", body }),
    atualizarFolha: (id: string, body: Partial<{ status: "aberta" | "fechada" | "consolidada"; dataCorte: string; dataRepasse: string | null }>) =>
      this.request<{ folha: PrefeituraFolha }>(`/v1/prefeitura/folhas/${id}`, { method: "PATCH", body }),
    movimentacoes: (folhaId: string) =>
      this.request<{ movimentacoes: { id: string; tipo: string; matricula: string; nome: string; detalhe: string; criadoEm: string }[] }>(`/v1/prefeitura/folhas/${folhaId}/movimentacoes`),
    enviarMovimentacao: (folhaId: string, csv: string) =>
      this.request<CsvImportOutcome>(`/v1/prefeitura/folhas/${folhaId}/movimentacao`, { method: "POST", body: { csv } }),
    movimentacaoCsvTemplateUrl: (): string => `${this.opts.baseUrl}/v1/prefeitura/folhas/movimentacao/csv-template`,

    // Convênios + config (passo 5)
    convenios: () => this.request<{ convenios: (PrefeituraConvenio & { prazoTravaHoras: number; prazoPortabilidadeDU: number; prefixo: string; formatoImportacao: string })[]; prefixo: string }>("/v1/prefeitura/convenios"),
    convenioConfig: (id: string) =>
      this.request<{ convenio: { id: string; nome: string; bancoNome: string }; config: { prazoTravaHoras: number; prazoPortabilidadeDU: number; maxComprometimentoPct: number; vinculosAceitos: string[]; formatoImportacao: string; regrasEspeciais: string; prefixo: string } }>(`/v1/prefeitura/convenios/${id}/config`),
    salvarConvenioConfig: (id: string, body: { prazoTravaHoras: number; prazoPortabilidadeDU: number; maxComprometimentoPct: number; vinculosAceitos: string[]; formatoImportacao: string; regrasEspeciais: string; prefixo: string }) =>
      this.request<{ config: unknown; prefixo: string }>(`/v1/prefeitura/convenios/${id}/config`, { method: "PUT", body }),

    // Contratos + tombamento (passo 7)
    contratos: () => this.request<{ contratos: PrefeituraContrato[]; total: number }>("/v1/prefeitura/contratos"),
    tombamentoLotes: () => this.request<{ lotes: { id: string; competencia: string; prefeitura: string; totalLinhas: number; inseridos: number; atualizados: number; divergencias: number; recebidoEm: string }[] }>("/v1/prefeitura/tombamento/lotes"),
    tombamentoLinhas: (loteId: string) => this.request<{ linhas: unknown[] }>(`/v1/prefeitura/tombamento/lotes/${loteId}/linhas`),
    importarTombamento: (csv: string, competencia: string) => this.request<{ lote: { id: string }; inseridos: number; atualizados: number; divergencias: number; erros: { line: number; message: string }[] }>("/v1/prefeitura/tombamento/importar", { method: "POST", body: { csv }, query: { competencia } }),
    tombamentoCsvTemplateUrl: (): string => `${this.opts.baseUrl}/v1/prefeitura/tombamento/csv-template`,

    // ADF / descontos em folha (passo 8)
    adfCompetencias: () => this.request<{ competencias: { competencia: string; total: number; aplicadas: number; falhas: number }[]; competenciaAtual: string }>("/v1/prefeitura/adf/competencias"),
    adf: (competencia?: string) => this.request<{ adfs: PrefeituraAdf[] }>("/v1/prefeitura/adf", { query: competencia ? { competencia } : {} }),
    adfCsvUrl: (competencia: string): string => `${this.opts.baseUrl}/v1/prefeitura/adf/${competencia}/download.csv`,
    adfPdfUrl: (competencia: string): string => `${this.opts.baseUrl}/v1/prefeitura/adf/${competencia}/lote.pdf`,
    confirmarAdf: (ids: string[]) => this.request<{ aplicadas: number }>("/v1/prefeitura/adf/confirmar", { method: "POST", body: { ids } }),
    reportarFalhaAdf: (ids: string[], motivo: string) => this.request<{ falhas: number }>("/v1/prefeitura/adf/falha", { method: "POST", body: { ids, motivo } }),

    // Relatórios (passo 9)
    relServidoresPorVinculo: () => this.request<{ dados: { vinculo: string; total: number }[] }>("/v1/prefeitura/relatorios/servidores-por-vinculo"),
    relMargemMedia: () => this.request<{ servidores: number; margemMediaTotal: number; margemMediaDisponivel: number; percentualUsoMedio: number }>("/v1/prefeitura/relatorios/margem-media"),
    relContratosPorBanco: () => this.request<{ dados: { banco: string; contratos: number; valorParcela: number }[] }>("/v1/prefeitura/relatorios/contratos-por-banco"),
    relInconsistencias: () => this.request<{ inconsistencias: { matricula: string; nome: string; problema: string }[]; total: number }>("/v1/prefeitura/relatorios/inconsistencias"),

    // Anuência (passo 10)
    anuencia: () => this.request<{ versaoAtual: string; termo: string; vigente: { id: string; versao: string; aceitoPor: string; aceitoEm: string } | null; historico: { id: string; versao: string; aceitoPor: string; aceitoEm: string; ip?: string }[] }>("/v1/prefeitura/anuencia"),
    aceitarAnuencia: (aceitoPor: string) => this.request<{ anuencia: { id: string } }>("/v1/prefeitura/anuencia", { method: "POST", body: { aceito: true, aceitoPor } }),

    // Perfis + 2FA (passo 1)
    perfis: () => this.request<{ perfis: PrefeituraPerfil[]; areas: { value: string; label: string }[] }>("/v1/prefeitura/perfis"),
    salvarPerfil: (body: { id?: number; nome: string; email: string; area: string; ativo?: boolean }) =>
      this.request<{ perfil: PrefeituraPerfil }>("/v1/prefeitura/perfis", { method: "POST", body }),
    excluirPerfil: (id: number) => this.request<void>(`/v1/prefeitura/perfis/${id}`, { method: "DELETE" }),
    rotate2fa: (id: number) => this.request<{ secret: string; otpauthUrl: string }>(`/v1/prefeitura/perfis/${id}/2fa/rotate`, { method: "POST" }),
    disable2fa: (id: number) => this.request<{ ok: boolean }>(`/v1/prefeitura/perfis/${id}/2fa/disable`, { method: "POST" }),

    comunicados: () => this.request<{ comunicados: { id: string; titulo: string; corpo: string; linkLabel?: string; linkHref?: string }[] }>("/v1/prefeitura/comunicados"),
  };

  // ============ Internal ============
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (!options.skipAuth) {
      const token = await this.storage.getAccess();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let res = await this.fetchImpl(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });

    if (res.status === 401 && !options.skipAuth) {
      const ok = await this.tryRefresh();
      if (ok) {
        const token2 = await this.storage.getAccess();
        if (token2) headers.Authorization = `Bearer ${token2}`;
        res = await this.fetchImpl(url, {
          method: options.method ?? "GET",
          headers,
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
          signal: options.signal,
        });
      } else {
        this.opts.onAuthFailure?.();
      }
    }

    if (!res.ok) {
      let code = "http_error";
      let message = `HTTP ${res.status}`;
      let details: unknown;
      try {
        const body = (await res.json()) as { error?: { code: string; message: string; details?: unknown } };
        if (body.error) {
          code = body.error.code;
          message = body.error.message;
          details = body.error.details;
        }
      } catch {
        // ignore parse error
      }
      throw new ApiHttpError(res.status, code, message, details);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  private async tryRefresh(): Promise<boolean> {
    if (this.refreshing) {
      await this.refreshing;
      return (await this.storage.getAccess()) !== null;
    }
    this.refreshing = (async () => {
      const refresh = await this.storage.getRefresh();
      if (!refresh) return;
      try {
        const res = await this.fetchImpl(this.buildUrl("/v1/auth/refresh"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        if (!res.ok) {
          await this.storage.clear();
          return;
        }
        const tok = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };
        await this.storage.set(tok);
      } catch {
        await this.storage.clear();
      }
    })();
    try { await this.refreshing; } finally { this.refreshing = null; }
    return (await this.storage.getAccess()) !== null;
  }

  private buildUrl(path: string, query?: RequestOptions["query"]): string {
    const url = new URL(path, this.opts.baseUrl);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }
}
