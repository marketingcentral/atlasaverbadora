import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, DataTable, Pill, TextField, type Column } from "@atlas/ui/web";
import type { AdminBateCarteiraLinha } from "@atlas/sdk";
import { downloadCsv } from "../../lib/csv";
import { fmtBRL, getBancoPerfil } from "../../lib/banco-propostas";
import { atlas } from "../../lib/sdk";

// Status pill: mapeia o status vindo do backend (varias reconciliacoes possiveis)
// pras 3 categorias uteis pro operador.
type UiStatus = "conciliado" | "divergente" | "nao_encontrado";
function classify(l: AdminBateCarteiraLinha): UiStatus {
  const s = (l.status ?? "").toLowerCase();
  if (s.includes("nao_encontr") || s.includes("nao encontr")) return "nao_encontrado";
  if (s.includes("diverg")) return "divergente";
  return "conciliado";
}
const STATUS_PILL: Record<UiStatus, "emdia" | "expirado" | "rejeitada"> = {
  conciliado: "emdia",
  divergente: "expirado",
  nao_encontrado: "rejeitada",
};
const STATUS_LABEL: Record<UiStatus, string> = {
  conciliado: "Conciliado",
  divergente: "Divergente",
  nao_encontrado: "Não encontrado na folha",
};

/** UI usa YYYY-MM; backend exige YYYYMM. Converte antes de mandar. */
function normalizeCompetencia(ui: string): string {
  return ui.replace(/[^0-9]/g, "").padEnd(6, "0").slice(0, 6);
}
function competenciaAtualUi(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function BancoBateCarteira() {
  const perfil = getBancoPerfil();
  const [competencia, setCompetencia] = useState(competenciaAtualUi());
  const rodar = useMutation({
    mutationFn: (comp: string) => atlas.banco.bateCarteira({ competencia: normalizeCompetencia(comp) }),
  });
  const rodado = rodar.data;

  const resumo = useMemo(() => {
    if (!rodado) return null;
    const c = (s: UiStatus) => rodado.linhas.filter((l) => classify(l) === s).length;
    return {
      conciliados: c("conciliado"),
      divergentes: c("divergente"),
      naoEncontrados: c("nao_encontrado"),
      total: rodado.linhas.length,
    };
  }, [rodado]);

  // Row estendido com __rk pra dedup (idUnico pode repetir entre origens
  // diferentes — tombamento + pre_reserva_confirmada do mesmo protocolo).
  type Row = AdminBateCarteiraLinha & { __rk: string };
  const columns: Column<Row>[] = [
    { key: "status", header: "Status", render: (r) => { const s = classify(r); return <Pill variant={STATUS_PILL[s]}>{STATUS_LABEL[s]}</Pill>; } },
    { key: "idUnico", header: "ID único (protocolo)", mono: true },
    { key: "cpfMasked", header: "CPF", mono: true },
    { key: "matricula", header: "Matrícula" },
    { key: "prefeituraNome", header: "Prefeitura" },
    { key: "valorParcela", header: "Parcela", align: "right", render: (r) => fmtBRL(r.valorParcela) },
    { key: "saldoDevedor", header: "Saldo devedor", align: "right", render: (r) => r.saldoDevedor != null ? fmtBRL(r.saldoDevedor) : <span style={{ color: "var(--text-dim)" }}>—</span> },
    { key: "origem", header: "Origem", render: (r) => r.origem === "tombamento" ? "Folha (tombamento)" : "Pré-reserva confirmada" },
  ];

  const exportar = () => {
    if (!rodado) return;
    downloadCsv(
      `bate-carteira-${rodado.competencia}.csv`,
      rodado.linhas.map((l) => ({
        competencia: rodado.competencia,
        protocolo: l.idUnico,
        cpf: l.cpfMasked,
        matricula: l.matricula,
        prefeitura: l.prefeituraNome,
        valorParcela: l.valorParcela,
        saldoDevedor: l.saldoDevedor ?? "",
        origem: l.origem,
        status: STATUS_LABEL[classify(l)],
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
          um CPF pode ter várias matrículas e várias operações. Fonte: tombamento importado pela prefeitura + pré-reservas confirmadas do banco.
        </p>
      </header>

      <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
        <TextField label="Competência (AAAA-MM)" value={competencia} onChange={(e) => setCompetencia(e.target.value)} />
        <Button onClick={() => rodar.mutate(competencia)} disabled={rodar.isPending}>
          {rodar.isPending ? "Rodando…" : "Rodar conciliação"}
        </Button>
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

      {rodar.isError ? (
        <div style={{ padding: 12, borderRadius: 10, background: "color-mix(in srgb, var(--danger-500) 12%, transparent)", border: "1px solid var(--danger-500)", fontSize: 13 }}>
          Não foi possível rodar: {(rodar.error as Error).message}
        </div>
      ) : null}

      {resumo ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <Stat label="Total" value={resumo.total} />
          <Stat label="Conciliados" value={resumo.conciliados} />
          <Stat label="Divergentes" value={resumo.divergentes} warn={resumo.divergentes > 0} />
          <Stat label="Não encontrados" value={resumo.naoEncontrados} warn={resumo.naoEncontrados > 0} />
        </div>
      ) : null}

      {rodado ? (
        <>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Somatório de parcelas: <b style={{ color: "var(--text)" }}>{fmtBRL(rodado.somaValorParcela)}</b> · saldo devedor:{" "}
            <b style={{ color: "var(--text)" }}>{fmtBRL(rodado.somaSaldoDevedor)}</b>
          </div>
          <DataTable columns={columns} rows={rodado.linhas.map((l, i) => ({ ...l, __rk: `${l.idUnico}-${i}` }))} rowKey={(r) => r.__rk} emptyState="Nada a conciliar nesta competência." />
        </>
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
