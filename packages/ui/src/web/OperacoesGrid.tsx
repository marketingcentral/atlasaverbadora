import type { ReactNode } from "react";

export interface OperacaoItem {
  key: string;
  label: string;
  disponivel: boolean;
  onClick?: () => void;
  icon?: ReactNode;
}

interface Props {
  titulo: string;
  itens: OperacaoItem[];
  cols?: number;
}

export function OperacoesGrid({ titulo, itens, cols = 4 }: Props) {
  return (
    <section>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: "var(--text-dim)",
          textTransform: "uppercase",
          paddingBottom: 8,
          borderBottom: "1px dashed var(--border)",
        }}
      >
        {titulo}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginTop: 12 }}>
        {itens.map((it) => (
          <button
            key={it.key}
            type="button"
            disabled={!it.disponivel}
            onClick={it.onClick}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--bg-elev)",
              cursor: it.disponivel ? "pointer" : "not-allowed",
              opacity: it.disponivel ? 1 : 0.45,
              textAlign: "left",
              color: "var(--text)",
              transition: "border-color .15s, transform .15s",
            }}
            onMouseEnter={(e) => {
              if (it.disponivel) e.currentTarget.style.borderColor = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                background: "linear-gradient(135deg, rgba(201,169,97,.2), rgba(16,185,129,.14))",
                display: "grid",
                placeItems: "center",
                color: "var(--accent)",
                fontWeight: 700,
              }}
            >
              {it.icon ?? it.label.charAt(0)}
            </span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{it.label}</span>
            {it.disponivel ? <span style={{ color: "var(--accent)" }}>→</span> : null}
          </button>
        ))}
      </div>
    </section>
  );
}
