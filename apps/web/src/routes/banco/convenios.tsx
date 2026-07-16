import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { atlas } from "../../lib/sdk";
import { fmtBRL } from "../../lib/banco-propostas";

// Somente leitura: convênios são criados/geridos pela averbadora. O banco apenas
// visualiza os convênios em que opera. Fonte = MESMA API do seletor do menu
// (atlas.banco.convenios()) para não divergir; os números são derivados dos
// contratos reais do banco (atlas.banco.contratos()).
export function BancoConvenios() {
  // Poll 15s — contadores (ativos/aguardando/volume) mudam conforme propostas
  // aprovam e ADFs sao aplicadas. Antes so atualizava em F5.
  const conveniosQ = useQuery({
    queryKey: ["banco", "convenios"],
    queryFn: () => atlas.banco.convenios(),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
  // Visao geral dos convenios: precisa dos contratos de TODOS os convenios do banco
  // (nao so do ativo), pra somar por convenio corretamente. Opt-in explicito.
  const contratosQ = useQuery({
    queryKey: ["banco", "contratos", "convenios-view"],
    queryFn: () => atlas.banco.contratos({ incluirTodosConvenios: true }),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  const cards = useMemo(() => {
    const convenios = conveniosQ.data?.convenios ?? [];
    const contratos = contratosQ.data?.contratos ?? [];
    return convenios.map((cv) => {
      const doConv = contratos.filter((ct) => ct.convenioId === cv.id);
      const ativos = doConv.filter((ct) => {
        const s = ct.situacao.toLowerCase();
        return s === "ativo" || s.includes("averb");
      });
      const aguardando = doConv.filter((ct) => ct.situacao.toLowerCase().includes("aguard")).length;
      const volumeAtivo = ativos.reduce((a, ct) => a + (ct.valorFinanciado || 0), 0);
      return {
        id: cv.id,
        prefeitura: cv.prefeitura,
        convenio: cv.nome,
        uf: cv.uf,
        exigeCcb: cv.exigeCcb,
        exigeBanco2FA: cv.exigeBanco2FA,
        contratosAtivos: ativos.length,
        matriculasUnicas: new Set(ativos.map((ct) => ct.matricula)).size,
        volumeAtivo,
        ticketMedio: ativos.length ? volumeAtivo / ativos.length : 0,
        aguardando,
      };
    });
  }, [conveniosQ.data, contratosQ.data]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Convênios
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Prefeituras conveniadas</h1>
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 680 }}>
          Convênios do seu banco dentro da Atlas. Os convênios são cadastrados e mantidos pela averbadora — esta é uma visão somente leitura.
        </p>
      </header>

      {conveniosQ.isPending ? (
        <div style={{ color: "var(--text-muted)" }}>Carregando convênios…</div>
      ) : conveniosQ.error ? (
        <div style={{ color: "var(--danger-500)" }}>Erro ao carregar convênios.</div>
      ) : cards.length === 0 ? (
        <div style={{ color: "var(--text-muted)" }}>Nenhum convênio ativo para o seu banco.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {cards.map((c) => (
            <div
              key={c.id}
              style={{
                background: "var(--bg-elev)",
                border: "1px solid var(--border-strong)",
                borderRadius: 12,
                padding: 18,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Prefeitura de {c.prefeitura}</h2>
                <span style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>{c.uf}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>{c.convenio}</div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
                <Row label="Contratos ativos" value={`${c.contratosAtivos}`} />
                <Row label="Matrículas únicas" value={`${c.matriculasUnicas}`} />
                <Row label="Volume ativo" value={fmtBRL(c.volumeAtivo)} />
                <Row label="Ticket médio" value={fmtBRL(c.ticketMedio)} />
                <Row label="Aguardando análise" value={`${c.aguardando}`} accent={c.aguardando > 0 ? "var(--gold-500)" : undefined} />
              </div>

              <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                <ReqBadge on={c.exigeCcb} label="CCB obrigatória" />
                <ReqBadge on={c.exigeBanco2FA} label="2FA na averbação" />
              </div>

              {c.contratosAtivos === 0 && c.aguardando === 0 ? (
                <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-dim)", fontStyle: "italic" }}>
                  Sem operações neste convênio ainda.
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
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

/** Selo de exigência do convênio (definida pela prefeitura). Verde = exigido. */
function ReqBadge({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: ".02em",
        padding: "2px 8px",
        borderRadius: 999,
        color: on ? "var(--emerald-500)" : "var(--text-dim)",
        border: `1px solid ${on ? "var(--emerald-500)" : "var(--border)"}`,
        opacity: on ? 1 : 0.6,
      }}
    >
      {on ? "✓ " : "○ "}
      {label}
    </span>
  );
}
