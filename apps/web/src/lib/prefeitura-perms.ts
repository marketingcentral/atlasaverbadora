// Gating granular por recurso para perfis do portal da prefeitura.
// Espelha o modelo da averbadora e do banco.

export type PrefeituraAreaLabel =
  | "rh" | "financeiro" | "gestor" | "personalizado";

/** Recursos do portal da prefeitura agrupados por categoria. Espelha o menu em
 *  apps/web/src/routes/prefeitura/layout.tsx. */
export const PREFEITURA_RESOURCE_GROUPS: {
  titulo: string;
  recursos: { key: string; label: string; descricao?: string }[];
}[] = [
  {
    titulo: "Geral",
    recursos: [
      { key: "dashboard", label: "Painel" },
      { key: "conta", label: "Minha conta" },
    ],
  },
  {
    titulo: "Recursos Humanos",
    recursos: [
      { key: "servidores", label: "Servidores" },
      { key: "convenios", label: "Convenios" },
      { key: "contratos", label: "Contratos averbados" },
    ],
  },
  {
    titulo: "Financeiro / Folha",
    recursos: [
      { key: "folhas", label: "Folhas" },
      { key: "tombamento", label: "Tombamento" },
      { key: "adf", label: "ADF / Descontos" },
      { key: "relatorios", label: "Relatorios" },
    ],
  },
  {
    titulo: "Comunicacao & LGPD",
    recursos: [
      { key: "comunicados", label: "Comunicados" },
      { key: "anuencia", label: "Anuencia de dados" },
    ],
  },
  {
    titulo: "Administracao",
    recursos: [
      { key: "perfis", label: "Usuarios e acessos" },
    ],
  },
];

export const PREFEITURA_TODAS_PERMISSOES: string[] = PREFEITURA_RESOURCE_GROUPS.flatMap((g) => g.recursos.map((r) => r.key));

export const PREFEITURA_PRESETS: Record<PrefeituraAreaLabel, string[]> = {
  gestor: ["*"],
  rh: [
    "dashboard", "servidores", "convenios", "contratos", "adf",
    "anuencia", "comunicados", "conta",
  ],
  financeiro: [
    "dashboard", "folhas", "contratos", "tombamento", "adf",
    "relatorios", "comunicados", "conta",
  ],
  personalizado: [],
};

export function detectarPrefeituraPreset(permissoes: string[]): PrefeituraAreaLabel {
  const set = new Set(permissoes);
  for (const [nome, keys] of Object.entries(PREFEITURA_PRESETS) as [PrefeituraAreaLabel, string[]][]) {
    if (nome === "personalizado") continue;
    if (keys.length !== set.size) continue;
    if (keys.every((k) => set.has(k))) return nome;
  }
  return "personalizado";
}

export const PREFEITURA_PRESET_LABELS: { value: PrefeituraAreaLabel; label: string; descricao: string }[] = [
  { value: "gestor",        label: "Gestor",        descricao: "Acesso total ao portal (wildcard *)." },
  { value: "rh",            label: "RH",            descricao: "Servidores, convenios, contratos, comunicados, anuencia." },
  { value: "financeiro",    label: "Financeiro",    descricao: "Folhas, tombamento, ADF, contratos, relatorios." },
  { value: "personalizado", label: "Personalizado", descricao: "Ponto de partida vazio — marque caixa a caixa." },
];
