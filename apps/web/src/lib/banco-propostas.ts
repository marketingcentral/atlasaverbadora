// Mock data + lifecycle for the Banco Partner portal proposal-analysis flow
// (passos 1-11 do fluxo do banco). Self-contained web mockup — same pattern as
// lib/propostas-data.ts (servidor). Seed list is static; operator actions
// (aprovar/recusar/solicitar info/enviar link/confirmar averbacao) are stored
// as an overlay in localStorage keyed by idUnico, so the demo persists state
// across navigation without touching the API.

import { STORAGE_KEYS } from "./session";

// ---------------------------------------------------------------------------
// Perfil do operador (Passo 1) — permissoes por operacao.
// ---------------------------------------------------------------------------

export interface BancoPerfilPerms {
  consulta: boolean;
  aprovacao: boolean;
  exportacao: boolean;
}

export interface BancoPerfil {
  id: string;
  nome: string;
  papel: string;
  perms: BancoPerfilPerms;
}

export const BANCO_PERFIS: BancoPerfil[] = [
  { id: "gestor", nome: "Gestor de Crédito", papel: "Gestor", perms: { consulta: true, aprovacao: true, exportacao: true } },
  { id: "operador", nome: "Operador de Esteira", papel: "Operador", perms: { consulta: true, aprovacao: true, exportacao: false } },
  { id: "consulta", nome: "Analista de Consulta", papel: "Consulta", perms: { consulta: true, aprovacao: false, exportacao: false } },
];

const PERFIL_KEY = "atlas:banco:perfil";

export function getBancoPerfil(): BancoPerfil {
  const fallback = BANCO_PERFIS[0]!;
  try {
    const id = window.localStorage.getItem(PERFIL_KEY);
    return BANCO_PERFIS.find((p) => p.id === id) ?? fallback;
  } catch {
    return fallback;
  }
}

export function setBancoPerfil(id: string): void {
  try {
    window.localStorage.setItem(PERFIL_KEY, id);
  } catch {
    // ignore (modo privado)
  }
}

// ---------------------------------------------------------------------------
// Modelo da proposta (Passos 3-7).
// ---------------------------------------------------------------------------

export type BancoProduto = "novo" | "portabilidade";

export type BancoPropostaStatus =
  | "recebida" // acabou de cair na fila (origem: app do servidor)
  | "em_analise" // operador abriu a analise
  | "aprovada" // aprovada, aguardando envio do link de formalizacao
  | "aguardando_formalizacao" // link enviado ao servidor
  | "formalizada" // servidor assinou a CCB
  | "averbada" // margem efetiva; recurso liberado
  | "recusada"
  | "mais_info" // banco solicitou mais informacoes
  | "expirada"; // trava de margem expirou

export interface ContratoRelacionado {
  idUnico: string;
  banco: string;
  valorParcela: number;
  parcelasRestantes: number;
  situacao: string;
}

export interface BancoProposta {
  idUnico: string;
  cpfMasked: string;
  nome: string;
  convenio: string; // prefeitura
  matricula: string;
  produto: BancoProduto;
  valor: number;
  parcelas: number;
  parcela: number;
  taxaAm: number;
  margemComprometida: number;
  margemDisponivel: number;
  salarioLiquido: number;
  vinculo: string;
  situacaoFuncional: string;
  status: BancoPropostaStatus;
  criadaEm: string; // ISO
  travaHoras: number; // horas totais da trava a partir de criadaEm
  contratosAtivos: ContratoRelacionado[];
  /** Telefone do servidor — usado pelo banco pra ligar e tocar a formalização
   *  presencial (assinatura offline). Vem sem máscara pro banco dono. */
  telefoneServidor?: string;
  // Preenchidos ao longo do fluxo (batch 2):
  linkFormalizacao?: string;
  canalEnvio?: "email" | "sms";
  motivoRecusa?: string;
  observacao?: string;
  ccbUrl?: string;
  /** R2 key do CCB anexado — usar atlas.banco.fetchCcbBlob(ccbKey) pra reabrir. */
  ccbKey?: string;
  /** ISO — quando o CCB foi anexado. */
  ccbAnexadoEm?: string;
  // Analise de risco interna (batch 2):
  risco?: {
    scoreInterno: number; // 0-1000
    bureauSerasa: number;
    bureauSpc: "sem_restricao" | "com_restricao";
    comprometimentoRenda: number; // 0-1
    recomendacao: "aprovar" | "revisar" | "negar";
  };
}

