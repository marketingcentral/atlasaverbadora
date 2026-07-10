import { useState } from "react";
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
  { key: "conta", label: "Minha conta", href: "/banco/conta", icon: "👤" },
];

export function BancoLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const { resolved, setMode } = useThemeMode();
  const qc = useQueryClient();

  const convenios = useQuery({ queryKey: ["banco", "convenios"], queryFn: () => atlas.banco.convenios() });
  // Loading da troca de convenio: overlay full-screen por no minimo 4s a
  // partir do clique — evita "flash" de tela nova antes das queries do banco
  // rehidratarem no novo escopo (contratos, ofertas, etc.).
  const [trocandoConvenio, setTrocandoConvenio] = useState<null | { nome: string }>(null);
  const setActive = useMutation({
    mutationFn: (id: string) => atlas.banco.setConvenioAtivo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banco"] });
    },
  });

  const trocarConvenio = (id: string) => {
    const alvo = convenios.data?.convenios.find((c) => c.id === id);
    if (!alvo || alvo.id === convenios.data?.activeId) return; // clique no proprio
    setTrocandoConvenio({ nome: alvo.nome });
    setActive.mutate(id);
    // Piso fixo de 4s (cliente pediu). Se a API demorar mais, o overlay
    // fecha so depois. Se for mais rapido, aguarda os 4s.
    window.setTimeout(() => setTrocandoConvenio(null), 4_000);
  };

  const activeKey = location.pathname.split("/").pop() ?? "visao-geral";

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
      onNavigate={(item) => {
        if (item.href) nav(item.href);
      }}
    >
      <Outlet />
      {trocandoConvenio ? <TrocandoConvenioOverlay nome={trocandoConvenio.nome} /> : null}
    </AppShellAdmin>
  );
}

function TrocandoConvenioOverlay({ nome }: { nome: string }) {
  return (
    <>
      <style>{`@keyframes atlas-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "grid", placeItems: "center",
          background: "color-mix(in srgb, var(--bg) 88%, transparent)",
          backdropFilter: "blur(4px)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: 32, maxWidth: 360, textAlign: "center" }}>
          <div
            aria-hidden
            style={{
              width: 56, height: 56, borderRadius: "50%",
              border: "3px solid color-mix(in srgb, var(--accent) 20%, transparent)",
              borderTopColor: "var(--accent)",
              animation: "atlas-spin 900ms linear infinite",
            }}
          />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)" }}>
              Trocando convênio
            </div>
            <div style={{ marginTop: 6, fontSize: "1.05rem", fontWeight: 700, color: "var(--text)" }}>
              {nome}
            </div>
            <div style={{ marginTop: 4, fontSize: 13, color: "var(--text-muted)" }}>
              Carregando dados do novo convênio...
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
