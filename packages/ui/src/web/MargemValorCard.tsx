interface Props {
  label: "Total" | "Disponível";
  valor: number | null;
  tipo?: string;
  loading?: boolean;
  onDetail?: () => void;
}

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function MargemValorCard({ label, valor, tipo = "EMPRESTIMO", loading, onDetail }: Props) {
  const isDisp = label === "Disponível";
  return (
    <article
      style={{
        flex: 1,
        background: isDisp
          ? "linear-gradient(135deg, rgba(16,185,129,.08), rgba(16,185,129,.02))"
          : "linear-gradient(135deg, rgba(59,130,246,.08), rgba(59,130,246,.02))",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 20,
        position: "relative",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: isDisp ? "var(--emerald-500)" : "var(--info-500)",
          marginBottom: 6,
        }}
      >
        Margem {label}
      </div>
      <div style={{ fontSize: "1.8rem", fontWeight: 800, color: isDisp ? "var(--emerald-500)" : "var(--info-500)" }}>
        {loading ? "..." : valor !== null ? fmtBRL(valor) : "R$ -"}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-dim)", marginTop: 4 }}>
        {tipo}
      </div>
      {onDetail ? (
        <button
          type="button"
          onClick={onDetail}
          aria-label="Detalhamento"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 24,
            height: 24,
            border: "1px solid var(--border-strong)",
            background: "transparent",
            borderRadius: 6,
            cursor: "pointer",
            color: "var(--text-muted)",
            fontSize: 12,
          }}
        >
          ⓘ
        </button>
      ) : null}
    </article>
  );
}

interface ProjecaoProps {
  meses: { competencia: string; rotulo: string; valor: number | null }[];
  onSelect?: (competencia: string) => void;
}

export function MargemProjecaoLinha({ meses, onSelect }: ProjecaoProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${meses.length}, 1fr)`,
        gap: 12,
        padding: "12px 0 0",
      }}
    >
      <div style={{ gridColumn: "1 / -1", fontSize: 11, color: "var(--text-dim)" }}>Margem do colaborador para</div>
      {meses.map((m) => (
        <button
          key={m.competencia}
          type="button"
          onClick={() => onSelect?.(m.competencia)}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "10px 12px",
            textAlign: "left",
            color: "var(--text-muted)",
            cursor: onSelect ? "pointer" : "default",
            fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 600, color: "var(--accent)" }}>{m.rotulo}</div>
          <div style={{ fontSize: 12 }}>{m.valor !== null ? fmtBRL(m.valor) : "—"}</div>
        </button>
      ))}
    </div>
  );
}

interface ContainerProps {
  mes: string;
  ano: number;
  onMesChange: (mes: string) => void;
  onAnoChange: (ano: number) => void;
  total: number | null;
  disponivel: number | null;
  tipo?: string;
  onCalcular: () => void;
  calculando?: boolean;
}

export function MargemCalculadorBox({ mes, ano, onMesChange, onAnoChange, total, disponivel, tipo, onCalcular, calculando }: ContainerProps) {
  return (
    <article
      style={{
        background: "var(--bg-elev)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>Valor da Margem do Colaborador</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "center" }}>
        <SelectArrow value={mes} options={MESES} onChange={onMesChange} />
        <SelectArrow value={String(ano)} options={ANOS.map(String)} onChange={(v) => onAnoChange(Number(v))} />
        <button
          type="button"
          onClick={onCalcular}
          disabled={calculando}
          style={{
            padding: "10px 22px",
            borderRadius: 999,
            background: "linear-gradient(135deg, var(--emerald-500), var(--emerald-600))",
            color: "white",
            fontWeight: 700,
            border: "none",
            cursor: calculando ? "wait" : "pointer",
            opacity: calculando ? 0.7 : 1,
          }}
        >
          {calculando ? "CALCULANDO..." : "CALCULAR MARGEM"}
        </button>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <MargemValorCard label="Total" valor={total} tipo={tipo} loading={calculando} />
        <MargemValorCard label="Disponível" valor={disponivel} tipo={tipo} loading={calculando} />
      </div>
    </article>
  );
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const ANOS = (() => {
  const now = new Date().getFullYear();
  // Cliente pediu 23/07/2026 pra o seletor ir ate 2030: contrato de 96
  // parcelas (8 anos) so mostra o alivio da margem se der pra simular tao
  // longe. Mantem o ano anterior pra consultar competencia passada.
  // Math.max evita a lista esvaziar quando o relogio passar de 2030.
  const fim = Math.max(2030, now + 1);
  const anos: number[] = [];
  for (let y = now - 1; y <= fim; y++) anos.push(y);
  return anos;
})();

function SelectArrow({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const i = options.indexOf(value);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        border: "1px solid var(--border-strong)",
        borderRadius: 10,
        background: "transparent",
      }}
    >
      <button
        type="button"
        onClick={() => i > 0 && onChange(options[i - 1]!)}
        disabled={i <= 0}
        style={arrowBtn(i > 0)}
        aria-label="Anterior"
      >
        ‹
      </button>
      <span style={{ fontWeight: 600, color: "var(--text)" }}>{value}</span>
      <button
        type="button"
        onClick={() => i < options.length - 1 && onChange(options[i + 1]!)}
        disabled={i >= options.length - 1}
        style={arrowBtn(i < options.length - 1)}
        aria-label="Proximo"
      >
        ›
      </button>
    </div>
  );
}

function arrowBtn(enabled: boolean): React.CSSProperties {
  return {
    width: 24,
    height: 24,
    border: "none",
    background: "transparent",
    color: enabled ? "var(--accent)" : "var(--text-dim)",
    cursor: enabled ? "pointer" : "default",
    fontSize: 16,
  };
}
