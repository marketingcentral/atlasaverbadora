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
  type Column,
} from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { AdminBanner } from "@atlas/sdk";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function AdminVitrine() {
  const qc = useQueryClient();
  const banners = useQuery({ queryKey: ["admin", "vitrine"], queryFn: () => atlas.admin.listVitrine() });
  const bancos = useQuery({ queryKey: ["admin", "bancos"], queryFn: () => atlas.admin.listBancos() });
  const [editing, setEditing] = useState<AdminBanner | "new" | null>(null);

  const columns: Column<AdminBanner>[] = [
    { key: "ativo", header: "Situação", render: (b) => <Pill variant={b.ativo ? "averbado" : "expirado"}>{b.ativo ? "Ativo" : "Inativo"}</Pill> },
    { key: "titulo", header: "Banner" },
    { key: "bancoNome", header: "Banco patrocinador" },
    { key: "impressoes", header: "Impressões", align: "right", render: (b) => b.impressoes.toLocaleString("pt-BR") },
    { key: "cliques", header: "Cliques", align: "right", render: (b) => b.cliques.toLocaleString("pt-BR") },
    { key: "ctr", header: "CTR", align: "right", render: (b) => (b.impressoes > 0 ? `${((b.cliques / b.impressoes) * 100).toFixed(2)}%` : "—") },
    { key: "receitaMes", header: "Receita mês", align: "right", render: (b) => fmtBRL(b.receitaMes) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Averbadora
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Vitrine de banners patrocinados</h1>
        </div>
        <Button onClick={() => setEditing("new")}>+ Novo banner</Button>
      </header>

      <DataTable columns={columns} rows={banners.data?.banners ?? []} rowKey={(b) => b.id} loading={banners.isLoading} onRowClick={(b) => setEditing(b)} />

      {editing ? <BannerModal initial={editing === "new" ? null : editing} bancos={bancos.data?.bancos ?? []} onClose={() => setEditing(null)} onSaved={() => qc.invalidateQueries({ queryKey: ["admin", "vitrine"] })} /> : null}
    </div>
  );
}

function BannerModal({
  initial,
  bancos,
  onClose,
  onSaved,
}: {
  initial: AdminBanner | null;
  bancos: { id: number; nome: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    id: initial?.id,
    bancoId: initial?.bancoId ?? bancos[0]?.id ?? 1,
    titulo: initial?.titulo ?? "",
    imagemUrl: initial?.imagemUrl ?? "",
    ativo: initial?.ativo ?? true,
  });
  const save = useMutation({
    mutationFn: () => atlas.admin.upsertBanner(form),
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });

  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={modalCard}>
        <h3 style={{ margin: 0 }}>{initial ? `Editar banner` : "Novo banner"}</h3>
        <FormGrid cols={2}>
          <SelectField
            label="Banco"
            value={String(form.bancoId)}
            onChange={(e) => setForm({ ...form, bancoId: Number(e.target.value) })}
            options={bancos.map((b) => ({ value: String(b.id), label: b.nome }))}
            required
          />
          <SelectField
            label="Situação"
            value={form.ativo ? "1" : "0"}
            onChange={(e) => setForm({ ...form, ativo: e.target.value === "1" })}
            options={[{ value: "1", label: "Ativo" }, { value: "0", label: "Inativo" }]}
          />
          <TextField label="Título" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
          <TextField label="URL da imagem (R2)" value={form.imagemUrl} onChange={(e) => setForm({ ...form, imagemUrl: e.target.value })} />
        </FormGrid>
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
