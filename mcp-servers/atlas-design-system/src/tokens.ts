// Source of truth for Atlas design tokens.
// Mirrors demo/assets/css/tokens.css exactly.

export const COLORS = {
  navy: {
    900: "#0A1628",
    800: "#122038",
    700: "#1A2942",
    600: "#233556",
    500: "#2D4263",
    400: "#3D5984",
  },
  gold: {
    600: "#B8964F",
    500: "#C9A961",
    400: "#D4BC7E",
    300: "#E2D1A3",
  },
  emerald: {
    600: "#059669",
    500: "#10B981",
    400: "#34D399",
  },
  ivory: {
    50: "#FAF8F3",
    100: "#F3EFE6",
  },
  slate: {
    900: "#0F172A",
    700: "#334155",
    500: "#64748B",
    400: "#94A3B8",
    300: "#CBD5E1",
    200: "#E2E8F0",
    100: "#F1F5F9",
  },
  white: "#FFFFFF",
  semantic: {
    danger: "#DC2626",
    warn: "#F59E0B",
    info: "#3B82F6",
  },
} as const;

export const RADIUS = {
  sm: "6px",
  md: "10px",
  lg: "16px",
  xl: "24px",
  pill: "999px",
} as const;

export const SHADOW = {
  sm: "0 1px 2px rgba(10,22,40,.08)",
  md: "0 6px 18px rgba(10,22,40,.12)",
  lg: "0 18px 48px rgba(10,22,40,.18)",
  gold: "0 8px 30px rgba(201,169,97,.25)",
} as const;

export const SPACE = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "24px",
  6: "32px",
  7: "48px",
  8: "64px",
  9: "96px",
} as const;

export const FONT = {
  sans: "'Inter', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
} as const;

export const EASE = {
  out: "cubic-bezier(.22,.61,.36,1)",
  inOut: "cubic-bezier(.65,.05,.36,1)",
} as const;

export const THEMES = {
  dark: {
    bg: COLORS.navy[900],
    bgElev: COLORS.navy[800],
    bgElev2: COLORS.navy[700],
    surface: "rgba(26,41,66,.6)",
    surfaceSolid: COLORS.navy[700],
    border: "rgba(255,255,255,.08)",
    borderStrong: "rgba(255,255,255,.16)",
    text: "#EAF0FA",
    textMuted: "#9BAAC2",
    textDim: COLORS.slate[500],
    accent: COLORS.gold[500],
    accentHover: COLORS.gold[400],
    success: COLORS.emerald[500],
  },
  light: {
    bg: COLORS.ivory[50],
    bgElev: COLORS.white,
    bgElev2: COLORS.ivory[100],
    surface: "rgba(255,255,255,.85)",
    surfaceSolid: COLORS.white,
    border: "rgba(10,22,40,.08)",
    borderStrong: "rgba(10,22,40,.16)",
    text: COLORS.navy[900],
    textMuted: COLORS.slate[700],
    textDim: COLORS.slate[500],
    accent: COLORS.gold[600],
    accentHover: COLORS.gold[500],
    success: COLORS.emerald[600],
  },
} as const;

export const COMPONENTS_WEB = {
  Button: `<button class="btn btn-primary">Texto</button>
/* variants: btn-primary | btn-ghost | btn-success | + btn-sm modifier */`,
  Card: `<article class="card">
  <div class="icon">...</div>
  <h3>Titulo</h3>
  <p>Descricao</p>
</article>`,
  Pill: `<span class="pill pill-aceita">Aceita</span>
/* variants: pendente | aceita | averbado | emdia | expirado | rejeitada */`,
  MargemCard: `<div class="p-card h-margin-card">
  <div class="p-label">Margem disponivel</div>
  <div class="p-big green">R$ 1.585,<span class="small">39</span></div>
  <div class="p-progress"><i style="width:18%"></i></div>
  <div class="meta-row"><span>Utilizada R$ 348,01</span><span>Total R$ 1.933,40</span></div>
  <div class="prefeitura">Prefeitura de Palhoca</div>
</div>`,
};

export const COMPONENTS_MOBILE = {
  Button: `<Pressable style={[styles.btn, styles.btnPrimary]}>
  <Text style={styles.btnText}>Texto</Text>
</Pressable>`,
  MargemCard: `<View style={styles.margemCard}>
  <Text style={styles.label}>Margem disponivel</Text>
  <Text style={styles.bigValue}>R$ 1.585,39</Text>
  <ProgressBar value={0.18} />
  <View style={styles.metaRow}>
    <Text>Utilizada R$ 348,01</Text>
    <Text>Total R$ 1.933,40</Text>
  </View>
</View>`,
};

export const PHONE_SCREENS = [
  "screen-home",
  "screen-propostas",
  "screen-contratos",
  "screen-contrato",
  "screen-simular",
  "screen-margem",
  "screen-ofertas",
  "screen-conta",
];

/**
 * Validates that all provided hex/rgb colors belong to the palette.
 */
export function validatePalette(colors: string[]): { invalid: string[]; valid: string[] } {
  const palette = new Set<string>([
    ...Object.values(COLORS.navy),
    ...Object.values(COLORS.gold),
    ...Object.values(COLORS.emerald),
    ...Object.values(COLORS.ivory),
    ...Object.values(COLORS.slate),
    COLORS.white,
    ...Object.values(COLORS.semantic),
  ].map((c) => c.toLowerCase()));
  const invalid: string[] = [];
  const valid: string[] = [];
  for (const c of colors) {
    if (palette.has(c.toLowerCase())) valid.push(c);
    else invalid.push(c);
  }
  return { invalid, valid };
}
