import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShellAdmin, Button, ConvenioSwitcher, useThemeMode } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { AtlasBrand } from "../../components/AtlasBrand";

const NAV = [
  { key: "visao-geral", label: "Visão Geral", href: "/banco/visao-geral", icon: "◉" },
  { key: "propostas", label: "Minhas Propostas", href: "/banco/propostas", icon: "◈" },
  { key: "ofertas", label: "Ofertas", href: "/banco/ofertas", icon: "◇" },
  {
    key: "cadastros",
    label: "Cadastros",
    icon: "▢",
    children: [
      { key: "tabela-emprestimos", label: "Tabela de Empréstimos", href: "/banco/cadastros/tabela-emprestimos" },
      { key: "usuarios", label: "Usuários", href: "/banco/cadastros/usuarios" },
    ],
  },
  { key: "margem-contratacao", label: "Margem / Contratação", href: "/banco/margem-contratacao", icon: "▤" },
  { key: "carteira", label: "Meus Contratos", href: "/banco/carteira", icon: "▥" },
  { key: "adf", label: "ADF", href: "/banco/adf", icon: "▤" },
  { key: "bate-carteira", label: "Bate de Carteira", href: "/banco/bate-carteira", icon: "▦" },
  { key: "convenios", label: "Convênios", href: "/banco/convenios", icon: "◈" },
  {
    key: "relatorios",
    label: "Relatórios",
    icon: "▦",
    children: [
      { key: "consignacoes", label: "Consignações", href: "/banco/relatorios/consignacoes" },
      { key: "gerador", label: "Gerador", href: "/banco/relatorios/gerador" },
      { key: "faturamento", label: "Faturamento", href: "/banco/relatorios/faturamento" },
    ],
  },
];

export function BancoLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const { resolved, setMode } = useThemeMode();
  const qc = useQueryClient();

  const convenios = useQuery({ queryKey: ["banco", "convenios"], queryFn: () => atlas.banco.convenios() });
  const setActive = useMutation({
    mutationFn: (id: string) => atlas.banco.setConvenioAtivo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banco"] });
    },
  });

  const activeKey = location.pathname.split("/").pop() ?? "visao-geral";

  return (
    <AppShellAdmin
      brand={<AtlasBrand sub="Banco" />}
      convenioSlot={
        convenios.data ? (
          <ConvenioSwitcher
            convenios={convenios.data.convenios}
            activeId={convenios.data.activeId}
            onChange={(id) => setActive.mutate(id)}
          />
        ) : null
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
