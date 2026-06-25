import type { MargemResponse } from "@atlas/types";

interface Props {
  data: MargemResponse;
  prefeitura?: string;
}

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function MargemCard({ data, prefeitura }: Props) {
  const { margem } = data;
  const usedPct = Math.round(margem.percentual_uso * 100);
  return (
    <article
      style={{
        background: "linear-gradient(160deg, var(--navy-700), var(--navy-900))",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 24,
        color: "#EAF0FA",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9BAAC2" }}>
        Margem disponivel
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, marginTop: 6, color: "#10B981" }}>
        {fmtBRL(margem.disponivel)}
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,.06)", borderRadius: 3, marginTop: 14, overflow: "hidden" }}>
        <div
          style={{
            width: `${usedPct}%`,
            height: "100%",
            background: "linear-gradient(90deg, #C9A961, #10B981)",
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 13, color: "#C7D2E0" }}>
        <span>Utilizada <b>{fmtBRL(margem.comprometido)}</b></span>
        <span>Total {fmtBRL(margem.salario_base * 0.35)}</span>
      </div>
      {prefeitura ? (
        <div style={{ marginTop: 12, fontSize: 12, color: "#C9A961" }}>{prefeitura}</div>
      ) : null}
    </article>
  );
}
