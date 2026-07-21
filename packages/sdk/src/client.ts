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
  /** Status do ADF na folha da prefeitura (cadeia banco→prefeitura). "aplicada" = a prefeitura confirmou o desconto em folha. */
  folhaStatus?: "recebida" | "aplicada" | "falha";
  folhaMotivo?: string;
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

export type BancoPerfil = "admin" | "operador" | "consulta" | "relatorios" | "personalizado";

export type TermoTipo =
  | "emprestimo" | "portabilidade" | "refinanciamento" | "cartao_consignado" | "cartao_beneficio"
  | "beneficio_generico" | "telemedicina" | "lgpd_servidor" | "anuencia_prefeitura"
  | "termos_uso" | "politica_privacidade";
export interface TermoTemplate {
  id: TermoTipo;
  titulo: string;
  descricao: string;
  variaveis: string[];
  corpo: string;
  versao: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}
/** Termo renderizado (com placeholders substituidos) — o que o servidor consome. */
export interface TermoRenderizado {
  id: TermoTipo;
  titulo: string;
  versao: string;
  /** Corpo pronto pra exibir (placeholders {{}} ja substituidos). */
  corpo: string;
}

export interface PortabilidadeOferta {
  id: string;
  bancoDestinoId: number;
  bancoDestinoNome: string;
  /** Taxa a.m. proposta (decimal, ex.: 0.0155 = 1,55%). */
  taxaAmProposta: number;
  novaParcela: number;
  novoPrazo: number;
  /** Economia estimada em R$ (parcela original × prazo restante − nova parcela × novo prazo). */
  economia: number;
  observacao?: string;
  ofertadaEm: string;
  status: "ativa" | "aceita" | "recusada" | "expirada";
}
export interface PortabilidadeIntencao {
  id: string;
  publicadaEm: string;
  expiraEm: string;
  status: "aberta" | "aceita" | "cancelada" | "expirada";
  aceitaOfertaId?: string;
  servidorNome: string;
  servidorMatricula: string;
  servidorCpfMasked: string;
  prefeituraId: number;
  prefeituraNome: string;
  convenioId: string;
  contratoAdfOrigem: string;
  bancoOrigemId: number;
  bancoOrigemNome: string;
  saldoDevedor: number;
  valorParcela: number;
  parcelasRestantes: number;
  totalParcelasOriginal: number;
  taxaAm: number;
  ofertas: PortabilidadeOferta[];
}

/** Categorias de beneficio. "telemedicina" separada de "saude" — cliente pediu
 *  aba exclusiva pra telemedicina na averbadora. */
export type CategoriaBeneficio =
  | "saude" | "alimentacao" | "educacao" | "lazer" | "telemedicina"
  | "academia" | "farmacia" | "supermercado";

/** Modo de exibicao das imagens no card do servidor. "unica" = 1 imagem fixa
 *  (estatica), "carrossel" = varias com navegacao. "nenhum" = so o icone. */
export type ModoImagens = "nenhum" | "unica" | "carrossel";

export interface LinkAcessoBeneficio {
  /** URL pra onde o botao leva. Deep-link (whatsapp://, tg://) ou https:// normal. */
  url: string;
  /** Texto do botao. Default: "Acessar". */
  textoBotao?: string;
}
export type OrigemBeneficio = "banco" | "averbadora" | "prefeitura" | "convenio";
export type TipoDesconto = "percentual" | "valor_fixo" | "preco_especial" | "gratuidade";
/** Como o servidor apresenta o beneficio no parceiro pra ganhar o desconto. */
export type ModoUso = "cartao_consignado" | "matricula" | "cpf" | "codigo" | "qr";
export type DestaqueBeneficio = "novo" | "popular" | "exclusivo" | "desconto_extra";

/** Endereco completo — opcional. Uma unidade fisica do parceiro. */
export interface EnderecoBeneficio {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

export interface ContatoBeneficio {
  telefone?: string;
  whatsapp?: string;
  email?: string;
  site?: string;
  instagram?: string;
}

export interface DescontoBeneficio {
  tipo: TipoDesconto;
  /** Valor numerico do desconto — % pra percentual, R$ pra valor_fixo, R$ do preco pra preco_especial, ignorado pra gratuidade. */
  valor?: number;
  aplicavelEm?: string; // Ex.: "medicamentos genericos", "todo o cardapio", "matriculas novas"
  limiteMensal?: number; // R$ (opcional — teto de uso mensal por servidor)
  cumulativo?: boolean; // Cumulativo com outros descontos?
}

export interface ComoUsarBeneficio {
  modo: ModoUso;
  /** Codigo/senha unico (ex.: "SERVIDOR2026") — quando modo=codigo. */
  codigoPromocional?: string;
  instrucoes?: string; // Texto livre pra explicar o passo-a-passo
}

export interface FiltroBeneficio {
  convenioIds?: string[];
  vinculos?: string[];
  situacaoFuncional?: string[];
  salarioMin?: number;
  salarioMax?: number;
  idadeMin?: number;
  idadeMax?: number;
}

export interface VigenciaBeneficio {
  inicio?: string; // ISO date
  fim?: string;    // ISO date — opcional (sem fim = permanente)
  diasSemana?: number[]; // 0=domingo, 6=sabado
  horaInicio?: string; // "HH:MM"
  horaFim?: string;
}

export interface ResponsavelBeneficio {
  nome?: string;
  email?: string;
  telefone?: string;
  cargo?: string;
}

/** Modelos de e-mail do sistema — categorizados por evento. */
export type EmailPublico = "servidor" | "banco" | "prefeitura" | "averbadora";
export type EmailEvento =
  | "primeiro_acesso"
  | "recuperar_senha"
  | "redefinir_senha"
  | "simulacao"
  | "beneficio";
export type EmailSimulacaoTipo = "emprestimo" | "cartao_consignado" | "cartao_beneficio" | "portabilidade";
export type EmailSimulacaoStatus = "enviada" | "aprovada" | "recusada" | "averbada";

export interface EmailTemplate {
  id: string;
  evento: EmailEvento;
  nome: string;
  publico: EmailPublico;
  assunto: string;
  corpo: string;
  descricao?: string;
  variaveis?: string[];
  ativo: boolean;
  simulacaoTipo?: EmailSimulacaoTipo;
  simulacaoStatus?: EmailSimulacaoStatus;
  beneficioId?: string;
  criadoEm: string;
  atualizadoEm: string;
}
/** Edicao: so muda assunto/corpo/descricao/variaveis/ativo. Os campos de
 *  categorizacao (evento, publico, tipo, status, beneficioId, nome) sao
 *  fixados pelo seed ou pelo hook de beneficio. */
export interface EmailTemplateInput {
  id: string;
  assunto?: string;
  corpo?: string;
  descricao?: string;
  variaveis?: string[];
  ativo?: boolean;
}

export interface AdminBeneficio {
  id: string;
  prefeituraId: number;
  nome: string;
  categorias: CategoriaBeneficio[];
  local: string;
  icone: string;
  cor: string;
  descontoLabel: string;
  descontoComplemento: string;
  origem: OrigemBeneficio;
  ativo: boolean;
  criadoEm: string;
  criadoPor: string;
  // ===== Campos opcionais estendidos (fatia "detalhes completos") =====
  cnpj?: string;
  descricaoCurta?: string;
  descricaoLonga?: string;
  logoUrl?: string;
  endereco?: EnderecoBeneficio;
  contato?: ContatoBeneficio;
  desconto?: DescontoBeneficio;
  comoUsar?: ComoUsarBeneficio;
  filtro?: FiltroBeneficio;
  vigencia?: VigenciaBeneficio;
  responsavel?: ResponsavelBeneficio;
  restricoes?: string;
  destaque?: DestaqueBeneficio;
  comissaoPct?: number; // Comissao da averbadora sobre o valor consumido
  notasInternas?: string; // Apenas admin ve
  prefeituraIdsExtras?: number[]; // Multi-prefeitura — beneficio aparece em varias
  /** Obrigatorio quando origem="banco": qual banco parceiro oferece o beneficio. */
  bancoId?: number;
  /** Obrigatorio quando origem="convenio": qual convenio da prefeitura. */
  convenioId?: string;
  /** URLs das imagens exibidas no card do servidor. Combinado com modoImagens. */
  imagens?: string[];
  /** Como as imagens aparecem: "nenhum" (default) / "unica" / "carrossel". */
  modoImagens?: ModoImagens;
  /** Botao "Acessar" que aparece no card do servidor — leva pro site/app do parceiro. */
  linkAcesso?: LinkAcessoBeneficio;
  /** Se true, o beneficio aparece em TODAS as prefeituras parceiras — incluindo
   *  as cadastradas no futuro. Prevalece sobre prefeituraIdsExtras. */
  todasPrefeiturasParceiras?: boolean;
  /** Compromisso minimo em meses. 0/undefined = sem compromisso. */
  duracaoMinimaMeses?: number;
}
export interface AdminBeneficioInput {
  id?: string;
  prefeituraId: number;
  nome: string;
  categorias: CategoriaBeneficio[];
  local: string;
  icone: string;
  cor: string;
  descontoLabel: string;
  descontoComplemento: string;
  origem: OrigemBeneficio;
  ativo?: boolean;
  cnpj?: string;
  descricaoCurta?: string;
  descricaoLonga?: string;
  logoUrl?: string;
  endereco?: EnderecoBeneficio;
  contato?: ContatoBeneficio;
  desconto?: DescontoBeneficio;
  comoUsar?: ComoUsarBeneficio;
  filtro?: FiltroBeneficio;
  vigencia?: VigenciaBeneficio;
  responsavel?: ResponsavelBeneficio;
  restricoes?: string;
  destaque?: DestaqueBeneficio;
  comissaoPct?: number;
  notasInternas?: string;
  prefeituraIdsExtras?: number[];
  bancoId?: number;
  convenioId?: string;
  imagens?: string[];
  modoImagens?: ModoImagens;
  linkAcesso?: LinkAcessoBeneficio;
  todasPrefeiturasParceiras?: boolean;
  /** Compromisso minimo em meses. 0/undefined = sem compromisso. */
  duracaoMinimaMeses?: number;
}
export interface ServidorBeneficio {
  id: string;
  nome: string;
  categorias: CategoriaBeneficio[];
  local: string;
  icone: string;
  cor: string;
  descontoLabel: string;
  descontoComplemento: string;
  origem: OrigemBeneficio;
  descricaoCurta?: string;
  contato?: ContatoBeneficio;
  destaque?: DestaqueBeneficio;
  /** Nome do banco parceiro (quando origem=banco). Ex.: "DELTA GLOBAL". */
  bancoNome?: string;
  /** Nome do convenio (quando origem=convenio). Ex.: "PALHOCA / DELTA GLOBAL". */
  convenioNome?: string;
  imagens?: string[];
  modoImagens?: ModoImagens;
  linkAcesso?: LinkAcessoBeneficio;
  /** Compromisso minimo em meses (telemedicina padrao = 12). */
  duracaoMinimaMeses?: number;
}

export interface BancoOfertaFiltro {
  convenioIds?: string[];
  vinculos?: string[];
  situacaoFuncional?: string[];
  prefeituraIds?: number[];
  salarioMin?: number;
  salarioMax?: number;
  idadeMin?: number;
  idadeMax?: number;
}
/** Produto ofertado pelo banco. */
export type BancoOfertaTipo =
  | "credito_novo"
  | "portabilidade"
  | "refinanciamento"
  | "cartao_consignado"
  | "cartao_beneficio";

export interface BancoOferta {
  id: string;
  bancoId: number;
  titulo: string;
  mensagem: string;
  taxaAm: number;
  parcelasMax: number;
  valorMax: number;
  filtro: BancoOfertaFiltro;
  ativo: boolean;
  criadoEm: string;
  expiraEm?: string;
  criadoPor: string;
  /** Emoji tematico opcional (ex.: "🔥", "🏠", "🎓"). */
  icone?: string;
  /** Produto ofertado. Default: "credito_novo". */
  tipo?: BancoOfertaTipo;
}
export interface BancoOfertaInput {
  id?: string;
  titulo: string;
  mensagem: string;
  taxaAm: number;
  parcelasMax: number;
  valorMax: number;
  filtro?: BancoOfertaFiltro;
  ativo?: boolean;
  expiraEm?: string;
  icone?: string;
  tipo?: BancoOfertaTipo;
}
export interface ServidorOfertaBanco {
  id: string;
  bancoId: number;
  bancoNome: string;
  titulo: string;
  mensagem: string;
  taxaAm: number;
  parcelasMax: number;
  valorMax: number;
  criadoEm: string;
  expiraEm: string | null;
  icone: string | null;
  tipo: BancoOfertaTipo;
}

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
  /** Fonte de verdade da autorizacao. "*" = wildcard (admin). */
  permissoes: string[];
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
  /** Preset escolhido (label). Opcional — deriva de permissoes se ausente. */
  perfil?: BancoPerfil;
  /** Fonte de verdade da autorizacao. */
  permissoes?: string[];
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
  // Dados oficiais preenchidos pela consulta CNPJ (BrasilAPI + fallback).
  cnpj?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  dataFundacao?: string;
  atividade?: string;
  telefone?: string;
  endereco?: AdminPrefeituraEndereco;
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
  cnpj?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  dataFundacao?: string;
  atividade?: string;
  telefone?: string;
  endereco?: AdminPrefeituraEndereco;
}

