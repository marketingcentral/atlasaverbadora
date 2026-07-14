import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, DataTable, Pill, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { PrefeituraAdf } from "@atlas/sdk";
import { PageHeader, downloadAuthed } from "./_ui";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

// Prefeitura APENAS RECEBE/CONSULTA as ADFs. Cliente disse: "a averbadora que
// faz a adf, a prefeitura so recebe". Botoes de Confirmar / Reportar falha
// foram movidos para a averbadora (/averbadora/adf).

export function PrefeituraAdf() {
  const comps = useQuery({ queryKey: ["prefeitura", "adf-comps"], queryFn: () => atlas.prefeitura.adfCompetencias() });
  const [competencia, setCompetencia] = useState<string>("");
  useEffect(() => { if (!competencia && comps.data?.competenciaAtual) setCompetencia(comps.data.competenciaAtual); }, [comps.data, competencia]);

  const adfs = useQuery({ queryKey: ["prefeitura", "adf", competencia], queryFn: () => atlas.prefeitura.adf(competencia), enabled: !!competencia, refetchInterval: 10_000, refetchOnWindowFocus: true });
  const rows = adfs.data?.adfs ?? [];

  const totalParcelas = useMemo(() => rows.reduce((s, a) => s + a.valorParcela, 0), [rows]);
  const resumo = useMemo(() => {
    let r = 0, a = 0, f = 0;
    for (const x of rows) {
      if (x.status === "recebida") r++;
      else if (x.status === "aplicada") a++;
      else if (x.status === "falha") f++;
    }
    return { r, a, f };
  }, [rows]);

  const columns: Column<PrefeituraAdf>[] = [
    { key: "adf", header: "ADF", mono: true },
    { key: "idUnico", header: "ID único", mono: true },
    { key: "cpfMasked", header: "CPF", mono: true },
    { key: "nome", header: "Servidor" },
    { key: "bancoNome", header: "Banco" },
    {
      key: "valorParcela",
      header: "Parcela",
      align: "right",
      render: (a) => (
        <span>
          {fmtBRL(a.valorParcela)}
          <span style={{ color: "var(--text-muted)", marginLeft: 6, fontSize: 12 }}>
            × {a.totalParcelas}x
          </span>
        </span>
      ),
    },
    { key: "status", header: "Status", render: (a) => <Pill variant={a.status === "aplicada" ? "averbado" : a.status === "falha" ? "expirado" : "pendente"}>{a.status}</Pill> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader
        title="ADF — Descontos em folha"
        subtitle="Lote mensal de ADFs recebidas. A averbadora é quem aplica em folha e reporta falhas — esta tela é para consulta e download."
      />

      <div style={{
        padding: "10px 14px",
        borderRadius: 10,
        background: "color-mix(in srgb, var(--accent) 6%, transparent)",
        border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
        fontSize: 12.5,
        color: "var(--text-muted)",
        lineHeight: 1.5,
      }}>
        <b style={{ color: "var(--text)" }}>ℹ️ Só recebimento:</b> a averbadora executa a aplicação em folha e reporta falhas. Esta prefeitura consulta o lote e baixa CSV/PDF para conferência interna. Qualquer alteração de status vem da averbadora e reflete aqui automaticamente.
      </div>

      <Card>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Competência:</span>
          {(comps.data?.competencias ?? []).map((c) => (
            <button
              key={c.competencia}
              onClick={() => setCompetencia(c.competencia)}
              style={{
                padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontSize: 13,
                border: `1px solid ${competencia === c.competencia ? "var(--accent)" : "var(--border)"}`,
                background: competencia === c.competencia ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--surface)",
                color: "var(--text)",
              }}
            >
              {c.competencia} <span style={{ color: "var(--text-muted)" }}>({c.aplicadas}/{c.total})</span>
            </button>
          ))}
          {(comps.data?.competencias.length ?? 0) === 0 ? <span style={{ fontSize: 13 }}>{comps.data?.competenciaAtual ?? "—"}</span> : null}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
          {competencia ? <>
            <Button size="sm" variant="ghost" onClick={() => downloadAuthed(atlas.prefeitura.adfCsvUrl(competencia), `adf-${competencia}.csv`)}>Baixar CSV</Button>
            <Button size="sm" variant="ghost" onClick={() => downloadAuthed(atlas.prefeitura.adfPdfUrl(competencia), `adf-lote-${competencia}.pdf`)}>Baixar PDF</Button>
          </> : null}
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {rows.length} ADFs · total parcelas <b style={{ color: "var(--text)" }}>{fmtBRL(totalParcelas)}</b>
            {" · "}
            <span style={{ color: "var(--gold-500)" }}>{resumo.r} recebidas</span>
            {" / "}
            <span style={{ color: "var(--emerald-500)" }}>{resumo.a} aplicadas</span>
            {" / "}
            <span style={{ color: "var(--danger-500)" }}>{resumo.f} falhas</span>
          </span>
        </div>
      </Card>

      <DataTable columns={columns} rows={rows} rowKey={(a) => a.id} loading={adfs.isLoading} emptyState="Nenhuma ADF nesta competência." />
    </div>
  );
}
