import { useState } from "react";
import { Button, TextField, SelectField } from "@atlas/ui/web";
import type { ServidorCampoConfig, ServidorCampoTipo } from "@atlas/sdk";

const TIPOS: { value: ServidorCampoTipo; label: string }[] = [
  { value: "texto", label: "Texto" },
  { value: "numero", label: "Número" },
  { value: "data", label: "Data" },
  { value: "moeda", label: "Moeda" },
  { value: "email", label: "E-mail" },
  { value: "telefone", label: "Telefone" },
];

/** slug pra key de campo custom: minusculo, sem acento, snake. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function CamposEditor({
  campos,
  onChange,
  onSave,
  onSaveWith,
  onRestoreDefault,
  saving,
  dirty,
}: {
  campos: ServidorCampoConfig[];
  onChange: (next: ServidorCampoConfig[]) => void;
  onSave: () => void;
  /** Salva IMEDIATAMENTE com a lista fornecida (sem esperar re-render).
   *  Usado pelo "+ Adicionar campo": append + persist na mesma acao. */
  onSaveWith: (campos: ServidorCampoConfig[]) => void;
  onRestoreDefault: () => void;
  saving: boolean;
  dirty: boolean;
}) {
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState<ServidorCampoTipo>("texto");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    const next = campos.slice();
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    onChange(next.map((c, i) => ({ ...c, ordem: i })));
  };

  const updateCampo = (idx: number, patch: Partial<ServidorCampoConfig>) => {
    const c = campos[idx];
    if (!c) return;
    const next = campos.slice();
    next[idx] = { ...c, ...patch };
    onChange(next);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= campos.length) return;
    const next = campos.slice();
    [next[idx], next[j]] = [next[j]!, next[idx]!];
    onChange(next.map((c, i) => ({ ...c, ordem: i })));
  };

  const removeCampo = (idx: number) => {
    const c = campos[idx];
    if (!c || c.sistema || c.travado) return;
    const next = campos.filter((_, i) => i !== idx).map((c, i) => ({ ...c, ordem: i }));
    onChange(next);
  };

  const addCustom = () => {
    const slug = slugify(novoNome);
    if (!slug) return;
    const key = `custom_${slug}`;
    if (campos.some((c) => c.key === key)) return;
    // Custom vira APENAS UM CAMPO A MAIS na lista — mesmo padrao dos sistema
    // fields, sem snapshot, sem substituir os visiveis, sem regra bidirecional.
    // (Modelo antigo de "preset" foi removido 23/07/2026 a pedido do cliente.)
    const nextCampos: ServidorCampoConfig[] = [
      ...campos,
      {
        key,
        label: novoNome.trim(),
        tipo: novoTipo,
        obrigatorio: false,
        visivel: true,
        ordem: campos.length,
        sistema: false,
      },
    ];
    onChange(nextCampos);
    onSaveWith(nextCampos);
    setNovoNome("");
    setNovoTipo("texto");
  };

  return (
    <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Campos do servidor</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            Ligue/desligue campos, marque obrigatórios e edite os rótulos. Campos personalizados aparecem junto com os do sistema. CPF e matrícula ficam travados (identidade do servidor).
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {saving ? (
            <span style={{ fontSize: 12, color: "var(--gold-500)" }}>Salvando...</span>
          ) : null}
          <Button size="sm" variant="ghost" onClick={onRestoreDefault} type="button">Restaurar padrão</Button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--bg-elev-2)" }}>
              <th style={th}>#</th>
              <th style={th}>Key</th>
              <th style={th}>Rótulo</th>
              <th style={th}>Tipo</th>
              <th style={{ ...th, textAlign: "center" }}>Visível</th>
              <th style={{ ...th, textAlign: "center" }}>Obrigatório</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {campos.sort((a, b) => a.ordem - b.ordem).map((c, i) => {
              const bloqueado = c.travado === true;
              const arrastando = dragIdx === i;
              const alvo = overIdx === i && dragIdx != null && dragIdx !== i;
              return (
                <tr
                  key={c.key}
                  onDragOver={(e) => {
                    if (dragIdx == null || dragIdx === i) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (overIdx !== i) setOverIdx(i);
                  }}
                  onDragLeave={() => { if (overIdx === i) setOverIdx(null); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIdx != null && dragIdx !== i) reorder(dragIdx, i);
                    setDragIdx(null);
                    setOverIdx(null);
                  }}
                  style={{
                    borderTop: "1px solid var(--border)",
                    opacity: c.visivel ? (arrastando ? 0.4 : 1) : 0.55,
                    background: alvo ? "color-mix(in srgb, var(--gold-500) 12%, transparent)" : undefined,
                  }}
                >
                  <td style={td}>
                    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                      <span
                        draggable={!bloqueado}
                        onDragStart={(e) => {
                          if (bloqueado) return;
                          setDragIdx(i);
                          e.dataTransfer.effectAllowed = "move";
                          try { e.dataTransfer.setData("text/plain", String(i)); } catch { /* ignore */ }
                        }}
                        onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                        title={bloqueado ? "Campo travado — não pode reordenar" : "Segure aqui e arraste pra reordenar"}
                        style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 20, height: 26, color: "var(--text-dim)", fontSize: 14, fontWeight: 700,
                          cursor: bloqueado ? "not-allowed" : "grab", userSelect: "none",
                          opacity: bloqueado ? 0.3 : 0.7,
                          borderRadius: 4,
                        }}
                      >⋮⋮</span>
                      <button type="button" style={arrowBtn} onClick={() => move(i, -1)} disabled={i === 0 || bloqueado} title="Subir">↑</button>
                      <button type="button" style={arrowBtn} onClick={() => move(i, +1)} disabled={i === campos.length - 1 || bloqueado} title="Descer">↓</button>
                    </div>
                  </td>
                  <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
                    {c.key}{c.sistema ? "" : " (personalizado)"}
                  </td>
                  <td style={td}>
                    <input
                      value={c.label}
                      onChange={(e) => updateCampo(i, { label: e.target.value })}
                      style={inputStyle}
                      disabled={bloqueado}
                    />
                  </td>
                  <td style={td}>
                    <select
                      value={c.tipo}
                      onChange={(e) => updateCampo(i, { tipo: e.target.value as ServidorCampoTipo })}
                      style={inputStyle}
                      disabled={bloqueado}
                    >
                      {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </td>
                  <td style={{ ...td, textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={c.visivel}
                      disabled={bloqueado}
                      onChange={(e) => updateCampo(i, { visivel: e.target.checked })}
                    />
                  </td>
                  <td style={{ ...td, textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={c.obrigatorio}
                      disabled={bloqueado}
                      onChange={(e) => updateCampo(i, { obrigatorio: e.target.checked })}
                    />
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    {c.sistema || bloqueado ? (
                      <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                        {bloqueado ? "travado" : "sistema"}
                      </span>
                    ) : (
                      <button type="button" style={removeBtn} onClick={() => removeCampo(i)} title="Remover campo personalizado">✕</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 8 }}>
          Adicionar campo personalizado
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
          O campo entra na lista junto com os do sistema. Depois é só marcar visível/obrigatório como qualquer outro.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto auto", gap: 10, alignItems: "end" }}>
          <TextField label="Nome do campo" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="ex.: Lotação" />
          <SelectField label="Tipo" value={novoTipo} onChange={(e) => setNovoTipo(e.target.value as ServidorCampoTipo)} options={TIPOS.map((t) => ({ value: t.value, label: t.label }))} />
          <Button
            size="sm"
            onClick={addCustom}
            disabled={saving || !novoNome.trim()}
            type="button"
          >
            + Adicionar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onSave}
            disabled={saving || !dirty}
            type="button"
          >
            {saving ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
        {novoNome.trim() ? (
          <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-dim)" }}>
            Key: <code style={{ fontFamily: "var(--font-mono)" }}>custom_{slugify(novoNome)}</code>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700,
  letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-dim)",
  whiteSpace: "nowrap",
};
const td: React.CSSProperties = { padding: "8px 12px", verticalAlign: "middle" };
const inputStyle: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border-strong)",
  background: "var(--surface)", color: "var(--text)", fontSize: 13, width: "100%",
};
const arrowBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 6, border: "1px solid var(--border-strong)",
  background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 12,
};
const removeBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 6, border: "1px solid var(--danger-500)",
  background: "transparent", color: "var(--danger-500)", cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  padding: 0, fontSize: 14, lineHeight: 1,
};
