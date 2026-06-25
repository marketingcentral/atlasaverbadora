import { useState } from "react";
import { Card, Pill, Tabs } from "@atlas/ui/web";

const CONTRATOS = [
  { id: "ADF-S0003", banco: "SCred Financeira", parcela: 1176.37, parcelasPagas: 3, total: 60, status: "Averbado" },
  { id: "ADF-S0002", banco: "SCred Financeira", parcela: 1773.79, parcelasPagas: 4, total: 48, status: "Em dia" },
  { id: "ADF-C0001", banco: "Banco Y", parcela: 1163.43, parcelasPagas: 36, total: 36, status: "Quitado" },
];

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function ServidorContratos() {
  const [tab, setTab] = useState<"todos" | "ativos" | "quitados">("todos");
  const filtered = CONTRATOS.filter((c) => {
    if (tab === "ativos") return c.status !== "Quitado";
    if (tab === "quitados") return c.status === "Quitado";
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Meus contratos
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Contratos ativos e histórico</h1>
      </header>

      <Tabs
        variant="pills"
        activeKey={tab}
        onChange={(k) => setTab(k as typeof tab)}
        tabs={[
          { key: "todos", label: "Todos" },
          { key: "ativos", label: "Ativos" },
          { key: "quitados", label: "Quitados" },
        ]}
      />

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map((c) => {
          const pct = (c.parcelasPagas / c.total) * 100;
          return (
            <Card key={c.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{c.banco}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Contrato #{c.id}</div>
                </div>
                <Pill variant={c.status === "Quitado" ? "emdia" : c.status === "Averbado" ? "averbado" : "aceita"}>{c.status}</Pill>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 13 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase" }}>
                    Parcela
                  </div>
                  <div style={{ fontWeight: 700, color: "var(--accent)", marginTop: 2 }}>{fmtBRL(c.parcela)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase" }}>
                    Progresso
                  </div>
                  <div>{c.parcelasPagas} de {c.total}</div>
                </div>
              </div>
              <div style={{ marginTop: 10, height: 6, background: "var(--bg-elev-2)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, var(--gold-500), var(--emerald-500))" }} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
