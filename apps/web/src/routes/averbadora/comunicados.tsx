import { useQuery } from "@tanstack/react-query";
import { DataTable, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

type C = { id: string; titulo: string; corpo: string; linkLabel?: string; linkHref?: string };

export function AdminComunicados() {
  const data = useQuery({ queryKey: ["admin", "comunicados"], queryFn: () => atlas.admin.listComunicados() });

  const columns: Column<C>[] = [
    { key: "id", header: "ID", mono: true, width: 100 },
    { key: "titulo", header: "Título" },
    { key: "corpo", header: "Conteúdo", render: (c) => <span style={{ color: "var(--text-muted)" }}>{c.corpo.slice(0, 120)}{c.corpo.length > 120 ? "..." : ""}</span> },
    { key: "link", header: "Link", render: (c) => (c.linkHref ? c.linkLabel ?? c.linkHref : "—") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Averbadora
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Comunicados aos bancos</h1>
        <p style={{ color: "var(--text-muted)" }}>CRUD completo + segmentação por convênio será habilitado na próxima migração.</p>
      </header>

      <DataTable columns={columns} rows={data.data?.comunicados ?? []} rowKey={(c) => c.id} loading={data.isLoading} />
    </div>
  );
}
