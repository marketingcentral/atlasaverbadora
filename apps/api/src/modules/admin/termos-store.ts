// Templates de TERMOS que aparecem para o usuario aceitar.
//
// Diferente dos email-templates (que sao enviados por email), os termos sao
// blocos de texto exibidos DENTRO do app antes de uma acao — servidor aceita
// termo antes de virar proposta, prefeitura aceita anuencia LGPD, etc.
//
// Placeholders no formato {{var}} (mesma convencao dos email-templates).
// Cada tipo tem um seed inicial extraido do texto hardcoded pre-refatoracao.

import type { Env } from "../../env.js";
import { loadCollection, upsertCollectionRow } from "../../db/repos.js";

/** Tipos de termo suportados. Se voce adicionar um novo tipo, tambem adicione
 *  no seed abaixo pra o usuario ver conteudo default no editor. */
export type TermoTipo =
  | "emprestimo"
  | "portabilidade"
  | "refinanciamento"
  | "cartao_consignado"
  | "beneficio_generico"
  | "telemedicina"
  | "lgpd_servidor"
  | "anuencia_prefeitura";

export interface TermoTemplate {
  id: TermoTipo;
  titulo: string;
  /** Descricao curta que aparece no editor da averbadora — nao entra no aceite. */
  descricao: string;
  /** Placeholders disponiveis pra este tipo — usados pra hint no editor. */
  variaveis: string[];
  /** Corpo do termo com {{placeholders}}. Renderizado como HTML basico
   *  (paragrafos + negrito). Suporta multi-paragrafo separado por \n\n. */
  corpo: string;
  versao: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

const now = () => new Date().toISOString();

/** Substitui {{var}} pelo valor de vars[var]. Placeholder desconhecido vira "". */
export function renderTermo(corpo: string, vars: Record<string, string | number | undefined>): string {
  return corpo.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    const v = vars[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

const SEED: TermoTemplate[] = [
  {
    id: "emprestimo",
    titulo: "Termo de autorização — Empréstimo Consignado",
    descricao: "Exibido antes do servidor confirmar uma proposta de emprestimo consignado.",
    variaveis: ["tipoLabel", "valor", "parcelas", "parcela", "banco", "prazo"],
    corpo:
      "**Eu, titular do CPF acima identificado, autorizo expressamente a Atlas Averbadora** a registrar a averbação da minha margem consignável junto à minha prefeitura empregadora para a operação de **{{tipoLabel}}**, no valor de **{{valor}}**, em {{parcelas}} parcelas de **{{parcela}}**, junto ao banco **{{banco}}**.\n\n" +
      "Estou ciente de que ao confirmar este aceite minha margem ficará **indisponível** para outras operações pelo prazo de **{{prazo}}**, podendo ser liberada antes desse período mediante cancelamento da pré-reserva.\n\n" +
      "**LGPD e log de auditoria.** Este aceite será registrado com data, hora, endereço IP, dispositivo, CPF e identificador desta proposta para fins legais e de auditoria, conforme a Lei 13.709/2018.\n\n" +
      "**Custo Efetivo Total (CET).** A taxa apresentada é mensal e inclui juros remuneratórios, IOF, tarifas e seguros aplicáveis quando exigidos pelo convênio. O contrato definitivo será disponibilizado pelo banco após a aprovação.\n\n" +
      "Em caso de dúvidas, consulte a área \"Meus contratos\" para histórico ou entre em contato com o RH da sua prefeitura.",
    versao: "1.0", ativo: true, criadoEm: "2026-07-14T00:00:00.000Z", atualizadoEm: "2026-07-14T00:00:00.000Z",
  },
  {
    id: "portabilidade",
    titulo: "Termo de autorização — Portabilidade",
    descricao: "Exibido antes do servidor consolidar contratos em outro banco.",
    variaveis: ["banco", "valor", "parcelas", "parcela", "prazo"],
    corpo:
      "**Eu autorizo a Atlas Averbadora** a solicitar a portabilidade dos meus contratos consignados ativos para o banco **{{banco}}**, no valor consolidado de **{{valor}}**, em {{parcelas}} parcelas de **{{parcela}}**.\n\n" +
      "Estou ciente de que ao confirmar este aceite minha margem ficará **indisponível** para outras operações pelo prazo de **{{prazo}}**, tempo necessário para a operação de portabilidade se concretizar junto ao banco de origem.\n\n" +
      "**LGPD e log de auditoria.** Este aceite será registrado com data, hora, endereço IP e dispositivo para fins legais e de auditoria, conforme a Lei 13.709/2018 e a Resolução BACEN 4.292/2013.",
    versao: "1.0", ativo: true, criadoEm: "2026-07-14T00:00:00.000Z", atualizadoEm: "2026-07-14T00:00:00.000Z",
  },
  {
    id: "refinanciamento",
    titulo: "Termo de autorização — Refinanciamento",
    descricao: "Exibido antes do servidor refinanciar contrato existente com o mesmo banco.",
    variaveis: ["banco", "valor", "parcelas", "parcela", "prazo"],
    corpo:
      "**Eu autorizo o refinanciamento** do meu contrato consignado ativo junto ao banco **{{banco}}**, ampliando o valor para **{{valor}}** em {{parcelas}} parcelas de **{{parcela}}**.\n\n" +
      "Estou ciente de que a diferença entre o novo valor e o saldo devedor atual pode ser liberada como \"troco\" na minha conta, e que minha margem ficará **indisponível** pelo prazo de **{{prazo}}**.\n\n" +
      "**LGPD e log de auditoria.** Este aceite será registrado com data, hora, endereço IP e dispositivo, conforme a Lei 13.709/2018.",
    versao: "1.0", ativo: true, criadoEm: "2026-07-14T00:00:00.000Z", atualizadoEm: "2026-07-14T00:00:00.000Z",
  },
  {
    id: "cartao_consignado",
    titulo: "Termo de autorização — Cartão de Crédito Consignado",
    descricao: "Exibido antes do servidor solicitar cartão consignado.",
    variaveis: ["banco", "limite", "produto"],
    corpo:
      "**Eu autorizo** a solicitação de {{produto}} com limite de **{{limite}}** junto ao banco **{{banco}}**.\n\n" +
      "Ciente de que a fatura mensal será descontada em folha até o limite de 5% do meu salário líquido (margem cartão consignado).",
    versao: "1.0", ativo: true, criadoEm: "2026-07-14T00:00:00.000Z", atualizadoEm: "2026-07-14T00:00:00.000Z",
  },
  {
    id: "beneficio_generico",
    titulo: "Termo de adesão — Benefício",
    descricao: "Exibido antes do servidor aderir a um beneficio negociado pela Atlas.",
    variaveis: ["parceiro", "duracaoMinima"],
    corpo:
      "**Eu, titular do CPF acima**, adiro ao benefício oferecido por **{{parceiro}}** através da Atlas Averbadora.\n\n" +
      "Ciente de que os descontos são concedidos exclusivamente mediante apresentação da minha matrícula ativa e podem ser modificados a qualquer momento pelo parceiro.\n\n" +
      "{{duracaoMinima}}",
    versao: "1.0", ativo: true, criadoEm: "2026-07-14T00:00:00.000Z", atualizadoEm: "2026-07-14T00:00:00.000Z",
  },
  {
    id: "telemedicina",
    titulo: "Termo de adesão — Telemedicina Atlas",
    descricao: "Exibido antes do servidor aderir a telemedicina (compromisso minimo de 12 meses).",
    variaveis: ["parceiro"],
    corpo:
      "**Eu adiro ao serviço de Telemedicina Atlas** oferecido por **{{parceiro}}**.\n\n" +
      "**Compromisso mínimo de 12 (doze) meses.** Estou ciente que o serviço tem período mínimo de contratação e o cancelamento antes desse prazo pode implicar em cobrança da mensalidade proporcional aos meses restantes.\n\n" +
      "Consultas online com médicos parceiros, ilimitadas, incluídas no plano. Especialidades: clínica geral, pediatria, psicologia e nutrição.\n\n" +
      "**LGPD.** Seus dados de consulta ficam armazenados exclusivamente com o parceiro médico e nunca são compartilhados com a Atlas.",
    versao: "1.0", ativo: true, criadoEm: "2026-07-14T00:00:00.000Z", atualizadoEm: "2026-07-14T00:00:00.000Z",
  },
  {
    id: "lgpd_servidor",
    titulo: "Termo LGPD — Servidor (primeiro acesso)",
    descricao: "Exibido no primeiro acesso do servidor, junto do formulario de senha/email.",
    variaveis: [],
    corpo:
      "**Autorização de tratamento de dados (LGPD).** Ao criar minha conta, autorizo a Atlas Averbadora a tratar meus dados pessoais (nome, CPF, matrícula, e-mail, telefone, salário líquido, vínculo empregatício) exclusivamente para as finalidades de:\n\n" +
      "1. Simulação e contratação de crédito consignado.\n" +
      "2. Consulta e reserva de margem consignável junto à minha prefeitura empregadora.\n" +
      "3. Comunicação sobre propostas, contratos e serviços parceiros.\n" +
      "4. Cumprimento de obrigações legais e regulatórias (BACEN, LGPD, Receita Federal).\n\n" +
      "Estou ciente que posso revogar essa autorização a qualquer momento, dos direitos previstos na Lei 13.709/2018 (Art. 18), e que o compartilhamento com bancos parceiros só ocorre quando eu explicitamente iniciar uma simulação ou contratação.",
    versao: "1.0", ativo: true, criadoEm: "2026-07-14T00:00:00.000Z", atualizadoEm: "2026-07-14T00:00:00.000Z",
  },
  {
    id: "anuencia_prefeitura",
    titulo: "Anuência LGPD — Prefeitura",
    descricao: "Aceite obrigatorio pra prefeitura importar/manter base de servidores no Atlas.",
    variaveis: [],
    corpo:
      "A prefeitura declara ser o controlador dos dados pessoais dos servidores importados na Atlas Averbadora e autoriza expressamente a operação desses dados pela Atlas na qualidade de operadora, nos termos da Lei 13.709/2018 (LGPD).\n\n" +
      "**Finalidades autorizadas:**\n" +
      "1. Consulta e reserva de margem consignável para operações de crédito consignado dos servidores.\n" +
      "2. Registro de propostas, contratos e movimentações de folha.\n" +
      "3. Comunicação com bancos parceiros conforme convênios vigentes.\n\n" +
      "**Base legal:** execução de contrato de averbação (Art. 7º, V da LGPD).\n\n" +
      "**Vigência:** enquanto durar o contrato de averbação. A prefeitura pode revogar mediante notificação por escrito com 30 dias de antecedência.",
    versao: "1.0", ativo: true, criadoEm: "2026-07-14T00:00:00.000Z", atualizadoEm: "2026-07-14T00:00:00.000Z",
  },
];

const _termos: TermoTemplate[] = SEED.map((t) => ({ ...t }));

const COLLECTION = "termos_templates";
let _loaded = false;
let _loadPromise: Promise<void> | null = null;

export function ensureTermosLoaded(env: Env): Promise<void> {
  if (_loaded) return Promise.resolve();
  if (!_loadPromise) {
    _loadPromise = (async () => {
      try {
        const rows = await loadCollection<TermoTemplate>(env, COLLECTION);
        if (rows.length) {
          // Substitui in-memory pelos persistidos + acrescenta seeds novos
          // que ainda nao existem no PG (idempotencia pra novos tipos futuros).
          const seenIds = new Set(rows.map((r) => r.id));
          const merged = [...rows, ...SEED.filter((s) => !seenIds.has(s.id))];
          _termos.length = 0;
          _termos.push(...merged);
        }
        _loaded = true;
      } catch { _loaded = true; _loadPromise = null; }
    })();
  }
  return _loadPromise;
}

async function persist(env: Env, t: TermoTemplate): Promise<void> {
  try { await upsertCollectionRow(env, COLLECTION, t.id, t); } catch { /* fail-safe */ }
}

export function listTermos(): TermoTemplate[] {
  return [..._termos].sort((a, b) => a.titulo.localeCompare(b.titulo));
}

export function getTermo(tipo: TermoTipo): TermoTemplate | undefined {
  return _termos.find((t) => t.id === tipo && t.ativo !== false);
}

export async function upsertTermo(env: Env, tipo: TermoTipo, patch: Partial<Pick<TermoTemplate, "titulo" | "descricao" | "corpo" | "ativo" | "versao">>): Promise<TermoTemplate | undefined> {
  const t = _termos.find((x) => x.id === tipo);
  if (!t) return undefined;
  if (patch.titulo !== undefined) t.titulo = patch.titulo;
  if (patch.descricao !== undefined) t.descricao = patch.descricao;
  if (patch.corpo !== undefined) t.corpo = patch.corpo;
  if (patch.ativo !== undefined) t.ativo = patch.ativo;
  if (patch.versao !== undefined) t.versao = patch.versao;
  t.atualizadoEm = now();
  await persist(env, t);
  return t;
}
