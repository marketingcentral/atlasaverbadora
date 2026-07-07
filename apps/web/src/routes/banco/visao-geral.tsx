import { useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button, ComunicadoCarrossel, DataCorteCard, Input, KpiCard } from "@atlas/ui/web";
import { ApiHttpError } from "@atlas/sdk";
import { atlas } from "../../lib/sdk";
import { fmtBRL } from "../../lib/banco-propostas";

const MESES_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Gera lista de cortes navegaveis: 6 meses passados + atual + 3 futuros.
 *  Cada corte inclui a competencia (Mmm/AAAA) e um marcador de posicao temporal
 *  (Encerrada / Em andamento / Prevista) — assim o card muda de estado ao
 *  navegar, nao so o dia/mes. */
function buildCortes(diaCorte: number, origem: string, operacoes: string) {
  const hoje = new Date();
  const lista: {
    dia: number;
    mes: string;
    competencia: string;
    origem: string;
    operacoes: string;
  }[] = [];
  for (let offset = -6; offset <= 3; offset++) {
    const ref = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1);
    const ultimoDia = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
    const dia = Math.min(diaCorte, ultimoDia);
    const competencia = `${MESES_PT[ref.getMonth()]}/${ref.getFullYear()}`;
    // Rotulo do estado do periodo — inclui dia especifico pra deixar claro
    // que a data e daquele mes, nao um valor generico repetido.
    const dataFmt = `${String(dia).padStart(2, "0")}/${String(ref.getMonth() + 1).padStart(2, "0")}/${ref.getFullYear()}`;
    const estado = offset < 0 ? "Encerrada em" : offset === 0 ? "Em andamento — corte" : "Prevista para";
    lista.push({
      dia,
      mes: MESES_PT[ref.getMonth()]!,
      competencia,
      origem: `${origem} · ${estado} ${dataFmt}`,
      operacoes,
    });
  }
  return lista; // index 6 = corte atual
}

export function BancoVisaoGeral() {
  const nav = useNavigate();
  const visao = useQuery({ queryKey: ["banco", "visao-geral"], queryFn: () => atlas.banco.visaoGeral() });
  const comunicados = useQuery({ queryKey: ["banco", "comunicados"], queryFn: () => atlas.banco.comunicados() });
  // index do corte selecionado (6 = corte atual, gerado por buildCortes)
  const [corteIdx, setCorteIdx] = useState(6);

  // "Próximo passo": busca rápida por matrícula/CPF que leva direto à ficha de margem.
  const [busca, setBusca] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [buscaErro, setBuscaErro] = useState<string | null>(null);
  async function iniciarOperacao(e: FormEvent) {
    e.preventDefault();
    const q = busca.trim();
    if (!q) return;
    setBuscaErro(null);
    setBuscando(true);
    try {
      const digitos = q.replace(/\D/g, "");
      const porCpf = digitos.length === 11;
      const { ficha } = await atlas.banco.margemBuscar(porCpf ? { cpf: digitos } : { matricula: q });
      nav(`/banco/margem-contratacao/${ficha.idMatricula}`);
    } catch (err) {
      setBuscaErro(err instanceof ApiHttpError ? err.message : err instanceof Error ? err.message : "Erro ao buscar");
    } finally {
      setBuscando(false);
    }
  }

  // Painel de KPIs vem do backend — o seed getAllPropostas() era demo
  // hardcoded (Maria, Roberto, Jose, etc.) que aparecia identico pra
  // qualquer banco. Banco novo mostrava painel "cheio" mesmo sem ter
  // aprovado nada. Removido — usa KPIs do backend (ja isolados por banco).
  const painel = useMemo(() => ({
    emAnalise: 0,
    aprovadas: 0,
    formalizadas: visao.data?.kpis.carteira.count ?? 0,
    recusadasExpiradas: 0,
    volumePorConvenio: new Map<string, number>(),
  }), [visao.data?.kpis.carteira.count]);

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
  const cortes = buildCortes(v.dataCorte.dia, v.dataCorte.origem, v.dataCorte.operacoes);
  // Mural de atualizações de margem: retorno dos arquivos pós-fechamento de folha.
  // Derivado do ciclo de cortes — competência atual "em processamento", passadas
  // "concluídas" (margens dos servidores já atualizadas para o mês seguinte).
  const mural = [
    { competencia: cortes[6]!.competencia, status: "processando" as const },
    ...[5, 4, 3, 2].map((i) => ({ competencia: cortes[i]!.competencia, status: "concluido" as const })),
  ];
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
        {(() => {
          const idx = Math.min(Math.max(corteIdx, 0), cortes.length - 1);
          const c = cortes[idx]!;
          return (
            <DataCorteCard
              dia={c.dia}
              mes={c.mes}
              competencia={c.competencia}
              origem={c.origem}
              operacoes={c.operacoes}
              canPrev={idx > 0}
              canNext={idx < cortes.length - 1}
              onPrev={() => setCorteIdx((i) => Math.max(0, i - 1))}
              onNext={() => setCorteIdx((i) => Math.min(cortes.length - 1, i + 1))}
            />
          );
        })()}
      </div>

      {/* Próximo passo — atalho para iniciar uma nova operação buscando o servidor */}
      <form
        onSubmit={iniciarOperacao}
        style={{
          background: "color-mix(in srgb, var(--accent) 8%, var(--bg-elev))",
          border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))",
          borderRadius: 16,
          padding: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 220 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.08em", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase" }}>
            Próximo passo
          </div>
          <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text)", marginTop: 2 }}>
            Iniciar nova operação de crédito
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
            Busque pelo servidor para consultar a margem disponível.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flex: "1 1 320px", minWidth: 240 }}>
          <div style={{ flex: 1 }}>
            <Input
              label=""
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Matrícula ou CPF…"
              inputMode="numeric"
            />
          </div>
          <Button type="submit" disabled={buscando || !busca.trim()}>
            {buscando ? "Buscando…" : "Buscar →"}
          </Button>
        </div>
        {buscaErro ? (
          <div style={{ flexBasis: "100%", color: "var(--danger-500)", fontSize: 13 }}>{buscaErro}</div>
        ) : null}
      </form>

      {/* Mural de atualizações de margem — retorno dos arquivos pós-fechamento de folha */}
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Mural de atualizações de margem</h2>
            <span style={{ fontSize: 11, color: "var(--text-dim)", border: "1px solid var(--border)", borderRadius: 999, padding: "2px 8px" }}>
              {v.convenio.nome}
            </span>
          </div>
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>retorno de arquivos pós-fechamento de folha</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mural.map((m) => {
            const proc = m.status === "processando";
            const cor = proc ? "var(--gold-500)" : "var(--emerald-500)";
            return (
              <div
                key={m.competencia}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "var(--bg-elev)",
                  borderLeft: `3px solid ${cor}`,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700 }}>
                    Retorno {m.competencia}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                    {proc
                      ? "Arquivo recebido — processando descontos e atualizando margens."
                      : "Retorno da folha disponível — margens dos servidores atualizadas."}
                  </div>
                </div>
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    color: cor,
                    border: `1px solid ${cor}`,
                    borderRadius: 999,
                    padding: "2px 10px",
                  }}
                >
                  {proc ? "Em processamento" : "Concluído"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

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
