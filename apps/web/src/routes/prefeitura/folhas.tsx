import { useQuery } from "@tanstack/react-query";
import { DataTable, Pill, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { PrefeituraFolha } from "@atlas/sdk";

export function PrefeituraFolhas() {
  const q = useQuery({ queryKey: ["prefeitura", "folhas"], queryFn: () => atlas.prefeitura.folhas() });

  const columns: Column<PrefeituraFolha>[] = [
    { key: "competencia", header: "Competência", mono: true },
    { key: "dataCorte", header: "Data de corte" },
    { key: "dataRepasse", header: "Data de repasse", render: (f) => f.dataRepasse ?? "—" },
    { key: "status", header: "Status", render: (f) => <Pill variant={f.status === "fechada" || f.status === "consolidada" ? "averbado" : "pendente"}>{f.status}</Pill> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>Prefeitura</span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Folhas de pagamento</h1>
        <p style={{ color: "var(--text-muted)" }}>Datas de corte e repasse por competência.</p>
      </header>
      <DataTable columns={columns} rows={q.data?.folhas ?? []} rowKey={(f) => f.id} loading={q.isLoading} emptyState="Nenhuma folha cadastrada." />
    </div>
  );
}
