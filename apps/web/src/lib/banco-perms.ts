// Gating granular por recurso para usuarios do portal do banco.
// Espelha o modelo da averbadora (apps/web/src/lib/averbadora-perms.ts).

export type BancoPerfilLabel =
  | "admin" | "operador" | "consulta" | "relatorios" | "personalizado";

/** Recursos do portal do banco agrupados por categoria. Espelha o menu em
 *  apps/web/src/routes/banco/layout.tsx. */
export const BANCO_RESOURCE_GROUPS: {
  titulo: string;
  recursos: { key: string; label: string; descricao?: string }[];
}[] = [
  {
    titulo: "Geral",
    recursos: [
      { key: "visao-geral", label: "Visao geral", descricao: "KPIs + mural" },
      { key: "conta", label: "Minha conta", descricao: "Self-service (senha, 2FA)" },
    ],
  },
  {
    titulo: "Propostas",
    recursos: [
      { key: "propostas", label: "Propostas (todas)" },
      { key: "emprestimo", label: "Emprestimo" },
      { key: "cartao", label: "Cartao" },
      { key: "cartao_beneficio", label: "Cartao Beneficio" },
      { key: "portabilidade", label: "Portabilidade" },
    ],
  },
  {
    titulo: "Operacao",
    recursos: [
      { key: "margem-contratacao", label: "Margem / Contratacao" },
      { key: "carteira", label: "Meus contratos" },
      { key: "convenios", label: "Convenios (leitura)" },
      { key: "ofertas", label: "Ofertas (marketing)" },
    ],
  },
  {
    titulo: "Financeiro / relatorios",
    recursos: [
      { key: "bate-carteira", label: "Bate de carteira" },
      { key: "relatorios", label: "Relatorios (menu)" },
      { key: "consignacoes", label: "Consignacoes" },
      { key: "gerador", label: "Gerador" },
      { key: "faturamento", label: "Faturamento" },
    ],
  },
  {
    titulo: "Cadastros",
    recursos: [
      { key: "cadastros", label: "Cadastros (menu)" },
      { key: "tabela-emprestimos", label: "Tabela de emprestimos" },
      { key: "usuarios", label: "Usuarios (CRUD)" },
    ],
  },
];

export const BANCO_TODAS_PERMISSOES: string[] = BANCO_RESOURCE_GROUPS.flatMap((g) => g.recursos.map((r) => r.key));

export const BANCO_PRESETS: Record<BancoPerfilLabel, string[]> = {
  admin: ["*"],
  operador: [
    "visao-geral", "propostas", "emprestimo", "cartao", "cartao_beneficio", "portabilidade",
    "ofertas", "margem-contratacao", "carteira", "convenios", "conta",
  ],
  consulta: [
    "visao-geral", "propostas", "emprestimo", "cartao", "cartao_beneficio", "portabilidade",
    "carteira", "convenios", "conta",
  ],
  relatorios: [
    "visao-geral", "relatorios", "consignacoes", "gerador", "faturamento",
    "bate-carteira", "conta",
  ],
  personalizado: [],
};

export function detectarBancoPreset(permissoes: string[]): BancoPerfilLabel {
  const set = new Set(permissoes);
  for (const [nome, keys] of Object.entries(BANCO_PRESETS) as [BancoPerfilLabel, string[]][]) {
    if (nome === "personalizado") continue;
    if (keys.length !== set.size) continue;
    if (keys.every((k) => set.has(k))) return nome;
  }
  return "personalizado";
}

export const BANCO_PRESET_LABELS: { value: BancoPerfilLabel; label: string; descricao: string }[] = [
  { value: "admin",         label: "Admin",         descricao: "Acesso total ao portal (wildcard *)." },
  { value: "operador",      label: "Operador",      descricao: "Propostas, ofertas, margem, carteira, convenios." },
  { value: "consulta",      label: "Consulta",      descricao: "Leitura de propostas, carteira, convenios." },
  { value: "relatorios",    label: "Relatorios",    descricao: "Relatorios + bate-carteira. Sem CRUD." },
  { value: "personalizado", label: "Personalizado", descricao: "Ponto de partida vazio — marque caixa a caixa." },
];
