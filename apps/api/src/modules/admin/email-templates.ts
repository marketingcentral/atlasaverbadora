// Templates de email editaveis pela averbadora. Persistidos via
// upsertCollectionRow (jsonb) — mesmo padrao de beneficios/tokens.
// A averbadora edita o assunto/corpo/publico-alvo, e pode enviar um
// teste pro proprio email do operador logado.

import type { Env } from "../../env.js";
import { loadCollection, upsertCollectionRow, deleteCollectionRow, seedCollectionIfEmpty } from "../../db/repos.js";

const TABLE = "email_templates";

export type EmailPublico = "servidor" | "banco" | "prefeitura" | "averbadora";

/**
 * Evento que dispara o email — categoriza os templates no menu da averbadora.
 * - primeiro_acesso, recuperar_senha, redefinir_senha: fixos, nao excluiveis.
 * - simulacao: 1 template por (tipo, status) — ver simulacaoTipo/simulacaoStatus.
 * - beneficio: 1 template por beneficio (auto-criado/excluido junto com o beneficio).
 */
export type EmailEvento =
  | "primeiro_acesso"
  | "recuperar_senha"
  | "redefinir_senha"
  | "simulacao"
  | "beneficio";

export type SimulacaoTipo = "emprestimo" | "cartao_consignado" | "cartao_beneficio" | "portabilidade";
export type SimulacaoStatus = "enviada" | "aprovada" | "recusada" | "averbada";

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
  /** So pra evento="simulacao". */
  simulacaoTipo?: SimulacaoTipo;
  simulacaoStatus?: SimulacaoStatus;
  /** So pra evento="beneficio". Vincula 1:1 com AdminBeneficio.id. */
  beneficioId?: string;
  criadoEm: string;
  atualizadoEm: string;
}

const NOW = "2026-07-14T10:00:00.000Z";

/**
 * Seeds fixos: templates que TODO ambiente tem por padrao.
 * - Primeiro acesso / Recuperar / Redefinir senha: 1 template por perfil (4 cada).
 * - Simulacao: 1 por combinacao (tipo x status). O operador ajusta o texto.
 * - Beneficio: NAO tem seed — sao criados dinamicamente quando o admin cria
 *   um beneficio via /averbadora/beneficios (auto-hook no criar/deletar).
 */
const PERFIS: EmailPublico[] = ["servidor", "banco", "prefeitura", "averbadora"];

function tplPrimeiroAcesso(p: EmailPublico): EmailTemplate {
  return {
    id: `TPL-primeiro-acesso-${p}`, evento: "primeiro_acesso", nome: `Primeiro acesso — ${capitalize(p)}`,
    publico: p, ativo: true, criadoEm: NOW, atualizadoEm: NOW,
    assunto: "Confirme seu primeiro acesso ao Atlas",
    corpo: "Olá {{nome}},\n\nUse o código abaixo para concluir seu primeiro acesso ao Atlas:\n\n{{codigo}}\n\nO código expira em {{expira_em}} minutos.\n\nSe você não iniciou este cadastro, ignore este e-mail.\n\nAtlas Averbadora",
    descricao: `Enviado quando um usuário do perfil "${p}" solicita o código de primeiro acesso.`,
    variaveis: ["nome", "codigo", "expira_em"],
  };
}

function tplRecuperarSenha(p: EmailPublico): EmailTemplate {
  return {
    id: `TPL-recuperar-senha-${p}`, evento: "recuperar_senha", nome: `Recuperar senha — ${capitalize(p)}`,
    publico: p, ativo: true, criadoEm: NOW, atualizadoEm: NOW,
    assunto: "Recupere sua senha do Atlas",
    corpo: "Olá {{nome}},\n\nRecebemos um pedido de recuperação de senha para sua conta.\n\nUse o código abaixo para redefinir sua senha:\n\n{{codigo}}\n\nO código expira em {{expira_em}} minutos.\n\nSe você não solicitou, ignore este e-mail — sua senha atual continua válida.\n\nAtlas Averbadora",
    descricao: `Enviado quando um usuário do perfil "${p}" clica em "Esqueci a senha".`,
    variaveis: ["nome", "codigo", "expira_em"],
  };
}

function tplRedefinirSenha(p: EmailPublico): EmailTemplate {
  return {
    id: `TPL-redefinir-senha-${p}`, evento: "redefinir_senha", nome: `Redefinir senha — ${capitalize(p)}`,
    publico: p, ativo: true, criadoEm: NOW, atualizadoEm: NOW,
    assunto: "Confirme a troca de senha do Atlas",
    corpo: "Olá {{nome}},\n\nUse o código abaixo para confirmar a troca da sua senha:\n\n{{codigo}}\n\nO código expira em {{expira_em}} minutos.\n\nSe não foi você que pediu a troca, entre em contato com o suporte imediatamente.\n\nAtlas Averbadora",
    descricao: `Enviado quando um usuário do perfil "${p}" pede pra trocar a senha (verificação por email).`,
    variaveis: ["nome", "codigo", "expira_em"],
  };
}

