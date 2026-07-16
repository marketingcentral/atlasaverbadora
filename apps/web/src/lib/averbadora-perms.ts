// Gating de acesso granular por RECURSO para o painel da averbadora.
//
// Modelo atual (2026-07-14): cada usuario tem `permissoes: string[]` — um array
// livre de "resource keys" (ex.: "bancos", "adf", "prefeituras"). "*" = wildcard
// (supervisor). O JWT carrega esse array em `averbadora_permissoes`.
//
// Presets sao apenas atalhos de preenchimento no modal de criar/editar usuario.
// Depois de escolher um preset, o admin pode marcar/desmarcar caixas — vira
// "personalizado". A fonte de verdade e sempre o array `permissoes`.
//
// Enforcement REAL vive no backend (requirePermissao). Esta lib faz o gate no
// frontend: esconde itens de menu, redireciona rota fora do escopo.

export type AverbadoraPerfil =
  | "operador" | "supervisor" | "comercial" | "financeiro" | "auditoria" | "personalizado";

/** Todos os perfis existentes — util pra iterar em UIs. */
export const TODOS_PERFIS: AverbadoraPerfil[] = [
  "supervisor", "operador", "comercial", "financeiro", "auditoria", "personalizado",
];

/** Todos os recursos (resource keys) do painel, agrupados por categoria.
 *  Espelha os itens do menu em layout.tsx — se voce adicionar aba nova, adicione
 *  a chave aqui pra ela aparecer na matriz de checkboxes ao criar usuario. */
export const RESOURCE_GROUPS: { titulo: string; recursos: { key: string; label: string; descricao?: string }[] }[] = [
  {
    titulo: "Geral",
    recursos: [
      { key: "dashboard", label: "Dashboard", descricao: "Visao geral, KPIs" },
      { key: "health", label: "Health", descricao: "Uptime/p95 dos endpoints" },
      { key: "conta", label: "Minha conta", descricao: "Self-service (senha, 2FA, tema)" },
    ],
  },
  {
    titulo: "Cadastros operacionais",
    recursos: [
      { key: "prefeituras", label: "Prefeituras" },
      { key: "convenios", label: "Convenios" },
      { key: "servidores", label: "Servidores" },
      { key: "pre-reservas", label: "Pre-reservas" },
      { key: "tombamento", label: "Tombamento" },
      { key: "adf", label: "ADF (Descontos em folha)" },
      { key: "portabilidade", label: "Portabilidade (marketplace)" },
      { key: "beneficios", label: "Beneficios" },
      { key: "telemedicina", label: "Telemedicina" },
      { key: "interessados", label: "Interessados" },
    ],
  },
  {
    titulo: "Bancos",
    recursos: [
      { key: "bancos", label: "Bancos parceiros", descricao: "CRUD sensivel" },
    ],
  },
  {
    titulo: "Financeiro",
    recursos: [
      { key: "folhas", label: "Folhas" },
      { key: "bate-carteira", label: "Bate de carteira" },
    ],
  },
  {
    titulo: "Comercial",
    recursos: [
      { key: "vitrine", label: "Vitrine" },
      { key: "comunicados", label: "Comunicados (todos)" },
      { key: "comunicados-banco", label: "Comunicados — Banco" },
      { key: "comunicados-servidor", label: "Comunicados — Servidor" },
    ],
  },
  {
    titulo: "E-mails do sistema",
    recursos: [
      { key: "email-sistema", label: "Editor de templates" },
      { key: "email-primeiro-acesso", label: "E-mail: primeiro acesso" },
      { key: "email-recuperar-senha", label: "E-mail: recuperar senha" },
      { key: "email-redefinir-senha", label: "E-mail: redefinir senha" },
      { key: "email-simulacao", label: "E-mail: simulacao" },
      { key: "email-beneficios", label: "E-mail: beneficios" },
      { key: "termos", label: "Termos (editor)" },
    ],
  },
  {
    titulo: "Auditoria",
    recursos: [
      { key: "auditoria", label: "Trilha de auditoria" },
      { key: "logs", label: "Logs" },
    ],
  },
  {
    titulo: "Administracao restrita",
    recursos: [
      { key: "perfis", label: "Usuarios e permissoes" },
      { key: "id-unico", label: "ID unico" },
      { key: "api", label: "API (menu)" },
      { key: "api-docs", label: "API — Documentacao" },
      { key: "api-tokens", label: "API — Tokens" },
      { key: "api-webhooks", label: "API — Webhooks" },
      { key: "configuracoes", label: "Configuracoes", descricao: "SMTP + OpenAI (troca de chaves)" },
      { key: "manutencao", label: "Manutencao (destrutivo)", descricao: "Purge de contratos, reset de contas, reseed do banco. So supervisor por padrao." },
    ],
  },
];

