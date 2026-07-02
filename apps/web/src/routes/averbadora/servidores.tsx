import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, FilterBar, IconButton, Pill, SelectField, TextField, CurrencyField, FormGrid, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { AdminServidor, AdminServidorUpdate, CsvImportOutcome } from "@atlas/sdk";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const fmtCpf = (cpf: string) => {
  const d = (cpf ?? "").replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : (cpf || "—");
};

export function AdminServidores() {
  const qc = useQueryClient();
  const prefeituras = useQuery({ queryKey: ["admin", "prefeituras"], queryFn: () => atlas.admin.listPrefeituras() });
  const [prefId, setPrefId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<AdminServidor | null>(null);

  const data = useQuery({
    queryKey: ["admin", "servidores", prefId],
    queryFn: () => atlas.admin.listServidores(prefId ? { prefeitura_id: Number(prefId) } : undefined),
  });

  const filtered = (data.data?.servidores ?? []).filter((s) =>
    search ? `${s.nome} ${s.matricula} ${s.cpf} ${s.cpfMasked}`.toLowerCase().includes(search.toLowerCase()) : true,
  );

  const prefSelecionada = (prefeituras.data?.prefeituras ?? []).find((p) => String(p.id) === prefId);
  const podeImportar = !!prefSelecionada;

  const columns: Column<AdminServidor>[] = [
    { key: "nome", header: "Nome" },
    { key: "matricula", header: "Matrícula" },
    { key: "cpf", header: "CPF", mono: true, render: (s) => fmtCpf(s.cpf) },
    { key: "cargo", header: "Cargo", render: (s) => s.cargo || "—" },
    { key: "origem", header: "Origem" },
    { key: "vinculo", header: "Vínculo" },
    { key: "situacaoFuncional", header: "Situação funcional" },
    { key: "salarioLiquido", header: "Salário líq.", align: "right", render: (s) => fmtBRL(s.salarioLiquido) },
    { key: "status", header: "Status", render: (s) => <Pill variant={s.status === "ativo" ? "averbado" : s.status === "bloqueado" ? "rejeitada" : "expirado"}>{s.status}</Pill> },
    { key: "acoes", header: "", render: (s) => <IconButton title="Editar" onClick={() => setEditing(s)}>✎</IconButton> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Averbadora
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Servidores</h1>
      </header>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        onReset={() => {
          setSearch("");
          setPrefId("");
        }}
        onExport={() => alert("Export CSV — substitua pela rota /v1/admin/servidores/export quando disponível.")}
        actions={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <a href={atlas.admin.csvTemplateUrl("servidores")} download style={{ textDecoration: "none" }}>
              <Button size="sm" variant="ghost">↓ Baixar exemplo</Button>
            </a>
            <Button
              size="sm"
              onClick={() => setImportOpen(true)}
              disabled={!podeImportar}
              title={podeImportar ? `Importar para ${prefSelecionada.nome}` : "Selecione uma prefeitura antes de importar"}
            >
              ↑ Importar CSV
            </Button>
            {!podeImportar ? (
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Selecione uma prefeitura para habilitar importação
              </span>
            ) : null}
          </div>
        }
      >
        <div style={{ maxWidth: 320 }}>
          <SelectField
            label="Prefeitura"
            value={prefId}
            onChange={(e) => setPrefId(e.target.value)}
            options={[{ value: "", label: "Todas" }, ...((prefeituras.data?.prefeituras ?? []).map((p) => ({ value: String(p.id), label: `${p.nome}/${p.uf}` })))]}
          />
        </div>
      </FilterBar>

      <DataTable columns={columns} rows={filtered} rowKey={(s) => String(s.id)} loading={data.isLoading} />

      {importOpen && prefSelecionada ? (
        <ImportModal
          prefeituraId={prefSelecionada.id}
          prefeituraNome={`${prefSelecionada.nome}/${prefSelecionada.uf}`}
          onClose={() => setImportOpen(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ["admin", "servidores"] })}
        />
      ) : null}

      {editing ? (
        <EditModal
          servidor={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["admin", "servidores"] }); }}
        />
      ) : null}
    </div>
  );
}

