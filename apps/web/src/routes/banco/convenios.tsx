import { fmtBRL } from "../../lib/banco-propostas";
import { getConveniosDoBanco } from "../../lib/banco-carteira";

export function BancoConvenios() {
  const convenios = getConveniosDoBanco();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Convênios
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Prefeituras conveniadas</h1>
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 680 }}>
          Convênios do seu banco dentro da Atlas. Cada banco enxerga apenas os próprios convênios — sem visibilidade dos demais.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {convenios.map((c) => (
          <div key={c.nome} style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: 18 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "1.1rem" }}>{c.nome}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
              <Row label="Contratos ativos" value={`${c.contratosAtivos}`} />
              <Row label="Volume ativo" value={fmtBRL(c.volumeAtivo)} />
              <Row
                label="Inadimplentes"
                value={`${c.inadimplentes}`}
                accent={c.inadimplentes > 0 ? "var(--gold-500)" : undefined}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontWeight: 600, color: accent ?? "var(--text)" }}>{value}</span>
    </div>
  );
}
