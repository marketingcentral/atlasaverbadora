import { Card, Pill } from "@atlas/ui/web";

const PROPOSTAS = [
  { id: "PRO-9821", banco: "SCred Financeira", status: "Aceita", valor: 25000, parcelas: 48, parcela: 750, taxaAm: 1.8 },
  { id: "PRO-9805", banco: "Banco Y", status: "Em análise", valor: 12000, parcelas: 36, parcela: 412.4, taxaAm: 1.72 },
  { id: "PRO-9742", banco: "Pan Crédito", status: "Expirada", valor: 6000, parcelas: 24, parcela: 320.1, taxaAm: 1.99 },
];

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function ServidorPropostas() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Minhas propostas
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Histórico</h1>
        <p style={{ color: "var(--text-muted)" }}>Acompanhe o estado das suas propostas.</p>
      </header>

      <div style={{ display: "grid", gap: 12 }}>
        {PROPOSTAS.map((p) => (
          <Card key={p.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{p.banco}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{p.id}</div>
              </div>
              <Pill variant={p.status === "Aceita" ? "aceita" : p.status === "Em análise" ? "pendente" : "expirado"}>
                {p.status}
              </Pill>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginTop: 16, fontSize: 13 }}>
              <KV label="Valor liberado" v={fmtBRL(p.valor)} accent />
              <KV label="Parcelas" v={`${p.parcelas}× de ${fmtBRL(p.parcela)}`} />
              <KV label="Taxa mensal" v={`${p.taxaAm.toFixed(2)}%`} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function KV({ label, v, accent }: { label: string; v: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 4, color: accent ? "var(--emerald-500)" : "var(--text)", fontWeight: accent ? 700 : 500 }}>{v}</div>
    </div>
  );
}
