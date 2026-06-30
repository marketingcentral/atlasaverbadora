import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, MargemCard, Pill } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

// Mock: contratos ativos para preview na home. Em prod virao do GET /v1/servidores/me/contratos.
const CONTRATOS_ATIVOS = [
  { id: "ADF-S0003", banco: "SCred Financeira", parcela: 1176.37, parcelasPagas: 3, total: 60, status: "Averbado" },
  { id: "ADF-S0002", banco: "SCred Financeira", parcela: 1773.79, parcelasPagas: 4, total: 48, status: "Em dia" },
];

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function ServidorDashboard() {
  const nav = useNavigate();
  const profile = useQuery({ queryKey: ["me"], queryFn: () => atlas.getMyProfile() });
  const margem = useQuery({ queryKey: ["margem"], queryFn: () => atlas.getMyMargem() });

  if (profile.isLoading || margem.isLoading) {
    return <Card><span style={{ color: "var(--text-muted)" }}>Carregando seus dados...</span></Card>;
  }

  if (profile.error || margem.error) {
    return (
      <Card>
        <h3 style={{ marginTop: 0 }}>Erro ao carregar</h3>
        <p style={{ color: "var(--text-muted)" }}>
          {(profile.error ?? margem.error) instanceof Error
            ? (profile.error ?? margem.error)!.message
            : "Erro desconhecido"}
        </p>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 960, margin: "0 auto", width: "100%" }}>
      <div>
        <span className="eyebrow">Bem-vindo(a)</span>
        <h1 style={{ margin: "6px 0 0", fontSize: "2rem", letterSpacing: "-.02em" }}>{profile.data?.nome}</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
          Matricula <b>{profile.data?.matricula}</b> · {profile.data?.vinculo}
        </p>
      </div>

      {margem.data ? <MargemCard data={margem.data} /> : null}

      {/* Atalhos rapidos */}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <AtalhoCard
          titulo="Simular"
          descricao="Calcule parcelas e veja ofertas de bancos parceiros."
          icon="💰"
          accent="emerald"
          onClick={() => nav("/servidor/simular")}
        />
        <AtalhoCard
          titulo="Portabilidade"
          descricao="Consolide contratos em outro banco com taxa menor."
          icon="🔁"
          accent="gold"
          onClick={() => nav("/servidor/portabilidade")}
        />
        <AtalhoCard
          titulo="Meus contratos"
          descricao="Veja parcelas, progresso e baixe PDFs."
          icon="📄"
          accent="navy"
          onClick={() => nav("/servidor/contratos")}
        />
      </div>

      {/* Margens por tipo + Contratos ativos */}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        <Card>
          <span className="eyebrow">Margens por tipo</span>
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {margem.data?.margens_por_tipo.map((m) => (
              <div
                key={m.tipo}
                style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "8px 12px", background: "var(--bg-elev-2)",
                  borderRadius: 10, fontSize: ".95rem",
                }}
              >
                <span>{m.tipo.replace("_", " ").toLowerCase()}</span>
                <span style={{ color: "var(--accent)", fontWeight: 700 }}>{fmtBRL(m.disponivel)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="eyebrow">Contratos ativos</span>
            <button
              type="button"
              onClick={() => nav("/servidor/contratos")}
              style={{ background: "transparent", border: 0, color: "var(--accent)", fontSize: ".82rem", cursor: "pointer", fontWeight: 600 }}
            >
              Ver todos →
            </button>
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {CONTRATOS_ATIVOS.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: "10px 12px", background: "var(--bg-elev-2)", borderRadius: 10,
                  display: "flex", flexDirection: "column", gap: 6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: ".92rem" }}>{c.banco}</span>
                  <Pill variant={c.status === "Averbado" ? "averbado" : "aceita"}>{c.status}</Pill>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".82rem", color: "var(--text-muted)" }}>
                  <span>{fmtBRL(c.parcela)}/mes</span>
                  <span>
                    {c.parcelasPagas}/{c.total} parcelas
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <span className="eyebrow">Fonte</span>
        <div style={{ marginTop: 12, fontSize: ".9rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
          <div>Tipo: {margem.data?.fonte.tipo}</div>
          <div>Sincronizado: {margem.data ? new Date(margem.data.fonte.sincronizado_em).toLocaleString("pt-BR") : "-"}</div>
          <div>
            Cache: <b style={{ color: "var(--accent)" }}>{margem.data?.fonte.cache_status}</b>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AtalhoCard({
  titulo,
  descricao,
  icon,
  accent,
  onClick,
}: {
  titulo: string;
  descricao: string;
  icon: string;
  accent: "emerald" | "gold" | "navy";
  onClick: () => void;
}) {
  const accentColor =
    accent === "emerald" ? "var(--emerald-500)" : accent === "gold" ? "var(--gold-500)" : "var(--accent)";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left", cursor: "pointer",
        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
        padding: 18, display: "flex", flexDirection: "column", gap: 8,
        transition: "transform .12s ease, border-color .12s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accentColor;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <span style={{ fontSize: 28 }}>{icon}</span>
      <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text)" }}>{titulo}</span>
      <span style={{ fontSize: ".88rem", color: "var(--text-muted)" }}>{descricao}</span>
    </button>
  );
}
