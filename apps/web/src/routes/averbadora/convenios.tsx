import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button, CsvImportPanel, DataTable, FormActions, FormGrid, IconButton,
  NumberField, Pill, SelectField, TextField, TextareaField, type Column,
} from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type {
  AdminBanco, AdminConvenio, AdminConvenioConfig, AdminConvenioInput,
  AdminPrefeitura, FormatoImportacao, VinculoAceito,
} from "@atlas/sdk";

const VINCULOS: { value: VinculoAceito; label: string }[] = [
  { value: "CLT", label: "CLT" },
  { value: "ESTATUTARIO", label: "Estatutário" },
  { value: "COMISSIONADO", label: "Comissionado" },
  { value: "APOSENTADO", label: "Aposentado" },
  { value: "PENSIONISTA", label: "Pensionista" },
];

export function AdminConvenios() {
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ["admin", "convenios"], queryFn: () => atlas.admin.listConvenios() });
  const configs = useQuery({ queryKey: ["admin", "convenios", "configs"], queryFn: () => atlas.admin.listConveniosConfigs() });
  const bancos = useQuery({ queryKey: ["admin", "bancos"], queryFn: () => atlas.admin.listBancos() });
  const prefeituras = useQuery({ queryKey: ["admin", "prefeituras"], queryFn: () => atlas.admin.listPrefeituras() });
  const remove = useMutation({
    mutationFn: (id: string) => atlas.admin.deleteConvenio(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "convenios"] });
      qc.invalidateQueries({ queryKey: ["admin", "convenios", "configs"] });
    },
  });
  const reactivate = useMutation({
    mutationFn: (id: string) => atlas.admin.reativarConvenio(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "convenios"] });
      qc.invalidateQueries({ queryKey: ["admin", "convenios", "configs"] });
    },
  });
  const [editing, setEditing] = useState<AdminConvenio | "new" | null>(null);
  const [configuring, setConfiguring] = useState<AdminConvenio | null>(null);

  const configMap = useMemo(() => {
    const m = new Map<string, AdminConvenioConfig>();
    for (const c of configs.data?.configs ?? []) m.set(c.id, c);
    return m;
  }, [configs.data]);

  const columns: Column<AdminConvenio>[] = [
    { key: "id", header: "ID", mono: true },
    { key: "nome", header: "Convênio" },
    { key: "prefeituraNome", header: "Prefeitura" },
    { key: "bancoNome", header: "Banco" },
    { key: "codigoVerba", header: "Código verba", mono: true },
    {
      key: "trava",
      header: "Trava",
      render: (c) => {
        const cfg = configMap.get(c.id);
        return cfg ? (
          <span style={{ fontSize: 13 }}>
            {cfg.prazoTravaHoras}h
            <span style={{ color: "var(--text-dim)" }}> / port. {cfg.prazoPortabilidadeDU}du</span>
          </span>
        ) : (
          <span style={{ color: "var(--text-dim)" }}>—</span>
        );
      },
    },
    {
      key: "formato",
      header: "Importação",
      render: (c) => {
        const cfg = configMap.get(c.id);
        return cfg ? <Pill variant="emdia">{cfg.formatoImportacao}</Pill> : <span style={{ color: "var(--text-dim)" }}>—</span>;
      },
    },
    { key: "dataCorte", header: "Corte", render: (c) => `dia ${c.dataCorte}` },
    { key: "diaRepasse", header: "Repasse", render: (c) => `dia ${c.diaRepasse}` },
    {
      key: "status",
      header: "Situação",
      render: (c) => {
        if (!c.ativo) return <Pill variant="expirado">Inativo</Pill>;
        const cfg = configMap.get(c.id);
        if (!cfg) return <Pill variant="pendente">sem config</Pill>;
        return <Pill variant={cfg.ativo ? "averbado" : "pendente"}>{cfg.ativo ? "Ativo" : "Config off"}</Pill>;
      },
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Averbadora
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Convênios (banco × prefeitura)</h1>
          <p style={{ color: "var(--text-muted)", margin: "6px 0 0" }}>
            Relacional banco × prefeitura. Cada convênio possui configuração de prazo de trava, regras de produto e formato de importação.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>+ Novo convênio</Button>
      </header>

      <CsvImportPanel
        title="Importar convênios"
        columnsHint="Colunas: bancoId, prefeituraId, nome, codigoVerba, dataCorte, diaRepasse"
        templateUrl={atlas.admin.csvTemplateUrl("convenios")}
        onImport={async (csv) => atlas.admin.importCsv("convenios", csv)}
        onImported={() => qc.invalidateQueries({ queryKey: ["admin", "convenios"] })}
      />

      <MatrizConvenios
        bancos={bancos.data?.bancos ?? []}
        prefeituras={prefeituras.data?.prefeituras ?? []}
        convenios={data.data?.convenios ?? []}
      />

      <DataTable
        columns={columns}
        rows={data.data?.convenios ?? []}
        rowKey={(c) => c.id}
        loading={data.isLoading}
        actions={(c) => (
          <>
            <IconButton title="Editar convênio" onClick={() => setEditing(c)}>✎</IconButton>
            <IconButton title="Configurações (prazos, regras)" onClick={() => setConfiguring(c)}>⚙</IconButton>
            {c.ativo ? (
              <IconButton
                title="Desativar convênio"
                danger
                onClick={() => {
                  if (confirm(`Desativar ${c.nome}?\n\nO convênio para de operar, mas nada é apagado — você pode reativar depois.`)) remove.mutate(c.id);
                }}
              >
                ⏸
              </IconButton>
            ) : (
              <IconButton title="Reativar convênio" onClick={() => reactivate.mutate(c.id)}>▶</IconButton>
            )}
          </>
        )}
      />

      {editing ? (
        <ConvenioModal
          initial={editing === "new" ? null : editing}
          bancos={bancos.data?.bancos ?? []}
          prefeituras={prefeituras.data?.prefeituras ?? []}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {configuring ? (
        <ConfigModal
          convenio={configuring}
          initial={configMap.get(configuring.id) ?? null}
          onClose={() => setConfiguring(null)}
        />
      ) : null}
    </div>
  );
}

/** Matriz visual banco × prefeitura pra selecionar convenios em massa.
 *  Clique numa celula vazia CRIA convenio com padroes (nome auto, dataCorte 15,
 *  diaRepasse 5). Clique numa celula marcada DESATIVA (soft) o convenio ativo
 *  daquele par. Prefeituras/bancos novos aparecem automaticamente. */
function MatrizConvenios({
  bancos, prefeituras, convenios,
}: {
  bancos: AdminBanco[];
  prefeituras: AdminPrefeitura[];
  convenios: AdminConvenio[];
}) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<string | null>(null); // "bancoId:prefId" em progresso

  // Mapa (bancoId:prefeituraId) -> convenio ativo desse par, se existir.
  const cell = useMemo(() => {
    const m = new Map<string, AdminConvenio>();
    for (const c of convenios) {
      if (!c.ativo) continue;
      m.set(`${c.bancoId}:${c.prefeituraId}`, c);
    }
    return m;
  }, [convenios]);

  const create = useMutation({
    mutationFn: (v: { bancoId: number; prefeituraId: number; nome: string }) =>
      atlas.admin.upsertConvenio({
        bancoId: v.bancoId, prefeituraId: v.prefeituraId,
        nome: v.nome, codigoVerba: "PADRAO",
        dataCorte: 15, diaRepasse: 5,
      }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin", "convenios"] });
      setPending(null);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => atlas.admin.deleteConvenio(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin", "convenios"] });
      setPending(null);
    },
  });

  const toggle = (banco: AdminBanco, pref: AdminPrefeitura) => {
    const key = `${banco.id}:${pref.id}`;
    if (pending) return;
    setPending(key);
    const existing = cell.get(key);
    if (existing) {
      remove.mutate(existing.id);
    } else {
      create.mutate({
        bancoId: banco.id, prefeituraId: pref.id,
        nome: `${pref.nome.toUpperCase()} / ${banco.nome.toUpperCase()}`,
      });
    }
  };

  if (bancos.length === 0 || prefeituras.length === 0) {
    return (
      <div style={{
        padding: 16, borderRadius: 12, border: "1px dashed var(--border-strong)",
        background: "var(--bg-elev)", fontSize: 13, color: "var(--text-muted)",
      }}>
        Cadastre pelo menos <b>1 banco</b> e <b>1 prefeitura</b> antes de criar convênios.
        <div style={{ marginTop: 4, color: "var(--text-dim)" }}>
          {bancos.length === 0 ? "Nenhum banco cadastrado. " : null}
          {prefeituras.length === 0 ? "Nenhuma prefeitura cadastrada." : null}
        </div>
      </div>
    );
  }

  return (
    <section style={{
      padding: 16, borderRadius: 12, border: "1px solid var(--border-strong)",
      background: "var(--surface)", display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div>
        <div style={{ fontSize: 12, letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Matriz de convênios
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
          Marque as células pra criar/desativar convênios com valores padrão. Ajustes finos (verba, corte, prazo) no botão ✎ da linha abaixo.
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "auto", minWidth: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid var(--border)", color: "var(--text-dim)", fontWeight: 600 }}>
                Prefeitura ↓ / Banco →
              </th>
              {bancos.map((b) => (
                <th key={b.id} style={{
                  padding: "8px 12px", textAlign: "center",
                  borderBottom: "1px solid var(--border)",
                  color: "var(--text)", fontWeight: 700, minWidth: 120,
                }}>
                  {b.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prefeituras.map((p) => (
              <tr key={p.id}>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>
                  {p.nome}<span style={{ color: "var(--text-dim)", fontWeight: 400 }}>/{p.uf}</span>
                </td>
                {bancos.map((b) => {
                  const key = `${b.id}:${p.id}`;
                  const on = cell.has(key);
                  const busy = pending === key;
                  return (
                    <td key={b.id} style={{ padding: "6px", borderBottom: "1px solid var(--border)", textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => toggle(b, p)}
                        disabled={busy}
                        title={on ? "Desativar convênio" : "Ativar convênio com padrões (verba PADRAO, corte 15, repasse 5)"}
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          border: `1px solid ${on ? "var(--emerald-500)" : "var(--border-strong)"}`,
                          background: on ? "color-mix(in srgb, var(--emerald-500) 20%, transparent)" : "transparent",
                          color: on ? "var(--emerald-500)" : "var(--text-dim)",
                          cursor: busy ? "wait" : "pointer",
                          fontSize: 16, fontWeight: 700,
                          opacity: busy ? 0.5 : 1,
                          transition: "background .12s, border-color .12s",
                        }}
                      >
                        {busy ? "…" : on ? "✓" : ""}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ConvenioModal({
  initial, bancos, prefeituras, onClose,
}: {
  initial: AdminConvenio | null;
  bancos: AdminBanco[];
  prefeituras: AdminPrefeitura[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<AdminConvenioInput>({
    id: initial?.id,
    bancoId: initial?.bancoId ?? bancos[0]?.id ?? 1,
    prefeituraId: initial?.prefeituraId ?? prefeituras[0]?.id ?? 1,
    nome: initial?.nome ?? "",
    codigoVerba: initial?.codigoVerba ?? "",
    dataCorte: initial?.dataCorte ?? 15,
    diaRepasse: initial?.diaRepasse ?? 5,
  });
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => atlas.admin.upsertConvenio(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "convenios"] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Erro ao salvar"),
  });
  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={modalCard}>
        <h3 style={{ margin: 0 }}>{initial ? `Editar ${initial.nome}` : "Novo convênio"}</h3>
        <FormGrid cols={2}>
          <SelectField
            label="Banco"
            value={String(form.bancoId)}
            onChange={(e) => setForm({ ...form, bancoId: Number(e.target.value) })}
            options={bancos.map((b) => ({ value: String(b.id), label: b.nome }))}
          />
          <SelectField
            label="Prefeitura"
            value={String(form.prefeituraId)}
            onChange={(e) => setForm({ ...form, prefeituraId: Number(e.target.value) })}
            options={prefeituras.map((p) => ({ value: String(p.id), label: `${p.nome}/${p.uf}` }))}
          />
          <TextField label="Nome do convênio" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          <TextField label="Código verba" value={form.codigoVerba} onChange={(e) => setForm({ ...form, codigoVerba: e.target.value })} required />
          <NumberField label="Dia de corte" value={form.dataCorte} min={1} max={31} onChange={(e) => setForm({ ...form, dataCorte: Number(e.target.value) })} />
          <NumberField label="Dia de repasse" value={form.diaRepasse} min={1} max={31} onChange={(e) => setForm({ ...form, diaRepasse: Number(e.target.value) })} />
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

function ConfigModal({
  convenio, initial, onClose,
}: {
  convenio: AdminConvenio;
  initial: AdminConvenioConfig | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Omit<AdminConvenioConfig, "id" | "atualizadoEm">>({
    prazoTravaHoras: initial?.prazoTravaHoras ?? 48,
    prazoPortabilidadeDU: initial?.prazoPortabilidadeDU ?? 7,
    maxParcelas: initial?.maxParcelas ?? 72,
    taxaMaxAm: initial?.taxaMaxAm ?? 1.8,
    idadeMin: initial?.idadeMin ?? 18,
    idadeMax: initial?.idadeMax ?? 80,
    vinculosAceitos: initial?.vinculosAceitos ?? ["ESTATUTARIO"],
    formatoImportacao: initial?.formatoImportacao ?? "CSV",
    regrasEspeciais: initial?.regrasEspeciais ?? "",
    vigenciaInicio: initial?.vigenciaInicio ?? new Date().toISOString().slice(0, 10),
    vigenciaFim: initial?.vigenciaFim ?? "",
    ativo: initial?.ativo ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => atlas.admin.upsertConvenioConfig(convenio.id, { ...form, vigenciaFim: form.vigenciaFim || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "convenios", "configs"] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Erro ao salvar"),
  });
  const toggle = (v: VinculoAceito) => {
    setForm((f) => ({
      ...f,
      vinculosAceitos: f.vinculosAceitos.includes(v)
        ? f.vinculosAceitos.filter((x) => x !== v)
        : [...f.vinculosAceitos, v],
    }));
  };
  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalCard, maxWidth: 760 }}>
        <h3 style={{ margin: 0 }}>Configuração — {convenio.nome}</h3>
        <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 13 }}>
          Define prazos de trava de margem, regras de produto e formato de importação para este convênio.
        </p>
        <FormGrid cols={3}>
          <NumberField label="Trava regular (horas)" value={form.prazoTravaHoras} min={1} max={720} onChange={(e) => setForm({ ...form, prazoTravaHoras: Number(e.target.value) })} hint="Padrão 48h" />
          <NumberField label="Trava portabilidade (dias úteis)" value={form.prazoPortabilidadeDU} min={1} max={30} onChange={(e) => setForm({ ...form, prazoPortabilidadeDU: Number(e.target.value) })} hint="Padrão 7du" />
          <NumberField label="Máx. parcelas" value={form.maxParcelas} min={1} max={120} onChange={(e) => setForm({ ...form, maxParcelas: Number(e.target.value) })} />
          <NumberField label="Taxa máx. a.m. (%)" value={form.taxaMaxAm} min={0} max={20} step={0.01} onChange={(e) => setForm({ ...form, taxaMaxAm: Number(e.target.value) })} />
          <NumberField label="Idade mín." value={form.idadeMin} min={0} max={120} onChange={(e) => setForm({ ...form, idadeMin: Number(e.target.value) })} />
          <NumberField label="Idade máx." value={form.idadeMax} min={1} max={120} onChange={(e) => setForm({ ...form, idadeMax: Number(e.target.value) })} />
          <SelectField
            label="Formato de importação"
            value={form.formatoImportacao}
            onChange={(e) => setForm({ ...form, formatoImportacao: e.target.value as FormatoImportacao })}
            options={[{ value: "CSV", label: "CSV" }, { value: "EXCEL", label: "EXCEL" }, { value: "API", label: "API" }]}
          />
          <TextField label="Vigência início" type="date" value={form.vigenciaInicio} onChange={(e) => setForm({ ...form, vigenciaInicio: e.target.value })} />
          <TextField label="Vigência fim (opcional)" type="date" value={form.vigenciaFim ?? ""} onChange={(e) => setForm({ ...form, vigenciaFim: e.target.value })} />
        </FormGrid>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Vínculos aceitos</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {VINCULOS.map((v) => {
              const on = form.vinculosAceitos.includes(v.value);
              return (
                <button
                  type="button"
                  key={v.value}
                  onClick={() => toggle(v.value)}
                  style={{
                    padding: "6px 12px", borderRadius: 999, border: "1px solid",
                    borderColor: on ? "var(--emerald-500)" : "var(--border-strong)",
                    background: on ? "var(--emerald-500)" : "transparent",
                    color: on ? "var(--navy-900)" : "var(--text)",
                    cursor: "pointer", fontSize: 13, fontWeight: 600,
                  }}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
        <TextareaField
          label="Regras especiais"
          value={form.regrasEspeciais}
          onChange={(e) => setForm({ ...form, regrasEspeciais: e.target.value })}
          hint="Ex.: refin permitido após 12 parcelas; portabilidade exige biometria; etc."
          rows={3}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input id="conv-cfg-ativo" type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
          <label htmlFor="conv-cfg-ativo" style={{ fontSize: 13 }}>Convênio vigente / aceitando novas operações</label>
        </div>
        {error ? <div style={{ color: "var(--danger-500)", fontSize: 13 }}>{error}</div> : null}
        <FormActions>
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Salvando..." : "Salvar configuração"}</Button>
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
  maxHeight: "calc(100vh - 48px)", overflowY: "auto",
};
