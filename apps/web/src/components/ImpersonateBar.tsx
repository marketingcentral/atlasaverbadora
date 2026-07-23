import { useEffect, useState } from "react";
import { readImpersonateMeta, exitImpersonate, type ImpersonateMeta } from "../lib/sdk";

/**
 * Barra fixa no topo que aparece quando um admin da averbadora esta agindo
 * como servidor. Clicar em "Voltar pra averbadora" restaura os tokens
 * originais + redireciona pro painel de origem. Tambem re-le o localStorage
 * ao focar a janela (ex: usuario abriu impersonate em outra aba).
 */
export function ImpersonateBar() {
  const [meta, setMeta] = useState<ImpersonateMeta | null>(() => readImpersonateMeta());

  useEffect(() => {
    const refresh = () => setMeta(readImpersonateMeta());
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    // Poll leve pra pegar mudancas na mesma aba (localStorage.setItem nao
    // dispara evento no window que setou — so em outras abas).
    const id = window.setInterval(refresh, 1500);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.clearInterval(id);
    };
  }, []);

  if (!meta) return null;

  const voltar = () => {
    const parentRole = exitImpersonate();
    const destino = parentRole === "averbadora" ? "/averbadora/servidores/visualizar"
      : parentRole === "banco" ? "/banco"
      : parentRole === "prefeitura" ? "/prefeitura"
      : "/login";
    window.location.assign(destino);
  };

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        background: "linear-gradient(90deg, var(--gold-500) 0%, color-mix(in srgb, var(--gold-500) 70%, var(--danger-500)) 100%)",
        color: "#111",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        borderBottom: "1px solid rgba(0,0,0,0.15)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 16 }}>🎭</span>
        <span>
          Modo <b>impersonate</b> — você está agindo como{" "}
          <b>{meta.nome}</b>{" "}
          <span style={{ opacity: 0.75, fontFamily: "var(--font-mono)", fontSize: 12 }}>
            ({meta.matricula} · {meta.cpfMasked})
          </span>
        </span>
      </div>
      <button
        type="button"
        onClick={voltar}
        style={{
          background: "rgba(0,0,0,0.85)",
          color: "#fff",
          border: "1px solid rgba(0,0,0,0.9)",
          padding: "6px 14px",
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        ← Voltar pra averbadora
      </button>
    </div>
  );
}

/** Wrapper: adiciona padding-top no children quando o impersonate ta ativo,
 *  pra a barra fixa nao cobrir o topo da tela. Mount uma vez em App.tsx
 *  (ou similar) envolvendo o Router. */
export function ImpersonateOffset({ children }: { children: React.ReactNode }) {
  const [meta, setMeta] = useState<ImpersonateMeta | null>(() => readImpersonateMeta());
  useEffect(() => {
    const refresh = () => setMeta(readImpersonateMeta());
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    const id = window.setInterval(refresh, 1500);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.clearInterval(id);
    };
  }, []);
  return (
    <div style={{ paddingTop: meta ? 44 : 0, transition: "padding-top 0.2s" }}>{children}</div>
  );
}
