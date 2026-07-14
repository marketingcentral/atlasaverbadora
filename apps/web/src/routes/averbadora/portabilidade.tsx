import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable, Pill, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { PortabilidadeIntencao } from "@atlas/sdk";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

/** Visao global do marketplace de portabilidade.
 *  Averbadora ve tudo: quem publicou o que, quais bancos ofertaram, qual foi aceita.
 *  A fonte da verdade da relacao servidor↔banco vive aqui — bancos concorrentes
 *  puxam dessa mesma pool via /banco/portabilidade. */
export function AverbadoraPortabilidade() {
  const q = useQuery({
    queryKey: ["admin", "portabilidade"],
    queryFn: () => atlas.portabilidade.todas(),
    refetchInterval: 15000,
  });
  const [selecionada, setSelecionada] = useState<PortabilidadeIntencao | null>(null);
  const [filtro, setFiltro] = useState<"todas" | "abertas" | "aceitas" | "canceladas">("todas");

  const intencoes = q.data?.intencoes ?? [];
  const filtradas = useMemo(() => {
    if (filtro === "todas") return intencoes;
    if (filtro === "abertas") return intencoes.filter((i) => i.status === "aberta");
    if (filtro === "aceitas") return intencoes.filter((i) => i.status === "aceita");
    return intencoes.filter((i) => i.status === "cancelada" || i.status === "expirada");
  }, [intencoes, filtro]);

  const abertas = intencoes.filter((i) => i.status === "aberta").length;
  const aceitas = intencoes.filter((i) => i.status === "aceita").length;
  const totalOfertas = intencoes.reduce((acc, i) => acc + i.ofertas.length, 0);

  const columns: Column<PortabilidadeIntencao>[] = [
    { key: "id", header: "ID", mono: true },
    { key: "servidorNome", header: "Servidor", render: (i) => (
      <span>
        {i.servidorNome}
        <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          {i.servidorMatricula} · {i.servidorCpfMasked}
        </span>
      </span>
    ) },
    { key: "bancoOrigem", header: "Banco origem", render: (i) => (
      <span>
        {i.bancoOrigemNome}
        <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          ADF {i.contratoAdfOrigem}
        </span>
      </span>
    ) },
    { key: "saldoDevedor", header: "Saldo devedor", align: "right", render: (i) => fmtBRL(i.saldoDevedor) },
    { key: "valorParcela", header: "Parcela", align: "right", render: (i) => (
      <span>
        {fmtBRL(i.valorParcela)}
        <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)" }}>
          × {i.parcelasRestantes}x @ {fmtPct(i.taxaAm)} a.m.
        </span>
      </span>
    ) },
    { key: "ofertas", header: "Ofertas", align: "right", render: (i) => (
      <span style={{ fontSize: 13, fontWeight: 600 }}>{i.ofertas.filter((o) => o.status === "ativa" || o.status === "aceita").length}</span>
    ) },
    { key: "status", header: "Status", render: (i) => (
      <Pill variant={i.status === "aceita" ? "averbado" : i.status === "aberta" ? "aceita" : "expirado"}>
        {i.status}
      </Pill>
    ) },
    { key: "publicadaEm", header: "Publicada", render: (i) => fmtDate(i.publicadaEm) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Averbadora
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Portabilidade — Marketplace</h1>
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 820, fontSize: 13 }}>
          Servidor publica a intenção a partir de um contrato ativo (dados vêm do banco origem via averbadora).
          Bancos concorrentes vêem em <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>/banco/portabilidade</code> e fazem ofertas.
          Servidor aceita a melhor — vira contrato REFIN no banco vencedor.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <KpiCard label="Abertas" value={abertas} />
        <KpiCard label="Ofertas recebidas" value={totalOfertas} />
        <KpiCard label="Aceitas" value={aceitas} />
        <KpiCard label="Total no marketplace" value={intencoes.length} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(["todas", "abertas", "aceitas", "canceladas"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            style={{
              padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
              border: filtro === f ? "1px solid var(--accent)" : "1px solid var(--border)",
              background: filtro === f ? "var(--accent)" : "transparent",
              color: filtro === f ? "var(--bg)" : "var(--text)",
              cursor: "pointer", textTransform: "capitalize",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={filtradas}
        rowKey={(i) => i.id}
        loading={q.isLoading}
        emptyState="Nenhuma intenção de portabilidade."
        actions={(i) => (
          <button
            onClick={() => setSelecionada(i)}
            style={{ background: "transparent", border: "1px solid var(--border)", padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", color: "var(--text)" }}
          >
            Ver ofertas ({i.ofertas.length})
          </button>
        )}
      />

      {selecionada ? <DetalheModal intencao={selecionada} onClose={() => setSelecionada(null)} /> : null}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{value.toLocaleString("pt-BR")}</div>
    </div>
  );
}

function DetalheModal({ intencao, onClose }: { intencao: PortabilidadeIntencao; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,.6)", display: "grid", placeItems: "center", zIndex: 100, padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 14, padding: 24, maxWidth: 780, width: "100%", maxHeight: "calc(100vh - 48px)", overflowY: "auto", boxShadow: "var(--shadow-lg)" }}>
        <h3 style={{ margin: 0 }}>Intenção {intencao.id}</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "6px 0 16px" }}>
          <b>{intencao.servidorNome}</b> ({intencao.servidorMatricula}) · <b>{intencao.bancoOrigemNome}</b> — ADF {intencao.contratoAdfOrigem}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16, padding: 12, background: "var(--bg-elev-2)", borderRadius: 8 }}>
          <Info label="Saldo devedor" valor={fmtBRL(intencao.saldoDevedor)} />
          <Info label="Parcela atual" valor={`${fmtBRL(intencao.valorParcela)} × ${intencao.parcelasRestantes}x`} />
          <Info label="Taxa atual" valor={`${fmtPct(intencao.taxaAm)} a.m.`} />
        </div>

        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Ofertas dos bancos concorrentes ({intencao.ofertas.length})</div>
        {intencao.ofertas.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Ainda não recebeu ofertas.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {intencao.ofertas.map((o) => (
              <div key={o.id} style={{
                border: `1px solid ${o.status === "aceita" ? "var(--emerald-500)" : "var(--border)"}`,
                borderRadius: 8, padding: 12,
                background: o.status === "aceita" ? "color-mix(in srgb, var(--emerald-500) 10%, transparent)" : "transparent",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{o.bancoDestinoNome}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmtDate(o.ofertadaEm)}</div>
                  </div>
                  <Pill variant={o.status === "aceita" ? "averbado" : o.status === "ativa" ? "aceita" : "expirado"}>{o.status}</Pill>
                </div>
                <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, fontSize: 13 }}>
                  <div><span style={{ color: "var(--text-muted)" }}>Nova parcela: </span><b>{fmtBRL(o.novaParcela)}</b></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Prazo: </span><b>{o.novoPrazo} meses</b></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Taxa: </span><b>{fmtPct(o.taxaAmProposta)} a.m.</b></div>
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: o.economia > 0 ? "var(--emerald-500)" : "var(--text-muted)" }}>
                  Economia estimada: {fmtBRL(o.economia)}
                </div>
                {o.observacao ? (
                  <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>"{o.observacao}"</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: "0.06em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{valor}</div>
    </div>
  );
}