/** Todos os keys (flat) — util pra checkbox "marcar tudo". */
export const TODAS_PERMISSOES: string[] = RESOURCE_GROUPS.flatMap((g) => g.recursos.map((r) => r.key));

/** Presets de fabrica — pre-preenchem a matriz. Alinhado com PRESETS do backend
 *  (apps/api/src/modules/admin/perfis-admin.ts). */
export const PRESETS: Record<AverbadoraPerfil, string[]> = {
  supervisor: ["*"],
  operador: [
    "dashboard", "health", "conta",
    "prefeituras", "convenios", "servidores", "pre-reservas",
    "tombamento", "adf", "beneficios", "telemedicina", "interessados",
  ],
  comercial: [
    "dashboard", "health", "conta",
    "vitrine", "comunicados", "comunicados-banco", "comunicados-servidor",
    "interessados",
  ],
  financeiro: [
    "dashboard", "health", "conta",
    "folhas", "bate-carteira", "adf",
  ],
  auditoria: [
    "dashboard", "health", "conta",
    "auditoria", "logs",
  ],
  personalizado: [],
};

/** True se o conjunto de permissoes casa exatamente com algum preset (mesmo set). */
export function detectarPreset(permissoes: string[]): AverbadoraPerfil {
  const set = new Set(permissoes);
  for (const [nome, keys] of Object.entries(PRESETS) as [AverbadoraPerfil, string[]][]) {
    if (nome === "personalizado") continue;
    if (keys.length !== set.size) continue;
    if (keys.every((k) => set.has(k))) return nome;
  }
  return "personalizado";
}

/** Autoriza acesso a `key` com base nas `permissoes` do usuario.
 *  - `null`/`undefined` (dev-user ou JWT antigo) = passa em tudo (retrocompat).
 *  - `"*"` (wildcard) = passa em tudo.
 *  - Exact match = passa.
 *  Chaves nao mapeadas em RESOURCE_GROUPS ainda funcionam — sao apenas nao
 *  aparecem na matriz de checkboxes por padrao. */
export function podeAcessar(permissoes: string[] | null | undefined, key: string): boolean {
  if (!permissoes || permissoes.length === 0) return true; // dev-user sem claim
  if (permissoes.includes("*")) return true;
  return permissoes.includes(key);
}

/** Le o array de permissoes do JWT (claim `averbadora_permissoes`).
 *  Fallback: se so tem `averbadora_perfil` (JWT antigo), deriva do preset. */
export function readAverbadoraPermissoesFromJwt(accessToken: string | null | undefined): string[] | null {
  if (!accessToken) return null;
  try {
    const parts = accessToken.split(".");
    if (parts.length !== 3) return null;
    const b64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    if (Array.isArray(payload.averbadora_permissoes)) {
      return payload.averbadora_permissoes as string[];
    }
    // Retrocompat: JWT antigo so tem `averbadora_perfil`.
    const p = payload.averbadora_perfil as AverbadoraPerfil | undefined;
    if (p && PRESETS[p]) return [...PRESETS[p]];
    return null;
  } catch {
    return null;
  }
}

/** Retrocompat com codigo que ainda le o "perfil" (label). */
export function readAverbadoraPerfilFromJwt(accessToken: string | null | undefined): AverbadoraPerfil | null {
  if (!accessToken) return null;
  try {
    const parts = accessToken.split(".");
    if (parts.length !== 3) return null;
    const b64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    const p = payload.averbadora_perfil;
    if (TODOS_PERFIS.includes(p)) return p as AverbadoraPerfil;
    return null;
  } catch {
    return null;
  }
}