const SIM_TIPOS: SimulacaoTipo[] = ["emprestimo", "cartao_consignado", "cartao_beneficio", "portabilidade"];
const SIM_STATUS: SimulacaoStatus[] = ["enviada", "aprovada", "recusada", "averbada"];

function tplSimulacao(tipo: SimulacaoTipo, status: SimulacaoStatus, publico: EmailPublico): EmailTemplate {
  const nomeProduto = tipo === "emprestimo" ? "empréstimo consignado"
    : tipo === "cartao_consignado" ? "cartão consignado"
    : tipo === "cartao_beneficio" ? "cartão benefício"
    : "portabilidade";
  const acao = status === "enviada" ? "foi enviada"
    : status === "aprovada" ? "foi aprovada pelo banco"
    : status === "recusada" ? "foi recusada pelo banco"
    : "foi averbada em folha";
  return {
    id: `TPL-simulacao-${tipo}-${status}-${publico}`,
    evento: "simulacao", nome: `Simulação ${nomeProduto} — ${status} (${capitalize(publico)})`,
    publico, ativo: true, criadoEm: NOW, atualizadoEm: NOW,
    simulacaoTipo: tipo, simulacaoStatus: status,
    assunto: `Simulação de ${nomeProduto} — ${status}`,
    corpo: `Olá {{nome}},\n\nSua simulação de ${nomeProduto} (protocolo {{adf}}) ${acao}.\n\nValor: {{valor}}\nParcelas: {{parcelas}}x de {{valorParcela}}\nBanco: {{banco}}\n\nAtlas Averbadora`,
    descricao: `Disparado no perfil "${publico}" quando uma simulação de ${nomeProduto} muda para "${status}".`,
    variaveis: ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"],
  };
}

const SEED: EmailTemplate[] = [
  // Cliente pediu remocao dos templates fixos (primeiro-acesso + recuperar-senha)
  // em 16/07/2026 pra teste real do zero — sem seed, o fluxo cai no fallback
  // hardcoded do mailer.ts. Se restaurar pra demo, adicionar de volta:
  //   ...PERFIS.map(tplPrimeiroAcesso),
  //   ...PERFIS.map(tplRecuperarSenha),
  ...PERFIS.map(tplRedefinirSenha),
  // Simulacao: so servidor e banco (regra do cliente).
  ...SIM_TIPOS.flatMap((t) => SIM_STATUS.flatMap((s) => [
    tplSimulacao(t, s, "servidor"),
    tplSimulacao(t, s, "banco"),
  ])),
];

function capitalize(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

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

/** Remove template SEM restricao (uso interno pelo hook de cascade de beneficio).
 *  Handler HTTP nao expoe esse metodo diretamente — usa removerTemplateSeguro. */
export async function removerTemplate(env: Env, id: string): Promise<void> {
  await deleteCollectionRow(env, TABLE, id);
  _cache = null;
}

/** Remocao restrita: so permite apagar templates de evento="beneficio"
 *  (que sao dinamicos). Os demais sao fixos e nao podem sumir da UI. */
export async function removerTemplateSeguro(env: Env, id: string): Promise<{ ok: true } | { ok: false; motivo: string }> {
  const t = await getTemplate(env, id);
  if (!t) return { ok: false, motivo: "template não encontrado" };
  if (t.evento !== "beneficio") {
    return { ok: false, motivo: "templates fixos (primeiro acesso, senha, simulação) não podem ser excluídos manualmente" };
  }
  await removerTemplate(env, id);
  return { ok: true };
}

/** Cria (ou re-cria) um template atrelado a um beneficio. Chamado no upsert
 *  do beneficio. Se ja existe (por beneficioId), atualiza mantendo o assunto/
 *  corpo customizado pelo admin. */
export async function upsertTemplateBeneficio(
  env: Env,
  beneficio: { id: string; nome: string; publico?: EmailPublico },
): Promise<EmailTemplate> {
  const all = await loadTemplates(env);
  const existente = all.find((t) => t.evento === "beneficio" && t.beneficioId === beneficio.id);
  const now = new Date().toISOString();
  const base: EmailTemplate = existente ?? {
    id: `TPL-beneficio-${beneficio.id}`,
    evento: "beneficio",
    beneficioId: beneficio.id,
    nome: `Benefício — ${beneficio.nome}`,
    publico: beneficio.publico ?? "servidor",
    assunto: `Novo benefício disponível: ${beneficio.nome}`,
    corpo: `Olá {{nome}},\n\nO benefício "${beneficio.nome}" está disponível para você.\n\n{{desconto_label}} {{desconto_complemento}}\n\nAcesse o Atlas para ver os detalhes.\n\nAtlas Averbadora`,
    descricao: `Aviso enviado quando o benefício "${beneficio.nome}" fica disponível para o público-alvo.`,
    variaveis: ["nome", "desconto_label", "desconto_complemento"],
    ativo: true,
    criadoEm: now,
    atualizadoEm: now,
  };
  // Mantem os textos customizados pelo admin em edicoes subsequentes do beneficio.
  // Se o beneficio trocou de nome, atualiza SO o nome do template (nao o texto).
  const t: EmailTemplate = {
    ...base,
    nome: `Benefício — ${beneficio.nome}`,
    atualizadoEm: now,
  };
  await upsertCollectionRow(env, TABLE, t.id, t);
  _cache = null;
  return t;
}

/** Remove template vinculado a um beneficio (cascade quando o beneficio some). */
export async function removerTemplatePorBeneficio(env: Env, beneficioId: string): Promise<void> {
  const all = await loadTemplates(env);
  const alvo = all.find((t) => t.evento === "beneficio" && t.beneficioId === beneficioId);
  if (alvo) await removerTemplate(env, alvo.id);
}

/** Aplica {{var}} no assunto e corpo. Chaves nao preenchidas ficam como
 *  literal (util pra debug — o operador ve que a variavel nao foi passada). */
export function renderTemplate(t: EmailTemplate, vars: Record<string, string>): { assunto: string; corpo: string } {
  const apply = (s: string) => s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => vars[k] ?? `{{${k}}}`);
  return { assunto: apply(t.assunto), corpo: apply(t.corpo) };
}

