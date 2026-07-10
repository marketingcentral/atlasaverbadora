import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppShellAdmin, Button, useThemeMode } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { AtlasBrand } from "../../components/AtlasBrand";
import { podeAcessar, readAverbadoraPerfilFromJwt, type AverbadoraPerfil } from "../../lib/averbadora-perms";

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
  { key: "adf", label: "ADF", href: "/averbadora/adf", icon: "▤" },
  { key: "auditoria", label: "Auditoria", href: "/averbadora/auditoria", icon: "⚖" },
  { key: "perfis", label: "Usuários", href: "/averbadora/perfis", icon: "⚙" },
  {
    key: "comunicados",
    label: "Comunicados",
    icon: "❐",
    children: [
      { key: "comunicados-banco", label: "Banco", href: "/averbadora/comunicados/banco" },
      { key: "comunicados-servidor", label: "Servidor", href: "/averbadora/comunicados/servidor" },
    ],
  },
  { key: "health", label: "Health", href: "/averbadora/health", icon: "♥" },
  { key: "logs", label: "Logs", href: "/averbadora/logs", icon: "≡" },
  { key: "vitrine", label: "Vitrine", href: "/averbadora/vitrine", icon: "▢" },
  { key: "beneficios", label: "Benefícios", href: "/averbadora/beneficios", icon: "◇" },
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
  { key: "configuracoes", label: "Configurações", href: "/averbadora/configuracoes", icon: "⚙" },
  { key: "permissoes", label: "Permissões", href: "/averbadora/permissoes", icon: "⚿" },
  { key: "conta", label: "Minha conta", href: "/averbadora/conta", icon: "👤" },
];

export function AverbadoraLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const { resolved, setMode } = useThemeMode();
  const parts = location.pathname.split("/").filter(Boolean);
  const activeKey =
    (parts[1] === "api" || parts[1] === "comunicados") && parts[2]
      ? `${parts[1]}-${parts[2]}`
      : (parts[1] ?? "dashboard");

  // Le o subperfil do JWT (Carla operador, Sandra financeiro, etc). Se null
  // (dev-user admin@atlas.test) cai como supervisor de fato — permite tudo.
  const [perfil, setPerfil] = useState<AverbadoraPerfil | null>(null);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("atlas:tokens");
      const token = stored ? JSON.parse(stored)?.access_token : null;
      setPerfil(readAverbadoraPerfilFromJwt(token));
    } catch { setPerfil(null); }
  }, [location.pathname]); // reavalia ao trocar de tela (novo token via refresh)

  // Redireciona quem tenta abrir uma URL fora do escopo do subperfil.
  useEffect(() => {
    if (!perfil || perfil === "supervisor") return;
    if (!podeAcessar(perfil, activeKey)) {
      nav("/averbadora/dashboard", { replace: true });
    }
  }, [perfil, activeKey, nav]);

  // Filtra o menu conforme o perfil — remove itens que o usuario nao pode ver.
  const filteredNav = useMemo(() => {
    return NAV
      .map((item) => {
        if (!("children" in item) || !item.children) {
          return podeAcessar(perfil, item.key) ? item : null;
        }
        const kids = item.children.filter((c) => podeAcessar(perfil, c.key));
        if (kids.length === 0) return null;
        return { ...item, children: kids };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [perfil]);

  return (
    <AppShellAdmin
      brand={<AtlasBrand sub="Averbadora" />}
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
      nav={filteredNav}
      activeKey={activeKey}
      onNavigate={(item) => {
        if (item.href) nav(item.href);
      }}
    >
      <Outlet />
    </AppShellAdmin>
  );
}
