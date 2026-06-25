import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, KpiCard, Pill } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function PrefeituraDashboard() {
  const nav = useNavigate();
  const q = useQuery({ queryKey: ["prefeitura", "dashboard"], queryFn: () => atlas.prefeitura.dashboard() });

  if (q.isLoading) return <Card><span style={{ color: "var(--text-muted)" }}>Carregando…</span></Card>;
  if (q.error || !q.data) return <Card><span style={{ color: "#ef4444" }}>Erro ao carregar painel.</span></Card>;

  const { kpis, folhas, prefeitura } = q.data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>Prefeitura</span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>{prefeitura.nome}/{prefeitura.uf}</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 4 }}>Visão consolidada da consignação no município (somente leitura).</p>
      </header>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <KpiCard label="Servidores" value={kpis.servidores} accent="info" cta={{ label: "Ver lista", onClick: () => nav("/prefeitura/servidores") }} />
        <KpiCard label="Contratos averbados" value={kpis.contratosAverbados} cta={{ label: "Ver contratos", onClick: () => nav("/prefeitura/contratos") }} />
        <KpiCard label="Convênios ativos" value={kpis.convenios} cta={{ label: "Ver convênios", onClick: () => nav("/prefeitura/convenios") }} />
        <KpiCard label="Bancos atuantes" value={kpis.bancosAtuantes} accent="success" />
      </div>

      <Card>
        <span className="eyebrow" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "var(--text-dim)", textTransform: "uppercase" }}>Margem consignável agregada</span>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: 12 }}>
          <Metric label="Total" valor={fmtBRL(kpis.margemTotal)} />
          <Metric label="Comprometida" valor={fmtBRL(kpis.margemComprometida)} cor="#ef4444" />
          <Metric label="Disponível" valor={fmtBRL(kpis.margemDisponivel)} cor="var(--emerald-500)" />
          <Metric label="% de uso" valor={`${(kpis.percentualUso * 100).toFixed(1)}%`} />
        </div>
        <div style={{ marginTop: 14, height: 8, background: "var(--bg-elev-2)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(kpis.percentualUso * 100, 100)}%`, background: "linear-gradient(90deg, var(--gold-500), #ef4444)" }} />
        </div>
      </Card>

      <Card>
        <span className="eyebrow" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "var(--text-dim)", textTransform: "uppercase" }}>Folhas recentes</span>
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {folhas.length === 0 ? <span style={{ color: "var(--text-muted)", fontSize: 14 }}>Sem folhas cadastradas.</span> : null}
          {folhas.map((f) => (
            <div key={f.competencia} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-elev-2)", borderRadius: 10, fontSize: 13 }}>
              <span style={{ fontFamily: "var(--font-mono)" }}>{f.competencia}</span>
              <span style={{ color: "var(--text-muted)" }}>Corte {f.dataCorte} · Repasse {f.dataRepasse ?? "—"}</span>
              <Pill variant={f.status === "fechada" || f.status === "consolidada" ? "averbado" : "pendente"}>{f.status}</Pill>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, valor, cor }: { label: string; valor: string; cor?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 20, fontWeight: 800, color: cor ?? "var(--text)" }}>{valor}</div>
    </div>
  );
}
