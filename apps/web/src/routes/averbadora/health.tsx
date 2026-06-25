import { useQuery } from "@tanstack/react-query";
import { DataTable, Pill, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

type Row = { servico: string; uptime: number; p95: number; ok: boolean };

export function AdminHealth() {
  const data = useQuery({ queryKey: ["admin", "health"], queryFn: () => atlas.admin.health(), refetchInterval: 15000 });

  const columns: Column<Row>[] = [
    { key: "servico", header: "Serviço" },
    { key: "uptime", header: "Uptime", align: "right", render: (r) => `${(r.uptime * 100).toFixed(2)}%` },
    { key: "p95", header: "Latência p95", align: "right", render: (r) => `${r.p95}ms` },
    { key: "ok", header: "Status", render: (r) => <Pill variant={r.ok ? "averbado" : "rejeitada"}>{r.ok ? "OK" : "FALHA"}</Pill> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Averbadora
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Health dos serviços externos</h1>
        <p style={{ color: "var(--text-muted)" }}>Atualiza a cada 15 segundos.</p>
      </header>

      <DataTable columns={columns} rows={data.data?.checks ?? []} rowKey={(r) => r.servico} loading={data.isLoading} />
    </div>
  );
}
