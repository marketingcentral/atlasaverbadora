import { useQuery } from "@tanstack/react-query";
import { Card, KpiCard } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

interface DashboardResponse {
  kpis: {
    propostasHoje: number;
    conversao: number;
    ticketMedio: number;
    bancosAtivos: number;
    prefeiturasAtivas: number;
    servidoresCadastrados: number;
    receitaVitrineMes: number;
    preReservasAtivas?: number;
    preReservasExpirandoEm24h?: number;
    margemTravada?: number;
    folhasAbertas?: number;
  };
  topBancos: { nome: string; propostas: number }[];
  topPrefeituras: { nome: string; servidores: number }[];
  volumePorConvenio?: { nome: string; valor: number }[];
  volumePorBanco?: { nome: string; valor: number }[];
}

export function AverbadoraDashboard() {
  const data = useQuery<DashboardResponse>({ queryKey: ["admin", "dashboard"], queryFn: () => atlas.admin.dashboard() as Promise<DashboardResponse> });

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
        <KpiCard label="Pré-reservas ativas" value={k.preReservasAtivas ?? 0} hint="Margem travada" accent="info" />
        <KpiCard label="Expirando em 24h" value={k.preReservasExpirandoEm24h ?? 0} accent={(k.preReservasExpirandoEm24h ?? 0) > 0 ? "warn" : "info"} hint="Vão liberar margem" />
        <KpiCard label="Propostas hoje" value={k.propostasHoje} />
        <KpiCard label="Folhas em aberto" value={k.folhasAbertas ?? 0} accent={(k.folhasAbertas ?? 0) > 0 ? "warn" : "info"} hint="Aguardando fechamento" />
        <KpiCard label="Conversão" value={`${(k.conversao * 100).toFixed(1)}%`} hint="Aceite / criadas" accent="info" />
        <KpiCard label="Ticket médio" value={fmtBRL(k.ticketMedio)} hint="Valor financiado por contrato" />
        <KpiCard label="Margem travada" value={fmtBRL(k.margemTravada ?? 0)} hint="Total em pré-reservas ativas" />
        <KpiCard label="Bancos ativos" value={k.bancosAtivos} accent="success" />
        <KpiCard label="Prefeituras ativas" value={k.prefeiturasAtivas} accent="info" />
        <KpiCard label="Servidores cadastrados" value={k.servidoresCadastrados.toLocaleString("pt-BR")} />
        <KpiCard label="Receita vitrine (mês)" value={fmtBRL(k.receitaVitrineMes)} accent="success" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <Card>
          <h3 style={{ marginTop: 0 }}>Volume averbado por convênio</h3>
          <RankingList items={data.data.volumePorConvenio ?? []} fmt={fmtBRL} empty="Sem contratos no período." />
        </Card>
        <Card>
          <h3 style={{ marginTop: 0 }}>Volume averbado por banco</h3>
          <RankingList items={data.data.volumePorBanco ?? []} fmt={fmtBRL} empty="Sem contratos no período." />
        </Card>
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

function RankingList({ items, fmt, empty }: { items: { nome: string; valor: number }[]; fmt: (n: number) => string; empty: string }) {
  if (items.length === 0) return <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 8 }}>{empty}</p>;
  const max = Math.max(...items.map((i) => i.valor));
  return (
    <ul style={{ marginTop: 8, padding: 0, listStyle: "none" }}>
      {items.slice(0, 6).map((it) => (
        <li key={it.nome} style={{ margin: "8px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "var(--text-muted)" }}>{it.nome}</span>
            <span style={{ fontWeight: 700 }}>{fmt(it.valor)}</span>
          </div>
          <div style={{ marginTop: 4, height: 6, background: "var(--bg-elev)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{
              width: `${Math.max(4, (it.valor / max) * 100)}%`, height: "100%",
              background: "linear-gradient(90deg, var(--gold-500), var(--emerald-500))",
            }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
