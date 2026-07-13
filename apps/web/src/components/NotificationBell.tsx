import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  buildNotificationsFromPropostas,
  markAllAsRead,
  markAsRead,
  type NotifType,
  type Notification,
} from "../lib/notifications";
import { STORAGE_KEY_ID, STORAGE_KEY_META, readActiveMatricula } from "../lib/matricula-data";
import { atlas } from "../lib/sdk";
import type { EstadoProposta, Proposta } from "../lib/propostas-data";

/** Mesmo mapeamento de /servidor/contratos — situacao backend -> estado UI. */
function mapSituacao(situacao: string): EstadoProposta {
  const t = situacao.toLowerCase();
  if (t.includes("aguard")) return "em_analise";
  if (t.includes("cancel")) return "cancelada";
  if (t.includes("recus")) return "recusada";
  if (t.includes("suspens")) return "cancelada";
  if (t.includes("expir")) return "expirada";
  if (t.includes("quitad")) return "liberada";
  if (t.includes("ativo") || t.includes("averb")) return "liberada";
  return "em_analise";
}

const ICONS: Record<NotifType, string> = {
  proposta_em_analise: "📋",
  proposta_aprovada: "✅",
  proposta_aguardando_formalizacao: "📝",
  proposta_recusada: "❌",
  proposta_cancelada: "🚫",
  proposta_expirando: "⏰",
  folha_processada: "💼",
  oferta_banco: "🎁",
};