export interface AdminPrefeituraEndereco {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  municipio?: string;
  uf?: string;
}

export interface AdminPrefeitura {
  id: number;
  nome: string;
  uf: string;
  municipioIbge: number;
  modoIntegracao: "REST" | "SOAP" | "CSV" | "MANUAL";
  status: "ativo" | "pausado" | "inativo";
  loginEmail?: string;
  contatoEmail?: string;
  hasPassword: boolean;
  servidoresCount: number;
  ultimaSincronizacao?: string;
  folhaSincUrl?: string;
  ultimaSincResultado?: { novos: number; atualizados: number; erro?: string; ts: string };
  /** Se true, servidor pode editar contato (email/telefone) pelo app. Default false. */
  permiteServidorEditarContato?: boolean;
  /** Texto livre com exclusividades do cartão consignado desta prefeitura. */
  exclusividadesCartaoConsig?: string;
  // Dados oficiais preenchidos pela consulta CNPJ (BrasilAPI = Receita + Junta Comercial).
  cnpj?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  dataFundacao?: string;
  atividade?: string;
  telefone?: string;
  endereco?: AdminPrefeituraEndereco;
}

export interface AdminPrefeituraInput {
  id?: number;
  nome: string;
  uf: string;
  municipioIbge: number;
  modoIntegracao: "REST" | "SOAP" | "CSV" | "MANUAL";
  status: "ativo" | "pausado" | "inativo";
  loginEmail?: string;
  contatoEmail?: string;
  password?: string;
  servidoresCount?: number;
  folhaSincUrl?: string;
  permiteServidorEditarContato?: boolean;
  exclusividadesCartaoConsig?: string;
  cnpj?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  dataFundacao?: string;
  atividade?: string;
  telefone?: string;
  endereco?: AdminPrefeituraEndereco;
}

