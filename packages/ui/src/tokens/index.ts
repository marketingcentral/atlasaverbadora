// Atlas design tokens — single source of truth for web + native.
// Mirrors demo/assets/css/tokens.css.

export const colors = {
  navy: {
    900: "#0A1628",
    800: "#122038",
    700: "#1A2942",
    600: "#233556",
    500: "#2D4263",
    400: "#3D5984",
  },
  gold: { 600: "#B8964F", 500: "#C9A961", 400: "#D4BC7E", 300: "#E2D1A3" },
  emerald: { 600: "#059669", 500: "#10B981", 400: "#34D399" },
  ivory: { 50: "#FAF8F3", 100: "#F3EFE6" },
  slate: { 900: "#0F172A", 700: "#334155", 500: "#64748B", 400: "#94A3B8", 300: "#CBD5E1", 200: "#E2E8F0", 100: "#F1F5F9" },
  white: "#FFFFFF",
  danger: "#DC2626",
  warn: "#F59E0B",
  info: "#3B82F6",
} as const;

export const radius = { sm: 6, md: 10, lg: 16, xl: 24, pill: 999 } as const;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64, 9: 96 } as const;

export const font = {
  sans: "Inter, 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
} as const;

export const shadow = {
  sm: "0 1px 2px rgba(10,22,40,.08)",
  md: "0 6px 18px rgba(10,22,40,.12)",
  lg: "0 18px 48px rgba(10,22,40,.18)",
  gold: "0 8px 30px rgba(201,169,97,.25)",
} as const;

export type ThemeName = "dark" | "light";

export interface Theme {
  name: ThemeName;
  colors: {
    bg: string;
    bgElev: string;
    bgElev2: string;
    surface: string;
    surfaceSolid: string;
    border: string;
    borderStrong: string;
    text: string;
    textMuted: string;
    textDim: string;
    accent: string;
    accentHover: string;
    success: string;
    danger: string;
    warn: string;
    info: string;
  };
  radius: typeof radius;
  space: typeof space;
  font: typeof font;
  shadow: typeof shadow;
}

export const darkTheme: Theme = {
  name: "dark",
  colors: {
    bg: colors.navy[900],
    bgElev: colors.navy[800],
    bgElev2: colors.navy[700],
    surface: "rgba(26,41,66,0.6)",
    surfaceSolid: colors.navy[700],
    border: "rgba(255,255,255,0.08)",
    borderStrong: "rgba(255,255,255,0.16)",
    text: "#EAF0FA",
    textMuted: "#9BAAC2",
    textDim: colors.slate[500],
    accent: colors.gold[500],
    accentHover: colors.gold[400],
    success: colors.emerald[500],
    danger: colors.danger,
    warn: colors.warn,
    info: colors.info,
  },
  radius,
  space,
  font,
  shadow,
};

export const lightTheme: Theme = {
  name: "light",
  colors: {
    bg: colors.ivory[50],
    bgElev: colors.white,
    bgElev2: colors.ivory[100],
    surface: "rgba(255,255,255,0.85)",
    surfaceSolid: colors.white,
    border: "rgba(10,22,40,0.08)",
    borderStrong: "rgba(10,22,40,0.16)",
    text: colors.navy[900],
    textMuted: colors.slate[700],
    textDim: colors.slate[500],
    accent: colors.gold[600],
    accentHover: colors.gold[500],
    success: colors.emerald[600],
    danger: colors.danger,
    warn: colors.warn,
    info: colors.info,
  },
  radius,
  space,
  font,
  shadow,
};

export function getTheme(name: ThemeName): Theme {
  return name === "dark" ? darkTheme : lightTheme;
}
