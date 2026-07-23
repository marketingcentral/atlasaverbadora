import { useQuery } from "@tanstack/react-query";
import { DataTable, Pill, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { PrefeituraContrato } from "@atlas/sdk";
import { contratoStatusInfo } from "../../lib/contrato-status";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function PrefeituraContratos() {
  const q = useQuery({ queryKey: ["prefeitura", "contratos"], queryFn: () => atlas.prefeitura.contratos() });

  const columns: Column<PrefeituraContrato>[] = [
    { key: "adf", header: "ADF", mono: true },
    { key: "nome", header: "Servidor" },
    { key: "matricula", header: "Matrícula", mono: true },
    { key: "bancoNome", header: "Banco" },
    { key: "tipoContrato", header: "Tipo" },
    { key: "valorParcela", header: "Parcela", align: "right", render: (c) => fmtBRL(c.valorParcela) },
    { key: "totalParcelas", header: "Parcelas", align: "right" },
    { key: "situacao", header: "Situação", render: (c) => {
      // Rotulo unificado com averbadora/banco/servidor (lib/contrato-status).
      const info = contratoStatusInfo(c.situacao);
      return <Pill variant={info.variant}>{info.label}</Pill>;
    } },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>Prefeitura</span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Contratos averbados</h1>
        <p style={{ color: "var(--text-muted)" }}>Total: {q.data?.total ?? 0}</p>
      </header>
      <DataTable columns={columns} rows={q.data?.contratos ?? []} rowKey={(c) => c.adf} loading={q.isLoading} emptyState="Nenhum contrato averbado." />
    </div>
  );
}
