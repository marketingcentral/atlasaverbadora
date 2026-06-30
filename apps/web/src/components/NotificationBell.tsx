import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  buildNotifications,
  markAllAsRead,
  markAsRead,
  type NotifType,
  type Notification,
} from "../lib/notifications";
import { STORAGE_KEY_ID, STORAGE_KEY_META } from "../lib/matricula-data";
import { PROPOSTAS_KEY } from "../lib/propostas-data";

const ICONS: Record<NotifType, string> = {
  proposta_em_analise: "📋",
  proposta_aprovada: "✅",
  proposta_aguardando_formalizacao: "📝",
  proposta_recusada: "❌",
  proposta_cancelada: "🚫",
  proposta_expirando: "⏰",
  folha_processada: "💼",
};

export function NotificationBell() {
  const nav = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>(() => buildNotifications());
  const ref = useRef<HTMLDivElement>(null);

  // Recalcula notifs sempre que a rota muda (cobre o caso de criar proposta
  // em /servidor/termo e voltar) ou quando outra aba mexe no storage.
  useEffect(() => {
    setNotifs(buildNotifications());
  }, [location.pathname]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === STORAGE_KEY_META ||
        e.key === STORAGE_KEY_ID ||
        e.key === PROPOSTAS_KEY ||
        e.key === "atlas:notifications:read"
      ) {
        setNotifs(buildNotifications());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Recalcula tambem ao abrir o sino (capta criacoes na MESMA aba que nao
  // disparam evento "storage").
  useEffect(() => {
    if (open) setNotifs(buildNotifications());
  }, [open]);

  // Tick periodico — recalcula a cada 30s pra atualizar os "ha Xmin/Xh"
  // sem precisar refresh, e pra captar mudancas de estado.
  useEffect(() => {
    const i = setInterval(() => {
      setNotifs(buildNotifications());
    }, 30000);
    return () => clearInterval(i);
  }, []);

  const unread = notifs.filter((n) => !n.lida).length;

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
    setNotifs(buildNotifications());
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
    setNotifs(buildNotifications());
  }

  return (
    <div ref={ref} style={{ position: "relative", zIndex: 100 }}>
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
