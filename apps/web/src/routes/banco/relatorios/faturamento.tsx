import { useQuery } from "@tanstack/react-query";
import { Button, DataTable, type Column } from "@atlas/ui/web";
import { atlas } from "../../../lib/sdk";
import { downloadCsv } from "../../../lib/csv";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

type Linha = { competencia: string; contratos: number; valorFinanciado: number; comissaoEstimada: number };

export function BancoRelatorioFaturamento() {
  const data = useQuery({ queryKey: ["banco", "rel", "faturamento"], queryFn: () => atlas.banco.relatorioFaturamento() });

  const columns: Column<Linha>[] = [
    { key: "competencia", header: "Competência (folha 1º desconto)" },
    { key: "contratos", header: "Contratos", align: "right" },
    { key: "valorFinanciado", header: "Valor financiado", align: "right", render: (r) => fmtBRL(r.valorFinanciado) },
    { key: "comissaoEstimada", header: "Comissão estimada (2%)", align: "right", render: (r) => fmtBRL(r.comissaoEstimada) },
  ];

  const linhas = data.data?.meses ?? [];
  const totalFinanciado = linhas.reduce((acc, l) => acc + l.valorFinanciado, 0);
  const totalComissao = linhas.reduce((acc, l) => acc + l.comissaoEstimada, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Relatórios
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Faturamento Completo</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 4 }}>Apuração mensal por convênio ativo.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => downloadCsv("faturamento.csv", linhas)}>
          ⬇ Exportar CSV
        </Button>
      </header>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Card label="Total financiado" valor={fmtBRL(totalFinanciado)} />
        <Card label="Comissão estimada" valor={fmtBRL(totalComissao)} accent="success" />
        <Card label="Meses no relatório" valor={String(linhas.length)} />
      </div>

      <DataTable columns={columns} rows={linhas} rowKey={(r) => r.competencia} loading={data.isLoading} />
    </div>
  );
}

function Card({ label, valor, accent }: { label: string; valor: string; accent?: "success" }) {
  return (
    <article
      style={{
        background: "var(--bg-elev)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 16,
        minWidth: 220,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-dim)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent === "success" ? "var(--emerald-500)" : "var(--accent)", marginTop: 6 }}>{valor}</div>
    </article>
  );
}
