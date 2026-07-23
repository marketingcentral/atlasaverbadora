import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable, Pill, SelectField, TextField, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { contratoStatusInfo } from "../../lib/contrato-status";
import { produtoLabelDeContrato } from "../../lib/produto-label";
import { matchAny } from "../../lib/text-search";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DT_BR = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
});

type ContratoRow = {
  adf: string; situacao: string; lancamento: string; expiracao: string | null;
  cpfMasked: string; matricula: string; nome: string; tipoContrato: string;
  totalParcelas: number; valorParcela: number; convenio: string;
  convenioId: string; valorFinanciado: number; taxaAm: number;
  folhaStatus?: "recebida" | "aplicada" | "falha";
  atualizadoEm?: string;
  bancoId: number; bancoNome: string;
};

// Rotulo do produto via helper unificado (lib/produto-label) — cobre
// Telemedicina/Portabilidade/Cartao Beneficio/Cartao Consignado etc.
// Antes: versao local so distinguia REFIN/ECONSIGNADO/Emprestimo.
// Pill de situacao via contratoStatusInfo (lib/contrato-status).

function folhaVariant(s?: string): "aceita" | "pendente" | "expirado" | "rejeitada" {
  if (!s) return "pendente";
  if (s === "aplicada") return "aceita";
  if (s === "falha") return "rejeitada";
  if (s === "recebida") return "pendente";
  return "expirado";
}

