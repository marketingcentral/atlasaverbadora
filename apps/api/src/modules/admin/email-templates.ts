// Templates de email editaveis pela averbadora. Persistidos via
// upsertCollectionRow (jsonb) — mesmo padrao de beneficios/tokens.
// A averbadora edita o assunto/corpo/publico-alvo, e pode enviar um
// teste pro proprio email do operador logado.

import type { Env } from "../../env.js";
import { loadCollection, upsertCollectionRow, deleteCollectionRow, seedCollectionIfEmpty } from "../../db/repos.js";

const TABLE = "email_templates";

export type EmailPublico = "servidor" | "banco" | "prefeitura" | "averbadora";

export interface EmailTemplate {
  id: string;
  nome: string;
  publico: EmailPublico;
  assunto: string;
  corpo: string;
  /** Descricao interna do que dispara o email (docs pra o operador). */
  descricao?: string;
  /** Placeholders {{name}} que o corpo/assunto usam. Preenchidos ao enviar. */
  variaveis?: string[];
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

// Seed de 5 templates cobrindo os eventos mais comuns do fluxo. Servem
// como base editavel — a averbadora pode ajustar tom/assinatura.
const SEED: EmailTemplate[] = [
  {
    id: "TPL-001",
    nome: "Boas-vindas ao servidor",
    publico: "servidor",
    assunto: "Bem-vindo(a) ao Atlas, {{nome}}!",
    corpo: "Olá {{nome}},\n\nSua conta no Atlas foi criada com sucesso. Você já pode acessar o app e consultar sua margem consignável, simular empréstimos e acompanhar seus contratos.\n\nMatrícula: {{matricula}}\nPrefeitura: {{prefeitura}}\n\nQualquer dúvida, estamos por aqui.\n\nAtlas Averbadora",
    descricao: "Enviado quando o servidor conclui o primeiro acesso.",
    variaveis: ["nome", "matricula", "prefeitura"],
    ativo: true,
    criadoEm: "2026-07-14T10:00:00.000Z",
    atualizadoEm: "2026-07-14T10:00:00.000Z",
  },
  {
    id: "TPL-002",
    nome: "Proposta aprovada pelo banco",
    publico: "servidor",
    assunto: "Sua proposta {{adf}} foi aprovada",
    corpo: "Olá {{nome}},\n\nBoa notícia! O {{banco}} aprovou sua proposta de crédito consignado.\n\nValor: {{valor}}\nParcelas: {{parcelas}}x de {{valorParcela}}\n\nEm breve o banco entrará em contato para fechar o contrato — a assinatura acontece presencialmente com a equipe do banco.\n\nAtlas Averbadora",
    descricao: "Disparado quando o banco aprova uma proposta no /banco/propostas.",
    variaveis: ["nome", "adf", "banco", "valor", "parcelas", "valorParcela"],
    ativo: true,
    criadoEm: "2026-07-14T10:00:00.000Z",
    atualizadoEm: "2026-07-14T10:00:00.000Z",
  },
  {
    id: "TPL-003",
    nome: "Proposta recusada",
    publico: "servidor",
    assunto: "Sua proposta {{adf}} foi recusada",
    corpo: "Olá {{nome}},\n\nInfelizmente o {{banco}} não aprovou sua proposta desta vez.\n\nMotivo informado: {{motivo}}\n\nSua margem foi liberada de volta — você pode simular outra proposta a qualquer momento.\n\nAtlas Averbadora",
    descricao: "Disparado quando o banco recusa uma proposta.",
    variaveis: ["nome", "adf", "banco", "motivo"],
    ativo: true,
    criadoEm: "2026-07-14T10:00:00.000Z",
    atualizadoEm: "2026-07-14T10:00:00.000Z",
  },
  {
    id: "TPL-004",
    nome: "Contrato averbado em folha",
    publico: "servidor",
    assunto: "Contrato {{adf}} averbado — recurso liberado",
    corpo: "Olá {{nome}},\n\nSua averbação foi confirmada em folha pela prefeitura. O recurso já pode ser liberado pelo {{banco}} conforme o combinado.\n\nValor financiado: {{valor}}\nParcela: {{parcelas}}x de {{valorParcela}}\n\nAcompanhe o desconto na próxima folha de pagamento.\n\nAtlas Averbadora",
    descricao: "Disparado quando a averbadora aplica o ADF em folha.",
    variaveis: ["nome", "adf", "banco", "valor", "parcelas", "valorParcela"],
    ativo: true,
    criadoEm: "2026-07-14T10:00:00.000Z",
    atualizadoEm: "2026-07-14T10:00:00.000Z",
  },
  {
    id: "TPL-005",
    nome: "Notificação para o banco parceiro",
    publico: "banco",
    assunto: "Nova proposta aguardando análise — {{adf}}",
    corpo: "Prezados,\n\nUma nova proposta caiu na sua fila:\n\nServidor: {{nome}} (matrícula {{matricula}})\nValor: {{valor}} em {{parcelas}}x\n\nAcesse o portal Atlas Banco para analisar.\n\nAtlas Averbadora",
    descricao: "Aviso automático quando o servidor solicita nova proposta.",
    variaveis: ["adf", "nome", "matricula", "valor", "parcelas"],
    ativo: true,
    criadoEm: "2026-07-14T10:00:00.000Z",
    atualizadoEm: "2026-07-14T10:00:00.000Z",
  },
];

let _cache: EmailTemplate[] | null = null;

export async function loadTemplates(env: Env): Promise<EmailTemplate[]> {
  if (_cache) return _cache;
  await seedCollectionIfEmpty(env, TABLE, SEED.map((t) => ({ id: t.id, data: t })));
  const rows = await loadCollection<EmailTemplate>(env, TABLE);
  _cache = rows.sort((a, b) => a.nome.localeCompare(b.nome));
  return _cache;
}

export async function getTemplate(env: Env, id: string): Promise<EmailTemplate | undefined> {
  const all = await loadTemplates(env);
  return all.find((t) => t.id === id);
}

export async function upsertTemplate(env: Env, input: Omit<EmailTemplate, "id" | "criadoEm" | "atualizadoEm"> & { id?: string }): Promise<EmailTemplate> {
  const all = await loadTemplates(env);
  const now = new Date().toISOString();
  const existente = input.id ? all.find((t) => t.id === input.id) : undefined;
  const t: EmailTemplate = existente
    ? { ...existente, ...input, id: existente.id, atualizadoEm: now }
    : { ...input, id: input.id ?? `TPL-${Date.now().toString(36).toUpperCase()}`, criadoEm: now, atualizadoEm: now };
  await upsertCollectionRow(env, TABLE, t.id, t);
  _cache = null; // invalida cache do isolate
  return t;
}

export async function removerTemplate(env: Env, id: string): Promise<void> {
  await deleteCollectionRow(env, TABLE, id);
  _cache = null;
}

/** Aplica {{var}} no assunto e corpo. Chaves nao preenchidas ficam como
 *  literal (util pra debug — o operador ve que a variavel nao foi passada). */
export function renderTemplate(t: EmailTemplate, vars: Record<string, string>): { assunto: string; corpo: string } {
  const apply = (s: string) => s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => vars[k] ?? `{{${k}}}`);
  return { assunto: apply(t.assunto), corpo: apply(t.corpo) };
}
