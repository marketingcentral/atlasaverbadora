import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShellAdmin, Button, useThemeMode } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { AtlasBrand } from "../../components/AtlasBrand";
import { podeAcessar, readAverbadoraPermissoesFromJwt } from "../../lib/averbadora-perms";

const NAV = [
  { key: "dashboard", label: "Dashboard", href: "/averbadora/dashboard", icon: "◉" },
  // Ordem pedida pelo cliente (16/07/2026): Dashboard > Prefeituras > Bancos > Servidores > Convênios.
  { key: "prefeituras", label: "Prefeituras", href: "/averbadora/prefeituras", icon: "▤" },
  { key: "bancos", label: "Bancos", href: "/averbadora/bancos", icon: "▦" },
  { key: "servidores", label: "Servidores", href: "/averbadora/servidores", icon: "◎" },
  { key: "convenios", label: "Convênios", href: "/averbadora/convenios", icon: "▣" },
  { key: "contratos", label: "Contratos", href: "/averbadora/contratos", icon: "▧" },
  { key: "folhas", label: "Folhas", href: "/averbadora/folhas", icon: "▥" },
  { key: "pre-reservas", label: "Pré-reservas", href: "/averbadora/pre-reservas", icon: "⧖" },
  { key: "tombamento", label: "Tombamento", href: "/averbadora/tombamento", icon: "⇩" },
  { key: "id-unico", label: "ID único", href: "/averbadora/id-unico", icon: "#" },
  { key: "bate-carteira", label: "Bate de carteira", href: "/averbadora/bate-carteira", icon: "⇄" },
  { key: "adf", label: "ADF", href: "/averbadora/adf", icon: "▤" },
  { key: "portabilidade", label: "Portabilidade", href: "/averbadora/portabilidade", icon: "⇌" },
  { key: "auditoria", label: "Auditoria", href: "/averbadora/auditoria", icon: "⚖" },
  { key: "perfis", label: "Usuários", href: "/averbadora/perfis", icon: "⚙" },
  {
    key: "comunicados",
    label: "Comunicados",
    icon: "❐",
    children: [
      { key: "comunicados-banco", label: "Banco", href: "/averbadora/comunicados/banco" },
      { key: "comunicados-servidor", label: "Servidor", href: "/averbadora/comunicados/servidor" },
      { key: "comunicados-prefeitura", label: "Prefeitura", href: "/averbadora/comunicados/prefeitura" },
    ],
  },
  {
    key: "email-sistema",
    label: "E-mails do sistema",
    icon: "✉",
    children: [
      { key: "email-primeiro-acesso", label: "Primeiro acesso", href: "/averbadora/emails/primeiro-acesso" },
      { key: "email-recuperar-senha", label: "Recuperar senha", href: "/averbadora/emails/recuperar-senha" },
      { key: "email-redefinir-senha", label: "Redefinir senha", href: "/averbadora/emails/redefinir-senha" },
      { key: "email-simulacao", label: "Simulação", href: "/averbadora/emails/simulacao" },
      { key: "email-beneficios", label: "Benefícios", href: "/averbadora/emails/beneficios" },
    ],
  },
  { key: "termos", label: "Termos de aceite", href: "/averbadora/termos", icon: "📜" },
  { key: "health", label: "Health", href: "/averbadora/health", icon: "♥" },
  { key: "logs", label: "Logs", href: "/averbadora/logs", icon: "≡" },
  { key: "vitrine", label: "Vitrine", href: "/averbadora/vitrine", icon: "▢" },
  { key: "beneficios", label: "Benefícios", href: "/averbadora/beneficios", icon: "◇" },
  { key: "telemedicina", label: "Telemedicina", href: "/averbadora/telemedicina", icon: "📱" },
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
  { key: "suporte", label: "Suporte", href: "/averbadora/suporte", icon: "☎" },
  { key: "conta", label: "Minha conta", href: "/averbadora/conta", icon: "👤" },
];

export function AverbadoraLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const { resolved, setMode } = useThemeMode();
  const parts = location.pathname.split("/").filter(Boolean);
  // Menus com subitens: api-*, comunicados-*, email-* (submenus dentro de
  // /averbadora/emails/*). Sem esse tratamento, activeKey vira "emails" —
  // chave inexistente em RESOURCE_GROUPS/PRESETS, redirecionando qualquer
  // nao-supervisor pra dashboard toda vez que abre um sub-item de email.
  const activeKey = (() => {
    if (parts[1] === "emails" && parts[2]) return `email-${parts[2]}`;
    if ((parts[1] === "api" || parts[1] === "comunicados") && parts[2]) return `${parts[1]}-${parts[2]}`;
    return parts[1] ?? "dashboard";
  })();

  // Le as permissoes granulares do JWT (claim averbadora_permissoes). Se null
  // (dev-user admin@atlas.test) cai como supervisor de fato — permite tudo.
  const [permissoes, setPermissoes] = useState<string[] | null>(null);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("atlas:tokens");
      const token = stored ? JSON.parse(stored)?.access_token : null;
      setPermissoes(readAverbadoraPermissoesFromJwt(token));
    } catch { setPermissoes(null); }
  }, [location.pathname]); // reavalia ao trocar de tela (novo token via refresh)

  // Redireciona quem tenta abrir uma URL fora do escopo das permissoes.
  useEffect(() => {
    if (!permissoes || permissoes.includes("*")) return;
    if (!podeAcessar(permissoes, activeKey)) {
      nav("/averbadora/dashboard", { replace: true });
    }
  }, [permissoes, activeKey, nav]);

  // Filtra o menu conforme as permissoes — remove itens que o usuario nao pode ver.
  const filteredNav = useMemo(() => {
    return NAV
      .map((item) => {
        if (!("children" in item) || !item.children) {
          return podeAcessar(permissoes, item.key) ? item : null;
        }
        const kids = item.children.filter((c) => podeAcessar(permissoes, c.key));
        if (kids.length === 0) return null;
        return { ...item, children: kids };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [permissoes]);

  const meQ = useQuery({ queryKey: ["admin", "me"], queryFn: () => atlas.admin.me(), staleTime: 60_000 });

  return (
    <AppShellAdmin
      brand={<AtlasBrand sub="Averbadora" />}
      topbarSlot={
        <>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{location.pathname}</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {meQ.data ? (
              <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }} title={`${meQ.data.email} (${meQ.data.perfil})`}>
                {meQ.data.nome}
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
