import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, CsvImportPanel, DataTable, FilterBar, IconButton, Pill, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { PrefeituraServidor } from "@atlas/sdk";
import { Modal, Field, inp, selStyle } from "./_ui";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const VINCULOS = ["CLT", "ESTATUTARIO", "COMISSIONADO", "APOSENTADO", "PENSIONISTA"];

export function PrefeituraServidores() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<PrefeituraServidor | null>(null);
  const q = useQuery({ queryKey: ["prefeitura", "servidores"], queryFn: () => atlas.prefeitura.servidores() });

  const filtered = (q.data?.servidores ?? []).filter((s) =>
    search ? `${s.nome} ${s.matricula} ${s.cpfMasked} ${s.cargo ?? ""}`.toLowerCase().includes(search.toLowerCase()) : true,
  );

  const columns: Column<PrefeituraServidor>[] = [
    { key: "nome", header: "Nome" },
    { key: "matricula", header: "Matrícula", mono: true },
    { key: "cargo", header: "Cargo", render: (s) => s.cargo || "—" },
    { key: "vinculo", header: "Vínculo" },
    { key: "situacaoFuncional", header: "Situação", render: (s) => <Pill variant={/desligado|aposentad/i.test(s.situacaoFuncional) ? "expirado" : "averbado"}>{s.situacaoFuncional}</Pill> },
    { key: "idConvenio", header: "Convênio", render: (s) => s.idConvenio || <span style={{ color: "var(--danger-500)" }}>sem convênio</span> },
    { key: "margemDisponivel", header: "Margem disp.", align: "right", render: (s) => fmtBRL(s.margemDisponivel ?? 0) },
    { key: "acoes", header: "", render: (s) => <IconButton onClick={() => setEditing(s)}>Editar</IconButton> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>Prefeitura</span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Servidores do município</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 4 }}>A prefeitura é a fonte da base. Campos críticos (cargo, endereço, matrícula) só a prefeitura edita.</p>
        </div>
        <Button onClick={() => setImportOpen((o) => !o)}>{importOpen ? "Fechar importação" : "+ Importar base (CSV)"}</Button>
      </header>

      {importOpen ? (
        <CsvImportPanel
          title="Importar base de servidores"
          columnsHint="nome, cpf, email, telefone, matricula, cargo, vinculo, endereco, codigoIbge, salarioLiquido, idConvenio"
          templateUrl={atlas.prefeitura.servidoresCsvTemplateUrl()}
          onImport={(csv) => atlas.prefeitura.importarServidores(csv)}
          onImported={() => { qc.invalidateQueries({ queryKey: ["prefeitura"] }); }}
        />
      ) : null}

      <FilterBar searchValue={search} onSearchChange={setSearch} onReset={() => setSearch("")} />
      <DataTable columns={columns} rows={filtered} rowKey={(s) => s.matricula} loading={q.isLoading} emptyState="Nenhum servidor. Importe a base via CSV." />

      {editing ? <EditModal servidor={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["prefeitura"] }); }} /> : null}
    </div>
  );
}

function EditModal({ servidor, onClose, onSaved }: { servidor: PrefeituraServidor; onClose: () => void; onSaved: () => void }) {
  const [nome, setNome] = useState(servidor.nome);
  const [cargo, setCargo] = useState(servidor.cargo ?? "");
  const [endereco, setEndereco] = useState(servidor.endereco ?? "");
  const [matriculaNova, setMatriculaNova] = useState(servidor.matricula);
  const [vinculo, setVinculo] = useState(servidor.vinculo);
  const [email, setEmail] = useState(servidor.email ?? "");
  const [telefone, setTelefone] = useState(servidor.telefone ?? "");

  const save = useMutation({
    mutationFn: () => atlas.prefeitura.editarServidor(servidor.matricula, {
      nome, cargo, endereco, vinculo, email, telefone,
      ...(matriculaNova !== servidor.matricula ? { matriculaNova } : {}),
    }),
    onSuccess: onSaved,
  });

  return (
    <Modal title={`Editar servidor — ${servidor.matricula}`} onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <Field lbl="Nome"><input style={inp} value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field lbl="Cargo"><input style={inp} value={cargo} onChange={(e) => setCargo(e.target.value)} /></Field>
          <Field lbl="Vínculo">
            <select style={selStyle} value={vinculo} onChange={(e) => setVinculo(e.target.value)}>{VINCULOS.map((v) => <option key={v} value={v}>{v}</option>)}</select>
          </Field>
        </div>
        <Field lbl="Endereço"><input style={inp} value={endereco} onChange={(e) => setEndereco(e.target.value)} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field lbl="Matrícula" hint="Alterar remapeia o servidor"><input style={inp} value={matriculaNova} onChange={(e) => setMatriculaNova(e.target.value)} /></Field>
          <Field lbl="Telefone"><input style={inp} value={telefone} onChange={(e) => setTelefone(e.target.value)} /></Field>
        </div>
        <Field lbl="E-mail"><input style={inp} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
      </div>
      {save.isError ? <p style={{ color: "var(--danger-500)", marginTop: 12, fontSize: 13 }}>{(save.error as Error).message}</p> : null}
    </Modal>
  );
}
