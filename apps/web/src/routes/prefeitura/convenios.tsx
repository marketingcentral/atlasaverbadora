import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { BackLink, Modal, Field, inp, selStyle } from "./_ui";

const VINCULOS = ["CLT", "ESTATUTARIO", "COMISSIONADO", "APOSENTADO", "PENSIONISTA"];
const FORMATOS = ["CSV", "EXCEL", "API"];

interface ConvRow { id: string; nome: string; bancoNome: string; codigoVerba: string; prazoTravaHoras: number; prazoPortabilidadeDU: number; prefixo: string; formatoImportacao: string }

function ExigenciasAverbacaoCard() {
  const qc = useQueryClient();
  const cfg = useQuery({ queryKey: ["prefeitura", "config"], queryFn: () => atlas.prefeitura.getConfig() });
  const save = useMutation({
    mutationFn: (patch: { exigeCcb?: boolean; exigeBanco2FA?: boolean }) => atlas.prefeitura.setConfig(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prefeitura", "config"] }),
  });
  const exigeCcb = cfg.data?.exigeCcb ?? false;
  const exige2fa = cfg.data?.exigeBanco2FA ?? false;
  return (
    <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <b>Exigências ao banco na averbação</b>
        <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "4px 0 0" }}>
          Defina se os bancos precisam anexar a CCB e/ou fazer verificação em duas etapas ao averbar contratos desta prefeitura.
        </p>
      </div>
      <Toggle label="Exigir anexo da CCB" hint="Banco precisa anexar a Cédula de Crédito Bancário (PDF) para averbar." checked={exigeCcb} disabled={cfg.isLoading || save.isPending} onChange={(v) => save.mutate({ exigeCcb: v })} />
      <Toggle label="Exigir verificação em duas etapas (2FA)" hint="Banco confirma a averbação com um código enviado por e-mail." checked={exige2fa} disabled={cfg.isLoading || save.isPending} onChange={(v) => save.mutate({ exigeBanco2FA: v })} />
    </div>
  );
}

function Toggle({ label, hint, checked, disabled, onChange }: { label: string; hint: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: disabled ? "default" : "pointer" }}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18, accentColor: "var(--accent)" }} />
      <span>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>{hint}</span>
      </span>
    </label>
  );
}

export function PrefeituraConvenios() {
  const qc = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["prefeitura", "convenios"], queryFn: () => atlas.prefeitura.convenios() });

  const columns: Column<ConvRow>[] = [
    { key: "id", header: "ID", mono: true },
    { key: "nome", header: "Convênio" },
    { key: "bancoNome", header: "Banco" },
    { key: "prefixo", header: "Prefixo", render: (c) => c.prefixo || "—" },
    { key: "prazoTravaHoras", header: "Trava", render: (c) => `${c.prazoTravaHoras}h` },
    { key: "prazoPortabilidadeDU", header: "Portab.", render: (c) => `${c.prazoPortabilidadeDU} DU` },
    { key: "formatoImportacao", header: "Importação" },
    {
      key: "acoes",
      header: "",
      align: "right",
      render: (c) => (
        <Button size="sm" variant="ghost" onClick={() => setEditId(c.id)}>⚙ Configurar</Button>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackLink fallback="/prefeitura/comunicados" />
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>Prefeitura</span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Convênios do município</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 4 }}>Parametrize prazo de trava, vínculos aceitos, comprometimento máximo e prefixo de origem.</p>
      </header>
      <ExigenciasAverbacaoCard />
      <DataTable columns={columns} rows={(q.data?.convenios ?? []) as ConvRow[]} rowKey={(c) => c.id} loading={q.isLoading} emptyState="Nenhum convênio." />
      {editId ? <ConfigModal id={editId} onClose={() => setEditId(null)} onSaved={() => { setEditId(null); qc.invalidateQueries({ queryKey: ["prefeitura", "convenios"] }); }} /> : null}
    </div>
  );
}

function ConfigModal({ id, onClose, onSaved }: { id: string; onClose: () => void; onSaved: () => void }) {
  const cfg = useQuery({ queryKey: ["prefeitura", "convenio-config", id], queryFn: () => atlas.prefeitura.convenioConfig(id) });
  const [form, setForm] = useState<null | { prazoTravaHoras: number; prazoPortabilidadeDU: number; maxComprometimentoPct: number; vinculosAceitos: string[]; formatoImportacao: string; regrasEspeciais: string; prefixo: string }>(null);
  const f = form ?? cfg.data?.config ?? null;

  const save = useMutation({
    mutationFn: () => atlas.prefeitura.salvarConvenioConfig(id, f!),
    onSuccess: onSaved,
  });

  function upd(patch: Partial<NonNullable<typeof f>>) { setForm({ ...(f as NonNullable<typeof f>), ...patch }); }

  return (
    <Modal title={`Config do convênio — ${id}`} onClose={onClose} maxWidth={620}>
      {!f ? <p style={{ color: "var(--text-muted)" }}>Carregando…</p> : (
        <>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Field lbl="Trava (horas)" hint="padrão 48"><input type="number" style={inp} value={f.prazoTravaHoras} onChange={(e) => upd({ prazoTravaHoras: Number(e.target.value) })} /></Field>
              <Field lbl="Portabilidade (DU)" hint="dias úteis (7)"><input type="number" style={inp} value={f.prazoPortabilidadeDU} onChange={(e) => upd({ prazoPortabilidadeDU: Number(e.target.value) })} /></Field>
              <Field lbl="Max. comprom. (%)" hint="ex.: 35"><input type="number" style={inp} value={Math.round(f.maxComprometimentoPct * 100)} onChange={(e) => upd({ maxComprometimentoPct: Number(e.target.value) / 100 })} /></Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field lbl="Prefixo (origem)" hint="ex.: PLH, GRU, SP"><input style={inp} value={f.prefixo} onChange={(e) => upd({ prefixo: e.target.value.toUpperCase() })} maxLength={5} /></Field>
              <Field lbl="Formato de importação">
                <select style={selStyle} value={f.formatoImportacao} onChange={(e) => upd({ formatoImportacao: e.target.value })}>{FORMATOS.map((x) => <option key={x} value={x}>{x}</option>)}</select>
              </Field>
            </div>
            <Field lbl="Vínculos aceitos">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: 10, background: "var(--bg-elev-2)", borderRadius: 8 }}>
                {VINCULOS.map((v) => (
                  <label key={v} style={{ display: "flex", gap: 6, fontSize: 13, cursor: "pointer" }}>
                    <input type="checkbox" checked={f.vinculosAceitos.includes(v)} onChange={(e) => upd({ vinculosAceitos: e.target.checked ? [...f.vinculosAceitos, v] : f.vinculosAceitos.filter((x) => x !== v) })} />
                    {v}
                  </label>
                ))}
              </div>
            </Field>
            <Field lbl="Regras especiais"><textarea rows={3} style={{ ...inp, fontFamily: "inherit" }} value={f.regrasEspeciais} onChange={(e) => upd({ regrasEspeciais: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || f.vinculosAceitos.length === 0 || f.prefixo.length < 2}>{save.isPending ? "Salvando…" : "Salvar config"}</Button>
          </div>
          {save.isError ? <p style={{ color: "var(--danger-500)", marginTop: 12, fontSize: 13 }}>{(save.error as Error).message}</p> : null}
        </>
      )}
    </Modal>
  );
}
