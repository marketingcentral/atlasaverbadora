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

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "comunicados"] });

  const mover = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: "up" | "down" }) =>
      atlas.admin.moveComunicado(id, direction),
    onSuccess: invalidate,
  });
  const remover = useMutation({
    mutationFn: (id: string) => atlas.admin.deleteComunicado(id),
    onSuccess: invalidate,
  });

  const comunicados = data.data?.comunicados ?? [];

  const ellipsis: React.CSSProperties = {
    display: "inline-block",
    verticalAlign: "middle",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const columns: Column<Comunicado>[] = [
    {
      key: "id",
      header: "ID",
      mono: true,
      width: 110,
      render: (c) => (
        <span style={{ ...ellipsis, maxWidth: 96, fontFamily: "var(--font-mono)" }} title={c.id}>
          {c.id}
        </span>
      ),
    },
    {
      key: "publico",
      header: "Público",
      width: 90,
      render: (c) => {
        // Fallback caso a API ainda esteja num deploy antigo sem o campo publico.
        const p: ComunicadoPublico = c.publico ?? "banco";
        return <Pill variant={p === "servidor" ? "averbado" : "emdia"}>{PUBLICO_LABEL[p]}</Pill>;
      },
    },
    {
      key: "titulo",
      header: "Título",
      render: (c) => (
        <span style={{ ...ellipsis, maxWidth: 200 }} title={c.titulo}>
          {c.titulo}
        </span>
      ),
    },
    {
      key: "corpo",
      header: "Conteúdo",
      render: (c) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth: 260 }}>
          <span style={{ ...ellipsis, maxWidth: 240, color: "var(--text-muted)" }} title={c.corpo}>
            {c.corpo}
          </span>
          {c.linkHref ? (
            <span title={c.linkLabel ?? c.linkHref} style={{ color: "var(--accent)", fontSize: 12 }}>
              🔗
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "acoes",
      header: "Ações",
      width: 200,
      align: "right",
      render: (c) => {
        const idx = comunicados.findIndex((x) => x.id === c.id);
        const first = idx <= 0;
        const last = idx < 0 || idx >= comunicados.length - 1;
        const busy = mover.isPending;
        return (
          <div style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
            <button
              type="button"
              disabled={first || busy}
              onClick={() => mover.mutate({ id: c.id, direction: "up" })}
              aria-label="Mover para cima"
              title="Mover para cima"
              style={arrowBtn(first || busy)}
            >
              ↑
            </button>
            <button
              type="button"
              disabled={last || busy}
              onClick={() => mover.mutate({ id: c.id, direction: "down" })}
              aria-label="Mover para baixo"
              title="Mover para baixo"
              style={arrowBtn(last || busy)}
            >
              ↓
            </button>
            <Button variant="ghost" size="sm" type="button" onClick={() => setEditing(c)}>
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              disabled={remover.isPending}
              onClick={() => {
                if (window.confirm(`Remover o comunicado "${c.titulo}"? Essa acao nao pode ser desfeita.`)) {
                  remover.mutate(c.id);
                }
              }}
              style={{ color: "#F87171" }}
            >
              Remover
            </Button>
          </div>
        );
      },
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

function arrowBtn(disabled: boolean): React.CSSProperties {
  return {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: "1px solid var(--border-strong)",
    background: "var(--bg-elev)",
    color: disabled ? "var(--text-dim)" : "var(--text-muted)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1,
    padding: 0,
    opacity: disabled ? 0.5 : 1,
  };
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