export const STATUS_LABEL: Record<BancoPropostaStatus, string> = {
  recebida: "Recebida",
  em_analise: "Em análise",
  aprovada: "Aprovada",
  aguardando_formalizacao: "Aguardando formalização",
  formalizada: "Formalizada",
  averbada: "Averbada / Liberada",
  recusada: "Recusada",
  mais_info: "Mais informações",
  expirada: "Expirada",
};

/** Pill variant do @atlas/ui para cada status. */
export function statusPill(s: BancoPropostaStatus): "pendente" | "aceita" | "averbado" | "emdia" | "expirado" | "rejeitada" {
  switch (s) {
    case "recebida":
    case "em_analise":
    case "mais_info":
      return "pendente";
    case "aprovada":
    case "aguardando_formalizacao":
      return "aceita";
    case "formalizada":
      return "emdia";
    case "averbada":
      return "averbado";
    case "expirada":
      return "expirado";
    case "recusada":
      return "rejeitada";
  }
}

export const PRODUTO_LABEL: Record<BancoProduto, string> = {
  novo: "Novo empréstimo",
  portabilidade: "Portabilidade",
};

/** Convenios seed que o banco enxerga na Atlas (Passo 11) — apenas os seus. */
const BANCO_CONVENIOS_SEED = [
  "Prefeitura de Palhoça",
  "Prefeitura de Biguaçu",
  "Prefeitura de São José",
];

function readList(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: string[]): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/**
 * Combina seed + convenios cadastrados via UI, subtraindo os removidos.
 * Seeds podem ser removidos: a lista de removidos vive em bancoConveniosRemovidos.
 */
export function getBancoConvenios(): string[] {
  const extras = readList(STORAGE_KEYS.bancoConvenios);
  const removidos = new Set(readList(STORAGE_KEYS.bancoConveniosRemovidos));
  const dedup = new Set<string>([...BANCO_CONVENIOS_SEED, ...extras]);
  return [...dedup].filter((c) => !removidos.has(c));
}

