import { useState } from "react";

export interface Convenio {
  id: string;
  nome: string;
  prefeitura: string;
}

interface Props {
  convenios: Convenio[];
  activeId: string;
  onChange: (id: string) => void;
}

export function ConvenioSwitcher({ convenios, activeId, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const active = convenios.find((c) => c.id === activeId) ?? convenios[0];
  if (!active) return null;

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          background: "linear-gradient(135deg, rgba(201,169,97,.18), rgba(16,185,129,.12))",
          border: "1px solid var(--border-strong)",
          borderRadius: 10,
          padding: "10px 12px",
          textAlign: "left",
          cursor: convenios.length > 1 ? "pointer" : "default",
          color: "var(--text)",
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--accent)", fontWeight: 700, textTransform: "uppercase" }}>
          Convênio ativo
        </div>
        <div style={{ marginTop: 4, fontSize: 13, fontWeight: 700 }}>{active.prefeitura}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {active.nome}
          {convenios.length > 1 ? <span style={{ float: "right", color: "var(--accent)" }}>{open ? "▴" : "▾"}</span> : null}
        </div>
      </button>
      {open && convenios.length > 1 ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "var(--bg-elev)",
            border: "1px solid var(--border-strong)",
            borderRadius: 10,
            boxShadow: "var(--shadow-lg)",
            padding: 4,
            zIndex: 50,
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {convenios.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onChange(c.id);
                setOpen(false);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: 8,
                background: c.id === activeId ? "var(--bg-elev-2)" : "transparent",
                border: "none",
                color: "var(--text)",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 600 }}>{c.prefeitura}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.nome}</div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
