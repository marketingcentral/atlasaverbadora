import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, FormActions, FormGrid, IconButton, Pill, SelectField, TextField, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { AdminAverbadoraUser, AverbadoraPerfil } from "@atlas/sdk";

type PerfilOpcao = { value: AverbadoraPerfil; label: string; descricao: string };

export function AdminPerfis() {
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ["admin", "perfis"], queryFn: () => atlas.admin.listPerfisAdmin() });
  const [editing, setEditing] = useState<AdminAverbadoraUser | "new" | null>(null);
  const [twofa, setTwofa] = useState<{ user: AdminAverbadoraUser; secret: string; otpauthUrl: string } | null>(null);

  const remove = useMutation({
    mutationFn: (id: number) => atlas.admin.deletePerfilAdmin(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "perfis"] }),
  });
  const rotate = useMutation({
    mutationFn: (u: AdminAverbadoraUser) =>
      atlas.admin.rotate2FA(u.id).then((r) => ({ user: u, ...r })),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["admin", "perfis"] });
      setTwofa(r);
    },
  });
  const disable = useMutation({
    mutationFn: (id: number) => atlas.admin.disable2FA(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "perfis"] }),
  });

  const columns: Column<AdminAverbadoraUser>[] = [
    {
      key: "status",
      header: "Status",
      render: (u) => <Pill variant={u.ativo ? "averbado" : "expirado"}>{u.ativo ? "ativo" : "inativo"}</Pill>,
    },
    { key: "nome", header: "Nome" },
    { key: "email", header: "Email" },
    { key: "perfil", header: "Perfil", render: (u) => <Pill variant="emdia">{u.perfil}</Pill> },
    { key: "twoFactorEnabled", header: "2FA", render: (u) => u.twoFactorEnabled ? <Pill variant="averbado">on</Pill> : <Pill variant="expirado">off</Pill> },
    { key: "ultimoLogin", header: "Último login", render: (u) => u.ultimoLogin ? new Date(u.ultimoLogin).toLocaleString("pt-BR") : "—" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Averbadora
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Usuários e perfis do painel</h1>
          <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 720 }}>
            Subperfis da averbadora (operador, supervisor, comercial, financeiro, auditoria) e gestão de 2FA por usuário.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>+ Novo usuário</Button>
      </header>

      <PerfilsLegend opts={data.data?.perfis ?? []} />

      <DataTable
        columns={columns}
        rows={data.data?.usuarios ?? []}
        rowKey={(u) => String(u.id)}
        loading={data.isLoading}
        actions={(u) => (
          <>
            <IconButton title="Editar" onClick={() => setEditing(u)}>✎</IconButton>
            {u.twoFactorEnabled ? (
              <IconButton title="Desativar 2FA" onClick={() => { if (confirm(`Desativar 2FA de ${u.email}?`)) disable.mutate(u.id); }}>🔓</IconButton>
            ) : (
              <IconButton title="Ativar/rotacionar 2FA" onClick={() => rotate.mutate(u)}>🔐</IconButton>
            )}
            <IconButton title="Remover" onClick={() => { if (confirm(`Remover ${u.email}?`)) remove.mutate(u.id); }}>✕</IconButton>
          </>
        )}
      />

      {editing ? (
        <UserModal
          initial={editing === "new" ? null : editing}
          perfis={data.data?.perfis ?? []}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {twofa ? <TwoFactorModal data={twofa} onClose={() => setTwofa(null)} /> : null}
    </div>
  );
}

function PerfilsLegend({ opts }: { opts: PerfilOpcao[] }) {
  if (!opts.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
      {opts.map((p) => (
        <div key={p.value} style={{
          background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
            <Pill variant="emdia">{p.value}</Pill>
            <span>{p.label}</span>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>{p.descricao}</p>
        </div>
      ))}
    </div>
  );
}

function UserModal({
  initial, perfis, onClose,
}: {
  initial: AdminAverbadoraUser | null;
  perfis: PerfilOpcao[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    id: initial?.id,
    nome: initial?.nome ?? "",
    email: initial?.email ?? "",
    perfil: initial?.perfil ?? "operador" as AverbadoraPerfil,
    ativo: initial?.ativo ?? true,
    password: "",
    twoFactorEnabled: initial?.twoFactorEnabled ?? false,
  });
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => atlas.admin.upsertPerfilAdmin({
      id: form.id,
      nome: form.nome,
      email: form.email,
      perfil: form.perfil,
      ativo: form.ativo,
      password: form.password || undefined,
      twoFactorEnabled: form.twoFactorEnabled,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "perfis"] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Erro ao salvar"),
  });
  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={modalCard}>
        <h3 style={{ margin: 0 }}>{initial ? `Editar ${initial.email}` : "Novo usuário"}</h3>
        <FormGrid cols={2}>
          <TextField label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <SelectField
            label="Perfil"
            value={form.perfil}
            onChange={(e) => setForm({ ...form, perfil: e.target.value as AverbadoraPerfil })}
            options={perfis.map((p) => ({ value: p.value, label: p.label }))}
          />
          <SelectField
            label="Status"
            value={form.ativo ? "1" : "0"}
            onChange={(e) => setForm({ ...form, ativo: e.target.value === "1" })}
            options={[{ value: "1", label: "Ativo" }, { value: "0", label: "Inativo" }]}
          />
          <TextField
            label={initial ? "Nova senha (opcional)" : "Senha"}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={initial ? "deixe em branco para manter" : "min. 6 caracteres"}
          />
          <SelectField
            label="2FA"
            value={form.twoFactorEnabled ? "1" : "0"}
            onChange={(e) => setForm({ ...form, twoFactorEnabled: e.target.value === "1" })}
            options={[{ value: "0", label: "Desativado" }, { value: "1", label: "Ativado (gera secret)" }]}
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

function TwoFactorModal({
  data, onClose,
}: {
  data: { user: AdminAverbadoraUser; secret: string; otpauthUrl: string };
  onClose: () => void;
}) {
  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalCard, maxWidth: 520 }}>
        <h3 style={{ margin: 0 }}>2FA habilitado — {data.user.email}</h3>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13 }}>
          Entregue o segredo a seguir ao usuário. Ele deve cadastrar no autenticador (Authy, 1Password, Google Authenticator).
          Este segredo <strong>não será mostrado novamente</strong>.
        </p>
        <div style={{ background: "var(--bg-elev)", border: "1px solid var(--gold-500)", borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>Segredo (base32)</div>
          <code style={{ fontSize: 16, wordBreak: "break-all" }}>{data.secret}</code>
          <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>otpauth:// URL</div>
          <code style={{ fontSize: 12, wordBreak: "break-all", color: "var(--text-muted)" }}>{data.otpauthUrl}</code>
        </div>
        <FormActions>
          <Button onClick={onClose}>Entendi, copiei o segredo</Button>
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
