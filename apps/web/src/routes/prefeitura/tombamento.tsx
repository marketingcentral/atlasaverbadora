import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CsvImportPanel, DataTable, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { PageHeader, inp } from "./_ui";

interface Lote { id: string; competencia: string; totalLinhas: number; inseridos: number; atualizados: number; divergencias: number; recebidoEm: string }

export function PrefeituraTombamento() {
  const qc = useQueryClient();
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7).replace("-", ""));
  const q = useQuery({ queryKey: ["prefeitura", "tombamento"], queryFn: () => atlas.prefeitura.tombamentoLotes() });

  const columns: Column<Lote>[] = [
    { key: "id", header: "Lote", mono: true },
    { key: "competencia", header: "Competência", mono: true },
    { key: "totalLinhas", header: "Linhas", align: "right" },
    { key: "inseridos", header: "Inseridos", align: "right" },
    { key: "atualizados", header: "Atualizados", align: "right" },
    { key: "divergencias", header: "Divergências", align: "right", render: (l) => <span style={{ color: l.divergencias ? "#ef4444" : "var(--text-muted)" }}>{l.divergencias}</span> },
    { key: "recebidoEm", header: "Recebido", render: (l) => new Date(l.recebidoEm).toLocaleString("pt-BR") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader title="Tombamento de contratos" subtitle="Envio inicial dos contratos legados e remessa mensal (saldo, parcelas pagas, status)." />
      <Card>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase" }}>Competência do lote</span>
            <input style={{ ...inp, width: 140 }} value={competencia} onChange={(e) => setCompetencia(e.target.value)} placeholder="202608" />
          </label>
        </div>
        <CsvImportPanel
          title="Enviar remessa de contratos"
          columnsHint="cpfMasked, matricula, bancoNome, adfBanco, valorParcela, parcelasRestantes, saldoDevedor"
          templateUrl={atlas.prefeitura.tombamentoCsvTemplateUrl()}
          onImport={async (csv) => {
            const r = await atlas.prefeitura.importarTombamento(csv, competencia);
            return { inserted: r.inseridos, updated: r.atualizados, skipped: r.divergencias, errors: r.erros, rows: [] };
          }}
          onImported={() => qc.invalidateQueries({ queryKey: ["prefeitura", "tombamento"] })}
        />
      </Card>
      <DataTable columns={columns} rows={(q.data?.lotes ?? []) as Lote[]} rowKey={(l) => l.id} loading={q.isLoading} emptyState="Nenhum lote de tombamento enviado." />
    </div>
  );
}
