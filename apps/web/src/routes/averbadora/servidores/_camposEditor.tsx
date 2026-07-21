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
  presetTemplateUrl,
}: {
  campos: ServidorCampoConfig[];
  onChange: (next: ServidorCampoConfig[]) => void;
  onSave: () => void;
  /** Salva IMEDIATAMENTE com a lista fornecida (sem esperar re-render).
   *  Usado pelo "+ Adicionar": append custom + persist na mesma acao. */
  onSaveWith: (campos: ServidorCampoConfig[]) => void;
  onRestoreDefault: () => void;
  saving: boolean;
  dirty: boolean;
  /** Se fornecido, cada custom ganha botao "Baixar exemplo deste preset"
   *  que usa a URL retornada. `presetKey` = campo custom.key (custom_slug). */
  presetTemplateUrl?: (presetKey: string) => string;
}) {
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState<ServidorCampoTipo>("texto");
  // Drag & drop pra reordenar linhas segurando (alem dos botoes ↑↓). Guarda
  // apenas o indice da linha sendo arrastada; a reordem acontece em dragOver
  // do target usando o mesmo move() dos botoes (mas com step arbitrario).
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
    let next = campos.slice();
    next[idx] = { ...c, ...patch };
    // Regra bidirecional (cliente 21/07/2026):
    //  - MARCAR visivel de um preset custom -> DESMARCA sistema (menos travados).
    //  - DESMARCAR visivel de um custom (e nao sobrar outro custom visivel)
    //    -> RE-MARCA sistema visivel:true (obrigatorio fica off).
    if (!c.sistema && patch.visivel === true) {
      next = next.map((x) => x.sistema && !x.travado ? { ...x, visivel: false, obrigatorio: false } : x);
    } else if (!c.sistema && patch.visivel === false) {
      const aindaTemCustomVisivel = next.some((x) => !x.sistema && x.visivel);
      if (!aindaTemCustomVisivel) {
        next = next.map((x) => x.sistema && !x.travado ? { ...x, visivel: true } : x);
      }
    }
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
    let next = campos.filter((_, i) => i !== idx).map((c, i) => ({ ...c, ordem: i }));
    // Removeu ultimo custom visivel -> re-marca sistema (mesmo padrao do desmarcar).
    const aindaTemCustomVisivel = next.some((x) => !x.sistema && x.visivel);
    if (!aindaTemCustomVisivel) {
      next = next.map((x) => x.sistema && !x.travado ? { ...x, visivel: true } : x);
    }
    onChange(next);
  };

  const addCustom = () => {
    const slug = slugify(novoNome);
    if (!slug) return;
    const key = `custom_${slug}`;
    if (campos.some((c) => c.key === key)) return;
    // Captura SNAPSHOT dos sistema fields no estado atual — este preset
    // "lembra" o que estava marcado ao criar. csv-template deste preset
    // (via ?preset=<key>) usa exatamente esse snapshot.
    const snapshot: ServidorCampoConfig[] = campos
      .filter((c) => c.sistema)
      .map((c) => ({ ...c }));
    // Novo custom visivel:true -> DESMARCA sistema (mesma regra do toggle).
    const semSistema = campos.map((x) => x.sistema && !x.travado ? { ...x, visivel: false, obrigatorio: false } : x);
    const nextCampos: ServidorCampoConfig[] = [
      ...semSistema,
      {
        key,
        label: novoNome.trim(),
        tipo: novoTipo,
        obrigatorio: false,
        visivel: true,
        ordem: semSistema.length,
        sistema: false,
        snapshotCampos: snapshot,
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
            Ligue/desligue os campos, marque obrigatórios e edite os rótulos. Use "Salvar" abaixo — se preencher o nome do campo, cria um preset novo com o snapshot atual. CPF e matrícula ficam travados (identidade do servidor).
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
                  // Draggable NAO fica no <tr> inteiro — so no handle ⋮⋮.
                  // Antes: draggable no tr pegava eventos de clique em input/
                  // select da linha e disparava drag acidental. Agora o drag
                  // so comeca quando o usuario segura o ⋮⋮ explicitamente.
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
                        // O handle e' o UNICO elemento draggable. Segurar aqui
                        // inicia o drag da linha inteira; segurar qualquer
                        // outro lugar (input, select, etc) NAO dispara drag.
                        draggable={!bloqueado}
                        onDragStart={(e) => {
                          if (bloqueado) return;
                          setDragIdx(i);
                          e.dataTransfer.effectAllowed = "move";
                          try { e.dataTransfer.setData("text/plain", String(i)); } catch { /* ignore */ }
                        }}
                        onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                        title={bloqueado ? "Campo travado — nao pode reordenar" : "Segure aqui e arraste pra reordenar"}
                        style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 20, height: 26, color: "var(--text-dim)", fontSize: 14, fontWeight: 700,
                          cursor: bloqueado ? "not-allowed" : "grab", userSelect: "none",
                          opacity: bloqueado ? 0.3 : 0.7,
                          borderRadius: 4,
                        }}
                        onMouseDown={(e) => { if (!bloqueado) e.currentTarget.style.cursor = "grabbing"; }}
                        onMouseUp={(e) => { e.currentTarget.style.cursor = bloqueado ? "not-allowed" : "grab"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.cursor = bloqueado ? "not-allowed" : "grab"; }}
                      >⋮⋮</span>
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
                      // Tipo editavel em TODOS os campos (menos travados cpf/
                      // matricula). Antes sistema tinha tipo travado; agora
                      // averbadora pode ajustar (ex.: mudar salarioLiquido
                      // de moeda pra numero, ou telefone pra texto).
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
                      <div style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                        {presetTemplateUrl ? (
                          <a
                            href={presetTemplateUrl(c.key)}
                            download
                            title="Baixar CSV modelo deste preset (com colunas snapshot)"
                            style={{
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                              width: 26, height: 26, borderRadius: 6,
                              border: "1px solid var(--gold-500)",
                              background: "transparent", color: "var(--gold-500)",
                              cursor: "pointer", fontSize: 12, textDecoration: "none",
                            }}
                          >↓</a>
                        ) : null}
                        <button type="button" style={removeBtn} onClick={() => removeCampo(i)} title="Remover campo custom">✕</button>
                      </div>
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
          Salvar alterações {"/"}  criar preset customizado
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
          Preencha o nome pra criar um preset novo (captura snapshot dos sistema visíveis).
          Deixe vazio pra só salvar as alterações dos campos sem criar preset.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 10, alignItems: "end" }}>
          <TextField label="Nome do campo (opcional)" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="ex.: Lotação (deixe vazio pra só salvar)" />
          <SelectField label="Tipo" value={novoTipo} onChange={(e) => setNovoTipo(e.target.value as ServidorCampoTipo)} options={TIPOS.map((t) => ({ value: t.value, label: t.label }))} />
          <Button
            size="sm"
            onClick={() => {
              if (novoNome.trim()) {
                addCustom(); // cria preset + salva
              } else {
                onSave(); // so salva estado atual
              }
            }}
            disabled={saving || (!novoNome.trim() && !dirty)}
            type="button"
          >
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
        {novoNome.trim() ? (
          <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-dim)" }}>
            Key do preset: <code style={{ fontFamily: "var(--font-mono)" }}>custom_{slugify(novoNome)}</code>
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
  // Centralizacao do ✕ (antes ficava desalinhado por causa do line-height do char).
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  padding: 0, fontSize: 14, lineHeight: 1,
};