/** Retorno cru da consulta CNPJ (BrasilAPI). Frontend extrai o que precisa. */
export interface CnpjLookupResponse {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  data_inicio_atividade?: string;
  cnae_fiscal_descricao?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  municipio?: string;
  uf?: string;
  codigo_municipio_ibge?: number;
  ddd_telefone_1?: string;
  email?: string;
  descricao_situacao_cadastral?: string;
  [k: string]: unknown;
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
  ativo: boolean;
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
  nome?: string;
  totalParcelas?: number;
  valorEmprestimo?: number;
  statusContrato?: string;
  motivo?: string;
  tipo?: string;
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

/** Cotacao de telemedicina solicitada por um servidor (banner de Beneficios). */
export interface TelemedicinaCotacao {
  id: string;
  nome: string;
  cpfMasked: string;
  telefone: string;
  email: string;
  matricula: string;
  prefeitura: string;
  situacao: string;
  criadoEm: string;
  ativadoEm?: string | null;
  /** Contrato anexado pela averbadora — pre-requisito para ativar o plano. */
  temContrato?: boolean;
  contratoNome?: string | null;
}

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

/** Rotulo do preset escolhido — apenas display. Fonte de verdade da autorizacao
 *  e `permissoes: string[]`. */
export type AverbadoraPerfil = "operador" | "supervisor" | "comercial" | "financeiro" | "auditoria" | "personalizado";

export interface AdminAverbadoraUser {
  id: number;
  nome: string;
  email: string;
  perfil: AverbadoraPerfil;
  /** Fonte de verdade — array de resource keys. "*" = wildcard (supervisor). */
  permissoes: string[];
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
  /** DD/MM/AAAA — do CSV importado. Formato livre (nao normalizamos). */
  dataAdmissao?: string;
  dataNascimento?: string;
  /** true se o servidor já tem senha cadastrada; o plaintext nunca é retornado. */
  hasPassword: boolean;
  /** Campos custom por prefeitura (config em admin_servidor_campos_configs).
   *  Chave = key do campo (`custom_<slug>`). */
  camposCustom?: Record<string, string>;
}

export type ServidorCampoTipo = "texto" | "numero" | "data" | "moeda" | "email" | "telefone";
export interface ServidorCampoConfig {
  key: string;
  label: string;
  tipo: ServidorCampoTipo;
  obrigatorio: boolean;
  visivel: boolean;
  ordem: number;
  sistema: boolean;
  travado?: boolean;
}
export interface ServidorCamposConfig {
  prefeituraId: number;
  campos: ServidorCampoConfig[];
  atualizadoEm: string;
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
  // A averbadora NAO pode editar a senha do servidor. A senha e' alterada
  // exclusivamente pelo proprio servidor via /v1/servidores/me/senha
  // (com verificacao por email). Campo removido do tipo — se algum caller
  // antigo enviar `password`, o zod do handler rejeita.
}

export interface AdminFolha {
  id: string;
  prefeituraId: number;
  prefeitura: string;
  competencia: string;
  dataCorte: string;
  dataRepasse: string | null;
  status: "aberta" | "fechada" | "consolidada";
  /** ADFs materializadas nessa competencia+prefeitura. Enriquecidas
   *  no /v1/admin/folhas — permite a averbadora ver descontos que caiam
   *  em cada folha direto na lista, sem sair da tela. */
  adfsAplicadas?: number;
  adfsRecebidas?: number;
  adfsTotal?: number;
  valorAplicado?: number;
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

export type ComunicadoPublico = "banco" | "servidor" | "prefeitura";

export interface Comunicado {
  id: string;
  titulo: string;
  corpo: string;
  linkLabel?: string;
  linkHref?: string;
  publico: ComunicadoPublico;
}

export interface ComunicadoInput {
  id?: string;
  titulo: string;
  corpo: string;
  linkLabel?: string;
  linkHref?: string;
  publico: ComunicadoPublico;
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
  /** Pause MANUAL individual (ação do admin). Token não autentica, mas o perfil/parceria dono continua ativo. Só some com "reativar token". */
  pausedAt?: string;
  /** Derivado: o banco dono está pausado (status != ativo). Token fica inativo junto, mas volta sozinho ao reativar o banco. */
  bancoInativo?: boolean;
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
  cpf: string;
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
  /** Valor total financiado (parcela x total parcelas). */
  valorFinanciado?: number;
  /** EMPRESTIMO | REFIN | ECONSIGNADO — a averbadora rotula como
   *  Empréstimo / Portabilidade / Cartão respectivamente. */
  tipoContrato?: string;
  status: "recebida" | "aplicada" | "falha";
  motivo?: string;
  /** ISO. Recentes primeiro na UI (bumpa a cada troca de status). */
  atualizadoEm?: string;
}
export type PrefeituraArea = "rh" | "financeiro" | "gestor" | "personalizado";
export interface PrefeituraPerfil {
  id: number;
  prefeituraId: number;
  nome: string;
  email: string;
  area: PrefeituraArea;
  /** Fonte de verdade da autorizacao. "*" = wildcard (gestor). */
  permissoes: string[];
  ativo: boolean;
  twofaEnabled: boolean;
  hasTotp: boolean;
}
export interface PrefeituraPerfilInput {
  id?: number;
  nome: string;
  email: string;
  /** Preset escolhido (label). Opcional. */
  area?: PrefeituraArea;
  /** Fonte de verdade. Opcional — deriva do preset. */
  permissoes?: string[];
  ativo?: boolean;
}
export interface PrefeituraFolha {
  id: string;
  prefeituraId: number;
  prefeitura: string;
  competencia: string;
  dataCorte: string;
  dataRepasse: string | null;
  status: "aberta" | "fechada" | "consolidada";
  /** Contagem e soma das ADFs materializadas nessa folha (enviadas pela
   *  averbadora). Permite a prefeitura ver os descontos que precisa aplicar
   *  na competencia direto na lista. */
  adfsAplicadas?: number;
  adfsRecebidas?: number;
  adfsTotal?: number;
  valorAplicado?: number;
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
  /** Linhas que passaram na validacao mas o INSERT no PG falhou. Import
   *  reporta inserted/updated com base na memoria — se aqui vier != vazio,
   *  a linha nao ficou persistida e some no proximo reload. */
  persistFailures?: { matricula: string; message: string }[];
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
  /** Quando true, `body` e enviado como esta (ex.: FormData). Sem JSON.stringify + sem Content-Type manual (o fetch seta multipart/form-data com boundary). */
  isFormData?: boolean;
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
  /** Login. Se o usuario tem 2FA ativo, resposta e `{ requires_2fa: true, mfa_token }`
   *  — nenhum token e persistido no storage. O caller precisa chamar verify2fa() com
   *  o mfa_token e o codigo TOTP pra concluir o login. */
  async login(req: LoginRequest): Promise<AuthSuccess | { requires_2fa: true; mfa_token: string; hint?: string }> {
    const res = await this.request<AuthSuccess | { requires_2fa: true; mfa_token: string; hint?: string }>(
      "/v1/auth/login", { method: "POST", body: req, skipAuth: true },
    );
    if ("requires_2fa" in res && res.requires_2fa) {
      // Nao persiste — o access_token ainda nao existe.
      return res;
    }
    const ok = res as AuthSuccess;
    await this.storage.set({ access_token: ok.access_token, refresh_token: ok.refresh_token, expires_in: ok.expires_in });
    return ok;
  }
  /** Conclui o login apos o passo de 2FA — troca (mfa_token, code) por access+refresh. */
  async verify2fa(mfa_token: string, code: string): Promise<AuthSuccess> {
    const res = await this.request<AuthSuccess>(
      "/v1/auth/verify-2fa", { method: "POST", body: { mfa_token, code }, skipAuth: true },
    );
    await this.storage.set({ access_token: res.access_token, refresh_token: res.refresh_token, expires_in: res.expires_in });
    return res;
  }

  /** Self-service do usuario autenticado. Cobre 2FA hoje. */
  readonly me = {
    twoFactor: {
      /** Status atual — { enabled, account }. */
      status: () => this.request<{ enabled: boolean; account: string }>("/v1/me/2fa"),
      /** Comeca setup — gera secret novo (nao persiste) + otpauth pro QR. */
      setup: () =>
        this.request<{ secret: string; otpauth: string; account: string; issuer: string; instrucoes: string[] }>(
          "/v1/me/2fa/setup",
          { method: "POST" },
        ),
      /** Confirma o setup com o codigo TOTP — so aqui persiste. */
      confirm: (code: string) =>
        this.request<{ ok: true; enabled: true }>("/v1/me/2fa/confirm", { method: "POST", body: { code } }),
      /** Desativa 2FA (precisa do codigo atual). */
      disable: (code: string) =>
        this.request<{ ok: true; enabled: false }>("/v1/me/2fa/disable", { method: "POST", body: { code } }),
    },
  };

  // ===== Recuperar senha do servidor (fluxo antigo, CPF-only — mantido pra retrocompat) =====
  readonly esqueciSenha = {
    solicitar: (cpf: string) =>
      this.request<{ enviado: boolean; destino: string; codigo_teste?: string; aviso?: string }>(
        "/v1/auth/esqueci-senha/solicitar", { method: "POST", body: { cpf }, skipAuth: true }),
    redefinir: (cpf: string, codigo: string, senha: string) =>
      this.request<{ ok: boolean }>(
        "/v1/auth/esqueci-senha/redefinir", { method: "POST", body: { cpf, codigo, senha }, skipAuth: true }),
    /** Universal: aceita CPF (servidor) ou e-mail (banco/prefeitura/averbadora). */
    universalSolicitar: (identifier: string) =>
      this.request<{
        enviado: boolean;
        destino: string;
        perfil?: "servidor" | "banco" | "prefeitura" | "averbadora";
        codigo_teste?: string;
        aviso?: string;
      }>("/v1/auth/esqueci-senha/universal-solicitar", { method: "POST", body: { identifier }, skipAuth: true }),
    universalRedefinir: (identifier: string, codigo: string, senha: string) =>
      this.request<{ ok: boolean; perfil: "servidor" | "banco" | "prefeitura" | "averbadora" }>(
        "/v1/auth/esqueci-senha/universal-redefinir",
        { method: "POST", body: { identifier, codigo, senha }, skipAuth: true },
      ),
  };

  // ===== Primeiro acesso do servidor (ativa a conta a partir do cadastro da prefeitura) =====
  readonly primeiroAcesso = {
    buscar: (cpf: string) =>
      this.request<{ encontrado: boolean; nome?: string; matricula?: string; cargo?: string | null; origem?: string | null; email_masked?: string; telefone_masked?: string; ja_tem_senha?: boolean }>(
        "/v1/auth/primeiro-acesso/buscar", { method: "POST", body: { cpf }, skipAuth: true }),
    /** Servidor escolhe email + senha + telefone; codigo vai pra esse email. */
    codigo: (cpf: string, email: string, senha: string, telefone: string) =>
      this.request<{ enviado: boolean; destino: string; codigo_teste?: string; aviso?: string }>(
        "/v1/auth/primeiro-acesso/codigo", { method: "POST", body: { cpf, email, senha, telefone }, skipAuth: true }),
    /** Confirma o codigo — grava passwordHash + o novo email no servidor. */
    confirmar: (cpf: string, codigo: string) =>
      this.request<{ ok: boolean }>(
        "/v1/auth/primeiro-acesso/senha", { method: "POST", body: { cpf, codigo }, skipAuth: true }),
  };

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

  // ============ Confirmação por código (step-up, qualquer persona) ============
  // Envia um código de 6 dígitos para o e-mail cadastrado de quem está operando
  // e devolve o destino para o front avisar "código enviado para <e-mail>".
  readonly confirmacao = {
    solicitar: (acao: string, recurso?: string) =>
      this.request<{
        challengeId: string;
        destino: string;
        emailMascarado: string;
        enviado: boolean;
        motivo?: string;
        codigoDemo: string;
        expiraEmSegundos: number;
      }>("/v1/confirmacao/solicitar", { method: "POST", body: { acao, recurso } }),
    verificar: (challengeId: string, codigo: string) =>
      this.request<{ ok: boolean }>("/v1/confirmacao/verificar", { method: "POST", body: { challengeId, codigo } }),
  };

