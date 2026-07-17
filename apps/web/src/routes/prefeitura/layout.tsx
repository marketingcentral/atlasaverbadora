import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShellAdmin, Button, useThemeMode } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { AtlasBrand } from "../../components/AtlasBrand";

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
  { key: "conta", label: "Minha conta", href: "/prefeitura/conta", icon: "👤" },
];

export function PrefeituraLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const { resolved, setMode } = useThemeMode();
  const activeKey = location.pathname.split("/")[2] ?? "dashboard";
  const me = useQuery({ queryKey: ["prefeitura", "me"], queryFn: () => atlas.prefeitura.me() });

  return (
    <AppShellAdmin
      brand={<AtlasBrand sub="Prefeitura" />}
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
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {me.data ? (
              <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }} title="Prefeitura logada">
                {me.data.prefeitura.nome}/{me.data.prefeitura.uf}
              </span>
            ) : null}
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
