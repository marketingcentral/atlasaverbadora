import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  DataTable,
  FormActions,
  FormGrid,
  Pill,
  SelectField,
  TextField,
  TextareaField,
  type Column,
} from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { Comunicado, ComunicadoPublico } from "@atlas/sdk";

const PUBLICO_LABEL: Record<ComunicadoPublico, string> = {
  banco: "Banco",
  servidor: "Servidor",
};

export function AdminComunicados() {
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ["admin", "comunicados"], queryFn: () => atlas.admin.listComunicados() });
  const [editing, setEditing] = useState<Comunicado | "new" | null>(null);

  const columns: Column<Comunicado>[] = [
    { key: "id", header: "ID", mono: true, width: 100 },
    {
      key: "publico",
      header: "Público",
      width: 120,
      render: (c) => <Pill variant={c.publico === "servidor" ? "averbado" : "emdia"}>{PUBLICO_LABEL[c.publico]}</Pill>,
    },
    { key: "titulo", header: "Título" },
    {
      key: "corpo",
      header: "Conteúdo",
      render: (c) => (
        <span style={{ color: "var(--text-muted)" }}>
          {c.corpo.slice(0, 120)}
          {c.corpo.length > 120 ? "..." : ""}
        </span>
      ),
    },
    { key: "link", header: "Link", render: (c) => (c.linkHref ? c.linkLabel ?? c.linkHref : "—") },
    {
      key: "acoes",
      header: "",
      width: 100,
      align: "right",
      render: (c) => (
        <Button
          variant="ghost"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(c);
          }}
        >
          Editar
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Averbadora
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Comunicados</h1>
          <p style={{ color: "var(--text-muted)" }}>
            Publique avisos para bancos parceiros ou para servidores. Cada comunicado aparece somente no público escolhido.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>+ Novo comunicado</Button>
      </header>

      <DataTable
        columns={columns}
        rows={data.data?.comunicados ?? []}
        rowKey={(c) => c.id}
        loading={data.isLoading}
        onRowClick={(c) => setEditing(c)}
      />

      {editing ? (
        <ComunicadoModal
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["admin", "comunicados"] })}
        />
      ) : null}
    </div>
  );
}

function ComunicadoModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Comunicado | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    id: initial?.id,
    titulo: initial?.titulo ?? "",
    corpo: initial?.corpo ?? "",
    linkLabel: initial?.linkLabel ?? "",
    linkHref: initial?.linkHref ?? "",
    publico: (initial?.publico ?? "banco") as ComunicadoPublico,
  });

  const save = useMutation({
    mutationFn: () =>
      atlas.admin.upsertComunicado({
        ...(form.id ? { id: form.id } : {}),
        titulo: form.titulo,
        corpo: form.corpo,
        publico: form.publico,
        ...(form.linkLabel ? { linkLabel: form.linkLabel } : {}),
        ...(form.linkHref ? { linkHref: form.linkHref } : {}),
      }),
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });

  const canSave = form.titulo.trim().length > 0 && form.corpo.trim().length > 0 && !save.isPending;

  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={modalCard}>
        <h3 style={{ margin: 0 }}>{initial ? "Editar comunicado" : "Novo comunicado"}</h3>
        <FormGrid cols={2}>
          <SelectField
            label="Público-alvo"
            value={form.publico}
            onChange={(e) => setForm({ ...form, publico: e.target.value as ComunicadoPublico })}
            options={[
              { value: "banco", label: "Banco (aparece no portal dos bancos)" },
              { value: "servidor", label: "Servidor (aparece no app do servidor)" },
            ]}
            required
          />
          <TextField
            label="Título"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            required
          />
        </FormGrid>
        <TextareaField
          label="Conteúdo"
          value={form.corpo}
          onChange={(e) => setForm({ ...form, corpo: e.target.value })}
          rows={4}
          required
        />
        <FormGrid cols={2}>
          <TextField
            label="Texto do link (opcional)"
            value={form.linkLabel}
            onChange={(e) => setForm({ ...form, linkLabel: e.target.value })}
            placeholder="Ex.: Acessar Cadastros"
          />
          <TextField
            label="URL do link (opcional)"
            value={form.linkHref}
            onChange={(e) => setForm({ ...form, linkHref: e.target.value })}
            placeholder="Ex.: /banco/cadastros/tabela-emprestimos"
          />
        </FormGrid>
        {save.isError ? (
          <p style={{ color: "var(--text-danger, #ff6b6b)", margin: 0 }}>
            Não foi possível salvar. Verifique os campos e tente de novo.
          </p>
        ) : null}
        <FormActions>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" disabled={!canSave} onClick={() => save.mutate()}>
            {save.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </FormActions>
      </div>
    </div>
  );
}

const modalBackdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(10,22,40,.6)",
  display: "grid",
  placeItems: "center",
  zIndex: 100,
  backdropFilter: "blur(6px)",
};
const modalCard: React.CSSProperties = {
  background: "var(--bg-elev)",
  border: "1px solid var(--border-strong)",
  borderRadius: 14,
  padding: 24,
  maxWidth: 720,
  width: "calc(100% - 48px)",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  boxShadow: "var(--shadow-lg)",
};
