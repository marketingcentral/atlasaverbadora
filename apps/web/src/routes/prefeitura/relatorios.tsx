import { useQuery } from "@tanstack/react-query";
import { Card, DataTable, KpiCard, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { PageHeader } from "./_ui";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function PrefeituraRelatorios() {
  const vinc = useQuery({ queryKey: ["prefeitura", "rel-vinculo"], queryFn: () => atlas.prefeitura.relServidoresPorVinculo() });
  const margem = useQuery({ queryKey: ["prefeitura", "rel-margem"], queryFn: () => atlas.prefeitura.relMargemMedia() });
  const banco = useQuery({ queryKey: ["prefeitura", "rel-banco"], queryFn: () => atlas.prefeitura.relContratosPorBanco() });
  const inc = useQuery({ queryKey: ["prefeitura", "rel-inc"], queryFn: () => atlas.prefeitura.relInconsistencias() });
  const folhas = useQuery({ queryKey: ["prefeitura", "folhas"], queryFn: () => atlas.prefeitura.folhas() });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader title="Relatórios operacionais" subtitle="Servidores por vínculo, margem média, contratos por banco, histórico de folhas e inconsistências." />

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <KpiCard label="Servidores" value={margem.data?.servidores ?? 0} />
        <KpiCard label="Margem média total" value={fmtBRL(margem.data?.margemMediaTotal ?? 0)} accent="info" />
        <KpiCard label="Margem média disp." value={fmtBRL(margem.data?.margemMediaDisponivel ?? 0)} accent="success" />
        <KpiCard label="% uso médio" value={`${((margem.data?.percentualUsoMedio ?? 0) * 100).toFixed(1)}%`} />
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <Card>
          <span style={eyebrow}>Servidores por vínculo</span>
          <DataTable columns={[{ key: "vinculo", header: "Vínculo" }, { key: "total", header: "Total", align: "right" }] as Column<{ vinculo: string; total: number }>[]} rows={vinc.data?.dados ?? []} rowKey={(r) => r.vinculo} loading={vinc.isLoading} emptyState="—" />
        </Card>
        <Card>
          <span style={eyebrow}>Contratos por banco</span>
          <DataTable columns={[{ key: "banco", header: "Banco" }, { key: "contratos", header: "Contratos", align: "right" }, { key: "valorParcela", header: "Parcelas", align: "right", render: (r: { valorParcela: number }) => fmtBRL(r.valorParcela) }] as Column<{ banco: string; contratos: number; valorParcela: number }>[]} rows={banco.data?.dados ?? []} rowKey={(r) => r.banco} loading={banco.isLoading} emptyState="—" />
        </Card>
      </div>

      <Card>
        <span style={eyebrow}>Histórico de folhas processadas</span>
        <DataTable
          columns={[
            { key: "competencia", header: "Competência", mono: true },
            { key: "dataCorte", header: "Corte" },
            { key: "dataRepasse", header: "Repasse", render: (f: { dataRepasse: string | null }) => f.dataRepasse ?? "—" },
            { key: "status", header: "Status" },
            { key: "movimentacoes", header: "Movimentações", align: "right" },
          ] as Column<{ competencia: string; dataCorte: string; dataRepasse: string | null; status: string; movimentacoes: number }>[]}
          rows={folhas.data?.folhas ?? []} rowKey={(f) => f.competencia} loading={folhas.isLoading} emptyState="—"
        />
      </Card>

      <Card>
        <span style={eyebrow}>Inconsistências ({inc.data?.total ?? 0})</span>
        <DataTable columns={[{ key: "matricula", header: "Matrícula", mono: true }, { key: "nome", header: "Servidor" }, { key: "problema", header: "Problema", render: (r: { problema: string }) => <span style={{ color: "#ef4444" }}>{r.problema}</span> }] as Column<{ matricula: string; nome: string; problema: string }>[]} rows={inc.data?.inconsistencias ?? []} rowKey={(r) => `${r.matricula}-${r.problema}`} loading={inc.isLoading} emptyState="Nenhuma inconsistência." />
      </Card>
    </div>
  );
}

const eyebrow: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "var(--text-dim)", textTransform: "uppercase" };
