import type { CSSProperties, ReactNode } from "react";

export const inp: CSSProperties = { padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", fontSize: 14, width: "100%" };

/** Download a protected endpoint attaching the stored JWT (a plain <a> can't send headers). */
export async function downloadAuthed(url: string, filename: string): Promise<void> {
  const raw = typeof window !== "undefined" ? window.localStorage.getItem("atlas:tokens") : null;
  const token = raw ? (JSON.parse(raw) as { access_token?: string }).access_token : null;
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) { alert(`Erro ao baixar (HTTP ${res.status}).`); return; }
  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objUrl);
}
export const selStyle: CSSProperties = { ...inp, cursor: "pointer" };

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
      <div>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>Prefeitura</span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>{title}</h1>
        {subtitle ? <p style={{ color: "var(--text-muted)", marginTop: 4 }}>{subtitle}</p> : null}
      </div>
      {actions ? <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{actions}</div> : null}
    </header>
  );
}

export function Modal({ title, onClose, children, maxWidth = 560 }: { title: string; onClose: () => void; children: ReactNode; maxWidth?: number }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 100, padding: 24 }} onClick={onClose}>
      <div style={{ background: "var(--surface-solid, var(--surface))", borderRadius: 12, padding: 24, maxWidth, width: "100%", border: "1px solid var(--border)", maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function Field({ lbl, children, hint }: { lbl: string; children: ReactNode; hint?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase" }}>{lbl}</span>
      {children}
      {hint ? <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{hint}</span> : null}
    </label>
  );
}
