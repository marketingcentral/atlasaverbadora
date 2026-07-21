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
  onRestoreDefault,
  saving,
  dirty,
}: {
  campos: ServidorCampoConfig[];
  onChange: (next: ServidorCampoConfig[]) => void;
  onSave: () => void;
  onRestoreDefault: () => void;
  saving: boolean;
  dirty: boolean;
}) {
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState<ServidorCampoTipo>("texto");

  const updateCampo = (idx: number, patch: Partial<ServidorCampoConfig>) => {
    const next = campos.slice();
    next[idx] = { ...next[idx]!, ...patch };
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
    onChange(campos.filter((_, i) => i !== idx).map((c, i) => ({ ...c, ordem: i })));
  };

  const addCustom = () => {
    const slug = slugify(novoNome);
    if (!slug) return;
    const key = `custom_${slug}`;
    if (campos.some((c) => c.key === key)) return;
    onChange([
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
    ]);
    setNovoNome("");
    setNovoTipo("texto");
  };

  return (
    <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Campos do servidor</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            Ligue/desligue os campos, marque obrigatórios e edite os rótulos. Alterações salvam automaticamente. CPF e matrícula ficam travados (identidade do servidor).
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: saving ? "var(--gold-500)" : dirty ? "var(--gold-500)" : "var(--emerald-500)" }}>
            {saving ? "Salvando..." : dirty ? "Alterações não salvas" : "✓ Tudo salvo"}
          </span>
          <Button size="sm" variant="ghost" onClick={onRestoreDefault} type="button">Restaurar padrão</Button>
          <Button size="sm" onClick={onSave} disabled={saving || !dirty} type="button">
            {saving ? "Salvando…" : dirty ? "Salvar agora" : "Salvo"}
          </Button>
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
              return (
                <tr key={c.key} style={{ borderTop: "1px solid var(--border)", opacity: c.visivel ? 1 : 0.55 }}>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 2 }}>
                      <button type="button" style={arrowBtn} onClick={() => move(i, -1)} disabled={i === 0} title="Subir">↑</button>
                      <button type="button" style={arrowBtn} onClick={() => move(i, +1)} disabled={i === campos.length - 1} title="Descer">↓</button>
                    </div>
                  </td>
                  <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
                    {c.key}{c.sistema ? "" : " (custom)"}
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
                      disabled={bloqueado || c.sistema}
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
                      <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{bloqueado ? "travado" : "sistema"}</span>
                    ) : (
                      <button type="button" style={removeBtn} onClick={() => removeCampo(i)} title="Remover campo custom">✕</button>
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
          Adicionar campo customizado
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 10, alignItems: "end" }}>
          <TextField label="Nome do campo" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="ex.: Lotação" />
          <SelectField label="Tipo" value={novoTipo} onChange={(e) => setNovoTipo(e.target.value as ServidorCampoTipo)} options={TIPOS.map((t) => ({ value: t.value, label: t.label }))} />
          <Button size="sm" onClick={addCustom} disabled={!novoNome.trim()} type="button">+ Adicionar</Button>
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
};
