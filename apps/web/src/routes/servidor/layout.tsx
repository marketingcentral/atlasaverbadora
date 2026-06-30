import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button, useThemeMode } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

const NAV = [
  { key: "dashboard", label: "Início", href: "/servidor/dashboard" },
  { key: "marketplace", label: "Ofertas", href: "/servidor/marketplace" },
  { key: "simular", label: "Simular", href: "/servidor/simular" },
  { key: "portabilidade", label: "Portabilidade", href: "/servidor/portabilidade" },
  { key: "propostas", label: "Propostas", href: "/servidor/propostas" },
  { key: "contratos", label: "Contratos", href: "/servidor/contratos" },
  { key: "conta", label: "Conta", href: "/servidor/conta" },
];

interface MatriculaMeta {
  idMatricula: string;
  matricula: string;
  prefeitura: string;
  uf: string;
  cargo: string;
}

const META_KEY = "atlas:idMatricula:meta";

export function ServidorLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const { resolved, setMode } = useThemeMode();
  const active = location.pathname.split("/")[2] ?? "dashboard";

  const [meta, setMeta] = useState<MatriculaMeta | null>(() => readMeta());

  // Re-read whenever the route changes (e.g. user came back from selecionar-matricula).
  useEffect(() => {
    setMeta(readMeta());
  }, [location.pathname]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "color-mix(in srgb, var(--bg) 80%, transparent)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
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
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
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
              Atlas
            </div>

            {meta ? <MatriculaSwitcher meta={meta} /> : null}

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
          <div style={{ display: "flex", gap: 8 }}>
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
                window.localStorage.removeItem("atlas:idMatricula");
                window.localStorage.removeItem(META_KEY);
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

function MatriculaSwitcher({ meta }: { meta: MatriculaMeta }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function trocar() {
    window.localStorage.removeItem("atlas:idMatricula");
    window.localStorage.removeItem(META_KEY);
    setOpen(false);
    nav("/servidor/selecionar-matricula");
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 12px", borderRadius: 999,
          background: "var(--surface)", border: "1px solid var(--border)",
          fontSize: 12, color: "var(--text)", cursor: "pointer",
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          style={{
            display: "inline-block", width: 6, height: 6, borderRadius: "50%",
            background: "var(--emerald-500)",
          }}
        />
        <span style={{ fontWeight: 600, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {meta.prefeitura}
        </span>
        <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          {meta.matricula}
        </span>
        <span style={{ color: "var(--text-muted)" }}>▾</span>
      </button>

      {open ? (
        <div
          role="menu"
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0,
            minWidth: 280, background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.25)",
            padding: 12, display: "flex", flexDirection: "column", gap: 8, zIndex: 20,
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}>
            Matricula ativa
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: ".95rem" }}>{meta.prefeitura}</div>
            <div style={{ fontSize: ".82rem", color: "var(--text-muted)", marginTop: 2 }}>
              {meta.cargo} · {meta.uf}
            </div>
            <div style={{ fontSize: ".82rem", color: "var(--text-muted)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
              Mat. {meta.matricula}
            </div>
          </div>
          <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
          <Button size="sm" variant="ghost" onClick={trocar}>
            Trocar matricula →
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function readMeta(): MatriculaMeta | null {
  try {
    const raw = window.localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as MatriculaMeta) : null;
  } catch {
    return null;
  }
}
