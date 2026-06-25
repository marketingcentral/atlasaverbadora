import type { PropsWithChildren } from "react";

export type PillVariant =
  | "pendente"
  | "aceita"
  | "averbado"
  | "emdia"
  | "expirado"
  | "rejeitada";

const styles: Record<PillVariant, { bg: string; color: string }> = {
  pendente: { bg: "rgba(245, 158, 11, 0.18)", color: "#F59E0B" },
  aceita: { bg: "rgba(16, 185, 129, 0.18)", color: "#10B981" },
  averbado: { bg: "rgba(16, 185, 129, 0.22)", color: "#34D399" },
  emdia: { bg: "rgba(59, 130, 246, 0.18)", color: "#3B82F6" },
  expirado: { bg: "rgba(100, 116, 139, 0.18)", color: "#94A3B8" },
  rejeitada: { bg: "rgba(220, 38, 38, 0.18)", color: "#DC2626" },
};

export function Pill({ variant, children }: PropsWithChildren<{ variant: PillVariant }>) {
  const s = styles[variant];
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        padding: "4px 10px",
        borderRadius: 999,
      }}
    >
      {children}
    </span>
  );
}
