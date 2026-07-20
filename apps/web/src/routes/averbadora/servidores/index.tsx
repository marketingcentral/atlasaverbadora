import { Link } from "react-router-dom";

/** Tela inicial de /averbadora/servidores — 2 cards: ver e importar.
 *  Sub-rotas em /averbadora/servidores/visualizar e /importar. */
export function AdminServidoresLanding() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Averbadora
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Servidores</h1>
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 720 }}>
          Escolha o que deseja fazer. Cada prefeitura tem seus próprios campos configuráveis:
          o CSV modelo, a tabela de visualização e a validação da importação seguem essa config.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <LandingCard
          to="/averbadora/servidores/visualizar"
          icon="◎"
          title="Ver servidores"
          desc="Selecione uma prefeitura para listar os servidores cadastrados, com as colunas configuradas."
        />
        <LandingCard
          to="/averbadora/servidores/importar"
          icon="↑"
          title="Importar servidores"
          desc="Configure os campos da prefeitura, baixe o CSV modelo dinâmico e envie a base de servidores."
        />
      </div>
    </div>
  );
}

function LandingCard({ to, icon, title, desc }: { to: string; icon: string; title: string; desc: string }) {
  return (
    <Link
      to={to}
      style={{
        display: "block",
        padding: 22,
        borderRadius: 14,
        border: "1px solid var(--border-strong)",
        background: "var(--bg-elev)",
        color: "var(--text)",
        textDecoration: "none",
        transition: "transform .1s ease, border-color .1s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--gold-500)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ fontSize: 28, color: "var(--gold-500)", marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.45 }}>{desc}</div>
    </Link>
  );
}
