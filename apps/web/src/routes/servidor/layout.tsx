import { useEffect, useLayoutEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button, useThemeMode } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { AtlasBrand } from "../../components/AtlasBrand";
import { clearAtlasState } from "../../lib/session";
import { readActiveIdMatricula, hydrateMatriculas } from "../../lib/matricula-data";
import { NotificationBell } from "../../components/NotificationBell";

const NAV = [
  { key: "dashboard", label: "Início", href: "/servidor/dashboard" },
  { key: "marketplace", label: "Ofertas", href: "/servidor/marketplace" },
  { key: "simular", label: "Simular", href: "/servidor/simular" },
  { key: "portabilidade", label: "Portabilidade", href: "/servidor/portabilidade" },
  { key: "propostas", label: "Propostas", href: "/servidor/propostas" },
  { key: "contratos", label: "Contratos", href: "/servidor/contratos" },
  { key: "beneficios", label: "Benefícios", href: "/servidor/beneficios" },
  { key: "conta", label: "Conta", href: "/servidor/conta" },
];

export function ServidorLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const { resolved, setMode } = useThemeMode();
  const active = location.pathname.split("/")[2] ?? "dashboard";

  useLayoutEffect(() => {
    if (!readActiveIdMatricula()) {
      nav("/servidor/selecionar-matricula", { replace: true });
    }
  }, [nav, location.pathname]);

  // Refresca as matriculas do backend ao entrar no app (dados reais + consistentes).
  useEffect(() => {
    void hydrateMatriculas();
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "color-mix(in srgb, var(--bg) 80%, transparent)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 200,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 64,
            padding: "0 24px",
            maxWidth: 1280,
            width: "100%",
            margin: "0 auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
            <AtlasBrand />

            <nav style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {NAV.map((n) => {
                const isActive = n.key === active;
                return (
                  <button
                    key={n.key}
                    type="button"
                    onClick={() => nav(n.href)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? "var(--text)" : "var(--text-muted)",
                      background: isActive ? "var(--surface)" : "transparent",
                      border: "1px solid transparent",
                      cursor: "pointer",
                    }}
                  >
                    {n.label}
                  </button>
                );
              })}
            </nav>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={() => setMode(resolved === "dark" ? "light" : "dark")}>
              {resolved === "dark" ? "Tema claro" : "Tema escuro"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await atlas.logout().catch(() => undefined);
                clearAtlasState();
                nav("/login");
              }}
            >
              Sair
            </Button>
          </div>
        </div>
      </header>
      <main style={{ flex: 1, padding: 24, maxWidth: 960, width: "100%", margin: "0 auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