export function AdminContratos() {
  const q = useQuery({
    queryKey: ["admin", "contratos"],
    queryFn: () => atlas.admin.contratos(),
    refetchInterval: 15_000,
  });

  const [busca, setBusca] = useState("");
  const [bancoFiltro, setBancoFiltro] = useState<string>("");
  const [situacaoFiltro, setSituacaoFiltro] = useState<string>("");

  const rows: ContratoRow[] = q.data?.contratos ?? [];

  const bancos = useMemo(() => Array.from(new Set(rows.map((r) => r.bancoNome))).sort(), [rows]);
  const situacoes = useMemo(() => Array.from(new Set(rows.map((r) => r.situacao))).sort(), [rows]);

  const filtradas = useMemo(() => {
    return rows.filter((r) => {
      if (bancoFiltro && r.bancoNome !== bancoFiltro) return false;
      if (situacaoFiltro && r.situacao !== situacaoFiltro) return false;
      // Busca via matchAny (LIKE PHP): cobre TODOS os campos e trata CPF/
      // matricula/telefone/ADF com ou sem pontuacao.
      return matchAny(r, busca);
    }).sort((a, b) => (b.atualizadoEm ?? "").localeCompare(a.atualizadoEm ?? ""));
  }, [rows, busca, bancoFiltro, situacaoFiltro]);

  // Totalizadores excluem contratos terminais negativos (cancelado, recusado,
  // rejeitado, expirado, quitado) — antes um cancelado de R$100k inflava
  // "Valor financiado" contradizendo o KPI de conversao/margem.
  const eTerminal = (s: string) => {
    const t = (s || "").toLowerCase();
    if (t === "expirado" || t === "cancelado" || t === "quitado") return true;
    if (t.includes("recus") || t.includes("reprov") || t.includes("rejeit") || t.includes("negad") || t.includes("estorn")) return true;
    return false;
  };
  const filtradasSomaveis = filtradas.filter((r) => !eTerminal(r.situacao));
  const totalFinanciado = filtradasSomaveis.reduce((s, r) => s + (r.valorFinanciado ?? 0), 0);
  const totalParcelas = filtradasSomaveis.reduce((s, r) => s + r.valorParcela, 0);
  const totalTerminaisIgnoradas = filtradas.length - filtradasSomaveis.length;

  const columns: Column<ContratoRow>[] = [
    { key: "adf", header: "ADF", mono: true },
    { key: "banco", header: "Banco", render: (r) => r.bancoNome },
    { key: "servidor", header: "Servidor", render: (r) => (
      <>
        <div>{r.nome}</div>
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{r.cpfMasked} / {r.matricula}</div>
      </>
    ) },
    { key: "convenio", header: "Convênio", render: (r) => r.convenio },
    { key: "produto", header: "Produto", render: (r) => produtoLabelDeContrato(r) },
    { key: "valorFinanciado", header: "Valor", align: "right", render: (r) => BRL.format(r.valorFinanciado) },
    { key: "parcelas", header: "Parcelas", align: "right", render: (r) => `${r.totalParcelas}× ${BRL.format(r.valorParcela)}` },
    { key: "taxa", header: "Taxa a.m.", align: "right", render: (r) => `${(r.taxaAm * 100).toFixed(2)}%` },
    { key: "situacao", header: "Situação", render: (r) => {
      const info = contratoStatusInfo(r.situacao);
      return <Pill variant={info.variant}>{info.label}</Pill>;
    } },
    { key: "folha", header: "Folha", render: (r) => (
      <Pill variant={folhaVariant(r.folhaStatus)}>{r.folhaStatus ?? "—"}</Pill>
    ) },
    { key: "atualizadoEm", header: "Última atualização", render: (r) => (
      r.atualizadoEm ? DT_BR.format(new Date(r.atualizadoEm)) : "—"
    ) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Averbadora
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Contratos</h1>
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 780 }}>
          Visão consolidada de todos os contratos (todos os bancos, todas as prefeituras). Cada linha representa uma operação
          contratada — inclui propostas aprovadas aguardando ADF, contratos ativos averbados, quitados, cancelados e em
          cobrança direta.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <SummaryCard
          label="Total de contratos"
          value={String(filtradas.length)}
          hint={totalTerminaisIgnoradas > 0 ? `${totalTerminaisIgnoradas} cancelado(s)/expirado(s)/quitado(s) — nao somados` : undefined}
        />
        <SummaryCard label="Valor financiado" value={BRL.format(totalFinanciado)} accent hint={totalTerminaisIgnoradas > 0 ? "so operacoes vivas" : undefined} />
        <SummaryCard label="Soma das parcelas" value={BRL.format(totalParcelas)} hint={totalTerminaisIgnoradas > 0 ? "so operacoes vivas" : undefined} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 220px 220px", gap: 12, alignItems: "end" }}>
        <TextField
          label="Buscar (ADF, matrícula, CPF ou nome)"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Ex.: 9533469, 908983, ABSALAO…"
        />
        <SelectField
          label="Banco"
          value={bancoFiltro}
          onChange={(e) => setBancoFiltro(e.target.value)}
          options={[{ value: "", label: "Todos" }, ...bancos.map((b) => ({ value: b, label: b }))]}
        />
        <SelectField
          label="Situação"
          value={situacaoFiltro}
          onChange={(e) => setSituacaoFiltro(e.target.value)}
          options={[{ value: "", label: "Todas" }, ...situacoes.map((s) => ({ value: s, label: s }))]}
        />
      </div>

      <DataTable
        columns={columns}
        rows={filtradas}
        rowKey={(r) => r.adf}
        loading={q.isLoading}
        emptyState={
          rows.length === 0
            ? "Nenhum contrato ainda — assim que um banco criar uma proposta, ela aparece aqui."
            : "Nenhum contrato bate com os filtros aplicados."
        }
      />
    </div>
  );
}

function SummaryCard({ label, value, accent, hint }: { label: string; value: string; accent?: boolean; hint?: string }) {
  return (
    <div style={{
      background: "var(--bg-elev)", border: "1px solid var(--border-strong)",
      borderRadius: 12, padding: "14px 16px",
    }}>
      <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6, color: accent ? "var(--gold-500)" : "var(--text)" }}>{value}</div>
      {hint ? <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>{hint}</div> : null}
    </div>
  );
}
