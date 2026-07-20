// Configuracao dos campos de servidor POR PREFEITURA.
//
// Cada prefeitura pode definir quais campos quer usar no cadastro/importacao de
// servidores. A config afeta 3 coisas ao mesmo tempo: (1) colunas da tabela em
// /averbadora/servidores/visualizar, (2) colunas do CSV modelo baixado, (3)
// validacao/parsing do CSV importado.
//
// Campos TRAVADOS (nao podem ser desligados): cpf, matricula, email — sao a
// identidade + login do servidor. O restante e ligavel/desligavel + labels
// editaveis, e a prefeitura pode adicionar campos CUSTOM livres (guardados em
// `camposCustom: Record<string,string>` dentro do servidor).
//
// Persistencia: mesma pattern do id-unico — collection jsonb `admin_servidor_
// campos_configs` chaveada por String(prefeituraId). refresh recarrega do PG
// (cross-isolate sync), persist e write-through best-effort.

import { loadCollection, upsertCollectionRow } from "../../db/repos.js";
import type { Env } from "../../env.js";

const PG_TABLE = "admin_servidor_campos_configs";

export type ServidorCampoTipo = "texto" | "numero" | "data" | "moeda" | "email" | "telefone";

export interface ServidorCampoConfig {
  /** "cargo" (sistema) | "custom_lotacao" (livre). Snake/kebab; ver `slugify`. */
  key: string;
  /** Rotulo exibido na tabela / CSV. */
  label: string;
  tipo: ServidorCampoTipo;
  obrigatorio: boolean;
  visivel: boolean;
  ordem: number;
  /** true = campo built-in do ServidorBuscaMock; false = campo custom livre. */
  sistema: boolean;
  /** true SO para cpf/matricula/email — visivel+obrigatorio sao imutaveis. */
  travado?: boolean;
}

export interface ServidorCamposConfig {
  prefeituraId: number;
  campos: ServidorCampoConfig[];
  atualizadoEm: string;
}

/** Chaves travadas — visivel:true + obrigatorio:true sao imutaveis via API. */
export const CHAVES_TRAVADAS: readonly string[] = ["cpf", "matricula", "email"];

/** Chaves built-in (sistema:true). Devem existir no shape ServidorBuscaMock.
 *  Ordem aqui = ordem default de exibicao. */
const CHAVES_SISTEMA: { key: string; label: string; tipo: ServidorCampoTipo }[] = [
  { key: "cpf", label: "CPF", tipo: "texto" },
  { key: "matricula", label: "Matrícula", tipo: "texto" },
  { key: "email", label: "E-mail", tipo: "email" },
  { key: "nome", label: "Nome", tipo: "texto" },
  { key: "telefone", label: "Telefone", tipo: "telefone" },
  { key: "cargo", label: "Cargo", tipo: "texto" },
  { key: "vinculo", label: "Vínculo", tipo: "texto" },
  { key: "situacaoFuncional", label: "Situação funcional", tipo: "texto" },
  { key: "salarioLiquido", label: "Salário líquido", tipo: "moeda" },
  { key: "idConvenio", label: "Convênio", tipo: "texto" },
  { key: "dataAdmissao", label: "Admissão", tipo: "data" },
  { key: "dataNascimento", label: "Nascimento", tipo: "data" },
  { key: "endereco", label: "Endereço", tipo: "texto" },
  { key: "codigoIbge", label: "Código IBGE", tipo: "numero" },
];

/** Gera a config default (usada por ensure quando prefeitura ainda nao tem
 *  config propria e pelo botao "Restaurar padrao" no editor). Todos os built-in
 *  visiveis; cpf/matricula/nome/email obrigatorios. */
export function defaultCamposSet(): ServidorCampoConfig[] {
  return CHAVES_SISTEMA.map((c, i) => ({
    key: c.key,
    label: c.label,
    tipo: c.tipo,
    obrigatorio: c.key === "cpf" || c.key === "matricula" || c.key === "nome" || c.key === "email",
    visivel: true,
    ordem: i,
    sistema: true,
    travado: CHAVES_TRAVADAS.includes(c.key) ? true : undefined,
  }));
}

/** Normaliza campos vindos do cliente: forca visivel+obrigatorio+travado nos
 *  campos travados; ordena; garante todos os travados presentes (adiciona os
 *  que faltarem no fim). Usado antes de persistir. */
export function sanitizeCampos(input: ServidorCampoConfig[]): ServidorCampoConfig[] {
  const seen = new Set<string>();
  const out: ServidorCampoConfig[] = [];
  for (const c of input) {
    if (!c.key) continue;
    if (seen.has(c.key)) continue;
    seen.add(c.key);
    const travado = CHAVES_TRAVADAS.includes(c.key);
    out.push({
      key: c.key,
      label: (c.label || "").trim() || c.key,
      tipo: c.tipo || "texto",
      obrigatorio: travado ? true : !!c.obrigatorio,
      visivel: travado ? true : c.visivel !== false,
      ordem: typeof c.ordem === "number" ? c.ordem : out.length,
      sistema: !!c.sistema,
      travado: travado ? true : undefined,
    });
  }
  // Garante que todo travado esteja na config, mesmo que o payload nao mande.
  for (const k of CHAVES_TRAVADAS) {
    if (seen.has(k)) continue;
    const meta = CHAVES_SISTEMA.find((s) => s.key === k)!;
    out.push({
      key: k,
      label: meta.label,
      tipo: meta.tipo,
      obrigatorio: true,
      visivel: true,
      ordem: out.length,
      sistema: true,
      travado: true,
    });
  }
  return out.sort((a, b) => a.ordem - b.ordem).map((c, i) => ({ ...c, ordem: i }));
}

const _configs: ServidorCamposConfig[] = [];

export function listServidorCamposConfigs(): ServidorCamposConfig[] {
  return _configs.slice();
}

export function getServidorCamposConfig(prefeituraId: number): ServidorCamposConfig | undefined {
  return _configs.find((c) => c.prefeituraId === prefeituraId);
}

export function upsertServidorCamposConfig(input: Omit<ServidorCamposConfig, "atualizadoEm">): ServidorCamposConfig {
  const idx = _configs.findIndex((c) => c.prefeituraId === input.prefeituraId);
  const next: ServidorCamposConfig = {
    prefeituraId: input.prefeituraId,
    campos: sanitizeCampos(input.campos),
    atualizadoEm: new Date().toISOString(),
  };
  if (idx >= 0) _configs[idx] = next;
  else _configs.push(next);
  return next;
}

export async function refreshServidorCamposConfigs(env: Env): Promise<void> {
  try {
    const rows = await loadCollection<ServidorCamposConfig>(env, PG_TABLE);
    _configs.length = 0;
    _configs.push(...rows);
  } catch { /* fail-safe */ }
}

export async function persistServidorCamposConfig(env: Env, cfg: ServidorCamposConfig): Promise<void> {
  try {
    await upsertCollectionRow(env, PG_TABLE, String(cfg.prefeituraId), cfg);
  } catch { /* fail-safe */ }
}

/** Retorna a config da prefeitura, criando default caso ainda nao exista.
 *  NAO persiste no PG — o chamador decide (evita write-em-massa em GET). */
export function ensureServidorCamposConfig(prefeituraId: number): ServidorCamposConfig {
  const existing = getServidorCamposConfig(prefeituraId);
  if (existing) return existing;
  return upsertServidorCamposConfig({ prefeituraId, campos: defaultCamposSet() });
}
