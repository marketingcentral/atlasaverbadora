import { useQuery } from "@tanstack/react-query";
import { Card, KpiCard } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function AverbadoraDashboard() {
  const data = useQuery({ queryKey: ["admin", "dashboard"], queryFn: () => atlas.admin.dashboard() });

  if (data.isLoading) return <div style={{ color: "var(--text-muted)" }}>Carregando dashboard...</div>;
  if (!data.data) return <div style={{ color: "var(--danger-500)" }}>Erro ao carregar.</div>;
  const k = data.data.kpis;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Averbadora
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Comando central</h1>
        <p style={{ color: "var(--text-muted)" }}>KPIs consolidados de todos os convênios.</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <KpiCard label="Propostas hoje" value={k.propostasHoje} hint="Todos os convênios" />
        <KpiCard label="Conversão" value={`${(k.conversao * 100).toFixed(1)}%`} hint="Aceite / criadas" accent="info" />
        <KpiCard label="Ticket médio" value={fmtBRL(k.ticketMedio)} hint="Valor financiado por contrato" />
        <KpiCard label="Bancos ativos" value={k.bancosAtivos} accent="success" />
        <KpiCard label="Prefeituras ativas" value={k.prefeiturasAtivas} accent="info" />
        <KpiCard label="Servidores cadastrados" value={k.servidoresCadastrados.toLocaleString("pt-BR")} />
        <KpiCard label="Receita vitrine (mês)" value={fmtBRL(k.receitaVitrineMes)} accent="success" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <Card>
          <h3 style={{ marginTop: 0 }}>Top bancos por propostas</h3>
          <ol style={{ marginTop: 8, paddingLeft: 18, color: "var(--text-muted)" }}>
            {data.data.topBancos.map((b) => (
              <li key={b.nome} style={{ margin: "6px 0" }}>
                {b.nome} — <b style={{ color: "var(--accent)" }}>{b.propostas}</b>
              </li>
            ))}
          </ol>
        </Card>
        <Card>
          <h3 style={{ marginTop: 0 }}>Top prefeituras por servidores</h3>
          <ol style={{ marginTop: 8, paddingLeft: 18, color: "var(--text-muted)" }}>
            {data.data.topPrefeituras.map((p) => (
              <li key={p.nome} style={{ margin: "6px 0" }}>
                {p.nome} — <b style={{ color: "var(--accent)" }}>{p.servidores.toLocaleString("pt-BR")}</b>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
