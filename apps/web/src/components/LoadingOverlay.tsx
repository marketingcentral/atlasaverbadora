import { useEffect, useRef, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";

/** Piso e teto de exibicao do overlay em ms. */
const MIN_MS = 800;
const MAX_MS = 5_000;

/** Estado do overlay pra o consumidor renderizar. Nulo quando escondido. */
export type TrocaState = { subtitulo: string } | null;

/**
 * Hook pra orquestrar overlays de "carregando" ao trocar de escopo (convenio,
 * matricula, ...). Uso: chamar `iniciar(subtitulo, queryKeyPrefix)` no clique
 * do switcher. O overlay fica visivel enquanto queries com esse prefix
 * estiverem em voo, com piso de MIN_MS (evita "flash") e teto de MAX_MS
 * (fail-safe se algo travar).
 */
export function useTrocaOverlay(): {
  troca: TrocaState;
  iniciar: (subtitulo: string, queryKeyPrefix: unknown[]) => void;
} {
  const [troca, setTroca] = useState<TrocaState>(null);
  const [ativo, setAtivo] = useState<{ prefix: unknown[]; iniciadoEm: number } | null>(null);

  // Query em voo do prefix atual — undefined enquanto nao ha overlay.
  const pending = useIsFetching(ativo ? { queryKey: ativo.prefix } : undefined);

  // Estabiliza tick pra fechar quando pending===0 && elapsed>=MIN.
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!ativo) return;
    const tick = () => {
      const elapsed = Date.now() - ativo.iniciadoEm;
      if (elapsed >= MAX_MS) {
        setAtivo(null); setTroca(null); return;
      }
      if (pending === 0 && elapsed >= MIN_MS) {
        setAtivo(null); setTroca(null); return;
      }
      rafRef.current = window.setTimeout(tick, 100);
    };
    tick();
    return () => { if (rafRef.current) window.clearTimeout(rafRef.current); };
  }, [ativo, pending]);

  const iniciar = (subtitulo: string, queryKeyPrefix: unknown[]) => {
    setTroca({ subtitulo });
    setAtivo({ prefix: queryKeyPrefix, iniciadoEm: Date.now() });
  };

  return { troca, iniciar };
}

/**
 * Overlay full-screen com spinner + eyebrow + subtitulo. Renderizado por cima
 * de tudo (z-index 9999). Bloqueia interacao pela duracao. Theme-aware.
 */
export function LoadingOverlay({ eyebrow, subtitulo }: { eyebrow: string; subtitulo: string }) {
  return (
    <>
      <style>{`@keyframes atlas-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "grid", placeItems: "center",
          background: "color-mix(in srgb, var(--bg) 88%, transparent)",
          backdropFilter: "blur(4px)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: 32, maxWidth: 360, textAlign: "center" }}>
          <div
            aria-hidden
            style={{
              width: 56, height: 56, borderRadius: "50%",
              border: "3px solid color-mix(in srgb, var(--accent) 20%, transparent)",
              borderTopColor: "var(--accent)",
              animation: "atlas-spin 900ms linear infinite",
            }}
          />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)" }}>
              {eyebrow}
            </div>
            <div style={{ marginTop: 6, fontSize: "1.05rem", fontWeight: 700, color: "var(--text)" }}>
              {subtitulo}
            </div>
            <div style={{ marginTop: 4, fontSize: 13, color: "var(--text-muted)" }}>
              Carregando dados...
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
