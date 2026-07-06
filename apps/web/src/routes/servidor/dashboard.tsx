import { useEffect, useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Pill } from "@atlas/ui/web";
import type { MatriculaInfo } from "../../lib/matricula-data";
import { readActiveMatricula, STORAGE_KEY_META, STORAGE_KEY_ID } from "../../lib/matricula-data";

const PRODUTO_LABEL: Record<string, string> = {
  EMPRESTIMO: "Empréstimo",
  CARTAO_CONSIGNADO: "Cartão Consignado",
  CARTAO_BENEFICIOS: "Cartão Benefícios",
};

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function ServidorDashboard() {
  const nav = useNavigate();
  const [info, setInfo] = useState<MatriculaInfo | null>(() => readActiveMatricula());

  useLayoutEffect(() => {
    const active = readActiveMatricula();
    if (!active) {
      nav("/servidor/selecionar-matricula", { replace: true });
    } else {
      setInfo(active);
    }
  }, [nav]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_META || e.key === STORAGE_KEY_ID) {
        setInfo(readActiveMatricula());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!info) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 960, margin: "0 auto", width: "100%" }}>
      <div>
        <span className="eyebrow">Bem-vindo(a)</span>
        <h1 style={{ margin: "6px 0 0", fontSize: "2rem", letterSpacing: "-.02em" }}>{info.nome}</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
          Matrícula <b>{info.matricula}</b> · {info.cargo} · {info.prefeitura}
        </p>
      </div>

      <MargensPorProduto info={info} />

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
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
        <AtalhoCard
          titulo="Benefícios"
          descricao="Cartão benefícios e ofertas exclusivas do convênio."
          icon="🎁"
          accent="emerald"
          onClick={() => nav("/servidor/beneficios")}
        />
      </div>

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
            {info.contratos.filter((c) => c.status !== "Quitado").length === 0 ? (
              <div style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: ".88rem" }}>
                Nenhum contrato ativo nesta matrícula.
              </div>
            ) : (
              info.contratos
                .filter((c) => c.status !== "Quitado")
                .slice(0, 2)
                .map((c) => (
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
                      <span>{c.parcelasPagas}/{c.total} parcelas</span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </Card>

      <Card>
        <span className="eyebrow">Fonte</span>
        <div style={{ marginTop: 12, fontSize: ".9rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
          <div>Tipo: {info.margem.fonte.tipo}</div>
          <div>Sincronizado: {new Date(info.margem.fonte.sincronizado_em).toLocaleString("pt-BR")}</div>
          <div>
            Cache: <b style={{ color: "var(--accent)" }}>{info.margem.fonte.cache_status}</b>
          </div>
        </div>
      </Card>
    </div>
  );
}

function MargensPorProduto({ info }: { info: MatriculaInfo }) {
  const margens = info.margem.margens_por_tipo;
  const emp = margens.find((m) => m.tipo === "EMPRESTIMO");
  const outros = margens.filter((m) => m.tipo !== "EMPRESTIMO");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* HERO — so Emprestimo, com destaque igual ao MargemCard antigo. */}
      {emp ? <MargemHero data={emp} salarioBase={info.margem.margem.salario_base} /> : null}

      {/* Cartoes menores lado a lado abaixo. */}
      {outros.length > 0 ? (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {outros.map((m) => (
            <MargemCartaoMini key={m.tipo} data={m} />
          ))}
        </div>
      ) : null}

      <div
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          background: "color-mix(in srgb, var(--gold-500) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--gold-500) 30%, transparent)",
          fontSize: ".82rem",
          color: "var(--text-muted)",
          lineHeight: 1.5,
        }}
      >
        <div><b style={{ color: "var(--text)" }}>⚠️ Pré-aprovação:</b> os valores são pré-aprovados e podem variar conforme coeficiente diário e taxas.</div>
        <div style={{ marginTop: 4 }}>
          <b style={{ color: "var(--text)" }}>ℹ️ Margem por produto:</b> a margem de empréstimo não pode ser usada para cartão e vice-versa — cada produto tem seu próprio limite.
        </div>
      </div>
    </div>
  );
}

function MargemHero({ data, salarioBase }: { data: { tipo: string; total: number; disponivel: number }; salarioBase: number }) {
  const utilizado = Math.max(0, data.total - data.disponivel);
  const pct = data.total > 0 ? Math.min(100, Math.round((utilizado / data.total) * 100)) : 0;
  return (
    <article
      style={{
        background: "linear-gradient(160deg, var(--navy-700), var(--navy-900))",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 24,
        color: "#EAF0FA",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9BAAC2" }}>
          Margem de empréstimo · disponível
        </div>
        <div style={{ fontSize: 12, color: "#C7D2E0" }}>
          Salário base <b style={{ color: "#EAF0FA" }}>{fmtBRL(salarioBase)}</b>
        </div>
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, marginTop: 6, color: "#10B981" }}>
        {fmtBRL(data.disponivel)}
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,.06)", borderRadius: 3, marginTop: 14, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #C9A961, #10B981)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 13, color: "#C7D2E0" }}>
        <span>Utilizada <b style={{ color: "#EAF0FA" }}>{fmtBRL(utilizado)}</b></span>
        <span>Total <b style={{ color: "#EAF0FA" }}>{fmtBRL(data.total)}</b></span>
      </div>
    </article>
  );
}

function MargemCartaoMini({ data }: { data: { tipo: string; total: number; disponivel: number } }) {
  const utilizado = Math.max(0, data.total - data.disponivel);
  const pct = data.total > 0 ? Math.min(100, Math.round((utilizado / data.total) * 100)) : 0;
  const barra = pct > 80 ? "var(--danger-500)" : pct > 60 ? "var(--gold-500)" : "var(--emerald-500)";
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: ".95rem" }}>
          {PRODUTO_LABEL[data.tipo] ?? data.tipo.replace(/_/g, " ").toLowerCase()}
        </span>
        <span style={{ fontSize: 11, color: "var(--text-dim)", padding: "2px 8px", background: "var(--bg-elev-2)", borderRadius: 999, fontWeight: 600 }}>
          {pct}% usado
        </span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8, color: "var(--emerald-500)", lineHeight: 1 }}>
        {fmtBRL(data.disponivel)}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>disponível</div>
      <div style={{ height: 5, background: "var(--bg-elev-2)", borderRadius: 999, marginTop: 12, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: barra, transition: "width .4s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
        <span>Total <b style={{ color: "var(--text)" }}>{fmtBRL(data.total)}</b></span>
        <span>Utilizado <b style={{ color: "var(--text)" }}>{fmtBRL(utilizado)}</b></span>
      </div>
    </Card>
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