  // ============ Portabilidade marketplace ============
  // Averbadora armazena a intencao (dados vindos do contrato origem). Bancos
  // concorrentes veem e ofertam. Servidor aceita a melhor.
  readonly portabilidade = {
    // === Servidor ===
    minhas: () =>
      this.request<{ intencoes: PortabilidadeIntencao[] }>("/v1/servidores/me/portabilidade"),
    publicar: (adf: string) =>
      this.request<{ intencao: PortabilidadeIntencao }>("/v1/servidores/me/portabilidade", { method: "POST", body: { adf } }),
    cancelar: (id: string) =>
      this.request<{ intencao: PortabilidadeIntencao }>(`/v1/servidores/me/portabilidade/${id}/cancelar`, { method: "POST" }),
    aceitar: (id: string, ofertaId: string) =>
      this.request<{ intencao: PortabilidadeIntencao }>(`/v1/servidores/me/portabilidade/${id}/aceitar`, { method: "POST", body: { ofertaId } }),

    // === Banco ===
    oportunidadesBanco: () =>
      this.request<{ intencoes: PortabilidadeIntencao[] }>("/v1/portal/banco/portabilidade"),
    ofertar: (id: string, body: { taxaAmProposta: number; novaParcela: number; novoPrazo: number; observacao?: string }) =>
      this.request<{ intencao: PortabilidadeIntencao; oferta: PortabilidadeOferta }>(`/v1/portal/banco/portabilidade/${id}/ofertar`, { method: "POST", body }),

    // === Averbadora (visao global) ===
    todas: () =>
      this.request<{ intencoes: PortabilidadeIntencao[] }>("/v1/admin/portabilidade"),
  };

  // ============ Servidor (marketplace + demais consultas do proprio servidor) ============
  readonly servidor = {
    /** Marketplace de ofertas — derivado das tabelas de emprestimo publicadas pelos bancos.
     *  Passe `matricula` pra filtrar so ofertas dos convenios da prefeitura dessa matricula
     *  (evita servidor de Palhoca ver oferta que so vale em Florianopolis). */
    ofertas: (matricula?: string) =>
      this.request<{
        ofertas: {
          id: string;
          bancoNome: string;
          convenioId: string;
          convenio: string;
          cidade: string;
          taxaMinAm: number;
          taxaMaxAm: number;
          prazoMaxMeses: number;
          vigenciaInicio: string;
          vigenciaFim: string | null;
        }[];
      }>(matricula ? `/v1/servidores/me/ofertas?matricula=${encodeURIComponent(matricula)}` : "/v1/servidores/me/ofertas"),
    /** Ofertas ativas criadas pelos bancos que casam com o perfil do servidor.
     *  Passe `matricula` pra respeitar a matricula ativa no switcher (senao usa
     *  a do login, o que confunde quem tem acumulacao de cargos). */
    getMyOfertasBanco: (matricula?: string) =>
      this.request<{ ofertas: ServidorOfertaBanco[] }>(
        matricula ? `/v1/servidores/me/ofertas-banco?matricula=${encodeURIComponent(matricula)}` : "/v1/servidores/me/ofertas-banco",
      ),
    /** Beneficios/descontos da prefeitura do servidor. Passe matricula pra respeitar
     *  o switcher (senao usa a prefeitura do JWT, que fixa a matricula do login). */
    getMyBeneficios: (categoria?: CategoriaBeneficio, matricula?: string) =>
      this.request<{ beneficios: ServidorBeneficio[] }>(
        "/v1/servidores/me/beneficios",
        {
          query: {
            ...(categoria ? { categoria } : {}),
            ...(matricula ? { matricula } : {}),
          },
        },
      ),
    /** Servidor solicita uma proposta (pré-reserva) — CRIA no store do banco (o banco recebe). */
    criarProposta: (
      input: { valor: number; parcelas: number; taxaAm: number; matricula?: string; bancoNome?: string; tipo?: "novo" | "portabilidade" | "refinanciamento" },
      opts?: { signal?: AbortSignal },
    ) =>
      this.request<{ id: string; situacao: string; banco: string; valor: number; parcelas: number; parcela: number; expira_em: string | null }>(
        "/v1/servidores/me/propostas",
        { method: "POST", body: input, signal: opts?.signal },
      ),
    /** Registra o clique do servidor no botao "Acessar" de um beneficio.
     *  Best-effort — o botao abre a URL de qualquer jeito (nao bloqueia se falhar). */
    registrarCliqueBeneficio: (beneficioId: string, input?: { matricula?: string; origemTela?: string }) =>
      this.request<{ ok: true; deduplicado?: boolean }>(
        `/v1/servidores/me/beneficios/${encodeURIComponent(beneficioId)}/clique`,
        { method: "POST", body: input ?? {} },
      ),
    /** Solicita cotacao de telemedicina — a averbadora recebe os dados do servidor
     *  (principalmente o telefone) pra entrar em contato e formalizar o plano. */
    solicitarCotacaoTelemedicina: (input?: { matricula?: string }) =>
      this.request<{ ok: true; id?: string; deduplicado?: boolean }>(
        "/v1/servidores/me/telemedicina/cotacao",
        { method: "POST", body: input ?? {} },
      ),
    /** Cotacoes de telemedicina DO PROPRIO servidor — pra esconder o botao (mostra
     *  "em analise") e listar na aba Em Analise. */
    minhasCotacoesTelemedicina: () =>
      this.request<{ cotacoes: { id: string; situacao: string; criadoEm: string; ativadoEm?: string | null }[] }>(
        "/v1/servidores/me/telemedicina/cotacoes",
      ),
    /** Vitrine (carrossel) mostrada no dashboard do servidor — banners ativos
     *  cadastrados pela averbadora em /averbadora/vitrine. */
    vitrine: () =>
      this.request<{ banners: { id: string; titulo: string; bancoNome: string; imagemUrl: string | null }[] }>(
        "/v1/servidores/me/vitrine",
      ),
    /** Solicita cartao consignado ou cartao beneficio. Nao cria contrato tradicional
     *  (o modelo ainda so aceita EMPRESTIMO/REFIN/ECONSIGNADO) — registra a
     *  solicitacao pra averbadora e devolve um protocolo. O banco recebe pra
     *  emitir/ativar o cartao via canal proprio (padrao do mercado). */
    solicitarCartao: (
      input: {
        produto: "cartao_consignado" | "cartao_beneficio";
        bancoNome: string;
        limite: number;
        matricula?: string;
        ofertaId?: string;
      },
      opts?: { signal?: AbortSignal },
    ) =>
      this.request<{
        ok: true;
        protocolo: string;
        produto: "cartao_consignado" | "cartao_beneficio";
        bancoNome: string;
        limite: number;
        mensagem: string;
      }>("/v1/servidores/me/cartoes", { method: "POST", body: input, signal: opts?.signal }),
    /** Propostas/pré-reservas do próprio servidor (mesma fonte que o banco lê).
     *  Filtra pela matrícula ativa quando informada — evita misturar histórico
     *  entre matrículas de servidor com acumulação de cargos. */
    /** Comunicados publicados pela averbadora com publico=servidor (usados no carrossel do dashboard). */
    comunicados: () => this.request<{ comunicados: Comunicado[] }>("/v1/servidores/me/comunicados"),
    /** Baixa o CCB (contrato assinado que o banco anexou) como Blob. Envia
     *  Authorization Bearer. Lanca erro com status HTTP e reason (extraido do
     *  body JSON quando o backend explica a causa) — o front distingue os
     *  varios 404 (banco nao anexou vs contrato nao achado vs arquivo sumiu). */
    baixarContratoCcb: async (adf: string): Promise<Blob> => {
      const token = await this.storage.getAccess();
      const url = new URL(`/v1/servidores/me/contratos/${adf}/ccb.pdf`, this.opts.baseUrl).toString();
      const res = await this.fetchImpl(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) {
        let reason: string | undefined;
        try {
          const body = await res.json() as { reason?: string };
          reason = body?.reason;
        } catch { /* body nao era JSON — sem reason */ }
        const err = new Error(`Falha ao baixar contrato (${res.status}${reason ? ` — ${reason}` : ""})`) as Error & { status?: number; reason?: string };
        err.status = res.status;
        if (reason) err.reason = reason;
        throw err;
      }
      return await res.blob();
    },
    propostas: (matricula?: string) =>
      this.request<{ propostas: {
        id: string; banco: string; valor: number; parcelas: number; parcela: number; taxaAm: number;
        situacao: string; tipoContrato?: string;
        /** Bucket de margem — distingue Cartao Consignado de Cartao Beneficio
         *  quando tipoContrato=ECONSIGNADO. Valores: EMPRESTIMO | CARTAO_CONSIGNADO | CARTAO_BENEFICIOS. */
        tipoMargem?: "EMPRESTIMO" | "CARTAO_CONSIGNADO" | "CARTAO_BENEFICIOS";
        /** Dados da portabilidade (quando REFIN — o banco intenciona substituir o contrato). */
        bancoOrigem?: string; contratoOrigem?: string; saldoDevedorOrigem?: number;
        folhaStatus?: "recebida" | "aplicada" | "falha"; folhaMotivo?: string;
        data: string; expira_em: string | null;
        /** Observacoes do contrato — usado no front pra detectar telemedicina
         *  ("Plano de Telemedicina — ...") e trocar o rotulo/passo-a-passo. */
        observacoes?: string;
        /** Timestamps ISO 8601 exatos (com hora/min/seg). Null pra propostas antigas
         *  criadas antes da mudanca — nesse caso o cliente cai no parse de `data`
         *  e `expira_em` (que so tem DD/MM/YYYY). */
        criado_em_iso?: string | null; expira_em_iso?: string | null;
      }[] }>(
        "/v1/servidores/me/propostas",
        { query: matricula ? { matricula } : undefined },
      ),
    /** Redefinicao direta (sem codigo por e-mail) — DEPRECIADA em favor de
     *  pedirCodigoSenha + confirmarNovaSenha. Mantida no SDK pra outros
     *  clientes (ex.: mobile) que ainda usem. */
    redefinirSenha: (input: { senhaAtual: string; novaSenha: string }) =>
      this.request<{ ok: true }>("/v1/servidores/me/senha/redefinir", {
        method: "POST",
        body: { senha_atual: input.senhaAtual, nova_senha: input.novaSenha },
      }),
    /** Passo 1 do fluxo com verificacao por e-mail: pede o backend gerar um
     *  codigo de 6 digitos e enviar pro e-mail cadastrado. Modo teste (SMTP
     *  nao configurado) devolve o codigo direto no campo `codigo_teste`. */
    pedirCodigoSenha: () =>
      this.request<{ enviado: boolean; destino: string; codigo_teste?: string; aviso?: string }>(
        "/v1/servidores/me/codigo",
        { method: "POST" },
      ),
    /** Passo 2: valida senha atual + codigo do e-mail e persiste a nova senha.
     *  Backend recusa se codigo estiver invalido/expirado (401) ou senha atual
     *  errada (401). Depois de sucesso o codigo e removido do KV. */
    confirmarNovaSenha: (input: { senhaAtual: string; novaSenha: string; codigo: string }) =>
      this.request<{ ok: true }>("/v1/servidores/me/senha", {
        method: "POST",
        body: { senha_atual: input.senhaAtual, nova_senha: input.novaSenha, codigo: input.codigo },
      }),
    /** Cancela um codigo pendente (deleta do KV). Chamado quando o usuario
     *  clica "Cancelar" apos ja ter pedido o codigo — evita reuso posterior.
     *  Vale tanto pro fluxo de senha quanto pro fluxo de contato — mesma chave
     *  no KV (`chg:${cpf}`). */
    cancelarCodigoSenha: () =>
      this.request<{ ok: true }>("/v1/servidores/me/codigo", { method: "DELETE" }),
    /** Passo 2 do fluxo de contato: valida o codigo + persiste e-mail/telefone.
     *  Fluxo:
     *  1) pedirCodigoSenha() envia o codigo (endpoint compartilhado com senha).
     *  2) Usuario digita.
     *  3) atualizarContato({ codigo, email, telefone }) grava.
     *  Backend recusa se codigo estiver invalido/expirado (401). Sucesso remove
     *  o codigo do KV automaticamente. */
    atualizarContato: (input: { codigo: string; email?: string; telefone?: string }) =>
      this.request<{ ok: boolean; email?: string; telefone?: string }>("/v1/servidores/me/contato", {
        method: "POST",
        body: { codigo: input.codigo, email: input.email, telefone: input.telefone },
      }),
    /** Le o termo renderizado (placeholders substituidos com vars). Fonte: /averbadora/termos. */
    getTermo: (tipo: TermoTipo, vars?: Record<string, string | number>) => {
      const query: Record<string, string> = {};
      if (vars && Object.keys(vars).length > 0) query.vars = JSON.stringify(vars);
      return this.request<{ termo: TermoRenderizado }>(`/v1/servidores/me/termos/${tipo}`, { query });
    },
    /** Lista todos os termos ativos em vigencia (metadados, sem corpo). Usado
     *  na tela Conta > Suporte pra o servidor conferir o que esta vigente. */
    listTermos: () => this.request<{
      termos: { id: TermoTipo; titulo: string; descricao: string; versao: string; atualizadoEm: string }[];
    }>("/v1/servidores/me/termos"),
    /** Info de suporte (email/whatsapp/horario/frase de abertura) que a averbadora
     *  edita em /averbadora/suporte. Servidor usa no modal de Conta > Suporte. */
    getSuporte: () => this.request<{ email: string; whatsapp: string; horario: string; mensagem: string }>(
      "/v1/servidores/me/suporte",
    ),
  };