export function NotificationBell() {
  const nav = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Matricula ativa entra no queryKey → trocar matricula invalida o cache
  // automaticamente e o backend filtra por essa matricula (evita vazamento
  // de proposta entre matriculas do mesmo CPF).
  const [matAtiva, setMatAtiva] = useState<string | null>(() => readActiveMatricula()?.matricula ?? null);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_META || e.key === STORAGE_KEY_ID) {
        setMatAtiva(readActiveMatricula()?.matricula ?? null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Fonte unica com /servidor/contratos: mesma query, mesmo cache.
  // Poll rapido (5s) pra sensacao de tempo real — qualquer transicao de
  // estado (banco aceita, altera, recusa) aparece no sino em ate 5s.
  const q = useQuery({
    queryKey: ["servidor", "propostas", matAtiva],
    queryFn: () => atlas.servidor.propostas(matAtiva ?? undefined),
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
  });

  // Ofertas de credito criadas pelos bancos que casam com o perfil da matricula.
  // Poll de 30s (elas mudam pouco).
  const ofertasQ = useQuery({
    queryKey: ["servidor", "ofertas-banco", matAtiva],
    queryFn: () => atlas.servidor.getMyOfertasBanco(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
  });

  const propostas: Proposta[] = useMemo(
    () =>
      (q.data?.propostas ?? []).map((p) => ({
        id: p.id,
        banco: p.banco,
        estado: mapSituacao(p.situacao),
        valor: p.valor,
        parcelas: p.parcelas,
        parcela: p.parcela,
        taxaAm: p.taxaAm,
        criadaEm: p.data,
        expiraEm: p.expira_em ?? undefined,
      })),
    [q.data],
  );

  const [tickKey, setTickKey] = useState(0);
  const ofertas = ofertasQ.data?.ofertas ?? [];
  const notifs = useMemo(
    () => {
      void tickKey; // usado pra re-render periodico dos "ha Xmin" e countdown de promo relampago
      return buildNotificationsFromPropostas(propostas, ofertas);
    },
    [propostas, ofertas, tickKey],
  );

  // Recalcula "ha Xmin/Xh" e countdown de promo relampago. Se ha alguma oferta
  // com expiraEm em menos de 1h, refresh a cada 1s pra o countdown ser suave;
  // 24h -> 15s; caso contrario 30s (so pra atualizar "ha Xmin").
  useEffect(() => {
    const now = Date.now();
    const menorRestante = ofertas
      .map((o) => (o.expiraEm ? new Date(o.expiraEm).getTime() - now : Infinity))
      .filter((n) => Number.isFinite(n) && n > 0)
      .reduce((m, n) => Math.min(m, n), Infinity);
    const intervalo = menorRestante < 3600_000 ? 1_000
                    : menorRestante < 24 * 3600_000 ? 15_000
                    : 30_000;
    const i = setInterval(() => setTickKey((k) => k + 1), intervalo);
    return () => clearInterval(i);
  }, [ofertas]);

  // Storage: matricula/lidas mudou → forca re-render pra reaplicar filtros.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === STORAGE_KEY_META ||
        e.key === STORAGE_KEY_ID ||
        e.key === "atlas:notifications:read"
      ) {
        setTickKey((k) => k + 1);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Ao trocar de rota, refetch pra pegar mudancas depois de agir (ex.: criou
  // proposta em /termo e voltou).
  useEffect(() => {
    void q.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const unread = notifs.filter((n) => !n.lida).length;

  // Anima o sino (pulse dourado) toda vez que o contador de nao-lidas SOBE.
  // Alem da animacao, atualiza o title da aba pra "(N) Atlas" quando ha
  // pendencias — assim o usuario ve mesmo com a aba em background.
  const prevUnreadRef = useRef(unread);
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (unread > prevUnreadRef.current) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 1500);
      // Bipe curto opcional — silencioso se o browser bloquear autoplay.
      try {
        const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = 880;
          g.gain.value = 0.05;
          o.connect(g); g.connect(ctx.destination);
          o.start();
          o.stop(ctx.currentTime + 0.12);
          setTimeout(() => ctx.close(), 300);
        }
      } catch { /* autoplay policy */ }
      return () => clearTimeout(t);
    }
    prevUnreadRef.current = unread;
    return;
  }, [unread]);

  useEffect(() => {
    const base = "Atlas";
    document.title = unread > 0 ? `(${unread}) ${base}` : base;
    return () => { document.title = base; };
  }, [unread]);

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

  function abrirNotif(n: Notification) {
    markAsRead(n.id);
    setTickKey((k) => k + 1);
    setOpen(false);
    // Link externo (banco) abre em nova aba; navegacao interna leva pra
    // pagina com hash pra scrollar ate o card especifico.
    if (n.externalLink) {
      window.open(n.externalLink, "_blank", "noopener,noreferrer");
    }
    if (n.href) nav(n.href);
  }

  function marcarTodasLidas() {
    markAllAsRead(notifs.map((n) => n.id));
    setTickKey((k) => k + 1);
  }

  return (
    <div ref={ref} style={{ position: "relative", zIndex: 100 }}>
      <style>{`@keyframes atlas-bell-pulse { 0%{transform:scale(1);box-shadow:0 0 0 0 rgba(212,175,55,.6)} 50%{transform:scale(1.15);box-shadow:0 0 0 8px rgba(212,175,55,0)} 100%{transform:scale(1);box-shadow:0 0 0 0 rgba(212,175,55,0)} }`}</style>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notificações (${unread} não lidas)`}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          position: "relative",
          width: 36,
          height: 36,
          borderRadius: 999,
          background: "transparent",
          border: "1px solid var(--border)",
          color: "var(--text)",
          cursor: "pointer",
          fontSize: 16,
          display: "grid",
          placeItems: "center",
          animation: pulse ? "atlas-bell-pulse 1.4s ease-out" : undefined,
        }}
      >
        🔔
        {unread > 0 ? (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: "0 5px",
              borderRadius: 999,
              background: "var(--danger-500)",
              color: "white",
              fontSize: 10,
              fontWeight: 700,
              display: "grid",
              placeItems: "center",
              border: "2px solid var(--bg)",
            }}
          >
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 380,
            maxWidth: "calc(100vw - 32px)",
            background: "var(--surface-solid)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,.25)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--border)",
              position: "sticky",
              top: 0,
              background: "var(--surface-solid)",
              zIndex: 1,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: ".95rem" }}>Notificações</span>
            {unread > 0 ? (
              <button
                type="button"
                onClick={marcarTodasLidas}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "var(--accent)",
                  fontSize: ".82rem",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Marcar todas como lidas
              </button>
            ) : null}
          </div>

          <div style={{ maxHeight: 460, overflowY: "auto" }}>
            {notifs.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: ".88rem" }}>
                Nenhuma notificação para esta matrícula.
              </div>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => abrirNotif(n)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 16px",
                    background: n.lida ? "transparent" : "color-mix(in srgb, var(--gold-500) 8%, transparent)",
                    border: 0,
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    color: "var(--text)",
                  }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{ICONS[n.type]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                      <span style={{ fontWeight: n.lida ? 500 : 700, fontSize: ".9rem" }}>
                        {n.titulo}
                        {n.externalLink ? <span style={{ color: "var(--accent)", marginLeft: 4 }}>↗</span> : null}
                      </span>
                      <span style={{ fontSize: ".72rem", color: "var(--text-dim)", flexShrink: 0 }}>{n.quando}</span>
                    </div>
                    <div style={{ fontSize: ".82rem", color: "var(--text-muted)", marginTop: 2, lineHeight: 1.4 }}>
                      {n.mensagem}
                    </div>
                  </div>
                  {!n.lida ? (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "var(--gold-500)",
                        marginTop: 6,
                        flexShrink: 0,
                      }}
                    />
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
