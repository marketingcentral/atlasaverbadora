import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  width?: number | string;
  align?: "left" | "right" | "center";
  mono?: boolean;
  /** Permite quebra de linha na celula (default: nowrap). Use pra textos longos
   *  como nome/endereco/email — mantem a tabela dentro do viewport sem forcar
   *  scroll horizontal. */
  wrap?: boolean;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
  loading?: boolean;
  actions?: (row: T) => ReactNode;
}

export function DataTable<T>({ columns, rows, rowKey, onRowClick, emptyState, loading, actions }: Props<T>) {
  if (loading) {
    return (
      <div style={{ padding: 36, textAlign: "center", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 12 }}>
        Carregando...
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div style={{ padding: 36, textAlign: "center", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 12 }}>
        {emptyState ?? "Nenhum item encontrado."}
      </div>
    );
  }
  return (
    <div
      className="atlas-datatable-scroll"
      style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 12 }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .atlas-datatable-scroll { scrollbar-width: thin !important; scrollbar-color: var(--border-strong) transparent !important; -ms-overflow-style: auto !important; }
        .atlas-datatable-scroll::-webkit-scrollbar { display: block !important; height: 12px !important; width: 12px !important; }
        .atlas-datatable-scroll::-webkit-scrollbar-thumb { background: var(--border-strong) !important; border-radius: 6px !important; }
        .atlas-datatable-scroll::-webkit-scrollbar-thumb:hover { background: var(--gold-500) !important; }
        .atlas-datatable-scroll::-webkit-scrollbar-track { background: color-mix(in srgb, var(--border) 40%, transparent) !important; border-radius: 6px !important; }
      ` }} />
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "var(--bg-elev-2)" }}>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{
                  textAlign: c.align ?? "left",
                  padding: "10px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--text-dim)",
                  whiteSpace: "nowrap",
                  width: c.width,
                }}
              >
                {c.header}
              </th>
            ))}
            {actions ? <th style={{ width: 1 }} /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={rowKey(r)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              style={{
                borderTop: "1px solid var(--border)",
                cursor: onRowClick ? "pointer" : "default",
              }}
              onMouseEnter={(e) => {
                if (onRowClick) e.currentTarget.style.background = "var(--bg-elev-2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  style={{
                    padding: "10px 12px",
                    textAlign: c.align ?? "left",
                    fontFamily: c.mono ? "var(--font-mono)" : undefined,
                    color: "var(--text)",
                    whiteSpace: c.wrap ? "normal" : "nowrap",
                    // overflowWrap: quebra so quando a palavra e' longa demais pra
                    // a coluna. Diferente de wordBreak:break-word que quebra em
                    // qualquer lugar (parte "ESTATUTARIO" em "ESTATUTARI/O").
                    overflowWrap: c.wrap ? "anywhere" : undefined,
                    maxWidth: c.wrap ? 320 : undefined,
                  }}
                >
                  {c.render ? c.render(r) : (r as Record<string, unknown>)[c.key] as ReactNode}
                </td>
              ))}
              {actions ? (
                <td style={{ padding: "10px 12px", whiteSpace: "nowrap", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                  {actions(r)}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function IconButton({ children, onClick, title, danger }: { children: ReactNode; onClick?: () => void; title?: string; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        border: "1px solid var(--border-strong)",
        background: "transparent",
        color: danger ? "var(--danger-500)" : "var(--text-muted)",
        cursor: "pointer",
        marginLeft: 4,
      }}
    >
      {children}
    </button>
  );
}
