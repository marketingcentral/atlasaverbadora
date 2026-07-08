import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  CsvImportPanel,
  DataTable,
  FormActions,
  FormGrid,
  IconButton,
  NumberField,
  Pill,
  SelectField,
  TextField,
  type Column,
} from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { AdminPrefeitura, AdminPrefeituraInput } from "@atlas/sdk";
export function AdminPrefeituras() {
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ["admin", "prefeituras"], queryFn: () => atlas.admin.listPrefeituras() });
  const sync = useMutation({
    mutationFn: (id: number) => atlas.admin.sincronizarPrefeitura(id),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["admin", "prefeituras"] });
      const res = r.resultado;
      if (res.erro) alert(`Sincronizacao com aviso:\n${res.erro}`);
      else alert(`Sincronizado: ${res.novos} novos, ${res.atualizados} atualizados.`);
    },
    onError: (err) => alert(err instanceof Error ? err.message : "Falha ao sincronizar"),
  });
  // Nunca exclui — desativa/reativa (status). Reversível, sem perda de dados.
  const toggleAtivo = useMutation({
    mutationFn: (p: AdminPrefeitura) => atlas.admin.upsertPrefeitura({
      id: p.id, nome: p.nome, uf: p.uf, municipioIbge: p.municipioIbge,
      modoIntegracao: p.modoIntegracao, status: p.status === "inativo" ? "ativo" : "inativo",
      loginEmail: p.loginEmail, servidoresCount: p.servidoresCount,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "prefeituras"] }),
  });
  const [editing, setEditing] = useState<AdminPrefeitura | "new" | null>(null);

  const columns: Column<AdminPrefeitura>[] = [
    { key: "status", header: "Situação", render: (p) => <Pill variant={p.status === "ativo" ? "averbado" : p.status === "inativo" ? "expirado" : "pendente"}>{p.status}</Pill> },
    { key: "nome", header: "Prefeitura", render: (p) => `${p.nome}/${p.uf}` },
    { key: "modoIntegracao", header: "Integração" },
    {
      key: "acesso",
      header: "Acesso /login",
      render: (p) =>
        p.loginEmail && p.hasPassword ? (
          <span style={{ color: "var(--emerald-500)" }}>{p.loginEmail}</span>
        ) : p.loginEmail ? (
          <span style={{ color: "var(--danger-500)" }} title="Login cadastrado mas sem senha">{p.loginEmail} (sem senha)</span>
        ) : (
          <span style={{ color: "var(--text-dim)" }}>—</span>
        ),
    },
    { key: "servidoresCount", header: "Servidores", align: "right", render: (p) => p.servidoresCount.toLocaleString("pt-BR") },
    {
      key: "ultimaSincronizacao",
      header: "Última sync",
      render: (p) => (p.ultimaSincronizacao ? new Date(p.ultimaSincronizacao).toLocaleString("pt-BR") : "—"),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Averbadora
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Prefeituras afiliadas</h1>
        </div>
        <Button onClick={() => setEditing("new")}>+ Adicionar prefeitura</Button>
      </header>

      <CsvImportPanel
        title="Importar prefeituras"
        columnsHint="Colunas: nome, uf, municipioIbge, modoIntegracao (REST|SOAP|CSV|MANUAL), status, loginEmail, password (min 6)"
        templateUrl={atlas.admin.csvTemplateUrl("prefeituras")}
        onImport={async (csv) => atlas.admin.importCsv("prefeituras", csv)}
        onImported={() => qc.invalidateQueries({ queryKey: ["admin", "prefeituras"] })}
      />

      <DataTable
        columns={columns}
        rows={data.data?.prefeituras ?? []}
        rowKey={(p) => String(p.id)}
        loading={data.isLoading}
        actions={(p) => (
          <>
            <IconButton title="Editar" onClick={() => setEditing(p)}>✎</IconButton>
            <IconButton title="Sincronizar folha" onClick={() => sync.mutate(p.id)}>↻</IconButton>
            {p.status === "inativo" ? (
              <IconButton title="Reativar" onClick={() => toggleAtivo.mutate(p)}>▶</IconButton>
            ) : (
              <IconButton danger title="Desativar" onClick={() => { if (confirm(`Desativar a prefeitura "${p.nome}"?\n\nEla para de operar, mas os dados não são apagados — você pode reativar depois.`)) toggleAtivo.mutate(p); }}>⏸</IconButton>
            )}
          </>
        )}
      />

      {editing ? <PrefeituraModal initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function PrefeituraModal({ initial, onClose }: { initial: AdminPrefeitura | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<AdminPrefeituraInput>({
    id: initial?.id,
    nome: initial?.nome ?? "",
    uf: initial?.uf ?? "SC",
    municipioIbge: initial?.municipioIbge ?? 0,
    modoIntegracao: initial?.modoIntegracao ?? "REST",
    status: initial?.status ?? "ativo",
    loginEmail: initial?.loginEmail ?? "",
    contatoEmail: initial?.contatoEmail ?? "",
    password: "",
    servidoresCount: initial?.servidoresCount ?? 0,
    folhaSincUrl: initial?.folhaSincUrl ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => {
      const payload: AdminPrefeituraInput = { ...form };
      if (!payload.loginEmail) delete payload.loginEmail;
      if (!payload.contatoEmail) delete payload.contatoEmail;
      if (!payload.password) delete payload.password;
      if (!payload.folhaSincUrl) delete payload.folhaSincUrl;
      return atlas.admin.upsertPrefeitura(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "prefeituras"] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Erro ao salvar"),
  });

  const senhaHint = initial?.hasPassword
    ? "Deixe em branco para manter a senha atual."
    : "Mínimo 6 caracteres. Será enviada ao responsável da prefeitura.";

  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={modalCard}>
        <h3 style={{ margin: 0 }}>{initial ? `Editar ${initial.nome}/${initial.uf}` : "Nova prefeitura"}</h3>
        <FormGrid cols={2}>
          <TextField label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          <TextField label="UF" value={form.uf} maxLength={2} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} required />
          <NumberField label="Código IBGE" value={form.municipioIbge} onChange={(e) => setForm({ ...form, municipioIbge: Number(e.target.value) })} />
          <SelectField
            label="Modo de integração"
            value={form.modoIntegracao}
            onChange={(e) => setForm({ ...form, modoIntegracao: e.target.value as AdminPrefeituraInput["modoIntegracao"] })}
            options={[
              { value: "REST", label: "REST" },
              { value: "SOAP", label: "SOAP" },
              { value: "CSV", label: "CSV" },
              { value: "MANUAL", label: "MANUAL" },
            ]}
          />
          <TextField
            label="Login (email de acesso ao /login)"
            type="email"
            value={form.loginEmail ?? ""}
            onChange={(e) => setForm({ ...form, loginEmail: e.target.value })}
            placeholder="rh@prefeitura.gov.br"
          />
          <TextField
            label="Email de contato do responsável"
            type="email"
            value={form.contatoEmail ?? ""}
            onChange={(e) => setForm({ ...form, contatoEmail: e.target.value })}
            placeholder="responsavel@prefeitura.gov.br"
          />
          <TextField
            label={initial?.hasPassword ? "Nova senha (opcional)" : "Senha"}
            type="password"
            value={form.password ?? ""}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={initial?.hasPassword ? "••••••••" : "min. 6 caracteres"}
            hint={senhaHint}
          />
          <SelectField
            label="Situação"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as AdminPrefeituraInput["status"] })}
            options={[
              { value: "ativo", label: "Ativo" },
              { value: "pausado", label: "Pausado" },
            ]}
          />
          <NumberField label="Servidores cadastrados" value={form.servidoresCount} onChange={(e) => setForm({ ...form, servidoresCount: Number(e.target.value) })} />
          <TextField
            label="URL do CSV da folha (modo CSV)"
            value={form.folhaSincUrl ?? ""}
            onChange={(e) => setForm({ ...form, folhaSincUrl: e.target.value })}
            placeholder="https://prefeitura.gov.br/folha.csv"
            hint="Deixe em branco se nao houver origem automatica. Colunas: cpf, matricula, nome, cargo, vinculo, salarioLiquido, idConvenio, email, telefone"
          />
        </FormGrid>
        {error ? <div style={{ color: "var(--danger-500)", fontSize: 13 }}>{error}</div> : null}
        <FormActions>
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
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
};
