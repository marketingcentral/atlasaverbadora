import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CsvImportPanel, DataTable, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { AdminConvenio } from "@atlas/sdk";

export function AdminConvenios() {
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ["admin", "convenios"], queryFn: () => atlas.admin.listConvenios() });

  const columns: Column<AdminConvenio>[] = [
    { key: "id", header: "ID", mono: true },
    { key: "nome", header: "Convênio" },
    { key: "prefeituraNome", header: "Prefeitura" },
    { key: "bancoNome", header: "Banco" },
    { key: "codigoVerba", header: "Código verba", mono: true },
    { key: "dataCorte", header: "Data corte", render: (c) => `dia ${c.dataCorte}` },
    { key: "diaRepasse", header: "Repasse", render: (c) => `dia ${c.diaRepasse}` },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Averbadora
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Convênios (banco × prefeitura)</h1>
        <p style={{ color: "var(--text-muted)" }}>Edição completa via CRUD será adicionada com a migração ao Postgres.</p>
      </header>

      <CsvImportPanel
        title="Importar convênios"
        columnsHint="Colunas: bancoId, prefeituraId, nome, codigoVerba, dataCorte, diaRepasse"
        templateUrl={atlas.admin.csvTemplateUrl("convenios")}
        onImport={async (csv) => atlas.admin.importCsv("convenios", csv)}
        onImported={() => qc.invalidateQueries({ queryKey: ["admin", "convenios"] })}
      />

      <DataTable columns={columns} rows={data.data?.convenios ?? []} rowKey={(c) => c.id} loading={data.isLoading} />
    </div>
  );
}
