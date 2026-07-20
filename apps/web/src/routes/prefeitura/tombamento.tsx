import { useMemo, useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, CsvImportPanel, DataTable, Pill, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { PageHeader } from "./_ui";

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Converte YYYYMM em { ano, mes } (mes 1-12). */
function parseCompetencia(v: string): { ano: number; mes: number } {
  const clean = v.replace(/\D/g, "").padStart(6, "0").slice(-6);
  const ano = Number(clean.slice(0, 4));
  const mes = Number(clean.slice(4, 6));
  return { ano, mes };
}

/** Combina ano+mes em YYYYMM. */
function toCompetencia(ano: number, mes: number): string {
  return `${ano}${String(mes).padStart(2, "0")}`;
}

/** Nome amigavel: "Julho de 2026". */
function labelCompetencia(v: string): string {
  const { ano, mes } = parseCompetencia(v);
  if (mes < 1 || mes > 12) return "—";
  return `${MESES_PT[mes - 1]} de ${ano}`;
}

/** Soma N meses em YYYYMM (positivo ou negativo). */
function shiftCompetencia(v: string, delta: number): string {
  const { ano, mes } = parseCompetencia(v);
  const total = ano * 12 + (mes - 1) + delta;
  return toCompetencia(Math.floor(total / 12), (total % 12) + 1);
}

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

  // Achata todas as linhas de todos os lotes (com competencia herdada do lote).
  const linhasTodas: Linha[] = useMemo(() => {
    const out: Linha[] = [];
    lotes.forEach((lote, idx) => {
      const data = linhasQueries[idx]?.data as { linhas: Linha[] } | undefined;
      for (const l of data?.linhas ?? []) {
        out.push({ ...l, competencia: lote.competencia });
      }
    });
    return out;
  }, [lotes, linhasQueries]);

  // Filtra pela competencia selecionada no seletor — se o usuario troca de mes
  // no picker, a tabela abaixo mostra so as linhas daquela competencia.
  const linhas = useMemo(
    () => linhasTodas.filter((l) => l.competencia === competencia),
    [linhasTodas, competencia],
  );
  // Resumo do lote/linhas na competencia selecionada.
  const lotesNaCompetencia = lotes.filter((l) => l.competencia === competencia);

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
        <CompetenciaPicker value={competencia} onChange={setCompetencia} />
        <div style={{ height: 12 }} />
        <CsvImportPanel
          title="Enviar remessa de contratos"
          templateUrl={atlas.prefeitura.tombamentoCsvTemplateUrl()}
          onImport={async (csv) => {
            const r = await atlas.prefeitura.importarTombamento(csv, competencia);
            return { inserted: r.inseridos, updated: r.atualizados, skipped: r.divergencias, errors: r.erros, rows: [] };
          }}
          onImported={() => qc.invalidateQueries({ queryKey: ["prefeitura", "tombamento"] })}
        />
      </Card>

      <div style={{ padding: "10px 14px", background: "var(--bg-elev-2)", borderRadius: 8, fontSize: 13, color: "var(--text-muted)" }}>
        Competência selecionada: <b style={{ color: "var(--gold-500)" }}>{labelCompetencia(competencia)}</b> · <b>{lotesNaCompetencia.length}</b> lote(s) · <b>{linhas.length}</b> contrato(s)
        {lotes.length > lotesNaCompetencia.length ? (
          <span style={{ marginLeft: 8, color: "var(--text-dim)", fontSize: 12 }}>
            (outras competências: {lotes.length - lotesNaCompetencia.length} lote(s) ocultos)
          </span>
        ) : null}
      </div>

      <DataTable
        columns={columnsContratos}
        rows={linhas}
        rowKey={(l) => `${l.loteId}:${l.matricula}:${l.adfBanco}`}
        loading={carregando}
        emptyState={
          lotes.length > 0
            ? `Sem contratos tombados em ${labelCompetencia(competencia)}. Troque a competência acima ou envie um CSV para este mês.`
            : "Nenhum contrato tombado. Envie o CSV de remessa acima."
        }
      />
    </div>
  );
}

/** Seletor de competencia (mes/ano) — separa em 2 selects visuais + rotulo
 *  amigavel + botoes rapidos (mes anterior / atual / proximo). Evita o usuario
 *  digitar YYYYMM na mao e errar. */
function CompetenciaPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { ano, mes } = parseCompetencia(value);
  const anoAtual = new Date().getFullYear();
  const anosDisponiveis = [anoAtual - 1, anoAtual, anoAtual + 1];
  const hoje = new Date();
  const compHoje = toCompetencia(hoje.getFullYear(), hoje.getMonth() + 1);
  const compProximo = shiftCompetencia(compHoje, 1);
  const isHoje = value === compHoje;
  const isProximo = value === compProximo;
  const selectStyle: React.CSSProperties = {
    padding: "9px 12px",
    borderRadius: 8,
    border: "1px solid var(--border-strong)",
    background: "var(--bg-elev)",
    color: "var(--text)",
    fontSize: 14,
    fontWeight: 600,
    minWidth: 130,
    cursor: "pointer",
  };
  return (
    <div style={{ padding: "14px 16px", background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 8 }}>
        Competência do lote
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <select value={mes} onChange={(e) => onChange(toCompetencia(ano, Number(e.target.value)))} style={selectStyle}>
          {MESES_PT.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <select value={ano} onChange={(e) => onChange(toCompetencia(Number(e.target.value), mes))} style={{ ...selectStyle, minWidth: 90 }}>
          {anosDisponiveis.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 4, alignItems: "center", marginLeft: "auto", flexWrap: "wrap" }}>
          <Button size="sm" variant="ghost" onClick={() => onChange(shiftCompetencia(value, -1))} title="Mês anterior">
            ← Anterior
          </Button>
          <Button
            size="sm"
            variant={isHoje ? undefined : "ghost"}
            onClick={() => onChange(compHoje)}
            title="Competência do mês atual"
          >
            Este mês
          </Button>
          <Button
            size="sm"
            variant={isProximo ? undefined : "ghost"}
            onClick={() => onChange(compProximo)}
            title="Competência do próximo mês"
          >
            Próximo →
          </Button>
        </div>
      </div>
      <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Enviando para:</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--gold-500)" }}>{labelCompetencia(value)}</span>
        <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>({value})</span>
      </div>
    </div>
  );
}
