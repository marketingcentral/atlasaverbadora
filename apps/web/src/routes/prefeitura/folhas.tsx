import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, CsvImportPanel, DataTable, IconButton, Pill, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { PrefeituraFolha } from "@atlas/sdk";
import { Modal, Field, inp } from "./_ui";

type FolhaRow = PrefeituraFolha & { movimentacoes: number };

export function PrefeituraFolhas() {
  const qc = useQueryClient();
  const [novaOpen, setNovaOpen] = useState(false);
  const [movFolha, setMovFolha] = useState<FolhaRow | null>(null);
  const q = useQuery({ queryKey: ["prefeitura", "folhas"], queryFn: () => atlas.prefeitura.folhas() });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "aberta" | "fechada" | "consolidada" }) => atlas.prefeitura.atualizarFolha(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prefeitura"] }),
  });

  const columns: Column<FolhaRow>[] = [
    { key: "competencia", header: "Competência", mono: true },
    { key: "dataCorte", header: "Corte" },
    { key: "dataRepasse", header: "Repasse", render: (f) => f.dataRepasse ?? "—" },
    { key: "movimentacoes", header: "Movimentações", align: "right" },
    { key: "status", header: "Status", render: (f) => <Pill variant={f.status === "aberta" ? "pendente" : "averbado"}>{f.status}</Pill> },
    {
      key: "acoes", header: "", render: (f) => (
        <div style={{ display: "flex", gap: 6 }}>
          {f.status === "aberta" ? <IconButton onClick={() => setMovFolha(f)}>Movimentar</IconButton> : null}
          {f.status === "aberta" ? <IconButton onClick={() => setStatus.mutate({ id: f.id, status: "fechada" })}>Fechar</IconButton> : null}
          {f.status === "fechada" ? <IconButton onClick={() => setStatus.mutate({ id: f.id, status: "consolidada" })}>Consolidar</IconButton> : null}
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>Prefeitura</span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Folhas de pagamento</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 4 }}>Competência mensal, movimentação de pessoal e datas de corte. Recálculo de margem é automático.</p>
        </div>
        <Button onClick={() => setNovaOpen(true)}>+ Abrir competência</Button>
      </header>

      <DataTable columns={columns} rows={q.data?.folhas ?? []} rowKey={(f) => f.id} loading={q.isLoading} emptyState="Nenhuma folha. Abra uma competência." />

      {novaOpen ? <NovaFolha onClose={() => setNovaOpen(false)} onSaved={() => { setNovaOpen(false); qc.invalidateQueries({ queryKey: ["prefeitura"] }); }} /> : null}
      {movFolha ? <MovModal folha={movFolha} onClose={() => setMovFolha(null)} onDone={() => qc.invalidateQueries({ queryKey: ["prefeitura"] })} /> : null}
    </div>
  );
}

function NovaFolha({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [competencia, setCompetencia] = useState("");
  const [dataCorte, setDataCorte] = useState("");
  const [dataRepasse, setDataRepasse] = useState("");
  const save = useMutation({
    mutationFn: () => atlas.prefeitura.abrirFolha({ competencia, dataCorte, ...(dataRepasse ? { dataRepasse } : {}) }),
    onSuccess: onSaved,
  });
  return (
    <Modal title="Abrir competência de folha" onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <Field lbl="Competência (AAAAMM)" hint="ex.: 202608"><input style={inp} value={competencia} onChange={(e) => setCompetencia(e.target.value)} placeholder="202608" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field lbl="Data de corte"><input type="date" style={inp} value={dataCorte} onChange={(e) => setDataCorte(e.target.value)} /></Field>
          <Field lbl="Data de repasse"><input type="date" style={inp} value={dataRepasse} onChange={(e) => setDataRepasse(e.target.value)} /></Field>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !competencia || !dataCorte}>{save.isPending ? "Abrindo…" : "Abrir folha"}</Button>
      </div>
      {save.isError ? <p style={{ color: "#ef4444", marginTop: 12, fontSize: 13 }}>{(save.error as Error).message}</p> : null}
    </Modal>
  );
}

function MovModal({ folha, onClose, onDone }: { folha: FolhaRow; onClose: () => void; onDone: () => void }) {
  const movs = useQuery({ queryKey: ["prefeitura", "movimentacoes", folha.id], queryFn: () => atlas.prefeitura.movimentacoes(folha.id) });
  return (
    <Modal title={`Movimentação — folha ${folha.competencia}`} onClose={onClose} maxWidth={720}>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>Envie admissões, demissões, aposentadorias, promoções e alterações de cargo/salário. As mudanças recalculam a margem automaticamente.</p>
      <CsvImportPanel
        title="Enviar movimentação (CSV)"
        columnsHint="tipo (admissao/demissao/aposentadoria/promocao/alteracao), matricula, cpf, nome, cargoNovo, salarioNovo, detalhe"
        templateUrl={atlas.prefeitura.movimentacaoCsvTemplateUrl()}
        onImport={(csv) => atlas.prefeitura.enviarMovimentacao(folha.id, csv)}
        onImported={() => { onDone(); movs.refetch(); }}
      />
      <div style={{ marginTop: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase" }}>Movimentações registradas ({movs.data?.movimentacoes.length ?? 0})</span>
        <div style={{ marginTop: 8, display: "grid", gap: 6, maxHeight: 220, overflow: "auto" }}>
          {(movs.data?.movimentacoes ?? []).map((m) => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 10px", background: "var(--bg-elev-2)", borderRadius: 8, fontSize: 12 }}>
              <Pill variant="aceita">{m.tipo}</Pill>
              <span style={{ fontFamily: "var(--font-mono)" }}>{m.matricula}</span>
              <span style={{ color: "var(--text-muted)", flex: 1 }}>{m.detalhe}</span>
            </div>
          ))}
          {(movs.data?.movimentacoes.length ?? 0) === 0 ? <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Nenhuma movimentação ainda.</span> : null}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}><Button variant="ghost" onClick={onClose}>Fechar</Button></div>
    </Modal>
  );
}
