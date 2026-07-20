// Beneficios/descontos comerciais e de saude — averbadora cadastra por prefeitura.
// Servidor ve na aba /servidor/saude (categoria "saude") ou /servidor/beneficios
// (as demais categorias — comercial). Persistidos em admin_beneficios (jsonb).
//
// Origem indica QUEM disponibiliza: "banco" (via cartao consignado) ou "averbadora"
// (negocia com comercio local). Nao existe hard-delete: pausar/reativar via ativo.

import type { Env } from "../../env.js";
import { loadCollection, upsertCollectionRow } from "../../db/repos.js";

export type CategoriaBeneficio =
  | "saude" | "alimentacao" | "educacao" | "lazer" | "telemedicina"
  | "academia" | "farmacia" | "supermercado";
export type ModoImagens = "nenhum" | "unica" | "carrossel";
export interface LinkAcessoBeneficio {
  url: string;
  textoBotao?: string;
}
export type OrigemBeneficio = "banco" | "averbadora" | "prefeitura" | "convenio";
export type TipoDesconto = "percentual" | "valor_fixo" | "preco_especial" | "gratuidade";
export type ModoUso = "cartao_consignado" | "matricula" | "cpf" | "codigo" | "qr";
export type DestaqueBeneficio = "novo" | "popular" | "exclusivo" | "desconto_extra";

export interface EnderecoBeneficio {
  cep?: string; logradouro?: string; numero?: string; complemento?: string;
  bairro?: string; cidade?: string; uf?: string;
}
export interface ContatoBeneficio {
  telefone?: string; whatsapp?: string; email?: string; site?: string; instagram?: string;
}
export interface DescontoBeneficio {
  tipo: TipoDesconto;
  valor?: number;
  aplicavelEm?: string;
  limiteMensal?: number;
  cumulativo?: boolean;
}
export interface ComoUsarBeneficio {
  modo: ModoUso;
  codigoPromocional?: string;
  instrucoes?: string;
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
  inicio?: string; fim?: string;
  diasSemana?: number[]; horaInicio?: string; horaFim?: string;
}
export interface ResponsavelBeneficio {
  nome?: string; email?: string; telefone?: string; cargo?: string;
}

export interface Beneficio {
  id: string;
  /** ID da prefeitura a que o beneficio pertence (isolamento por cidade). */
  prefeituraId: number;
  nome: string;
  categorias: CategoriaBeneficio[];
  /** "Castro Centro", "Palhoca", etc. */
  local: string;
  /** Emoji do card. Ex.: "💊", "🛒", "💪". */
  icone: string;
  /** Cor de destaque do avatar (hex). */
  cor: string;
  /** "10% desconto". */
  descontoLabel: string;
  /** "em medicamentos". */
  descontoComplemento: string;
  /** Quem disponibiliza. banco (via cartao consignado), averbadora (comercio local
   *  negociado), prefeitura (direto do RH), convenio (convenio medico/farmacia). */
  origem: OrigemBeneficio;
  ativo: boolean;
  criadoEm: string;
  criadoPor: string;
  // ===== Campos estendidos (fatia "detalhes completos") — todos opcionais =====
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
  /** Obrigatorio quando origem="banco": id do banco parceiro que oferece. */
  bancoId?: number;
  /** Obrigatorio quando origem="convenio": id do convenio da prefeitura. */
  convenioId?: string;
  /** F5: valor mensal em R$ quando o beneficio vira ADF (assinatura mensal
   *  descontada em folha). Opcional — se nao tiver, servidor nao pode "Contratar",
   *  so pode clicar no link externo (fluxo antigo). */
  valorMensal?: number;
  imagens?: string[];
  modoImagens?: ModoImagens;
  linkAcesso?: LinkAcessoBeneficio;
  /** Se true, aparece em todas as prefeituras parceiras — incluindo as
   *  cadastradas no futuro. Prevalece sobre prefeituraIdsExtras. */
  todasPrefeiturasParceiras?: boolean;
  /** Compromisso minimo em MESES pra o servidor aderir. Ex.: telemedicina = 12.
   *  0 ou undefined = sem compromisso minimo (mensal, cancelavel a qualquer momento).
   *  UI mostra badge "Compromisso: N meses" quando > 0. */
  duracaoMinimaMeses?: number;
}

const TABLE = "admin_beneficios";
const CACHE: { list: Beneficio[]; loaded: boolean } = { list: [], loaded: false };

export async function loadBeneficios(env: Env): Promise<Beneficio[]> {
  if (CACHE.loaded) return CACHE.list;
  const rows = await loadCollection<Beneficio>(env, TABLE).catch(() => []);
  CACHE.list = rows;
  CACHE.loaded = true;
  return CACHE.list;
}

export async function refreshBeneficios(env: Env): Promise<Beneficio[]> {
  const rows = await loadCollection<Beneficio>(env, TABLE).catch(() => CACHE.list);
  CACHE.list = rows;
  CACHE.loaded = true;
  return CACHE.list;
}

export async function persistBeneficio(env: Env, b: Beneficio): Promise<void> {
  try { await upsertCollectionRow(env, TABLE, b.id, b); } catch { /* fail-safe */ }
  const i = CACHE.list.findIndex((x) => x.id === b.id);
  if (i >= 0) CACHE.list[i] = b; else CACHE.list.push(b);
}

/** Proximo id sequencial: BEN-N. */
export function nextBeneficioId(): string {
  const maxN = CACHE.list.reduce((m, b) => {
    const n = Number(b.id.split("-").pop());
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `BEN-${maxN + 1}`;
}
