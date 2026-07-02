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
  // Preenchidos ao longo do fluxo (batch 2):
  linkFormalizacao?: string;
  canalEnvio?: "email" | "sms";
  motivoRecusa?: string;
  observacao?: string;
  ccbUrl?: string;
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

const SEED: Seed[] = [
  {
    idUnico: "OP-2026-0007841",
    cpfMasked: "***.412.905-**",
    nome: "Maria Aparecida Ramos",
    convenio: "Prefeitura de Palhoça",
    matricula: "PALH-88213",
    produto: "novo",
    valor: 18000,
    parcelas: 72,
    parcela: 412.35,
    taxaAm: 0.0179,
    margemComprometida: 412.35,
    margemDisponivel: 1340.5,
    salarioLiquido: 4820.0,
    vinculo: "ESTATUTARIO",
    situacaoFuncional: "ATIVO",
    status: "recebida",
    _criadaHorasAtras: 3,
    travaHoras: 48,
    contratosAtivos: [
      { idUnico: "OP-2025-0012233", banco: "Banco Delta", valorParcela: 289.9, parcelasRestantes: 21, situacao: "em_dia" },
    ],
    risco: { scoreInterno: 742, bureauSerasa: 688, bureauSpc: "sem_restricao", comprometimentoRenda: 0.29, recomendacao: "aprovar" },
  },
  {
    idUnico: "OP-2026-0007838",
    cpfMasked: "***.771.220-**",
    nome: "José Carlos de Oliveira",
    convenio: "Prefeitura de Palhoça",
    matricula: "PALH-90441",
    produto: "portabilidade",
    valor: 26500,
    parcelas: 84,
    parcela: 498.7,
    taxaAm: 0.0158,
    margemComprometida: 498.7,
    margemDisponivel: 512.0,
    salarioLiquido: 6100.0,
    vinculo: "ESTATUTARIO",
    situacaoFuncional: "ATIVO",
    status: "em_analise",
    _criadaHorasAtras: 30,
    travaHoras: 168, // 7 dias uteis para portabilidade
    contratosAtivos: [
      { idUnico: "OP-2024-0091188", banco: "Banco Ômega", valorParcela: 531.2, parcelasRestantes: 58, situacao: "em_dia" },
    ],
    risco: { scoreInterno: 690, bureauSerasa: 641, bureauSpc: "sem_restricao", comprometimentoRenda: 0.34, recomendacao: "revisar" },
  },
  {
    idUnico: "OP-2026-0007835",
    cpfMasked: "***.309.514-**",
    nome: "Ana Lúcia Fernandes",
    convenio: "Prefeitura de Biguaçu",
    matricula: "BIG-33027",
    produto: "novo",
    valor: 9500,
    parcelas: 48,
    parcela: 268.1,
    taxaAm: 0.0182,
    margemComprometida: 268.1,
    margemDisponivel: 980.0,
    salarioLiquido: 3980.0,
    vinculo: "CLT",
    situacaoFuncional: "ATIVO",
    status: "aprovada",
    _criadaHorasAtras: 41,
    travaHoras: 48,
    contratosAtivos: [],
    risco: { scoreInterno: 810, bureauSerasa: 775, bureauSpc: "sem_restricao", comprometimentoRenda: 0.18, recomendacao: "aprovar" },
  },
  {
    idUnico: "OP-2026-0007829",
    cpfMasked: "***.118.663-**",
    nome: "Roberto Silva Nunes",
    convenio: "Prefeitura de São José",
    matricula: "SJ-11902",
    produto: "novo",
    valor: 32000,
    parcelas: 96,
    parcela: 601.4,
    taxaAm: 0.0171,
    margemComprometida: 601.4,
    margemDisponivel: 145.0,
    salarioLiquido: 7200.0,
    vinculo: "ESTATUTARIO",
    situacaoFuncional: "ATIVO",
    status: "aguardando_formalizacao",
    _criadaHorasAtras: 20,
    travaHoras: 48,
    contratosAtivos: [
      { idUnico: "OP-2023-0044120", banco: "Banco Delta", valorParcela: 410.0, parcelasRestantes: 12, situacao: "em_dia" },
    ],
    linkFormalizacao: "https://formaliza.bancodelta.com.br/ccb/OP-2026-0007829",
    canalEnvio: "email",
    risco: { scoreInterno: 705, bureauSerasa: 662, bureauSpc: "sem_restricao", comprometimentoRenda: 0.31, recomendacao: "aprovar" },
  },
  {
    idUnico: "OP-2026-0007811",
    cpfMasked: "***.554.087-**",
    nome: "Patrícia Gomes Alves",
    convenio: "Prefeitura de Palhoça",
    matricula: "PALH-77120",
    produto: "portabilidade",
    valor: 15400,
    parcelas: 60,
    parcela: 331.9,
    taxaAm: 0.0149,
    margemComprometida: 331.9,
    margemDisponivel: 720.0,
    salarioLiquido: 5100.0,
    vinculo: "ESTATUTARIO",
    situacaoFuncional: "ATIVO",
    status: "formalizada",
    _criadaHorasAtras: 60,
    travaHoras: 168,
    contratosAtivos: [
      { idUnico: "OP-2024-0077001", banco: "Banco Sigma", valorParcela: 358.4, parcelasRestantes: 44, situacao: "em_dia" },
    ],
    linkFormalizacao: "https://formaliza.bancodelta.com.br/ccb/OP-2026-0007811",
    canalEnvio: "sms",
    ccbUrl: "https://formaliza.bancodelta.com.br/ccb/OP-2026-0007811.pdf",
    risco: { scoreInterno: 768, bureauSerasa: 720, bureauSpc: "sem_restricao", comprometimentoRenda: 0.24, recomendacao: "aprovar" },
  },
  {
    idUnico: "OP-2026-0007802",
    cpfMasked: "***.902.331-**",
    nome: "Fernando Augusto Lima",
    convenio: "Prefeitura de Biguaçu",
    matricula: "BIG-40988",
    produto: "novo",
    valor: 12000,
    parcelas: 60,
    parcela: 279.5,
    taxaAm: 0.019,
    margemComprometida: 279.5,
    margemDisponivel: 60.0,
    salarioLiquido: 4100.0,
    vinculo: "COMISSIONADO",
    situacaoFuncional: "ATIVO",
    status: "recusada",
    _criadaHorasAtras: 90,
    travaHoras: 48,
    contratosAtivos: [
      { idUnico: "OP-2025-0033410", banco: "Banco Delta", valorParcela: 512.0, parcelasRestantes: 50, situacao: "em_dia" },
    ],
    motivoRecusa: "Margem disponível insuficiente após conferência da folha.",
    risco: { scoreInterno: 540, bureauSerasa: 498, bureauSpc: "com_restricao", comprometimentoRenda: 0.47, recomendacao: "negar" },
  },
  {
    idUnico: "OP-2026-0007790",
    cpfMasked: "***.640.155-**",
    nome: "Cláudia Regina Souza",
    convenio: "Prefeitura de São José",
    matricula: "SJ-20455",
    produto: "novo",
    valor: 22000,
    parcelas: 84,
    parcela: 421.0,
    taxaAm: 0.0175,
    margemComprometida: 421.0,
    margemDisponivel: 1100.0,
    salarioLiquido: 5600.0,
    vinculo: "ESTATUTARIO",
    situacaoFuncional: "ATIVO",
    status: "averbada",
    _criadaHorasAtras: 130,
    travaHoras: 48,
    contratosAtivos: [],
    linkFormalizacao: "https://formaliza.bancodelta.com.br/ccb/OP-2026-0007790",
    canalEnvio: "email",
    ccbUrl: "https://formaliza.bancodelta.com.br/ccb/OP-2026-0007790.pdf",
    risco: { scoreInterno: 795, bureauSerasa: 740, bureauSpc: "sem_restricao", comprometimentoRenda: 0.22, recomendacao: "aprovar" },
  },
  {
    idUnico: "OP-2026-0007774",
    cpfMasked: "***.287.400-**",
    nome: "Marcos Vinícius Pereira",
    convenio: "Prefeitura de Palhoça",
    matricula: "PALH-65001",
    produto: "portabilidade",
    valor: 19800,
    parcelas: 72,
    parcela: 388.2,
    taxaAm: 0.0162,
    margemComprometida: 388.2,
    margemDisponivel: 400.0,
    salarioLiquido: 4900.0,
    vinculo: "ESTATUTARIO",
    situacaoFuncional: "ATIVO",
    status: "expirada",
    _criadaHorasAtras: 200,
    travaHoras: 168,
    contratosAtivos: [
      { idUnico: "OP-2024-0060011", banco: "Banco Ômega", valorParcela: 402.0, parcelasRestantes: 39, situacao: "em_dia" },
    ],
    risco: { scoreInterno: 660, bureauSerasa: 610, bureauSpc: "sem_restricao", comprometimentoRenda: 0.33, recomendacao: "revisar" },
  },
];

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
