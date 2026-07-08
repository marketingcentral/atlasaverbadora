import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, IconButton, Pill, TextField, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { AdminBeneficio, AdminBeneficioInput, CategoriaBeneficio } from "@atlas/sdk";

const CATEGORIAS: { id: CategoriaBeneficio; label: string }[] = [
  { id: "saude", label: "Saúde" },
  { id: "alimentacao", label: "Alimentação" },
  { id: "educacao", label: "Educação" },
  { id: "lazer", label: "Lazer" },
];

const CORES_SUGERIDAS = ["#dc2626", "#0891b2", "#f59e0b", "#c2410c", "#2563eb", "#7c3aed", "#059669", "#be185d"];

export function AdminBeneficios() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AdminBeneficio | "new" | null>(null);
  const beneficiosQ = useQuery({ queryKey: ["admin", "beneficios"], queryFn: () => atlas.admin.beneficios.list() });
  const prefeiturasQ = useQuery({ queryKey: ["admin", "prefeituras"], queryFn: () => atlas.admin.listPrefeituras() });

  const pausar = useMutation({
    mutationFn: (id: string) => atlas.admin.beneficios.pausar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "beneficios"] }),
  });
  const reativar = useMutation({
    mutationFn: (id: string) => atlas.admin.beneficios.reativar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "beneficios"] }),
  });

  const prefNome = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of prefeiturasQ.data?.prefeituras ?? []) map.set(p.id, `${p.nome}/${p.uf}`);
    return map;
  }, [prefeiturasQ.data]);

  const columns: Column<AdminBeneficio>[] = [
    { key: "ativo", header: "Situação", render: (b) => <Pill variant={b.ativo ? "averbado" : "expirado"}>{b.ativo ? "Ativo" : "Pausado"}</Pill> },
    {
      key: "icone",
      header: "",
      render: (b) => (
        <span style={{
          width: 32, height: 32, borderRadius: 8,
          background: `color-mix(in srgb, ${b.cor} 15%, transparent)`,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}>{b.icone}</span>
      ),
    },
    { key: "nome", header: "Nome" },
    { key: "cat", header: "Categorias", render: (b) => b.categorias.map((c) => CATEGORIAS.find((x) => x.id === c)?.label).join(" · ") },
    { key: "pref", header: "Prefeitura", render: (b) => prefNome.get(b.prefeituraId) ?? `#${b.prefeituraId}` },
    { key: "local", header: "Local" },
    { key: "desc", header: "Desconto", render: (b) => `${b.descontoLabel} ${b.descontoComplemento}` },
    { key: "origem", header: "Origem", render: (b) => <Pill variant={b.origem === "banco" ? "aceita" : "emdia"}>{b.origem}</Pill> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Averbadora
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Benefícios e descontos</h1>
          <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 720, fontSize: 13 }}>
            Cadastre parceiros comerciais e benefícios de saúde por prefeitura. Origem <b>banco</b> = disponibilizado pelo banco parceiro (via cartão consignado). Origem <b>averbadora</b> = negociado pela averbadora com comércio local.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>+ Novo benefício</Button>
      </header>

      <DataTable
        columns={columns}
        rows={beneficiosQ.data?.beneficios ?? []}
        rowKey={(b) => b.id}
        loading={beneficiosQ.isLoading}
        emptyState="Nenhum benefício cadastrado ainda."
        actions={(b) => (
          <>
            <IconButton title="Editar" onClick={() => setEditing(b)}>✎</IconButton>
            {b.ativo ? (
              <IconButton
                title="Pausar"
                danger
                onClick={() => { if (confirm(`Pausar "${b.nome}"?\n\nEle para de aparecer para os servidores até você reativar.`)) pausar.mutate(b.id); }}
              >⏸</IconButton>
            ) : (
              <IconButton title="Reativar" onClick={() => reativar.mutate(b.id)}>▶</IconButton>
            )}
          </>
        )}
      />

      {editing ? (
        <BeneficioModal
          initial={editing === "new" ? null : editing}
          prefeituras={prefeiturasQ.data?.prefeituras ?? []}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

function BeneficioModal({
  initial, prefeituras, onClose,
}: {
  initial: AdminBeneficio | null;
  prefeituras: { id: number; nome: string; uf: string }[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<AdminBeneficioInput>({
    id: initial?.id,
    prefeituraId: initial?.prefeituraId ?? prefeituras[0]?.id ?? 1,
    nome: initial?.nome ?? "",
    categorias: initial?.categorias ?? ["saude"],
    local: initial?.local ?? "",
    icone: initial?.icone ?? "🎁",
    cor: initial?.cor ?? "#059669",
    descontoLabel: initial?.descontoLabel ?? "",
    descontoComplemento: initial?.descontoComplemento ?? "",
    origem: initial?.origem ?? "averbadora",
    ativo: initial?.ativo ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => atlas.admin.beneficios.upsert(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "beneficios"] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Erro ao salvar"),
  });

  function toggleCategoria(cat: CategoriaBeneficio) {
    setForm((f) => {
      const has = f.categorias.includes(cat);
      const next = has ? f.categorias.filter((c) => c !== cat) : [...f.categorias, cat];
      return { ...f, categorias: next.length ? next : f.categorias };
    });
  }

  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={modalCard}>
        <h3 style={{ margin: 0 }}>{initial ? `Editar ${initial.nome}` : "Novo benefício"}</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={fieldLabel}>
            <span>Prefeitura</span>
            <select
              value={form.prefeituraId}
              onChange={(e) => setForm({ ...form, prefeituraId: Number(e.target.value) })}
              style={selectStyle}
            >
              {prefeituras.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}/{p.uf}</option>
              ))}
            </select>
          </label>
          <label style={fieldLabel}>
            <span>Origem</span>
            <select
              value={form.origem}
              onChange={(e) => setForm({ ...form, origem: e.target.value as "banco" | "averbadora" })}
              style={selectStyle}
            >
              <option value="averbadora">Averbadora (comércio local)</option>
              <option value="banco">Banco parceiro (via cartão consignado)</option>
            </select>
          </label>
        </div>

        <TextField label="Nome do parceiro" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Farmácia São João" required />
        <TextField label="Local" value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} placeholder="Ex.: Castro Centro" required />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TextField label="Desconto (título)" value={form.descontoLabel} onChange={(e) => setForm({ ...form, descontoLabel: e.target.value })} placeholder="Ex.: 10% desconto" required />
          <TextField label="Desconto (complemento)" value={form.descontoComplemento} onChange={(e) => setForm({ ...form, descontoComplemento: e.target.value })} placeholder="Ex.: em medicamentos" required />
        </div>

        <div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Categorias (uma ou mais)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {CATEGORIAS.map((c) => (
              <Chip key={c.id} on={form.categorias.includes(c.id)} onClick={() => toggleCategoria(c.id)}>{c.label}</Chip>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={fieldLabel}>
            <span>Ícone (emoji)</span>
            <input
              type="text"
              value={form.icone}
              onChange={(e) => setForm({ ...form, icone: e.target.value })}
              placeholder="💊"
              maxLength={4}
              style={{ ...selectStyle, fontSize: 22, textAlign: "center" }}
            />
          </label>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Cor de destaque</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {CORES_SUGERIDAS.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  onClick={() => setForm({ ...form, cor })}
                  aria-label={`Cor ${cor}`}
                  style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: cor,
                    border: form.cor === cor ? "2px solid var(--text)" : "1px solid var(--border)",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
          <input type="checkbox" checked={form.ativo ?? true} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
          Publicar imediatamente (aparece para servidores da prefeitura)
        </label>

        {error ? <div style={{ color: "var(--danger-500)", fontSize: 13 }}>{error}</div> : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={save.isPending || !form.nome || !form.local || !form.descontoLabel || !form.descontoComplemento}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "5px 10px",
        borderRadius: 999,
        border: "1px solid",
        borderColor: on ? "var(--emerald-500)" : "var(--border-strong)",
        background: on ? "var(--emerald-500)" : "transparent",
        color: on ? "var(--navy-900)" : "var(--text)",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

const fieldLabel: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 4,
  fontSize: 12, color: "var(--text-muted)",
};
const selectStyle: React.CSSProperties = {
  padding: "10px 12px", borderRadius: 10,
  border: "1px solid var(--border-strong)",
  background: "var(--bg)", color: "var(--text)",
  fontSize: 14, fontFamily: "inherit",
  boxSizing: "border-box", width: "100%", cursor: "pointer",
};
const modalBackdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(10,22,40,.6)",
  display: "grid", placeItems: "center", zIndex: 100, backdropFilter: "blur(6px)", padding: 16,
};
const modalCard: React.CSSProperties = {
  background: "var(--bg-elev)", border: "1px solid var(--border-strong)",
  borderRadius: 14, padding: 24, maxWidth: 600, width: "calc(100% - 32px)",
  display: "flex", flexDirection: "column", gap: 14, boxShadow: "var(--shadow-lg)",
  maxHeight: "calc(100vh - 32px)", overflowY: "auto",
};
