import { useQuery } from "@tanstack/react-query";
import { DataTable, Pill, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { AdminFolha } from "@atlas/sdk";

export function AdminFolhas() {
  const data = useQuery({ queryKey: ["admin", "folhas"], queryFn: () => atlas.admin.listFolhas() });

  const columns: Column<AdminFolha>[] = [
    { key: "id", header: "ID", mono: true },
    { key: "prefeitura", header: "Prefeitura" },
    { key: "competencia", header: "Competência" },
    { key: "dataCorte", header: "Data corte" },
    { key: "dataRepasse", header: "Data repasse", render: (f) => f.dataRepasse ?? "—" },
    {
      key: "status",
      header: "Status",
      render: (f) => (
        <Pill variant={f.status === "consolidada" ? "averbado" : f.status === "fechada" ? "emdia" : "pendente"}>{f.status}</Pill>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Averbadora
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Folhas por competência</h1>
        <p style={{ color: "var(--text-muted)" }}>Estado das folhas das prefeituras afiliadas (aberta → fechada → consolidada).</p>
      </header>

      <DataTable columns={columns} rows={data.data?.folhas ?? []} rowKey={(f) => f.id} loading={data.isLoading} />
    </div>
  );
}
