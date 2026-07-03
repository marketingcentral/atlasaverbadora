import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ComunicadoCarrossel, DataCorteCard, KpiCard } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { fmtBRL, getAllPropostas } from "../../lib/banco-propostas";

export function BancoVisaoGeral() {
  const nav = useNavigate();
  const visao = useQuery({ queryKey: ["banco", "visao-geral"], queryFn: () => atlas.banco.visaoGeral() });
  const comunicados = useQuery({ queryKey: ["banco", "comunicados"], queryFn: () => atlas.banco.comunicados() });

  const propostas = getAllPropostas();
  const painel = useMemo(() => {
    const emAnalise = propostas.filter((p) => p.status === "recebida" || p.status === "em_analise").length;
    const aprovadas = propostas.filter((p) => p.status === "aprovada" || p.status === "aguardando_formalizacao").length;
    const formalizadas = propostas.filter((p) => p.status === "formalizada" || p.status === "averbada").length;
    const recusadasExpiradas = propostas.filter((p) => p.status === "recusada" || p.status === "expirada").length;
    const volumePorConvenio = new Map<string, number>();
    for (const p of propostas) {
      if (p.status === "averbada") {
        volumePorConvenio.set(p.convenio, (volumePorConvenio.get(p.convenio) ?? 0) + p.valor);
      }
    }
    return { emAnalise, aprovadas, formalizadas, recusadasExpiradas, volumePorConvenio };
  }, [propostas]);

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
          cta={{ label: "Meus contratos", onClick: () => (window.location.href = "/banco/carteira") }}
          accent="info"
        />
        <KpiCard
          label="Novos Contratos"
          value={v.kpis.novosNoMes.count}
          hint="Neste mês"
          cta={{ label: "Contratos novos", onClick: () => (window.location.href = "/banco/carteira") }}
        />
        <KpiCard
          label="Pendências em Contratos"
          value={v.kpis.pendencias.count}
          hint={v.kpis.pendencias.count > 0 ? "Atenção" : "Tudo em dia"}
          cta={{ label: "Minhas pendências", onClick: () => (window.location.href = "/banco/carteira") }}
          accent={v.kpis.pendencias.count > 0 ? "warn" : "success"}
        />
        <DataCorteCard
          dia={v.dataCorte.dia}
          mes={v.dataCorte.mes}
          origem={v.dataCorte.origem}
          operacoes={v.dataCorte.operacoes}
        />
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Painel de propostas</h2>
          <button
            onClick={() => nav("/banco/propostas")}
            style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            Ver a esteira →
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <KpiCard
            label="Propostas em análise"
            value={painel.emAnalise}
            hint="Aguardando decisão"
            cta={{ label: "Analisar", onClick: () => nav("/banco/propostas") }}
            accent="info"
          />
          <KpiCard label="Aprovadas" value={painel.aprovadas} hint="Aguardando/enviando formalização" accent="success" />
          <KpiCard label="Formalizadas" value={painel.formalizadas} hint="Assinadas / averbadas" />
          <KpiCard
            label="Recusadas / expiradas"
            value={painel.recusadasExpiradas}
            hint={painel.recusadasExpiradas > 0 ? "Sem efeito na carteira" : "Nenhuma"}
            accent={painel.recusadasExpiradas > 0 ? "warn" : "success"}
          />
        </div>

        <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 12 }}>
            Volume contratado por convênio
          </div>
          {painel.volumePorConvenio.size === 0 ? (
            <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Nenhuma operação averbada ainda.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...painel.volumePorConvenio.entries()].map(([conv, total]) => (
                <div key={conv} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: "var(--text-muted)" }}>{conv}</span>
                  <span style={{ fontWeight: 600 }}>{fmtBRL(total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <ComunicadoCarrossel comunicados={comunicados.data!.comunicados} />
    </div>
  );
}
