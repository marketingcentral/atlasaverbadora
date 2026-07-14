import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShellAdmin, Button, ConvenioSwitcher, useThemeMode } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { AtlasBrand } from "../../components/AtlasBrand";
import { LoadingOverlay, useTrocaOverlay } from "../../components/LoadingOverlay";

const NAV = [
  { key: "visao-geral", label: "Visão Geral", href: "/banco/visao-geral", icon: "◉" },
  {
    key: "propostas",
    label: "Propostas e Portabilidade",
    icon: "◈",
    children: [
      { key: "emprestimo", label: "Empréstimo", href: "/banco/propostas?produto=emprestimo" },
      { key: "cartao", label: "Cartão", href: "/banco/propostas?produto=cartao" },
      { key: "portabilidade", label: "Portabilidade", href: "/banco/propostas?produto=portabilidade" },
      { key: "cartao_beneficio", label: "Cartão Benefício", href: "/banco/propostas?produto=cartao_beneficio" },
    ],
  },
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
  { key: "bate-carteira", label: "Bate de Carteira", href: "/banco/bate-carteira", icon: "▦" },
  { key: "convenios", label: "Convênios", href: "/banco/convenios", icon: "◈" },
  { key: "portabilidade", label: "Portabilidade", href: "/banco/portabilidade", icon: "⇌" },
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
  { key: "conta", label: "Minha conta", href: "/banco/conta", icon: "👤" },
];

export function BancoLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const { resolved, setMode } = useThemeMode();
  const qc = useQueryClient();

  const convenios = useQuery({ queryKey: ["banco", "convenios"], queryFn: () => atlas.banco.convenios() });
  // Overlay reativo: fica visivel enquanto as queries ["banco"] estao em voo
  // (piso 800ms pra evitar flash, teto 5s como fail-safe). Fecha assim que
  // tudo carregou — nao mais o setTimeout fixo de 3s.
  const { troca, iniciar } = useTrocaOverlay();
  const setActive = useMutation({
    mutationFn: (id: string) => atlas.banco.setConvenioAtivo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banco"] });
    },
  });

  const trocarConvenio = (id: string) => {
    const alvo = convenios.data?.convenios.find((c) => c.id === id);
    if (!alvo || alvo.id === convenios.data?.activeId) return; // clique no proprio
    iniciar(alvo.nome, ["banco"]);
    setActive.mutate(id);
  };

  // activeKey ordinariamente e' o ultimo segmento do path. Excecao:
  // /banco/propostas tem submenu por produto controlado por query param
  // (?produto=emprestimo|cartao|portabilidade|cartao_beneficio) — usa o valor
  // pra destacar o filho certo no sidebar.
  const activeKey = ((): string => {
    const last = location.pathname.split("/").pop() ?? "visao-geral";
    if (last === "propostas") {
      const p = new URLSearchParams(location.search).get("produto");
      if (p === "emprestimo" || p === "cartao" || p === "portabilidade" || p === "cartao_beneficio") return p;
      return "emprestimo"; // default
    }
    return last;
  })();

  return (
    <AppShellAdmin
      brand={<AtlasBrand sub="Banco" />}
      convenioSlot={
        convenios.data ? (
          <ConvenioSwitcher
            convenios={convenios.data.convenios}
            activeId={convenios.data.activeId}
            onChange={trocarConvenio}
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
      // URL corrente (com querystring). O AppShellAdmin usa isso pra
      // desambiguar itens que compartilham a mesma `key` mas apontam pra
      // hrefs diferentes — ex.: os dois "Portabilidade" no menu do banco
      // (o filho em Minhas Propostas com ?produto=portabilidade e o item
      // standalone da tela de Oportunidades).
      activeHref={`${location.pathname}${location.search}`}
      onNavigate={(item) => {
        if (item.href) nav(item.href);
      }}
    >
      <Outlet />
      {troca ? <LoadingOverlay eyebrow="Trocando convênio" subtitulo={troca.subtitulo} /> : null}
    </AppShellAdmin>
  );
}
