import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, FormActions, FormGrid, IconButton, Pill, SelectField, TextField, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { AdminTombamentoLote, AdminTombamentoLinha, AdminPrefeitura } from "@atlas/sdk";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function AdminTombamento() {
  const qc = useQueryClient();
  const lotes = useQuery({ queryKey: ["admin", "tombamento", "lotes"], queryFn: () => atlas.admin.listTombamentoLotes() });
  const prefeituras = useQuery({ queryKey: ["admin", "prefeituras"], queryFn: () => atlas.admin.listPrefeituras() });
  const [opening, setOpening] = useState<AdminTombamentoLote | null>(null);
  const [importing, setImporting] = useState(false);

  const columns: Column<AdminTombamentoLote>[] = [
    {
      key: "status",
      header: "Status",
      render: (l) => (
        <Pill variant={l.status === "conciliado" ? "averbado" : l.status === "divergente" ? "pendente" : l.status === "rejeitado" ? "rejeitada" : "emdia"}>
          {l.status}
        </Pill>
      ),
    },
    { key: "id", header: "Lote", mono: true },
    { key: "prefeituraNome", header: "Prefeitura" },
    { key: "competencia", header: "Competência" },
    { key: "totalLinhas", header: "Linhas", align: "right" },
    { key: "inseridos", header: "Inseridos", align: "right" },
    { key: "atualizados", header: "Atualizados", align: "right" },
    {
      key: "divergencias",
      header: "Divergências",
      align: "right",
      render: (l) => (
        <span style={{ color: l.divergencias > 0 ? "var(--gold-500)" : "var(--text)", fontWeight: l.divergencias > 0 ? 600 : 400 }}>
          {l.divergencias}
        </span>
      ),
    },
    { key: "recebidoEm", header: "Recebido", render: (l) => new Date(l.recebidoEm).toLocaleString("pt-BR") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Averbadora
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Tombamento de contratos</h1>
          <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 720 }}>
            Recebimento mensal dos arquivos de remessa enviados pelas prefeituras. Faz a conciliação contra as posições do Atlas e atualiza margens.
          </p>
        </div>
        <Button onClick={() => setImporting(true)}>+ Importar remessa</Button>
      </header>

      {(() => {
        const comDiv = (lotes.data?.lotes ?? []).filter((l) => l.divergencias > 0);
        if (comDiv.length === 0) return null;
        const total = comDiv.reduce((s, l) => s + l.divergencias, 0);
        return (
          <div style={{ padding: "12px 16px", borderRadius: 10, border: "1px solid var(--gold-500)", background: "color-mix(in srgb, var(--gold-500) 12%, transparent)", fontSize: 14 }}>
            ⚠ <b>{total} divergência(s)</b> em {comDiv.length} lote(s) entre a base da prefeitura, a base do banco e a remessa. Abra o lote (↗) para ver as linhas marcadas.
          </div>
        );
      })()}

      <DataTable
        columns={columns}
        rows={lotes.data?.lotes ?? []}
        rowKey={(l) => l.id}
        loading={lotes.isLoading}
        actions={(l) => (
          <IconButton title="Ver linhas do lote" onClick={() => setOpening(l)}>↗</IconButton>
        )}
      />

      {opening ? <LinhasDrawer lote={opening} onClose={() => setOpening(null)} /> : null}
      {importing ? (
        <ImportModal
          prefeituras={prefeituras.data?.prefeituras ?? []}
          onClose={() => setImporting(false)}
          onImported={() => qc.invalidateQueries({ queryKey: ["admin", "tombamento", "lotes"] })}
        />
      ) : null}
    </div>
  );
}

function LinhasDrawer({ lote, onClose }: { lote: AdminTombamentoLote; onClose: () => void }) {
  const linhas = useQuery({
    queryKey: ["admin", "tombamento", "linhas", lote.id],
    queryFn: () => atlas.admin.listTombamentoLinhas(lote.id),
  });
  const columns: Column<AdminTombamentoLinha>[] = [
    {
      key: "reconciliacao",
      header: "Reconciliação",
      render: (l) => (
        <Pill variant={l.reconciliacao === "ok" ? "averbado" : l.reconciliacao === "novo" ? "emdia" : "pendente"}>
          {l.reconciliacao}
        </Pill>
      ),
    },
    { key: "cpfMasked", header: "CPF", mono: true },
    { key: "nome", header: "Nome", render: (l) => l.nome ?? "—" },
    { key: "matricula", header: "Matrícula", mono: true },
    { key: "bancoNome", header: "Banco" },
    { key: "adfBanco", header: "Nº contrato", mono: true },
    { key: "valorParcela", header: "Parcela", align: "right", render: (l) => BRL.format(l.valorParcela) },
    { key: "parcelasRestantes", header: "Parc. rest.", align: "right", render: (l) => l.totalParcelas ? `${l.parcelasRestantes}/${l.totalParcelas}` : l.parcelasRestantes },
    { key: "valorEmprestimo", header: "Vlr. empréstimo", align: "right", render: (l) => l.valorEmprestimo != null ? BRL.format(l.valorEmprestimo) : BRL.format(l.saldoDevedor) },
    { key: "statusContrato", header: "Status", render: (l) => l.statusContrato ? <Pill variant={/confirmad/i.test(l.statusContrato) ? "averbado" : "pendente"}>{l.statusContrato}</Pill> : "—" },
    { key: "detalhe", header: "Observação", render: (l) => l.detalheReconciliacao ?? l.motivo ?? "—" },
  ];
  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalCard, maxWidth: 1100 }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0 }}>Lote {lote.id}</h3>
            <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 13 }}>
              {lote.prefeituraNome} / {lote.competencia} — {lote.totalLinhas} linhas
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </header>
        <DataTable columns={columns} rows={linhas.data?.linhas ?? []} rowKey={(l) => `${l.matricula}-${l.adfBanco}`} loading={linhas.isLoading} />
      </div>
    </div>
  );
}

