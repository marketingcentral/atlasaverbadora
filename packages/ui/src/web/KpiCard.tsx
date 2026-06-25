import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  cta?: { label: string; onClick: () => void };
  accent?: "default" | "info" | "warn" | "success";
  icon?: ReactNode;
}

const accentColors = {
  default: "var(--accent)",
  info: "var(--info-500)",
  warn: "var(--warn-500)",
  success: "var(--emerald-500)",
};

export function KpiCard({ label, value, hint, cta, accent = "default", icon }: Props) {
  return (
    <article
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 20,
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 144,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: accentColors[accent] }}>
        {icon}
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{label}</span>
      </div>
      <div style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em", color: accentColors[accent] }}>{value}</div>
      {hint ? <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{hint}</div> : null}
      {cta ? (
        <button
          type="button"
          onClick={cta.onClick}
          style={{
            alignSelf: "flex-start",
            marginTop: "auto",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--accent)",
            background: "transparent",
            border: "1px solid var(--border-strong)",
            borderRadius: 999,
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          {cta.label}
        </button>
      ) : null}
    </article>
  );
}
