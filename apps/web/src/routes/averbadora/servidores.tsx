import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, FilterBar, IconButton, Pill, SelectField, TextField, CurrencyField, FormGrid, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { downloadCsv } from "../../lib/csv";
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

  const filtered = useMemo(
    () => (data.data?.servidores ?? []).filter((s) =>
      search ? `${s.nome} ${s.matricula} ${s.cpf} ${s.cpfMasked}`.toLowerCase().includes(search.toLowerCase()) : true,
    ),
    [data.data?.servidores, search],
  );

  const total = filtered.length;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  useEffect(() => { setPage(1); }, [search, prefId, pageSize]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pageStart = (pageSafe - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);

  const prefSelecionada = (prefeituras.data?.prefeituras ?? []).find((p) => String(p.id) === prefId);
  const podeImportar = !!prefSelecionada;

  // Colunas do CSV exemplo: cpf, matricula, nome, dataAdmissao, dataNascimento,
  // vinculo, situacaoFuncional, salarioLiquido, idConvenio, cargo, endereco,
  // email, telefone, codigoIbge. Todas visiveis aqui pra o operador conferir o
  // import por linha (tabela horizontal com scroll).
  const columns: Column<AdminServidor>[] = [
    { key: "nome", header: "Nome" },
    { key: "matricula", header: "Matrícula", mono: true },
    { key: "cpf", header: "CPF", mono: true, render: (s) => fmtCpf(s.cpf) },
    { key: "cargo", header: "Cargo", render: (s) => s.cargo || <span style={{ color: "var(--text-dim)" }}>—</span> },
    { key: "origem", header: "Origem" },
    { key: "vinculo", header: "Vínculo" },
    { key: "situacaoFuncional", header: "Situação funcional", render: (s) => s.situacaoFuncional || <span style={{ color: "var(--text-dim)" }}>—</span> },
    { key: "salarioLiquido", header: "Salário líq.", align: "right", render: (s) => s.salarioLiquido > 0 ? fmtBRL(s.salarioLiquido) : <span style={{ color: "var(--danger-500)" }}>R$ 0,00</span> },
    { key: "idConvenio", header: "Convênio", mono: true, render: (s) => s.idConvenio || <span style={{ color: "var(--text-dim)" }}>—</span> },
    { key: "email", header: "E-mail", render: (s) => s.email || <span style={{ color: "var(--text-dim)" }}>—</span> },
    { key: "telefone", header: "Telefone", render: (s) => s.telefone || <span style={{ color: "var(--text-dim)" }}>—</span> },
    { key: "dataAdmissao", header: "Admissão", render: (s) => s.dataAdmissao || <span style={{ color: "var(--text-dim)" }}>—</span> },
    { key: "dataNascimento", header: "Nascimento", render: (s) => s.dataNascimento || <span style={{ color: "var(--text-dim)" }}>—</span> },
    { key: "endereco", header: "Endereço", render: (s) => s.endereco || <span style={{ color: "var(--text-dim)" }}>—</span> },
    { key: "codigoIbge", header: "IBGE", mono: true, render: (s) => s.codigoIbge ? String(s.codigoIbge) : <span style={{ color: "var(--text-dim)" }}>—</span> },
    { key: "status", header: "Status", render: (s) => <Pill variant={s.status === "ativo" ? "averbado" : s.status === "bloqueado" ? "rejeitada" : "expirado"}>{s.status}</Pill> },
    { key: "acoes", header: "", render: (s) => <IconButton title="Editar" onClick={() => setEditing(s)}>✎</IconButton> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Averbadora
        </span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Servidores</h1>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {data.isLoading ? "Carregando…" : (
              <>
                <b style={{ color: "var(--text)" }}>{total.toLocaleString("pt-BR")}</b>
                {" "}servidor{total === 1 ? "" : "es"}
                {search || prefId ? " (filtrado)" : ""}
              </>
            )}
          </span>
        </div>
      </header>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        onReset={() => {
          setSearch("");
          setPrefId("");
        }}
        onExport={() =>
          downloadCsv(
            "servidores.csv",
            filtered.map((s) => ({
              nome: s.nome,
              cpf: s.cpf,
              matricula: s.matricula,
              cargo: s.cargo ?? "",
              origem: s.origem,
              vinculo: s.vinculo,
              situacaoFuncional: s.situacaoFuncional,
              salarioLiquido: s.salarioLiquido,
              status: s.status,
              email: s.email ?? "",
              telefone: s.telefone ?? "",
              idConvenio: s.idConvenio,
            })),
          )
        }
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

      <DataTable columns={columns} rows={pageRows} rowKey={(s) => String(s.id)} loading={data.isLoading} />

      {total > 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            padding: "10px 14px",
            background: "var(--bg-elev-1)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            fontSize: 13,
          }}
        >
          <div style={{ color: "var(--text-muted)" }}>
            Mostrando <b style={{ color: "var(--text)" }}>{pageStart + 1}</b>–
            <b style={{ color: "var(--text)" }}>{Math.min(pageStart + pageSize, total)}</b>
            {" "}de <b style={{ color: "var(--text)" }}>{total.toLocaleString("pt-BR")}</b>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ color: "var(--text-muted)", fontSize: 12 }}>
              Por página:
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                style={{
                  marginLeft: 6, padding: "4px 8px", borderRadius: 6,
                  background: "var(--surface)", color: "var(--text)",
                  border: "1px solid var(--border-strong)", fontSize: 12,
                }}
              >
                {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <Button size="sm" variant="ghost" onClick={() => setPage(1)} disabled={pageSafe <= 1}>«</Button>
            <Button size="sm" variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageSafe <= 1}>‹ Anterior</Button>
            <span style={{ color: "var(--text-muted)", fontSize: 12, minWidth: 90, textAlign: "center" }}>
              Página <b style={{ color: "var(--text)" }}>{pageSafe}</b> de <b style={{ color: "var(--text)" }}>{totalPages}</b>
            </span>
            <Button size="sm" variant="ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageSafe >= totalPages}>Próxima ›</Button>
            <Button size="sm" variant="ghost" onClick={() => setPage(totalPages)} disabled={pageSafe >= totalPages}>»</Button>
          </div>
        </div>
      ) : null}

      {importOpen && prefSelecionada ? (
        <ImportModal
          prefeituraId={prefSelecionada.id}
          prefeituraNome={`${prefSelecionada.nome}/${prefSelecionada.uf}`}
          onClose={() => setImportOpen(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["admin", "servidores"] });
            // Fecha o modal apos import bem sucedido — usuario nao precisa
            // clicar em Fechar. Se houver erros, deixa aberto pra revisar.
            setImportOpen(false);
          }}
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

  const cpfDigits = cpf.replace(/\D/g, "");
  const cpfValido = cpfDigits.length === 11;
  const cpfMudou = cpfDigits !== servidor.cpf;

  // Regra do cliente: a averbadora NAO pode editar a senha do servidor.
  // A alteracao de senha e' exclusiva do proprio servidor (via
  // /servidor/conta -> Redefinir senha, com verificacao por e-mail).
  const save = useMutation({
    mutationFn: () => {
      const body: AdminServidorUpdate = {
        nome, vinculo, situacaoFuncional: situacao, salarioLiquido: salario,
        idConvenio, status, email, telefone,
      };
      if (cpfMudou && cpfValido) body.cpf = cpfDigits;
      return atlas.admin.updateServidor(servidor.matricula, body);
    },
    onSuccess: () => { onSaved(); },
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
          </FormGrid>
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-dim)" }}>
            A senha do servidor não é editável por aqui — apenas o próprio servidor pode alterar, em <b>Conta → Redefinir senha</b>, com verificação por e-mail.
          </div>
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

const SERVIDORES_HEADERS = [
  "cpf", "matricula", "nome", "dataAdmissao", "dataNascimento",
  "vinculo", "situacaoFuncional", "salarioLiquido", "idConvenio",
  "cargo", "endereco", "email", "telefone", "codigoIbge",
];

function detectHeaderMismatch(csv: string): { compat: boolean; found: string[] } {
  const firstLine = csv.split(/\r?\n/, 1)[0]?.trim() ?? "";
  const found = firstLine.split(/[,;\t]/).map((h) => h.replace(/^"|"$/g, "").trim());
  const compat = SERVIDORES_HEADERS.every((h) => found.includes(h)) && found.length > 0;
  return { compat, found };
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
  const [mismatch, setMismatch] = useState<{ found: string[] } | null>(null);
  const [aiResult, setAiResult] = useState<{ csv: string; mapping: Record<string, string>; summary: string; usage: { input: number; output: number } } | null>(null);

  const aiStatus = useQuery({ queryKey: ["admin", "ai", "config"], queryFn: () => atlas.admin.aiConfig() });

  const importMut = useMutation({
    mutationFn: (csv: string) => atlas.admin.importCsv("servidores", csv, { prefeituraId }),
    onSuccess: (r) => {
      setResult(r);
      // Fecha o modal quando o import foi 100% sucesso (algo entrou e nenhum
      // erro). Se ha erros, mantem aberto pra o operador ler as linhas que
      // falharam antes de fechar manualmente.
      if (r.inserted + r.updated > 0 && r.errors.length === 0) onSuccess();
    },
  });

  const aiNormalize = useMutation({
    mutationFn: (csv: string) =>
      atlas.admin.aiNormalizeCsv({
        csv,
        expectedHeaders: SERVIDORES_HEADERS,
        contextHint: "base de servidores publicos municipais para credito consignado",
      }),
    onSuccess: (r) => setAiResult(r),
  });

  function checkAndMaybeImport(text: string) {
    setPasted(text);
    setAiResult(null);
    const { compat, found } = detectHeaderMismatch(text);
    if (compat) {
      setMismatch(null);
      importMut.mutate(text);
    } else {
      setMismatch({ found });
    }
  }

  async function onFile(file: File) {
    const text = await file.text();
    checkAndMaybeImport(text);
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
            placeholder="cpf,matrícula,nome,..."
            style={{ width: "100%", marginTop: 6, padding: 10, fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border-strong)", borderRadius: 8 }}
          />
          <Button size="sm" onClick={() => checkAndMaybeImport(pasted)} disabled={importMut.isPending || !pasted.trim()} style={{ marginTop: 8 }}>
            {importMut.isPending ? "Importando…" : "Importar texto colado"}
          </Button>
        </details>

        {mismatch ? (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 10,
              border: "1px solid var(--gold-500)",
              background: "color-mix(in srgb, var(--gold-500) 10%, transparent)",
              fontSize: 13,
            }}
          >
            <b>Cabeçalhos não batem com o modelo.</b>
            <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>
              Encontrado: <code style={{ fontFamily: "var(--font-mono)" }}>{mismatch.found.slice(0, 8).join(", ")}{mismatch.found.length > 8 ? "…" : ""}</code>
            </div>
            {aiStatus.data?.hasKey ? (
              <>
                <p style={{ margin: "8px 0", color: "var(--text-muted)" }}>
                  Posso pedir pra IA transformar esse arquivo no formato esperado antes de importar.
                </p>
                <Button size="sm" onClick={() => aiNormalize.mutate(pasted)} disabled={aiNormalize.isPending || !pasted.trim()}>
                  {aiNormalize.isPending ? "IA processando…" : "✧ Normalizar com IA"}
                </Button>
                {aiNormalize.isError ? (
                  <div style={{ marginTop: 8, color: "var(--danger-500)", fontSize: 12 }}>
                    {(aiNormalize.error as Error).message}
                  </div>
                ) : null}
              </>
            ) : (
              <p style={{ margin: "8px 0 0", color: "var(--text-muted)" }}>
                Configure a chave da OpenAI em <a href="/averbadora/ia" style={{ color: "var(--accent)" }}>IA</a> pra
                deixar a IA tentar normalizar automaticamente.
              </p>
            )}
          </div>
        ) : null}

        {aiResult ? (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 10,
              border: "1px solid var(--emerald-500)",
              background: "color-mix(in srgb, var(--emerald-500) 10%, transparent)",
              fontSize: 13,
            }}
          >
            <b>✧ IA normalizou o arquivo.</b>
            <div style={{ marginTop: 6, color: "var(--text-muted)" }}>{aiResult.summary}</div>
            {Object.keys(aiResult.mapping).length > 0 ? (
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--text-muted)" }}>
                  Ver mapeamento ({Object.keys(aiResult.mapping).length} colunas)
                </summary>
                <div style={{ marginTop: 6, fontSize: 12, fontFamily: "var(--font-mono)" }}>
                  {Object.entries(aiResult.mapping).map(([orig, alvo]) => (
                    <div key={orig}>{orig} → {alvo}</div>
                  ))}
                </div>
              </details>
            ) : null}
            <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-dim)" }}>
              Tokens usados: {aiResult.usage.input + aiResult.usage.output} ({aiResult.usage.input} in / {aiResult.usage.output} out)
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <Button size="sm" onClick={() => { setMismatch(null); setPasted(aiResult.csv); importMut.mutate(aiResult.csv); }} disabled={importMut.isPending}>
                {importMut.isPending ? "Importando…" : "Importar CSV normalizado"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAiResult(null)}>Descartar</Button>
            </div>
          </div>
        ) : null}

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
const modal: React.CSSProperties = { background: "var(--surface-solid)", borderRadius: 12, padding: 24, maxWidth: 600, width: "100%", border: "1px solid var(--border-strong)", boxShadow: "var(--shadow-lg)" };