/**
 * Valores realistas por variavel — usado pra pre-preencher o teste manual
 * no /averbadora/emails. O operador nao precisa digitar cada campo: cai
 * um exemplo coerente e ele pode sobrescrever se quiser.
 *
 * Cobre as variaveis mais comuns dos templates fixos (nome, codigo,
 * expira_em, adf, valor, parcelas, valorParcela, banco, matricula,
 * prefeitura, motivo, desconto_label, desconto_complemento, contract_name).
 * Variaveis desconhecidas ficam como "Exemplo {{var}}" pra deixar claro
 * ao operador que precisa preencher manualmente.
 */
export function exemploVarsRealistas(t: EmailTemplate): Record<string, string> {
  const declaradas = Array.from(new Set([
    ...(t.variaveis ?? []),
    ...extrairVariaveis(t.assunto),
    ...extrairVariaveis(t.corpo),
  ]));
  const defaults: Record<string, string> = {
    nome: "Adriana Marques da Silva",
    codigo: "168348",
    expira_em: "10",
    adf: "9518368",
    valor: "R$ 8.500,00",
    parcelas: "36",
    valorParcela: "R$ 320,00",
    banco: "Banco Atlas",
    matricula: "852029100",
    prefeitura: "Palhoça",
    motivo: "Análise de crédito não aprovada",
    desconto_label: "12% desconto",
    desconto_complemento: "em medicamentos",
    contract_name: "CCB-2026-9518368",
    email: "adriana.silva@palhoca.sc.gov.br",
    telefone: "(48) 99101-2233",
  };
  const out: Record<string, string> = {};
  for (const v of declaradas) {
    out[v] = defaults[v] ?? `Exemplo ${v}`;
  }
  return out;
}

function extrairVariaveis(s: string): string[] {
  const re = /\{\{\s*(\w+)\s*\}\}/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) out.push(m[1]!);
  return out;
}

/**
 * Encontra o template ativo que casa com um filtro. Usado pelos handlers
 * de fluxo (proposta criada, aprovada, averbada, primeiro acesso, etc.)
 * pra achar o modelo certo e enviar automaticamente.
 *
 * Retorna undefined se nao houver template ativo — o chamador deve cair
 * no texto hardcoded como fallback (nunca deixar de notificar por falta
 * de template).
 */
export async function findTemplate(env: Env, filtro: {
  evento: EmailEvento;
  publico: EmailPublico;
  simulacaoTipo?: SimulacaoTipo;
  simulacaoStatus?: SimulacaoStatus;
  beneficioId?: string;
}): Promise<EmailTemplate | undefined> {
  const all = await loadTemplates(env);
  return all.find((t) => {
    if (!t.ativo) return false;
    if (t.evento !== filtro.evento) return false;
    if (t.publico !== filtro.publico) return false;
    if (filtro.evento === "simulacao") {
      if (filtro.simulacaoTipo && t.simulacaoTipo !== filtro.simulacaoTipo) return false;
      if (filtro.simulacaoStatus && t.simulacaoStatus !== filtro.simulacaoStatus) return false;
    }
    if (filtro.evento === "beneficio") {
      if (filtro.beneficioId && t.beneficioId !== filtro.beneficioId) return false;
    }
    return true;
  });
}
