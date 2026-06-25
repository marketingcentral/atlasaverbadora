import type { PropsWithChildren, ReactNode } from "react";

interface Props {
  onSearchChange?: (q: string) => void;
  searchValue?: string;
  onReset?: () => void;
  onExport?: () => void;
  actions?: ReactNode;
  exactMatch?: boolean;
  onExactMatchChange?: (v: boolean) => void;
}

export function FilterBar({ onSearchChange, searchValue, onReset, onExport, actions, exactMatch, onExactMatchChange, children }: PropsWithChildren<Props>) {
  return (
    <section
      style={{
        background: "linear-gradient(180deg, rgba(16,185,129,.06), rgba(16,185,129,.02))",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type="search"
          placeholder="Pesquisar..."
          value={searchValue ?? ""}
          onChange={(e) => onSearchChange?.(e.target.value)}
          style={{
            flex: 1,
            background: "transparent",
            border: "1px solid var(--border-strong)",
            borderRadius: 10,
            padding: "10px 14px",
            color: "var(--text)",
            fontSize: 14,
            outline: "none",
          }}
        />
        {onExactMatchChange ? (
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            <input type="checkbox" checked={exactMatch} onChange={(e) => onExactMatchChange(e.target.checked)} />
            Pesquisar termo exato
          </label>
        ) : null}
      </div>
      {children}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {actions}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {onReset ? (
            <button type="button" onClick={onReset} style={btnGhost}>
              ↻ REINICIAR FILTROS
            </button>
          ) : null}
          {onExport ? (
            <button type="button" onClick={onExport} style={btnGhost}>
              ⬇ EXPORTAR DADOS
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

const btnGhost: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid var(--border-strong)",
  background: "transparent",
  color: "var(--text)",
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: "0.05em",
  cursor: "pointer",
};

interface CheckboxGroupProps {
  options: { value: string; label: string }[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

export function FilterCheckboxGroup({ options, selected, onChange }: CheckboxGroupProps) {
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      {options.map((o) => {
        const isOn = selected.has(o.value);
        return (
          <label key={o.value} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isOn}
              onChange={() => {
                const next = new Set(selected);
                if (isOn) next.delete(o.value);
                else next.add(o.value);
                onChange(next);
              }}
            />
            {o.label}
          </label>
        );
      })}
    </div>
  );
}
