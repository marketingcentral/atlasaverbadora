import { useMemo, useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CsvImportPanel, DataTable, Pill, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { PageHeader, inp } from "./_ui";

interface Lote { id: string; competencia: string; totalLinhas: number; inseridos: number; atualizados: number; divergencias: number; recebidoEm: string }
interface Linha {
  loteId: string;
  cpfMasked: string;
  matricula: string;
  nome?: string;
  bancoNome: string;
  adfBanco: string;
  valorParcela: number;
  totalParcelas?: number;
  parcelasRestantes: number;
  valorEmprestimo?: number;
  saldoDevedor: number;
  statusContrato?: string;
  motivo?: string;
  tipo?: string;
  reconciliacao: "ok" | "divergente" | "novo";
  competencia?: string;
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function PrefeituraTombamento() {
  const qc = useQueryClient();
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7).replace("-", ""));
  const lotesQ = useQuery({ queryKey: ["prefeitura", "tombamento"], queryFn: () => atlas.prefeitura.tombamentoLotes() });
  const lotes: Lote[] = (lotesQ.data?.lotes ?? []) as Lote[];

  // Puxa linhas de cada lote em paralelo (cache 30s pra alternar rápido).
  const linhasQueries = useQueries({
    queries: lotes.map((l) => ({
      queryKey: ["prefeitura", "tombamento", "linhas", l.id],
      queryFn: () => atlas.prefeitura.tombamentoLinhas(l.id),
      staleTime: 30_000,
    })),
  });

  const linhas: Linha[] = useMemo(() => {
    const out: Linha[] = [];
    lotes.forEach((lote, idx) => {
      const data = linhasQueries[idx]?.data as { linhas: Linha[] } | undefined;
      for (const l of data?.linhas ?? []) {
        out.push({ ...l, competencia: lote.competencia });
      }
    });
    return out;
  }, [lotes, linhasQueries]);

  const carregando = lotesQ.isLoading || linhasQueries.some((q) => q.isLoading);

  const columnsContratos: Column<Linha>[] = [
    { key: "competencia", header: "Competência", mono: true, render: (l) => l.competencia ?? "—" },
    { key: "cpfMasked", header: "CPF", mono: true },
    { key: "matricula", header: "Matrícula", mono: true },
    { key: "nome", header: "Nome", render: (l) => l.nome ?? "—" },
    { key: "bancoNome", header: "Banco" },
    { key: "adfBanco", header: "Nº Contrato", mono: true },
    { key: "valorParcela", header: "Valor parcela", align: "right", render: (l) => BRL.format(l.valorParcela) },
    { key: "totalParcelas", header: "Total parc.", align: "right", render: (l) => l.totalParcelas ?? "—" },
    { key: "parcelasRestantes", header: "Restantes", align: "right" },
    { key: "valorEmprestimo", header: "Valor emprést.", align: "right", render: (l) => l.valorEmprestimo ? BRL.format(l.valorEmprestimo) : "—" },
    { key: "saldoDevedor", header: "Saldo dev.", align: "right", render: (l) => BRL.format(l.saldoDevedor) },
    { key: "statusContrato", header: "Status", render: (l) => l.statusContrato ?? "—" },
    { key: "motivo", header: "Motivo", render: (l) => l.motivo ?? "—" },
    { key: "tipo", header: "Tipo", render: (l) => l.tipo ?? "—" },
    {
      key: "reconciliacao",
      header: "Reconciliação",
      render: (l) => (
        <Pill variant={l.reconciliacao === "ok" ? "averbado" : l.reconciliacao === "novo" ? "pendente" : "rejeitada"}>
          {l.reconciliacao}
        </Pill>
      ),
    },
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
          columnsHint="cpf, matricula, nome, banco, numeroContrato, valorParcela, totalParcelas, parcelasRestantes, valorEmprestimo, status, motivo, tipo"
          templateUrl={atlas.prefeitura.tombamentoCsvTemplateUrl()}
          onImport={async (csv) => {
            const r = await atlas.prefeitura.importarTombamento(csv, competencia);
            return { inserted: r.inseridos, updated: r.atualizados, skipped: r.divergencias, errors: r.erros, rows: [] };
          }}
          onImported={() => qc.invalidateQueries({ queryKey: ["prefeitura", "tombamento"] })}
        />
      </Card>

      {lotes.length > 0 ? (
        <div style={{ padding: "10px 14px", background: "var(--bg-elev-2)", borderRadius: 8, fontSize: 13, color: "var(--text-muted)" }}>
          <b>{lotes.length}</b> lote(s) enviado(s) · <b>{linhas.length}</b> contrato(s) declarado(s) no total
        </div>
      ) : null}

      <DataTable
        columns={columnsContratos}
        rows={linhas}
        rowKey={(l) => `${l.loteId}:${l.matricula}:${l.adfBanco}`}
        loading={carregando}
        emptyState="Nenhum contrato tombado. Envie o CSV de remessa acima."
      />
    </div>
  );
}
