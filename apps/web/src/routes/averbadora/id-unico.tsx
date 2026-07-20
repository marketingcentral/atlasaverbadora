import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, FormActions, FormGrid, IconButton, NumberField, SelectField, TextField, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { AdminIdUnicoConfig, IdUnicoFormato } from "@atlas/sdk";

export function AdminIdUnico() {
  const qc = useQueryClient();
  const configs = useQuery({ queryKey: ["admin", "id-unico"], queryFn: () => atlas.admin.listIdUnicoConfigs() });
  const prefeituras = useQuery({ queryKey: ["admin", "prefeituras"], queryFn: () => atlas.admin.listPrefeituras() });
  const [editing, setEditing] = useState<AdminIdUnicoConfig | "new" | null>(null);
  // Botao "emitir manualmente" removido da UI (20/07/2026) — em operacao normal
  // cada aprovacao de proposta ja consome o proximo ID automaticamente, e o
  // clique acidental no botao "+" queimava numeros da sequencia sem gerar
  // operacao real. Endpoint POST /v1/admin/id-unico/issue continua disponivel
  // pra scripts/migracao manual (nao ha caminho de UI).

  const columns: Column<AdminIdUnicoConfig>[] = [
    { key: "prefeituraNome", header: "Prefeitura" },
    { key: "prefixo", header: "Prefixo", mono: true },
    { key: "formato", header: "Formato" },
    { key: "larguraSeq", header: "Largura seq.", align: "right" },
    { key: "proximoSeq", header: "Próximo seq.", align: "right" },
    { key: "exemplo", header: "Próximo ID (preview)", mono: true },
    { key: "atualizadoEm", header: "Atualizado em", render: (c) => new Date(c.atualizadoEm).toLocaleString("pt-BR") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Averbadora
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>ID único / parametrização de chave</h1>
          <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 720 }}>
            Configura como o ID único de cada operação é gerado por prefeitura. Composto por prefixo + sequencial (ou hash). Usado no ADF e no bate-de-carteira.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>+ Configurar prefeitura</Button>
      </header>

      <DataTable
        columns={columns}
        rows={configs.data?.configs ?? []}
        rowKey={(c) => String(c.prefeituraId)}
        loading={configs.isLoading}
        actions={(c) => (
          <IconButton title="Editar" onClick={() => setEditing(c)}>✎</IconButton>
        )}
      />

      {editing ? (
        <ConfigModal
          initial={editing === "new" ? null : editing}
          prefeituras={prefeituras.data?.prefeituras ?? []}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

function ConfigModal({
  initial, prefeituras, onClose,
}: {
  initial: AdminIdUnicoConfig | null;
  prefeituras: { id: number; nome: string; uf: string }[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    prefeituraId: initial?.prefeituraId ?? prefeituras[0]?.id ?? 1,
    prefixo: initial?.prefixo ?? "",
    formato: (initial?.formato ?? "SEQ") as IdUnicoFormato,
    larguraSeq: initial?.larguraSeq ?? 6,
    proximoSeq: initial?.proximoSeq ?? 1,
    separador: initial?.separador ?? "-",
  });
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => atlas.admin.upsertIdUnicoConfig(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "id-unico"] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Erro ao salvar"),
  });
  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={modalCard}>
        <h3 style={{ margin: 0 }}>{initial ? `Editar — ${initial.prefeituraNome}` : "Nova configuração de ID único"}</h3>
        <FormGrid cols={2}>
          <SelectField
            label="Prefeitura"
            value={String(form.prefeituraId)}
            onChange={(e) => setForm({ ...form, prefeituraId: Number(e.target.value) })}
            options={prefeituras.map((p) => ({ value: String(p.id), label: `${p.nome}/${p.uf}` }))}
            disabled={!!initial}
          />
          <TextField
            label="Prefixo (2-8 caracteres, A-Z/0-9)"
            value={form.prefixo}
            maxLength={8}
            onChange={(e) => setForm({ ...form, prefixo: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
            required
          />
          <SelectField
            label="Formato"
            value={form.formato}
            onChange={(e) => setForm({ ...form, formato: e.target.value as IdUnicoFormato })}
            options={[
              { value: "SEQ", label: "Prefixo + Sequencial (PLH-000001)" },
              { value: "YYYYMM_SEQ", label: "Prefixo + AAAAMM + Sequencial (PLH-202606-00001)" },
              { value: "SEQ_HASH", label: "Prefixo + Sequencial + Hash (PLH-00001-AB12CD)" },
            ]}
          />
          <NumberField label="Largura da sequência (zeros)" value={form.larguraSeq} min={3} max={10} onChange={(e) => setForm({ ...form, larguraSeq: Number(e.target.value) })} />
          <NumberField label="Próximo sequencial" value={form.proximoSeq} min={1} onChange={(e) => setForm({ ...form, proximoSeq: Number(e.target.value) })} />
          <TextField label="Separador" value={form.separador} maxLength={2} onChange={(e) => setForm({ ...form, separador: e.target.value })} />
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