  // ============ Portal Banco ============
  readonly banco = {
    me: () => this.request<{ id: number; nome: string }>("/v1/portal/banco/me"),
    convenios: () => this.request<{ convenios: { id: string; nome: string; prefeitura: string; uf: string; exigeCcb: boolean; exigeBanco2FA: boolean; maxParcelas: number }[]; activeId: string }>("/v1/portal/banco/convenios"),
    setConvenioAtivo: (convenioId: string) =>
      this.request<{ activeId: string }>("/v1/portal/banco/convenio-ativo", { method: "POST", body: { convenioId } }),
    visaoGeral: () =>
      this.request<{
        convenio: { id: string; nome: string; prefeitura: string };
        kpis: {
          carteira: { count: number; percentual: number };
          novosNoMes: { count: number };
          pendencias: { count: number };
          propostas: { emAnalise: number; aprovadas: number; formalizadas: number; recusadasExpiradas: number };
          volumePorConvenio: { nome: string; valor: number }[];
        };
        dataCorte: { dia: number; mes: string; origem: string; operacoes: string };
      }>("/v1/portal/banco/visao-geral"),
    comunicados: () => this.request<{ comunicados: Comunicado[] }>("/v1/portal/banco/comunicados"),
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
    contratos: (filtros: { colaborador?: string; situacao?: string[]; incluirTodosConvenios?: boolean } = {}) =>
      this.request<{
        contratos: {
          adf: string; situacao: string; lancamento: string; expiracao: string | null;
          cpfMasked: string; matricula: string; nome: string; tipoContrato: string;
          totalParcelas: number; valorParcela: number; convenio: string;
          convenioId: string; valorFinanciado: number; taxaAm: number;
          /** Dados da portabilidade — presentes quando o contrato vem substituir outro. */
          bancoOrigem?: string;
          contratoOrigem?: string;
          saldoDevedorOrigem?: number;
          folhaStatus?: "recebida" | "aplicada" | "falha";
          /** ISO 8601 — data do evento mais recente do contrato (criar,
           *  aprovar, averbar, folha aplicada). Usado pra ordenar
           *  carteira/ADF com "acabou de acontecer" no topo. */
          atualizadoEm?: string;
          /** Telefone do servidor (não mascarado) — o banco precisa
           *  entrar em contato pra tocar a formalização offline. Só é
           *  devolvido pra contratos do próprio banco logado. */
          telefoneServidor?: string;
          /** R2 key do PDF do contrato anexado pelo banco (upload). O
           *  operador reabre a qualquer momento — buscar via
           *  fetchCcbBlob(key). */
          ccbKey?: string;
          /** ISO — quando o CCB foi anexado. */
          ccbAnexadoEm?: string;
          /** Versoes anteriores do CCB (nunca hard-delete — soft-archive). */
          ccbHistorico?: { key: string; anexadoEm: string; ator: string }[];
        }[];
        total: number;
      }>("/v1/portal/banco/contratos", {
        query: {
          colaborador: filtros.colaborador,
          ...(filtros.incluirTodosConvenios ? { incluir_todos_convenios: "true" } : {}),
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
      acao: "quitar" | "suspender" | "cancelar" | "alongar" | "alterar" | "confirmar" | "aprovar",
      body?: { motivo?: string; parcelasExtras?: number; observacoes?: string; codigoVerba?: string },
    ) =>
      this.request<{ contrato: BancoContratoFull }>(`/v1/portal/banco/contratos/${adf}/${acao}`, { method: "POST", body: body ?? {} }),
    // Contratos com falha em folha reportada pela averbadora — banco precisa tratar.
    listContratosFalha: () =>
      this.request<{ contratos: BancoContratoFull[] }>("/v1/portal/banco/falhas"),
    tratarFalha: (
      adf: string,
      acao: "reenviar" | "cancelar" | "cobranca_direta",
      motivo: string,
    ) =>
      this.request<{ contrato: BancoContratoFull }>(`/v1/portal/banco/tratar-falha/${adf}`, {
        method: "POST",
        body: { acao, motivo },
      }),
    comprovanteUrl: (adf: string) => new URL(`/v1/portal/banco/contratos/${adf}/comprovante.pdf`, this.opts.baseUrl).toString(),

    // Cadastros
    listTabelas: () => this.request<{ tabelas: BancoTabela[] }>("/v1/portal/banco/cadastros/tabela-emprestimos"),
    getTabela: (id: string) => this.request<{ tabela: BancoTabela }>(`/v1/portal/banco/cadastros/tabela-emprestimos/${id}`),
    upsertTabela: (body: BancoTabelaInput) => this.request<{ tabela: BancoTabela }>("/v1/portal/banco/cadastros/tabela-emprestimos", { method: "POST", body }),
    removerTabela: (id: string) => this.request<void>(`/v1/portal/banco/cadastros/tabela-emprestimos/${id}`, { method: "DELETE" }),
    /** Faz upload da CCB assinada (PDF) pro R2. Retorna a chave persistida. */
    uploadCcb: async (adf: string, file: File): Promise<{ key: string; size: number; contentType: string }> => {
      const fd = new FormData();
      fd.append("adf", adf);
      fd.append("file", file);
      return this.request<{ key: string; size: number; contentType: string }>("/v1/portal/banco/ccb/upload", { method: "POST", body: fd, isFormData: true });
    },
    /** URL absoluta para visualizar a CCB (requer sessao do proprio banco). */
    ccbUrl: (key: string): string => new URL(`/v1/portal/banco/ccb/${key}`, this.opts.baseUrl).toString(),
    /** Baixa o CCB anexado como Blob (envia Authorization). Necessario
     *  porque o endpoint exige Bearer — abrir a ccbUrl direto no <a href>
     *  volta 401. Use com URL.createObjectURL pra abrir/salvar. */
    fetchCcbBlob: async (key: string): Promise<Blob> => {
      const token = await this.storage.getAccess();
      const url = new URL(`/v1/portal/banco/ccb/${key}`, this.opts.baseUrl).toString();
      const res = await this.fetchImpl(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(`Falha ao baixar CCB (${res.status})`);
      return await res.blob();
    },
    reativarTabela: (id: string) => this.request<{ ok: boolean }>(`/v1/portal/banco/cadastros/tabela-emprestimos/${id}/reativar`, { method: "POST" }),

    listUsuarios: (q?: { perfil?: BancoPerfil; somenteAdmin?: boolean }) =>
      this.request<{ usuarios: BancoUsuario[] }>("/v1/portal/banco/cadastros/usuarios", { query: q ?? {} }),
    getUsuario: (id: string) => this.request<{ usuario: BancoUsuario }>(`/v1/portal/banco/cadastros/usuarios/${id}`),
    upsertUsuario: (body: BancoUsuarioInput) => this.request<{ usuario: BancoUsuario }>("/v1/portal/banco/cadastros/usuarios", { method: "POST", body }),
    removerUsuario: (id: string) => this.request<void>(`/v1/portal/banco/cadastros/usuarios/${id}`, { method: "DELETE" }),
    reativarUsuario: (id: string) => this.request<{ ok: boolean }>(`/v1/portal/banco/cadastros/usuarios/${id}/reativar`, { method: "POST" }),
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
        pctComissao: number;
      }>("/v1/portal/banco/relatorios/faturamento"),

    // Bate de carteira mensal (escopado ao banco logado — jwt.banco_id).
    // Substitui o baterCarteira() client-side que era pseudo-random.
    bateCarteira: (body: { competencia: string; prefeituraId?: number }) =>
      this.request<AdminBateCarteiraResultado>("/v1/portal/banco/bate-carteira", { method: "POST", body }),

    // ===== Ofertas de credito (banco -> servidores) =====
    ofertas: {
      list: () => this.request<{ ofertas: BancoOferta[] }>("/v1/portal/banco/ofertas"),
      upsert: (body: BancoOfertaInput) => this.request<{ oferta: BancoOferta }>("/v1/portal/banco/ofertas", { method: "POST", body }),
      pausar: (id: string) => this.request<{ oferta: BancoOferta }>(`/v1/portal/banco/ofertas/${id}/pausar`, { method: "PATCH" }),
      reativar: (id: string) => this.request<{ oferta: BancoOferta }>(`/v1/portal/banco/ofertas/${id}/reativar`, { method: "PATCH" }),
    },
  };

  // ============ Admin (Averbadora) ============
  readonly admin = {
    me: () => this.request<{ id: string; nome: string; email: string; perfil: string }>("/v1/admin/me"),
    // ===== IA (OpenAI) =====
    aiConfig: () =>
      this.request<{ hasKey: boolean; keyPrefix: string | null; keySuffix: string | null; updatedAt: string | null }>("/v1/admin/ai/config"),
    aiSaveKey: (apiKey: string) =>
      this.request<{ hasKey: boolean; keyPrefix: string | null; keySuffix: string | null; updatedAt: string | null }>("/v1/admin/ai/config", { method: "PUT", body: { apiKey } }),
    aiClearKey: () => this.request<void>("/v1/admin/ai/config", { method: "DELETE" }),
    aiTest: () => this.request<{ ok: boolean; message: string; latencyMs?: number }>("/v1/admin/ai/test", { method: "POST" }),
    // ===== SMTP (e-mails de confirmação) =====
    smtpConfig: () =>
      this.request<{ host: string; port: number; user: string; fromEmail: string; fromName: string; secure: boolean; notifyEmail: string; hasPassword: boolean; configured: boolean; updatedAt: string | null }>("/v1/admin/smtp/config"),
    smtpSave: (input: { host?: string; port?: number; user?: string; password?: string; secure?: boolean; fromEmail?: string; fromName?: string; notifyEmail?: string }) =>
      this.request<{ host: string; port: number; user: string; fromEmail: string; fromName: string; secure: boolean; notifyEmail: string; hasPassword: boolean; configured: boolean; updatedAt: string | null }>("/v1/admin/smtp/config", { method: "PUT", body: input }),
    smtpClear: () => this.request<void>("/v1/admin/smtp/config", { method: "DELETE" }),
    smtpTest: (to: string) => this.request<{ sent: boolean; reason?: string }>("/v1/admin/smtp/test", { method: "POST", body: { to } }),
    // ===== Config de suporte (info exibida ao servidor em Conta > Suporte) =====
    suporteConfig: () => this.request<{ email: string; whatsapp: string; horario: string; mensagem: string; updatedAt: string }>("/v1/admin/suporte-config"),
    suporteSave: (input: { email?: string; whatsapp?: string; horario?: string; mensagem?: string }) =>
      this.request<{ email: string; whatsapp: string; horario: string; mensagem: string; updatedAt: string }>("/v1/admin/suporte-config", { method: "PUT", body: input }),
    aiNormalizeCsv: (body: { csv: string; expectedHeaders: string[]; contextHint?: string; model?: string }) =>
      this.request<{ csv: string; mapping: Record<string, string>; summary: string; usage: { input: number; output: number } }>(
        "/v1/admin/ai/normalize-csv",
        { method: "POST", body },
      ),

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
    deleteBanco: (id: number, confirm: { challengeId: string; codigo: string }) =>
      this.request<void>(`/v1/admin/bancos/${id}`, { method: "DELETE", body: confirm }),
    listPrefeituras: () => this.request<{ prefeituras: AdminPrefeitura[] }>("/v1/admin/prefeituras"),
    upsertPrefeitura: (p: AdminPrefeituraInput) => this.request<{ prefeitura: AdminPrefeitura }>("/v1/admin/prefeituras", { method: "POST", body: p }),
    /** Zera a base de prefeituras. Exige senha compartilhada (env
     *  ADMIN_PURGE_PASSWORD). Nao cascatea pra convenios/folhas. */
    limparBasePrefeituras: (senha: string) =>
      this.request<{ ok: true; removidas: number }>("/v1/admin/prefeituras/limpar-base", { method: "POST", body: { senha } }),
    sincronizarPrefeitura: (id: number) => this.request<{ prefeitura: AdminPrefeitura; resultado: { novos: number; atualizados: number; erro?: string; ts: string } }>(`/v1/admin/prefeituras/${id}/sincronizar`, { method: "POST" }),
    /** Consulta CNPJ via BrasilAPI (Receita + Junta Comercial). Usado nos
     *  modais de cadastro de prefeitura E de banco — endpoint reaproveitado. */
    consultarCnpjPrefeitura: (cnpj: string) =>
      this.request<{ dados: CnpjLookupResponse }>(`/v1/admin/prefeituras/consulta-cnpj/${encodeURIComponent(cnpj.replace(/\D/g, ""))}`),
    /** Zera a base de bancos. Exige senha compartilhada (env ADMIN_PURGE_PASSWORD). */
    limparBaseBancos: (senha: string) =>
      this.request<{ ok: true; removidos: number }>("/v1/admin/bancos/limpar-base", { method: "POST", body: { senha } }),
    resetPrefeituraPassword: (id: number, password: string) =>
      this.request<{ prefeitura: AdminPrefeitura }>(`/v1/admin/prefeituras/${id}/reset-password`, { method: "POST", body: { password } }),
    deletePrefeitura: (id: number, confirm: { challengeId: string; codigo: string }) =>
      this.request<void>(`/v1/admin/prefeituras/${id}`, { method: "DELETE", body: confirm }),
    // Step-up por email para acoes destrutivas. Retorna codigoDemo pois nao ha provider de email.
    solicitarConfirmacao: (acao: string, recurso: string) =>
      this.request<{ challengeId: string; emailMascarado: string; codigoDemo: string; expiraEmSegundos: number }>(
        "/v1/admin/confirmacao/solicitar", { method: "POST", body: { acao, recurso } }),
    listConvenios: () => this.request<{ convenios: AdminConvenio[] }>("/v1/admin/convenios"),
    upsertConvenio: (body: AdminConvenioInput) =>
      this.request<{ convenio: AdminConvenio }>("/v1/admin/convenios", { method: "POST", body }),
    deleteConvenio: (id: string) =>
      this.request<void>(`/v1/admin/convenios/${id}`, { method: "DELETE" }),
    reativarConvenio: (id: string) =>
      this.request<{ ok: boolean }>(`/v1/admin/convenios/${id}/reativar`, { method: "POST" }),
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

    // Cotacoes de telemedicina solicitadas pelos servidores (banner de Beneficios).
    // A averbadora ve os dados do servidor — principalmente o telefone — pra formalizar.
    listTelemedicinaCotacoes: () =>
      this.request<{ cotacoes: TelemedicinaCotacao[] }>("/v1/admin/telemedicina/cotacoes"),
    ativarCotacaoTelemedicina: (id: string) =>
      this.request<{ ok: true; situacao: string }>(`/v1/admin/telemedicina/cotacoes/${encodeURIComponent(id)}/ativar`, { method: "POST" }),
    cancelarCotacaoTelemedicina: (id: string) =>
      this.request<{ ok: true; situacao: string }>(`/v1/admin/telemedicina/cotacoes/${encodeURIComponent(id)}/cancelar`, { method: "POST" }),
    purgeTelemedicinaCotacoes: () =>
      this.request<{ ok: true; apagadas: number }>("/v1/admin/telemedicina/cotacoes/purge", { method: "POST" }),
    /** Anexa o contrato da telemedicina (R2). Sem ele o plano nao pode ser ativado. */
    uploadContratoTelemedicina: (id: string, file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return this.request<{ ok: true; key: string; nome: string; size: number }>(
        `/v1/admin/telemedicina/cotacoes/${encodeURIComponent(id)}/contrato`,
        { method: "POST", body: fd, isFormData: true },
      );
    },
    /** Remove o contrato anexado (arquivo errado) — volta a bloquear a ativacao. */
    removerContratoTelemedicina: (id: string) =>
      this.request<{ ok: true }>(`/v1/admin/telemedicina/cotacoes/${encodeURIComponent(id)}/contrato`, { method: "DELETE" }),
    /** Baixa o contrato anexado da cotacao (envia Authorization). */
    fetchContratoTelemedicinaBlob: async (id: string): Promise<Blob> => {
      const token = await this.storage.getAccess();
      const url = new URL(`/v1/admin/telemedicina/cotacoes/${encodeURIComponent(id)}/contrato`, this.opts.baseUrl).toString();
      const res = await this.fetchImpl(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(`Falha ao baixar contrato (${res.status})`);
      return await res.blob();
    },

    // Templates de TERMOS (aceite in-app do servidor + anuencia da prefeitura)
    listTermos: () => this.request<{ termos: TermoTemplate[] }>("/v1/admin/termos"),
    upsertTermo: (tipo: TermoTipo, patch: { titulo?: string; descricao?: string; corpo?: string; ativo?: boolean; versao?: string }) =>
      this.request<{ termo: TermoTemplate }>(`/v1/admin/termos/${tipo}`, { method: "POST", body: patch }),

    // Perfis admin
    listPerfisAdmin: () =>
      this.request<{ usuarios: AdminAverbadoraUser[]; perfis: { value: AverbadoraPerfil; label: string; descricao: string; permissoes: string[] }[] }>("/v1/admin/perfis"),
    upsertPerfilAdmin: (body: { id?: number; nome: string; email: string; perfil?: AverbadoraPerfil; permissoes?: string[]; ativo: boolean; password?: string; twoFactorEnabled?: boolean }) =>
      this.request<{ usuario: AdminAverbadoraUser }>("/v1/admin/perfis", { method: "POST", body }),
    rotate2FA: (id: number) =>
      this.request<{ secret: string; otpauthUrl: string }>(`/v1/admin/perfis/${id}/2fa/rotate`, { method: "POST" }),
    disable2FA: (id: number) =>
      this.request<{ ok: boolean }>(`/v1/admin/perfis/${id}/2fa/disable`, { method: "POST" }),
    deletePerfilAdmin: (id: number) =>
      this.request<void>(`/v1/admin/perfis/${id}`, { method: "DELETE" }),
    reativarPerfilAdmin: (id: number) =>
      this.request<{ ok: boolean }>(`/v1/admin/perfis/${id}/reativar`, { method: "POST" }),

    // ===== ADF — averbadora aplica/reporta falha (prefeitura so recebe) =====
    adfCompetencias: () =>
      this.request<{ competencias: { competencia: string; total: number; aplicadas: number; falhas: number }[]; competenciaAtual: string }>("/v1/admin/adf/competencias"),
    adfList: (q?: { competencia?: string; prefeitura_id?: number }) =>
      this.request<{ adfs: {
        id: string; adf: string; idUnico: string; cpfMasked: string; matricula: string; nome: string;
        bancoNome: string; prefeituraId: number; prefeituraNome: string; competencia: string;
        valorParcela: number; totalParcelas: number;
        /** Valor total financiado (parcela x total parcelas). */
        valorFinanciado?: number;
        /** EMPRESTIMO | REFIN | ECONSIGNADO — rotulado como Emprestimo /
         *  Portabilidade / Cartao no card. */
        tipoContrato?: string;
        status: "recebida" | "aplicada" | "falha"; motivo?: string;
      }[] }>("/v1/admin/adf", { query: q ?? {} }),
    confirmarAdfAdmin: (ids: string[]) =>
      this.request<{ aplicadas: number }>("/v1/admin/adf/confirmar", { method: "POST", body: { ids } }),
    reportarFalhaAdfAdmin: (ids: string[], motivo: string) =>
      this.request<{ falhas: number }>("/v1/admin/adf/falha", { method: "POST", body: { ids, motivo } }),

    // ===== Beneficios / descontos por prefeitura =====
    beneficios: {
      list: () => this.request<{ beneficios: AdminBeneficio[] }>("/v1/admin/beneficios"),
      upsert: (body: AdminBeneficioInput) => this.request<{ beneficio: AdminBeneficio }>("/v1/admin/beneficios", { method: "POST", body }),
      pausar: (id: string) => this.request<{ beneficio: AdminBeneficio }>(`/v1/admin/beneficios/${id}/pausar`, { method: "PATCH" }),
      reativar: (id: string) => this.request<{ beneficio: AdminBeneficio }>(`/v1/admin/beneficios/${id}/reativar`, { method: "PATCH" }),
      /** Interessados (servidores que clicaram no botao Acessar). ?beneficioId filtra. */
      interessados: (beneficioId?: string) =>
        this.request<{
          cliques: {
            id: string;
            beneficioId: string;
            servidorId: number;
            nome: string;
            cpfMasked: string;
            matricula: string;
            prefeituraId: number;
            criadoEm: string;
            origemTela?: string;
          }[];
          total: number;
        }>("/v1/admin/beneficios/interessados", { query: beneficioId ? { beneficioId } : {} }),
      /** Contagem de interessados por beneficio (badge nas listas). */
      interessadosResumo: () =>
        this.request<{ contagens: { beneficioId: string; total: number }[] }>(
          "/v1/admin/beneficios/interessados/resumo",
        ),
    },

    // ===== Modelos de e-mail (editaveis pela averbadora) =====
    emailTemplates: {
      list: () => this.request<{ templates: EmailTemplate[] }>("/v1/admin/email-templates"),
      upsert: (body: EmailTemplateInput) =>
        this.request<{ template: EmailTemplate }>("/v1/admin/email-templates", { method: "POST", body }),
      remover: (id: string) =>
        this.request<{ ok: true }>(`/v1/admin/email-templates/${id}`, { method: "DELETE" }),
      /** Envia um teste real via SMTP configurado. Se `vars` for omitido/vazio,
       *  o backend preenche automaticamente com dados de exemplo realistas. */
      enviarTeste: (id: string, body: { destino: string; vars?: Record<string, string> }) =>
        this.request<{
          sent: boolean;
          destino: string;
          reason?: string;
          preview: { assunto: string; corpo: string };
          varsAplicadas: Record<string, string>;
        }>(`/v1/admin/email-templates/${id}/test`, { method: "POST", body }),
      /** Pre-preenchimento de variaveis com dados realistas — usado pelo
       *  modal de teste pra popular os inputs sem o operador digitar. */
      previewVars: (id: string) =>
        this.request<{ vars: Record<string, string> }>(`/v1/admin/email-templates/${id}/preview-vars`),
    },

    listServidores: (q?: { prefeitura_id?: number; status?: string }) =>
      this.request<{ servidores: AdminServidor[]; total: number }>("/v1/admin/servidores", { query: q ?? {} }),
    updateServidor: (matricula: string, body: AdminServidorUpdate) =>
      this.request<{ servidor: AdminServidor }>(`/v1/admin/servidores/${matricula}`, { method: "PATCH", body }),
    /** Le a config de campos de servidor da prefeitura (cria default se ainda nao existe). */
    getServidorCamposConfig: (prefeituraId: number) =>
      this.request<{ config: ServidorCamposConfig }>(`/v1/admin/servidores/campos-config/${prefeituraId}`),
    /** Salva a config de campos. Backend re-injeta cpf/matricula/email como travados. */
    updateServidorCamposConfig: (prefeituraId: number, campos: ServidorCampoConfig[]) =>
      this.request<{ config: ServidorCamposConfig }>(`/v1/admin/servidores/campos-config/${prefeituraId}`, { method: "PUT", body: { campos } }),
    /** URL do CSV modelo dinamico da prefeitura (colunas seguem a config). */
    servidoresCsvTemplateUrl: (prefeituraId: number): string =>
      `${this.opts.baseUrl}/v1/admin/servidores/csv-template?prefeituraId=${prefeituraId}`,
    listFolhas: () => this.request<{ folhas: AdminFolha[] }>("/v1/admin/folhas"),
    upsertFolha: (f: AdminFolhaInput) => this.request<{ folha: AdminFolha }>("/v1/admin/folhas", { method: "POST", body: f }),
    consolidarFolha: (id: string) => this.request<{ folha: AdminFolha }>(`/v1/admin/folhas/${id}/consolidar`, { method: "POST" }),
    deleteFolha: (id: string) => this.request<{ ok: true; id: string }>(`/v1/admin/folhas/${id}`, { method: "DELETE" }),
    /** Atalho de teste: cria+consolida N folhas em sequencia (a partir da
     *  proxima competencia sem folha) pra simular meses passando. Cada folha
     *  consolidada dispara cascade parcelasPagas +1 em contratos averbados. */
    simularMesesFolha: (body: { prefeituraId: number; meses: number }) =>
      this.request<{
        prefeitura: string;
        folhas: { id: string; competencia: string; incrementados: number; quitados: number }[];
        totalIncrementados: number;
        totalQuitados: number;
      }>("/v1/admin/folhas/simular-meses", { method: "POST", body }),
    // Visao global de contratos averbados (ADF averbadora — todos os bancos).
    contratos: () =>
      this.request<{
        contratos: {
          adf: string; situacao: string; lancamento: string; expiracao: string | null;
          cpfMasked: string; matricula: string; nome: string; tipoContrato: string;
          totalParcelas: number; valorParcela: number; convenio: string;
          convenioId: string; valorFinanciado: number; taxaAm: number;
          folhaStatus?: "recebida" | "aplicada" | "falha";
          atualizadoEm?: string;
          bancoId: number; bancoNome: string;
        }[];
        total: number;
      }>("/v1/admin/contratos"),
    listComunicados: () => this.request<{ comunicados: Comunicado[] }>("/v1/admin/comunicados"),
    upsertComunicado: (body: ComunicadoInput) =>
      this.request<{ comunicado: Comunicado }>("/v1/admin/comunicados", { method: "POST", body }),
    moveComunicado: (id: string, direction: "up" | "down") =>
      this.request<{ comunicados: Comunicado[] }>(`/v1/admin/comunicados/${id}/mover`, { method: "POST", body: { direction } }),
    /** Reordena a lista inteira em um POST — usado pelo drag-and-drop. */
    reordenarComunicados: (ids: string[]) =>
      this.request<{ comunicados: Comunicado[] }>("/v1/admin/comunicados/reordenar", { method: "POST", body: { ids } }),
    deleteComunicado: (id: string) =>
      this.request<{ ok: boolean }>(`/v1/admin/comunicados/${id}`, { method: "DELETE" }),
    health: () =>
      this.request<{ checks: { servico: string; uptime: number; p95: number; ok: boolean }[] }>("/v1/admin/health"),
    logs: (q?: { level?: "info" | "warn" | "error"; source?: string; perfil?: "averbadora" | "banco" | "prefeitura" | "servidor" | "sistema" }) =>
      this.request<{ logs: { ts: string; level: "info" | "warn" | "error"; trace_id: string; message: string; source: string; perfil: "averbadora" | "banco" | "prefeitura" | "servidor" | "sistema" }[] }>("/v1/admin/logs", { query: q ?? {} }),
    listVitrine: () => this.request<{ banners: AdminBanner[] }>("/v1/admin/vitrine"),
    upsertBanner: (b: { id?: string; bancoId: number; titulo: string; imagemUrl?: string; ativo?: boolean }) =>
      this.request<{ banner: AdminBanner }>("/v1/admin/vitrine", { method: "POST", body: b }),

    // === API tokens ===
    listApiTokens: (filter?: { environment?: "production" | "sandbox"; audience?: ApiAudience }) =>
      this.request<{ tokens: AdminApiToken[]; scopesByAudience: Record<ApiAudience, ApiScope[]> }>("/v1/admin/api-tokens", { query: filter ?? {} }),
    createApiToken: (body: AdminApiTokenInput) =>
      this.request<{ token: AdminApiToken; plaintext: string; warning: string }>("/v1/admin/api-tokens", { method: "POST", body }),
    // Pausa/reativa UM token (manual, reversível). Não apaga nem toca no perfil/parceria dono.
    pauseApiToken: (id: string, paused: boolean) =>
      this.request<{ token: AdminApiToken }>(`/v1/admin/api-tokens/${id}/pause`, { method: "PATCH", body: { paused } }),

    // === Webhooks ===
    listWebhooks: (environment?: "production" | "sandbox") =>
      this.request<{ webhooks: AdminWebhook[]; events: readonly string[] }>("/v1/admin/webhooks", { query: environment ? { environment } : {} }),
    createWebhook: (body: AdminWebhookInput) =>
      this.request<{ webhook: AdminWebhook; secret: string; warning: string }>("/v1/admin/webhooks", { method: "POST", body }),
    // Webhooks não são apagados/pausados manualmente: seguem o status do banco dono (cascade).
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
    getConfig: () => this.request<{ exigeCcb: boolean; exigeBanco2FA: boolean }>("/v1/prefeitura/config"),
    setConfig: (body: { exigeCcb?: boolean; exigeBanco2FA?: boolean }) =>
      this.request<{ exigeCcb: boolean; exigeBanco2FA: boolean }>("/v1/prefeitura/config", { method: "POST", body }),
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
    editarServidor: (matricula: string, patch: Partial<{ nome: string; cpf: string; cargo: string; endereco: string; matriculaNova: string; vinculo: string; email: string; telefone: string; codigoIbge: number }>) =>
      this.request<{ servidor: PrefeituraServidor }>(`/v1/prefeitura/servidores/${matricula}`, { method: "PATCH", body: patch }),
    servidoresCsvTemplateUrl: (): string => `${this.opts.baseUrl}/v1/prefeitura/servidores/csv-template`,

    // Folha (passo 4)
    folhas: () => this.request<{ folhas: (PrefeituraFolha & { movimentacoes: number })[] }>("/v1/prefeitura/folhas"),
    abrirFolha: (body: { competencia: string; dataCorte: string; dataRepasse?: string }) =>
      this.request<{ folha: PrefeituraFolha }>("/v1/prefeitura/folhas", { method: "POST", body }),
    atualizarFolha: (id: string, body: Partial<{ status: "aberta" | "fechada"; dataCorte: string; dataRepasse: string | null }>) =>
      this.request<{ folha: PrefeituraFolha }>(`/v1/prefeitura/folhas/${id}`, { method: "PATCH", body }),
    excluirFolha: (id: string) =>
      this.request<{ ok: boolean; competencia: string }>(`/v1/prefeitura/folhas/${id}`, { method: "DELETE" }),
    movimentacoes: (folhaId: string) =>
      this.request<{ movimentacoes: { id: string; tipo: string; matricula: string; nome: string; detalhe: string; criadoEm: string }[] }>(`/v1/prefeitura/folhas/${folhaId}/movimentacoes`),
    enviarMovimentacao: (folhaId: string, csv: string) =>
      this.request<CsvImportOutcome>(`/v1/prefeitura/folhas/${folhaId}/movimentacao`, { method: "POST", body: { csv } }),
    movimentacaoCsvTemplateUrl: (): string => `${this.opts.baseUrl}/v1/prefeitura/folhas/movimentacao/csv-template`,

    // Convênios + config (passo 5)
    convenios: () => this.request<{ convenios: (PrefeituraConvenio & { prazoTravaHoras: number; prazoPortabilidadeDU: number; prefixo: string; formatoImportacao: string })[]; prefixo: string }>("/v1/prefeitura/convenios"),
    convenioConfig: (id: string) =>
      this.request<{ convenio: { id: string; nome: string; bancoNome: string }; config: { prazoTravaHoras: number; prazoPortabilidadeDU: number; maxComprometimentoPct: number; maxParcelas: number; vinculosAceitos: string[]; formatoImportacao: string; regrasEspeciais: string; prefixo: string } }>(`/v1/prefeitura/convenios/${id}/config`),
    salvarConvenioConfig: (id: string, body: { prazoTravaHoras: number; prazoPortabilidadeDU: number; maxComprometimentoPct: number; maxParcelas: number; vinculosAceitos: string[]; formatoImportacao: string; regrasEspeciais: string; prefixo: string }) =>
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
    salvarPerfil: (body: PrefeituraPerfilInput) =>
      this.request<{ perfil: PrefeituraPerfil }>("/v1/prefeitura/perfis", { method: "POST", body }),
    excluirPerfil: (id: number) => this.request<void>(`/v1/prefeitura/perfis/${id}`, { method: "DELETE" }),
    reativarPerfil: (id: number) => this.request<{ ok: boolean }>(`/v1/prefeitura/perfis/${id}/reativar`, { method: "POST" }),
    rotate2fa: (id: number) => this.request<{ secret: string; otpauthUrl: string }>(`/v1/prefeitura/perfis/${id}/2fa/rotate`, { method: "POST" }),
    disable2fa: (id: number) => this.request<{ ok: boolean }>(`/v1/prefeitura/perfis/${id}/2fa/disable`, { method: "POST" }),

    comunicados: () => this.request<{ comunicados: Comunicado[] }>("/v1/prefeitura/comunicados"),
  };

  // ============ Internal ============
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const headers: Record<string, string> = { Accept: "application/json" };
    if (!options.isFormData) headers["Content-Type"] = "application/json";
    if (!options.skipAuth) {
      const token = await this.storage.getAccess();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const buildBody = (): string | FormData | undefined => {
      if (options.body === undefined) return undefined;
      if (options.isFormData) return options.body as FormData;
      return JSON.stringify(options.body);
    };

    let res = await this.fetchImpl(url, {
      method: options.method ?? "GET",
      headers,
      body: buildBody(),
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
          body: buildBody(),
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
