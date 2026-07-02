import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppShellAdmin, Button, useThemeMode } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

const NAV = [
  { key: "dashboard", label: "Dashboard", href: "/averbadora/dashboard", icon: "◉" },
  { key: "bancos", label: "Bancos", href: "/averbadora/bancos", icon: "▦" },
  { key: "prefeituras", label: "Prefeituras", href: "/averbadora/prefeituras", icon: "▤" },
  { key: "convenios", label: "Convênios", href: "/averbadora/convenios", icon: "▣" },
  { key: "servidores", label: "Servidores", href: "/averbadora/servidores", icon: "◎" },
  { key: "folhas", label: "Folhas", href: "/averbadora/folhas", icon: "▥" },
  { key: "pre-reservas", label: "Pré-reservas", href: "/averbadora/pre-reservas", icon: "⧖" },
  { key: "tombamento", label: "Tombamento", href: "/averbadora/tombamento", icon: "⇩" },
  { key: "id-unico", label: "ID único", href: "/averbadora/id-unico", icon: "#" },
  { key: "bate-carteira", label: "Bate de carteira", href: "/averbadora/bate-carteira", icon: "⇄" },
  { key: "auditoria", label: "Auditoria", href: "/averbadora/auditoria", icon: "⚖" },
  { key: "perfis", label: "Usuários", href: "/averbadora/perfis", icon: "⚙" },
  { key: "comunicados", label: "Comunicados", href: "/averbadora/comunicados", icon: "❐" },
  { key: "health", label: "Health", href: "/averbadora/health", icon: "♥" },
  { key: "ia", label: "IA", href: "/averbadora/ia", icon: "✧" },
  { key: "logs", label: "Logs", href: "/averbadora/logs", icon: "≡" },
  { key: "vitrine", label: "Vitrine", href: "/averbadora/vitrine", icon: "▢" },
  {
    key: "api",
    label: "API",
    icon: "⌘",
    children: [
      { key: "api-docs", label: "Documentação", href: "/averbadora/api/docs" },
      { key: "api-tokens", label: "Tokens de acesso", href: "/averbadora/api/tokens" },
      { key: "api-webhooks", label: "Webhooks", href: "/averbadora/api/webhooks" },
    ],
  },
];

export function AverbadoraLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const { resolved, setMode } = useThemeMode();
  const parts = location.pathname.split("/").filter(Boolean);
  // /averbadora/api/docs → activeKey = "api-docs"
  const activeKey = parts[1] === "api" && parts[2] ? `api-${parts[2]}` : (parts[1] ?? "dashboard");

  return (
    <AppShellAdmin
      brand={
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 700, fontSize: "1.05rem" }}>
          <span
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, var(--gold-500), var(--gold-400) 40%, var(--emerald-500))",
              display: "grid", placeItems: "center", color: "var(--navy-900)", fontWeight: 800,
              boxShadow: "var(--shadow-gold)",
            }}
          >
            A
          </span>
          <span>Atlas <small style={{ opacity: 0.6, fontSize: ".8rem" }}>Averbadora</small></span>
        </div>
      }
      topbarSlot={
        <>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{location.pathname}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="ghost" size="sm" onClick={() => setMode(resolved === "dark" ? "light" : "dark")}>
              {resolved === "dark" ? "Tema claro" : "Tema escuro"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await atlas.logout().catch(() => undefined);
                window.localStorage.removeItem("atlas:role");
                window.localStorage.removeItem("atlas:tokens");
                nav("/login");
              }}
            >
              Sair
            </Button>
          </div>
        </>
      }
      nav={NAV}
      activeKey={activeKey}
      onNavigate={(item) => {
        if (item.href) nav(item.href);
      }}
    >
      <Outlet />
    </AppShellAdmin>
  );
}
