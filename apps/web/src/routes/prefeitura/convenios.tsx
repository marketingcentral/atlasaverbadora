import { useQuery } from "@tanstack/react-query";
import { DataTable, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { PrefeituraConvenio } from "@atlas/sdk";

export function PrefeituraConvenios() {
  const q = useQuery({ queryKey: ["prefeitura", "convenios"], queryFn: () => atlas.prefeitura.convenios() });

  const columns: Column<PrefeituraConvenio>[] = [
    { key: "id", header: "ID", mono: true },
    { key: "nome", header: "Convênio" },
    { key: "bancoNome", header: "Banco" },
    { key: "codigoVerba", header: "Código verba", mono: true },
    { key: "dataCorte", header: "Data corte", render: (c) => `dia ${c.dataCorte}` },
    { key: "diaRepasse", header: "Repasse", render: (c) => `dia ${c.diaRepasse}` },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>Prefeitura</span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Convênios do município</h1>
      </header>
      <DataTable columns={columns} rows={q.data?.convenios ?? []} rowKey={(c) => c.id} loading={q.isLoading} emptyState="Nenhum convênio." />
    </div>
  );
}