function ImportModal({
  prefeituras, onClose, onImported,
}: {
  prefeituras: AdminPrefeitura[];
  onClose: () => void;
  onImported: () => void;
}) {
  const [prefeituraId, setPrefeituraId] = useState<number>(prefeituras[0]?.id ?? 1);
  const [competencia, setCompetencia] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [csv, setCsv] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inseridos: number; atualizados: number; divergencias: number; erros: { line: number; message: string }[] } | null>(null);
  const importMut = useMutation({
    mutationFn: () => atlas.admin.importarTombamento({ prefeituraId, competencia, csv }),
    onSuccess: (r) => {
      setResult({ inseridos: r.inseridos, atualizados: r.atualizados, divergencias: r.divergencias, erros: r.erros });
      onImported();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Falha na importação"),
  });
  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalCard, maxWidth: 760 }}>
        <h3 style={{ margin: 0 }}>Importar remessa de contratos</h3>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13 }}>
          Cola o conteúdo do CSV abaixo. <a href={atlas.admin.tombamentoCsvTemplateUrl()} download style={{ color: "var(--gold-500)" }}>Baixar template</a>.
        </p>
        <FormGrid cols={2}>
          <SelectField
            label="Prefeitura"
            value={String(prefeituraId)}
            onChange={(e) => setPrefeituraId(Number(e.target.value))}
            options={prefeituras.map((p) => ({ value: String(p.id), label: `${p.nome}/${p.uf}` }))}
          />
          <TextField label="Competência (YYYYMM)" value={competencia} onChange={(e) => setCompetencia(e.target.value)} maxLength={6} />
        </FormGrid>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={10}
          placeholder="cpf,matricula,nome,banco,numeroContrato,valorParcela,totalParcelas,parcelasRestantes,valorEmprestimo,status,motivo,tipo"
          style={{
            background: "var(--bg-elev)", border: "1px solid var(--border-strong)",
            borderRadius: 10, padding: 12, color: "var(--text)", fontFamily: "ui-monospace, monospace", fontSize: 13,
          }}
        />
        {error ? <div style={{ color: "var(--danger-500)", fontSize: 13 }}>{error}</div> : null}
        {result ? (
          <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 10, padding: 12, fontSize: 13 }}>
            <strong>Resultado:</strong>{" "}
            {result.inseridos} inseridos · {result.atualizados} atualizados · {result.divergencias} divergências
            {result.erros.length > 0 ? (
              <ul style={{ margin: "8px 0 0", paddingLeft: 20, color: "var(--danger-500)" }}>
                {result.erros.slice(0, 10).map((er, i) => <li key={i}>linha {er.line}: {er.message}</li>)}
                {result.erros.length > 10 ? <li>+ {result.erros.length - 10} erro(s)</li> : null}
              </ul>
            ) : null}
          </div>
        ) : null}
        <FormActions>
          <Button variant="ghost" type="button" onClick={onClose}>Fechar</Button>
          <Button type="button" disabled={importMut.isPending || !csv.trim()} onClick={() => importMut.mutate()}>
            {importMut.isPending ? "Processando..." : "Processar remessa"}
          </Button>
        </FormActions>
      </div>
    </div>
  );
}

const modalBackdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(10,22,40,.6)",
  display: "grid", placeItems: "center", zIndex: 100, backdropFilter: "blur(6px)",
};
const modalCard: React.CSSProperties = {
  background: "var(--bg-elev)", border: "1px solid var(--border-strong)",
  borderRadius: 14, padding: 24, maxWidth: 640, width: "calc(100% - 48px)",
  display: "flex", flexDirection: "column", gap: 16, boxShadow: "var(--shadow-lg)",
  maxHeight: "calc(100vh - 48px)", overflowY: "auto",
};
