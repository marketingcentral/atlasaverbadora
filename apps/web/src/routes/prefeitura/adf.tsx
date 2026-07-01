import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, DataTable, Pill, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { PrefeituraAdf } from "@atlas/sdk";
import { PageHeader } from "./_ui";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function PrefeituraAdf() {
  const qc = useQueryClient();
  const comps = useQuery({ queryKey: ["prefeitura", "adf-comps"], queryFn: () => atlas.prefeitura.adfCompetencias() });
  const [competencia, setCompetencia] = useState<string>("");
  useEffect(() => { if (!competencia && comps.data?.competenciaAtual) setCompetencia(comps.data.competenciaAtual); }, [comps.data, competencia]);

  const adfs = useQuery({ queryKey: ["prefeitura", "adf", competencia], queryFn: () => atlas.prefeitura.adf(competencia), enabled: !!competencia });
  const [sel, setSel] = useState<Set<string>>(new Set());
  const rows = adfs.data?.adfs ?? [];
  useEffect(() => { setSel(new Set()); }, [competencia]);

  const confirmar = useMutation({ mutationFn: (ids: string[]) => atlas.prefeitura.confirmarAdf(ids), onSuccess: () => { setSel(new Set()); qc.invalidateQueries({ queryKey: ["prefeitura", "adf"] }); qc.invalidateQueries({ queryKey: ["prefeitura", "adf-comps"] }); } });
  const falha = useMutation({ mutationFn: (ids: string[]) => atlas.prefeitura.reportarFalhaAdf(ids, prompt("Motivo da falha?") || "não informado"), onSuccess: () => { setSel(new Set()); qc.invalidateQueries({ queryKey: ["prefeitura", "adf"] }); } });

  const totalParcelas = useMemo(() => rows.reduce((s, a) => s + a.valorParcela, 0), [rows]);

  const columns: Column<PrefeituraAdf>[] = [
    { key: "sel", header: "", render: (a) => <input type="checkbox" checked={sel.has(a.id)} onChange={(e) => { const n = new Set(sel); e.target.checked ? n.add(a.id) : n.delete(a.id); setSel(n); }} /> },
    { key: "adf", header: "ADF", mono: true },
    { key: "idUnico", header: "ID único", mono: true },
    { key: "cpfMasked", header: "CPF", mono: true },
    { key: "nome", header: "Servidor" },
    { key: "bancoNome", header: "Banco" },
    { key: "valorParcela", header: "Parcela", align: "right", render: (a) => fmtBRL(a.valorParcela) },
    { key: "status", header: "Status", render: (a) => <Pill variant={a.status === "aplicada" ? "averbado" : a.status === "falha" ? "expirado" : "pendente"}>{a.status}</Pill> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader title="ADF — Descontos em folha" subtitle="Lote mensal de ADFs (CPF + ID único + dados) gerado pelos bancos. Confirme a aplicação em folha ou reporte falhas." />

      <Card>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Competência:</span>
          {(comps.data?.competencias ?? []).map((c) => (
            <button key={c.competencia} onClick={() => setCompetencia(c.competencia)} style={{ padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontSize: 13, border: `1px solid ${competencia === c.competencia ? "var(--accent)" : "var(--border)"}`, background: competencia === c.competencia ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--surface)", color: "var(--text)" }}>
              {c.competencia} <span style={{ color: "var(--text-muted)" }}>({c.aplicadas}/{c.total})</span>
            </button>
          ))}
          {(comps.data?.competencias.length ?? 0) === 0 ? <span style={{ fontSize: 13 }}>{comps.data?.competenciaAtual ?? "—"}</span> : null}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
          {competencia ? <>
            <a href={atlas.prefeitura.adfCsvUrl(competencia)} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost">Baixar CSV</Button></a>
            <a href={atlas.prefeitura.adfPdfUrl(competencia)} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost">Baixar PDF</Button></a>
          </> : null}
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{rows.length} ADFs · total parcelas {fmtBRL(totalParcelas)}</span>
        </div>
      </Card>

      {sel.size > 0 ? (
        <Card style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <b style={{ fontSize: 14 }}>{sel.size} selecionada(s)</b>
          <span style={{ flex: 1 }} />
          <Button size="sm" onClick={() => confirmar.mutate([...sel])} disabled={confirmar.isPending}>Confirmar aplicação em folha</Button>
          <Button size="sm" variant="ghost" onClick={() => falha.mutate([...sel])} disabled={falha.isPending}>Reportar falha</Button>
        </Card>
      ) : null}

      <DataTable columns={columns} rows={rows} rowKey={(a) => a.id} loading={adfs.isLoading} emptyState="Nenhuma ADF nesta competência." />
    </div>
  );
}
