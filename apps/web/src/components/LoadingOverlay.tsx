import { useEffect, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";

/**
 * Duracoes do overlay:
 * - MIN_MS: piso pra evitar "flash" se a troca for cache-hit instantaneo.
 * - GRACE_MS: janela apos o clique pra as invalidacoes dispararem refetch.
 *   Sem isso o overlay poderia fechar antes das queries entrarem em voo,
 *   se o setActive.mutate + invalidateQueries levam mais tempo que MIN_MS.
 * - MAX_MS: teto fail-safe se algo travar (ex: backend fora do ar).
 */
const MIN_MS = 900;
const GRACE_MS = 1_500;
const MAX_MS = 5_000;

/** Estado do overlay pra o consumidor renderizar. Nulo quando escondido. */
export type TrocaState = { subtitulo: string } | null;

/**
 * Hook pra orquestrar overlays de "carregando" ao trocar de escopo (convenio,
 * matricula, ...). Uso: chamar `iniciar(subtitulo, queryKeyPrefix)` no clique
 * do switcher.
 *
 * Fluxo:
 * 1. iniciar() marca ativo=true e comeca contagem.
 * 2. Espera as queries do prefix entrarem em voo (invalidacao disparou refetch).
 *    A janela GRACE_MS da tempo pra isso acontecer mesmo em rede rapida.
 * 3. Uma vez que viu queries em voo, fecha quando (a) piso passou E (b) todas
 *    as queries terminaram. Sem isso, fechava antes de as refetches comecarem.
 * 4. Teto MAX_MS garante que nunca fica preso se algo travar.
 */
export function useTrocaOverlay(): {
  troca: TrocaState;
  iniciar: (subtitulo: string, queryKeyPrefix: unknown[]) => void;
} {
  const [troca, setTroca] = useState<TrocaState>(null);
  const [ativo, setAtivo] = useState<{ prefix: unknown[]; iniciadoEm: number } | null>(null);
  // Marca se em algum momento vimos queries em voo depois do clique — indica
  // que a invalidacao/refetch de fato aconteceu.
  const [viuFetching, setViuFetching] = useState(false);
  // Tick a cada 100ms pra o useEffect abaixo re-avaliar elapsed sem depender
  // de closure. Sem ele, se pending nunca muda (cache hit), o hook nunca
  // reavaliaria o elapsed contra MIN/MAX.
  const [tick, setTick] = useState(0);

  const pending = useIsFetching(ativo ? { queryKey: ativo.prefix } : undefined);

  // Timer 100ms enquanto o overlay estiver ativo (dispara re-avaliacao).
  useEffect(() => {
    if (!ativo) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 100);
    return () => window.clearInterval(id);
  }, [ativo]);

  // Marca viuFetching na primeira vez que ve queries em voo.
  useEffect(() => {
    if (ativo && pending > 0 && !viuFetching) setViuFetching(true);
  }, [ativo, pending, viuFetching]);

  // Decide fechamento. Roda a cada mudanca de tick/pending/viuFetching.
  useEffect(() => {
    if (!ativo) return;
    const elapsed = Date.now() - ativo.iniciadoEm;

    // Teto absoluto — fail-safe.
    if (elapsed >= MAX_MS) {
      setAtivo(null); setTroca(null); setViuFetching(false);
      return;
    }

    // Ainda dentro do piso — nao fecha independente do pending.
    if (elapsed < MIN_MS) return;

    // Passou o piso. Se viu queries em voo E ja terminaram, fecha.
    if (viuFetching && pending === 0) {
      setAtivo(null); setTroca(null); setViuFetching(false);
      return;
    }

    // Passou o piso mas ainda nao viu queries em voo — espera ate o fim
    // da janela GRACE (chance da invalidacao disparar em rede mais lenta).
    // Depois do grace, se nao viu nada, e' cache-hit puro: pode fechar.
    if (!viuFetching && elapsed >= MIN_MS + GRACE_MS) {
      setAtivo(null); setTroca(null); setViuFetching(false);
    }
  }, [ativo, pending, viuFetching, tick]);

  const iniciar = (subtitulo: string, queryKeyPrefix: unknown[]) => {
    setViuFetching(false);
    setTick(0);
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
