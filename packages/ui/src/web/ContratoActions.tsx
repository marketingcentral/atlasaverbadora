import type { ReactNode } from "react";

export interface ContratoAction {
  key: "imprimir" | "quitar" | "suspender" | "cancelar" | "alongar" | "alterar";
  label: string;
  icon?: ReactNode;
  variant?: "default" | "primary" | "danger";
  disabled?: boolean;
  onClick: () => void;
}

const DEFAULT_LABELS: Record<ContratoAction["key"], { label: string; variant: ContratoAction["variant"]; icon: string }> = {
  imprimir: { label: "Imprimir comprovante", variant: "default", icon: "🖨" },
  quitar: { label: "Quitar contrato", variant: "primary", icon: "✓" },
  suspender: { label: "Suspender", variant: "default", icon: "⏸" },
  cancelar: { label: "Cancelar", variant: "danger", icon: "×" },
  alongar: { label: "Alongar", variant: "default", icon: "↔" },
  alterar: { label: "Alterar", variant: "default", icon: "✎" },
};

interface Props {
  actions: { key: ContratoAction["key"]; disabled?: boolean; onClick: () => void }[];
}

export function ContratoActions({ actions }: Props) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {actions.map((a) => {
        const def = DEFAULT_LABELS[a.key];
        const style = buttonStyle(def.variant, a.disabled);
        return (
          <button
            key={a.key}
            type="button"
            disabled={a.disabled}
            onClick={a.onClick}
            style={style}
          >
            <span aria-hidden style={{ marginRight: 6 }}>{def.icon}</span>
            {def.label}
          </button>
        );
      })}
    </div>
  );
}

function buttonStyle(variant: ContratoAction["variant"] = "default", disabled?: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "8px 14px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.02em",
    border: "1px solid var(--border-strong)",
    background: "transparent",
    color: "var(--text)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    whiteSpace: "nowrap",
  };
  if (variant === "primary") {
    base.background = "linear-gradient(135deg, var(--emerald-500), var(--emerald-600))";
    base.color = "white";
    base.borderColor = "transparent";
  } else if (variant === "danger") {
    base.color = "var(--danger-500)";
    base.borderColor = "rgba(220,38,38,.4)";
  }
  return base;
}