/** Cadastra um novo convenio. Retorna false se ja existir ou se a persistencia falhou. */
export function addBancoConvenio(nome: string): boolean {
  const trimmed = nome.trim();
  if (!trimmed) return false;
  const existentes = getBancoConvenios();
  if (existentes.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return false;
  // Se o nome coincide com um seed marcado como removido, "restaura" tirando
  // da lista de removidos em vez de duplicar em extras.
  if (BANCO_CONVENIOS_SEED.includes(trimmed)) {
    const removidos = readList(STORAGE_KEYS.bancoConveniosRemovidos).filter((c) => c !== trimmed);
    return writeList(STORAGE_KEYS.bancoConveniosRemovidos, removidos);
  }
  const extras = readList(STORAGE_KEYS.bancoConvenios);
  extras.push(trimmed);
  return writeList(STORAGE_KEYS.bancoConvenios, extras);
}

/**
 * Remove um convenio. Se e cadastrado (extra), some do array de extras.
 * Se e seed, entra na lista de removidos (persistido separado — permite
 * "restaurar" via novo cadastro com mesmo nome).
 * Retorna false se nao existir ou se a persistencia falhou.
 */
export function removeBancoConvenio(nome: string): boolean {
  if (BANCO_CONVENIOS_SEED.includes(nome)) {
    const removidos = readList(STORAGE_KEYS.bancoConveniosRemovidos);
    if (removidos.includes(nome)) return false; // ja removido
    removidos.push(nome);
    return writeList(STORAGE_KEYS.bancoConveniosRemovidos, removidos);
  }
  const extras = readList(STORAGE_KEYS.bancoConvenios);
  const filtered = extras.filter((c) => c !== nome);
  if (filtered.length === extras.length) return false;
  return writeList(STORAGE_KEYS.bancoConvenios, filtered);
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export function fmtBRL(n: number): string {
  return BRL.format(n);
}

// ---------------------------------------------------------------------------
// Seed. `_criadaHorasAtras` deriva `criadaEm` no read para o countdown da
// trava permanecer sempre relevante na demo.
// ---------------------------------------------------------------------------

interface Seed extends Omit<BancoProposta, "criadaEm"> {
  _criadaHorasAtras: number;
}

// SEED zerado. Antes tinha ~10 propostas hardcoded (Maria Aparecida,
// Roberto Silva, Jose Carlos, Ana Lucia, etc.) que apareciam em
// /banco/propostas, /banco/carteira e getCarteira() pra qualquer banco
// logado, incluindo bancos novos que deveriam entrar zerados. Fonte de
// verdade agora e o backend (atlas.banco.contratos()). Se voce precisar
// de dados demo em dev local, popule o backend em vez de reintroduzir
// SEED aqui.
const SEED: Seed[] = [];

// ---------------------------------------------------------------------------
// Overlay de acoes do operador (localStorage). Guarda apenas os campos
// alterados por idUnico.
// ---------------------------------------------------------------------------

type Overlay = Record<string, Partial<BancoProposta>>;

// Bump quando o SEED muda de forma que overlays antigos ficam inconsistentes
// (mudanca de status inicial, novos idUnico, etc). Ao subir a versao,
// readOverlay() detecta a divergencia e limpa o overlay armazenado.
const SEED_VERSION = 2;
const SEED_VERSION_KEY = "atlas:banco:propostas:_version";

function readOverlay(): Overlay {
  try {
    const storedVersion = Number(window.localStorage.getItem(SEED_VERSION_KEY) ?? 0);
    if (storedVersion !== SEED_VERSION) {
      window.localStorage.removeItem(STORAGE_KEYS.bancoPropostas);
      window.localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
      return {};
    }
    const raw = window.localStorage.getItem(STORAGE_KEYS.bancoPropostas);
    return raw ? (JSON.parse(raw) as Overlay) : {};
  } catch {
    return {};
  }
}

function writeOverlay(o: Overlay): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEYS.bancoPropostas, JSON.stringify(o));
    return true;
  } catch {
    return false;
  }
}

function hydrate(seed: Seed, overlay: Overlay): BancoProposta {
  const { _criadaHorasAtras, ...rest } = seed;
  const criadaEm = new Date(Date.now() - _criadaHorasAtras * 3600_000).toISOString();
  const base: BancoProposta = { ...rest, criadaEm };
  const patch = overlay[seed.idUnico];
  return patch ? { ...base, ...patch } : base;
}

export function getAllPropostas(): BancoProposta[] {
  const overlay = readOverlay();
  return SEED.map((s) => hydrate(s, overlay));
}

export function getProposta(idUnico: string): BancoProposta | undefined {
  const seed = SEED.find((s) => s.idUnico === idUnico);
  if (!seed) return undefined;
  return hydrate(seed, readOverlay());
}

// ---------------------------------------------------------------------------
// Conversao "contrato do backend" -> BancoProposta.
// A lista de propostas e o detalhe ambos carregam via atlas.banco.contratos()
// e reusam esta funcao pra hidratar o modelo local. Antes vivia inline em
// routes/banco/propostas/index.tsx — quando o detalhe abriu de um caminho
// diferente (getProposta consultando SEED vazio) sempre dizia "nao encontrada".
// ---------------------------------------------------------------------------

export interface BancoContratoApi {
  adf: string;
  situacao: string;
  lancamento: string;
  cpfMasked: string;
  matricula: string;
  nome: string;
  tipoContrato: string;
  totalParcelas: number;
  valorParcela: number;
  convenio: string;
  valorFinanciado: number;
  taxaAm: number;
  bancoOrigem?: string;
  contratoOrigem?: string;
  saldoDevedorOrigem?: number;
  telefoneServidor?: string;
  ccbKey?: string;
  ccbAnexadoEm?: string;
}

