import { useEffect, useRef, useState } from "react";
import {
  MATRICULAS,
  readActiveIdMatricula,
  setActiveMatricula,
  STORAGE_KEY_ID,
  STORAGE_KEY_META,
  STORAGE_KEY_LIST,
} from "../lib/matricula-data";

// Seletor de matricula no canto do header — aparece SO quando o servidor tem mais
// de uma matricula (acumulacao legal de cargos). Troca inline (sem sair da tela):
// grava a matricula ativa e dispara o evento de storage que todas as telas do
// servidor ja escutam para re-ler os dados da matricula selecionada.
export function MatriculaSwitcher() {
  const [open, setOpen] = useState(false);
  const [, force] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Re-renderiza quando as matriculas hidratam do backend ou a ativa muda.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === STORAGE_KEY_META || e.key === STORAGE_KEY_ID || e.key === STORAGE_KEY_LIST) {
        force((n) => n + 1);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const activeId = readActiveIdMatricula();
  const ativa = MATRICULAS.find((m) => m.idMatricula === activeId) ?? MATRICULAS[0];
  // O switcher so faz sentido com mais de uma matricula.
  if (MATRICULAS.length < 2 || !ativa) return null;

  function trocar(idMatricula: string) {
    if (idMatricula !== activeId) {
      setActiveMatricula(idMatricula);
      // setActiveMatricula nao dispara 'storage' na propria aba — emitimos manualmente
      // para que dashboard/margem/contratos/etc. releiam a matricula ativa na hora.
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY_META }));
    }
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Trocar matrícula"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderRadius: 999,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          cursor: "pointer",
          color: "var(--text)",
          maxWidth: 220,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--emerald-500)", flexShrink: 0 }} />
        <span style={{ minWidth: 0, textAlign: "left", lineHeight: 1.15 }}>
          <span style={{ display: "block", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
            {ativa.matricula}
          </span>
          <span
            style={{
              display: "block",
              fontSize: 10.5,
              color: "var(--text-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 150,
            }}
          >
            {ativa.cargo}
          </span>
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: ".8rem", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0 }}>
          ▾
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 260,
            background: "var(--bg-elev)",
            border: "1px solid var(--border-strong)",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(0,0,0,.45)",
            padding: 8,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            zIndex: 300,
          }}
        >
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700, padding: "6px 8px 2px" }}>
            Selecione a matrícula
          </div>
          {MATRICULAS.map((m) => {
            const isActive = m.idMatricula === activeId;
            return (
              <button
                key={m.idMatricula}
                type="button"
                role="menuitem"
                onClick={() => trocar(m.idMatricula)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 10px",
                  borderRadius: 10,
                  background: isActive ? "var(--surface)" : "transparent",
                  border: "1px solid " + (isActive ? "var(--border)" : "transparent"),
                  cursor: "pointer",
                  textAlign: "left",
                  color: "var(--text)",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--surface)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <span
                  style={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    background: isActive ? "var(--emerald-500)" : "var(--border-strong)",
                  }}
                />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, fontFamily: "var(--font-mono)" }}>{m.matricula}</span>
                    <span style={{ fontSize: 11.5, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.prefeitura}</span>
                  </span>
                  <span style={{ display: "block", fontSize: 11, color: "var(--text-dim)", marginTop: 1 }}>{m.cargo}</span>
                </span>
                {isActive ? (
                  <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".05em", color: "var(--emerald-500)", border: "1px solid var(--emerald-500)", borderRadius: 999, padding: "1px 6px", flexShrink: 0 }}>
                    ATIVA
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
