import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShellAdmin, Button, useThemeMode } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

const NAV = [
  { key: "dashboard", label: "Painel", href: "/prefeitura/dashboard", icon: "◉" },
  { key: "servidores", label: "Servidores", href: "/prefeitura/servidores", icon: "◎" },
  { key: "folhas", label: "Folhas", href: "/prefeitura/folhas", icon: "▥" },
  { key: "convenios", label: "Convênios", href: "/prefeitura/convenios", icon: "▣" },
  { key: "contratos", label: "Contratos averbados", href: "/prefeitura/contratos", icon: "▤" },
  { key: "tombamento", label: "Tombamento", href: "/prefeitura/tombamento", icon: "▦" },
  { key: "adf", label: "ADF / Descontos", href: "/prefeitura/adf", icon: "▧" },
  { key: "relatorios", label: "Relatórios", href: "/prefeitura/relatorios", icon: "▨" },
  { key: "anuencia", label: "Anuência de dados", href: "/prefeitura/anuencia", icon: "✓" },
  { key: "perfis", label: "Usuários e acessos", href: "/prefeitura/perfis", icon: "◐" },
  { key: "comunicados", label: "Comunicados", href: "/prefeitura/comunicados", icon: "❐" },
];

export function PrefeituraLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const { resolved, setMode } = useThemeMode();
  const activeKey = location.pathname.split("/")[2] ?? "dashboard";
  const me = useQuery({ queryKey: ["prefeitura", "me"], queryFn: () => atlas.prefeitura.me() });

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
          <span>Atlas <small style={{ opacity: 0.6, fontSize: ".8rem" }}>Prefeitura</small></span>
        </div>
      }
      convenioSlot={
        me.data ? (
          <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-elev-2)", fontSize: 13 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase" }}>Prefeitura</div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>{me.data.prefeitura.nome}/{me.data.prefeitura.uf}</div>
          </div>
        ) : null
      }
      topbarSlot={
        <>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Portal da prefeitura</div>
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