export interface BancoPropostaFromApi extends BancoProposta {
  _api: true;
  bancoOrigem?: string;
  contratoOrigem?: string;
  saldoDevedorOrigem?: number;
  tipoContrato?: string;
}

function parseBrDate(s: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return new Date().toISOString();
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).toISOString();
}

export function contratoToProposta(ct: BancoContratoApi): BancoPropostaFromApi {
  const t = ct.situacao.toLowerCase();
  // Ordem importa: "aprov" antes de "ativo"/"averb" pra o novo estado
  // intermediario "Aprovado" (banco aprovou a proposta mas ainda nao averbou —
  // vai fechar o contrato offline).
  const status: BancoPropostaStatus = t.includes("aprov")
    ? "aprovada"
    : t.includes("aguard")
      ? "recebida"
      : t.includes("cancel") || t.includes("suspens") || t.includes("recus")
        ? "recusada"
        : t.includes("ativo") || t.includes("averb") || t.includes("quitad")
          ? "averbada"
          : "recebida";
  const overlay = readOverlay();
  const patch = overlay[ct.adf];
  const base: BancoPropostaFromApi = {
    idUnico: ct.adf,
    cpfMasked: ct.cpfMasked,
    nome: ct.nome,
    convenio: ct.convenio,
    matricula: ct.matricula,
    produto: ct.tipoContrato === "REFIN" ? "portabilidade" : "novo",
    valor: ct.valorFinanciado,
    parcelas: ct.totalParcelas,
    parcela: ct.valorParcela,
    taxaAm: ct.taxaAm * 100,
    margemComprometida: ct.valorParcela,
    margemDisponivel: 0,
    salarioLiquido: 0,
    vinculo: "",
    situacaoFuncional: "",
    status,
    criadaEm: parseBrDate(ct.lancamento),
    travaHoras: 48,
    contratosAtivos: [],
    _api: true,
    bancoOrigem: ct.bancoOrigem,
    contratoOrigem: ct.contratoOrigem,
    saldoDevedorOrigem: ct.saldoDevedorOrigem,
    tipoContrato: ct.tipoContrato,
    telefoneServidor: ct.telefoneServidor,
    ccbKey: ct.ccbKey,
    ccbAnexadoEm: ct.ccbAnexadoEm,
  };
  return patch ? { ...base, ...patch } : base;
}

/**
 * Aplica um patch parcial no overlay. Retorna false se a escrita no localStorage
 * falhar (quota / modo privado), pra que a UI possa mostrar erro em vez de fingir
 * sucesso e o proximo `getProposta` retornar o valor antigo.
 */
export function patchProposta(idUnico: string, patch: Partial<BancoProposta>): boolean {
  const overlay = readOverlay();
  overlay[idUnico] = { ...overlay[idUnico], ...patch };
  return writeOverlay(overlay);
}

// ---------------------------------------------------------------------------
// Trava de margem: expiracao derivada de criadaEm + travaHoras.
// ---------------------------------------------------------------------------

export interface TravaInfo {
  expiraEm: Date;
  msRestantes: number;
  expirada: boolean;
  urgente: boolean; // <= 24h
  label: string;
}

const STATUS_COM_TRAVA_ATIVA: BancoPropostaStatus[] = ["recebida", "em_analise", "mais_info"];

export function travaInfo(p: BancoProposta): TravaInfo | null {
  if (!STATUS_COM_TRAVA_ATIVA.includes(p.status)) return null;
  const expiraEm = new Date(new Date(p.criadaEm).getTime() + p.travaHoras * 3600_000);
  const msRestantes = expiraEm.getTime() - Date.now();
  const expirada = msRestantes <= 0;
  const urgente = !expirada && msRestantes <= 24 * 3600_000;
  let label: string;
  if (expirada) {
    label = "trava expirada";
  } else {
    const h = Math.floor(msRestantes / 3600_000);
    const m = Math.floor((msRestantes % 3600_000) / 60_000);
    label = h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m}m`;
  }
  return { expiraEm, msRestantes, expirada, urgente, label };
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
