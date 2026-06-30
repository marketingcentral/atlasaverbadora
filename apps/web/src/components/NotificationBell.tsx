import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

type NotifType = "status_proposta" | "expiracao_trava" | "folha_processada" | "novo_device";

interface Notification {
  id: string;
  type: NotifType;
  titulo: string;
  mensagem: string;
  quando: string;
  href?: string;
  lida: boolean;
}

const NOTIFS_INICIAIS: Notification[] = [
  {
    id: "N1",
    type: "status_proposta",
    titulo: "Proposta PRO-9821 aprovada",
    mensagem: "O SCred Financeira aprovou sua proposta. Formalize ate 01/07.",
    quando: "ha 12min",
    href: "/servidor/propostas",
    lida: false,
  },
  {
    id: "N2",
    type: "expiracao_trava",
    titulo: "Trava de margem expira em 6h",
    mensagem: "Proposta PRO-9805 — formalize ou cancele para liberar margem.",
    quando: "ha 1h",
    href: "/servidor/propostas",
    lida: false,
  },
  {
    id: "N3",
    type: "folha_processada",
    titulo: "Folha de Junho/2026 processada",
    mensagem: "Sua margem foi recalculada com base na nova folha da prefeitura.",
    quando: "ontem",
    href: "/servidor/dashboard",
    lida: true,
  },
];

const ICONS: Record<NotifType, string> = {
  status_proposta: "📋",
  expiracao_trava: "⏰",
  folha_processada: "💼",
  novo_device: "🔐",
};

export function NotificationBell() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>(NOTIFS_INICIAIS);
  const ref = useRef<HTMLDivElement>(null);

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
    setNotifs((list) => list.map((x) => (x.id === n.id ? { ...x, lida: true } : x)));
    if (n.href) nav(n.href);
    setOpen(false);
  }

  function marcarTodasLidas() {
    setNotifs((list) => list.map((x) => ({ ...x, lida: true })));
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notificacoes (${unread} nao lidas)`}
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
            width: 360,
            maxWidth: "calc(100vw - 32px)",
            background: "var(--bg-elev)",
            border: "1px solid var(--border-strong)",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(0,0,0,.45)",
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
            }}
          >
            <span style={{ fontWeight: 700, fontSize: ".95rem" }}>Notificacoes</span>
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

          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {notifs.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: ".88rem" }}>
                Nenhuma notificacao.
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
                      <span style={{ fontWeight: n.lida ? 500 : 700, fontSize: ".9rem" }}>{n.titulo}</span>
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