function EditModal({ servidor, onClose, onSaved }: { servidor: AdminServidor; onClose: () => void; onSaved: () => void }) {
  const [nome, setNome] = useState(servidor.nome);
  const [vinculo, setVinculo] = useState<AdminServidorUpdate["vinculo"]>(
    (["CLT", "ESTATUTARIO", "COMISSIONADO"].includes(servidor.vinculo) ? servidor.vinculo : "ESTATUTARIO") as AdminServidorUpdate["vinculo"],
  );
  const [situacao, setSituacao] = useState(servidor.situacaoFuncional);
  const [salario, setSalario] = useState<number>(servidor.salarioLiquido);
  const [idConvenio, setIdConvenio] = useState(servidor.idConvenio);
  const [status, setStatus] = useState<AdminServidor["status"]>(servidor.status);
  const [email, setEmail] = useState(servidor.email);
  const [telefone, setTelefone] = useState(servidor.telefone);
  const [cpf, setCpf] = useState(servidor.cpf);
  const [password, setPassword] = useState("");

  const cpfDigits = cpf.replace(/\D/g, "");
  const cpfValido = cpfDigits.length === 11;
  const cpfMudou = cpfDigits !== servidor.cpf;

  const save = useMutation({
    mutationFn: () => {
      const body: AdminServidorUpdate = {
        nome, vinculo, situacaoFuncional: situacao, salarioLiquido: salario,
        idConvenio, status, email, telefone,
      };
      if (cpfMudou && cpfValido) body.cpf = cpfDigits;
      if (password.trim()) body.password = password;
      return atlas.admin.updateServidor(servidor.matricula, body);
    },
    onSuccess: () => { setPassword(""); onSaved(); },
  });

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Editar servidor</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: -4 }}>
          Matrícula <b style={{ fontFamily: "var(--font-mono)" }}>{servidor.matricula}</b> · {servidor.origem}
        </p>

        <FormGrid>
          <TextField label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          <TextField
            label="CPF (login do servidor)"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            inputMode="numeric"
            maxLength={14}
            hint={cpf && !cpfValido ? undefined : "11 dígitos · usado como login"}
            error={cpf && !cpfValido ? "CPF deve ter 11 dígitos" : undefined}
          />
          <SelectField
            label="Vínculo"
            value={vinculo}
            onChange={(e) => setVinculo(e.target.value as AdminServidorUpdate["vinculo"])}
            options={[{ value: "ESTATUTARIO", label: "Estatutário" }, { value: "CLT", label: "CLT" }, { value: "COMISSIONADO", label: "Comissionado" }]}
          />
          <TextField label="Situação funcional" value={situacao} onChange={(e) => setSituacao(e.target.value)} />
          <CurrencyField label="Salário líquido" value={salario} onValueChange={(n) => setSalario(n ?? 0)} />
          <TextField label="Convênio (id)" value={idConvenio} onChange={(e) => setIdConvenio(e.target.value)} />
          <SelectField
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as AdminServidor["status"])}
            options={[{ value: "ativo", label: "Ativo" }, { value: "bloqueado", label: "Bloqueado" }, { value: "arquivado", label: "Arquivado" }]}
          />
        </FormGrid>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 12 }}>
            Contato e acesso
          </div>
          <FormGrid>
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="servidor@exemplo.com" />
            <TextField label="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(48) 99999-0000" />
            <TextField
              label={servidor.hasPassword ? "Nova senha (deixe em branco para manter)" : "Definir senha"}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={servidor.hasPassword ? "••••••••" : "mínimo 6 caracteres"}
              autoComplete="new-password"
            />
          </FormGrid>
        </div>

        {save.isError ? <p style={{ color: "var(--danger-500)", fontSize: 13, marginTop: 12 }}>{(save.error as Error).message}</p> : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !nome.trim() || !cpfValido}>
            {save.isPending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ImportModal({
  prefeituraId,
  prefeituraNome,
  onClose,
  onSuccess,
}: {
  prefeituraId: number;
  prefeituraNome: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [pasted, setPasted] = useState("");
  const [result, setResult] = useState<CsvImportOutcome | null>(null);
  const importMut = useMutation({
    mutationFn: (csv: string) => atlas.admin.importCsv("servidores", csv, { prefeituraId }),
    onSuccess: (r) => {
      setResult(r);
      if (r.inserted + r.updated > 0) onSuccess();
    },
  });

  async function onFile(file: File) {
    const text = await file.text();
    setPasted(text);
    importMut.mutate(text);
  }

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Importar servidores</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
          Os servidores importados serão vinculados à prefeitura{" "}
          <b style={{ color: "var(--accent)" }}>{prefeituraNome}</b>.
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: -4 }}>
          <b>Obrigatórios:</b> cpf, matricula, nome, vinculo, situacaoFuncional, salarioLiquido.
          <br />
          <b>Opcionais:</b> dataAdmissao, dataNascimento, idConvenio (usa padrão da prefeitura se vazio), cargo, endereco, email, telefone, codigoIbge.
        </p>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
          style={{ fontSize: 13, marginTop: 4 }}
        />

        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--text-muted)" }}>
            Ou cole o conteúdo CSV manualmente
          </summary>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={6}
            placeholder="cpf,matricula,nome,..."
            style={{ width: "100%", marginTop: 6, padding: 10, fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border-strong)", borderRadius: 8 }}
          />
          <Button size="sm" onClick={() => importMut.mutate(pasted)} disabled={importMut.isPending || !pasted.trim()} style={{ marginTop: 8 }}>
            {importMut.isPending ? "Importando…" : "Importar texto colado"}
          </Button>
        </details>

        {importMut.isError ? (
          <p style={{ color: "var(--danger-500)", fontSize: 13, marginTop: 12 }}>{(importMut.error as Error).message}</p>
        ) : null}

        {result ? (
          <div style={{ marginTop: 14, padding: 12, background: "var(--bg-elev-2)", borderRadius: 8, fontSize: 13 }}>
            <div>
              <b>{result.inserted}</b> inseridos · <b>{result.updated}</b> atualizados
              {result.errors.length > 0 ? <> · <span style={{ color: "var(--danger-500)" }}>{result.errors.length} erros</span></> : null}
            </div>
            {result.errors.length > 0 ? (
              <ul style={{ marginTop: 8, paddingLeft: 16, color: "var(--danger-500)", fontSize: 12 }}>
                {result.errors.slice(0, 8).map((er, i) => (
                  <li key={i}>Linha {er.line}: {er.message}</li>
                ))}
                {result.errors.length > 8 ? <li>… e mais {result.errors.length - 8} erros</li> : null}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
}

const backdrop: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 100, padding: 24 };
const modal: React.CSSProperties = { background: "var(--surface)", borderRadius: 12, padding: 24, maxWidth: 600, width: "100%", border: "1px solid var(--border)" };
