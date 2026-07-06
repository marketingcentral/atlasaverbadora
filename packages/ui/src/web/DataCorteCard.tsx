interface Props {
  dia: number;
  mes: string;
  origem: string;
  operacoes: string;
  /** Rotulo da competencia (ex.: "Ago/2026") — mostrado no cabecalho do card,
   *  ao lado de "Data de Corte", pra deixar claro qual periodo esta ativo. */
  competencia?: string;
  canPrev?: boolean;
  canNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}

export function DataCorteCard({ dia, mes, origem, operacoes, competencia, canPrev, canNext, onPrev, onNext }: Props) {
  return (
    <article
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 20,
        display: "flex",
        gap: 16,
        alignItems: "center",
        minHeight: 144,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 64 }}>
        <span style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, color: "var(--accent)" }}>{dia}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginTop: 4 }}>{mes}</span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-dim)", textTransform: "uppercase" }}>
            Data de Corte
          </div>
          {competencia ? (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>
              {competencia}
            </span>
          ) : null}
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
          <div>Origem</div>
          <div style={{ color: "var(--text)", fontWeight: 600 }}>{origem}</div>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
          <div>Operações</div>
          <div style={{ color: "var(--text)", fontWeight: 600 }}>{operacoes}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button type="button" disabled={!canPrev} onClick={onPrev} style={navBtnStyle(canPrev)}>‹</button>
        <button type="button" disabled={!canNext} onClick={onNext} style={navBtnStyle(canNext)}>›</button>
      </div>
    </article>
  );
}

function navBtnStyle(enabled?: boolean): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 999,
    border: "1px solid var(--border-strong)",
    background: "transparent",
    color: enabled ? "var(--accent)" : "var(--text-dim)",
    cursor: enabled ? "pointer" : "default",
    opacity: enabled ? 1 : 0.4,
    fontSize: 14,
  };
}
