import { useEffect, useRef, useState, type ReactNode } from "react";

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
  /** Renderiza uma segunda barra de rolagem horizontal ACIMA da tabela,
   *  sincronizada com a de baixo. Ligado por padrao — so aparece de fato
   *  quando a tabela transborda pra direita (auto-hide). Passe false pra
   *  desligar em tabelas onde a barra extra atrapalha o layout. */
  topScrollbar?: boolean;
}

export function DataTable<T>({ columns, rows, rowKey, onRowClick, emptyState, loading, actions, topScrollbar = true }: Props<T>) {
  const topRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const [innerWidth, setInnerWidth] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);
  // Mede a largura real do <table> vs o container. So renderiza a barra
  // top quando ha overflow horizontal — tabelas que cabem no viewport
  // continuam identicas ao layout antigo. Reage a resize dos dois lados
  // (viewport shrink OU coluna nova depois do mount).
  useEffect(() => {
    if (!topScrollbar) return;
    const t = tableRef.current;
    const b = bottomRef.current;
    if (!t || !b) return;
    const measure = () => {
      const sw = t.scrollWidth;
      const cw = b.clientWidth;
      setInnerWidth(sw);
      setHasOverflow(sw > cw + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(t);
    ro.observe(b);
    return () => ro.disconnect();
  }, [topScrollbar, columns.length, rows.length]);
  // Sincroniza scrollLeft entre top e bottom sem loop infinito (flag por-frame).
  useEffect(() => {
    if (!topScrollbar || !hasOverflow) return;
    const top = topRef.current;
    const bot = bottomRef.current;
    if (!top || !bot) return;
    let lock = false;
    const onTop = () => {
      if (lock) return;
      lock = true;
      bot.scrollLeft = top.scrollLeft;
      requestAnimationFrame(() => { lock = false; });
    };
    const onBot = () => {
      if (lock) return;
      lock = true;
      top.scrollLeft = bot.scrollLeft;
      requestAnimationFrame(() => { lock = false; });
    };
    top.addEventListener("scroll", onTop, { passive: true });
    bot.addEventListener("scroll", onBot, { passive: true });
    return () => {
      top.removeEventListener("scroll", onTop);
      bot.removeEventListener("scroll", onBot);
    };
  }, [topScrollbar, hasOverflow]);
  const showTop = topScrollbar && hasOverflow;

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
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {showTop ? (
        <div
          ref={topRef}
          className="atlas-datatable-topscroll"
          style={{
            overflowX: "auto",
            overflowY: "hidden",
            border: "1px solid var(--border)",
            borderBottom: "none",
            borderRadius: "12px 12px 0 0",
            // Altura enxuta pra so mostrar a barra estilizada (12px em webkit).
            height: 16,
          }}
        >
          <div style={{ width: innerWidth || "100%", height: 1 }} />
        </div>
      ) : null}
    <div
      ref={bottomRef}
      className="atlas-datatable-scroll"
      style={{
        overflowX: "auto",
        border: "1px solid var(--border)",
        borderRadius: showTop ? "0 0 12px 12px" : 12,
        borderTop: showTop ? "none" : undefined,
      }}
    >
      <table ref={tableRef} style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
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
