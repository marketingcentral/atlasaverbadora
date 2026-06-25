import type { ReactNode } from "react";

export interface TabDef {
  key: string;
  label: string;
  badge?: ReactNode;
}

interface Props {
  tabs: TabDef[];
  activeKey: string;
  onChange: (key: string) => void;
  variant?: "underline" | "pills";
}

export function Tabs({ tabs, activeKey, onChange, variant = "underline" }: Props) {
  if (variant === "pills") {
    return (
      <div
        style={{
          display: "inline-flex",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 999,
          padding: 4,
          gap: 4,
        }}
      >
        {tabs.map((t) => {
          const active = t.key === activeKey;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                fontWeight: 600,
                fontSize: 13,
                color: active ? "var(--navy-900)" : "var(--text-muted)",
                background: active ? "linear-gradient(135deg, var(--gold-500), var(--gold-400))" : "transparent",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
              {t.badge ? <span style={{ marginLeft: 8, opacity: 0.7 }}>{t.badge}</span> : null}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: 4,
        borderBottom: "1px solid var(--border)",
        overflowX: "auto",
      }}
    >
      {tabs.map((t) => {
        const active = t.key === activeKey;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            style={{
              padding: "12px 18px",
              fontWeight: active ? 700 : 500,
              fontSize: 13,
              color: active ? "var(--accent)" : "var(--text-muted)",
              background: "transparent",
              border: "none",
              borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: -1,
              cursor: "pointer",
              whiteSpace: "nowrap",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            {t.label}
            {t.badge ? <span style={{ marginLeft: 6 }}>{t.badge}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
