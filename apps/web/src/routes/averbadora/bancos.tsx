import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  CsvImportPanel,
  DataTable,
  FormActions,
  FormGrid,
  IconButton,
  Pill,
  SelectField,
  TextField,
  type Column,
} from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { AdminBanco, AdminBancoInput } from "@atlas/sdk";

export function AdminBancos() {
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ["admin", "bancos"], queryFn: () => atlas.admin.listBancos() });
  const testar = useMutation({
    mutationFn: (id: number) => atlas.admin.testarBanco(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "bancos"] }),
  });
  // Nunca exclui — desativa/reativa (status). Reversível, sem perda de dados.
  const toggleAtivo = useMutation({
    mutationFn: (b: AdminBanco) => atlas.admin.upsertBanco({
      id: b.id, nome: b.nome, status: b.status === "inativo" ? "ativo" : "inativo",
      adapter: b.adapter, contatoEmail: b.contatoEmail, loginEmail: b.loginEmail,
      scopes: b.scopes, mtlsHabilitado: b.mtlsHabilitado,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "bancos"] }),
  });
  const [editing, setEditing] = useState<AdminBanco | "new" | null>(null);

  const columns: Column<AdminBanco>[] = [
    {
      key: "status",
      header: "Situação",
      render: (b) => <Pill variant={b.status === "ativo" ? "averbado" : b.status === "pausado" ? "pendente" : "expirado"}>{b.status}</Pill>,
    },
    { key: "nome", header: "Banco" },
    { key: "adapter", header: "Adapter" },
    { key: "contatoEmail", header: "Contato" },
    {
      key: "acesso",
      header: "Acesso /login",
      render: (b) =>
        b.loginEmail && b.hasPassword ? (
          <span style={{ color: "var(--emerald-500)" }}>{b.loginEmail}</span>
        ) : b.loginEmail ? (
          <span style={{ color: "var(--danger-500)" }} title="Login cadastrado mas sem senha">{b.loginEmail} (sem senha)</span>
        ) : (
          <span style={{ color: "var(--text-dim)" }}>—</span>
        ),
    },
    { key: "scopes", header: "Scopes", render: (b) => b.scopes.join(", ") || "—" },
    { key: "mtlsHabilitado", header: "mTLS", render: (b) => (b.mtlsHabilitado ? "sim" : "não") },
    {
      key: "teste",
      header: "Última conexão",
      render: (b) =>
        b.ultimoTeste ? (
          <span style={{ color: b.ultimoTesteOk ? "var(--emerald-500)" : "var(--danger-500)" }}>
            {b.ultimoTesteOk ? "OK" : "FALHA"} • {new Date(b.ultimoTeste).toLocaleString("pt-BR")}
          </span>
        ) : "—",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Averbadora
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Bancos parceiros</h1>
        </div>
        <Button onClick={() => setEditing("new")}>+ Adicionar banco</Button>
      </header>

      <CsvImportPanel
        title="Importar bancos"
        columnsHint="Colunas: nome, status, adapter, contatoEmail, loginEmail, password (min 6), scopes (separados por |), mtlsHabilitado"
        templateUrl={atlas.admin.csvTemplateUrl("bancos")}
        onImport={async (csv) => atlas.admin.importCsv("bancos", csv)}
        onImported={() => qc.invalidateQueries({ queryKey: ["admin", "bancos"] })}
      />

      <DataTable
        columns={columns}
        rows={data.data?.bancos ?? []}
        rowKey={(b) => String(b.id)}
        loading={data.isLoading}
        actions={(b) => (
          <>
            <IconButton title="Editar" onClick={() => setEditing(b)}>✎</IconButton>
            <IconButton title="Testar conexão" onClick={() => testar.mutate(b.id)}>↻</IconButton>
            {b.status === "inativo" ? (
              <IconButton title="Reativar" onClick={() => toggleAtivo.mutate(b)}>▶</IconButton>
            ) : (
              <IconButton danger title="Desativar" onClick={() => { if (confirm(`Desativar o banco "${b.nome}"?\n\nEle para de operar, mas os dados não são apagados — você pode reativar depois.`)) toggleAtivo.mutate(b); }}>⏸</IconButton>
            )}
          </>
        )}
      />

      {editing ? <BancoModal initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function BancoModal({ initial, onClose }: { initial: AdminBanco | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<AdminBancoInput>({
    id: initial?.id,
    nome: initial?.nome ?? "",
    status: initial?.status ?? "ativo",
    adapter: initial?.adapter ?? "sandbox",
    contatoEmail: initial?.contatoEmail ?? "",
    loginEmail: initial?.loginEmail ?? "",
    password: "",
    scopes: initial?.scopes ?? ["propostas:rw"],
    mtlsHabilitado: initial?.mtlsHabilitado ?? false,
  });
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => {
      const payload: AdminBancoInput = { ...form };
      if (!payload.loginEmail) delete payload.loginEmail;
      if (!payload.password) delete payload.password;
      return atlas.admin.upsertBanco(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "bancos"] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Erro ao salvar"),
  });

  const senhaHint = initial?.hasPassword
    ? "Deixe em branco para manter a senha atual."
    : "Mínimo 6 caracteres. Será enviada ao operador do banco.";

  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={modalCard}>
        <h3 style={{ margin: 0 }}>{initial ? `Editar ${initial.nome}` : "Novo banco"}</h3>
        <FormGrid cols={2}>
          <TextField label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          <TextField label="Contato (email)" value={form.contatoEmail} onChange={(e) => setForm({ ...form, contatoEmail: e.target.value })} required />
          <TextField
            label="Login (email de acesso ao /login)"
            type="email"
            value={form.loginEmail ?? ""}
            onChange={(e) => setForm({ ...form, loginEmail: e.target.value })}
            placeholder="operador@banco.com.br"
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
            onChange={(e) => setForm({ ...form, status: e.target.value as AdminBancoInput["status"] })}
            options={[
              { value: "ativo", label: "Ativo" },
              { value: "pausado", label: "Pausado" },
              { value: "inativo", label: "Inativo" },
            ]}
          />
          <SelectField
            label="Adapter"
            value={form.adapter}
            onChange={(e) => setForm({ ...form, adapter: e.target.value as AdminBancoInput["adapter"] })}
            options={[
              { value: "sandbox", label: "Sandbox" },
              { value: "ifractal", label: "iFractal" },
            ]}
          />
          <TextField
            label="Scopes (vírgula)"
            value={(form.scopes ?? []).join(",")}
            onChange={(e) => setForm({ ...form, scopes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
          />
          <SelectField
            label="mTLS"
            value={form.mtlsHabilitado ? "1" : "0"}
            onChange={(e) => setForm({ ...form, mtlsHabilitado: e.target.value === "1" })}
            options={[
              { value: "0", label: "Desabilitado" },
              { value: "1", label: "Habilitado" },
            ]}
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
