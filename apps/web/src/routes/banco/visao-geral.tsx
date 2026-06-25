import { useQuery } from "@tanstack/react-query";
import { ComunicadoCarrossel, DataCorteCard, KpiCard } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

export function BancoVisaoGeral() {
  const visao = useQuery({ queryKey: ["banco", "visao-geral"], queryFn: () => atlas.banco.visaoGeral() });
  const comunicados = useQuery({ queryKey: ["banco", "comunicados"], queryFn: () => atlas.banco.comunicados() });

  if (visao.isLoading || comunicados.isLoading) {
    return <div style={{ color: "var(--text-muted)" }}>Carregando visão geral...</div>;
  }
  if (visao.error || comunicados.error) {
    return (
      <div style={{ color: "var(--danger-500)" }}>
        Erro ao carregar: {(visao.error ?? comunicados.error) instanceof Error ? (visao.error ?? comunicados.error)!.message : ""}
      </div>
    );
  }

  const v = visao.data!;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Convênio ativo
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem", letterSpacing: "-0.02em" }}>{v.convenio.prefeitura}</h1>
        <div style={{ color: "var(--text-muted)" }}>{v.convenio.nome}</div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <KpiCard
          label="Carteira de Contratos"
          value={v.kpis.carteira.count}
          hint={`Percentual: ${(v.kpis.carteira.percentual * 100).toFixed(0)}%`}
          cta={{ label: "Meus contratos", onClick: () => (window.location.href = "/banco/gerenciador-contratos") }}
          accent="info"
        />
        <KpiCard
          label="Novos Contratos"
          value={v.kpis.novosNoMes.count}
          hint="Neste mês"
          cta={{ label: "Contratos novos", onClick: () => (window.location.href = "/banco/gerenciador-contratos") }}
        />
        <KpiCard
          label="Pendências em Contratos"
          value={v.kpis.pendencias.count}
          hint={v.kpis.pendencias.count > 0 ? "Atenção" : "Tudo em dia"}
          cta={{ label: "Minhas pendências", onClick: () => (window.location.href = "/banco/gerenciador-contratos") }}
          accent={v.kpis.pendencias.count > 0 ? "warn" : "success"}
        />
        <DataCorteCard
          dia={v.dataCorte.dia}
          mes={v.dataCorte.mes}
          origem={v.dataCorte.origem}
          operacoes={v.dataCorte.operacoes}
        />
      </div>

      <ComunicadoCarrossel comunicados={comunicados.data!.comunicados} />
    </div>
  );
}
