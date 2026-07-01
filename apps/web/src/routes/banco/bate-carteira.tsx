import { useMemo, useState } from "react";
import { Button, DataTable, Pill, TextField, type Column } from "@atlas/ui/web";
import { downloadCsv } from "../../lib/csv";
import { fmtBRL, getBancoPerfil } from "../../lib/banco-propostas";
import { baterCarteira, type ConciliacaoStatus, type LinhaConciliacao } from "../../lib/banco-carteira";

const STATUS_PILL: Record<ConciliacaoStatus, "emdia" | "expirado" | "rejeitada"> = {
  conciliado: "emdia",
  divergente: "expirado",
  nao_encontrado: "rejeitada",
};
const STATUS_LABEL: Record<ConciliacaoStatus, string> = {
  conciliado: "Conciliado",
  divergente: "Divergente",
  nao_encontrado: "Não encontrado na folha",
};

function competenciaAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function BancoBateCarteira() {
  const perfil = getBancoPerfil();
  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [rodado, setRodado] = useState<{ competencia: string; linhas: LinhaConciliacao[] } | null>(null);

  const resumo = useMemo(() => {
    if (!rodado) return null;
    const c = (s: ConciliacaoStatus) => rodado.linhas.filter((l) => l.status === s).length;
    return { conciliados: c("conciliado"), divergentes: c("divergente"), naoEncontrados: c("nao_encontrado"), total: rodado.linhas.length };
  }, [rodado]);

  const columns: Column<LinhaConciliacao>[] = [
    { key: "status", header: "Status", render: (r) => <Pill variant={STATUS_PILL[r.status]}>{STATUS_LABEL[r.status]}</Pill> },
    { key: "idUnico", header: "ID único (protocolo)", mono: true },
    {
      key: "nome",
      header: "Servidor",
      render: (r) => (
        <>
          <div>{r.nome}</div>
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{r.cpfMasked} / {r.matricula}</div>
        </>
      ),
    },
    { key: "convenio", header: "Convênio" },
    { key: "valorBanco", header: "Parcela banco", align: "right", render: (r) => fmtBRL(r.valorBanco) },
    {
      key: "valorFolha",
      header: "Parcela folha",
      align: "right",
      render: (r) => (r.status === "nao_encontrado" ? <span style={{ color: "var(--text-dim)" }}>—</span> : fmtBRL(r.valorFolha)),
    },
  ];

  const exportar = () => {
    if (!rodado) return;
    downloadCsv(
      `bate-carteira-${rodado.competencia}.csv`,
      rodado.linhas.map((l) => ({
        competencia: rodado.competencia,
        protocolo: l.idUnico,
        cpf: l.cpfMasked,
        nome: l.nome,
        convenio: l.convenio,
        matricula: l.matricula,
        valorBanco: l.valorBanco,
        valorFolha: l.valorFolha,
        status: STATUS_LABEL[l.status],
      })),
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Conciliação
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Bate de carteira mensal</h1>
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 680 }}>
          Concilia os contratos do banco com o que a folha da prefeitura processou. A chave é o <strong>ID único</strong> —
          um CPF pode ter várias matrículas e várias operações.
        </p>
      </header>

      <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
        <TextField label="Competência (AAAA-MM)" value={competencia} onChange={(e) => setCompetencia(e.target.value)} />
        <Button onClick={() => setRodado(baterCarteira(competencia))}>Rodar conciliação</Button>
        {rodado && perfil.perms.exportacao ? (
          <Button
            variant="ghost"
            onClick={exportar}
            disabled={rodado.linhas.length === 0}
            title={rodado.linhas.length === 0 ? "Nada a exportar nesta competência" : "Baixar CSV"}
          >
            Exportar relatório (CSV) {rodado.linhas.length > 0 ? `(${rodado.linhas.length})` : ""}
          </Button>
        ) : null}
      </div>

      {resumo ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <Stat label="Total" value={resumo.total} />
          <Stat label="Conciliados" value={resumo.conciliados} />
          <Stat label="Divergentes" value={resumo.divergentes} warn={resumo.divergentes > 0} />
          <Stat label="Não encontrados" value={resumo.naoEncontrados} warn={resumo.naoEncontrados > 0} />
        </div>
      ) : null}

      {rodado ? (
        <DataTable columns={columns} rows={rodado.linhas} rowKey={(r) => r.idUnico} emptyState="Nada a conciliar nesta competência." />
      ) : (
        <div style={{ color: "var(--text-dim)", fontSize: 14 }}>Escolha a competência e rode a conciliação.</div>
      )}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: warn ? "var(--gold-500)" : "var(--text)" }}>{value}</div>
    </div>
  );
}
